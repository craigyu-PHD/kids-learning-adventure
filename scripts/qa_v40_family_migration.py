#!/usr/bin/env python3
"""Client-side legacy family migration QA.

Server authentication/signing is covered by qa_v40_family_auth.ts. This test
isolates the browser migration contract by stubbing the already-validated
family-session/state endpoints, then exercising the real App migration code.
"""
import hashlib, json, os, signal, subprocess, time
from pathlib import Path
from playwright.sync_api import sync_playwright
from qa_v40_browser import ROOT, URL, progress, settings, wait_http

QA_DIR = ROOT / '.qa'
QA_DIR.mkdir(exist_ok=True)
PIN = '2468'
FAMILY_ID = hashlib.sha256(f'v40-migration-test:{PIN}'.encode()).hexdigest()
SESSION = {
    'familyId': FAMILY_ID,
    'token': f'v1.{FAMILY_ID}.4102444800.' + ('x' * 43),
    'expiresAt': '2099-12-31T00:00:00.000Z',
}
TIME_BODY = json.dumps({
    'now': '2026-09-02T01:00:00.000Z',
    'activeDate': '2026-09-02',
    'taipeiDate': '2026-09-02',
    'taipeiTime': '09:00:00',
    'timeZone': 'Asia/Taipei',
})


def main():
    vite = None
    try:
        try:
            wait_http(URL, 1)
        except RuntimeError:
            vite = subprocess.Popen(
                ['npm', 'run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'],
                cwd=ROOT,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
            wait_http(URL, 20)

        seed_settings = json.dumps(settings, ensure_ascii=False)
        seed_progress = json.dumps(progress, ensure_ascii=False)
        seed_script = f"""
(() => {{
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('star-learning-active-family-pin-v22', {json.dumps(PIN)});
  localStorage.setItem('star-learning-v22:{PIN}:settings', JSON.stringify({seed_settings}));
  localStorage.setItem('star-learning-v22:{PIN}:progress', JSON.stringify({seed_progress}));
  sessionStorage.setItem('star-learning-v22:{PIN}:active-user', 'user-father');
}})();
"""

        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            context.add_init_script(seed_script)

            def family_session(route):
                route.fulfill(status=200, content_type='application/json', body=json.dumps(SESSION))

            def state_api(route, request):
                if request.method == 'GET':
                    route.fulfill(status=404, content_type='application/json', body=json.dumps({'error': 'not found'}))
                elif request.method == 'PUT':
                    route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'updatedAt': '2026-09-02T01:00:00.000Z'}))
                else:
                    route.fulfill(status=405, content_type='application/json', body=json.dumps({'error': 'method'}))

            context.route('**/api/family-session', family_session)
            context.route('**/api/state*', state_api)
            context.route('**/api/server-time', lambda route: route.fulfill(status=200, content_type='application/json', body=TIME_BODY))
            context.route('**/api/time', lambda route: route.fulfill(status=200, content_type='application/json', body=TIME_BODY))

            page = context.new_page()
            page.goto(URL, wait_until='domcontentloaded', timeout=45000)
            page.wait_for_selector('.v4-dashboard-grid', timeout=30000)
            page.wait_for_timeout(250)

            evidence = page.evaluate(f"""() => {{
              const raw = localStorage.getItem('star-learning-active-family-session-v40');
              const session = raw ? JSON.parse(raw) : null;
              const settingsRaw = localStorage.getItem('star-learning-v40:{FAMILY_ID}:settings');
              const migratedSettings = settingsRaw ? JSON.parse(settingsRaw) : null;
              return {{
                familyId: session?.familyId || '',
                activePinV22: localStorage.getItem('star-learning-active-family-pin-v22'),
                activePinV21: localStorage.getItem('star-learning-active-family-pin-v21'),
                legacySettings: localStorage.getItem('star-learning-v22:{PIN}:settings'),
                legacyProgress: localStorage.getItem('star-learning-v22:{PIN}:progress'),
                v40Settings: !!settingsRaw,
                v40Progress: !!localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'),
                familyCode: migratedSettings?.cloudSync?.familyCode || '',
                activeUser: sessionStorage.getItem('star-learning-v40:{FAMILY_ID}:active-user'),
                oldActiveUser: sessionStorage.getItem('star-learning-v22:{PIN}:active-user'),
                hasBrother: document.body.innerText.includes('哥哥'),
              }};
            }}""")

            checks = {
                'sessionIssued': evidence['familyId'] == FAMILY_ID,
                'activePinRemoved': evidence['activePinV22'] is None and evidence['activePinV21'] is None,
                'legacyPinNamespacesRemoved': evidence['legacySettings'] is None and evidence['legacyProgress'] is None,
                'v40CachePreserved': evidence['v40Settings'] and evidence['v40Progress'] and evidence['familyCode'] == FAMILY_ID,
                'activeUserMigrated': evidence['activeUser'] == 'user-father' and evidence['oldActiveUser'] is None,
                'learnerDataVisible': evidence['hasBrother'],
            }
            browser.close()

        failures = [name for name, ok in checks.items() if not ok]
        out = {'status': 'FAIL' if failures else 'PASS', **checks, 'failures': failures}
        (QA_DIR / 'v40_family_migration_result.json').write_text(json.dumps(out, ensure_ascii=False, indent=2))
        print(json.dumps(out, ensure_ascii=False, indent=2))
        if failures:
            raise SystemExit(1)
    finally:
        if vite:
            try:
                os.killpg(vite.pid, signal.SIGTERM)
            except Exception:
                pass
            try:
                vite.wait(timeout=3)
            except Exception:
                try:
                    os.killpg(vite.pid, signal.SIGKILL)
                except Exception:
                    pass


if __name__ == '__main__':
    main()
