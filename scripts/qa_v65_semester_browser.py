#!/usr/bin/env python3
"""Isolated semester wiring regression; fake family/time APIs, no real cloud.
A five-day g1-s2 fixture is injected into Vite's module response in one test
context only. It is never written to production curriculum or source files.
"""
import copy
import hashlib
import json
import os
import traceback
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
from qa_v63_browser_seed import SETTINGS, PROGRESS

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa/v65/semester-extension'
URL = os.environ.get('AUDIT_URL', 'http://127.0.0.1:4197/')
FAMILY = 'e' * 64
PREFIX = 'star-learning-v40:' + FAMILY + ':'
SESSION = {'familyId': FAMILY, 'token': 'semester-isolated-' + 'x' * 48, 'expiresAt': '2099-01-01T00:00:00Z'}

def fixture():
    settings = copy.deepcopy(SETTINGS)
    settings['semesterStart'] = '2026-09-07'
    settings['cloudSync'] = {'enabled': True, 'familyCode': FAMILY}
    progress = copy.deepcopy(PROGRESS)
    child = progress['child-1']
    child['completedDays'] = ['day-1']
    child['completedBlocks'] = ['w1d1b1', 'w1d1b2']
    child['answerEvents'] = [
        {'id': 'legacy-answer', 'dayId': 'day-1', 'blockId': 'w1d1b1', 'stage': 5, 'target': 'legacy-word', 'answer': 'legacy-word', 'correct': True, 'createdAt': '2026-09-07T04:00:00Z'},
        {'id': 'future-answer', 'dayId': 'g1-s2:day-1', 'blockId': 'g1-s2:w1d1b1', 'stage': 5, 'target': 'future-word', 'answer': 'no', 'correct': False, 'createdAt': '2027-02-08T04:00:00Z'},
    ]
    return {'version': 2, 'updatedAt': '2026-09-07T00:00:00Z', 'settings': settings, 'progress': progress,
            'attendance': {'day-1': ['child-1']}, 'reflections': {'day-1': {'engagement': 'great', 'note': 'keep-legacy-note', 'viewing': {}}}}

def prepare(context, future=False):
    state = fixture()
    requested = []
    injected = []
    seed = f"""
    if (!localStorage.getItem('__semester_fixture__')) {{
      localStorage.setItem('star-learning-active-family-session-v40', JSON.stringify({json.dumps(SESSION)}));
      const snap={json.dumps(state, ensure_ascii=False)};
      for (const field of ['settings','progress','attendance','reflections'])
        localStorage.setItem({json.dumps(PREFIX)}+field, JSON.stringify(snap[field]));
      sessionStorage.setItem({json.dumps(PREFIX+'active-user')}, 'user-father');
      localStorage.setItem('little-explorers-v4-sound','off');
      localStorage.setItem('__semester_fixture__','1');
    }}
    """
    context.add_init_script(seed)
    def route_request(route):
        nonlocal state
        req = route.request
        parsed = urlparse(req.url)
        if parsed.path in ['/api/server-time', '/api/time']:
            day = '2027-02-08' if future else '2026-09-08'
            route.fulfill(status=200, content_type='application/json', body=json.dumps({'taipeiDate': day, 'now': day + 'T04:00:00Z'})); return
        if parsed.path == '/api/family-session':
            assert req.post_data_json['pin'] == '2468'
            route.fulfill(status=200, content_type='application/json', body=json.dumps(SESSION)); return
        if parsed.path == '/api/state':
            requested.append(req.method)
            if req.method == 'PUT':
                state = copy.deepcopy(req.post_data_json)
                route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'updatedAt': state['updatedAt']}))
            else:
                route.fulfill(status=200, content_type='application/json', body=json.dumps(state))
            return
        if parsed.hostname != '127.0.0.1':
            route.abort(); return
        if future and parsed.path == '/src/semesters.ts':
            response = route.fetch()
            body = response.text()
            marker = 'export const semesterRegistry = createSemesterRegistry(slots);'
            assert marker in body, 'Vite injection marker changed'
            injection = """
            const fixtureDays = curriculum.slice(0,5).map(day => ({
              ...day, id:'g1-s2:'+day.id,
              blocks:day.blocks.map(block=>({...block,id:'g1-s2:'+block.id,
                missions:block.missions.map(mission=>({...mission,id:'g1-s2:'+mission.id}))}))
            }));
            slots[1] = {...slots[1], status:'published', defaultStart:'2027-02-08', days:fixtureDays};
            """
            injected.append(True)
            route.fulfill(response=response, body=body.replace(marker, injection + marker)); return
        route.continue_()
    context.route('**/*', route_request)
    return requested, injected

def nav(page, label):
    page.get_by_role('button', name=label, exact=True).click()

def wait_home(page):
    page.locator('.v4-daily-panel').wait_for()
    page.get_by_text('今日日期已確認', exact=False).first.wait_for(state='attached')

def unlock(page):
    nav(page, '學習報表')
    dialog = page.get_by_role('dialog', name='管理者驗證')
    dialog.wait_for()
    for digit in '2468': dialog.get_by_role('button', name=digit, exact=True).click()
    dialog.get_by_role('button', name='解鎖家長專區', exact=True).click()
    page.locator('.v4-report-player').first.wait_for()

def settings(page):
    page.get_by_role('button', name='家長設定', exact=True).click()
    page.get_by_role('heading', name='家庭學習管理中心').wait_for()
    detail = page.locator('details.advanced')
    if detail.get_attribute('open') is None: detail.locator('summary').click()
    page.get_by_label('目前學期', exact=True).wait_for()

def stored(page, field):
    return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))', PREFIX + field)

def capture(page, name):
    page.evaluate('document.fonts.ready')
    page.screenshot(path=str(OUT / (name + '.png')), full_page=True, animations='disabled')
    overflow = page.evaluate('Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth')
    assert overflow <= 1, f'{name}: overflow {overflow}'
    return {'screenshot': name + '.png', 'overflow': overflow}

def run_case(browser, width, future):
    context = browser.new_context(viewport={'width': width, 'height': 900 if width > 600 else 844}, reduced_motion='reduce')
    requests, injected = prepare(context, future)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    tag = ('future-fixture' if future else 'legacy') + '-' + str(width)
    shots = []
    try:
        page.goto(URL, wait_until='domcontentloaded')
        wait_home(page)
        before = {k: stored(page, k) for k in ['progress', 'attendance', 'reflections']}
        unlock(page)
        # The real ReportPage filters telemetry to g1-s1, not all persisted events.
        report = page.locator('.v4-report-player').first
        assert '100%' in report.locator('.v4-answer-analytics').inner_text()
        assert 'legacy-word' not in report.locator('.v4-answer-analytics').inner_text()
        settings(page)
        options = page.get_by_label('目前學期', exact=True).locator('option').evaluate_all('(nodes)=>nodes.map(n=>n.value)')
        assert options == (['g1-s1','g1-s2'] if future else ['g1-s1']), options
        assert page.get_by_label('學期起始日', exact=True).input_value() == '2026-09-07'
        shots.append(capture(page, tag + '-settings'))
        if future:
            page.get_by_label('目前學期', exact=True).select_option('g1-s2')
            assert page.get_by_label('學期起始日', exact=True).input_value() == '2027-02-08'
            nav(page, '學期日曆')
            page.locator('.v4-semester-day').first.wait_for()
            assert page.locator('.v4-semester-day').count() == 5
            assert '國小一年級下學期' in page.locator('.v4-page-heading').inner_text()
            assert page.locator('.v4-semester-day.today').count() == 1
            assert page.locator('.v4-semester-day.done').count() == 0
            shots.append(capture(page, tag + '-calendar'))
            nav(page, '學習報表')
            page.locator('.v4-report-player').first.wait_for()
            report = page.locator('.v4-report-player').first
            assert '0/1 次答對' in report.locator('.v4-answer-analytics').inner_text()
            assert 'future-word' in report.locator('.v4-answer-analytics').inner_text()
            assert report.locator('.v4-report-score strong').inner_text() == '0%'
            shots.append(capture(page, tag + '-report'))
            settings(page)
            page.get_by_label('學期起始日', exact=True).fill('2027-02-15')
            assert stored(page, 'settings')['semesterStart'] == '2026-09-07'
            assert stored(page, 'settings')['semesterStarts']['g1-s2'] == '2027-02-15'
            page.get_by_label('目前學期', exact=True).select_option('g1-s1')
            assert page.get_by_label('學期起始日', exact=True).input_value() == '2026-09-07'
            page.get_by_label('目前學期', exact=True).select_option('g1-s2')
            assert page.get_by_label('學期起始日', exact=True).input_value() == '2027-02-15'
        else:
            page.get_by_label('學期起始日', exact=True).fill('2026-09-14')
            assert stored(page, 'settings')['semesterStart'] == '2026-09-14'
            nav(page, '學期日曆')
            page.locator('.v4-semester-day').first.wait_for()
            if width > 600: assert page.locator('.v4-semester-day').count() == 90
            assert page.locator('.v4-semester-day.today').count() == 0
            assert '9/14' in page.locator('.v4-semester-day').first.inner_text(), 'Calendar did not apply selected semester start'
            shots.append(capture(page, tag + '-calendar'))
            nav(page, '學習報表')
            page.locator('.v4-report-player').first.wait_for()
            settings(page)
            page.get_by_label('學期起始日', exact=True).fill('2026-09-07')
        for key, value in before.items(): assert stored(page, key) == value, f'{key} mutated by semester controls'
        # Let the debounced mocked cloud upload complete before checking reload.
        page.wait_for_timeout(1200)
        page.reload(wait_until='domcontentloaded')
        wait_home(page)
        assert stored(page, 'settings')['selectedSemesterId'] == ('g1-s2' if future else 'g1-s1')
        for key, value in before.items(): assert stored(page, key) == value, f'{key} changed on reload'
        # Child future links are rejected, while an old today deep link still opens.
        if future:
            page.goto(URL + '?day=g1-s2%3Aday-1&lesson=1', wait_until='domcontentloaded')
            wait_home(page)
            assert page.locator('.v4-quest-shell').count() == 0
            assert 'day=' not in page.url
            assert stored(page, 'attendance') == before['attendance']
        else:
            page.goto(URL + '?day=day-3&lesson=1', wait_until='domcontentloaded')
            wait_home(page)
            assert page.locator('.v4-quest-shell').count() == 0
            page.goto(URL + '?day=day-2&lesson=1', wait_until='domcontentloaded')
            page.locator('.v4-quest-shell').wait_for()
            assert 'DAY 2' in page.locator('.v4-quest-header').inner_text().upper(), 'Legacy today route did not open Day 2'
            assert 'day-2' in stored(page, 'attendance')
            assert stored(page, 'progress') == before['progress']
        assert not errors, errors
        return {'name': tag, 'pass': True, 'screenshots': shots, 'mockApiMethods': requests, 'futureFixtureInjected': bool(injected), 'pageErrors': errors}
    except Exception as error:
        page.screenshot(path=str(OUT / (tag + '-failure.png')), full_page=True)
        return {'name': tag, 'pass': False, 'error': repr(error), 'traceback': traceback.format_exc(), 'pageErrors': errors, 'screenshots': shots}
    finally:
        context.close()

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        rows = [run_case(browser, 1440, False), run_case(browser, 390, False), run_case(browser, 1440, True)]
        browser.close()
    result = {'status': 'PASS' if all(row['pass'] for row in rows) else 'FAIL', 'rows': rows,
              'scope': 'isolated Chromium Vite dev; mocked family/time; synthetic future content only in browser response',
              'sourceHashes': {p: hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in ['src/semesters.ts','src/App.tsx','src/v4/Dashboard.tsx','src/v4/SecondaryViews.tsx','src/v4/ParentSettings.tsx']}}
    (OUT/'browser.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result['status'] == 'PASS' else 1

if __name__ == '__main__': raise SystemExit(main())
