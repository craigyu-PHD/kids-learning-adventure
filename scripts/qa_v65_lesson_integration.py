#!/usr/bin/env python3
"""V6.5 L01 browser integration: two lessons x four learners, no duplicate settlement.

Uses only the isolated local-family fixture. It pre-seeds the prerequisite lesson
stage keys so the test can focus on the shared canComplete contract, then performs
mission/block settlement through the real UI and verifies reload persistence.
"""
from __future__ import annotations

import copy
import hashlib
import json
import os
from pathlib import Path
from typing import Any

from playwright.sync_api import Page, sync_playwright
from qa_v63_browser_seed import SETTINGS as BASE_SETTINGS, PROGRESS as BASE_PROGRESS

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('AUDIT_URL', 'http://127.0.0.1:4186/')
OUT = ROOT / 'qa' / 'v65' / 'phase4'
OUT.mkdir(parents=True, exist_ok=True)
RESULT = OUT / 'l01-lesson-integration.json'
TIME = {
    'now': '2026-09-17T06:00:00.000Z',
    'activeDate': '2026-09-17',
    'taipeiDate': '2026-09-17',
    'taipeiTime': '14:00:00',
    'timeZone': 'Asia/Taipei',
}
DAY_ID = 'day-14'
BLOCKS = [
    {
        'id': 'w3d4b1',
        'lesson': 1,
        'missions': [
            {'id': 'w3d4b1-m1', 'stage': 7, 'title': '輪流出題'},
            {'id': 'w3d4b1-m2', 'stage': 8, 'title': '開口任務'},
        ],
    },
    {
        'id': 'w3d4b2',
        'lesson': 2,
        'missions': [
            {'id': 'w3d4b2-m1', 'stage': 7, 'title': '輪流出題'},
            {'id': 'w3d4b2-m2', 'stage': 8, 'title': '合作任務'},
        ],
    },
]
CHILD_NAMES = ['哥哥', '弟弟', '姐姐', '妹妹']
REQUIRED_STAGES = [9, 0, 1, 2, 3, 4, 5, 6]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fixture_script() -> str:
    settings = copy.deepcopy(BASE_SETTINGS)
    progress = copy.deepcopy(BASE_PROGRESS)
    reflections = {
        DAY_ID: {
            'engagement': '',
            'note': '',
            'viewing': {},
            'dailyChallenge': {'warmup': False, 'learn': False},
            'excludedLearnerIds': [],
            'lessonStages': {block['id']: REQUIRED_STAGES for block in BLOCKS},
        }
    }
    return f"""
(() => {{
  if (localStorage.getItem('__v65_l01_fixture_seeded__') === '1') return;
  localStorage.clear(); sessionStorage.clear();
  const settings={json.dumps(settings, ensure_ascii=False)};
  const progress={json.dumps(progress, ensure_ascii=False)};
  const reflections={json.dumps(reflections, ensure_ascii=False)};
  localStorage.setItem('star-learning-v40:__local__:settings', JSON.stringify(settings));
  localStorage.setItem('star-learning-v40:__local__:progress', JSON.stringify(progress));
  localStorage.setItem('star-learning-v40:__local__:attendance', JSON.stringify({{}}));
  localStorage.setItem('star-learning-v40:__local__:reflections', JSON.stringify(reflections));
  sessionStorage.setItem('star-learning-v40:__local__:active-user', 'user-father');
  localStorage.setItem('little-explorers-v4-sound', 'off');
  localStorage.setItem('__v65_l01_fixture_seeded__', '1');
}})();
"""


def route_time(route) -> None:
    route.fulfill(status=200, content_type='application/json', body=json.dumps(TIME, ensure_ascii=False))


def close_reward(page: Page) -> None:
    button = page.locator('.v4-reward-continue')
    button.wait_for(state='visible', timeout=5000)
    button.click()
    page.locator('.v4-reward-modal').wait_for(state='detached', timeout=5000)


def click_stage(page: Page, stage_number: int, title: str) -> None:
    page.get_by_role('button', name=f'{stage_number}. {title}', exact=True).click()
    page.wait_for_timeout(80)


def click_child_set(page: Page, selector: str, *, expect_enabled: bool = True) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for name in CHILD_NAMES:
        button = page.locator(selector, has_text=name)
        if button.count() != 1:
            raise AssertionError(f'{selector} expected one button for {name}, got {button.count()}')
        disabled = button.is_disabled()
        rows.append({'child': name, 'disabledBefore': disabled})
        if expect_enabled and disabled:
            raise AssertionError(f'{selector} unexpectedly disabled for {name}: {button.inner_text()}')
        if expect_enabled:
            button.click()
            close_reward(page)
            page.wait_for_timeout(80)
    return rows


def progress_summary(page: Page) -> dict[str, Any]:
    return page.evaluate("""() => {
      const progress=JSON.parse(localStorage.getItem('star-learning-v40:__local__:progress')||'{}');
      const targetMissions=['w3d4b1-m1','w3d4b1-m2','w3d4b2-m1','w3d4b2-m2'];
      const targetBlocks=['w3d4b1','w3d4b2'];
      return Object.fromEntries(Object.entries(progress).map(([childId,p])=>[childId,{
        completedMissions:targetMissions.filter(id=>(p.completedMissions||[]).includes(id)),
        completedBlocks:targetBlocks.filter(id=>(p.completedBlocks||[]).includes(id)),
        dayDone:(p.completedDays||[]).includes('day-14'),
        rewardTransactionCount:(p.rewardTransactions||[]).length,
        rewardTransactionIds:(p.rewardTransactions||[]).map(tx=>tx.id),
        completionKeys:Object.keys(p.completionTimestamps||{}).filter(id=>targetBlocks.includes(id)||id==='day-14').sort(),
      }]))
    }""")


def assert_complete(summary: dict[str, Any]) -> None:
    expected_missions = ['w3d4b1-m1', 'w3d4b1-m2', 'w3d4b2-m1', 'w3d4b2-m2']
    expected_blocks = ['w3d4b1', 'w3d4b2']
    for child_id in ('child-1', 'child-2', 'child-3', 'child-4'):
        row = summary.get(child_id) or {}
        if row.get('completedMissions') != expected_missions:
            raise AssertionError(f'{child_id} mission settlement mismatch: {row}')
        if row.get('completedBlocks') != expected_blocks:
            raise AssertionError(f'{child_id} block settlement mismatch: {row}')
        if row.get('dayDone') is not True:
            raise AssertionError(f'{child_id} day completion missing: {row}')
        if row.get('completionKeys') != ['day-14']:
            raise AssertionError(f'{child_id} day completion timestamp mismatch: {row}')


def main() -> int:
    failures: list[str] = []
    evidence: dict[str, Any] = {}
    console_errors: list[str] = []
    page_errors: list[str] = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            context = browser.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
            context.add_init_script(fixture_script())
            context.route('**/api/server-time', route_time)
            context.route('**/api/time', route_time)
            page = context.new_page()
            page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
            page.on('pageerror', lambda exc: page_errors.append(str(exc)))
            page.goto(URL, wait_until='domcontentloaded', timeout=60000)
            page.wait_for_selector('.v4-dashboard-grid', timeout=30000)
            page.wait_for_function("document.querySelector('.v53-date-strip strong')?.textContent?.includes('Day 14')", timeout=10000)

            evidence['before'] = progress_summary(page)

            for lesson_index, block in enumerate(BLOCKS):
                card = page.locator('.v4-lesson-card').nth(lesson_index)
                card.get_by_role('button').click()
                page.wait_for_selector('.v4-quest-shell', timeout=15000)
                page.wait_for_function("document.querySelector('.v4-quest-header')?.textContent?.includes('今日挑戰')", timeout=8000)

                lesson_evidence: dict[str, Any] = {'blockId': block['id'], 'missions': []}
                for mission in block['missions']:
                    click_stage(page, mission['stage'], mission['title'])
                    buttons = page.locator('.v4-mission-learners button')
                    if buttons.count() != 4:
                        raise AssertionError(f"{block['id']} {mission['id']} expected 4 learner buttons, got {buttons.count()}")
                    mission_rows = click_child_set(page, '.v4-mission-learners button')
                    done_count = page.locator('.v4-mission-learners button.done').count()
                    if done_count != 4:
                        raise AssertionError(f"{mission['id']} completion UI mismatch: {done_count}/4")
                    lesson_evidence['missions'].append({'missionId': mission['id'], 'buttons': mission_rows, 'doneCount': done_count})

                click_stage(page, 9, '完成任務')
                finish = page.locator('.v4-finish-grid button')
                if finish.count() != 4:
                    raise AssertionError(f"{block['id']} expected 4 finish buttons, got {finish.count()}")
                finish_rows = click_child_set(page, '.v4-finish-grid button')
                done_count = page.locator('.v4-finish-grid button.done').count()
                if done_count != 4:
                    raise AssertionError(f"{block['id']} block completion UI mismatch: {done_count}/4")
                lesson_evidence['finishButtons'] = finish_rows
                lesson_evidence['finishDoneCount'] = done_count
                evidence[f'lesson{lesson_index + 1}'] = lesson_evidence

                page.get_by_role('button', name='返回課程總覽', exact=True).click()
                page.wait_for_selector('.v4-dashboard-grid', timeout=15000)

            before_reload = progress_summary(page)
            assert_complete(before_reload)
            evidence['beforeReload'] = before_reload

            page.reload(wait_until='domcontentloaded', timeout=60000)
            page.wait_for_selector('.v4-dashboard-grid', timeout=30000)
            after_reload = progress_summary(page)
            assert_complete(after_reload)
            evidence['afterReload'] = after_reload
            if after_reload != before_reload:
                raise AssertionError('reload changed completion/ledger summary')

            # Open lesson 1 again: every already-settled mission and block action must
            # remain disabled/done. This is the UI half of idempotency after reload.
            page.locator('.v4-lesson-card').nth(0).get_by_role('button').click()
            page.wait_for_selector('.v4-quest-shell', timeout=15000)
            repeat_checks: dict[str, Any] = {'missions': []}
            for mission in BLOCKS[0]['missions']:
                click_stage(page, mission['stage'], mission['title'])
                rows = page.locator('.v4-mission-learners button').evaluate_all(
                    "els => els.map(el => ({text:el.textContent?.replace(/\\s+/g,' ').trim(), disabled:el.disabled, done:el.classList.contains('done')}))"
                )
                if len(rows) != 4 or any(not row['disabled'] or not row['done'] for row in rows):
                    raise AssertionError(f"repeat mission action still available {mission['id']}: {rows}")
                repeat_checks['missions'].append({'missionId': mission['id'], 'rows': rows})
            click_stage(page, 9, '完成任務')
            block_rows = page.locator('.v4-finish-grid button').evaluate_all(
                "els => els.map(el => ({text:el.textContent?.replace(/\\s+/g,' ').trim(), disabled:el.disabled, done:el.classList.contains('done')}))"
            )
            if len(block_rows) != 4 or any(not row['disabled'] or not row['done'] for row in block_rows):
                raise AssertionError(f'repeat block action still available: {block_rows}')
            repeat_checks['blockRows'] = block_rows
            repeat_checks['summaryAfterNavigation'] = progress_summary(page)
            if repeat_checks['summaryAfterNavigation'] != before_reload:
                raise AssertionError('navigating completed controls changed ledger summary')
            evidence['repeatGuards'] = repeat_checks

            shot = OUT / 'l01-two-lessons-four-learners.png'
            page.screenshot(path=str(shot), full_page=True, animations='disabled', caret='hide')
            evidence['screenshot'] = {'path': str(shot.relative_to(ROOT)), 'sha256': sha(shot), 'bytes': shot.stat().st_size}
            context.close(); browser.close()
    except Exception as exc:
        failures.append(f'{type(exc).__name__}: {exc}')

    result = {
        'status': 'PASS' if not failures and not console_errors and not page_errors else 'FAIL',
        'suiteName': 'v65-l01-lesson-integration',
        'environment': 'isolated-local-family-fixture',
        'auditUrl': URL,
        'dayId': DAY_ID,
        'lessonCount': 2,
        'learnerCount': 4,
        'failures': failures,
        'consoleErrors': console_errors,
        'pageErrors': page_errors,
        'evidence': evidence,
    }
    RESULT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': result['status'], 'failures': failures, 'consoleErrors': console_errors, 'pageErrors': page_errors, 'result': str(RESULT.relative_to(ROOT))}, ensure_ascii=False, indent=2))
    return 0 if result['status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
