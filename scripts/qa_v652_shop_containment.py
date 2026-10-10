"""All catalog item image containment, isolated local fixture, no purchases."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from qa_v65_feedback_home import seed, route_time

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--attempt', required=True)
    args = parser.parse_args()
    if not args.attempt.replace('-', '').isalnum():
        raise ValueError('invalid attempt')
    out = ROOT / 'qa/v652/shop-containment' / args.attempt
    out.mkdir(parents=True, exist_ok=False)
    results = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for width in (1512, 390):
            context = browser.new_context(viewport={'width':width,'height':982 if width==1512 else 844}, reduced_motion='reduce')
            context.add_init_script(seed())
            context.route('**/api/server-time', route_time)
            context.route('**/api/time', route_time)
            context.route('**/api/state', lambda route: route.abort())
            context.route('**/api/family-session', lambda route: route.abort())
            page = context.new_page()
            page.goto('http://127.0.0.1:5178/', wait_until='domcontentloaded')
            page.get_by_role('button', name='寶物商店', exact=True).first.click()
            page.locator('.v4-shop-grid').wait_for()
            samples = {}
            for category in ['character','spaceship','room','robot','card','effect']:
                page.locator(f'#shop-category-tab-{category}').click()
                filters = ['hairstyle','hat','glasses','headphones','outfit','backpack','cape'] if category=='character' else [None]
                for filter_id in filters:
                    if filter_id:
                        page.locator(f'#shop-filter-tab-{filter_id}').click()
                    while page.locator('.v64-load-more').count():
                        page.locator('.v64-load-more').click()
                    for card in page.locator('.v4-shop-grid article[data-item-id]').all():
                        card.scroll_into_view_if_needed()
                        card.locator('.v4-item-art img').evaluate('i=>i.decode()')
                        row = card.evaluate('''e=>{ const a=e.getBoundingClientRect(), d=e.querySelector('.v4-item-art').getBoundingClientRect(), i=e.querySelector('.v4-item-art img'), b=i.getBoundingClientRect(); return {id:e.dataset.itemId,card:a.toJSON(),art:d.toJSON(),image:b.toJSON(),loaded:i.complete&&i.naturalWidth>0,contained:b.left>=a.left-1&&b.right<=a.right+1&&b.top>=a.top-1&&b.bottom<=a.bottom+1&&b.left>=d.left-1&&b.right<=d.right+1&&b.top>=d.top-1&&b.bottom<=d.bottom+1}; }''')
                        samples[row['id']] = row
            results.append({'width':width,'count':len(samples),'items':list(samples.values())})
            context.close()
        browser.close()
    errors = [f"{r['width']}:{i['id']}" for r in results for i in r['items'] if not i['loaded'] or not i['contained']]
    if any(r['count']!=63 for r in results):
        errors.append('expected 63 unique catalog items at each width')
    report = {'status':'FAIL' if errors else 'PASS','scope':'catalog image containment only, not wearable fit or visual acceptance','fixture':'isolated-local-family','errors':errors,'results':results}
    (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'status':report['status'],'errors':errors,'counts':[r['count'] for r in results]}))
    return bool(errors)


if __name__=='__main__':
    raise SystemExit(main())
