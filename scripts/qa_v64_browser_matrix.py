#!/usr/bin/env python3
"""V6.4 maintained browser matrix.

Supersedes the historical V5.1 CDP harness for current releases.  It keeps the
broad responsive/a11y/reduced-motion coverage while using controlled current
family-session API responses and V6.3/V6.4 Shop DOM contracts.
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any

from playwright.sync_api import Page, Route, sync_playwright
from qa_v63_browser_seed import SETTINGS as BASE_SETTINGS, PROGRESS as BASE_PROGRESS

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('AUDIT_URL', 'http://127.0.0.1:4174/')
RESULT = ROOT / '.qa' / 'v60_browser_result.json'
SHOT_DIR = ROOT / 'qa' / 'screenshots' / 'v64'
SHOT_DIR.mkdir(parents=True, exist_ok=True)
RESULT.parent.mkdir(parents=True, exist_ok=True)

PIN = '2468'
FAMILY_ID = hashlib.sha256(f'little-explorers-dev-family:{PIN}'.encode()).hexdigest()
TOKEN = 'v64-browser-controlled-token-' + ('x' * 48)
SESSION = {'familyId': FAMILY_ID, 'token': TOKEN, 'expiresAt': '2099-09-02T12:00:00.000Z'}
TIME = {
    'now': '2026-09-02T02:30:00.000Z', 'activeDate': '2026-09-02',
    'taipeiDate': '2026-09-02', 'taipeiTime': '10:30:00', 'timeZone': 'Asia/Taipei',
}
VIEWPORTS = [
    (1920,1080),(1536,1024),(1440,900),(1366,768),(1280,800),
    (1024,768),(820,1180),(768,1024),(430,932),(412,915),
    (393,852),(390,844),(360,800),
]
BASELINE_SHOTS = {(1536,1024),(820,1180),(390,844)}
FINGERPRINT_FILES = [
    'package.json',
    'src/App.tsx',
    'src/v4/Dashboard.tsx',
    'src/v4/LessonQuest.tsx',
    'src/v4/SecondaryViews.tsx',
    'src/v4/caregivers.tsx',
    'src/components/AvatarHero.tsx',
    'src/components/AvatarWardrobe.tsx',
    'src/components/AvatarRenderer.tsx',
    'src/components/TreasureShowcase.tsx',
    'src/cosmetics.ts',
    'src/avatarShop.ts',
    'src/shopLedger.ts',
    'src/types.ts',
    'src/data/avatarAssetManifest.json',
    'src/styles/components/dashboard.css',
    'src/styles/components/header.css',
    'src/styles/components/shop.css',
    'src/styles/layout.css',
    'src/styles/responsive.css',
]


def evidence_identity() -> dict[str, Any]:
    package = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))
    digest = hashlib.sha256()
    for rel in FINGERPRINT_FILES:
        digest.update(rel.encode())
        digest.update((ROOT / rel).read_bytes())
    return {
        'appVersion': package.get('version'),
        'gitSha': subprocess.check_output(['git','rev-parse','HEAD'], cwd=ROOT, text=True).strip(),
        'sourceFingerprint': digest.hexdigest(),
        'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'gate': 'v64-browser-matrix',
    }


def seeded_data() -> tuple[dict[str, Any], dict[str, Any]]:
    settings = json.loads(json.dumps(BASE_SETTINGS, ensure_ascii=False))
    settings['cloudSync'] = {'enabled': True, 'familyCode': FAMILY_ID}
    progress = json.loads(json.dumps(BASE_PROGRESS, ensure_ascii=False))
    for index, child in enumerate(settings['children'], start=1):
        child_id = child['id']
        p = progress[child_id]
        p['purchaseTransactions'] = [{
            'id': f'v64-browser-outfit-purchase-{index}', 'childId': child_id,
            'itemId': 'outfit-racer', 'cost': 130,
            'createdAt': f'2026-09-02T00:00:0{index}.000Z', 'source': 'purchase',
        }]
        p['equipmentTransactions'] = [{
            'id': f'v64-browser-outfit-equip-{index}', 'childId': child_id,
            'itemId': 'outfit-racer', 'slot': 'skin', 'action': 'equip',
            'createdAt': f'2026-09-02T00:01:0{index}.000Z',
        }]
        p['unlockedCosmetics'] = ['outfit-racer']
        p['equippedCosmetics'] = ['outfit-racer']
    return settings, progress


SETTINGS, PROGRESS = seeded_data()
SNAPSHOT = {
    'version': 2, 'updatedAt': '2026-09-02T02:00:00.000Z',
    'settings': SETTINGS, 'progress': PROGRESS, 'attendance': {}, 'reflections': {},
}
SEED = f"""(() => {{
  const familyId={json.dumps(FAMILY_ID)};
  const session={json.dumps(SESSION, ensure_ascii=False)};
  const settings={json.dumps(SETTINGS, ensure_ascii=False)};
  const progress={json.dumps(PROGRESS, ensure_ascii=False)};
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('star-learning-active-family-session-v40', JSON.stringify(session));
  localStorage.setItem(`star-learning-v40:${{familyId}}:settings`, JSON.stringify(settings));
  localStorage.setItem(`star-learning-v40:${{familyId}}:progress`, JSON.stringify(progress));
  localStorage.setItem(`star-learning-v40:${{familyId}}:attendance`, '{{}}');
  localStorage.setItem(`star-learning-v40:${{familyId}}:reflections`, '{{}}');
  sessionStorage.setItem(`star-learning-v40:${{familyId}}:active-user`, 'user-father');
  localStorage.setItem('little-explorers-v4-sound','off');
}})();"""


def fulfill_json(route: Route, data: Any, status: int = 200) -> None:
    route.fulfill(status=status, content_type='application/json', body=json.dumps(data, ensure_ascii=False))


def install_routes(context) -> None:
    context.route('**/api/server-time', lambda route: fulfill_json(route, TIME))
    context.route('**/api/time', lambda route: fulfill_json(route, TIME))

    def family(route: Route) -> None:
        try:
            payload = route.request.post_data_json or {}
        except Exception:
            payload = {}
        if payload.get('pin') == PIN:
            fulfill_json(route, SESSION)
        else:
            fulfill_json(route, {'error':'invalid controlled PIN'}, 400)

    def state(route: Route) -> None:
        method = route.request.method
        if method == 'GET':
            fulfill_json(route, SNAPSHOT)
        elif method == 'PUT':
            fulfill_json(route, {'ok':True,'updatedAt':'2026-09-02T02:00:01.000Z'})
        else:
            fulfill_json(route, {'error':'not allowed in controlled browser QA'}, 405)

    context.route('**/api/family-session', family)
    context.route('**/api/state**', state)


SNAPSHOT_JS = r"""() => {
  const source = node => node?.currentSrc || node?.src || '';
  const visible = node => {
    const style=getComputedStyle(node), r=node.getBoundingClientRect();
    return style.display!=='none' && style.visibility!=='hidden' && r.width>0 && r.height>0;
  };
  const interactive=[...document.querySelectorAll('button,a,input,select')].filter(visible);
  const focusTarget=interactive[0]; if(focusTarget) focusTarget.focus();
  const focusStyle=focusTarget ? getComputedStyle(focusTarget) : null;
  const broken=[...document.images].filter(img=>{
    const r=img.getBoundingClientRect();
    return r.bottom>=-200 && r.top<=innerHeight+200 && img.complete && img.naturalWidth===0 && !img.hidden;
  }).map(source);
  const lessonLayouts=[...document.querySelectorAll('.v4-lesson-card')].map(card=>{
    const thumb=card.querySelector('.v4-lesson-thumb'), info=card.querySelector('.v4-lesson-content');
    if(!thumb||!info)return {valid:false};
    const a=thumb.getBoundingClientRect(),b=info.getBoundingClientRect();
    return {valid:true,separated:a.right<=b.left+2};
  });
  return {
    viewport:{width:innerWidth,height:innerHeight},
    overflow:Math.max(0,Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth),
    header:document.querySelectorAll('.v5-cinematic-header').length,
    headerCharacters:document.querySelectorAll('.v5-hero-character').length,
    headerParents:document.querySelectorAll('.v6-hero-parent').length,
    navigationLabels:[...document.querySelectorAll('.v4-main-navigation button')].map(n=>String(n.textContent||'').trim()),
    navigationIcons:[...document.querySelectorAll('.v4-main-navigation img')].map(source),
    themeImages:[...document.querySelectorAll('.v5-header-theme img')].map(source),
    evolution:[...document.querySelectorAll('.v5-evolution-lane')].map(n=>n.querySelectorAll('.v5-evolution-stage').length),
    composedWardrobeLooks:[...document.querySelectorAll('.v4-player-profile .avatar-renderer-skin')].map(source),
    dashboardLearners:[...document.querySelectorAll('.v4-player-profile .v4-player-card')].map(n=>String(n.textContent||'').trim()),
    companionVisible:(()=>{const n=document.querySelector('.v4-ai-companion');if(!n)return false;const r=n.getBoundingClientRect();return r.width>0&&r.height>0;})(),
    lessonLayouts,
    brokenImages:broken,
    bopomofoCount:(document.body.innerText.match(/[ㄅ-ㄩ˙ˊˇˋ]/g)||[]).length,
    v40RuntimeMedia:[...document.querySelectorAll('img,video')].map(source).filter(src=>src.includes('/assets/v40/')),
    undersizedTargets:interactive.filter(n=>{const r=n.getBoundingClientRect();return r.width<44||r.height<44;}).map(n=>({tag:n.tagName,className:String(n.className||''),text:String(n.textContent||'').trim().slice(0,30),width:Math.round(n.getBoundingClientRect().width),height:Math.round(n.getBoundingClientRect().height)})),
    unlabeledControls:interactive.filter(n=>!String(n.textContent||'').trim() && !(n.getAttribute('aria-label')||n.getAttribute('title')||n.getAttribute('name'))).map(n=>({tag:n.tagName,className:String(n.className||'')})),
    focusVisible:focusStyle?{style:focusStyle.outlineStyle,width:focusStyle.outlineWidth,color:focusStyle.outlineColor}:null,
    dashboardColumnWidths:[...document.querySelectorAll('.v4-left-column,.v4-center-column,.v4-right-column')].map(n=>Math.round(n.getBoundingClientRect().width)),
  };
}"""


def check_snapshot(s: dict[str, Any], width: int) -> list[str]:
    failures=[]
    if s['header'] != 1: failures.append('cinematic header missing')
    if s['headerCharacters'] != 4 or s['headerParents'] != 2: failures.append('header family composition missing')
    if s['navigationLabels'] != ['首頁','今日課程','學期日曆','成就獎勵','學習報表','寶物商店']:
        failures.append(f"navigation order incorrect: {s['navigationLabels']}")
    if len(s['navigationIcons']) != 6 or any('/assets/v5/nav-icons/' not in x for x in s['navigationIcons']):
        failures.append('navigation icons missing')
    if len(s['themeImages']) != 5 or any('/assets/v5/themes/' not in x for x in s['themeImages']):
        failures.append('theme images missing')
    if s['evolution'] != [4,4,4,4]: failures.append(f"evolution stages incorrect: {s['evolution']}")
    if len(s['dashboardLearners']) != 4: failures.append('four learners not rendered')
    if not s['companionVisible']: failures.append('AI companion not rendered')
    if len(s['composedWardrobeLooks']) < 4 or any('/wardrobe/looks/outfit-racer-v1.webp' not in x for x in s['composedWardrobeLooks']):
        failures.append('four composed wardrobe looks missing')
    if len(s['lessonLayouts']) != 2 or any(not x.get('valid') or not x.get('separated') for x in s['lessonLayouts']):
        failures.append('daily lesson card layout invalid')
    if s['brokenImages']: failures.append(f"broken images: {s['brokenImages'][:4]}")
    if s['bopomofoCount']: failures.append('Bopomofo appeared in production DOM')
    if s['v40RuntimeMedia']: failures.append('visible runtime media still references assets/v40')
    if s['overflow'] > 1: failures.append(f"horizontal overflow {s['overflow']}px")
    if width < 600 and any(col < width - 30 for col in s['dashboardColumnWidths']):
        failures.append(f"mobile columns do not fill viewport: {s['dashboardColumnWidths']}")
    if s['undersizedTargets']: failures.append(f"undersized targets: {s['undersizedTargets'][:5]}")
    if s['unlabeledControls']: failures.append(f"unlabeled controls: {s['unlabeledControls'][:5]}")
    f=s['focusVisible']
    if not f or f['style']=='none' or f['width'] in ('0px',''):
        failures.append('keyboard focus indicator not visible')
    return failures


def click_nav(page: Page, label: str) -> None:
    page.get_by_role('button', name=label, exact=True).click()
    page.wait_for_timeout(150)


def desktop_flow(page: Page) -> list[str]:
    failures=[]
    # Child-facing semester preview remains read-only.
    click_nav(page,'學期日曆')
    page.wait_for_selector('.v4-semester-weeks', timeout=10000)
    before=page.evaluate(f"localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress')")
    future=page.locator('.v4-semester-day.future .v4-semester-actions button').first
    if future.count():
        future.click(); page.wait_for_selector('.v53-teaser-panel', timeout=10000)
        if page.locator('.v53-teaser-panel iframe,.v53-teaser-panel .v4-word-grid').count(): failures.append('future teaser exposed lesson material')
        if page.evaluate(f"localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress')") != before: failures.append('future teaser wrote progress')
        page.locator('.v4-history-close').click(); page.wait_for_timeout(120)
    past=page.locator('.v4-semester-day.past .v4-semester-actions button').first
    if past.count():
        past.click(); page.wait_for_selector('.v4-history-panel', timeout=10000)
        if page.locator('.v4-history-panel .v4-history-lessons').count(): failures.append('past child review exposed lesson material')
        if page.evaluate(f"localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress')") != before: failures.append('past child review wrote progress')
        page.locator('.v4-history-close').click(); page.wait_for_timeout(120)

    # Existing family report requires current secure AdminPinDialog.
    click_nav(page,'學習報表')
    dlg=page.get_by_role('dialog', name='管理者驗證')
    dlg.wait_for(timeout=10000)
    for digit in PIN:
        dlg.get_by_role('button', name=digit, exact=True).click()
    dlg.get_by_role('button', name='解鎖家長專區', exact=True).click()
    page.wait_for_selector('.v4-report-grid', timeout=10000)
    if not page.locator('.learning-mastery-panel').count(): failures.append('learning mastery panel missing')

    # V6.4 Shop uses current equipment stage and 63-item catalog.
    click_nav(page,'寶物商店')
    page.wait_for_selector('.v63-equipment-stage', timeout=10000)
    total=int(page.locator('.v4-page-kpi strong').inner_text().strip() or '0')
    if total != 63: failures.append(f'explorable catalog total {total}/63')
    if page.locator('.v6-shop-tabs button').count() != 4: failures.append('four learner Shop tabs missing')
    page.get_by_role('tab', name='服裝', exact=True).click(); page.wait_for_timeout(100)
    card=page.locator('article[data-item-id="outfit-racer"]')
    if not card.count(): failures.append('outfit-racer card missing')
    else:
        card.locator('.v6-preview-button').click()
        page.wait_for_function("() => document.querySelector('.v63-equipment-stage')?.dataset.previewItem === 'outfit-racer'", timeout=5000)
        src=page.locator('.v63-equipment-stage .avatar-renderer-skin').first.get_attribute('src') or ''
        if 'outfit-racer-v1.webp' not in src: failures.append(f'composed outfit preview missing: {src}')
    # Representative world art is real raster content in its dedicated mode.
    for category,item_id,selector in [
        ('飛船','ship-scout','.v63-ship-art'),('機器夥伴','robot-sky','.v63-robot-art'),('卡面','card-sky','.v63-card-art')
    ]:
        page.get_by_role('tab', name=category, exact=True).click(); page.wait_for_timeout(80)
        c=page.locator(f'article[data-item-id="{item_id}"]')
        if not c.count(): failures.append(f'{item_id} card missing'); continue
        c.locator('.v6-preview-button').click()
        page.wait_for_function("id => document.querySelector('.v63-equipment-stage')?.dataset.previewItem === id", arg=item_id, timeout=5000)
        img=page.locator(f'.v63-equipment-stage {selector}').first
        if not img.count():
            failures.append(f'{item_id} preview art missing/broken')
            continue
        try:
            page.wait_for_function(
                "el => el.tagName !== 'IMG' || (el.complete && el.naturalWidth > 0)",
                arg=img.element_handle(),
                timeout=5000,
            )
        except Exception:
            failures.append(f'{item_id} preview art missing/broken')
    return failures


def run() -> int:
    console_errors=[]; page_errors=[]; checks=[]; screenshots=[]; flow_failures=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True)
        for width,height in VIEWPORTS:
            context=browser.new_context(viewport={'width':width,'height':height})
            context.add_init_script(SEED); install_routes(context)
            page=context.new_page()
            page.on('console', lambda msg, wh=f'{width}x{height}': console_errors.append({'viewport':wh,'text':msg.text}) if msg.type=='error' else None)
            page.on('pageerror', lambda exc, wh=f'{width}x{height}': page_errors.append({'viewport':wh,'text':str(exc)}))
            page.goto(URL, wait_until='domcontentloaded', timeout=60000)
            page.wait_for_selector('.v4-dashboard-grid', timeout=30000)
            page.wait_for_timeout(350)
            snap=page.evaluate(SNAPSHOT_JS)
            failures=check_snapshot(snap,width)
            checks.append({'viewport':f'{width}x{height}','snapshot':snap,'failures':failures})
            if (width,height)==(1536,1024):
                flow_failures.extend(desktop_flow(page))
            if (width,height) in BASELINE_SHOTS:
                shot=SHOT_DIR/f'v64-{width}x{height}.png'; page.screenshot(path=str(shot), full_page=True); screenshots.append(str(shot.relative_to(ROOT)))
            context.close()

        reduced=browser.new_context(viewport={'width':390,'height':844}, reduced_motion='reduce')
        reduced.add_init_script(SEED); install_routes(reduced)
        p=reduced.new_page(); p.goto(URL,wait_until='domcontentloaded',timeout=60000); p.wait_for_selector('.v4-dashboard-grid'); p.wait_for_timeout(250)
        reduced_state=p.evaluate("""() => ({
          matches:matchMedia('(prefers-reduced-motion: reduce)').matches,
          animations:[...document.getAnimations()].filter(a=>a.playState==='running').length,
          videos:[...document.querySelectorAll('.v5-cinematic-header video,.v53-weekly-rocket')].map(v=>({paused:v.paused,readyState:v.readyState}))
        })""")
        if not reduced_state['matches']: flow_failures.append('reduced-motion media query did not match')
        if any(not v['paused'] for v in reduced_state['videos']): flow_failures.append(f"reduced-motion video still playing: {reduced_state['videos']}")
        reduced.close(); browser.close()

    viewport_failures=[{'viewport':x['viewport'],'failures':x['failures']} for x in checks if x['failures']]
    all_failures=[]
    all_failures.extend(viewport_failures)
    all_failures.extend({'flow':x} for x in flow_failures)
    all_failures.extend({'console':x} for x in console_errors)
    all_failures.extend({'pageerror':x} for x in page_errors)
    result={
        'status':'PASS' if not all_failures else 'FAIL',
        'evidence':evidence_identity(),
        'checks':checks,
        'flowFailures':flow_failures,
        'reducedMotion':reduced_state,
        'consoleErrors':console_errors,
        'pageErrors':page_errors,
        'screenshots':screenshots,
        'failures':all_failures,
    }
    RESULT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({
        'status':result['status'],'viewports':len(checks),
        'viewportFailures':viewport_failures,'flowFailures':flow_failures,
        'consoleErrors':console_errors,'pageErrors':page_errors,'reducedMotion':reduced_state,
        'result':str(RESULT.relative_to(ROOT)),
    },ensure_ascii=False,indent=2))
    return 0 if result['status']=='PASS' else 1


if __name__=='__main__':
    raise SystemExit(run())
