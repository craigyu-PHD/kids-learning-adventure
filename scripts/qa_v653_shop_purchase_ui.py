"""Formal-only 64-SKU real UI purchase QA. Preparation is the default; --run starts one browser.

No preowned/cost-zero purchase fixture. Funds derive from explicit synthetic RewardTransactions.
UI first purchase/equip; pure served-service retries never write storage. Family APIs blocked.
"""
import argparse
import copy
import hashlib
import json
import re
import subprocess
import sys
import traceback
from pathlib import Path
from urllib.parse import urlsplit

from qa_v653_full_shop_acceptance import (
    Runner, ROOT, BASE, FIXTURE, SETTINGS, WEARABLE, PROFILES, KEY,
    read_bytes, sha, inventory, public_refs, declared_hashes,
)

FUNDS = 10000
XP = 4000
REWARDS = """async ([k,id])=>{const {calculateRewards}=await import('/src/rewards.ts');
return calculateRewards(JSON.parse(localStorage.getItem(k))[id]);}"""


def current_inventory():
    rows = inventory()
    raw = read_bytes(ROOT/'src/cosmetics.ts').decode().split('export const cosmetics:')[1].split('];')[0]
    prices = {m.group(1):(int(m.group(2)),int(m.group(3))) for m in re.finditer(
        r"\{\s*id\s*:\s*'([^']+)'[^\n]*?cost\s*:\s*(\d+)\s*,\s*unlockLevel\s*:\s*(\d+)",raw)}
    assert len(rows)==64 and set(prices)=={r['id'] for r in rows}
    return [{**r,'cost':prices[r['id']][0],'unlockLevel':prices[r['id']][1]} for r in rows]


class PurchaseRunner(Runner):
    def seed(self,page,item,avatar,profile):
        settings=copy.deepcopy(self.settings);settings.update(theme=profile['theme'],homeDisplayLearnerId='child-1')
        settings['children'][0].update(avatar=avatar,name='購買隔離角色')
        progress=copy.deepcopy(self.blank)
        for child in progress.values():
            for key in ['unlockedCosmetics','equippedCosmetics','purchaseTransactions','equipmentTransactions',
                        'completedDays','completedBlocks','completedMissions','claimedEggs','rewardTransactions','answerEvents']:
                child[key]=[]
            child['badgeUnlocks']={};child['completionTimestamps']={}
        progress['child-1']['rewardTransactions']=[{'id':'fixture-earned:'+item['id'],'kind':'bonus',
            'sourceId':'v653-isolated-purchase-ui','xp':XP,'coins':FUNDS,'stars':0,'gems':0,
            'createdAt':'2026-09-02T00:00:00.000Z'}]
        store=dict(self.store);store.update({SETTINGS:json.dumps(settings),KEY:json.dumps(progress),'little-explorers-v4-sound':'off'})
        seed_url=self.args.url.rstrip('/')+'/__qa_purchase_seed__'
        def seed_route(route):
            route.fulfill(status=200,content_type='text/html',body='<!doctype html><title>Isolated purchase fixture</title>')
        page.route(seed_url,seed_route);page.goto(seed_url,wait_until='load')
        assert page.locator('#root').count()==0
        page.evaluate('(s)=>{localStorage.clear();sessionStorage.clear();for(const[k,v]of Object.entries(s))localStorage.setItem(k,v)}',store)
        assert page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)==progress
        page.unroute(seed_url,seed_route);page.goto(self.args.url,wait_until='domcontentloaded')
        page.locator('.v4-dashboard-grid').wait_for()
        assert page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)==progress, 'initial fixture polluted or normalized unexpectedly'
        return progress

    def wallet(self,page,expected):
        from playwright.sync_api import expect
        node=page.locator('.v6-shop-wallet-row .v4-wallet strong')
        expect(node).to_have_text(str(expected))
        return {'visibleCoins':int(node.inner_text()),'expected':expected}

    def world(self,page,item):
        if item['slot']=='room':
            node=page.locator('.v4-shell.has-'+item['id']+' .v4-dashboard-grid')
            node.wait_for(state='visible')
            # The dashboard is the mounted room scene. Companion panel themes can
            # replace its own background and are not the room display contract.
            expected=['/'+p.removeprefix('public/') for p in public_refs(self.records[item['id']])]
            page.wait_for_function('([selector,paths])=>{const n=document.querySelector(selector);if(!n)return false;const s=getComputedStyle(n).backgroundImage;return paths.some(p=>s.includes(p))}',arg=['.v4-shell.has-'+item['id']+' .v4-dashboard-grid',expected])
            return node
        return super().world(page,item)

    def expected_world(self,item,proof):
        expected={'/'+p.removeprefix('public/') for p in public_refs(self.records[item['id']])}
        assert expected.intersection(proof['urls']), ('wrong world SKU bytes',item['id'],proof['urls'])

    def stage_ready(self,page,item):
        stage=page.locator('.v63-equipment-stage');stage.scroll_into_view_if_needed()
        if item['slot'] in WEARABLE or item['slot']=='effect':
            self.render_barrier(stage.locator('.avatar-renderer').first,item['id'])
        else:
            page.wait_for_function('id=>document.querySelector(".v63-equipment-stage")?.dataset.previewItem===id',arg=item['id'])
        return stage

    def case(self,page,row,errors):
        from playwright.sync_api import expect
        item,avatar,profile=row['item'],row['avatar'],row['profile'];ident=item['id'];slot=item['slot'];cost=item['cost']
        folder=self.out/ident;folder.mkdir(exist_ok=False);self.stable()
        page.set_viewport_size({'width':profile['width'],'height':profile['height']})
        page.emulate_media(color_scheme=profile['theme'],reduced_motion='reduce')
        before=self.seed(page,item,avatar,profile);snapshot=lambda:page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)
        row['initialProgress']=before;row['blankPageSeed']=True
        child=before['child-1'];assert all(child[k]==[] for k in ['unlockedCosmetics','equippedCosmetics','purchaseTransactions','equipmentTransactions'])
        earned=page.evaluate(REWARDS,[KEY,'child-1']);assert earned['earnedCoins']==earned['coins']==FUNDS and earned['spentCoins']==0 and earned['xp']==XP
        assert all(k not in child for k in ['coins','balance','xp']), 'mutable resource field in seed'
        row['rewardsBefore']=earned
        card=self.shop(page,item);row['walletBefore']=self.wallet(page,FUNDS)
        row['catalog']=self.capture(page,card.locator('.v4-item-art'),folder,'catalog-before-purchase')
        purchase_label='免費領取' if cost==0 else f'用 {cost} 金幣收藏'
        buy=card.get_by_role('button',name=purchase_label,exact=True);expect(buy).to_be_enabled()
        row['purchaseButton']={'label':purchase_label,'currentCatalogCost':cost,'wasEnabled':True}
        buy.click()
        page.wait_for_function('([k,id])=>JSON.parse(localStorage.getItem(k))["child-1"].unlockedCosmetics.includes(id)',arg=[KEY,ident])
        purchased=snapshot();pc=purchased['child-1'];tx=pc['purchaseTransactions']
        assert len(tx)==1 and tx[0]['id']==f'shop-purchase:child-1:{ident}' and tx[0]['childId']=='child-1'
        assert tx[0]['itemId']==ident and tx[0]['cost']==cost and tx[0]['source']=='purchase'
        assert pc['unlockedCosmetics']==[ident] and pc['equippedCosmetics']==[] and pc['equipmentTransactions']==[]
        assert pc['rewardTransactions']==child['rewardTransactions']
        assert all(purchased[k]==v for k,v in before.items() if k!='child-1')
        earned_after=page.evaluate(REWARDS,[KEY,'child-1'])
        assert earned_after['coins']==FUNDS-cost and earned_after['spentCoins']==cost and earned_after['earnedCoins']==FUNDS
        assert all(k not in pc for k in ['coins','balance','xp'])
        row['walletAfter']=self.wallet(page,FUNDS-cost);row['rewardsAfter']=earned_after;row['purchaseTransaction']=tx[0]
        expect(card.get_by_role('button',name=purchase_label,exact=True)).to_have_count(0)
        row['ownedCard']=self.capture(page,card,folder,'owned-card-after-purchase')
        # The product removes its buy button once owned. Repeated UI entry is
        # checked below; semantic retries call the served service on the actual
        # UI-produced ledger, in memory only, never mutate App/localStorage.
        retry=page.evaluate("""async ([k,avatar,id])=>{const {purchaseShopItem}=await import('/src/shopService.ts');
          const current=JSON.parse(localStorage.getItem(k));const value=purchaseShopItem(current,'child-1',avatar,id);
          return {result:value.result,sameObject:value.next===current,next:value.next};}""",[KEY,avatar,ident])
        assert retry['result']['ok'] and retry['sameObject'] and retry['next']==purchased
        assert snapshot()==purchased
        row['purchaseRetry']={'scope':'served service pure-memory retry of real UI ledger; no storage write',
            'result':retry['result'],'sameObject':retry['sameObject'],'unchanged':True,'ownedUIHasNoBuyButton':True}
        self.home(page);page.reload(wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for()
        assert snapshot()==purchased, 'purchase reload changed/charged ledger'
        card=self.shop(page,item);expect(card.get_by_role('button',name=purchase_label,exact=True)).to_have_count(0)
        self.wallet(page,FUNDS-cost)
        row['purchaseReentryNoSecondCharge']=True
        equip_label='立即穿上' if slot in WEARABLE else '立即使用'
        card.get_by_role('button',name=equip_label,exact=True).click()
        page.wait_for_function('([k,id])=>JSON.parse(localStorage.getItem(k))["child-1"].equippedCosmetics.includes(id)',arg=[KEY,ident])
        equipped=snapshot();ec=equipped['child-1'];events=ec['equipmentTransactions']
        assert len(events)==1 and events[0]['itemId']==ident and events[0]['childId']=='child-1' and events[0]['action']=='equip'
        assert ec['purchaseTransactions']==tx and ec['rewardTransactions']==child['rewardTransactions']
        assert ec['equippedCosmetics']==[ident] and all(equipped[k]==v for k,v in before.items() if k!='child-1')
        row['equipmentEvent']=events[0]
        stage=self.stage_ready(page,item);row['equippedShop']=self.capture(page,stage,folder,'equipped-shop')
        if slot not in WEARABLE:self.expected_world(item,row['equippedShop']['proof'])
        retry_equip=page.evaluate("""async ([k,avatar,id,eventId])=>{const {toggleShopItem}=await import('/src/shopService.ts');
          const current=JSON.parse(localStorage.getItem(k));const value=toggleShopItem(current,'child-1',avatar,id,eventId);
          return {result:value.result,sameObject:value.next===current,next:value.next};}""",[KEY,avatar,ident,events[0]['id']])
        assert retry_equip['result']['ok'] and retry_equip['result']['equipped'] and retry_equip['sameObject'] and retry_equip['next']==equipped
        assert snapshot()==equipped;row['equipRetry']={'result':retry_equip['result'],'sameObject':True,'scope':'served service pure memory; no storage write'}
        home=self.home(page)
        if slot in WEARABLE or slot=='effect':self.render_barrier(home.locator('.avatar-renderer').first,ident)
        row['home']=self.capture(page,home,folder,'home-player')
        if slot not in WEARABLE:
            row['homeWorld']=self.capture(page,self.world(page,item),folder,'home-world');self.expected_world(item,row['homeWorld']['proof'])
        assert snapshot()==equipped
        page.reload(wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for();assert snapshot()==equipped
        home=page.locator('.v4-player-card').first
        if slot in WEARABLE or slot=='effect':self.render_barrier(home.locator('.avatar-renderer').first,ident)
        row['homeReload']=self.capture(page,home,folder,'home-reload')
        if slot not in WEARABLE:
            row['homeWorldReload']=self.capture(page,self.world(page,item),folder,'home-world-reload');self.expected_world(item,row['homeWorldReload']['proof'])
        assert page.evaluate(REWARDS,[KEY,'child-1'])==earned_after and snapshot()==equipped
        card=self.shop(page,item);self.wallet(page,FUNDS-cost)
        page.locator('#shop-learner-tab-child-2').click()
        self.wallet(page,0)
        assert snapshot()==equipped and snapshot()['child-2']==before['child-2']
        assert not errors,errors;self.stable()
        row.update(status='PASS_UI_PURCHASE_CURRENT_COST_ONCE',childIsolation=True,reloadPreservesLedger=True,
                   finalProgress=equipped,visualReview='NOT_PERFORMED')


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--attempt',required=True);ap.add_argument('--candidate-id',default='UNSPECIFIED')
    ap.add_argument('--formal',action='store_true');ap.add_argument('--run',action='store_true')
    ap.add_argument('--avatar-manifest',type=Path);ap.add_argument('--world-manifest',type=Path)
    ap.add_argument('--url',default='http://127.0.0.1:5178/');ap.add_argument('--items',default='')
    args=ap.parse_args();assert re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]*',args.attempt)
    assert urlsplit(args.url).hostname in ['localhost','127.0.0.1','::1']
    args.body_tolerance_px=1.0
    items=current_inventory();requested=args.items.split(',') if args.items else [r['id'] for r in items]
    assert len(set(requested))==len(requested) and set(requested)<={r['id'] for r in items}
    avatars=['brother','younger','sister','younger-sister']
    planned=[{'item':item,'avatar':avatars[i%4],'profile':PROFILES[(i//4)%4]} for i,item in enumerate(items) if item['id'] in requested]
    out=BASE/('purchase-ui-'+args.attempt);out.mkdir(parents=True,exist_ok=False)
    report={'status':'PLAN_ONLY','formal':args.formal,'manifestOverride':False,'cssOverride':False,'candidateId':args.candidate_id,
        'inventory':items,'inventoryCount':len(items),'plannedCases':len(planned),'selectionIsAll64':len(planned)==64,
        'matrix':planned,'cases':[],'browserLimit':1,'fixture':'No owned items or purchase events. Synthetic earned RewardTransaction gives4000XP/10000coins.',
        'retryScope':'Initial purchase and equip use real UI. Owned button removal and reentry prevent repeated UI charge. Service retries run on UI ledger in memory without storage mutation.',
        'limitations':['One role/profile per SKU, rotated across four roles and four viewport/theme profiles; not256role combinations.',
            'Chromium local formal source; production build/deploy/cloud and earning UI flow are separate.',
            'Technical purchase/ledger/render evidence is not automatic visual acceptance.']}
    (out/'plan.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    if not args.run:
        print(json.dumps({'status':'PLAN_ONLY_NO_BROWSER','items':len(items),'cases':len(planned),'paidSKUs':sum(i['cost']>0 for i in items),'catalogFreeSKUs':sum(i['cost']==0 for i in items),'output':str(out)},ensure_ascii=False));return 0
    assert args.formal and args.avatar_manifest and args.world_manifest and args.candidate_id!='UNSPECIFIED','--run requires --formal, final ID and both selected manifest paths'
    manifests={}
    for name,path in [('avatar',args.avatar_manifest),('world',args.world_manifest)]:
        path=path.resolve();raw=read_bytes(path);local=ROOT/'src/data'/('avatarAssetManifest.json' if name=='avatar' else 'worldArtManifest.json')
        assert raw==read_bytes(local),('formal manifest differs from selected final candidate',name)
        manifests[name]={'file':str(path),'sha256':hashlib.sha256(raw).hexdigest(),'text':raw.decode(),'value':json.loads(raw)}
    # Bounded to the actual src tree; no QA/history/Drive-wide traversal.
    source_paths=subprocess.run(['rg','--files','src','-g','*.ts','-g','*.tsx','-g','*.css','-g','*.json'],cwd=ROOT,check=True,text=True,capture_output=True).stdout.splitlines()
    source_paths+=['package.json','package-lock.json','index.html','vite.config.ts',
        'scripts/qa_v653_shop_purchase_ui.py','scripts/qa_v653_full_shop_acceptance.py','scripts/qa_v653_shop_coverage.py',str(FIXTURE.relative_to(ROOT))]
    frozen={p:sha(ROOT/p) for p in sorted(set(source_paths))}
    asset_pins={}
    for data in manifests.values():
        declared=declared_hashes(data['value'])
        for path in sorted(public_refs(data['value'])):
            digest=sha(ROOT/path);assert path not in declared or declared[path]==digest
            asset_pins['/'+path.removeprefix('public/')]=digest
    report.update(status='RUNNING',sourcePins=frozen,candidateManifests={k:{'file':v['file'],'sha256':v['sha256']} for k,v in manifests.items()},candidateAssetPins=asset_pins.copy())
    runner=PurchaseRunner(args,out,manifests,frozen,asset_pins,report);runner.save()
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser=pw.chromium.launch();context=browser.new_context(viewport={'width':1440,'height':1050},reduced_motion='reduce',service_workers='block',device_scale_factor=1)
        context.route_web_socket('**',lambda ws:None);context.route('**/*',runner.route)
        page=context.new_page();page.set_default_timeout(18000);context.new_cdp_session(page).send('Network.setCacheDisabled',{'cacheDisabled':True})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        try:
            page.goto(args.url,wait_until='domcontentloaded')
            for name in ['avatar','world']:
                module='/src/data/'+('avatarAssetManifest.json' if name=='avatar' else 'worldArtManifest.json')
                actual=page.evaluate('async u=>(await import(u)).default',module);assert actual==manifests[name]['value']
            actual=page.evaluate("async()=>(await import('/src/cosmetics.ts')).cosmetics.map(({id,slot,name,cost,unlockLevel})=>({id,slot,name,cost,unlockLevel}))")
            assert actual==items,'runtime catalog differs from exact source inventory/cost'
            report['runtimeInventoryCostMatches']=True;report['runtimeFormalManifestsMatch']=True
            for i,row in enumerate(planned):
                row=copy.deepcopy(row);row['index']=i;errors.clear()
                try:runner.case(page,row,errors)
                except Exception as error:
                    row.update(status='FAIL',error=str(error),traceback=traceback.format_exc(),pageErrors=errors[:])
                    try:page.screenshot(path=str(out/f'failure-{i:03d}.png'),full_page=True,timeout=5000)
                    except Exception:pass
                report['cases'].append(row);runner.save();print(i+1,len(planned),row['item']['id'],row['status'],row.get('error','')[:180],flush=True)
                if row['status']=='FAIL':break
        except Exception as error:report.update(status='FAIL_PREFLIGHT',error=str(error),traceback=traceback.format_exc())
        finally:context.unroute_all(behavior='wait');context.close();browser.close()
    report.update(servedAssets=runner.assets,blockedFamilyOrMutationRequests=runner.api_blocks)
    if not report['status'].startswith('FAIL'):
        passed=len(report['cases'])==len(planned) and all(r['status']=='PASS_UI_PURCHASE_CURRENT_COST_ONCE' for r in report['cases'])
        report['status']=('PASS_FORMAL_64_UI_PURCHASE_CURRENT_COST_ONCE' if report['selectionIsAll64'] else 'PASS_SELECTED_UI_PURCHASE_ONLY') if passed else 'FAIL'
    runner.save();return 0 if report['status'].startswith('PASS') else 1


if __name__=='__main__':sys.exit(main())
