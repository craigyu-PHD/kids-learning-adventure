"""Exact opt-in Ocean/Nebula QA capture; not a substitute for visual review."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--attempt', required=True)
    parser.add_argument('--avatar', choices=['brother','younger','sister','younger-sister'], required=True)
    parser.add_argument('--overlay', required=True)
    parser.add_argument('--skin')
    parser.add_argument('--item', choices=['hat-ocean', 'hair-nebula'], default='hat-ocean')
    args = parser.parse_args()
    assert args.attempt.replace('-', '').isalnum()
    source = (ROOT / args.overlay).resolve()
    assert source.is_relative_to(ROOT/'qa/v652') and source.is_file()
    out = ROOT/'qa/v652/runtime-preview'/args.attempt
    out.mkdir(exist_ok=False)
    params = {'avatar':args.avatar, 'overlay':str(source.relative_to(ROOT)), 'item':args.item}
    if args.skin: params['skin'] = args.skin
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        context = browser.new_context(viewport={'width':1512,'height':982}, reduced_motion='reduce')
        context.route('**/api/**', lambda route: route.abort())
        page = context.new_page(); errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto('http://127.0.0.1:5178/qa/v652/headroom-preview/index.html?'+urlencode(params), wait_until='domcontentloaded')
        page.wait_for_function("() => document.querySelector('.avatar-renderer').dataset.canvasTopPadding === '256'")
        page.wait_for_function('() => [...document.images].every(i=>i.complete && i.naturalWidth>0)')
        avatar = page.locator('.avatar-renderer')
        row = avatar.evaluate('''e=>({avatar:e.className,skin:e.dataset.skin,detail:e.dataset.runtimeDetail,padding:e.dataset.canvasTopPadding,
          images:[...e.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),width:i.naturalWidth,height:i.naturalHeight,mask:i.style.maskImage}))})''')
        assert 'avatar-'+args.avatar in row['avatar'].split() and row['detail']==args.item
        overlays = [i for i in row['images'] if i['src']=='/'+str(source.relative_to(ROOT))]
        assert len(overlays)==1 and overlays[0]['width']==1024 and overlays[0]['height']==1792
        assert row['skin']==(args.skin or 'default') and not errors
        body = avatar.locator('.avatar-renderer-skin').get_attribute('src')
        if args.skin:
            manifest = json.loads((ROOT/'src/data/avatarAssetManifest.json').read_text())
            expected = next(r['path'] for r in manifest['skins'] if r['skinId']==args.skin and r['avatarId']==args.avatar)
            assert body=='/'+expected.removeprefix('public/')
        else:
            assert body.startswith('/assets/v6.4/avatar-display/'+args.avatar+'/base-body-')
        shot = out/('ocean.png' if args.item == 'hat-ocean' else 'nebula.png')
        page.locator('[data-qa-stage]').screenshot(path=str(shot), animations='disabled')
        browser.close()
    report = {'status':'CAPTURED_AWAITING_VISUAL_REVIEW','mode':'QA in-memory exact extended detail; no production promotion', 'item':args.item,
              'overlay':{'path':str(source.relative_to(ROOT)),'sha256':digest(source)},
              'body':{'path':'public'+body,'sha256':digest(ROOT/('public'+body))},
              'row':row,'screenshot':{'path':str(shot.relative_to(ROOT)),'sha256':digest(shot)},'pageErrors':errors}
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'output':str(out),'status':report['status']}))

if __name__=='__main__': main()
