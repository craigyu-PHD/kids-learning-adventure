#!/usr/bin/env python3
"""V6.4 maintained browser matrix.

Supersedes the historical V5.1 CDP harness for current releases.  It keeps the
broad responsive/a11y/reduced-motion coverage while using controlled current
family-session API responses and V6.3/V6.4 Shop DOM contracts.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any

from PIL import Image
from playwright.sync_api import Page, Route, sync_playwright
from qa_v63_browser_seed import SETTINGS as BASE_SETTINGS, PROGRESS as BASE_PROGRESS

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('AUDIT_URL', 'http://127.0.0.1:4174/')
RESULT = ROOT / '.qa' / 'v64_browser_result.json'
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
AVATAR_MANIFEST_PATH = ROOT / 'src' / 'data' / 'avatarAssetManifest.json'
AVATAR_IDS = ('brother', 'younger', 'sister', 'younger-sister')


def outfit_runtime_contract(skin_id: str = 'outfit-racer') -> dict[str, dict[str, str]]:
    manifest = json.loads(AVATAR_MANIFEST_PATH.read_text(encoding='utf-8'))
    rows = manifest.get('skins', manifest if isinstance(manifest, list) else [])
    contract: dict[str, dict[str, str]] = {}
    for avatar_id in AVATAR_IDS:
        matches = [row for row in rows if row.get('avatarId') == avatar_id and row.get('skinId') == skin_id]
        if len(matches) != 1:
            raise AssertionError(f'manifest contract {avatar_id}:{skin_id} has {len(matches)} rows')
        source_path = str(matches[0]['path'])
        disk_path = ROOT / source_path
        if not disk_path.is_file() or disk_path.stat().st_size <= 0:
            raise AssertionError(f'manifest runtime missing/empty: {source_path}')
        contract[avatar_id] = {
            'itemId': skin_id,
            'manifestPath': source_path,
            'urlPath': '/' + source_path.removeprefix('public/'),
            'sha256': hashlib.sha256(disk_path.read_bytes()).hexdigest(),
        }
    return contract


EXPECTED_OUTFIT_RUNTIME = outfit_runtime_contract()


def validate_runtime_asset(url_path: str, expected_url_path: str, payload: bytes | None) -> bool:
    if url_path != expected_url_path or not url_path.startswith('/assets/v6.4/runtime/') or not payload:
        return False
    try:
        with Image.open(io.BytesIO(payload)) as image:
            image.verify()
        return True
    except Exception:
        return False


def runtime_contract_negative_controls() -> dict[str, Any]:
    brother = EXPECTED_OUTFIT_RUNTIME['brother']
    payload = (ROOT / brother['manifestPath']).read_bytes()
    controls = {
        'currentManifestAssetAccepted': validate_runtime_asset(brother['urlPath'], brother['urlPath'], payload),
        'oldV5PathRejected': not validate_runtime_asset('/assets/v5/wardrobe/looks/outfit-racer-v1.webp', brother['urlPath'], payload),
        'nonexistentV64PathRejected': not validate_runtime_asset('/assets/v6.4/runtime/brother/does-not-exist.webp', brother['urlPath'], None),
        'zeroByteRejected': not validate_runtime_asset(brother['urlPath'], brother['urlPath'], b''),
        'corruptPayloadRejected': not validate_runtime_asset(brother['urlPath'], brother['urlPath'], b'RIFF-corrupt-WEBP'),
    }
    return {'status': 'PASS' if all(controls.values()) else 'FAIL', 'checks': controls}


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


JS_HELPERS = r"""
  const qaRect = node => {
    const r=node.getBoundingClientRect();
    return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
  };
  const qaLayoutRelation = (aNode,bNode) => {
    const a=qaRect(aNode), b=qaRect(bNode);
    const overlapX=Math.min(a.right,b.right)-Math.max(a.left,b.left);
    const overlapY=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
    const overlaps=overlapX>1 && overlapY>1;
    const horizontal=a.right<=b.left+2 || b.right<=a.left+2;
    const vertical=a.bottom<=b.top+2 || b.bottom<=a.top+2;
    const rawGap=horizontal
      ? Math.max(b.left-a.right,a.left-b.right)
      : vertical ? Math.max(b.top-a.bottom,a.top-b.bottom) : -Math.min(overlapX,overlapY);
    return {
      separated:!overlaps && (horizontal||vertical),
      orientation:horizontal?'horizontal':vertical?'vertical':'overlap',
      gap:Math.round(rawGap*10)/10,
      overlapX:Math.round(overlapX*10)/10,
      overlapY:Math.round(overlapY*10)/10,
    };
  };
  const qaText = value => String(value||'').replace(/\s+/g,' ').trim();
  const qaAccessibleName = node => {
    const aria=qaText(node.getAttribute('aria-label'));
    if(aria)return aria;
    const labelledBy=qaText(node.getAttribute('aria-labelledby'));
    if(labelledBy){
      const text=qaText(labelledBy.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' '));
      if(text)return text;
    }
    if('labels' in node && node.labels){
      const text=qaText([...node.labels].map(label=>label.textContent||'').join(' '));
      if(text)return text;
    }
    const wrappingLabel=node.closest('label');
    if(wrappingLabel){
      const text=qaText(wrappingLabel.textContent);
      if(text)return text;
    }
    if(node.matches('input[type="button"],input[type="submit"],input[type="reset"]')){
      const value=qaText(node.value);
      if(value)return value;
    }
    const ownText=qaText(node.textContent);
    if(ownText)return ownText;
    const imageAlt=qaText([...node.querySelectorAll('img[alt]')].map(img=>img.getAttribute('alt')||'').join(' '));
    if(imageAlt)return imageAlt;
    return qaText(node.getAttribute('title'));
  };
  const qaClickableRects = node => {
    const rects=[qaRect(node)];
    if('labels' in node && node.labels){
      for(const label of node.labels)rects.push(qaRect(label));
    }
    const wrappingLabel=node.closest('label');
    if(wrappingLabel && !rects.some(r=>{
      const x=qaRect(wrappingLabel);
      return r.left===x.left&&r.top===x.top&&r.width===x.width&&r.height===x.height;
    }))rects.push(qaRect(wrappingLabel));
    return rects;
  };
  const qaTargetInfo = node => {
    const rects=qaClickableRects(node);
    const best=rects.reduce((a,b)=>(b.width*b.height>a.width*a.height?b:a),rects[0]);
    return {pass:rects.some(r=>r.width>=44&&r.height>=44),best};
  };
"""

SNAPSHOT_JS = r"""() => {
__QA_HELPERS__
  const source = node => node?.currentSrc || node?.src || '';
  const visible = node => {
    const style=getComputedStyle(node), r=node.getBoundingClientRect();
    return style.display!=='none' && style.visibility!=='hidden' && r.width>0 && r.height>0;
  };
  const interactive=[...document.querySelectorAll('button,a,input,select,textarea,[role="button"],[role="link"],[role="checkbox"],[role="radio"],[role="switch"]')].filter(visible);
  const focusTarget=interactive[0]; if(focusTarget) focusTarget.focus();
  const focusStyle=focusTarget ? getComputedStyle(focusTarget) : null;
  const broken=[...document.images].filter(img=>{
    const r=img.getBoundingClientRect();
    return r.bottom>=-200 && r.top<=innerHeight+200 && img.complete && img.naturalWidth===0 && !img.hidden;
  }).map(source);
  const lessonLayouts=[...document.querySelectorAll('.v4-lesson-card')].map(card=>{
    const thumb=card.querySelector('.v4-lesson-thumb'), info=card.querySelector('.v4-lesson-content');
    if(!thumb||!info)return {valid:false};
    return {valid:true,...qaLayoutRelation(thumb,info)};
  });
  return {
    viewport:{width:innerWidth,height:innerHeight},
    overflow:Math.max(0,Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth),
    header:document.querySelectorAll('.v5-cinematic-header').length,
    headerCharacters:[...document.querySelectorAll('.v65-hero-showcase .v5-hero-character')].filter(visible).length,
    headerParents:document.querySelectorAll('.v6-hero-parent').length,
    headerCharacterLooks:[...document.querySelectorAll('.v65-hero-showcase .v5-hero-character')].filter(visible).map(node=>{
      const avatar=['brother','younger','sister','younger-sister'].find(id=>node.classList.contains(`avatar-${id}`))||'';
      const stage=[...node.classList].find(name=>name.startsWith('stage-'))||'';
      const frame=document.querySelector('.v5-cinematic-header').getBoundingClientRect(), rect=node.getBoundingClientRect();
      return {avatar,stage,contained:rect.left>=frame.left-1&&rect.right<=frame.right+1&&rect.top>=frame.top-1&&rect.bottom<=frame.bottom+1};
    }),
    navigationLabels:[...document.querySelectorAll('.v4-main-navigation button')].map(n=>String(n.textContent||'').trim()),
    navigationIcons:[...document.querySelectorAll('.v4-main-navigation img')].map(source),
    themeImages:[...document.querySelectorAll('.v5-header-theme img')].map(source),
    evolution:[...document.querySelectorAll('.v5-evolution-lane')].map(n=>n.querySelectorAll('.v5-evolution-stage').length),
    composedWardrobeLooks:[...document.querySelectorAll('.v4-player-profile .avatar-renderer')].map(renderer=>{
      const img=renderer.querySelector('.avatar-renderer-skin');
      const avatar=['brother','younger','sister','younger-sister'].find(id=>renderer.classList.contains(`avatar-${id}`))||'';
      return {avatar,src:source(img),naturalWidth:img?.naturalWidth||0,complete:!!img?.complete,skin:renderer.dataset.skin||'',renderedItems:renderer.dataset.renderedItems||''};
    }),
    dashboardLearners:[...document.querySelectorAll('.v4-player-profile .v4-player-card')].map(n=>String(n.textContent||'').trim()),
    companionVisible:(()=>{const n=document.querySelector('.v4-ai-companion');if(!n)return false;const r=n.getBoundingClientRect();return r.width>0&&r.height>0;})(),
    lessonLayouts,
    brokenImages:broken,
    bopomofoCount:(document.body.innerText.match(/[ㄅ-ㄩ˙ˊˇˋ]/g)||[]).length,
    v40RuntimeMedia:[...document.querySelectorAll('img,video')].map(source).filter(src=>src.includes('/assets/v40/')),
    undersizedTargets:interactive.filter(n=>!qaTargetInfo(n).pass).map(n=>{const t=qaTargetInfo(n);return {tag:n.tagName,className:String(n.className||''),text:qaAccessibleName(n).slice(0,30),width:Math.round(t.best.width),height:Math.round(t.best.height)};}),
    unlabeledControls:interactive.filter(n=>!qaAccessibleName(n)).map(n=>({tag:n.tagName,className:String(n.className||'')})),
    focusVisible:focusStyle?{style:focusStyle.outlineStyle,width:focusStyle.outlineWidth,color:focusStyle.outlineColor}:null,
    dashboardColumnWidths:[...document.querySelectorAll('.v4-left-column,.v4-center-column,.v4-right-column')].map(n=>Math.round(n.getBoundingClientRect().width)),
  };
}""".replace('__QA_HELPERS__', JS_HELPERS)

NEGATIVE_CONTROL_HTML = """<!doctype html><meta charset='utf-8'>
<style>
  #vertical {display:flex;flex-direction:column;gap:8px;width:280px}
  #vertical .v4-lesson-thumb {width:260px;height:64px;background:#ddd}
  #vertical .v4-lesson-content {width:260px;height:72px;background:#eee}
  #overlap {position:relative;width:280px;height:100px}
  #overlap .v4-lesson-thumb {position:absolute;left:0;top:0;width:180px;height:80px;background:#ddd}
  #overlap .v4-lesson-content {position:absolute;left:80px;top:20px;width:180px;height:70px;background:#eee}
  #explicit-label,#wrapped-label {display:inline-flex;width:48px;height:48px;align-items:center;justify-content:center}
  #explicit,#wrapped {width:16px;height:16px}
  #tiny {width:20px;height:20px;padding:0}
</style>
<div class='v4-lesson-card' id='vertical'><div class='v4-lesson-thumb'></div><div class='v4-lesson-content'></div></div>
<div class='v4-lesson-card' id='overlap'><div class='v4-lesson-thumb'></div><div class='v4-lesson-content'></div></div>
<label id='explicit-label' for='explicit'>明確標籤</label><input id='explicit' type='checkbox'>
<label id='wrapped-label'><input id='wrapped' type='checkbox'><span>包裹標籤</span></label>
<input id='unlabeled' type='checkbox'>
<button id='tiny' aria-label='小按鈕'></button>
"""

NEGATIVE_CONTROL_JS = r"""() => {
__QA_HELPERS__
  const relation=id=>{const card=document.getElementById(id);return qaLayoutRelation(card.querySelector('.v4-lesson-thumb'),card.querySelector('.v4-lesson-content'));};
  const vertical=relation('vertical'), overlap=relation('overlap');
  const explicit=document.getElementById('explicit'), wrapped=document.getElementById('wrapped');
  const unlabeled=document.getElementById('unlabeled'), tiny=document.getElementById('tiny');
  const checks={
    verticalLayoutAccepted:vertical.separated && vertical.orientation==='vertical',
    overlapRejected:!overlap.separated && overlap.orientation==='overlap',
    explicitLabelNamed:qaAccessibleName(explicit).includes('明確標籤'),
    wrappedLabelNamed:qaAccessibleName(wrapped).includes('包裹標籤'),
    unlabeledRejected:qaAccessibleName(unlabeled)==='',
    explicitLabelExpandsTarget:qaTargetInfo(explicit).pass,
    wrappedLabelExpandsTarget:qaTargetInfo(wrapped).pass,
    tinyTargetRejected:!qaTargetInfo(tiny).pass,
  };
  return {status:Object.values(checks).every(Boolean)?'PASS':'FAIL',checks,vertical,overlap};
}""".replace('__QA_HELPERS__', JS_HELPERS)


def run_negative_controls(page: Page) -> dict[str, Any]:
    page.set_content(NEGATIVE_CONTROL_HTML)
    return page.evaluate(NEGATIVE_CONTROL_JS)


def check_snapshot(s: dict[str, Any], width: int) -> list[str]:
    failures=[]
    if s['header'] != 1: failures.append('cinematic header missing')
    if s['headerCharacters'] != 4 or s['headerParents'] != 0:
        failures.append('header four-child showcase composition incorrect')
    header_looks = s.get('headerCharacterLooks', [])
    if ({row.get('avatar') for row in header_looks} != set(AVATAR_IDS)
            or any(row.get('stage') != 'stage-4' or not row.get('contained') for row in header_looks)):
        failures.append(f'header advanced child showcase invalid: {header_looks}')
    if s['navigationLabels'] != ['首頁','今日課程','學期日曆','成就獎勵','學習報表','寶物商店']:
        failures.append(f"navigation order incorrect: {s['navigationLabels']}")
    if len(s['navigationIcons']) != 6 or any('/assets/v5/nav-icons/' not in x for x in s['navigationIcons']):
        failures.append('navigation icons missing')
    if len(s['themeImages']) != 5 or any('/assets/v5/themes/' not in x for x in s['themeImages']):
        failures.append('theme images missing')
    if s['evolution'] != [4,4,4,4]: failures.append(f"evolution stages incorrect: {s['evolution']}")
    if len(s['dashboardLearners']) != 4: failures.append('four learners not rendered')
    if not s['companionVisible']: failures.append('AI companion not rendered')
    looks = s['composedWardrobeLooks']
    if len(looks) != 4:
        failures.append(f'four composed wardrobe looks missing: {len(looks)}/4')
    else:
        seen=set()
        for look in looks:
            avatar=look.get('avatar',''); seen.add(avatar)
            expected=EXPECTED_OUTFIT_RUNTIME.get(avatar)
            if not expected:
                failures.append(f'unknown avatar runtime row: {avatar}')
                continue
            if not str(look.get('src','')).split('?',1)[0].endswith(expected['urlPath']):
                failures.append(f"manifest runtime mismatch {avatar}: {look.get('src','')}")
            if look.get('skin') != 'outfit-racer' or 'outfit-racer' not in str(look.get('renderedItems','')):
                failures.append(f'outfit-racer asset identity missing for {avatar}')
            if not look.get('complete') or int(look.get('naturalWidth') or 0) <= 0:
                failures.append(f'outfit-racer runtime did not decode for {avatar}')
        if seen != set(AVATAR_IDS): failures.append(f'avatar runtime coverage mismatch: {sorted(seen)}')
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


def settle_dashboard_runtime_images(page: Page) -> None:
    """Exercise lazy Home avatar delivery before asserting decode state.

    Mobile T02 intentionally uses a horizontally scrollable learner roster.
    Firefox may correctly defer off-screen loading, so the Gate must reveal each
    card and wait for its current manifest image to decode rather than sampling
    a lazy image before the browser has been asked to fetch it.
    """
    cards = page.locator('.v4-player-profile .v4-player-card')
    for index in range(cards.count()):
        card = cards.nth(index)
        try:
            card.scroll_into_view_if_needed(timeout=5000)
            image = card.locator('.avatar-renderer-skin').first
            if image.count():
                handle = image.element_handle()
                page.wait_for_function('img => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0', arg=handle, timeout=10000)
        except Exception:
            # Snapshot assertions below still fail a real missing/corrupt asset.
            pass
    page.evaluate("""() => {
      window.scrollTo({top:0,left:0,behavior:'instant'});
      const roster=document.querySelector('.v4-player-profile .v4-player-stack');
      if (roster) roster.scrollLeft=0;
    }""")
    page.wait_for_timeout(60)


def assert_outfit_runtime(page: Page, avatar_id: str, failures: list[str], label: str) -> None:
    expected = EXPECTED_OUTFIT_RUNTIME[avatar_id]
    renderer = page.locator(f'.v63-equipment-stage .avatar-renderer.avatar-{avatar_id}').first
    if not renderer.count():
        failures.append(f'{label}: {avatar_id} renderer missing')
        return
    image = renderer.locator('.avatar-renderer-skin').first
    if not image.count():
        failures.append(f'{label}: {avatar_id} skin image missing')
        return
    try:
        page.wait_for_function(
            """expected => {
              const renderer=document.querySelector(`.v63-equipment-stage .avatar-renderer.avatar-${expected.avatar}`);
              const image=renderer?.querySelector('.avatar-renderer-skin');
              const src=String(image?.currentSrc||image?.src||'').split('?',1)[0];
              return renderer?.dataset.skin===expected.item
                && src.endsWith(expected.path)
                && image.complete && image.naturalWidth>0 && image.naturalHeight>0;
            }""",
            arg={'avatar': avatar_id, 'item': expected['itemId'], 'path': expected['urlPath']},
            timeout=10000,
        )
        image.scroll_into_view_if_needed(timeout=5000)
        handle = image.element_handle()
        page.wait_for_function('img => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0', arg=handle, timeout=10000)
    except Exception:
        # Keep the decode assertion below authoritative; this wait only removes
        # cross-engine lazy/decode timing races from the sampling point.
        pass
    data = image.evaluate("img => ({src:img.currentSrc||img.src,complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight})")
    clean_src = str(data.get('src','')).split('?',1)[0]
    if not clean_src.endswith(expected['urlPath']):
        failures.append(f"{label}: {avatar_id} runtime path mismatch: {data.get('src','')}")
    if not data.get('complete') or int(data.get('naturalWidth') or 0) <= 0 or int(data.get('naturalHeight') or 0) <= 0:
        failures.append(f'{label}: {avatar_id} runtime did not decode')
    if renderer.get_attribute('data-skin') != expected['itemId']:
        failures.append(f"{label}: {avatar_id} data-skin is not {expected['itemId']}")
    try:
        response = page.request.get(data['src'], timeout=10000)
        if response.status != 200:
            failures.append(f"{label}: {avatar_id} runtime HTTP {response.status}")
    except Exception as exc:
        failures.append(f'{label}: {avatar_id} runtime HTTP check failed: {exc}')


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
    # T04 manifest/runtime contract: every learner must trial the current V6.4
    # manifest asset, cancel it, toggle the owned outfit off/on, and survive a
    # page refresh. No historical V5 filename is accepted as evidence.
    for learner_index, learner in enumerate(SETTINGS['children']):
        avatar_id = learner['avatar']
        learner_tabs = page.locator('.v6-shop-tabs button[role="tab"]')
        if learner_tabs.count() <= learner_index:
            failures.append(f"{learner['name']}: learner tab index {learner_index} missing")
            continue
        learner_tabs.nth(learner_index).click(); page.wait_for_timeout(80)
        page.get_by_role('tab', name='服裝', exact=True).click(); page.wait_for_timeout(60)
        card=page.locator('article[data-item-id="outfit-racer"]')
        if not card.count():
            failures.append(f"{learner['name']}: outfit-racer card missing")
            continue
        preview=card.locator('.v6-preview-button')
        preview.click()
        page.wait_for_function("() => document.querySelector('.v63-equipment-stage')?.dataset.previewItem === 'outfit-racer'", timeout=5000)
        assert_outfit_runtime(page, avatar_id, failures, f"{learner['name']} trial")
        preview.click(); page.wait_for_timeout(80)
        if page.locator('.v63-equipment-stage').get_attribute('data-preview-item') == 'outfit-racer':
            failures.append(f"{learner['name']}: cancel trial did not clear preview")
        stow = card.get_by_role('button', name='先收起來', exact=True)
        if not stow.count():
            failures.append(f"{learner['name']}: equipped outfit-racer stow action missing")
            continue
        stow.click(); page.wait_for_timeout(160)
        dismiss=page.get_by_role('button', name='繼續逛逛', exact=True)
        if dismiss.count(): dismiss.click(); page.wait_for_timeout(50)
        wear=card.get_by_role('button', name='立即穿上', exact=True)
        if not wear.count():
            failures.append(f"{learner['name']}: outfit-racer re-equip action missing")
            continue
        wear.click(); page.wait_for_timeout(180)
        assert_outfit_runtime(page, avatar_id, failures, f"{learner['name']} equipped")
        dismiss=page.get_by_role('button', name='繼續逛逛', exact=True)
        if dismiss.count(): dismiss.click(); page.wait_for_timeout(40)

    page.reload(wait_until='domcontentloaded', timeout=60000); page.wait_for_selector('.v4-dashboard-grid', timeout=30000)
    click_nav(page,'寶物商店'); page.wait_for_selector('.v63-equipment-stage', timeout=10000)
    for learner_index, learner in enumerate(SETTINGS['children']):
        avatar_id=learner['avatar']
        learner_tabs = page.locator('.v6-shop-tabs button[role="tab"]')
        if learner_tabs.count() <= learner_index:
            failures.append(f"{learner['name']}: refresh learner tab index {learner_index} missing")
            continue
        learner_tabs.nth(learner_index).click(); page.wait_for_timeout(70)
        assert_outfit_runtime(page, avatar_id, failures, f"{learner['name']} refresh")

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
    console_errors=[]; page_errors=[]; checks=[]; screenshots=[]; flow_failures=[]; reduced_states={}; negative_controls={}
    runtime_controls = runtime_contract_negative_controls()
    if runtime_controls.get('status') != 'PASS':
        flow_failures.append(f"runtime contract negative controls failed: {runtime_controls.get('checks')}")
    engines=('chromium','firefox','webkit')
    with sync_playwright() as pw:
        for engine_name in engines:
            browser_type=getattr(pw, engine_name)
            browser=browser_type.launch(headless=True)
            control_context=browser.new_context(viewport={'width':800,'height':600})
            control_page=control_context.new_page()
            control_result=run_negative_controls(control_page)
            negative_controls[engine_name]=control_result
            if control_result.get('status') != 'PASS':
                flow_failures.append(f"{engine_name}: browser QA negative controls failed: {control_result.get('checks')}")
            control_context.close()
            for width,height in VIEWPORTS:
                context=browser.new_context(viewport={'width':width,'height':height})
                context.add_init_script(SEED); install_routes(context)
                page=context.new_page()
                tag=f'{engine_name}:{width}x{height}'
                page.on('console', lambda msg, wh=tag: console_errors.append({'case':wh,'text':msg.text}) if msg.type=='error' else None)
                page.on('pageerror', lambda exc, wh=tag: page_errors.append({'case':wh,'text':str(exc)}))
                page.goto(URL, wait_until='domcontentloaded', timeout=60000)
                page.wait_for_selector('.v4-dashboard-grid', timeout=30000)
                page.wait_for_timeout(180)
                settle_dashboard_runtime_images(page)
                snap=page.evaluate(SNAPSHOT_JS)
                failures=check_snapshot(snap,width)
                checks.append({'engine':engine_name,'viewport':f'{width}x{height}','snapshot':snap,'failures':failures})
                if (width,height)==(1536,1024):
                    flow_failures.extend(f'{engine_name}: {failure}' for failure in desktop_flow(page))
                if engine_name=='chromium' and (width,height) in BASELINE_SHOTS:
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
            reduced_states[engine_name]=reduced_state
            if not reduced_state['matches']: flow_failures.append(f'{engine_name}: reduced-motion media query did not match')
            if any(not v['paused'] for v in reduced_state['videos']): flow_failures.append(f"{engine_name}: reduced-motion video still playing: {reduced_state['videos']}")
            reduced.close(); browser.close()

    viewport_failures=[{'engine':x['engine'],'viewport':x['viewport'],'failures':x['failures']} for x in checks if x['failures']]
    all_failures=[]
    all_failures.extend(viewport_failures)
    all_failures.extend({'flow':x} for x in flow_failures)
    all_failures.extend({'console':x} for x in console_errors)
    all_failures.extend({'pageerror':x} for x in page_errors)
    result={
        'status':'PASS' if not all_failures else 'FAIL',
        'evidence':evidence_identity(),
        'engines':list(engines),
        'checks':checks,
        'flowFailures':flow_failures,
        'negativeControls':negative_controls,
        'runtimeContract':{
            'expected':EXPECTED_OUTFIT_RUNTIME,
            'negativeControls':runtime_controls,
        },
        'reducedMotion':reduced_states,
        'consoleErrors':console_errors,
        'pageErrors':page_errors,
        'screenshots':screenshots,
        'failures':all_failures,
    }
    RESULT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({
        'status':result['status'],'engines':list(engines),'cases':len(checks),
        'viewportFailures':viewport_failures,'flowFailures':flow_failures,
        'negativeControls':negative_controls,
        'runtimeContractNegativeControls':runtime_controls,
        'consoleErrors':console_errors,'pageErrors':page_errors,'reducedMotion':reduced_states,
        'result':str(RESULT.relative_to(ROOT)),
    },ensure_ascii=False,indent=2))
    return 0 if result['status']=='PASS' else 1


if __name__=='__main__':
    raise SystemExit(run())
