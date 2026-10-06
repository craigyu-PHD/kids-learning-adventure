#!/usr/bin/env python3
"""V6.5 Phase 4 focused UX acceptance for U05 / X01 / X02.

Uses the existing isolated controlled family fixture. It never reads or writes a
real family/cloud record. Screenshots are runtime evidence, not art acceptance.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any

from playwright.sync_api import Page, sync_playwright
from qa_v64_4k_layout import install_routes, make_snapshot, unlock_report

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('AUDIT_URL', 'http://127.0.0.1:4185/')
OUT = ROOT / 'qa' / 'v65' / 'phase4'
OUT.mkdir(parents=True, exist_ok=True)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def shot(page: Page, name: str) -> dict[str, Any]:
    path = OUT / name
    page.screenshot(path=str(path), full_page=True, animations='disabled', caret='hide')
    return {'path': str(path.relative_to(ROOT)), 'sha256': sha(path), 'bytes': path.stat().st_size}


def click_nav(page: Page, label: str) -> None:
    page.get_by_role('button', name=label, exact=True).click()
    page.wait_for_timeout(120)


def main() -> int:
    failures: list[str] = []
    console_errors: list[str] = []
    page_errors: list[str] = []
    evidence: dict[str, Any] = {}

    snapshot, seed = make_snapshot(4, False)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        context.add_init_script(seed)
        install_routes(context, snapshot)
        page = context.new_page()
        page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
        page.on('pageerror', lambda exc: page_errors.append(str(exc)))
        page.goto(URL, wait_until='domcontentloaded', timeout=60000)
        page.wait_for_selector('.v4-dashboard-grid', timeout=30000)

        # X01 negative control: every 3D navigation image fails and the SVG fallback
        # must become genuinely visible, not merely present in the DOM.
        nav = page.locator('.v4-main-navigation')
        nav_images = nav.locator('img')
        nav_count = nav.locator('button').count()
        if nav_count != 6 or nav_images.count() != 6:
            failures.append(f'X01 expected 6 nav controls/images, got buttons={nav_count} images={nav_images.count()}')
        page.evaluate("""() => {
          [...document.querySelectorAll('.v4-main-navigation img')].forEach((img, index) => {
            img.src = `/__v65_missing_nav_${index}.webp`;
          });
        }""")
        page.wait_for_timeout(350)
        fallback = page.evaluate("""() => [...document.querySelectorAll('.v4-main-navigation button')].map(button => {
          const img=button.querySelector('img'); const fb=button.querySelector('.v65-nav-svg-fallback');
          const ir=img?.getBoundingClientRect(); const fr=fb?.getBoundingClientRect();
          return {
            label:button.textContent?.trim()||'', imageDisplay:img?getComputedStyle(img).display:'missing',
            fallbackDisplay:fb?getComputedStyle(fb).display:'missing', fallbackVisibility:fb?getComputedStyle(fb).visibility:'missing',
            fallbackWidth:fr?.width||0, fallbackHeight:fr?.height||0, imageWidth:ir?.width||0,
            svgCount:fb?.querySelectorAll('svg').length||0,
          };
        })""")
        if len(fallback) != 6 or any(row['imageDisplay'] != 'none' or row['fallbackDisplay'] == 'none' or row['fallbackVisibility'] == 'hidden' or row['fallbackWidth'] < 24 or row['fallbackHeight'] < 24 or row['svgCount'] < 1 for row in fallback):
            failures.append(f'X01 nav fallback not visibly rendered: {fallback}')
        evidence['navFallback'] = {'rows': fallback, 'screenshot': shot(page, 'x01-nav-fallback-390.png')}

        # U05 mobile semester: only current week first, full 90-day data remains
        # available through explicit disclosure; no overflow clipping is used.
        click_nav(page, '學期日曆')
        page.wait_for_selector('.v4-semester-weeks', timeout=15000)
        semester_initial = page.evaluate("""() => ({
          weeks:document.querySelectorAll('.v4-week-strip').length,
          days:document.querySelectorAll('.v4-semester-day').length,
          expanded:document.querySelector('.v65-mobile-section-summary button')?.getAttribute('aria-expanded'),
          pageHeight:document.documentElement.scrollHeight,
          bodyOverflow:getComputedStyle(document.body).overflow,
          weeksOverflow:getComputedStyle(document.querySelector('.v4-semester-weeks')).overflow,
        })""")
        if semester_initial['weeks'] != 1 or semester_initial['days'] != 5 or semester_initial['expanded'] != 'false':
            failures.append(f'U05 semester must start at one current week: {semester_initial}')
        initial_shot = shot(page, 'u05-semester-current-week-390.png')
        page.get_by_role('button', name='展開 18 週／90 天', exact=True).click()
        page.wait_for_function("document.querySelectorAll('.v4-week-strip').length===18 && document.querySelectorAll('.v4-semester-day').length===90", timeout=10000)
        semester_expanded = page.evaluate("""() => ({weeks:document.querySelectorAll('.v4-week-strip').length,days:document.querySelectorAll('.v4-semester-day').length,expanded:document.querySelector('.v65-mobile-section-summary button')?.getAttribute('aria-expanded')})""")
        evidence['semester'] = {'initial': semester_initial, 'expanded': semester_expanded, 'screenshot': initial_shot}

        # X01 tabs: automatic-activation roving tabs with one tabindex=0 and a
        # valid tabpanel relationship. Use Shop category tabs as the 6-tab case.
        click_nav(page, '寶物商店')
        page.wait_for_selector('.v6-shop-category-tabs', timeout=15000)
        category_tabs = page.locator('.v6-shop-category-tabs [role="tab"]')
        first = category_tabs.nth(0)
        first.focus(); first.press('ArrowRight')
        page.wait_for_timeout(120)
        tab_state = page.evaluate("""() => {
          const tabs=[...document.querySelectorAll('.v6-shop-category-tabs [role=tab]')];
          const active=tabs.find(t=>t.getAttribute('aria-selected')==='true');
          const panel=document.getElementById('shop-catalog-panel');
          return {count:tabs.length, zeroTabs:tabs.filter(t=>t.tabIndex===0).length, activeText:active?.textContent?.trim()||'', activeControls:active?.getAttribute('aria-controls')||'', panelRole:panel?.getAttribute('role')||'', labelledBy:panel?.getAttribute('aria-labelledby')||'', focusText:document.activeElement?.textContent?.trim()||''};
        }""")
        if tab_state['count'] != 6 or tab_state['zeroTabs'] != 1 or tab_state['activeText'] != '飛船' or tab_state['focusText'] != '飛船' or tab_state['activeControls'] != 'shop-catalog-panel' or tab_state['panelRole'] != 'tabpanel' or tab_state['labelledBy'] != 'shop-category-tab-spaceship':
            failures.append(f'X01 roving/tabpanel mismatch: {tab_state}')
        evidence['tabs'] = tab_state

        # X02 important shop status must be Chinese and readable, with >=44px
        # touch actions. Return to Character to inspect a typical card.
        page.get_by_role('tab', name='角色裝備', exact=True).click(); page.wait_for_timeout(120)
        shop_readability = page.evaluate("""() => {
          const card=document.querySelector('.v4-shop-grid article');
          const rarity=card?.querySelector(':scope > span'); const status=card?.querySelector('.v6-shop-item-status'); const contract=card?.querySelector('.v6-shop-contract');
          const buttons=card?[...card.querySelectorAll('button')]:[];
          return {rarity:rarity?.textContent?.trim()||'', status:status?.textContent?.trim()||'', statusPx:status?parseFloat(getComputedStyle(status).fontSize):0, contractPx:contract?parseFloat(getComputedStyle(contract).fontSize):0, buttonHeights:buttons.map(b=>b.getBoundingClientRect().height)};
        }""")
        if shop_readability['rarity'] not in ('一般','稀有','史詩','傳奇') or shop_readability['statusPx'] < 13 or shop_readability['contractPx'] < 12 or any(h < 43.5 for h in shop_readability['buttonHeights']):
            failures.append(f'X02 shop text/touch readability failed: {shop_readability}')
        contrast_script = """() => {
          const parse=(value)=>{const match=value.match(/rgba?\\(([^)]+)\\)/); if(!match)return null; const parts=match[1].split(',').map(Number); return [parts[0],parts[1],parts[2],parts.length>3?parts[3]:1];};
          const blend=(fg,bg)=>[0,1,2].map(index=>fg[index]*fg[3]+bg[index]*(1-fg[3]));
          const backgroundFor=(element)=>{let node=element; const white=[255,255,255]; while(node){const color=parse(getComputedStyle(node).backgroundColor); if(color&&color[3]>0)return blend(color,[...white,1]); node=node.parentElement;} return white;};
          const luminance=(rgb)=>{const values=rgb.slice(0,3).map(value=>{const v=value/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);}); return .2126*values[0]+.7152*values[1]+.0722*values[2];};
          const inspect=(selector)=>{const element=document.querySelector(selector); if(!element)return null; const foreground=parse(getComputedStyle(element).color); const background=backgroundFor(element); const a=luminance(foreground), b=luminance(background); return {text:element.textContent?.trim()||'', ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05), color:getComputedStyle(element).color, effectiveBackground:background};};
          return {rarity:inspect('.v4-shop-grid article>span'),status:inspect('.v6-shop-item-status'),contract:inspect('.v6-shop-contract')};
        }"""
        light_contrast = page.evaluate(contrast_script)
        page.evaluate("document.documentElement.classList.add('dark')")
        page.wait_for_timeout(80)
        dark_contrast = page.evaluate(contrast_script)
        page.evaluate("document.documentElement.classList.remove('dark')")
        page.wait_for_timeout(80)
        for mode, rows in (('light', light_contrast), ('dark', dark_contrast)):
            for label in ('rarity','status','contract'):
                row = rows.get(label)
                if not row or row['ratio'] < 4.5:
                    failures.append(f'X02 {mode} {label} contrast below 4.5:1: {row}')
        evidence['shopReadability'] = {**shop_readability, 'contrast': {'light': light_contrast, 'dark': dark_contrast}}

        # U05 mobile report: protected route, then one learner at a time. Also
        # verify the learner tabs themselves satisfy X01 keyboard behavior.
        unlock_report(page)
        page.wait_for_selector('.v65-report-learner-tabs', timeout=15000)
        report_initial = page.evaluate("""() => ({tabs:document.querySelectorAll('.v65-report-learner-tabs [role=tab]').length,players:document.querySelectorAll('.v4-report-player').length,pageHeight:document.documentElement.scrollHeight,active:[...document.querySelectorAll('.v65-report-learner-tabs [role=tab]')].find(t=>t.getAttribute('aria-selected')==='true')?.textContent?.trim()||''})""")
        if report_initial['tabs'] != 4 or report_initial['players'] != 1:
            failures.append(f'U05 report must show one learner on mobile: {report_initial}')
        rtab = page.locator('.v65-report-learner-tabs [role=tab]').first
        rtab.focus(); rtab.press('ArrowRight'); page.wait_for_timeout(120)
        report_after = page.evaluate("""() => ({players:document.querySelectorAll('.v4-report-player').length,active:[...document.querySelectorAll('.v65-report-learner-tabs [role=tab]')].find(t=>t.getAttribute('aria-selected')==='true')?.textContent?.trim()||'',zeroTabs:[...document.querySelectorAll('.v65-report-learner-tabs [role=tab]')].filter(t=>t.tabIndex===0).length,labelledBy:document.getElementById('report-active-panel')?.getAttribute('aria-labelledby')||''})""")
        if report_after['players'] != 1 or report_after['zeroTabs'] != 1 or not report_after['active'] or report_after['active'] == report_initial['active'] or not report_after['labelledBy'].startswith('report-tab-'):
            failures.append(f'U05/X01 report learner tabs failed: {report_initial} -> {report_after}')
        evidence['report'] = {'initial': report_initial, 'afterArrow': report_after, 'screenshot': shot(page, 'u05-report-single-learner-390.png')}

        # U05 settings: daily controls stay visible. Semester/theme, members,
        # sync, backup, and dangerous actions are separate semantic disclosures;
        # all data remains reachable and no overflow clipping is used.
        page.get_by_role('button', name='家長設定', exact=True).click()
        page.wait_for_selector('.v4-settings-page', timeout=15000)
        settings_initial = page.evaluate("""() => ({
          groups:[...document.querySelectorAll('.v65-settings-group')].map(group=>({className:group.className,open:group.hasAttribute('open'),summary:group.querySelector('summary')?.textContent?.replace(/\s+/g,' ').trim()||''})),
          displayVisible:!!document.querySelector('.settings-card .segmented-control'),
          pageHeight:document.documentElement.scrollHeight,
          bodyOverflow:getComputedStyle(document.body).overflow,
        })""")
        expected_classes = ('advanced','members','sync','backup','danger')
        group_classes = [next((name for name in expected_classes if name in row['className'].split()), '') for row in settings_initial['groups']]
        if group_classes != list(expected_classes) or any(row['open'] for row in settings_initial['groups']) or not settings_initial['displayVisible']:
            failures.append(f'U05 settings disclosure initial state wrong: {settings_initial}')
        expected_summary_words = ('學期與冒險主題','家庭成員','家庭 PIN 與雲端同步','資料備份','危險操作')
        if any(word not in settings_initial['groups'][index]['summary'] for index,word in enumerate(expected_summary_words)):
            failures.append(f'U05 settings semantic group labels wrong: {settings_initial["groups"]}')
        for selector in expected_classes:
            page.locator(f'.v65-settings-group.{selector} summary').click(); page.wait_for_timeout(80)
        settings_expanded = page.evaluate("""() => ({
          groups:[...document.querySelectorAll('.v65-settings-group')].map(group=>({className:group.className,open:group.hasAttribute('open')})),
          learners:document.querySelectorAll('.learner-admin-card .child-setting-card').length,
          caregivers:document.querySelectorAll('.user-admin-card .caregiver-setting-card').length,
          cloud:!!document.querySelector('.cloud-settings-card'),
          backup:!![...document.querySelectorAll('button')].find(button=>button.textContent?.includes('匯出完整學習紀錄 JSON')),
          danger:!![...document.querySelectorAll('button')].find(button=>button.textContent?.includes('清除所有學習進度')),
          pageHeight:document.documentElement.scrollHeight,
          bodyOverflow:getComputedStyle(document.body).overflow,
        })""")
        if not all(row['open'] for row in settings_expanded['groups']) or settings_expanded['learners'] != 4 or settings_expanded['caregivers'] < 1 or not settings_expanded['cloud'] or not settings_expanded['backup'] or not settings_expanded['danger']:
            failures.append(f'U05 settings grouped content unavailable: {settings_expanded}')
        evidence['settings'] = {'initial': settings_initial, 'expanded': settings_expanded, 'screenshot': shot(page, 'u05-settings-disclosure-390.png')}

        context.close(); browser.close()

    # X02 source-level system-operation language guard. English teaching content
    # and decorative overlines are allowed; these exact UI action strings are not.
    reward_source = (ROOT / 'src/v4/RewardModal.tsx').read_text(encoding='utf-8')
    secondary_source = (ROOT / 'src/v4/SecondaryViews.tsx').read_text(encoding='utf-8')
    forbidden = [text for text in ('Continue Adventure', '> Skip<') if text in reward_source]
    if forbidden:
        failures.append(f'X02 English system actions remain: {forbidden}')
    if "{legacy.rarity??'common'}" in secondary_source and 'rarityLabels' not in secondary_source:
        failures.append('X02 raw English rarity is still rendered in Shop')
    evidence['languageGuard'] = {'forbiddenFound': forbidden, 'rewardChineseActions': '繼續冒險' in reward_source and '略過動畫' in reward_source, 'rarityLabelsPresent': 'rarityLabels' in secondary_source}

    result = {
        'status': 'PASS' if not failures and not console_errors and not page_errors else 'FAIL',
        'suiteName': 'v65-phase4-ux',
        'environment': 'isolated-controlled-family-fixture',
        'auditUrl': URL,
        'failures': failures,
        'consoleErrors': console_errors,
        'pageErrors': page_errors,
        'evidence': evidence,
    }
    result_path = OUT / 'phase4-ux.json'
    result_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': result['status'], 'failureCount': len(failures), 'failures': failures, 'consoleErrors': console_errors, 'pageErrors': page_errors, 'result': str(result_path.relative_to(ROOT))}, ensure_ascii=False, indent=2))
    return 0 if result['status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
