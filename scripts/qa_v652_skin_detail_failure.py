"""Isolated delivery fixtures only; these do not approve any outfit/mask artwork."""
import json
import argparse
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PAIR = 'qa/v652/sol/mage-brother-technical-mask-r1/'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--attempt', required=True)
    args = parser.parse_args()
    assert args.attempt.replace('-', '').isalnum()
    OUT = ROOT / 'qa/v652' / args.attempt
    OUT.mkdir(exist_ok=False)
    params = dict(items='hat-mage', skin='outfit-racer', detailAvatar='brother',
                  detailOverlay=PAIR+'hat-mage-overlay.png', detailMask=PAIR+'hair-visibility-mask.png')
    results = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for case in ['paired-ready', 'mask-404', 'overlay-404', 'skin-404', 'skin-error-after-ready', 'skin-rewear', 'mask-retry', 'overlay-retry', 'late-mask-after-switch']:
            context = browser.new_context(reduced_motion='reduce')
            context.route('**/api/**', lambda route: route.abort())
            if case in ['mask-404', 'mask-retry']:
                context.route('**/hair-visibility-mask.png*', lambda route: route.fulfill(status=404, body='fixture'))
            if case in ['overlay-404', 'overlay-retry']:
                context.route('**/hat-mage-overlay.png*', lambda route: route.fulfill(status=404, body='fixture'))
            if case == 'skin-404':
                context.route('**/runtime/brother/outfit-racer.webp', lambda route: route.fulfill(status=404, body='fixture'))
            page = context.new_page()
            pending = []
            if case == 'late-mask-after-switch':
                context.route('**/hair-visibility-mask.png*', lambda route: pending.append(route))
            page.goto('http://127.0.0.1:5178/qa/v652/runtime-preview/index.html?' + urlencode(params), wait_until='domcontentloaded')
            avatar = page.locator('.avatar-renderer.avatar-brother')
            avatar.wait_for()
            if case in ['paired-ready', 'skin-error-after-ready', 'skin-rewear']:
                page.wait_for_function("() => document.querySelector('.avatar-brother').dataset.runtimeDetail === 'hat-mage'")
            if case in ['skin-error-after-ready', 'skin-rewear']:
                avatar.locator('.avatar-renderer-skin').evaluate("img => img.dispatchEvent(new Event('error'))")
            if case in ['skin-404', 'skin-error-after-ready', 'skin-rewear']:
                page.wait_for_function("() => document.querySelector('.avatar-brother .avatar-renderer-skin').src.includes('/wardrobe/base-body.webp')")
            page.wait_for_timeout(700)
            if case == 'skin-rewear':
                page.locator('[data-qa-skin="outfit-cadet"]').click()
                page.wait_for_function("() => document.querySelector('.avatar-brother').dataset.skin === 'outfit-cadet'")
                page.locator('[data-qa-skin="outfit-racer"]').click()
            if case in ['mask-retry', 'overlay-retry']:
                context.unroute('**/hair-visibility-mask.png*' if case == 'mask-retry' else '**/hat-mage-overlay.png*')
                page.locator('[data-qa-retry]').click()
            if case == 'late-mask-after-switch':
                assert pending, 'fixture must actually delay the old mask'
                page.locator('[data-qa-skin="outfit-cadet"]').click()
                for route in pending:
                    route.fulfill(path=str(ROOT / params['detailMask']))
            if case in ['skin-rewear', 'mask-retry', 'overlay-retry']:
                page.wait_for_function("() => document.querySelector('.avatar-brother').dataset.runtimeDetail === 'hat-mage'")
            page.wait_for_timeout(300)
            state = avatar.evaluate("""e => ({detail:e.dataset.runtimeDetail || null,
              mask:e.querySelector('.avatar-renderer-skin').style.maskImage,
              src:e.querySelector('.avatar-renderer-skin').getAttribute('src')})""")
            if case in ['paired-ready', 'skin-rewear', 'mask-retry', 'overlay-retry']:
                assert state['detail'] == 'hat-mage' and params['detailMask'] in state['mask'], state
            else:
                assert state['detail'] is None and state['mask'] in ('', 'none'), (case, state)
            results.append(dict(case=case, status='PASS', **state))
            context.close()
        browser.close()
    report = dict(status='PASS', scope='delivery/failure fixture only, not visual outfit acceptance', cases=results)
    (OUT/'report.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
