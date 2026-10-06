"""Actual role-specific hair/headwear captures; no production state or artwork edits."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--candidate', required=True)
parser.add_argument('--attempt', required=True)
parser.add_argument('--skins', default='default,outfit-racer')
args = parser.parse_args()
candidate_path = ROOT / args.candidate
manifest = json.loads(candidate_path.read_text())
hair_ids = [r['id'] for r in manifest['accessories'] if r['slot'] == 'hair']
hat_ids = [r['id'] for r in manifest['accessories'] if r['slot'] == 'headwear']
OUT = ROOT / 'qa/v653/20261005/hair' / args.attempt
OUT.mkdir(parents=True, exist_ok=False)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
sources = ['src/components/AvatarRenderer.tsx', 'src/avatarAssetRegistry.ts', 'src/useAvatarDetailReadiness.ts']
pins = {p: sha(ROOT / p) for p in sources}
report = {'status': 'RUNNING', 'candidateManifestSha256': sha(candidate_path), 'sourcePins': pins,
          'rows': [], 'visualAcceptance': 'PENDING_ACTUAL_REVIEW', 'realFamilyData': 'NOT_USED'}
save = lambda: (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    context = browser.new_context(viewport={'width': 1960, 'height': 820}, reduced_motion='reduce', service_workers='block')
    context.route('**/api/**', lambda route: route.abort())
    context.route('**/src/data/avatarAssetManifest.json*', lambda route: route.fulfill(
        content_type='text/javascript', body='export default ' + json.dumps(manifest) + ';'))
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    for skin in args.skins.split(','):
        for hair in hair_ids:
            for hat in hat_ids:
                query = urlencode({'skin': '' if skin == 'default' else skin, 'items': f'{hair},{hat}', 'size': 460})
                page.goto('http://127.0.0.1:5178/qa/v653/20261005/wearables/index.html?' + query)
                page.wait_for_function('''ids=>document.querySelectorAll('.avatar-renderer').length===4 &&
                  [...document.querySelectorAll('.avatar-renderer')].every(e=>ids.every(id=>(e.dataset.renderedItems||'').split(' ').includes(id)))''', arg=[hair, hat])
                page.locator('main').evaluate('''async e=>{await Promise.all([...e.querySelectorAll('img')].map(i=>i.decode()));
                  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}''')
                assert not errors and not page.locator('main').get_attribute('data-failures'), errors
                for article in page.locator('article[data-review-avatar]').all():
                    role = article.get_attribute('data-review-avatar')
                    renderer = article.locator('.avatar-renderer')
                    proof = renderer.evaluate('''e=>({rendered:e.dataset.renderedItems,
                      images:[...e.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),width:i.naturalWidth,height:i.naturalHeight,
                      mask:i.style.maskImage,rect:i.getBoundingClientRect().toJSON()}))})''')
                    shot = OUT / f'{skin}--{hair}--{hat}--{role}.png'
                    renderer.screenshot(path=str(shot), animations='disabled')
                    report['rows'].append({'avatar': role, 'skin': skin, 'itemId': hair, 'headwearId': hat,
                                           'proof': proof, 'screenshot': str(shot.relative_to(ROOT)),
                                           'screenshotSha256': sha(shot), 'status': 'CAPTURED_PENDING_VISUAL'})
                assert pins == {p: sha(ROOT / p) for p in sources}, 'source changed'
                save()
                print(skin, hair, hat, len(report['rows']), flush=True)
    browser.close()
report['status'] = 'CAPTURED_PENDING_ACTUAL_VISUAL_REVIEW'
save()
