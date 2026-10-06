"""Actual browser controls for one item: hair-legend with separate headwear.

Wrong-role and altered bytes must fail candidate admission. A missing detail
must also notify the Renderer caller and keep the incomplete item invisible.
All mutations stay in the isolated browser context; no product files change.
"""
import copy
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--attempt', required=True)
parser.add_argument('--candidate', default='qa/v653/20261005/wearables/combined-candidate-r1/candidate-avatar-manifest.json')
args = parser.parse_args()
CANDIDATE = ROOT / args.candidate
OUT = ROOT / 'qa/v653/20261005/hair' / args.attempt
OUT.mkdir(parents=True, exist_ok=False)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
manifest = json.loads(CANDIDATE.read_text())
hair = next(r for r in manifest['accessories'] if r['id'] == 'hair-legend')
path = hair['headwearHairDetails']['brother']['default']['overlay']
url = '/' + path.removeprefix('public/')
expected_sha = sha(ROOT / path)
source_paths = ['src/components/AvatarRenderer.tsx', 'src/avatarAssetRegistry.ts', 'src/useAvatarDetailReadiness.ts']
pins = {p: sha(ROOT / p) for p in source_paths}
report = {'status': 'RUNNING', 'itemId': 'hair-legend', 'avatarId': 'brother',
          'candidateSha256': sha(CANDIDATE), 'sourcePins': pins, 'rows': [],
          'scope': 'actual Renderer and browser-byte candidate admission; no family APIs'}
save = lambda: (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    for mode in ['baseline', 'wrong-avatar', 'missing-layer', 'swapped-item', 'stale-candidate']:
        context = browser.new_context(viewport={'width': 520, 'height': 840}, reduced_motion='reduce', service_workers='block')
        context.route('**/api/**', lambda route: route.abort())
        current = copy.deepcopy(manifest)
        if mode == 'wrong-avatar':
            current_hair = next(r for r in current['accessories'] if r['id'] == 'hair-legend')
            current_hair['headwearHairDetails']['brother']['default'] = copy.deepcopy(hair['headwearHairDetails']['sister']['default'])
        if mode == 'missing-layer':
            context.route('**' + url, lambda route: route.fulfill(status=404, body='isolated missing hair detail'))
        elif mode in ['swapped-item', 'stale-candidate']:
            wrong_path = (next(r for r in manifest['accessories'] if r['id'] == 'phones-legend')['frontVariants']['brother'] if mode == 'swapped-item'
                          else hair['defaultSkinDetails']['brother']['overlay'])
            data = (ROOT / wrong_path).read_bytes()
            context.route('**' + url, lambda route: route.fulfill(status=200, content_type='image/png', body=data))
        context.route('**/src/data/avatarAssetManifest.json*', lambda route: route.fulfill(
            status=200, content_type='text/javascript', body='export default ' + json.dumps(current) + ';'))
        page = context.new_page()
        query = urlencode({'avatar': 'brother', 'items': 'hair-legend,hat-crown', 'size': 460})
        page.goto('http://127.0.0.1:5178/qa/v653/20261005/wearables/index.html?' + query)
        page.locator('.avatar-renderer').wait_for()
        if mode == 'missing-layer':
            page.wait_for_function("document.querySelector('main').dataset.failures.includes('brother:wearable')")
        else:
            page.wait_for_function("document.querySelector('.avatar-renderer').dataset.renderedItems.includes('hair-legend')")
        observed = page.locator('.avatar-renderer').evaluate('''e=>({rendered:e.dataset.renderedItems,
          srcs:[...e.querySelectorAll('img')].map(i=>i.getAttribute('src'))})''')
        failures = page.locator('main').get_attribute('data-failures')
        byte_result = page.evaluate('''async url=>{const r=await fetch(url,{cache:'no-store'});const b=await r.arrayBuffer();
          const h=await crypto.subtle.digest('SHA-256',b);return {status:r.status,sha256:[...new Uint8Array(h)].map(v=>v.toString(16).padStart(2,'0')).join('')};}''', url)
        reasons = []
        if url not in observed['srcs']:
            reasons.append('EXACT_ROLE_DETAIL_PATH_MISMATCH')
        if byte_result['status'] != 200 or byte_result['sha256'] != expected_sha:
            reasons.append('EXACT_CANDIDATE_BROWSER_BYTES_MISMATCH')
        if mode == 'baseline':
            assert not reasons and not failures, (reasons, failures)
        else:
            assert reasons, f'negative incorrectly admitted: {mode}'
            if mode == 'missing-layer':
                assert 'brother:wearable' in failures
                assert 'hair-legend' not in observed['rendered'].split(), observed
        shot = OUT / f'{mode}.png'
        page.locator('main').screenshot(path=str(shot))
        report['rows'].append({'mode': mode, 'status': 'PASS' if mode == 'baseline' else 'PASS_NEGATIVE_REJECTED',
                               'observed': observed, 'rendererFailures': failures, 'browserBytes': byte_result,
                               'expectedSha256': expected_sha, 'admissionFailureReasons': reasons,
                               'screenshot': str(shot.relative_to(ROOT)), 'screenshotSha256': sha(shot)})
        save()
        context.close()
    browser.close()
assert pins == {p: sha(ROOT / p) for p in source_paths}, 'source changed during candidate gate'
report['status'] = 'PASS_BASELINE_AND_4_NEGATIVE_CONTROLS'
save()
print(report['status'])
