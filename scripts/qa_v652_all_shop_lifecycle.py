#!/usr/bin/env python3
"""Isolated actual Shop lifecycle. New runner; prior gates remain unchanged."""
from __future__ import annotations
import argparse,copy,hashlib,itertools,json,re,sys,traceback
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
from qa_v63_browser_seed import SETTINGS,PROGRESS
from qa_v652_current_shop_previews import TIME
from qa_v652_mage_lavender_shop_flow import seed_script,assert_runtime_errors,page_health
ROOT=Path(__file__).resolve().parents[1]
AVATARS=['brother','younger','sister','younger-sister']
SLOTS=['hairstyle','outfit','hat','glasses','backpack','cape','headphones','spaceship','room','robot','card','effect']
LABELS=dict(zip(SLOTS,['髮型','服裝','帽子','眼鏡','背包','披風','耳機','飛船','基地','機器夥伴','卡面','特效']))
KEY='star-learning-v40:__local__:progress'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def url(path):return path.removeprefix('public')
def load_inventory():
 text=(ROOT/'src/cosmetics.ts').read_text();section=text.split('export const cosmetics:')[1].split('];')[0]
 rows=[]
 for line in section.splitlines():
  m=re.search(r"id:'([^']+)',slot:'([^']+)',name:'([^']+)'",line)
  if m:rows.append({'id':m[1],'slot':m[2],'name':m[3],'assetExtension':'png' if "assetExtension:'png'" in line else 'webp'})
 assert len(rows)==63 and len({r['id'] for r in rows})==63
 assert set(r['slot'] for r in rows)==set(SLOTS)
 return rows

def expected(manifest,world,item,avatar):
 ident,slot=item['id'],item['slot'];base=next(r for r in manifest['baseDisplayVariants'] if r['avatarId']==avatar)
 bodies=[url(base['path']),url(base['smallDisplay']['path'])]
 result={'bodyOptions':bodies,'layers':[],'mask':None,'padding':0,'detail':None,'mode':'avatar'}
 if slot=='outfit':
  skin=next(r for r in manifest['skins'] if r['avatarId']==avatar and r['skinId']==ident)
  result.update(bodyOptions=[url(skin['path'])],catalog=url(skin['path']),skin=ident)
 elif slot in ['spaceship','room','robot','card','effect']:
  record=next(r for r in world['records'] if r['itemId']==ident and r['slot']==slot)
  main=url(record['delivery']['path']);options=[main]
  if record.get('alternateDelivery'):options.append(url(record['alternateDelivery']['path']))
  for derivative in record.get('displayVariants',[]):
   options.append(url(derivative['path']))
   if derivative.get('alternateDelivery'):options.append(url(derivative['alternateDelivery']['path']))
  result.update(catalog=main,worldOptions=options,worldFull=main,mode={'spaceship':'ship','room':'world'}.get(slot,slot),skin='default')
  if slot=='effect':result['layers']=[main]
 else:
  entry=next(r for r in manifest['accessories'] if r['id']==ident);detail=entry.get('defaultSkinDetails',{}).get(avatar)
  result.update(catalog=url(entry.get('catalogVariants',{}).get(avatar) or entry.get('catalogPath') or f"public/assets/v5/items/{ident}.{item['assetExtension']}"),skin='default')
  if entry['renderer']=='split-overlay':result['layers']=[url(entry['backVariants'][avatar]),url(entry['frontVariants'][avatar])]
  else:result['layers']=[url(detail['overlay'] if detail else entry['variants'][avatar])]
  if detail:result.update(detail=ident,mask=url(detail['hairVisibilityMask']) if detail.get('hairVisibilityMask') else None,padding=detail.get('canvasTopPadding',0))
 return result

PROOF=r'''async e=>{
 const visible=n=>{let s=getComputedStyle(n),r=n.getBoundingClientRect();return s.display!=='none'&&s.visibility==='visible'&&Number(s.opacity)>0&&r.width>0&&r.height>0};
 const rows=[];for(const i of e.querySelectorAll('img')){if(!visible(i)||!i.getAttribute('src'))continue;const state=()=>({src:i.src,currentSrc:i.currentSrc,complete:i.complete,naturalWidth:i.naturalWidth,isConnected:i.isConnected});let decoded=false;
 for(let attempt=0;attempt<3;attempt++){
  const deadline=performance.now()+8000;
  while(!(i.currentSrc&&i.complete&&i.naturalWidth>0)){if(!i.isConnected||performance.now()>deadline)throw Error('image readiness timeout '+JSON.stringify(state()));await new Promise(r=>requestAnimationFrame(r));}
  const before=state();
  try{await Promise.race([i.decode(),new Promise((_,r)=>setTimeout(()=>r(Error('decode timeout '+i.src)),8000))]);decoded=true;break;}
  catch(error){const after=state();if(before.src===after.src&&before.currentSrc===after.currentSrc)throw Error('same-source decode failure '+JSON.stringify({before,after,error:String(error)}));}
 }
 if(!decoded)throw Error('image source changed beyond retry limit '+JSON.stringify(state()));rows.push({src:new URL(i.currentSrc||i.src).pathname,width:i.naturalWidth,height:i.naturalHeight,mask:getComputedStyle(i).maskImage,maskMode:getComputedStyle(i).maskMode,item:i.dataset.wearableItem||i.dataset.effectItem||null,classes:i.className})};
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 return {className:e.className,skin:e.dataset.skin,detail:e.dataset.runtimeDetail||null,padding:Number(e.dataset.canvasTopPadding||0),rendered:e.dataset.renderedItems||'',images:rows};}'''
def avatar_proof(renderer,item,avatar,ex,active=True,full_effect=False):
 renderer.scroll_into_view_if_needed();renderer.wait_for(state='visible')
 proof=renderer.evaluate(PROOF);assert 'avatar-'+avatar in proof['className'].split(),proof
 assert proof['skin']==(ex['skin'] if active else 'default'),proof
 images=proof['images'];bodies=[r for r in images if r['src'] in ex['bodyOptions']]
 assert len(bodies)==1,(ex,proof)
 layers=ex['layers'] if active else []
 if active and item['slot']=='effect' and not full_effect:
  actual=[r['src'] for r in images if r.get('item')==item['id']];assert len(actual)==1 and actual[0] in ex['worldOptions'],proof
  layers=actual
 assert sorted(r['src'] for r in images)==sorted([bodies[0]['src']]+layers),('exact body/layers mismatch',ex,proof)
 if active and item['slot'] in SLOTS[:7]+['effect']:assert item['id'] in proof['rendered'].split(),proof
 if active and ex['detail']:
  assert proof['padding']==ex['padding'],proof
  assert proof['detail']==ex['detail'],proof
  if ex['mask']:assert ex['mask'] in bodies[0]['mask'] and bodies[0]['maskMode']=='luminance',proof
  else:assert bodies[0]['mask']=='none',proof
 return proof

def ledger(page):return page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)||"{}")',KEY)
def assert_equipped(before,after,child,item):
 expected_state=copy.deepcopy(before)
 target=expected_state[child];actual=after[child]
 transactions=actual.get('equipmentTransactions',[]);assert len(transactions)==len(target.get('equipmentTransactions',[]))+1
 added=transactions[-1];assert added['itemId']==item and added['action']=='equip' and added['childId']==child
 assert len({t['id'] for t in transactions})==len(transactions)
 target['equipmentTransactions']=transactions;target['equippedCosmetics']=[item]
 assert after==expected_state,('unexpected ledger/other child mutation',before,after)

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--output',type=Path,required=True);ap.add_argument('--avatar',choices=AVATARS,required=True);ap.add_argument('--smoke',action='store_true');ap.add_argument('--items',default='');ap.add_argument('--smoke-screen',choices=['390-light','1440-dark'],default='390-light');ap.add_argument('--base-url',default='http://127.0.0.1:5178/');ap.add_argument('--manifest-sha',required=True)
 args=ap.parse_args();assert urlsplit(args.base_url).hostname in ['127.0.0.1','localhost'];out=args.output.resolve();out.mkdir(parents=True,exist_ok=False)
 manifest_path=ROOT/'src/data/avatarAssetManifest.json';assert sha(manifest_path)==args.manifest_sha,'manifest freeze mismatch'
 manifest=json.loads(manifest_path.read_text());world=json.loads((ROOT/'src/data/worldArtManifest.json').read_text());items=load_inventory()
 if args.smoke:items=[next(i for i in items if i['slot']==slot) for slot in SLOTS]
 if args.items:items=[i for i in items if i['id'] in args.items.split(',')]
 plans={i['id']:expected(manifest,world,i,args.avatar) for i in items}
 pins={str(p.relative_to(ROOT)):sha(p) for p in [manifest_path,ROOT/'src/data/worldArtManifest.json',ROOT/'src/cosmetics.ts',Path(__file__)]}
 for name in ['scripts/qa_v63_browser_seed.py','scripts/qa_v652_mage_lavender_shop_flow.py','src/components/AvatarRenderer.tsx','src/components/TreasureShowcase.tsx','src/v4/SecondaryViews.tsx','src/v4/Dashboard.tsx','src/avatarAssetRegistry.ts','src/equipmentPreview.ts','src/useWorldDisplayPath.ts','src/useRoomScenePath.ts']:
  pins[name]=sha(ROOT/name)
 # Pin all compile inputs, including App, the complete CSS import tree, renderer, theme and pointer dependencies.
 for folder in ['src','api']:
  for source in sorted((ROOT/folder).rglob('*')):
   if source.is_file() and source.suffix in {'.ts','.tsx','.json','.css'}:
    pins[str(source.relative_to(ROOT))]=sha(source)
 for ex in plans.values():
  paths=ex['bodyOptions']+ex['layers']+[ex['catalog']]+ex.get('worldOptions',[])+([ex['mask']] if ex['mask'] else [])
  for path in paths:pins['public'+path]=sha(ROOT/('public'+path))
 (out/'pins.json').write_text(json.dumps(pins,indent=2)+'\n');(out/'expected.json').write_text(json.dumps(plans,indent=2)+'\n')
 child=SETTINGS['children'][AVATARS.index(args.avatar)];served={};cases=list(itertools.product(items,[(int(args.smoke_screen.split('-')[0]),args.smoke_screen.split('-')[1])] if args.smoke else [(390,'light'),(390,'dark'),(1440,'light'),(1440,'dark')]))
 summary={'status':'RUNNING','avatar':args.avatar,'expectedCases':len(cases),'manifestSHA256':args.manifest_sha,'passed':0,'failed':0,'cases':[],'isolatedAPI':True,'visualAcceptance':False}
 def save():(out/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
 def serve(context,paths):
  refs=[]
  for path in sorted(set(paths)):
   assert 'public'+path in pins,('unplanned source',path)
   if path not in served:
    response=context.request.get(args.base_url.rstrip('/')+path,timeout=15000,max_redirects=0)
    try:
     digest=hashlib.sha256(response.body()).hexdigest();assert response.status==200 and digest==pins['public'+path],(path,response.status,digest)
     served[path]={'src':path,'sha256':digest,'status':response.status}
    finally:response.dispose()
   refs.append(served[path])
  return refs
 def screenshot(locator,path):
  locator.screenshot(path=str(path),animations='disabled');return {'path':str(path.relative_to(ROOT)),'sha256':sha(path)}
 representatives={slot:next(i['id'] for i in items if i['slot']==slot) for slot in SLOTS if any(i['slot']==slot for i in items)}
 with sync_playwright() as pw:
  browser=pw.chromium.launch()
  try:
   for item,(width,theme) in cases:
    ident=item['id'];ex=plans[ident];caseid=f'{ident}--{args.avatar}--{width}--{theme}';case_dir=out/caseid;case_dir.mkdir();ev={'case':caseid,'item':ident,'slot':item['slot'],'avatar':args.avatar,'width':width,'theme':theme,'expected':ex,'screenshots':[]}
    c=browser.new_context(viewport={'width':width,'height':844 if width==390 else 900},color_scheme=theme,reduced_motion='reduce',service_workers='block');c.set_default_timeout(12000);c.route_web_socket('**',lambda ws:None)
    settings=copy.deepcopy(SETTINGS);settings.update(theme=theme,homeDisplayLearnerId=child['id']);progress=copy.deepcopy(PROGRESS)
    progress[child['id']]['purchaseTransactions']=[{'id':f'qa-owned-{ident}','childId':child['id'],'itemId':ident,'cost':0,'createdAt':'2026-09-02T00:00:00.000Z','source':'purchase'}];progress[child['id']]['unlockedCosmetics']=[ident]
    c.add_init_script(seed_script(settings,progress));blocked=[];external=[];failures=[];errors=[];console=[];origin=urlsplit(args.base_url).netloc
    def guard(r):
     u=urlsplit(r.request.url)
     if u.netloc!=origin:external.append(r.request.url);r.abort()
     elif u.path in ['/api/time','/api/server-time']:r.fulfill(status=200,content_type='application/json',body=TIME)
     elif u.path.startswith('/api/'):blocked.append(r.request.url);r.abort()
     else:r.continue_()
    c.route('**/*',guard);p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:console.append({'text':m.text,'url':m.location.get('url','')}) if m.type=='error' else None)
    p.on('response',lambda r:failures.append({'url':r.url,'status':r.status}) if urlsplit(r.url).netloc==origin and r.status>=400 else None)
    try:
     p.goto(args.base_url,wait_until='domcontentloaded');p.wait_for_selector('.v4-dashboard-grid');p.get_by_role('button',name='寶物商店',exact=True).first.click();p.locator('#shop-learner-tab-'+child['id']).click();p.get_by_role('tab',name=LABELS[item['slot']],exact=True).click()
     card=p.locator(f'article[data-item-id="{ident}"]')
     for _ in range(63):
      if card.count():break
      more=p.locator('.v64-load-more');assert more.count() and more.is_visible();more.click()
     assert card.count()==1
     cat=card.locator('.v4-item-art img');cat.scroll_into_view_if_needed();cat.evaluate('i=>i.decode()');actual=cat.evaluate('i=>new URL(i.currentSrc).pathname');assert actual==ex['catalog'];ev['catalog']=serve(c,[actual])
     ev['mode']=p.evaluate('()=>({theme:document.documentElement.dataset.theme,dark:document.documentElement.classList.contains("dark")})');assert ev['mode']=={'theme':theme,'dark':theme=='dark'}
     before=ledger(p);ev['ledgerBefore']=before
     card.locator('.v6-preview-button').click();stage=p.locator('.v63-equipment-stage');p.wait_for_function('id=>document.querySelector(".v63-equipment-stage")?.dataset.previewItem===id',arg=ident)
     assert stage.get_attribute('data-preview-mode')==ex['mode'];stage.scroll_into_view_if_needed()
     def trial_proof():
      if ex['mode'] in ['avatar','effect']:return avatar_proof(stage.locator('.avatar-renderer').first,item,args.avatar,ex,full_effect=True)
      if ex['mode']=='world':
       assert stage.get_attribute('data-room')==ident;style=stage.locator('.v63-stage-backdrop').evaluate('e=>getComputedStyle(e).backgroundImage');assert ex['worldFull'] in style;return {'background':style,'served':serve(c,[ex['worldFull']])}
      img=stage.locator('.v63-'+ex['mode']+'-art');img.evaluate('i=>i.decode()');src=img.evaluate('i=>new URL(i.currentSrc).pathname');assert src==ex['worldFull'];return {'src':src,'served':serve(c,[src])}
     ev['trial']=trial_proof();ev['screenshots'].append(screenshot(stage,case_dir/'trial.png'));assert ledger(p)==before
     card.locator('.v6-preview-button').click();p.wait_for_function('id=>document.querySelector(".v63-equipment-stage")?.dataset.previewItem!==id',arg=ident);assert ledger(p)==before
     ev['cancel']={'unchangedFullProgress':True,'focus':stage.get_attribute('data-preview-item')};assert not stage.locator(f'[data-wearable-item="{ident}"],[data-effect-item="{ident}"]').count()
     card.get_by_role('button',name='立即穿上' if ex['mode']=='avatar' else '立即使用',exact=True).click();p.wait_for_function('([k,c,i])=>JSON.parse(localStorage.getItem(k)||"{}")[c]?.equippedCosmetics?.includes(i)',arg=[KEY,child['id'],ident]);equipped=ledger(p);assert_equipped(before,equipped,child['id'],ident);ev['ledgerEquipped']=equipped
     p.wait_for_function('id=>document.querySelector(".v63-equipment-stage")?.dataset.previewItem===id',arg=ident);ev['equippedShop']=trial_proof()
     p.get_by_role('button',name='首頁',exact=True).first.click();p.wait_for_selector('.v4-dashboard-grid');p.locator('.v65-home-display-selector').get_by_role('button',name=re.compile(child['name'])).click()
     def homeproof():
      renderer=p.locator(f'.v65-home-display-selector .avatar-renderer.avatar-{args.avatar}').first
      if item['slot'] in SLOTS[:7]+['effect']:return avatar_proof(renderer,item,args.avatar,ex)
      body=avatar_proof(renderer,item,args.avatar,ex)
      if item['slot'] in ['spaceship','robot']:
       loc=p.locator('.v6-equipped-header-ship' if item['slot']=='spaceship' else '.v6-ai-robot-art');loc.scroll_into_view_if_needed();loc.evaluate('i=>i.decode()');src=loc.evaluate('i=>new URL(i.currentSrc).pathname');assert src in ex['worldOptions'];body['world']={'src':src,'served':serve(c,[src])}
      else:
       loc=p.locator('.v4-ai-companion' if item['slot']=='room' else '.v4-lesson-card').first;loc.scroll_into_view_if_needed()
       styles=loc.evaluate("e=>[getComputedStyle(e).backgroundImage,getComputedStyle(e).getPropertyValue('--equipped-room-scene'),getComputedStyle(e).getPropertyValue('--equipped-card-frame'),getComputedStyle(e,'::after').borderImageSource].join(' ')")
       matches=[path for path in ex['worldOptions'] if path in styles];assert matches,('missing Home world art',ex,styles);body['world']={'style':styles,'served':serve(c,matches)}
      return body
     ev['home']=homeproof()
     if ident==representatives[item['slot']]:ev['screenshots'].append(screenshot(p,case_dir/'home.png'))
     assert ledger(p)==equipped;p.reload(wait_until='domcontentloaded');p.wait_for_selector('.v4-dashboard-grid');assert ledger(p)==equipped;assert p.evaluate('()=>JSON.parse(localStorage.getItem("star-learning-v40:__local__:settings")).homeDisplayLearnerId')==child['id'];ev['reload']=homeproof()
     if ident==representatives[item['slot']]:ev['screenshots'].append(screenshot(p,case_dir/'reload.png'))
     p.get_by_role('button',name='成就獎勵',exact=True).first.click();p.locator('#achievement-tab-'+child['id']).click();achievement=p.locator('#achievement-panel header .avatar-renderer')
     achievement_ex=ex if item['slot'] in SLOTS[:7]+['effect'] else {**ex,'layers':[]}
     ev['achievements']=avatar_proof(achievement,item,args.avatar,achievement_ex)
     if ident==representatives[item['slot']]:ev['screenshots'].append(screenshot(p,case_dir/'achievements.png'))
     assert ledger(p)==equipped;ev['ledgerFinal']=ledger(p);ev['health']=page_health(p);assert not errors,errors;assert_runtime_errors(console,external,blocked,failures)
     allpaths=ex['bodyOptions']+ex['layers']+ex.get('worldOptions',[])+([ex['mask']] if ex['mask'] else []);ev['servedAssets']=serve(c,allpaths);ev['status']='PASS_TECHNICAL';summary['passed']+=1
    except Exception as error:
     ev.update(status='FAIL',error=str(error),traceback=traceback.format_exc());summary['failed']+=1
     try:ev['screenshots'].append(screenshot(p,case_dir/'failure.png'))
     except Exception:pass
    finally:
     ev.update(blockedApi=blocked,blockedExternal=external,pageErrors=errors,consoleErrors=console,localFailures=failures);c.close();(case_dir/'evidence.json').write_text(json.dumps(ev,ensure_ascii=False,indent=2)+'\n');summary['cases'].append({'case':caseid,'status':ev['status'],'evidence':str((case_dir/'evidence.json').relative_to(ROOT))});save();print(caseid,ev['status'],ev.get('error','')[:180],flush=True)
    if ev['status']=='FAIL':break
  finally:browser.close()
 drift=[path for path,digest in pins.items() if sha(ROOT/path)!=digest];assert not drift,drift
 summary['status']='PASS_TECHNICAL' if summary['passed']==len(cases) and not summary['failed'] else 'FAIL';summary['servedUniqueAssets']=len(served);(out/'served-assets.json').write_text(json.dumps(served,indent=2)+'\n');save();return 0 if summary['status']=='PASS_TECHNICAL' else 1
if __name__=='__main__':sys.exit(main())
