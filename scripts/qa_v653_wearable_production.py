"""Fresh production shop screenshots in isolated Chromium; block every cloud API."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'qa/v653/20261005/wearables'
URL = 'https://kids-learning-adventure-chi.vercel.app/'
TIME = {'now':'2026-10-06T02:00:00.000Z','activeDate':'2026-10-06','taipeiDate':'2026-10-06','taipeiTime':'10:00:00','timeZone':'Asia/Taipei'}
AVATARS = ['brother','younger','sister','younger-sister']


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--attempt', required=True)
    parser.add_argument('--case-file', type=Path)
    args = parser.parse_args()
    assert args.attempt.replace('-', '').isalnum()
    out = BASE / args.attempt
    out.mkdir(exist_ok=False)
    fixture = json.loads((BASE / 'production-probe/default-fixture.json').read_text())
    mixes = [[], ['hair-comet'], ['hair-cloud'], ['hair-legend'],
             ['hair-comet','hat-mage','glasses-racer','starter-buddy-headphones'],
             ['outfit-racer','hair-comet','hat-mage','glasses-racer','starter-buddy-headphones'],
             ['outfit-mecha','hair-cloud','starter-sun-cap','glasses-star','starter-buddy-headphones']]
    cases = json.loads(args.case_file.read_text()) if args.case_file else [
        {'avatar': avatar, 'items': items} for avatar in AVATARS for items in mixes]
    report = {'status':'RUNNING','url':URL,'cloudAPIPolicy':'blocked all; /api/time and /api/server-time synthetic local response',
              'fixtureOrigin':'fresh empty isolated local namespace; synthetic equipment', 'cases':[], 'visualReview':'NOT_PERFORMED'}
    save = lambda: (out / 'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    save()
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        context = browser.new_context(viewport={'width':1440,'height':1100}, reduced_motion='reduce')
        api = []
        def handle_api(route):
            api.append({'path':route.request.url.split('/api/',1)[-1], 'method':route.request.method})
            route.fulfill(status=200,content_type='application/json',body=json.dumps(TIME)) if route.request.url.split('?')[0].endswith(('/api/time','/api/server-time')) else route.fulfill(status=503,body='isolated wearable QA')
        context.route('**/api/**',handle_api)
        context.add_init_script("""(() => {const original=window.fetch;window.fetch=function(input,init){
          const url=new URL(typeof input==='string'?input:input.url,location.href);
          if(url.pathname.startsWith('/api/')&&!['/api/time','/api/server-time'].includes(url.pathname))
            return Promise.resolve(new Response('isolated wearable QA',{status:503}));
          return original.call(this,input,init);};})();""")
        page = context.new_page();page.set_default_timeout(20000)
        page.goto(URL,wait_until='domcontentloaded')
        for index, case in enumerate(cases):
            row = dict(case, id=f'{index:03d}-{case["avatar"]}--'+('-'.join(case['items']) or 'base'))
            errors=[]
            listener=lambda e:errors.append(str(e))
            page.on('pageerror',listener)
            try:
                store=copy.deepcopy(fixture)
                settings=json.loads(store['star-learning-v40:__local__:settings'])
                settings['theme']='light';settings['children'][0]['avatar']=case['avatar']
                settings['children'][0]['name']={'brother':'哥哥','younger':'弟弟','sister':'姊姊','younger-sister':'妹妹'}[case['avatar']]
                progress=json.loads(store['star-learning-v40:__local__:progress'])
                progress['child-1']['unlockedCosmetics']=case['items']
                progress['child-1']['equippedCosmetics']=case['items']
                store['star-learning-v40:__local__:settings']=json.dumps(settings)
                store['star-learning-v40:__local__:progress']=json.dumps(progress)
                store['little-explorers-v4-sound']='off'
                page.evaluate('(s)=>{localStorage.clear();sessionStorage.clear();for(const [k,v] of Object.entries(s))localStorage.setItem(k,v)}',store)
                page.reload(wait_until='domcontentloaded')
                page.get_by_role('button',name='寶物商店',exact=True).first.click()
                stage=page.locator('.v63-equipment-stage')
                stage.wait_for();stage.scroll_into_view_if_needed()
                page.wait_for_function('''items=>{const e=document.querySelector('.v63-equipment-stage .avatar-renderer');
                  return e&&items.every(id=>(e.dataset.renderedItems||'').split(' ').includes(id));}''',arg=case['items'])
                stage.evaluate('''async e=>{await Promise.all([...e.querySelectorAll('img')].map(i=>i.decode()));
                  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}''')
                # Decode CSS mask images too; decoded DOM images alone cannot prove mask readiness.
                stage.evaluate('''async e=>{const urls=[...e.querySelectorAll('[style]')].flatMap(n=>[...n.style.maskImage.matchAll(/url\\(["']?([^"')]+)["']?\\)/g)].map(m=>m[1]));
                  await Promise.all([...new Set(urls)].map(async u=>{const i=new Image();i.crossOrigin='anonymous';i.src=u;await i.decode();}));
                  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}''')
                row['dom']=stage.locator('.avatar-renderer').first.evaluate('''e=>({rendered:e.dataset.renderedItems,skin:e.dataset.skin,details:e.dataset.runtimeDetails,
                  artMode:e.dataset.artMode,images:[...e.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),width:i.naturalWidth,height:i.naturalHeight,
                    mask:i.style.maskImage,visible:getComputedStyle(i).visibility,rect:i.getBoundingClientRect().toJSON()}))})''')
                shot=out/(row['id']+'.png');stage.screenshot(path=str(shot),animations='disabled')
                row.update(status='CAPTURED_AWAITING_VISUAL_REVIEW',screenshot=str(shot),sha256=hashlib.sha256(shot.read_bytes()).hexdigest())
            except Exception as exc:
                row.update(status='CAPTURE_FAILED',error=str(exc))
            finally:
                page.remove_listener('pageerror',listener);row['pageErrors']=errors;report['cases'].append(row);save()
                print(row['id'],row['status'],flush=True)
        browser.close()
    report['apiIntercepted']=api
    report['status']='CAPTURED_AWAITING_VISUAL_REVIEW' if all(r['status'].startswith('CAPTURED') for r in report['cases']) else 'PARTIAL_CAPTURE'
    save()


if __name__=='__main__':main()
