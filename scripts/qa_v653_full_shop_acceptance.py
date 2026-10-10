"""Final-candidate Shop lifecycle matrix. Default is a read-only plan, not a browser run.

Synthetic preowned cost-zero fixture only: this tests equipment/visibility, not real
purchase prices, earning, authentication, cloud persistence, or visual acceptance.
Candidate manifests are routed as Vite JSON modules; product files are never edited.
"""
import argparse
import copy
import hashlib
import io
import json
import re
import signal
import sys
import traceback
from collections import Counter
from pathlib import Path
from urllib.parse import unquote, urlsplit

from PIL import Image

from qa_v653_shop_coverage import AVATARS, DECODE, KEY, ROOT, TIME

BASE = ROOT / 'qa/v653/20261005/shop-coverage'
FIXTURE = ROOT / 'qa/v653/20261005/lessons/default-storage.json'
SETTINGS = 'star-learning-v40:__local__:settings'
WEARABLE = {'hairstyle', 'outfit', 'hat', 'glasses', 'backpack', 'cape', 'headphones'}
LABELS = dict(zip(
    ['hairstyle','outfit','hat','glasses','backpack','cape','headphones','spaceship','room','robot','card','effect','pet'],
    ['髮型','服裝','帽子','眼鏡','背包','披風','耳機','飛船','基地','機器夥伴','卡面','特效','寵物']))
PROFILES = [
    {'id':'desktop-light','width':1440,'height':1050,'theme':'light'},
    {'id':'desktop-dark','width':1440,'height':1050,'theme':'dark'},
    {'id':'mobile-light','width':390,'height':844,'theme':'light'},
    {'id':'mobile-dark','width':390,'height':844,'theme':'dark'},
]
SOURCES = [
    'package.json','package-lock.json','index.html','vite.config.ts',
    'src/App.tsx','src/cosmetics.ts','src/types.ts','src/avatarShop.ts','src/shopLedger.ts',
    'src/shopService.ts','src/rewards.ts','src/stateMerge.ts',
    'src/avatarAssetRegistry.ts','src/data/avatarAssetManifest.json','src/data/worldArtManifest.json',
    'src/components/AvatarRenderer.tsx','src/components/AvatarHero.tsx','src/components/WorldDisplayImage.tsx',
    'src/components/TreasureShowcase.tsx','src/components/PetCompanion.tsx',
    'src/v4/SecondaryViews.tsx','src/v4/Dashboard.tsx','src/equipmentPreview.ts',
    'src/worldArtAssets.ts','src/useWorldDisplayPath.ts','src/useRobotBlink.ts','src/styles/index.css',
    'src/styles/components/dashboard.css','src/styles/components/shop.css','src/styles/components/pet.css',
    'src/styles/responsive.css','src/styles/layout.css','src/styles/themes.css','src/styles/legacy-compat.css',
    'scripts/qa_v653_full_shop_acceptance.py','scripts/qa_v653_full_shop_aggregate.py','scripts/qa_v653_shop_resume.py','scripts/qa_v653_shop_coverage.py',
]


def read_bytes(path):
    """A streamed Drive placeholder must fail with its exact path within 20 seconds."""
    path = Path(path)
    previous = signal.signal(signal.SIGALRM, lambda *_: (_ for _ in ()).throw(
        TimeoutError('FILE_READ_TIMEOUT: '+str(path))))
    signal.alarm(20)
    try:
        return path.read_bytes()
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, previous)


def sha(path):
    return hashlib.sha256(read_bytes(path)).hexdigest()


def inventory():
    source = read_bytes(ROOT/'src/cosmetics.ts').decode().split('export const cosmetics:')[1].split('];')[0]
    rows = [dict(zip(['id','slot','name'], m.groups())) for m in re.finditer(
        r"id\s*:\s*'([^']+)'\s*,\s*slot\s*:\s*'([^']+)'\s*,\s*name\s*:\s*'([^']+)'", source)]
    assert rows and len({r['id'] for r in rows}) == len(rows), 'empty/duplicate inventory'
    assert all(r['slot'] in LABELS for r in rows), 'new slot needs an explicit selector contract'
    return rows


def public_refs(value):
    refs = set()
    if isinstance(value, str) and value.startswith('public/assets/'):
        refs.add(value)
    elif isinstance(value, dict):
        for v in value.values():
            refs.update(public_refs(v))
    elif isinstance(value, list):
        for v in value:
            refs.update(public_refs(v))
    return refs


def declared_hashes(value, result=None):
    result = {} if result is None else result
    if isinstance(value, dict):
        path, digest = value.get('path'), value.get('sha256')
        if isinstance(path, str) and path.startswith('public/assets/') and digest:
            assert path not in result or result[path] == digest, ('conflicting SHA', path)
            result[path] = digest
        for v in value.values():
            declared_hashes(v, result)
    elif isinstance(value, list):
        for v in value:
            declared_hashes(v, result)
    return result


def public_file(url_path):
    file = (ROOT/'public'/unquote(url_path.lstrip('/'))).resolve()
    assert file.is_relative_to((ROOT/'public/assets').resolve()), ('not a local public asset', url_path)
    return file


BODY = r'''e=>{const r=e.getBoundingClientRect(),i=e.querySelector('.avatar-renderer-skin');
if(!i)return null;const b=i.getBoundingClientRect(),s=getComputedStyle(i),ratio=i.naturalWidth/i.naturalHeight;
const w=Math.min(b.width,b.height*ratio),h=w/ratio;
return {src:new URL(i.currentSrc||i.src).pathname,natural:[i.naturalWidth,i.naturalHeight],
container:r.toJSON(),imageBox:b.toJSON(),painted:{x:b.x+(b.width-w)/2,y:b.y+(b.height-h)/2,width:w,height:h},
skin:e.dataset.skin,artMode:e.dataset.artMode,rig:e.dataset.rigScene,objectFit:s.objectFit,transform:s.transform,
rendered:(e.dataset.renderedItems||'').split(' ').filter(Boolean),mask:s.maskImage};}'''
HEALTH = r'''()=>({overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),
broken:[...document.images].filter(i=>{const r=i.getBoundingClientRect(),s=getComputedStyle(i);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&i.complete&&i.currentSrc&&!i.naturalWidth}).map(i=>i.currentSrc),
errors:[...document.querySelectorAll('.v64-preview-load-error,[data-pet-status="unavailable"]')].filter(e=>e.getClientRects().length).map(e=>e.textContent),
theme:document.documentElement.className,viewport:[innerWidth,innerHeight]})'''
FETCH = r'''async u=>{const r=await fetch(u,{cache:'no-store'}),b=await r.arrayBuffer();return {status:r.status,
sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join(''),bytes:b.byteLength};}'''


def compare_body(before, after, tolerance):
    assert before and after, 'missing visible body image'
    assert before['objectFit'] == after['objectFit'] == 'contain', 'body paint math assumes object-fit contain'
    drift = {k: after['painted'][k]-before['painted'][k] for k in ['width','height']}
    assert max(abs(v) for v in drift.values()) <= tolerance, ('body painted scale drift', drift)
    visible_ratio = after['rasterBody']['paintedAlphaHeight']/before['rasterBody']['paintedAlphaHeight']
    assert visible_ratio >= .95, ('body raster silhouette became over 5% shorter',visible_ratio)
    return {'paintedSizeDeltaPx':drift,'bodyRasterAlphaHeightRatio':visible_ratio,
            'scope':'CSS painted scale plus actual body-image alpha extent. Masks, anatomy and pose still require image review.'}


class Runner:
    def __init__(self, args, out, manifests, frozen, asset_pins, report):
        self.args, self.out, self.manifests = args, out, manifests
        self.frozen, self.asset_pins, self.report = frozen, asset_pins, report
        self.store = json.loads(read_bytes(FIXTURE))
        assert all(k.startswith('star-learning-v40:__local__:') for k in self.store), 'fixture must be local-only'
        self.settings = json.loads(self.store[SETTINGS])
        self.blank = json.loads(self.store[KEY])
        self.records = {r['itemId']:r for r in manifests['world']['value']['records']}
        avatar = manifests['avatar']['value']
        self.wearables = {r['id']:r for r in avatar['accessories']}
        self.skins = {(r['avatarId'],r['skinId']):r for r in avatar['skins']}
        self.assets, self.api_blocks = {}, []
        self.body_bounds = {}

    def body(self, locator):
        result = locator.evaluate(BODY)
        assert result, 'missing body layer'
        path = result['src']
        if path not in self.body_bounds:
            image = Image.open(io.BytesIO(read_bytes(public_file(path)))).convert('RGBA')
            # Use nontrivial alpha, excluding transparent encoding noise.
            alpha = image.getchannel('A').point(lambda x:255 if x >= 16 else 0)
            bounds = alpha.getbbox()
            assert bounds, ('empty body raster',path)
            self.body_bounds[path] = (image.size,bounds)
        (width,height),bounds = self.body_bounds[path]
        result['rasterBody'] = {'size':[width,height],'alphaThreshold':16,'alphaBounds':bounds,
            'paintedAlphaWidth':result['painted']['width']*(bounds[2]-bounds[0])/width,
            'paintedAlphaHeight':result['painted']['height']*(bounds[3]-bounds[1])/height,
            'normalizedBottom':bounds[3]/height,
            'limit':'Body image only; CSS hair/headwear masks and fitted anatomy are not measured by alpha extent.'}
        return result

    def stable(self):
        assert all(sha(ROOT/f) == digest for f,digest in self.frozen.items()), 'source drift: stop and choose a fresh candidate'
        for data in self.manifests.values():
            assert sha(data['file']) == data['sha256'], 'candidate manifest changed during run'

    def save(self):
        (self.out/'report.json').write_text(json.dumps(self.report, ensure_ascii=False, indent=2)+'\n')

    def route(self, route):
        request = route.request
        path = urlsplit(request.url).path
        if path in ['/api/time','/api/server-time']:
            route.fulfill(status=200, json=TIME)
        elif '/api/' in path or request.method not in ['GET','HEAD','OPTIONS']:
            self.api_blocks.append({'path':path,'method':request.method})
            route.fulfill(status=503, body='isolated synthetic acceptance fixture; no family API access')
        elif not self.args.formal and path in ['/src/data/avatarAssetManifest.json','/src/data/worldArtManifest.json']:
            name = 'avatar' if path.endswith('/avatarAssetManifest.json') else 'world'
            route.fulfill(status=200, content_type='application/javascript', body='export default '+self.manifests[name]['text']+';')
        else:
            route.continue_()

    def assets_proof(self, page, proof):
        refs = []
        for path in sorted(set(proof['urls'])):
            if not path.startswith('/assets/'):
                continue
            file = public_file(path)
            expected = self.asset_pins.get(path)
            current = sha(file)
            if expected is None:
                expected = current
                self.asset_pins[path] = current
            assert expected == current, ('local asset drift', path)
            actual = page.evaluate(FETCH, path)
            assert actual['status'] == 200 and actual['sha256'] == expected, ('HTTP bytes do not match pinned file', path, actual)
            self.assets[path] = {**actual,'expectedSHA256':expected}
            refs.append({'path':path,**self.assets[path]})
        return refs

    def capture(self, page, locator, folder, name):
        locator.wait_for(state='visible')
        locator.scroll_into_view_if_needed()
        proof = locator.evaluate(DECODE)
        assets = self.assets_proof(page, proof)
        image = folder/(name+'.png')
        locator.screenshot(path=str(image), animations='disabled')
        health = page.evaluate(HEALTH)
        assert health['overflow'] <= 1 and not health['broken'] and not health['errors'], health
        return {'proof':proof,'assets':assets,'health':health,'screenshot':str(image.relative_to(ROOT)),
                'screenshotSHA256':sha(image),'rect':locator.bounding_box()}

    def render_barrier(self, locator, ident, present=True):
        # Storage writes can finish before React remounts the actual image layers.
        from playwright.sync_api import expect
        locator.wait_for(state='visible')
        pattern = re.compile(r'(^|\s)'+re.escape(ident)+r'(\s|$)')
        if present:
            expect(locator).to_have_attribute('data-rendered-items',pattern,timeout=15000)
        else:
            expect(locator).not_to_have_attribute('data-rendered-items',pattern,timeout=15000)
        locator.evaluate(DECODE)  # Visible image decode, CSS resources and two RAFs.
        assert (ident in (locator.get_attribute('data-rendered-items') or '').split()) == present

    def shop(self, page, item):
        page.get_by_role('button', name='寶物商店', exact=True).first.click()
        page.locator('#shop-learner-tab-child-1').click()
        page.get_by_role('tab', name=LABELS[item['slot']], exact=True).click()
        card = page.locator('article[data-item-id="'+item['id']+'"]')
        for _ in range(12):
            if card.count():
                break
            more = page.locator('.v64-load-more')
            assert more.count() and more.is_visible(), 'missing item and no load-more button'
            more.click()
        assert card.count() == 1
        card.scroll_into_view_if_needed()
        return card

    def home(self, page):
        page.get_by_role('button', name='首頁', exact=True).first.click()
        page.locator('.v4-dashboard-grid').wait_for()
        return page.locator('.v4-player-card').first

    def world(self, page, item):
        slot, ident = item['slot'], item['id']
        selectors = {'spaceship':'.v6-equipped-header-ship','robot':'.v6-ai-robot-art',
            'room':'.v4-shell.has-'+ident+' .v4-dashboard-grid',
            'card':'.v4-lesson-card[data-collectible-card="'+ident+'"] .v653-lesson-collectible',
            'pet':'.v4-left-column [data-pet-item="'+ident+'"]',
            'effect':'.v4-player-card .avatar-renderer'}
        return page.locator(selectors[slot]).first

    def case(self, page, row, errors):
        item, avatar, profile = row['item'], row['avatar'], row['profile']
        ident, slot = item['id'], item['slot']
        folder = self.out/profile['id']/avatar/ident
        folder.mkdir(parents=True, exist_ok=False)
        self.stable()
        page.set_viewport_size({'width':profile['width'],'height':profile['height']})
        page.emulate_media(color_scheme=profile['theme'], reduced_motion='reduce')
        settings = copy.deepcopy(self.settings)
        settings.update(theme=profile['theme'],homeDisplayLearnerId='child-1')
        settings['children'][0].update(avatar=avatar,name=avatar)
        progress = copy.deepcopy(self.blank)
        progress['child-1'].update(unlockedCosmetics=[ident],equippedCosmetics=[],equipmentTransactions=[],
            purchaseTransactions=[{'id':'fixture-owned-'+ident,'childId':'child-1','itemId':ident,'cost':0,
                'createdAt':'2026-09-02T00:00:00.000Z','source':'purchase'}])
        store = dict(self.store)
        store.update({SETTINGS:json.dumps(settings),KEY:json.dumps(progress),'little-explorers-v4-sound':'off'})
        # Unload the prior App before seeding. Its persistence/merge cleanup must
        # not append the preceding case's ledger to this new synthetic fixture.
        seed_url = self.args.url.rstrip('/')+'/__qa_fixture_seed__'
        seed_route = lambda route:route.fulfill(status=200,content_type='text/html',body='<!doctype html><title>Isolated QA seed</title>')
        page.route(seed_url,seed_route)
        page.goto(seed_url,wait_until='load')
        page.evaluate('(s)=>{localStorage.clear();sessionStorage.clear();for(const[k,v]of Object.entries(s))localStorage.setItem(k,v)}',store)
        page.unroute(seed_url,seed_route)
        page.goto(self.args.url,wait_until='domcontentloaded')
        page.locator('.v4-dashboard-grid').wait_for()
        snapshot = lambda:page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)
        before = snapshot()
        row['ledgerBefore'] = before['child-1']
        assert before['child-1']['equippedCosmetics'] == [] and before['child-1']['equipmentTransactions'] == [], 'fixture contaminated before case'
        assert before['child-1']['unlockedCosmetics'] == [ident], 'fixture inventory contaminated before case'
        base_home = self.home(page).locator('.avatar-renderer').first
        base_home.scroll_into_view_if_needed(); base_home.evaluate(DECODE)
        base_home_body = self.body(base_home)
        card = self.shop(page,item)
        stage = page.locator('.v63-equipment-stage')
        stage.scroll_into_view_if_needed(); stage.evaluate(DECODE)
        base_shop_body = self.body(stage.locator('.avatar-renderer').first)
        row['catalog'] = self.capture(page,card.locator('.v4-item-art'),folder,'shop-catalog-actual-size')
        card.locator('.v6-preview-button').click()
        page.wait_for_function('id=>document.querySelector(".v63-equipment-stage")?.dataset.previewItem===id',arg=ident)
        if slot in WEARABLE or slot == 'effect':
            self.render_barrier(stage.locator('.avatar-renderer').first,ident)
        row['trial'] = self.capture(page,stage,folder,'shop-trial')
        if slot in WEARABLE:
            renderer = stage.locator('.avatar-renderer').first
            body = self.body(renderer)
            assert ident in body['rendered'], ('trial item not actually rendered', ident)
            row['shopBody'] = {'before':base_shop_body,'trial':body,'comparison':compare_body(base_shop_body,body,self.args.body_tolerance_px)}
            row['trialAvatar'] = self.capture(page,renderer,folder,'shop-avatar-actual-size')
        else:
            assert ident in self.records, ('world manifest is missing current SKU',ident)
            expected = {'/'+p.removeprefix('public/') for p in public_refs(self.records[ident])}
            assert expected.intersection(row['trial']['proof']['urls']), ('trial does not show candidate world asset',ident)
        assert snapshot() == before, 'preview mutated progress'
        card.locator('.v6-preview-button').click()
        page.wait_for_function('id=>document.querySelector(".v63-equipment-stage")?.dataset.previewItem!==id',arg=ident)
        assert snapshot() == before, 'cancel mutated progress'
        row['cancelPreservesProgress'] = True
        card.get_by_role('button',name='立即穿上' if slot in WEARABLE else '立即使用',exact=True).click()
        page.wait_for_function('([k,i])=>JSON.parse(localStorage.getItem(k))["child-1"].equippedCosmetics.includes(i)',arg=[KEY,ident])
        equipped = snapshot()
        row['ledgerAfterEquip'] = equipped['child-1']
        assert equipped['child-1']['purchaseTransactions'] == before['child-1']['purchaseTransactions']
        tx = equipped['child-1']['equipmentTransactions']
        assert len(tx) == 1 and tx[0]['itemId'] == ident and tx[0]['action'] == 'equip', ('unexpected equip ledger',tx)
        assert all(equipped[k] == v for k,v in before.items() if k != 'child-1'), 'other learner changed'
        if slot in WEARABLE or slot == 'effect':
            self.render_barrier(stage.locator('.avatar-renderer').first,ident)
        row['equipped'] = self.capture(page,stage,folder,'shop-equipped')
        if slot in WEARABLE:
            row['equipBodyComparison'] = compare_body(row['shopBody']['trial'],self.body(stage.locator('.avatar-renderer').first),self.args.body_tolerance_px)
        home_card = self.home(page)
        home_renderer = home_card.locator('.avatar-renderer').first
        if slot in WEARABLE or slot == 'effect':
            self.render_barrier(home_renderer,ident)
        row['home'] = self.capture(page,home_card,folder,'home-player')
        home_body = self.body(home_renderer)
        row['homeBody'] = {'before':base_home_body,'equipped':home_body,'comparison':compare_body(base_home_body,home_body,self.args.body_tolerance_px)}
        if slot in WEARABLE or slot == 'effect':
            assert ident in home_body['rendered'], 'Home wearable/effect not rendered'
        if slot not in WEARABLE:
            world = self.world(page,item)
            row['homeWorld'] = self.capture(page,world,folder,'home-world-inline')
            expected = {'/'+p.removeprefix('public/') for p in public_refs(self.records[ident])}
            assert expected.intersection(row['homeWorld']['proof']['urls']), ('Home world item not truly displayed',ident)
            if slot == 'card':
                assert world.evaluate("e=>e.tagName==='IMG'&&e.naturalWidth>0"), 'card must be an inline image'
                header = page.locator('.v4-lesson-card[data-collectible-card="'+ident+'"] .v5-lesson-card-header').first
                row['homeWorldContext'] = self.capture(page,header,folder,'home-world-inline-in-lesson-header')
        assert snapshot() == equipped
        page.reload(wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for()
        assert snapshot() == equipped, 'reload altered immutable ledger'
        if slot in WEARABLE or slot == 'effect':
            self.render_barrier(page.locator('.v4-player-card .avatar-renderer').first,ident)
        row['homeReload'] = self.capture(page,page.locator('.v4-player-card').first,folder,'home-reload')
        if slot not in WEARABLE:
            row['homeWorldReload'] = self.capture(page,self.world(page,item),folder,'home-world-reload')
        page.get_by_role('button',name='成就獎勵',exact=True).first.click()
        page.locator('#achievement-tab-child-1').click()
        achievement = page.locator('#achievement-panel header .avatar-renderer')
        if slot in WEARABLE or slot == 'effect':
            self.render_barrier(achievement,ident)
        row['achievement'] = self.capture(page,achievement,folder,'achievements-avatar')
        if slot in WEARABLE or slot == 'effect':
            assert ident in achievement.evaluate(BODY)['rendered'], 'Achievements wearable/effect not rendered'
        assert snapshot() == equipped, 'Achievements visit altered ledger'
        card = self.shop(page,item)
        card.get_by_role('button',name='先收起來',exact=True).click()
        page.wait_for_function('([k,i])=>!JSON.parse(localStorage.getItem(k))["child-1"].equippedCosmetics.includes(i)',arg=[KEY,ident])
        after = snapshot()
        after_tx = after['child-1']['equipmentTransactions']
        assert len(after_tx) == 2 and after_tx[:-1] == tx and after_tx[-1]['itemId'] == ident and after_tx[-1]['action'] == 'unequip'
        assert after['child-1']['purchaseTransactions'] == before['child-1']['purchaseTransactions']
        assert all(after[k] == v for k,v in before.items() if k != 'child-1')
        home_card = self.home(page)
        home_renderer = home_card.locator('.avatar-renderer').first
        self.render_barrier(home_renderer,ident,present=False)
        home_renderer.evaluate(DECODE)
        assert ident not in home_renderer.evaluate(BODY)['rendered']
        if slot not in WEARABLE and slot != 'effect':
            if slot in ['spaceship','robot']:
                assert self.world(page,item).count() == 0
            elif slot in ['card','pet','room']:
                assert self.world(page,item).count() == 0
        page.reload(wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for()
        assert snapshot() == after, 'unequip reload altered ledger'
        assert not errors, errors
        record = self.skins[(avatar,ident)] if slot == 'outfit' else self.wearables[ident] if slot in WEARABLE else self.records[ident]
        expected_paths = {'/'+p.removeprefix('public/') for p in public_refs(record)}
        fields = ['catalog','trial','equipped','home','homeReload','achievement'] if slot in WEARABLE else ['trial','homeWorld','homeWorldReload']
        row['exactCandidatePaths'] = {field:sorted(expected_paths.intersection(row[field]['proof']['urls'])) for field in fields}
        assert all(row['exactCandidatePaths'].values()), ('missing exact candidate SKU in actual view',ident,row['exactCandidatePaths'])
        self.stable()
        row.update(status='PASS_FUNCTIONAL_PENDING_VISUAL',equipmentTransactions=after_tx,
            ledgerScope='one synthetic cost-zero owned item; actual UI equip + unequip append-only; no real purchase assertion',
            visualReview='NOT_PERFORMED')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--attempt',required=True)
    ap.add_argument('--candidate-id',default='UNSPECIFIED')
    ap.add_argument('--avatar-manifest',type=Path)
    ap.add_argument('--world-manifest',type=Path)
    ap.add_argument('--profiles-json',type=Path,help='Four explicit {id,width,height,theme} profiles; default desktop/mobile x light/dark')
    ap.add_argument('--items',default='')
    ap.add_argument('--avatars',default=','.join(AVATARS))
    ap.add_argument('--max-cases',type=int,default=0,help='Bounded smoke only; partial runs never receive full-matrix PASS')
    ap.add_argument('--body-tolerance-px',type=float,default=1.0)
    ap.add_argument('--url',default='http://127.0.0.1:5178/')
    ap.add_argument('--run',action='store_true',help='Explicitly start browser after final manifests have been chosen')
    ap.add_argument('--formal',action='store_true',help='Require local manifest bytes equal selected candidate; never override manifest or CSS responses')
    ap.add_argument('--resume-reports',type=Path,nargs='+',default=[],help='Carry only exact successful rows with immutable report/image/source lineage')
    ap.add_argument('--product-source-pins',type=Path)
    ap.add_argument('--resume-launch-proof',type=Path)
    args = ap.parse_args()
    assert re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_-]*',args.attempt), 'attempt must be a simple label'
    assert urlsplit(args.url).hostname in ['localhost','127.0.0.1','::1'], 'local candidate URL only'
    assert args.body_tolerance_px >= 0 and args.max_cases >= 0
    assert not args.resume_reports or args.formal, 'carry-forward only supported for formal runs'
    if args.run:
        assert args.avatar_manifest and args.world_manifest and args.candidate_id != 'UNSPECIFIED', 'final candidate ID and BOTH manifests required'
    profiles = json.loads(read_bytes(args.profiles_json)) if args.profiles_json else PROFILES
    assert len(profiles) == 4 and len({p['id'] for p in profiles}) == 4, 'exactly four unique profiles required'
    assert all(re.fullmatch(r'[a-zA-Z0-9_-]+',p['id']) and p['theme'] in ['light','dark'] and p['width'] >= 320 and p['height'] >= 600 for p in profiles)
    items = inventory(); avatars = args.avatars.split(',')
    assert avatars and len(set(avatars)) == len(avatars) and set(avatars) <= set(AVATARS)
    requested = args.items.split(',') if args.items else [r['id'] for r in items]
    assert set(requested) <= {r['id'] for r in items}, 'unknown requested SKU'
    selected = [r for r in items if r['id'] in requested]
    matrix = [{'item':item,'avatar':avatar,'profile':profile} for profile in profiles for avatar in avatars for item in selected]
    planned = matrix[:args.max_cases] if args.max_cases else matrix
    out = BASE/('final-full-shop-'+args.attempt)
    out.mkdir(parents=True,exist_ok=False)
    report = {'status':'PLAN_ONLY','candidateId':args.candidate_id,'inventory':items,'inventoryCount':len(items),
        'formal':args.formal,'manifestOverride':not args.formal,'cssOverride':False,
        'slotCounts':dict(Counter(r['slot'] for r in items)),'profiles':profiles,'avatars':avatars,
        'fullMatrixCount':len(items)*len(AVATARS)*len(profiles),'selectedMatrixCount':len(matrix),'plannedCases':len(planned),
        'selectionIsFullMatrix':len(planned)==len(items)*len(AVATARS)*len(profiles),
        'fixtureScope':'Synthetic preowned cost-zero PurchaseTransaction per item; real UI equip/cancel/unequip. Not a pricing/purchase/auth/cloud or production acceptance test.',
        'screenshotScope':'Actual unresized catalog artwork (190px where product CSS selects it), Shop stage/avatar, Home player/world, reload, Achievements. No CSS forced sizes or product composites.',
        'geometryScope':'Compare painted body size and actual body-image alpha extent before/trial/equip/Home; flag over 5% silhouette height shrink. Not proof of correct masks, anatomy or fitted art.',
        'worldScope':'Exact selected world asset in Shop/Home; card must be inline IMG, room must be the actual equipped dashboard-grid background. World items are not required to appear in Achievements avatar.',
        'limitations':['Chromium only; reduced-motion matrix; separate motion/real purchase/cloud gates remain required',
            'Vite local candidate route only; final production bundle requires separate verification',
            'Static catalog parser must match runtime imported catalog before any case',
            'Functional PASS never implies image visual acceptance; all saved screenshots require reviewer ledger',
            'Four default profiles are 1440 light/dark and 390 light/dark; pass profiles-json for 820/412 or another explicit set'],
        'cases':[]}
    (out/'plan.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    if not args.run:
        print(json.dumps({k:report[k] for k in ['status','inventoryCount','slotCounts','fullMatrixCount','plannedCases']},ensure_ascii=False,indent=2))
        print('No browser launched. Final manifest paths and --run are required.')
        return 0
    assert args.avatar_manifest and args.world_manifest and args.candidate_id != 'UNSPECIFIED', 'final candidate ID and BOTH manifests required'
    manifests = {}
    for name,path in [('avatar',args.avatar_manifest),('world',args.world_manifest)]:
        path = path.resolve(); raw = read_bytes(path)
        manifests[name] = {'file':str(path),'sha256':hashlib.sha256(raw).hexdigest(),'text':raw.decode(),'value':json.loads(raw)}
        if args.formal:
            local = ROOT/'src/data'/('avatarAssetManifest.json' if name=='avatar' else 'worldArtManifest.json')
            assert read_bytes(local) == raw, ('formal requires byte-equal integrated manifest',name)
    assert set(r['itemId'] for r in manifests['world']['value']['records']) >= {r['id'] for r in items if r['slot'] not in WEARABLE}, 'world manifest lacks current inventory'
    source_paths = sorted(set(SOURCES) | {str(p.relative_to(ROOT)) for p in (ROOT/'src/styles').rglob('*.css')})
    frozen = {f:sha(ROOT/f) for f in source_paths}
    frozen[str(FIXTURE.relative_to(ROOT))] = sha(FIXTURE)
    carried = {}
    if args.product_source_pins:
        product_pins = json.loads(read_bytes(args.product_source_pins))
        assert all(sha(ROOT/path)==digest for path,digest in product_pins.items()), 'product source pins changed'
        frozen.update(product_pins)
        report['productSourcePins'] = product_pins
        report['productSourcePinsSHA256'] = sha(args.product_source_pins)
    if args.resume_reports:
        from qa_v653_shop_resume import load_resume
        carried,proof = load_resume(args.resume_reports,items,profiles,manifests,args.candidate_id,args.product_source_pins,args.resume_launch_proof)
        report['resumeProof'] = proof
    report.update(carriedCaseCount=0,executedCaseCount=0)
    asset_pins = {}
    for data in manifests.values():
        declared = declared_hashes(data['value'])
        for path in sorted(public_refs(data['value'])):
            digest = sha(public_file('/'+path.removeprefix('public/')))
            assert path not in declared or digest == declared[path], ('candidate declared hash mismatch',path)
            asset_pins['/'+path.removeprefix('public/')] = digest
    report.update(status='RUNNING',sourcePins=frozen,candidateManifests={k:{'file':v['file'],'sha256':v['sha256']} for k,v in manifests.items()},candidateAssetPins=asset_pins.copy())
    runner = Runner(args,out,manifests,frozen,asset_pins,report);runner.save()
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width':1440,'height':1050},reduced_motion='reduce',service_workers='block',device_scale_factor=1)
        context.route_web_socket('**',lambda ws:None)
        context.route('**/*',runner.route)
        page = context.new_page();page.set_default_timeout(15000)
        context.new_cdp_session(page).send('Network.setCacheDisabled',{'cacheDisabled':True})
        errors = [];page.on('pageerror',lambda e:errors.append(str(e)))
        try:
            page.goto(args.url,wait_until='domcontentloaded')
            for name in ['avatar','world']:
                module = '/src/data/'+('avatarAssetManifest.json' if name=='avatar' else 'worldArtManifest.json')
                actual = page.evaluate('async u=>(await import(u)).default',module)
                assert actual == manifests[name]['value'], ('runtime manifest route mismatch',name)
            actual_inventory = page.evaluate("async()=>(await import('/src/cosmetics.ts')).cosmetics.map(({id,slot,name})=>({id,slot,name}))")
            assert actual_inventory == items, 'served Vite inventory differs from local catalog; restart/resolve candidate first'
            assert not errors, ('page errors during preflight',errors)
            report['runtimeInventoryMatches'] = True
            for index,row in enumerate(planned):
                row = copy.deepcopy(row);row['index'] = index;errors.clear()
                key = (row['profile']['id'],row['avatar'],row['item']['id'])
                if key in carried:
                    row = copy.deepcopy(carried[key]);row['index'] = index
                    runner.stable()
                    report['cases'].append(row);report['carriedCaseCount']+=1;runner.save()
                    print(index+1,len(planned),*key,'CARRIED_EXACT_PASS',flush=True)
                    continue
                try:
                    runner.case(page,row,errors)
                except Exception as error:
                    row.update(status='FAIL',error=str(error),traceback=traceback.format_exc(),pageErrors=errors[:])
                    try:
                        page.screenshot(path=str(out/f'failure-{index:04d}.png'),full_page=True,timeout=5000)
                    except Exception:
                        pass
                report['cases'].append(row);report['executedCaseCount']+=1;runner.save()
                print(index+1,len(planned),row['profile']['id'],row['avatar'],row['item']['id'],row['status'],row.get('error','')[:150],flush=True)
                if row['status'] == 'FAIL':
                    break
        except Exception as error:
            report.update(status='FAIL_PREFLIGHT',error=str(error),traceback=traceback.format_exc())
        finally:
            # Remove handlers before closing: avoid post-close pending route futures in the evidence log.
            context.unroute_all(behavior='wait');context.close();browser.close()
    report['servedAssets'] = runner.assets;report['blockedFamilyOrMutationRequests'] = runner.api_blocks
    if not report['status'].startswith('FAIL'):
        passed = len(report['cases']) == len(planned) and all(r['status']=='PASS_FUNCTIONAL_PENDING_VISUAL' for r in report['cases'])
        report['status'] = ('PASS_FUNCTIONAL_PENDING_VISUAL' if report['selectionIsFullMatrix'] else 'PASS_SELECTED_CASES_ONLY_PENDING_VISUAL') if passed else 'FAIL'
    runner.save()
    return 0 if report['status'].startswith('PASS') else 1


if __name__ == '__main__':
    sys.exit(main())
