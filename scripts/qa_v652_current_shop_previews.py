#!/usr/bin/env python3
"""Current Shop DOM/image availability only; no historical artifact admission or art score."""
import argparse
import copy
import json
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright
from qa_v63_browser_seed import SETTINGS, PROGRESS

AVATARS = [('brother', 1440, 900), ('younger', 1024, 768),
           ('sister', 390, 844), ('younger-sister', 1920, 1080)]
CATEGORIES = ['角色裝備', '飛船', '基地', '機器夥伴', '卡面', '特效']
TIME = json.dumps({'now': '2026-09-02T02:30:00.000Z', 'activeDate': '2026-09-02',
                   'taipeiDate': '2026-09-02', 'taipeiTime': '10:30:00', 'timeZone': 'Asia/Taipei'})


def seed(avatar):
    settings = copy.deepcopy(SETTINGS)
    settings['children'][0]['avatar'] = avatar
    return """(() => {
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem('star-learning-v40:__local__:settings',JSON.stringify(%s));
      localStorage.setItem('star-learning-v40:__local__:progress',JSON.stringify(%s));
      localStorage.setItem('star-learning-v40:__local__:attendance','{}');
      localStorage.setItem('star-learning-v40:__local__:reflections','{}');
      localStorage.setItem('little-explorers-v4-sound','off');
      sessionStorage.setItem('star-learning-v40:__local__:active-user','user-father');
    })();""" % (json.dumps(settings, ensure_ascii=False), json.dumps(PROGRESS))


DECODE = r"""async root => {
  const visible = e => {const r=e.getBoundingClientRect(),s=getComputedStyle(e);
    return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
  const imgs=[...root.querySelectorAll('img')].filter(visible);
  if(!imgs.length) throw Error('no visible images');
  const rows=[];
  for(const img of imgs){
    await Promise.race([img.decode(),new Promise((_,reject)=>setTimeout(()=>reject(Error('decode timeout: '+img.src+' loading='+img.loading+' rect='+JSON.stringify(img.getBoundingClientRect().toJSON()))),8000))]);
    if(!img.naturalWidth||!img.naturalHeight) throw Error('empty image: '+img.src);
    if(new URL(img.currentSrc||img.src).origin!==location.origin) throw Error('nonlocal image');
    rows.push({src:new URL(img.currentSrc||img.src).pathname,width:img.naturalWidth,height:img.naturalHeight});
  }
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  return rows;
}"""


def validate_stage(page, item, mode, avatar):
    stage = page.locator('.v63-equipment-stage')
    stage.evaluate("e=>e.scrollIntoView({block:'center',behavior:'instant'})")
    page.wait_for_function("id=>document.querySelector('.v63-equipment-stage')?.dataset.previewItem===id", arg=item, timeout=5000)
    assert stage.get_attribute('data-preview-mode') == mode, 'preview mode mismatch'
    assert mode in ('avatar', 'effect', 'ship', 'robot', 'card', 'world'), mode
    if mode in ('avatar', 'effect'):
        assert stage.locator('.avatar-renderer').first.is_visible(), 'missing avatar renderer'
        assert stage.locator('.avatar-renderer').first.evaluate('(e,id)=>e.classList.contains("avatar-"+id)', avatar), 'wrong avatar renderer'
        page.wait_for_function("""id=>{const a=document.querySelector('.v63-equipment-stage .avatar-renderer');
          return a&&((a.dataset.renderedItems||'').split(/\s+/).includes(id)||a.dataset.skin===id)}""", arg=item, timeout=10000)
        if mode == 'effect':
            effect = stage.locator(f'img.v64-effect-art[data-effect-item="{item}"]')
            assert effect.is_visible(), 'missing effect art'
    elif mode in ('ship', 'robot', 'card'):
        assert stage.locator(f'.v63-{mode}-art').is_visible(), f'missing {mode} art'
    else:
        assert stage.get_attribute('data-room') == item, 'room did not apply'
    images = stage.evaluate(DECODE)
    # Room art is a CSS background rather than an img; decode the actual applied URL.
    backgrounds = stage.evaluate(r"""async root=>{
      const values=[root,root.querySelector('.v63-stage-backdrop')].filter(Boolean)
        .map(e=>getComputedStyle(e).backgroundImage);
      const urls=[...new Set(values.flatMap(v=>[...v.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m=>m[1])))];
      const rows=[];
      for(const url of urls){const img=new Image();img.src=url;
        await Promise.race([img.decode(),new Promise((_,reject)=>setTimeout(()=>reject(Error('background timeout')),8000))]);
        if(!img.naturalWidth||new URL(url,location.href).origin!==location.origin)throw Error('invalid background');
        rows.push({src:new URL(url,location.href).pathname,width:img.naturalWidth,height:img.naturalHeight});}
      return rows;
    }""")
    if mode == 'world': assert backgrounds, 'room has no image background'
    return {'images': images, 'backgrounds': backgrounds}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', required=True)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    assert urlparse(args.base_url).hostname in ('127.0.0.1', 'localhost'), 'local isolated preview only'
    args.output.parent.mkdir(parents=True, exist_ok=True)
    assert not args.output.exists(), 'preserve prior attempt'
    report = {'status': 'RUNNING', 'expectedPreviews': 252, 'sourceURL': args.base_url,
              'isolatedAPI': True, 'rows': [], 'avatarCounts': {}, 'pageErrors': [], 'assetHTTPFailures': [],
              'boundary': '63 current DOM items x 4 avatars: catalog and actual preview image decode. No historical QA imports, purchase flow, art score or physical device acceptance.'}
    def save(): args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    save()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            try:
                expected_ids = None
                for avatar, width, height in AVATARS:
                    context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
                    try:
                        context.set_default_timeout(10000)
                        context.add_init_script(seed(avatar))
                        context.route('**/api/**', lambda r: r.fulfill(status=503, body='isolated QA'))
                        for endpoint in ('time', 'server-time'):
                            context.route('**/api/'+endpoint, lambda r: r.fulfill(status=200, content_type='application/json', body=TIME))
                        page = context.new_page()
                        page.on('pageerror', lambda e, a=avatar: report['pageErrors'].append({'avatar': a, 'error': str(e)}))
                        page.on('response', lambda r, a=avatar: report['assetHTTPFailures'].append({'avatar': a, 'url': r.url, 'status': r.status})
                                if r.url.startswith(args.base_url.rstrip('/')+'/assets/') and r.status >= 400 else None)
                        page.goto(args.base_url, wait_until='domcontentloaded', timeout=30000)
                        page.wait_for_selector('.v4-dashboard-grid')
                        page.get_by_role('button', name='寶物商店', exact=True).first.click()
                        page.wait_for_selector('.v6-shop-studio')
                        seen = set()
                        for category in CATEGORIES:
                            page.get_by_role('tab', name=category, exact=True).click()
                            for _ in range(64):
                                more = page.locator('.v64-load-more')
                                if not more.count() or not more.is_visible(): break
                                more.click()
                            else: raise AssertionError('unbounded catalog expansion')
                            cards = page.locator('.v4-shop-grid article[data-item-id]')
                            for index in range(cards.count()):
                                card = cards.nth(index)
                                item = card.get_attribute('data-item-id')
                                mode = card.get_attribute('data-preview-mode')
                                report['currentCase'] = {'avatar': avatar, 'itemId': item, 'mode': mode}
                                assert item and item not in seen, f'missing/duplicate item {item}'
                                seen.add(item)
                                catalog_art = card.locator('.v4-item-art')
                                catalog_art.scroll_into_view_if_needed()
                                catalog = catalog_art.evaluate(DECODE)
                                button = card.locator('.v6-preview-button')
                                assert button.is_enabled(), f'preview disabled: {item}'
                                button.click()
                                detail = validate_stage(page, item, mode, avatar)
                                report['rows'].append({'avatar': avatar, 'itemId': item, 'mode': mode, 'status': 'PASS',
                                                       'viewport': [width, height], 'catalog': catalog, **detail})
                                assert not report['pageErrors'] and not report['assetHTTPFailures'], 'browser/asset error'
                            save()
                        assert len(seen) == 63, f'{avatar}: {len(seen)}/63 items'
                        if expected_ids is None: expected_ids = seen
                        else: assert seen == expected_ids, 'avatar catalog mismatch'
                        report['avatarCounts'][avatar] = len(seen)
                        save(); print(avatar, len(seen), 'previews PASS', flush=True)
                    finally: context.close()
            finally: browser.close()
        assert len(report['rows']) == 252
        report.update(status='PASS_CURRENT_252_SHOP_PREVIEWS', completedPreviews=len(report['rows']))
        report.pop('currentCase', None)
        return 0
    except Exception as error:
        report.update(status='FAIL', error=str(error), completedPreviews=len(report['rows']))
        return 1
    finally:
        save(); print(json.dumps({'status': report['status'], 'completedPreviews': len(report['rows']), 'report': str(args.output)}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    raise SystemExit(main())
