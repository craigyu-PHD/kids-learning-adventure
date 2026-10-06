"""Local integrated catalog/try-on check. No asset interception or purchases."""
import argparse
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from qa_v65_feedback_home import seed, route_time

ROOT = Path(__file__).resolve().parents[1]
ITEMS = ['starter-sky-glasses', 'sky-view-glasses', 'glasses-racer',
         'glasses-star', 'glasses-holo', 'glasses-legend', 'sister-heart-glasses']
HEADPHONES = ['starter-buddy-headphones', 'phones-legend', 'phones-sky',
              'phones-racer', 'sister-cat-headphones', 'story-headphones', 'phones-ai']


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--attempt', required=True)
    parser.add_argument('--category', choices=['glasses', 'headphones', 'crown', 'ocean'], default='glasses')
    args = parser.parse_args()
    if not args.attempt.replace('-', '').isalnum():
        raise ValueError('invalid attempt')
    items = {'glasses': ITEMS, 'headphones': HEADPHONES, 'crown': ['hat-crown'], 'ocean': ['hat-ocean']}[args.category]
    filter_id = 'hat' if args.category in ('crown', 'ocean') else args.category
    catalog_folder = 'hats' if args.category in ('crown', 'ocean') else args.category
    out = ROOT / f'qa/v652/{args.category}-integration' / args.attempt
    out.mkdir(parents=True, exist_ok=False)
    rows = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for width in (1512, 390):
            context = browser.new_context(viewport={'width': width, 'height': 982 if width == 1512 else 844}, reduced_motion='reduce')
            context.add_init_script(seed())
            context.route('**/api/**', lambda route: route.abort())
            context.route('**/api/time', route_time)
            context.route('**/api/server-time', route_time)
            page = context.new_page()
            page.goto('http://127.0.0.1:5178/', wait_until='domcontentloaded')
            page.get_by_role('button', name='寶物商店', exact=True).first.click()
            page.locator(f'#shop-filter-tab-{filter_id}').click()
            for item in items:
                card = page.locator(f'article[data-item-id="{item}"]')
                catalog = card.locator('.v4-item-art img')
                catalog.evaluate('i=>i.decode()')
                expected_catalog = f'/assets/v6.5.2/catalog/{catalog_folder}/{item}.webp'
                assert catalog.get_attribute('src') == expected_catalog
                card.locator('.v6-preview-button').click()
                stage = page.locator('#shop-preview-stage')
                stage.scroll_into_view_if_needed()
                avatar = stage.locator('.avatar-renderer')
                page.wait_for_function('(id)=>document.querySelector("#shop-preview-stage .avatar-renderer")?.dataset.renderedItems.split(" ").includes(id)', arg=item)
                if args.category == 'ocean':
                    page.wait_for_function('''() => {
                      const e=document.querySelector('#shop-preview-stage .avatar-renderer');
                      return e?.dataset.canvasTopPadding==='256' && e.dataset.runtimeDetail==='hat-ocean';
                    }''')
                images = avatar.locator('img')
                images.evaluate_all('async els=>{await Promise.all(els.map(i=>i.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}')
                sources = images.evaluate_all('els=>els.map(i=>i.getAttribute("src"))')
                suffix = f'/{item}--detail.webp' if args.category == 'ocean' else f'/{item}.webp'
                assert any('/assets/v6.5.2/runtime/' in src and src.endswith(suffix) for src in sources), sources
                geometry = None
                if args.category == 'ocean':
                    geometry = avatar.evaluate('''e=>{
                      const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
                      const hat=e.querySelector('[data-wearable-item="hat-ocean"]');
                      const body=e.querySelector('.avatar-renderer-skin');
                      const styles=n=>{const s=getComputedStyle(n);return Object.fromEntries(['width','height','maxWidth','maxHeight','minHeight','transform','objectFit'].map(k=>[k,s[k]]));};
                      return {outer:box(e),hat:box(hat),body:box(body),mask:body.style.maskImage,
                        hatStyle:styles(hat),bodyStyle:styles(body),hatInline:hat.style.cssText,
                        hatWidth:hat.naturalWidth,hatHeight:hat.naturalHeight};
                    }''')
                    outer, hat, body = geometry['outer'], geometry['hat'], geometry['body']
                    (out / f'{width}-{item}-geometry.json').write_text(json.dumps(geometry, indent=2)+'\n')
                    stage.screenshot(path=str(out / f'{width}-{item}-measured.png'), animations='disabled')
                    assert [geometry['hatWidth'], geometry['hatHeight']] == [1024, 1792]
                    assert geometry['mask'] == ''
                    scale = hat['w'] / 1024
                    assert abs(hat['h'] - 1792*scale) < .2
                    assert abs(body['y'] - hat['y'] - 256*scale) < .2
                    for box in (hat, body):
                        assert box['x'] >= outer['x']-.2 and box['y'] >= outer['y']-.2
                        assert box['x']+box['w'] <= outer['x']+outer['w']+.2
                        assert box['y']+box['h'] <= outer['y']+outer['h']+.2
                assert avatar.get_attribute('data-art-mode') == 'runtime'
                assert page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1')
                shot = out / f'{width}-{item}.png'
                stage.screenshot(path=str(shot), animations='disabled')
                rows.append({'width':width, 'item':item, 'catalog':expected_catalog, 'runtimeSources':sources, 'geometry':geometry,
                             'screenshot':str(shot.relative_to(ROOT)), 'sha256':hashlib.sha256(shot.read_bytes()).hexdigest()})
            context.close()
        browser.close()
    report = {'status':'PASS_TECHNICAL_AWAITING_VISUAL_REVIEW', 'scope':f'{len(items)} integrated {args.category} catalog and default-learner try-on at two widths; not full release', 'assetInterception':False, 'purchases':False, 'rows':rows}
    (out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'status':report['status'], 'count':len(rows), 'output':str(out)}))


if __name__ == '__main__':
    main()
