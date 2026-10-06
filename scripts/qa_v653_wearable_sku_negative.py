import argparse,json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright,Error
p=argparse.ArgumentParser();p.add_argument('--sku',required=True);p.add_argument('--entry',required=True);p.add_argument('--out',required=True);args=p.parse_args();ROOT=Path(__file__).resolve().parents[1];out=ROOT/args.out;out.mkdir(parents=True,exist_ok=False)
manifest=json.loads((ROOT/'qa/v653/20261005/wearables/combined-candidate-r1/candidate-avatar-manifest.json').read_text());entry=json.loads((ROOT/args.entry).read_text());manifest['accessories']=[entry if e['id']==args.sku else e for e in manifest['accessories']];rows=[]
with sync_playwright() as pw:
 b=pw.chromium.launch()
 for mode in ['missing-front','missing-back','wrong-size','stale-back-response']:
  c=b.new_context(viewport={'width':1440,'height':900},reduced_motion='reduce');c.route('**/api/**',lambda r:r.abort());c.route('**/src/data/avatarAssetManifest.json*',lambda r,request:r.fulfill(status=200,content_type='text/javascript',body='export default '+json.dumps(manifest)+';'))
  part='back' if mode in ['missing-back','stale-back-response'] else 'front';bad=entry[part+'Variants']['brother'];pending=[]
  if mode=='wrong-size':
   wrong=(ROOT/'public/assets/v5/characters/brother/wardrobe/base-body.webp').read_bytes();c.route('**/'+bad,lambda r:r.fulfill(status=200,content_type='image/webp',body=wrong))
  elif mode=='stale-back-response':c.route('**/'+bad,lambda r:pending.append(r))
  else:c.route('**/'+bad,lambda r:r.fulfill(status=404,body='intentional missing fixture layer'))
  page=c.new_page();page.goto('http://127.0.0.1:5178/qa/v653/20261005/wearables/remaining-earwear-repair/story-headphones/index.html?avatar=brother&items='+args.sku,wait_until='domcontentloaded')
  if mode!='stale-back-response':
   page.wait_for_function("document.querySelector('main')?.dataset.failures.includes('brother:wearable')",timeout=10000);page.wait_for_timeout(200);state=page.locator('main').evaluate("e=>({failures:e.dataset.failures,rendered:e.querySelector('.avatar-renderer').dataset.renderedItems})");assert args.sku not in state['rendered'];verdict='FAILURE_NOTIFIED_INCOMPLETE_PAIR_NOT_RENDERED'
  else:
   page.wait_for_function("document.querySelector('.avatar-renderer img[data-wearable-item]')!==null");assert pending;before=page.locator('.avatar-renderer').get_attribute('data-rendered-items');assert args.sku not in before
   page.evaluate("config=>window.dispatchEvent(new CustomEvent('qa-fixture',{detail:config}))",{'avatar':'sister','skin':'','items':[args.sku]});page.wait_for_function("sku=>document.querySelector('main').dataset.avatar==='sister'&&document.querySelector('.avatar-renderer').dataset.renderedItems.includes(sku)",arg=args.sku)
   releases=[]
   for route in pending:
    try:route.fulfill(status=200,content_type='image/png',body=(ROOT/bad).read_bytes());releases.append('fulfilled-old-resource')
    except Error:releases.append('old-request-already-cancelled')
   page.wait_for_timeout(300);state=page.locator('main').evaluate("e=>({avatar:e.dataset.avatar,failures:e.dataset.failures,rendered:e.querySelector('.avatar-renderer').dataset.renderedItems,srcs:[...e.querySelectorAll('img')].map(i=>i.getAttribute('src'))})");assert state['avatar']=='sister' and not state['failures'];assert not any('brother--' in s for s in state['srcs']);assert args.sku in state['rendered'];state['releases']=releases;verdict='STALE_RESOURCE_CANNOT_REPLACE_CURRENT_ROLE'
  shot=out/(mode+'.png');page.locator('main').screenshot(path=str(shot));rows.append({'mode':mode,'status':'PASS','assertion':verdict,'state':state,'screenshot':str(shot),'sha256':hashlib.sha256(shot.read_bytes()).hexdigest()});(out/'report.json').write_text(json.dumps({'sku':args.sku,'rows':rows},indent=2)+'\n');c.close()
 b.close()
print(len(rows))
