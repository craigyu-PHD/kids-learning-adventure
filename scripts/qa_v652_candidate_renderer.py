"""Real AvatarRenderer capture; optional QA-only asset interception, no promotion."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--attempt', required=True)
    parser.add_argument('--items', required=True)
    parser.add_argument('--skin')
    parser.add_argument('--headwear', help='Additional hat/hair item for real combination QA')
    parser.add_argument('--detail-avatar', choices=['brother', 'younger', 'sister', 'younger-sister'])
    parser.add_argument('--detail-overlay', type=Path)
    parser.add_argument('--detail-mask', type=Path)
    parser.add_argument('--mapping', type=Path, help='JSON object: observed public path to QA candidate path')
    parser.add_argument('--require-all-avatar-overrides', action='store_true', help='Reject partial candidate matrices; each rendered avatar must actually fetch the mapped item overlay')
    args = parser.parse_args()
    detail_params = {}
    detail_evidence = []
    if any((args.detail_avatar, args.detail_overlay, args.detail_mask)):
        if not all((args.detail_avatar, args.detail_overlay, args.detail_mask)) or ',' in args.items:
            parser.error('detail pair requires one item, avatar, overlay and mask')
        detail_params['detailAvatar'] = args.detail_avatar
        for key, candidate in [('detailOverlay', args.detail_overlay), ('detailMask', args.detail_mask)]:
            path = (ROOT / candidate).resolve()
            if not path.is_relative_to(ROOT / 'qa/v652') or not path.is_file() or path.suffix not in ('.png', '.webp'):
                parser.error('detail source must be an existing QA image')
            detail_params[key] = str(path.relative_to(ROOT))
            detail_evidence.append({'role': key, 'path': str(path.relative_to(ROOT)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    if not args.attempt.replace('-', '').replace('_', '').isalnum():
        raise ValueError('invalid attempt ID')
    out = ROOT / 'qa/v652/runtime-preview' / args.attempt
    out.mkdir(exist_ok=False)
    mapping = json.loads(args.mapping.read_text()) if args.mapping else {}
    if args.require_all_avatar_overrides and not mapping:
        raise ValueError('all-avatar override check requires a mapping')
    fulfilled = set()
    evidence = {'mode': 'candidate-intercept' if mapping else 'current-source', 'skin': args.skin, 'headwear': args.headwear, 'screenshots': [], 'overrides': []}
    if detail_params:
        evidence.update(mode='qa-in-memory-detail-pair', detailAvatar=args.detail_avatar, detailSources=detail_evidence)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        context = browser.new_context(viewport={'width':1512, 'height':982}, reduced_motion='reduce')
        context.route('**/api/**', lambda route: route.abort())
        for source, target in mapping.items():
            path = (ROOT / target).resolve()
            if not path.is_relative_to(ROOT / 'qa/v652') or not path.is_file():
                raise ValueError(f'candidate outside QA: {target}')
            if not source.startswith('public/assets/'):
                raise ValueError(f'not an asset: {source}')
            def serve_candidate(route, request, path=path, source=source):
                route.fulfill(path=str(path))
                fulfilled.add(source)
            context.route('**/' + source.removeprefix('public/'), serve_candidate)
            evidence['overrides'].append({'source':source, 'candidate':target, 'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
        page = context.new_page()
        params = {'items':args.items, **({'skin':args.skin} if args.skin else {}), **({'headwear':args.headwear} if args.headwear else {}), **detail_params}
        page.goto('http://127.0.0.1:5178/qa/v652/runtime-preview/index.html?' + urlencode(params))
        page.locator('[data-review-item]').first.wait_for()
        page.wait_for_function('''() => [...document.images].length > 0 && [...document.images].every(i=>i.complete && i.naturalWidth>0)''')
        page.wait_for_timeout(400)
        if detail_params:
            evidence['decodedDetailPair'] = page.evaluate('''async p => {
              const rows = [];
              for (const role of ['detailOverlay', 'detailMask']) {
                const img = new Image(); img.src = '/' + p[role];
                await img.decode();
                if (img.naturalWidth !== 1024 || img.naturalHeight !== 1536) throw new Error('QA pair dimensions must be 1024x1536');
                rows.push({role, src: img.getAttribute('src'), width: img.naturalWidth, height: img.naturalHeight, decoded: true});
              }
              return rows;
            }''', detail_params)
            page.wait_for_function('''p => [...document.querySelectorAll('.avatar-renderer')].some(e =>
              [...e.querySelectorAll('img')].some(i => i.getAttribute('src') === '/' + p.detailOverlay && i.complete && i.naturalWidth > 0)
              && [...e.querySelectorAll('[style]')].some(n => n.style.maskImage.includes('/' + p.detailMask)))''', arg=detail_params)
        for section in page.locator('[data-review-item]').all():
            section.scroll_into_view_if_needed()
            section.evaluate('''async e => { await Promise.all([...e.querySelectorAll('img')].map(i=>i.decode())); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); }''')
            page.wait_for_timeout(150)
            item = section.get_attribute('data-review-item')
            shot = out / f'{item}.png'
            section.screenshot(path=str(shot), animations='disabled')
            rows = section.locator('.avatar-renderer').evaluate_all('''els=>els.map(e=>({avatar:e.className, rendered:e.dataset.renderedItems, detail:e.dataset.runtimeDetail, images:[...e.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),mask:i.style.maskImage,complete:i.complete,width:i.naturalWidth}))}))''')
            assert len(rows) == 4 and all(item in row['rendered'].split() for row in rows), rows
            if detail_params:
                matched = [row for row in rows if any(img['src'] == '/' + detail_params['detailOverlay'] for img in row['images'])]
                assert len(matched) == 1, 'detail pair must apply to exactly one avatar'
                assert 'avatar-' + args.detail_avatar in matched[0]['avatar'].split(), 'detail pair applied to wrong avatar'
                assert any('/' + detail_params['detailMask'] in img['mask'] for img in matched[0]['images']), 'paired hair mask not active on base image'
            if args.require_all_avatar_overrides:
                for row in rows:
                    item_paths = ['public' + urlsplit(img['src']).path for img in row['images']
                                  if Path(urlsplit(img['src']).path).stem == item
                                  or Path(urlsplit(img['src']).path).stem.startswith(item + '--')]
                    assert item_paths and all(path in fulfilled for path in item_paths), f'Candidate coverage missing: {item}/{row["avatar"]}: {item_paths}'
            if args.headwear:
                assert all(args.headwear in row['rendered'].split() for row in rows), rows
            evidence['screenshots'].append({'item':item,'path':str(shot.relative_to(ROOT)), 'sha256':hashlib.sha256(shot.read_bytes()).hexdigest(), 'rows':rows})
        browser.close()
    evidence['status'] = 'CAPTURED_AWAITING_VISUAL_REVIEW'
    evidence['fulfilledOverrides'] = sorted(fulfilled)
    evidence['requiredAllAvatarOverrides'] = args.require_all_avatar_overrides
    (out / 'report.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'status':evidence['status'],'output':str(out),'count':len(evidence['screenshots'])}))


if __name__ == '__main__':
    main()
