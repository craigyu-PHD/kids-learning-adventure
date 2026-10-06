"""Actual Renderer review captures using a context-only candidate manifest."""
from pathlib import Path
import argparse
import hashlib
import json
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--attempt', required=True)
parser.add_argument('--skins', default='default')
parser.add_argument('--hats', default='none,hat-crown')
args = parser.parse_args()
candidate = ROOT / 'qa/v653/20261005/hair/uncrowned-r1/candidate-manifest.json'
manifest = json.loads(candidate.read_text())
supported = {r['id'] for r in manifest['accessories'] if r['slot'] == 'headwear'}
assert set(args.hats.split(',')) <= supported | {'none'}, 'Use actual current item IDs only'
out = ROOT / 'qa/v653/20261005/hair' / args.attempt
out.mkdir(parents=True, exist_ok=False)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
source_files = ['src/avatarAssetRegistry.ts', 'src/components/AvatarRenderer.tsx', 'src/App.tsx']
report = {'status': 'RUNNING', 'candidateManifestSha256': sha(candidate),
          'sourcePins': {p: sha(ROOT / p) for p in source_files}, 'rows': [],
          'cloudAccess': 'BLOCKED', 'visualAcceptance': 'PENDING_ACTUAL_REVIEW'}
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    context = browser.new_context(viewport={'width': 1960, 'height': 820}, reduced_motion='reduce')
    context.route('**/api/**', lambda route: route.abort())
    context.route('**/src/data/avatarAssetManifest.json*', lambda route: route.fulfill(
        status=200, content_type='text/javascript', body='export default ' + json.dumps(manifest) + ';'))
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    for skin in args.skins.split(','):
        for hat in args.hats.split(','):
            items = ['hair-legend'] + ([] if hat == 'none' else [hat])
            query = urlencode({'skin': '' if skin == 'default' else skin, 'items': ','.join(items), 'size': 460})
            page.goto('http://127.0.0.1:5178/qa/v653/20261005/wearables/index.html?' + query)
            page.wait_for_function('''items => document.querySelectorAll('.avatar-renderer').length === 4 &&
              [...document.querySelectorAll('.avatar-renderer')].every(e=> items.every(id=>(e.dataset.renderedItems||'').split(' ').includes(id)))''', arg=items)
            page.locator('main').evaluate('''async e=>{await Promise.all([...e.querySelectorAll('img')].map(i=>i.decode()));
              await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}''')
            assert not page.locator('main').get_attribute('data-failures')
            assert not errors, errors
            shot = out / f'{skin}--{hat}.png'
            page.locator('main').screenshot(path=str(shot))
            dom = page.locator('.avatar-renderer').evaluate_all('''els=>els.map(e=>({avatar:e.className,rendered:e.dataset.renderedItems,
                body:[...e.querySelectorAll('img.avatar-renderer-skin')].map(i=>({src:i.getAttribute('src'),rect:i.getBoundingClientRect().toJSON()})),
                details:e.dataset.runtimeDetails, images:[...e.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),width:i.naturalWidth,height:i.naturalHeight,mask:i.style.maskImage}))}))''')
            report['rows'].append({'skin': skin, 'hat': hat, 'items': items, 'screenshot': str(shot.relative_to(ROOT)),
                                   'sha256': sha(shot), 'dom': dom, 'status': 'CAPTURED_AWAITING_VISUAL_REVIEW'})
            (out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
            print(skin, hat, flush=True)
    browser.close()
assert report['sourcePins'] == {p: sha(ROOT / p) for p in source_files}
report['status'] = 'CAPTURED_AWAITING_VISUAL_REVIEW'
(out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
