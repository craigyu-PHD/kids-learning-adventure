"""Isolated computed-style regression: no family state or asset writes."""
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

PARAMS = dict(items='hair-cloud', detailAvatar='younger-sister',
    detailOverlay='qa/v652/sol/cloud-younger-sister-left-neck-r4/hair-cloud-overlay.png',
    detailMask='qa/v652/sol/cloud-younger-sister-left-neck-r4/original-hair-visibility-mask.png')
URL = 'http://127.0.0.1:5178/qa/v652/runtime-preview/index.html?'

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    context = browser.new_context(reduced_motion='reduce')
    context.route('**/api/**', lambda route: route.abort())
    page = context.new_page()
    page.goto(URL + urlencode(PARAMS))
    skin = page.locator('.avatar-younger-sister[data-runtime-detail="hair-cloud"] .avatar-renderer-skin')
    skin.wait_for()
    assert skin.evaluate('e=>getComputedStyle(e).filter') == 'none'
    assert skin.evaluate('e=>e.style.maskImage') == 'url("/' + PARAMS['detailMask'] + '")'
    print('PASS ready masked base: filter none, exact mask active')
    # Exercise legacy ancestor-specific filter rules without changing files.
    for markup in ['<div class="v4-player-card"><div class="v4-player-avatar"></div></div>',
                   '<div class="v4-shop-card"><header></header></div>',
                   '<div class="v4-report-player"><header></header></div>']:
        actual = page.evaluate('''markup=>{const a=document.querySelector('.avatar-younger-sister').cloneNode(true);
          const host=document.createElement('div'); host.innerHTML=markup;
          host.style.cssText='position:fixed;top:0;left:0';
          host.firstElementChild.style.contentVisibility='visible';
          document.body.append(host); host.firstElementChild.firstElementChild.append(a);
          const e=a.querySelector('.avatar-renderer-skin');
          const result={filter:getComputedStyle(e).filter,token:getComputedStyle(e).getPropertyValue('--avatar-body-shadow')};
          host.remove(); return result;}''', markup)
        assert actual['filter'] == 'none', (markup, actual)
    print('PASS masked player/shop/report ancestor rules')
    page.goto(URL + 'items=glasses-racer')
    page.locator('.avatar-renderer-skin').first.wait_for()
    rows = page.locator('.avatar-renderer-skin').evaluate_all('''es=>es.map(e=>({
        filter:getComputedStyle(e).filter, mask:e.style.maskImage,
        marked:e.classList.contains('avatar-hair-mask-active')}))''')
    assert len(rows) == 4 and all(r['filter'].startswith('drop-shadow') and not r['mask'] and not r['marked'] for r in rows), rows
    print('PASS all four unmasked base shadows unchanged')
    context.route('**/' + PARAMS['detailMask'], lambda route: route.fulfill(status=404, body='fixture'))
    page.goto(URL + urlencode(PARAMS))
    page.locator('.avatar-younger-sister .avatar-renderer-skin').wait_for()
    page.wait_for_timeout(500)
    row = page.locator('.avatar-younger-sister .avatar-renderer-skin').evaluate('''e=>({
        filter:getComputedStyle(e).filter, mask:e.style.maskImage,
        marked:e.classList.contains('avatar-hair-mask-active')})''')
    assert row['filter'].startswith('drop-shadow') and not row['mask'] and not row['marked'], row
    print('PASS unavailable mask retains ordinary shadow')
    browser.close()
