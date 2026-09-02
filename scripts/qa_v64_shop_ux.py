#!/usr/bin/env python3
"""V6.4 Shop UX hard gate.

Verifies progressive disclosure, character filters, before/after comparison,
and simultaneous fine-slot try-on across mobile/tablet/desktop/4K widths.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from qa_v63_browser_seed import SETTINGS, PROGRESS

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('AUDIT_URL', 'http://127.0.0.1:4174/')
OUT = ROOT / 'qa' / 'production-audit' / '2026-09-02' / 'v64-shop-ux.json'
OUT.parent.mkdir(parents=True, exist_ok=True)
TIME = json.dumps({
    'now':'2026-09-02T02:30:00.000Z','activeDate':'2026-09-02',
    'taipeiDate':'2026-09-02','taipeiTime':'10:30:00','timeZone':'Asia/Taipei'
})
VIEWPORTS = [(390,844),(768,1024),(1440,900),(3840,2160)]

HAIR_IDS = {'hair-comet','hair-wave','hair-spike','hair-cloud','hair-nebula','hair-legend','sister-starlight-clip','sister-mint-bow'}
HAT_IDS = {'starter-sun-cap','sunny-explorer-hat','hat-rocket','hat-ocean','hat-mage','hat-crown','sister-lavender-hat'}
PHONE_IDS = {'starter-buddy-headphones','story-headphones','phones-sky','phones-racer','phones-ai','phones-legend','sister-cat-headphones'}


def seed_script():
    settings = json.loads(json.dumps(SETTINGS, ensure_ascii=False))
    progress = json.loads(json.dumps(PROGRESS, ensure_ascii=False))
    # Keep one existing full skin equipped so "目前造型" and "試穿後" are
    # observably different while trial accessories stay independent.
    p = progress['child-1']
    p['purchaseTransactions'] = [{
        'id':'v64-shop-ux-outfit','childId':'child-1','itemId':'outfit-cadet','cost':70,
        'createdAt':'2026-09-02T00:00:00.000Z','source':'purchase'
    }]
    p['equipmentTransactions'] = [{
        'id':'v64-shop-ux-outfit-equip','childId':'child-1','itemId':'outfit-cadet','slot':'skin',
        'action':'equip','createdAt':'2026-09-02T00:00:01.000Z'
    }]
    p['unlockedCosmetics'] = ['outfit-cadet']
    p['equippedCosmetics'] = ['outfit-cadet']
    return f"""(() => {{
      const settings={json.dumps(settings,ensure_ascii=False)};
      const progress={json.dumps(progress,ensure_ascii=False)};
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem('star-learning-v40:__local__:settings',JSON.stringify(settings));
      localStorage.setItem('star-learning-v40:__local__:progress',JSON.stringify(progress));
      localStorage.setItem('star-learning-v40:__local__:attendance','{{}}');
      localStorage.setItem('star-learning-v40:__local__:reflections','{{}}');
      localStorage.setItem('little-explorers-v4-sound','off');
      sessionStorage.setItem('star-learning-v40:__local__:active-user','user-father');
    }})();"""


def route_time(route):
    route.fulfill(status=200, content_type='application/json', body=TIME)


def overflow(page):
    return page.evaluate("Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth")


def card_ids(page):
    return set(page.locator('.v4-shop-grid article[data-item-id]').evaluate_all("els=>els.map(e=>e.dataset.itemId)"))


def click_filter(page, label):
    page.get_by_role('tab', name=label, exact=True).click()
    page.wait_for_timeout(80)


def click_preview(page, item_id):
    card = page.locator(f'.v4-shop-grid article[data-item-id="{item_id}"]')
    if card.count() == 0:
        raise AssertionError(f'catalog card missing: {item_id}')
    button = card.locator('.v6-preview-button')
    if button.is_disabled():
        raise AssertionError(f'preview disabled: {item_id}')
    button.click()
    page.wait_for_timeout(100)


def run_case(page, width, height):
    failures = []
    checks = []

    def check(name, condition, detail=''):
        checks.append({'name':name,'pass':bool(condition),'detail':detail})
        if not condition:
            failures.append({'name':name,'detail':detail})

    page.goto(URL, wait_until='domcontentloaded', timeout=45000)
    page.wait_for_selector('.v4-main-navigation', timeout=30000)
    page.get_by_role('button', name='寶物商店', exact=True).click()
    page.wait_for_selector('.v6-shop-studio', timeout=10000)
    page.wait_for_timeout(150)

    initial = page.locator('.v4-shop-grid article[data-item-id]').count()
    check('recommended-progressive-limit', 1 <= initial <= 12, f'initial={initial}')
    mini = page.locator('.v64-mobile-mini-preview')
    if width <= 800:
        check('mobile-mini-preview-visible', mini.count() == 1 and mini.is_visible(), f'count={mini.count()}')
        if mini.count():
            position = mini.evaluate("el => getComputedStyle(el).position")
            check('mobile-mini-preview-sticky', position == 'sticky', f'position={position}')
    else:
        check('mobile-mini-preview-hidden-on-wide', mini.count() == 1 and not mini.is_visible(), f'count={mini.count()}')
    more = page.locator('.v64-load-more')
    check('load-more-visible', more.count() == 1 and more.is_visible(), f'count={more.count()}')
    if more.count() and more.is_visible():
        more.click(); page.wait_for_timeout(100)
        after = page.locator('.v4-shop-grid article[data-item-id]').count()
        check('load-more-increases-cards', after > initial, f'{initial}->{after}')

    click_filter(page, '免費')
    free_ids = card_ids(page)
    check('free-filter', {'starter-sun-cap','starter-sky-glasses','starter-buddy-headphones'}.issubset(free_ids), str(sorted(free_ids)))

    click_filter(page, '穿戴中')
    equipped_ids = card_ids(page)
    check('equipped-filter', equipped_ids == {'outfit-cadet'}, str(sorted(equipped_ids)))

    click_filter(page, '已收藏')
    owned_ids = card_ids(page)
    check('owned-filter', owned_ids == {'outfit-cadet'}, str(sorted(owned_ids)))

    click_filter(page, '髮型')
    check('hair-filter', bool(card_ids(page)) and card_ids(page).issubset(HAIR_IDS), str(sorted(card_ids(page))))
    click_preview(page, 'hair-comet')

    click_filter(page, '帽子')
    check('hat-filter', bool(card_ids(page)) and card_ids(page).issubset(HAT_IDS), str(sorted(card_ids(page))))
    click_preview(page, 'starter-sun-cap')

    click_filter(page, '耳機')
    check('headphones-filter', bool(card_ids(page)) and card_ids(page).issubset(PHONE_IDS), str(sorted(card_ids(page))))
    click_preview(page, 'starter-buddy-headphones')

    compare = page.locator('.v64-preview-compare')
    check('compare-control-visible', compare.count() == 1 and compare.is_visible(), f'count={compare.count()}')
    trial_avatar = page.locator('.v63-equipment-stage .avatar-renderer').first
    page.wait_for_timeout(100)
    rendered_trial = set((trial_avatar.get_attribute('data-rendered-items') or '').split())
    check(
        'fine-slot-trial-combination',
        {'hair-comet','starter-sun-cap','starter-buddy-headphones'}.issubset(rendered_trial),
        str(sorted(rendered_trial)),
    )

    page.get_by_role('tab', name='目前造型', exact=True).click(); page.wait_for_timeout(100)
    current_avatar = page.locator('.v63-equipment-stage .avatar-renderer').first
    current_rendered = set((current_avatar.get_attribute('data-rendered-items') or '').split())
    current_skin = current_avatar.get_attribute('data-skin') or ''
    check('current-mode-keeps-equipped-skin', current_skin == 'outfit-cadet', f'skin={current_skin}, rendered={sorted(current_rendered)}')
    check(
        'current-mode-hides-trial-accessories',
        not {'hair-comet','starter-sun-cap','starter-buddy-headphones'} & current_rendered,
        str(sorted(current_rendered)),
    )

    page.get_by_role('tab', name='試穿後', exact=True).click(); page.wait_for_timeout(100)
    trial_again = set((page.locator('.v63-equipment-stage .avatar-renderer').first.get_attribute('data-rendered-items') or '').split())
    check('trial-mode-restores-combination', {'hair-comet','starter-sun-cap','starter-buddy-headphones'}.issubset(trial_again), str(sorted(trial_again)))

    health = page.evaluate("""() => {
      const rect = sel => { const el=document.querySelector(sel); if(!el)return null; const r=el.getBoundingClientRect(); return {width:r.width,height:r.height}; };
      const firstCard=document.querySelector('.v6-shop-catalog .v4-shop-grid article');
      const cardRect=firstCard?firstCard.getBoundingClientRect():null;
      return {
        overflow: Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,
        pageHeight: document.documentElement.scrollHeight,
        studio: rect('.v6-shop-studio'),
        previewColumn: rect('.v6-shop-preview-column'),
        stage: rect('.v63-equipment-stage'),
        catalog: rect('.v6-shop-catalog'),
        firstCard: cardRect?{width:cardRect.width,height:cardRect.height}:null,
        broken:[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&!i.hidden).map(i=>i.currentSrc||i.src)
      };
    }""")
    check('no-horizontal-overflow', health['overflow'] <= 1, f"overflow={health['overflow']}")
    check('no-broken-images', not health['broken'], str(health['broken']))
    if width <= 430:
        check('mobile-page-height-bounded', health['pageHeight'] <= 4500, f"height={health['pageHeight']}")
    if width >= 3200:
        check('4k-shop-workspace-wide', bool(health['studio']) and health['studio']['width'] >= 2800, str(health['studio']))
        check('4k-preview-column-substantial', bool(health['previewColumn']) and health['previewColumn']['width'] >= 700, str(health['previewColumn']))
        check('4k-preview-stage-fills-column', bool(health['stage']) and bool(health['previewColumn']) and health['stage']['width'] >= health['previewColumn']['width'] - 4, f"stage={health['stage']}, preview={health['previewColumn']}")
        check('4k-cards-remain-collectible-size', bool(health['firstCard']) and health['firstCard']['width'] >= 250, str(health['firstCard']))

    shot = ROOT / 'qa' / 'production-audit' / '2026-09-02' / 'v64-4k' / f'{width}x{height}-shop-combo.png'
    shot.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(shot), full_page=True)
    return {'viewport':f'{width}x{height}','pass':not failures,'checks':checks,'failures':failures,'screenshot':str(shot.relative_to(ROOT))}


def run():
    results=[]; console_errors=[]; page_errors=[]
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        for width,height in VIEWPORTS:
            context = browser.new_context(viewport={'width':width,'height':height}, reduced_motion='reduce')
            context.add_init_script(seed_script())
            context.route('**/api/server-time', route_time)
            context.route('**/api/time', route_time)
            page = context.new_page()
            page.on('console', lambda msg, wh=f'{width}x{height}': console_errors.append({'viewport':wh,'text':msg.text}) if msg.type=='error' else None)
            page.on('pageerror', lambda exc, wh=f'{width}x{height}': page_errors.append({'viewport':wh,'text':str(exc)}))
            try:
                results.append(run_case(page,width,height))
            except Exception as exc:
                results.append({'viewport':f'{width}x{height}','pass':False,'checks':[],'failures':[{'name':'exception','detail':str(exc)}]})
            context.close()
        browser.close()
    failed=[r for r in results if not r['pass']]
    payload={
        'status':'PASS' if not failed and not console_errors and not page_errors else 'FAIL',
        'viewports':len(VIEWPORTS),
        'passed':len(results)-len(failed),
        'failed':failed,
        'consoleErrors':console_errors,
        'pageErrors':page_errors,
        'results':results,
    }
    OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:payload[k] for k in ['status','viewports','passed','failed','consoleErrors','pageErrors']},ensure_ascii=False,indent=2))
    return 0 if payload['status']=='PASS' else 1

if __name__=='__main__':
    raise SystemExit(run())
