"""Four independently bound QA pairs in one real AvatarRenderer screenshot."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
AVATARS=['brother','younger','sister','younger-sister']

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def assert_skin_mask_binding(row, pair, skin_path):
    expected = 'url("/'+pair['mask']+'")' if pair['mask'] else ''
    assert any(i['src']=='/'+skin_path.removeprefix('public/')
               and i['mask']==expected for i in row['images']), 'mask must bind exact body image (or be absent for explicit no-mask)'

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--attempt',required=True)
    parser.add_argument('--item',required=True)
    parser.add_argument('--skin')
    parser.add_argument('--theme', choices=['light', 'dark'], default='light')
    source=parser.add_mutually_exclusive_group(required=True)
    source.add_argument('--pairs-root',type=Path)
    source.add_argument('--pairs-json',type=Path)
    args=parser.parse_args()
    assert args.attempt.replace('-','').isalnum(), 'invalid attempt'
    assert args.item.replace('-','').isalnum(), 'one item required'
    manifest=json.loads((ROOT/'src/data/avatarAssetManifest.json').read_text())
    skins={a:next(r['path'] for r in manifest['skins'] if r['skinId']==args.skin and r['avatarId']==a) for a in AVATARS} if args.skin else {
        a:f'public/assets/v6.4/avatar-display/{a}/base-body-384.webp' for a in AVATARS}
    inputs=json.loads(args.pairs_json.read_text()) if args.pairs_json else [
        {'avatar':a,'overlay':str(args.pairs_root/a/'overlay.png'),'mask':str(args.pairs_root/a/'hair-visibility-mask.png')} for a in AVATARS]
    assert isinstance(inputs,list) and len(inputs)==4 and {p['avatar'] for p in inputs}==set(AVATARS), 'four distinct avatar pairs required'
    pairs=[]; sources=[]
    for avatar in AVATARS:
        incoming=next(p for p in inputs if p['avatar']==avatar)
        pair={'avatar':avatar}
        for key in ['overlay','mask']:
            assert key in incoming, 'explicit overlay and mask/null required'
            if key=='mask' and incoming[key] is None:
                pair[key]=None
                continue
            path=(ROOT/incoming[key]).resolve()
            assert path.is_relative_to(ROOT/'qa/v652') and path.is_file(), 'missing or unsafe pair'
            pair[key]=str(path.relative_to(ROOT))
            sources.append({'avatar':avatar,'role':key,'path':pair[key],'sha256':digest(path)})
        pairs.append(pair)
    out=ROOT/'qa/v652/runtime-preview'/args.attempt
    out.mkdir(exist_ok=False)
    with sync_playwright() as pw:
        browser=pw.chromium.launch()
        context=browser.new_context(viewport={'width':1512,'height':982},reduced_motion='reduce',color_scheme=args.theme)
        context.route('**/api/**',lambda route:route.abort())
        page=context.new_page(); errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto('http://127.0.0.1:5178/qa/v652/runtime-preview/index.html?'+urlencode({'items':args.item,'theme':args.theme,**({'skin':args.skin} if args.skin else {}),'detailPairs':json.dumps(pairs)}))
        section=page.locator('[data-review-item]'); section.wait_for()
        assert page.locator('main').get_attribute('data-qa-theme') == args.theme
        assert page.evaluate("document.documentElement.classList.contains('dark')") == (args.theme == 'dark')
        decoded=page.evaluate('''async pairs => {
          const result=[];
          for (const pair of pairs) for (const role of ['overlay','mask']) {
            if (role==='mask' && pair.mask===null) continue;
            const image=new Image(); image.src='/'+pair[role]; await image.decode();
            if (image.naturalWidth!==1024 || image.naturalHeight!==1536) throw new Error('Invalid pair dimensions');
            result.push({avatar:pair.avatar,role,src:image.getAttribute('src'),width:image.naturalWidth,height:image.naturalHeight});
          }
          return result;
        }''',pairs)
        page.wait_for_function('''pairs => pairs.every(pair => {
          const avatar=document.querySelector('.avatar-'+pair.avatar);
          return avatar && [...avatar.querySelectorAll('img')].some(i=>i.getAttribute('src')==='/'+pair.overlay && i.complete && i.naturalWidth===1024)
            && (pair.mask===null ? !avatar.querySelector('.avatar-renderer-skin').style.maskImage
              : [...avatar.querySelectorAll('[style]')].some(n=>n.style.maskImage.includes('/'+pair.mask)));
        })''',arg=pairs)
        section.evaluate('''async e=>{await Promise.all([...e.querySelectorAll('img')].map(i=>i.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}''')
        rows=section.locator('.avatar-renderer').evaluate_all('''els=>els.map(e=>({avatar:e.className,rendered:e.dataset.renderedItems,detail:e.dataset.runtimeDetail,images:[...e.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),mask:i.style.maskImage,width:i.naturalWidth}))}))''')
        assert len(rows)==4 and not errors
        for pair in pairs:
            matched=[r for r in rows if 'avatar-'+pair['avatar'] in r['avatar'].split()]
            assert len(matched)==1
            row=matched[0]
            assert any(i['src']=='/'+skins[pair['avatar']].removeprefix('public/') for i in row['images']), 'wrong fullskin'
            assert args.item in row['rendered'].split()
            assert any(i['src']=='/'+pair['overlay'] for i in row['images'])
            assert_skin_mask_binding(row,pair,skins[pair['avatar']])
            assert sum(any(i['src']=='/'+pair['overlay'] for i in r['images']) for r in rows)==1
        shot=out/(args.item+'.png'); section.screenshot(path=str(shot),animations='disabled')
        browser.close()
    report={'mode':'qa-in-memory-four-detail-pairs','status':'CAPTURED_AWAITING_VISUAL_REVIEW','item':args.item,'skin':args.skin,'theme':args.theme,'pairs':pairs,'fullskins':{a:{'path':p,'sha256':digest(ROOT/p)} for a,p in skins.items()},'detailSources':sources,'decoded':decoded,'rows':rows,'screenshot':{'path':str(shot.relative_to(ROOT)),'sha256':digest(shot)},'pageErrors':errors}
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'output':str(out),'pairs':len(pairs),'status':report['status']}))

if __name__=='__main__':
    main()
