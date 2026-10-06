"""Same-candidate hair/hat/native phones Shop lifecycle, synthetic local fixtures.

Runs each role/outfit in four viewport/theme profiles. No real family API.
Captures are evidence; final visual acceptance is recorded separately.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright
from qa_v653_shop_coverage import DECODE, KEY, TIME

ROOT = Path(__file__).resolve().parents[1]
AVATARS = ['brother', 'younger', 'sister', 'younger-sister']
SKINS = ['default', 'outfit-cadet', 'outfit-mecha', 'outfit-ocean', 'outfit-mage', 'outfit-legend', 'sister-bloom-outfit', 'outfit-racer']
URL = 'http://127.0.0.1:5178/'
parser = argparse.ArgumentParser()
parser.add_argument('--candidate', required=True)
parser.add_argument('--attempt', required=True)
parser.add_argument('--phone', default='phones-legend')
parser.add_argument('--skins', default=','.join(SKINS))
parser.add_argument('--profiles', default='390-light,390-dark,1440-light,1440-dark')
args = parser.parse_args()
PHONE = args.phone
assert PHONE in ['phones-legend','story-headphones','phones-sky','phones-racer','starter-buddy-headphones','phones-ai','sister-cat-headphones']
candidate_path = ROOT / args.candidate
candidate = json.loads(candidate_path.read_text())
by_id = {a['id']: a for a in candidate['accessories']}
out = ROOT / 'qa/v653/20261005/wearables' / args.attempt
out.mkdir(parents=True, exist_ok=False)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
sources = ['src/App.tsx', 'src/components/AvatarRenderer.tsx', 'src/avatarAssetRegistry.ts', 'src/useAvatarDetailReadiness.ts',
           'src/cosmetics.ts', 'src/v4/SecondaryViews.tsx', 'src/v4/Dashboard.tsx', 'src/styles/components/dashboard.css',
           'scripts/qa_v653_mixed_lifecycle.py']
frozen = {p: sha(ROOT / p) for p in sources}
template = json.loads((ROOT / 'qa/v653/20261005/lessons/default-storage.json').read_text())
report = {'status': 'RUNNING', 'candidate': args.candidate, 'candidateSha256': sha(candidate_path), 'phone': PHONE, 'sourcePins': frozen,
          'profiles': args.profiles.split(','), 'cases': [], 'visualAcceptance': 'SEPARATE', 'familyAPI': 'ALL_BLOCKED',
          'fixture': 'fresh isolated local storage, zero-cost explicit owned cosmetic entries; no cloud or actual purchases'}
served = {}
save = lambda: (out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')


def image_proof(page, proof):
    result = []
    for path in proof['urls']:
        if not path.startswith('/assets/'):
            continue
        if path not in served:
            file = ROOT / 'public' / unquote(path.removeprefix('/'))
            response = page.evaluate('''async path=>{const response=await fetch(path,{cache:'no-store'});
              const bytes=await response.arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',bytes);
              return {status:response.status,sha256:[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('')};}''', path)
            assert response['status'] == 200, path
            actual = response['sha256']
            assert actual == sha(file), ('browser/local different candidate', path)
            served[path] = actual
        result.append({'path': path, 'sha256': served[path]})
    return result


def ready(stage, equipped, avatar, skin, with_hat=True, with_phones=False):
    renderer = stage if 'avatar-renderer' in (stage.get_attribute('class') or '').split() else stage.locator('.avatar-renderer').first
    renderer.wait_for()
    renderer.page.wait_for_function('''([e,ids])=>ids.every(id=>(e.dataset.renderedItems||'').split(' ').includes(id))''',
                                   arg=[renderer.element_handle(), equipped])
    proof = renderer.evaluate(DECODE)
    detail = by_id['hair-legend']['headwearHairDetails'][avatar][skin] if with_hat else (
        by_id['hair-legend']['defaultSkinDetails'][avatar] if skin == 'default' else by_id['hair-legend']['skinDetails'][avatar][skin])
    expected = '/' + detail['overlay'].removeprefix('public/')
    assert any(i['src'] == expected and i['width'] == 1024 and i['height'] == 1792 for i in proof['images']), ('wrong/stale hair detail', expected)
    if with_phones:
        phones = by_id[PHONE]
        for key in ['back', 'front']:
            path = phones[key + 'Variants'][avatar] if skin == 'default' else phones['skin' + key.title() + 'Variants'][avatar][skin]
            expected_phone = '/' + path.removeprefix('public/')
            assert any(i['src'] == expected_phone and i['width'] == 1024 and i['height'] == 1792 for i in proof['images']), ('wrong native split', expected_phone)
    body = next(i for i in proof['images'] if 'avatar-renderer-skin' in i['cls'])
    frame = renderer.bounding_box()
    assert frame
    relative = {**body['rect'], 'x': body['rect']['x'] - frame['x'], 'y': body['rect']['y'] - frame['y']}
    return renderer, proof, relative


def card_for(page, ident, label):
    page.get_by_role('tab', name=label, exact=True).click()
    card = page.locator(f'article[data-item-id="{ident}"]')
    for _ in range(8):
        if card.count():
            break
        page.locator('.v64-load-more').click()
    card.scroll_into_view_if_needed()
    return card


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    for profile in args.profiles.split(','):
        served = {}
        width_text, theme = profile.split('-')
        context = browser.new_context(viewport={'width': int(width_text), 'height': 1050}, reduced_motion='reduce', service_workers='block', color_scheme=theme)
        context.route_web_socket('**', lambda ws: None)
        context.route('**/api/**', lambda route: route.fulfill(status=200, json=TIME)
                      if urlsplit(route.request.url).path in ['/api/time', '/api/server-time'] else route.fulfill(status=503, body='isolated local fixture'))
        context.route('**/src/data/avatarAssetManifest.json*', lambda route: route.fulfill(content_type='text/javascript', body='export default ' + json.dumps(candidate) + ';'))
        page = context.new_page()
        page.set_default_timeout(18000)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        for avatar in AVATARS:
            for skin in args.skins.split(','):
                assert frozen == {p: sha(ROOT / p) for p in sources}, 'candidate source drift'
                row = {'avatar': avatar, 'skin': skin, 'profile': profile, 'status': 'RUNNING'}
                start_errors = len(errors)
                try:
                    store = copy.deepcopy(template)
                    settings = json.loads(store['star-learning-v40:__local__:settings'])
                    settings.update(theme=theme, homeDisplayLearnerId='child-1')
                    settings['children'][0].update(avatar=avatar, name='隔離驗證角色')
                    store['star-learning-v40:__local__:settings'] = json.dumps(settings)
                    store['little-explorers-v4-sound'] = 'off'
                    progress = json.loads(store[KEY])
                    owned = ['hair-legend', 'hat-crown', PHONE] + ([] if skin == 'default' else [skin])
                    base = ['hair-legend'] + ([] if skin == 'default' else [skin])
                    base_events = [{'id': 'fixture-equip-' + ident, 'childId': 'child-1', 'itemId': ident,
                                    'slot': 'hair' if ident == 'hair-legend' else 'skin', 'action': 'equip',
                                    'createdAt': '2026-09-02T00:00:00.000Z'} for ident in base]
                    progress['child-1'].update(unlockedCosmetics=owned, equippedCosmetics=base, equipmentTransactions=base_events,
                                              purchaseTransactions=[{'id': 'owned-' + ident, 'childId': 'child-1', 'itemId': ident, 'cost': 0,
                                                                     'createdAt': '2026-09-02T00:00:00.000Z', 'source': 'purchase'} for ident in owned])
                    store[KEY] = json.dumps(progress)
                    seed_url = URL.rstrip('/') + '/__qa_fixture_seed__'
                    def seed_handler(route):
                        route.fulfill(status=200, content_type='text/html', body='<!doctype html><title>Isolated QA seed</title>')
                    page.route(seed_url, seed_handler)
                    page.goto(seed_url, wait_until='load')
                    assert page.locator('#root').count() == 0, 'App still mounted on seed page'
                    page.evaluate('(s)=>{localStorage.clear();sessionStorage.clear();for(const[k,v]of Object.entries(s))localStorage.setItem(k,v)}', store)
                    assert page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))', KEY) == progress, 'seed ledger not exact'
                    page.unroute(seed_url, seed_handler)
                    page.goto(URL, wait_until='domcontentloaded')
                    page.locator('.v4-dashboard-grid').wait_for()
                    initial = page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))', KEY)
                    row['initialActual']=initial; row['initialExpected']=progress
                    assert initial == progress, 'initial App ledger differs from exact seed'
                    row['initialLedger'] = {'seedPage': seed_url, 'appAbsentDuringSeed': True,
                        'exactProgressMatch': True, 'equipmentEvents': initial['child-1']['equipmentTransactions'],
                        'equippedCosmetics': initial['child-1']['equippedCosmetics'],
                        'eventIds': [e['id'] for e in initial['child-1']['equipmentTransactions']]}
                    _, _, home_base = ready(page.locator('.v4-player-card .avatar-renderer').first, base, avatar, skin, False)
                    page.get_by_role('button', name='成就獎勵', exact=True).first.click()
                    page.locator('#achievement-tab-child-1').click()
                    _, _, achievement_base = ready(page.locator('#achievement-panel header .avatar-renderer'), base, avatar, skin, False)
                    row['bodyChecks'] = []
                    def stable_body(phase, expected, actual):
                        delta = max(abs(actual[k] - expected[k]) for k in ['x', 'y', 'width', 'height'])
                        row['bodyChecks'].append({'phase': phase, 'before': expected, 'after': actual, 'maxDelta': delta})
                        assert delta < .05, ('body changes within fixed avatar frame', phase, expected, actual)
                    page.get_by_role('button', name='寶物商店', exact=True).first.click()
                    page.locator('#shop-learner-tab-child-1').click()
                    stage = page.locator('.v63-equipment-stage')
                    _, before_proof, before_rect = ready(stage, base, avatar, skin, False)
                    image_proof(page, before_proof)
                    for ident, label in [('hat-crown', '帽子'), (PHONE, '耳機')]:
                        card = card_for(page, ident, label)
                        card.locator('.v6-preview-button').click()
                        current = base + ['hat-crown'] + ([] if ident == 'hat-crown' else [PHONE])
                        _, trial_proof, trial_rect = ready(stage, current, avatar, skin, True, ident == PHONE)
                        stable_body(ident + '-trial', before_rect, trial_rect)
                        row[ident + 'Assets'] = image_proof(page, trial_proof)
                        before = page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))', KEY)
                        card.locator('.v6-preview-button').click()
                        page.wait_for_function('id=>document.querySelector(".v63-equipment-stage")?.dataset.previewItem!==id', arg=ident)
                        assert page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))', KEY) == before, 'cancel altered ledger'
                        if ident == 'hat-crown':
                            ready(stage, base, avatar, skin, False)
                        card.get_by_role('button', name='立即穿上', exact=True).click()
                        page.wait_for_function('([k,id])=>JSON.parse(localStorage.getItem(k))["child-1"].equippedCosmetics.includes(id)', arg=[KEY, ident])
                    equipped = page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))', KEY)
                    events = equipped['child-1']['equipmentTransactions']
                    initial_ids = {e['id'] for e in base_events}
                    assert all(e in events for e in base_events), 'base fixture event changed'
                    new_events = [e for e in events if e['id'] not in initial_ids]
                    assert len(events) == len(base_events) + 2 and len(new_events) == 2
                    assert len({e['id'] for e in events}) == len(events), 'duplicate event IDs'
                    assert {e['itemId'] for e in new_events} == {'hat-crown', PHONE}
                    assert all(e['action'] == 'equip' and e['childId'] == 'child-1' for e in new_events)
                    assert set(equipped['child-1']['equippedCosmetics']) == set(base + ['hat-crown', PHONE])
                    row['newEquipmentEvents'] = new_events
                    assert equipped['child-2'] == progress['child-2']
                    # Capture the large actual trial stage for visual review.
                    # The 38px Home selector is only a navigation thumbnail.
                    # Ledger persistence completes before the newly mounted images
                    # decode. Wait for the entire worn look after the equip remount.
                    stage.scroll_into_view_if_needed()
                    equipped_renderer, equipped_proof, equipped_rect = ready(stage, base + ['hat-crown', PHONE], avatar, skin, True, True)
                    stable_body('equipped-Shop', before_rect, equipped_rect)
                    row['snapshotBarrier'] = {'renderedItems': equipped_renderer.get_attribute('data-rendered-items'), 'decodedImages': equipped_proof['images'], 'expectedItems': base + ['hat-crown', PHONE]}
                    row['equippedShopAssets'] = image_proof(page, equipped_proof)
                    trial_shot = out / f'{profile}--{avatar}--{skin}--shop.png'
                    stage.screenshot(path=str(trial_shot), animations='disabled')
                    row['shopScreenshot'] = str(trial_shot.relative_to(ROOT))
                    row['shopScreenshotSha256'] = sha(trial_shot)
                    page.get_by_role('button', name='首頁', exact=True).first.click()
                    home = page.locator('.v4-player-card .avatar-renderer').first
                    home.scroll_into_view_if_needed()
                    _, home_proof, home_rect = ready(home, base + ['hat-crown', PHONE], avatar, skin, True, True)
                    stable_body('Home', home_base, home_rect)
                    row['homeAssets'] = image_proof(page, home_proof)
                    shot = out / f'{profile}--{avatar}--{skin}.png'
                    home.screenshot(path=str(shot), animations='disabled')
                    row['screenshot'] = str(shot.relative_to(ROOT))
                    row['screenshotSha256'] = sha(shot)
                    page.reload()
                    page.locator('.v4-dashboard-grid').wait_for()
                    assert page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))', KEY) == equipped, 'reload changed ledger'
                    _, _, reload_rect = ready(page.locator('.v4-player-card .avatar-renderer').first, base + ['hat-crown', PHONE], avatar, skin, True, True)
                    stable_body('Home-reload', home_base, reload_rect)
                    page.get_by_role('button', name='成就獎勵', exact=True).first.click()
                    page.locator('#achievement-tab-child-1').click()
                    _, achievement_proof, achievement_rect = ready(page.locator('#achievement-panel header .avatar-renderer'), base + ['hat-crown', PHONE], avatar, skin, True, True)
                    stable_body('Achievement', achievement_base, achievement_rect)
                    row['achievementAssets'] = image_proof(page, achievement_proof)
                    assert page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))', KEY) == equipped
                    overflow = page.evaluate('()=>document.documentElement.scrollWidth-innerWidth')
                    assert overflow <= 1, ('overflow', overflow)
                    assert not errors[start_errors:]
                    assert frozen == {p: sha(ROOT / p) for p in sources}
                    row.update(status='PASS_FUNCTIONAL_SAME_CANDIDATE', bodyFrameDelta=max(c['maxDelta'] for c in row['bodyChecks']), ledgerEvents=2, overflow=overflow, pageErrors=[])
                except Exception as error:
                    row.update(status='FAIL', error=str(error), pageErrors=errors[start_errors:])
                    page.screenshot(path=str(out / 'failure.png'), full_page=True)
                report['cases'].append(row)
                save()
                print(profile, avatar, skin, row['status'], row.get('error', ''), flush=True)
                if row['status'] == 'FAIL':
                    raise AssertionError(row)
        context.close()
    browser.close()
report.update(status='PASS_FUNCTIONAL_SAME_CANDIDATE', servedAssets=served)
save()
