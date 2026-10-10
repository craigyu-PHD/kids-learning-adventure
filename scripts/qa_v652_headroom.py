"""Isolated opt-in geometry/delivery checks, never family data or release approval."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OVERLAY = 'qa/v652/ocean-headroom-proof-r1/hat-ocean-overlay.png'
MASK = 'qa/v652/sol/mage-brother-technical-mask-r1/hair-visibility-mask.png'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--attempt', required=True)
    args = parser.parse_args()
    assert args.attempt.replace('-', '').isalnum()
    out = ROOT / 'qa/v652' / args.attempt
    out.mkdir(exist_ok=False)
    results = []
    cases = ['square', 'wide', 'narrow', 'mobile', 'parent-scale', 'mixed', 'cadet', 'mask-ready',
             'overlay-404', 'mask-404', 'wrong-overlay-size', 'wrong-mask-size',
             'padding-negative', 'padding-unsupported', 'padding-nan',
             'ready-error', 'retry', 'skin-switch', 'skin-error', 'late-after-toggle']
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        try:
            for case in cases:
                row = {'case': case, 'status': 'RUNNING'}
                results.append(row)
                params = {}
                if case == 'wide': params.update(width=400, height=200)
                if case == 'narrow': params.update(width=120, height=330)
                if case == 'parent-scale': params['stageScale'] = '.8'
                if case == 'mixed': params['extra'] = 'glasses-racer,phones-ai,pack-rocket,effect-stars'
                if case in ['cadet', 'skin-error']: params['skin'] = 'outfit-cadet'
                if case in ['mask-ready', 'mask-404', 'wrong-mask-size']: params['mask'] = MASK
                if case == 'wrong-overlay-size': params['overlay'] = 'qa/v652/sol/hat-ocean-complete-brother-base-fit-r1/hat-ocean-overlay.png'
                if case == 'wrong-mask-size': params['mask'] = OVERLAY
                if case == 'padding-negative': params['padding'] = -1
                if case == 'padding-unsupported': params['padding'] = 128
                if case == 'padding-nan': params['padding'] = 'NaN'
                context = browser.new_context(viewport={'width': 390 if case == 'mobile' else 1512, 'height': 982}, reduced_motion='reduce')
                context.route('**/api/**', lambda route: route.abort())
                if case in ['overlay-404', 'retry']:
                    context.route('**/' + OVERLAY + '*', lambda route: route.fulfill(status=404, body='fixture'))
                if case == 'mask-404': context.route('**/' + MASK + '*', lambda route: route.fulfill(status=404, body='fixture'))
                pending = []
                if case == 'late-after-toggle': context.route('**/' + OVERLAY + '*', lambda route: pending.append(route))
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto('http://127.0.0.1:5178/qa/v652/headroom-preview/index.html?' + urlencode(params), wait_until='domcontentloaded')
                avatar = page.locator('.avatar-renderer')
                avatar.wait_for()
                rejected = case in ['overlay-404', 'mask-404', 'wrong-overlay-size', 'wrong-mask-size', 'padding-negative', 'padding-unsupported', 'padding-nan', 'retry', 'late-after-toggle']
                if not rejected:
                    page.wait_for_function("() => document.querySelector('.avatar-renderer').dataset.canvasTopPadding === '256'")
                else:
                    page.wait_for_timeout(600)
                    assert avatar.get_attribute('data-canvas-top-padding') in [None, '0']
                if case == 'retry':
                    context.unroute('**/' + OVERLAY + '*')
                    page.locator('[data-qa-retry]').click()
                    page.wait_for_function("() => document.querySelector('.avatar-renderer').dataset.canvasTopPadding === '256'")
                    assert 'previewRetry=1' in avatar.locator('[data-wearable-item="hat-ocean"]').get_attribute('src')
                    rejected = False
                if case == 'late-after-toggle':
                    page.locator('[data-qa-toggle]').click()
                    for route in pending: route.fulfill(path=str(ROOT / OVERLAY))
                    page.wait_for_timeout(300)
                    assert avatar.get_attribute('data-canvas-top-padding') in [None, '0']
                if case in ['ready-error', 'skin-switch', 'skin-error']:
                    if case == 'ready-error': avatar.locator('[data-wearable-item="hat-ocean"]').dispatch_event('error')
                    elif case == 'skin-error': avatar.locator('.avatar-renderer-skin').dispatch_event('error')
                    else: page.locator('[data-qa-skin="outfit-cadet"]').click()
                    page.wait_for_function("() => !Number(document.querySelector('.avatar-renderer').dataset.canvasTopPadding)")
                    rejected = True
                if not rejected:
                    page.wait_for_function('''() => [...document.images].every(i => i.complete && i.naturalWidth > 0)''')
                    geom = avatar.evaluate('''e => {
                      const rect = n => {const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
                      return {outer:rect(e),skin:rect(e.querySelector('.avatar-renderer-skin')),hat:rect(e.querySelector('[data-wearable-item="hat-ocean"]')),
                        ordinary:[...e.querySelectorAll('[data-wearable-item]:not([data-wearable-item="hat-ocean"])')].map(i=>({id:i.dataset.wearableItem,...rect(i)})),
                        effect:e.querySelector('.v64-effect-art') ? {opacity:getComputedStyle(e.querySelector('.v64-effect-art')).opacity,...rect(e.querySelector('.v64-effect-art'))}:null};
                    }''')
                    outer, body, hat = geom['outer'], geom['skin'], geom['hat']
                    k = min(outer['w'] / 1024, outer['h'] / 1792)
                    close = lambda a, b: abs(a - b) < .15
                    assert close(hat['w'], 1024*k) and close(hat['h'], 1792*k), geom
                    assert close(body['x'], hat['x']) and close(body['y'], hat['y']+256*k), geom
                    assert close(body['w'], 1024*k) and close(body['h'], 1536*k), geom
                    assert hat['x'] >= outer['x']-.1 and hat['y'] >= outer['y']-.1, geom
                    assert hat['x']+hat['w'] <= outer['x']+outer['w']+.1 and hat['y']+hat['h'] <= outer['y']+outer['h']+.1, geom
                    for layer in geom['ordinary']:
                        assert all(close(layer[key], body[key]) for key in ['x','y','w','h']), geom
                    if case == 'mixed':
                        assert {'glasses-racer','phones-ai','pack-rocket'} <= {i['id'] for i in geom['ordinary']}, geom
                        assert geom['effect'] and float(geom['effect']['opacity']) > 0, geom
                        assert all(close(geom['effect'][key], body[key]) for key in ['x','y','w','h']), geom
                    row['geometry'] = geom
                    shot = out / (case + '.png')
                    page.locator('[data-qa-stage]').screenshot(path=str(shot), animations='disabled')
                    row['screenshot'] = {'path': str(shot.relative_to(ROOT)), 'sha256': hashlib.sha256(shot.read_bytes()).hexdigest()}
                assert not errors, errors
                row['status'] = 'PASS'
                context.close()
        except Exception as error:
            results[-1].update(status='FAIL', error=str(error))
            raise
        finally:
            browser.close()
            (out / 'report.json').write_text(json.dumps({'scope':'isolated geometry and delivery only; visual acceptance separate', 'cases':results}, indent=2)+'\n')
    print(json.dumps({'status':'PASS', 'cases':len(results), 'output':str(out)}))

if __name__ == '__main__':
    main()
