"""Additional headroom delivery mechanisms; hero record is explicitly synthetic QA."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
MASK = 'qa/v652/sol/mage-brother-technical-mask-r1/hair-visibility-mask.png'
HERO = '**/assets/v6.4/hero-composites/brother/hat-ocean.webp'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--attempt', required=True)
    args = parser.parse_args()
    assert args.attempt.replace('-', '').isalnum()
    out = ROOT / 'qa/v652' / args.attempt
    out.mkdir(exist_ok=False)
    results = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        try:
            for case in ['hero-ready', 'hero-404', 'blink', 'reduced-blink', 'mask-retry', 're-equip']:
                row = {'case':case, 'status':'RUNNING'}; results.append(row)
                context = browser.new_context(reduced_motion='no-preference' if case == 'blink' else 'reduce')
                context.route('**/api/**', lambda route: route.abort())
                params = {'mask':MASK} if case not in ['hero-ready','hero-404'] else {'heroTest':'1'}
                if case in ['blink','reduced-blink']: params['greet'] = '1'
                if case == 'hero-ready': context.route(HERO, lambda route: route.fulfill(path=str(ROOT/'public/assets/v5/characters/brother/wardrobe/base-body.webp')))
                if case == 'hero-404': context.route(HERO, lambda route: route.fulfill(status=404, body='fixture'))
                if case == 'mask-retry': context.route('**/'+MASK+'*', lambda route: route.fulfill(status=404, body='fixture'))
                page = context.new_page(); errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto('http://127.0.0.1:5178/qa/v652/headroom-preview/index.html?'+urlencode(params), wait_until='domcontentloaded')
                avatar = page.locator('.avatar-renderer'); avatar.wait_for()
                if case == 'hero-ready':
                    page.wait_for_function("() => document.querySelector('.avatar-renderer').dataset.artMode === 'accepted-hero' && document.querySelector('.avatar-renderer-skin').naturalWidth > 0")
                    assert not avatar.get_attribute('data-canvas-top-padding')
                    assert avatar.locator('[data-wearable-item]').count() == 0
                else:
                    if case == 'mask-retry':
                        page.wait_for_timeout(650)
                        assert not avatar.get_attribute('data-canvas-top-padding')
                        context.unroute('**/'+MASK+'*')
                        page.locator('[data-qa-retry]').click()
                    page.wait_for_function("() => document.querySelector('.avatar-renderer').dataset.canvasTopPadding === '256'")
                    if case == 'hero-404': assert avatar.get_attribute('data-art-mode') == 'runtime'
                    else:
                        skin = avatar.locator('.avatar-renderer-skin')
                        expected = '/'+MASK+('?previewRetry=1' if case == 'mask-retry' else '')
                        assert skin.evaluate('(e,p)=>e.style.maskImage === `url("${p}")`', expected)
                    if case == 're-equip':
                        page.locator('[data-qa-skin="outfit-cadet"]').click()
                        page.wait_for_function("() => !document.querySelector('.avatar-renderer').dataset.canvasTopPadding")
                        assert avatar.locator('.avatar-renderer-skin').evaluate('e=>!e.style.maskImage')
                        page.locator('[data-qa-base]').click()
                        page.wait_for_function("() => document.querySelector('.avatar-renderer').dataset.canvasTopPadding === '256'")
                        assert avatar.locator('.avatar-renderer-skin').evaluate('(e,p)=>e.style.maskImage === `url("${p}")`','/'+MASK)
                    if case == 'blink':
                        page.wait_for_function("() => !!document.querySelector('[data-character-motion=blink]')")
                        evidence = avatar.evaluate('''e=>{const a=e.querySelector('.avatar-renderer-skin'),b=e.querySelector('.avatar-renderer-blink-frame');const rect=n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height]};return {body:rect(a),blink:rect(b),bodyMask:a.style.maskImage,blinkMask:b.style.maskImage};}''')
                        assert evidence['body'] == evidence['blink'] and evidence['bodyMask'] == evidence['blinkMask']
                        row['evidence'] = evidence
                    if case == 'reduced-blink':
                        page.wait_for_timeout(1600)
                        assert avatar.locator('[data-character-motion=blink]').count() == 0
                assert not errors, errors
                row['status'] = 'PASS'; context.close()
        except Exception as error:
            results[-1].update(status='FAIL', error=str(error)); raise
        finally:
            browser.close()
            (out/'report.json').write_text(json.dumps({'scope':'synthetic hero mechanism, real blink/mask delivery; not artwork acceptance', 'cases':results},indent=2)+'\n')
    print(json.dumps({'status':'PASS','cases':len(results),'output':str(out)}))

if __name__ == '__main__': main()
