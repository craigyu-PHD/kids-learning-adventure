"""Capture isolated real AvatarRenderer; images are evidence, never automatic art PASS.

python3 scripts/qa_v653_wearable_capture.py --attempt baseline --limit 12
The local Vite server and its complete source tree must already be available.
"""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'qa/v653/20261005/wearables'
AVATARS = ['brother', 'younger', 'sister', 'younger-sister']


def cases(manifest):
    by_slot = {slot: [a['id'] for a in manifest['accessories'] if a['slot'] == slot]
               for slot in ['hair', 'headwear', 'face', 'earwear']}
    outfits = ['', *sorted({s['skinId'] for s in manifest['skins']} - {'default'})]
    rows = []
    for skin in outfits:
        rows.append({'id': f'{skin or "default"}--base', 'skin': skin, 'items': []})
        for hair in by_slot['hair']:
            rows.append({'id': f'{skin or "default"}--{hair}', 'skin': skin, 'items': [hair]})
    for index, hat in enumerate(by_slot['headwear']):
        for hair in by_slot['hair']:
            rows.append({'id': f'default--{hair}--{hat}', 'skin': '', 'items': [hair, hat]})
        for skin in outfits:
            rows.append({'id': f'{skin or "default"}--full-mix--{hat}', 'skin': skin,
                         'items': [by_slot['hair'][index % len(by_slot['hair'])], hat,
                                   by_slot['face'][index % len(by_slot['face'])],
                                   by_slot['earwear'][index % len(by_slot['earwear'])]]})
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--attempt', required=True)
    parser.add_argument('--url', default='http://127.0.0.1:5178')
    parser.add_argument('--limit', type=int)
    parser.add_argument('--offset', type=int, default=0)
    parser.add_argument('--filter', default='')
    parser.add_argument('--theme', choices=['light', 'dark'], default='light')
    parser.add_argument('--plan-only', action='store_true')
    args = parser.parse_args()
    assert args.attempt.replace('-', '').replace('_', '').isalnum()
    out = EVIDENCE / args.attempt
    out.mkdir(parents=True, exist_ok=False)
    manifest_path = ROOT / 'src/data/avatarAssetManifest.json'
    manifest_bytes = manifest_path.read_bytes()
    all_rows = cases(json.loads(manifest_bytes))
    rows = [row for row in all_rows if args.filter in row['id']][args.offset:]
    if args.limit is not None:
        rows = rows[:args.limit]
    report = {'status': 'PLANNED', 'manifest_sha256': hashlib.sha256(manifest_bytes).hexdigest(),
              'coverage': 'selected combinations, four avatars per row',
              'total_matrix_rows': len(all_rows), 'selected_rows': len(rows), 'rows': rows,
              'visual_review': 'NOT_PERFORMED'}
    (out / 'plan.json').write_text(json.dumps(report, indent=2) + '\n')
    if args.plan_only:
        print(json.dumps({'output': str(out), 'rows': len(rows), 'avatars': len(rows) * 4}))
        return
    from playwright.sync_api import sync_playwright
    captures = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        context = browser.new_context(viewport={'width': 2000, 'height': 720}, reduced_motion='reduce', color_scheme=args.theme)
        context.route('**/api/**', lambda route: route.abort())
        page = context.new_page()
        page.set_default_timeout(20000)
        for row in rows:
            capture = dict(row, status='PENDING')
            errors = []
            listener = lambda error: errors.append(str(error))
            page.on('pageerror', listener)
            try:
                query = urlencode({'items': ','.join(row['items']), 'skin': row['skin'], 'theme': args.theme})
                page.goto(args.url + '/qa/v653/20261005/wearables/index.html?' + query, timeout=20000)
                page.locator('[data-review-ready]').wait_for()
                page.wait_for_function('''() => [...document.querySelectorAll('.avatar-renderer')].length === 4
                  && [...document.querySelectorAll('.avatar-renderer img')].every(i=>i.complete&&i.naturalWidth>0)''')
                page.wait_for_function('''items => [...document.querySelectorAll('.avatar-renderer')].every(e =>
                  items.every(id => (e.dataset.renderedItems || '').split(' ').includes(id)))''', arg=row['items'])
                page.locator('main').evaluate('''async e=>{await Promise.all([...e.querySelectorAll('img')].map(i=>i.decode()));
                  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}''')
                failures = page.locator('main').get_attribute('data-failures')
                assert not failures, failures
                capture['avatars'] = page.locator('.avatar-renderer').evaluate_all('''els=>els.map(e=>({className:e.className,
                  rendered:e.dataset.renderedItems,details:e.dataset.runtimeDetails,rig:e.dataset.rigScene,
                  rect:{width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height},
                  images:[...e.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),mask:i.style.maskImage,
                    visible:getComputedStyle(i).visibility,width:i.naturalWidth,height:i.naturalHeight}))}))''')
                shot = out / (row['id'] + '.png')
                page.locator('main').screenshot(path=str(shot), animations='disabled')
                capture.update(status='CAPTURED_AWAITING_VISUAL_REVIEW', screenshot=str(shot), screenshot_sha256=hashlib.sha256(shot.read_bytes()).hexdigest())
            except Exception as exc:
                capture.update(status='CAPTURE_FAILED', error=str(exc))
            finally:
                page.remove_listener('pageerror', listener)
                capture['page_errors'] = errors
                captures.append(capture)
                (out / 'captures.json').write_text(json.dumps(captures, indent=2) + '\n')
                print(json.dumps({'id': row['id'], 'status': capture['status']}), flush=True)
            if capture['status'] == 'CAPTURE_FAILED':
                break
        browser.close()
    report['status'] = 'CAPTURED_AWAITING_VISUAL_REVIEW' if len(captures) == len(rows) and all(c['status'].startswith('CAPTURED') for c in captures) else 'BLOCKED'
    report['captures'] = len(captures)
    (out / 'summary.json').write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
