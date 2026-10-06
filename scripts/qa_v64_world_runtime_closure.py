#!/usr/bin/env python3
"""T06 V6.4 World runtime closure gate.

Closes the 15-item World catalogue against the current local candidate without
changing production status. It reuses the already-reviewed source art, verifies
source/delivery lineage and hashes, then exercises the current browser runtime:
4 learner roles, mobile/desktop, Light/Night, purchase/equip/reload, Home mount,
and reduced-motion. Runtime screenshots are emitted for direct/local vision
review; productionUrlPass must remain PENDING until an explicitly approved
deployment is verified.
"""
from __future__ import annotations

import copy
import hashlib
import json
import os
import time
from pathlib import Path
from typing import Any

from PIL import Image
from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright

from qa_v63_browser_seed import SETTINGS as BASE_SETTINGS, PROGRESS as BASE_PROGRESS

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('AUDIT_URL', 'http://127.0.0.1:4173/')
OUT = ROOT / 'qa' / 'production-audit' / '2026-09-16' / 'v64-world-runtime'
OUT.mkdir(parents=True, exist_ok=True)
RESULT = OUT / 'world-runtime-closure.json'
CONTACT_DIR = OUT / 'contact-sheets'
CONTACT_DIR.mkdir(parents=True, exist_ok=True)

MANIFEST_PATH = ROOT / 'src' / 'data' / 'worldArtManifest.json'
MANIFEST = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
RECORDS: list[dict[str, Any]] = MANIFEST['records']
AVATARS = ['brother', 'younger', 'sister', 'younger-sister']
CATEGORY = {
    'spaceship': '飛船',
    'room': '基地',
    'robot': '機器夥伴',
    'card': '卡面',
    'effect': '特效',
}
MODE = {
    'spaceship': 'ship',
    'room': 'world',
    'robot': 'robot',
    'card': 'card',
    'effect': 'effect',
}
PRIMARY_ART = {
    'spaceship': '.v63-ship-art',
    'robot': '.v63-robot-art',
    'card': '.v63-card-art',
}
TIME_PAYLOAD = json.dumps({
    'now': '2026-09-16T12:30:00.000Z',
    'activeDate': '2026-09-16',
    'taipeiDate': '2026-09-16',
    'taipeiTime': '20:30:00',
    'timeZone': 'Asia/Taipei',
}, ensure_ascii=False)


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def resolve_manifest_path(value: str) -> Path:
    return ROOT / value


def decode_image(path: Path) -> dict[str, Any]:
    with Image.open(path) as image:
        image.load()
        alpha = 'A' in image.getbands()
        return {'width': image.width, 'height': image.height, 'format': image.format, 'alpha': alpha}


def static_lineage_gate() -> tuple[list[dict[str, Any]], list[str]]:
    rows: list[dict[str, Any]] = []
    failures: list[str] = []
    if len(RECORDS) != 15:
        failures.append(f'world record count {len(RECORDS)}/15')
    ids = [r['itemId'] for r in RECORDS]
    if len(ids) != len(set(ids)):
        failures.append('duplicate World item IDs')
    expected_slots = {'spaceship': 3, 'room': 3, 'robot': 3, 'card': 3, 'effect': 3}
    actual_slots = {slot: sum(r['slot'] == slot for r in RECORDS) for slot in expected_slots}
    if actual_slots != expected_slots:
        failures.append(f'World slot distribution {actual_slots}')

    for record in RECORDS:
        item_id = record['itemId']
        row_failures: list[str] = []
        if record.get('productionUrlPass') != 'PENDING':
            row_failures.append(f"productionUrlPass={record.get('productionUrlPass')!r}, expected PENDING")
        source = resolve_manifest_path(record['source']['path'])
        delivery = resolve_manifest_path(record['delivery']['path'])
        if not source.is_file(): row_failures.append(f'missing source {record["source"]["path"]}')
        if not delivery.is_file(): row_failures.append(f'missing delivery {record["delivery"]["path"]}')
        source_hash = sha(source) if source.is_file() else None
        delivery_hash = sha(delivery) if delivery.is_file() else None
        if source_hash != record['source'].get('sha256'): row_failures.append('source sha mismatch')
        if delivery_hash != record['delivery'].get('sha256'): row_failures.append('delivery sha mismatch')
        try: source_meta = decode_image(source)
        except Exception as exc:
            source_meta = {'error': str(exc)}; row_failures.append(f'source decode failed: {exc}')
        try: delivery_meta = decode_image(delivery)
        except Exception as exc:
            delivery_meta = {'error': str(exc)}; row_failures.append(f'delivery decode failed: {exc}')

        review_path = resolve_manifest_path(record['pngReview']['path'])
        review = json.loads(review_path.read_text(encoding='utf-8')) if review_path.is_file() else {}
        if not review_path.is_file(): row_failures.append('png review missing')
        elif sha(review_path) != record['pngReview'].get('sha256'): row_failures.append('png review sha mismatch')
        if review.get('status') != 'PASS': row_failures.append(f"png review status {review.get('status')}")
        if review.get('sourceSha256') != record['source'].get('sha256'): row_failures.append('png review source hash mismatch')
        viewed = review.get('viewed', [])
        if not viewed: row_failures.append('png review has no viewed evidence')

        variants: list[dict[str, Any]] = []
        for variant in record.get('displayVariants', []):
            vp = resolve_manifest_path(variant['path'])
            vrow = {'path': variant['path'], 'width': variant.get('width'), 'height': variant.get('height')}
            if not vp.is_file():
                row_failures.append(f'missing display variant {variant["path"]}')
            else:
                vrow['sha256'] = sha(vp)
                if vrow['sha256'] != variant.get('sha256'): row_failures.append(f'display variant sha mismatch {variant["path"]}')
                try: vrow['decode'] = decode_image(vp)
                except Exception as exc: row_failures.append(f'display variant decode failed {variant["path"]}: {exc}')
            variants.append(vrow)

        rows.append({
            'itemId': item_id,
            'slot': record['slot'],
            'pass': not row_failures,
            'failures': row_failures,
            'source': {'path': record['source']['path'], 'sha256': source_hash, 'decode': source_meta},
            'delivery': {'path': record['delivery']['path'], 'sha256': delivery_hash, 'decode': delivery_meta},
            'displayVariants': variants,
            'review': {
                'path': record['pngReview']['path'],
                'status': review.get('status'),
                'reviewer': review.get('reviewer'),
                'viewedCount': len(viewed),
                'scores': review.get('scores', {}),
            },
            'productionUrlPass': record.get('productionUrlPass'),
        })
        failures.extend(f'{item_id}: {failure}' for failure in row_failures)
    return rows, failures


def high_resource_fixture(theme: str = 'light') -> tuple[dict[str, Any], dict[str, Any]]:
    settings = copy.deepcopy(BASE_SETTINGS)
    progress = copy.deepcopy(BASE_PROGRESS)
    settings['theme'] = theme
    settings['cloudSync'] = {'enabled': False, 'familyCode': ''}
    for index, child in enumerate(settings['children'], start=1):
        p = progress[child['id']]
        p['rewardTransactions'] = [{
            'id': f't06-world-budget-{index}', 'kind': 'bonus', 'sourceId': 't06-world-runtime',
            'xp': 12000, 'coins': 12000, 'stars': 0, 'gems': 0,
            'createdAt': f'2026-09-16T00:00:0{index}.000Z',
        }]
        p['purchaseTransactions'] = []
        p['equipmentTransactions'] = []
        p['unlockedCosmetics'] = []
        p['equippedCosmetics'] = []
    return settings, progress


def seed_script(theme: str = 'light') -> str:
    settings, progress = high_resource_fixture(theme)
    return f"""(() => {{
      if (localStorage.getItem('star-learning-v40:__local__:settings')) return;
      const settings={json.dumps(settings, ensure_ascii=False)};
      const progress={json.dumps(progress, ensure_ascii=False)};
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem('star-learning-v40:__local__:settings',JSON.stringify(settings));
      localStorage.setItem('star-learning-v40:__local__:progress',JSON.stringify(progress));
      localStorage.setItem('star-learning-v40:__local__:attendance','{{}}');
      localStorage.setItem('star-learning-v40:__local__:reflections','{{}}');
      localStorage.setItem('little-explorers-v4-sound','off');
      sessionStorage.setItem('star-learning-v40:__local__:active-user','user-father');
    }})();"""


def route_time(route) -> None:
    route.fulfill(status=200, content_type='application/json', body=TIME_PAYLOAD)


def context_for(browser: Browser, width: int, height: int, *, theme: str = 'light', reduced: bool = False) -> BrowserContext:
    context = browser.new_context(
        viewport={'width': width, 'height': height},
        reduced_motion='reduce' if reduced else 'no-preference',
    )
    context.add_init_script(seed_script(theme))
    context.route('**/api/server-time', route_time)
    context.route('**/api/time', route_time)
    return context


def goto_shop(page: Page, slot: str) -> None:
    page.goto(URL, wait_until='domcontentloaded', timeout=60000)
    page.wait_for_selector('.v4-main-navigation', timeout=30000)
    page.get_by_role('button', name='寶物商店', exact=True).click()
    page.wait_for_selector('.v63-equipment-stage', timeout=15000)
    page.get_by_role('tab', name=CATEGORY[slot], exact=True).click()
    page.wait_for_timeout(80)


def switch_learner(page: Page, index: int) -> str:
    tabs = page.locator('.v6-shop-tabs button[role="tab"]')
    if tabs.count() <= index: raise AssertionError(f'learner tab {index} missing')
    tab = tabs.nth(index)
    name = tab.locator('span').last.inner_text().strip()
    tab.click(); page.wait_for_timeout(70)
    if tab.get_attribute('aria-selected') != 'true': raise AssertionError(f'learner tab {index} did not select')
    return name


def click_preview(page: Page, item_id: str) -> None:
    card = page.locator(f'article[data-item-id="{item_id}"]')
    if card.count() != 1: raise AssertionError(f'{item_id}: catalog card missing')
    button = card.locator('.v6-preview-button')
    if button.is_disabled(): raise AssertionError(f'{item_id}: preview disabled')
    if button.inner_text().strip() != '試穿看看':
        # Per-learner preview state may already be active; leave it mounted.
        if page.locator('.v63-equipment-stage').get_attribute('data-preview-item') == item_id: return
    button.click()
    page.wait_for_function("id => document.querySelector('.v63-equipment-stage')?.dataset.previewItem === id", arg=item_id, timeout=8000)
    page.wait_for_timeout(120)


def runtime_metrics(page: Page, record: dict[str, Any], learner_name: str, reduced: bool) -> dict[str, Any]:
    item_id, slot = record['itemId'], record['slot']
    stage = page.locator('.v63-equipment-stage')
    metrics = stage.evaluate("""(el) => {
      const visible = node => { const s=getComputedStyle(node), r=node.getBoundingClientRect(); return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0; };
      const r=el.getBoundingClientRect();
      const heading=el.querySelector('.v63-stage-heading')?.getBoundingClientRect();
      const images=[...el.querySelectorAll('img')].filter(visible);
      return {
        rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height},
        heading:heading?{left:heading.left,top:heading.top,right:heading.right,bottom:heading.bottom,width:heading.width,height:heading.height}:null,
        previewMode:el.dataset.previewMode,
        previewItem:el.dataset.previewItem,
        room:el.dataset.room,
        effect:el.dataset.effect,
        scene:getComputedStyle(el).getPropertyValue('--showcase-scene'),
        broken:images.filter(img=>img.complete&&img.naturalWidth===0).map(img=>img.currentSrc||img.src),
        images:images.map(img=>({cls:String(img.className||''),src:img.currentSrc||img.src,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight})),
        runningAnimations:el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length,
        errorSurface:el.querySelectorAll('.v64-preview-load-error').length,
      };
    }""")
    failures: list[str] = []
    if metrics['previewItem'] != item_id: failures.append(f"preview item {metrics['previewItem']}")
    if metrics['previewMode'] != MODE[slot]: failures.append(f"preview mode {metrics['previewMode']} != {MODE[slot]}")
    if metrics['errorSurface']: failures.append('preview load-error surface visible')
    if metrics['broken']: failures.append(f"broken stage images {metrics['broken']}")
    if metrics['rect']['width'] < 250 or metrics['rect']['height'] < 360: failures.append(f"stage too small {metrics['rect']}")
    heading = metrics.get('heading')
    if not heading or heading['top'] < metrics['rect']['top'] - 1 or heading['right'] > metrics['rect']['right'] + 1:
        failures.append(f'heading escapes stage {heading}')
    if learner_name not in (stage.get_attribute('aria-label') or ''): failures.append('stage learner identity missing')
    if reduced and metrics['runningAnimations']:
        failures.append(f"reduced-motion stage has {metrics['runningAnimations']} running animations")
    if slot in PRIMARY_ART:
        art = page.locator(f'.v63-equipment-stage {PRIMARY_ART[slot]}').first
        if not art.count(): failures.append(f'{PRIMARY_ART[slot]} missing')
        else:
            data = art.evaluate("img=>({src:img.currentSrc||img.src,complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight})")
            if item_id not in data.get('src', ''): failures.append(f"primary art reused wrong item: {data.get('src')}")
            if not data.get('complete') or not data.get('naturalWidth'): failures.append('primary art did not decode')
    elif slot == 'room':
        if item_id not in metrics.get('scene', ''): failures.append(f"room scene mismatch {metrics.get('scene')}")
        if metrics.get('room') != item_id: failures.append(f"room data binding {metrics.get('room')}")
    elif slot == 'effect':
        if metrics.get('effect') != item_id: failures.append(f"effect data binding {metrics.get('effect')}")
        art = page.locator(f'.v63-equipment-stage .v64-effect-art[data-effect-item="{item_id}"]').first
        if not art.count(): failures.append('effect renderer missing')
        else:
            data = art.evaluate("img=>({src:img.currentSrc||img.src,complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight})")
            if item_id not in data.get('src',''): failures.append(f"effect reused wrong item: {data.get('src')}")
            if not data.get('complete') or not data.get('naturalWidth'): failures.append('effect art did not decode')
    return {'pass': not failures, 'failures': failures, 'metrics': metrics}


def screenshot_stage(page: Page, path: Path) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    page.locator('.v63-equipment-stage').screenshot(path=str(path), animations='disabled', caret='hide')
    return str(path.relative_to(ROOT))


def visual_runtime_cases(browser: Browser) -> tuple[list[dict[str, Any]], list[str]]:
    cases: list[dict[str, Any]] = []
    failures: list[str] = []
    for record in RECORDS:
        item_id, slot = record['itemId'], record['slot']
        # Desktop Light: exercise all four learner roles on the current renderer.
        context = context_for(browser, 1440, 900, theme='light')
        page = context.new_page(); goto_shop(page, slot)
        role_rows=[]
        for role_index, avatar in enumerate(AVATARS):
            try:
                learner_name = switch_learner(page, role_index)
                click_preview(page, item_id)
                result = runtime_metrics(page, record, learner_name, False)
            except Exception as exc:
                result = {'pass': False, 'failures': [f'exception: {exc}'], 'metrics': {}}
            role_rows.append({'avatar': avatar, **result})
            failures.extend(f'{item_id}/{avatar}: {failure}' for failure in result['failures'])
        # Return to first learner for a stable current Light screenshot.
        switch_learner(page, 0); page.wait_for_timeout(80)
        light_shot = screenshot_stage(page, OUT / 'screenshots' / f'{item_id}-1440-light.png')
        context.close()

        # Mobile current renderer + reduced-motion hard check.
        context = context_for(browser, 390, 844, theme='light', reduced=True)
        page = context.new_page(); goto_shop(page, slot)
        learner_name = switch_learner(page, 0); click_preview(page, item_id)
        mobile = runtime_metrics(page, record, learner_name, True)
        failures.extend(f'{item_id}/390: {failure}' for failure in mobile['failures'])
        mobile_shot = screenshot_stage(page, OUT / 'screenshots' / f'{item_id}-390-light-reduced.png')
        context.close()

        # Night renderer uses the same item and geometry but must keep readable stage output.
        context = context_for(browser, 1440, 900, theme='dark', reduced=True)
        page = context.new_page(); goto_shop(page, slot)
        learner_name = switch_learner(page, 0); click_preview(page, item_id)
        night = runtime_metrics(page, record, learner_name, True)
        is_dark = page.evaluate("document.documentElement.classList.contains('dark')")
        if not is_dark:
            night['pass'] = False; night['failures'].append('Night theme did not activate')
        failures.extend(f'{item_id}/night: {failure}' for failure in night['failures'])
        night_shot = screenshot_stage(page, OUT / 'screenshots' / f'{item_id}-1440-night-reduced.png')
        context.close()

        cases.append({
            'itemId': item_id, 'slot': slot,
            'pass': all(r['pass'] for r in role_rows) and mobile['pass'] and night['pass'],
            'roles': role_rows,
            'mobileReduced': mobile,
            'nightReduced': night,
            'screenshots': [light_shot, mobile_shot, night_shot],
        })
    return cases, failures


def progress_state(page: Page) -> dict[str, Any]:
    raw = page.evaluate("localStorage.getItem('star-learning-v40:__local__:progress')")
    return json.loads(raw or '{}')


def transaction_cases(browser: Browser) -> tuple[list[dict[str, Any]], list[str]]:
    rows=[]; failures=[]
    for record in RECORDS:
        item_id, slot = record['itemId'], record['slot']
        row_failures=[]
        context = context_for(browser, 1440, 900, theme='light')
        page = context.new_page()
        try:
            goto_shop(page, slot); switch_learner(page, 0); click_preview(page, item_id)
            card = page.locator(f'article[data-item-id="{item_id}"]')
            action = card.locator('button:not(.v6-preview-button)').first
            if action.is_disabled(): raise AssertionError(f'purchase action disabled: {action.inner_text()}')
            action.click()
            page.wait_for_function("id => document.querySelector(`article[data-item-id='${id}']`)?.classList.contains('owned')", arg=item_id, timeout=8000)
            dismiss = page.get_by_role('button', name='繼續逛逛', exact=True)
            if dismiss.count(): dismiss.click(); page.wait_for_timeout(60)
            card = page.locator(f'article[data-item-id="{item_id}"]')
            equip = card.locator('button:not(.v6-preview-button)').first
            if equip.is_disabled(): raise AssertionError(f'equip action disabled: {equip.inner_text()}')
            equip.click()
            page.wait_for_function("id => document.querySelector(`article[data-item-id='${id}']`)?.classList.contains('equipped')", arg=item_id, timeout=8000)
            state_before = progress_state(page).get('child-1', {})
            if item_id not in state_before.get('unlockedCosmetics', []): row_failures.append('purchase not persisted in unlockedCosmetics')
            if item_id not in state_before.get('equippedCosmetics', []): row_failures.append('equip not persisted in equippedCosmetics')

            page.reload(wait_until='domcontentloaded', timeout=60000)
            page.wait_for_selector('.v4-dashboard-grid', timeout=30000)
            page.get_by_role('button', name='寶物商店', exact=True).click(); page.wait_for_selector('.v63-equipment-stage', timeout=15000)
            page.get_by_role('tab', name=CATEGORY[slot], exact=True).click(); page.wait_for_timeout(80)
            card = page.locator(f'article[data-item-id="{item_id}"]')
            if 'equipped' not in (card.get_attribute('class') or '').split(): row_failures.append('equipped class missing after reload')
            state_after = progress_state(page).get('child-1', {})
            if item_id not in state_after.get('equippedCosmetics', []): row_failures.append('equipped item missing after reload')

            page.get_by_role('button', name='首頁', exact=True).click(); page.wait_for_selector('.v4-dashboard-grid', timeout=15000)
            shell_class = page.locator('.v4-shell').first.get_attribute('class') or ''
            if f'has-{item_id}' not in shell_class.split(): row_failures.append(f'Home class has-{item_id} missing after reload')
            broken = page.evaluate("[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&!i.hidden).map(i=>i.currentSrc||i.src)")
            if broken: row_failures.append(f'Home broken images {broken[:3]}')
            home_shot = OUT / 'home-equipped' / f'{item_id}.png'
            home_shot.parent.mkdir(parents=True, exist_ok=True)
            page.locator('.v4-dashboard-grid').screenshot(path=str(home_shot), animations='disabled', caret='hide')
        except Exception as exc:
            row_failures.append(f'exception: {exc}')
            home_shot = None
        context.close()
        failures.extend(f'{item_id}/transaction: {failure}' for failure in row_failures)
        rows.append({'itemId': item_id, 'slot': slot, 'pass': not row_failures, 'failures': row_failures,
                     'homeScreenshot': str(home_shot.relative_to(ROOT)) if home_shot and home_shot.exists() else None})
    return rows, failures


def make_contact_sheets(cases: list[dict[str, Any]]) -> list[str]:
    outputs=[]
    for case in cases:
        paths=[ROOT / p for p in case['screenshots']]
        images=[]
        for path in paths:
            with Image.open(path) as im:
                image=im.convert('RGB')
                target_w=480
                target_h=max(1,round(image.height*target_w/image.width))
                images.append(image.resize((target_w,target_h),Image.Resampling.LANCZOS))
        width=max(i.width for i in images); height=sum(i.height for i in images)
        sheet=Image.new('RGB',(width,height),'white')
        y=0
        for image in images:
            sheet.paste(image,(0,y)); y+=image.height
        target=CONTACT_DIR/f"{case['itemId']}.jpg"
        sheet.save(target,quality=90,optimize=True)
        outputs.append(str(target.relative_to(ROOT)))
    return outputs


def main() -> int:
    started=time.strftime('%Y-%m-%dT%H:%M:%S%z')
    static_rows, static_failures = static_lineage_gate()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        runtime_rows, runtime_failures = visual_runtime_cases(browser)
        transaction_rows, transaction_failures = transaction_cases(browser)
        browser.close()
    contact_sheets = make_contact_sheets(runtime_rows)
    failures = static_failures + runtime_failures + transaction_failures
    payload={
        'schemaVersion':1,
        'suiteName':'v64-world-runtime-closure',
        'status':'PASS' if not failures else 'FAIL',
        'startedAt':started,
        'finishedAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),
        'auditUrl':URL,
        'scope':{
            'items':15,
            'slots':['spaceship','room','robot','card','effect'],
            'roles':AVATARS,
            'viewports':['390x844','1440x900'],
            'themes':['light','dark'],
            'transactionFlow':'purchase -> equip -> reload -> Home mount',
            'reducedMotion':True,
            'productionClaim':'NOT_RUN; every productionUrlPass must remain PENDING',
            'visualReview':'Existing direct source-art review is hash-bound; current runtime screenshots/contact sheets are emitted for local vision review.',
        },
        'staticLineage':static_rows,
        'runtime':runtime_rows,
        'transactions':transaction_rows,
        'contactSheets':contact_sheets,
        'failures':failures,
    }
    RESULT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({
        'status':payload['status'],
        'staticPass':sum(r['pass'] for r in static_rows),'staticTotal':len(static_rows),
        'runtimePass':sum(r['pass'] for r in runtime_rows),'runtimeTotal':len(runtime_rows),
        'transactionPass':sum(r['pass'] for r in transaction_rows),'transactionTotal':len(transaction_rows),
        'failureCount':len(failures),'failures':failures[:40],
        'result':str(RESULT.relative_to(ROOT)),
        'contactSheets':contact_sheets,
    },ensure_ascii=False,indent=2))
    return 0 if payload['status']=='PASS' else 1


if __name__=='__main__':
    raise SystemExit(main())
