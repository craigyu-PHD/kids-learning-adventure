"""Direct real Renderer controls. Route candidate back bytes only; no manifest files are written."""
import argparse,json,hashlib
from pathlib import Path
from urllib.parse import urlsplit,unquote
from playwright.sync_api import sync_playwright,Error
p=argparse.ArgumentParser();p.add_argument('--item',required=True);p.add_argument('--revision',required=True);args=p.parse_args();ROOT=Path(__file__).resolve().parents[1];out=ROOT/f'qa/v653/20261005/blender/backpacks/{args.item}/negative-{args.revision}';out.mkdir(parents=True,exist_ok=False)
m=json.loads((ROOT/'src/data/avatarAssetManifest.json').read_text());e=next(e for e in m['accessories'] if e['id']==args.item);rows=[]
paths={part:{role:'/'+v.removeprefix('public/') for role,v in e[part+'Variants'].items()} for part in ['front','back']}
replacement={url:ROOT/f'art-source/v653/{args.item}/fit-{args.revision}/{role}--{args.item}--back--{args.revision}.png' for role,url in paths['back'].items()}
with sync_playwright() as pw:
 b=pw.chromium.launch()
 for mode in ['missing-front','missing-back','stale-back-response']:
  c=b.new_context(viewport={'width':1440,'height':900},reduced_motion='reduce',service_workers='block');c.route('**/api/**',lambda r:r.abort());c.route_web_socket('**',lambda w:None);pending=[];part='front' if mode=='missing-front' else 'back';bad=paths[part]['brother']
  def route(r):
   path=unquote(urlsplit(r.request.url).path)
   if path==bad:
    if mode=='stale-back-response':pending.append(r)
    else:r.fulfill(status=404,body='intentional missing candidate layer')
   elif path in replacement:r.fulfill(status=200,content_type='image/png',body=replacement[path].read_bytes())
   else:r.continue_()
  c.route('**/assets/**',route);page=c.new_page();page.goto('http://127.0.0.1:5178/qa/v653/20261005/wearables/remaining-earwear-repair/story-headphones/index.html?avatar=brother&items='+args.item,wait_until='domcontentloaded')
  if mode!='stale-back-response':
   page.wait_for_function("document.querySelector('main')?.dataset.failures.includes('brother:wearable')",timeout=15000);page.wait_for_timeout(200);state=page.locator('main').evaluate("e=>({failures:e.dataset.failures,rendered:e.querySelector('.avatar-renderer').dataset.renderedItems})");assert args.item not in state['rendered'];verdict='FAILURE_NOTIFIED_INCOMPLETE_PAIR_NOT_RENDERED'
  else:
   page.wait_for_function("document.querySelector('.avatar-renderer img[data-wearable-item]')!==null");assert pending;assert args.item not in page.locator('.avatar-renderer').get_attribute('data-rendered-items')
   page.evaluate("config=>window.dispatchEvent(new CustomEvent('qa-fixture',{detail:config}))",{'avatar':'sister','skin':'','items':[args.item]});page.wait_for_function("sku=>document.querySelector('main').dataset.avatar==='sister'&&document.querySelector('.avatar-renderer').dataset.renderedItems.includes(sku)",arg=args.item)
   releases=[]
   for r in pending:
    try:r.fulfill(status=200,content_type='image/png',body=replacement[bad].read_bytes());releases.append('fulfilled-old-resource')
    except Error:releases.append('old-request-already-cancelled')
   page.wait_for_timeout(300);state=page.locator('main').evaluate("e=>({avatar:e.dataset.avatar,failures:e.dataset.failures,rendered:e.querySelector('.avatar-renderer').dataset.renderedItems,srcs:[...e.querySelectorAll('img')].map(i=>i.getAttribute('src'))})");assert state['avatar']=='sister' and not state['failures'];assert not any('/brother/' in s for s in state['srcs']);assert args.item in state['rendered'];state['releases']=releases;verdict='STALE_RESOURCE_CANNOT_REPLACE_CURRENT_ROLE'
  shot=out/(mode+'.png');page.locator('main').screenshot(path=str(shot));rows.append({'mode':mode,'status':'PASS','assertion':verdict,'state':state,'screenshot':str(shot),'sha256':hashlib.sha256(shot.read_bytes()).hexdigest()});(out/'report.json').write_text(json.dumps({'sku':args.item,'rows':rows},indent=2)+'\n');c.close()
 b.close()
print(len(rows))
