"""Final same-manifest current Renderer visual and negative controls."""
import json,hashlib,copy,argparse
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--attempt',default='combined-final-r2');args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[1];F=ROOT/'qa/v653/20261005/wearables';out=F/'phones-candidate'/args.attempt;out.mkdir(exist_ok=False)
mp=F/'combined-candidate-r1/candidate-avatar-manifest.json';raw=mp.read_bytes();manifest=json.loads(raw);entry=next(e for e in manifest['accessories'] if e['id']=='phones-legend')
base=json.loads((F/'phones-candidate/FINAL-depth-r9-review.json').read_text())['rows'];cases=[]
for row in base:
 a=row['avatar'];s=row.get('skin','');high=row.get('highHair',row.get('variant')=='high');items=['phones-legend']+(['hair-legend'] if high else []);cases.append({'avatar':a,'skin':s,'items':items,'previous':row})
for a in ['brother','younger','sister','younger-sister']:
 for hat in ['hat-crown','starter-sun-cap']:cases.append({'avatar':a,'skin':'','items':['phones-legend','hair-legend',hat]})
report={'manifest':str(mp),'manifestSHA256':hashlib.sha256(raw).hexdigest(),'status':'RUNNING','rows':[],'negativeControls':[]}
with sync_playwright() as pw:
 b=pw.chromium.launch()
 for idx,case in enumerate(cases):
  a,s,items=case['avatar'],case['skin'],case['items'];c=b.new_context(viewport={'width':600,'height':850},reduced_motion='reduce');c.route('**/api/**',lambda r:r.abort());c.route('**/src/data/avatarAssetManifest.json*',lambda r,request:r.fulfill(status=200,content_type='text/javascript',body='export default '+json.dumps(manifest)+';'));p=c.new_page()
  p.goto('http://127.0.0.1:5178/qa/v653/20261005/wearables/index.html?'+urlencode({'avatar':a,'skin':s,'items':','.join(items),'size':560}),wait_until='domcontentloaded');p.wait_for_function("items=>items.every(i=>document.querySelector('.avatar-renderer')?.dataset.renderedItems.includes(i))",arg=items,timeout=20000)
  p.locator('main').evaluate("async e=>{await Promise.all([...e.querySelectorAll('img')].map(i=>i.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}");assert not p.locator('main').get_attribute('data-failures')
  data=p.locator('.avatar-renderer').evaluate("e=>({rendered:e.dataset.renderedItems,padding:e.dataset.canvasTopPadding,images:[...e.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),width:i.naturalWidth,height:i.naturalHeight,mask:i.style.maskImage}))})")
  loaded={i['src']:i for i in data['images']}
  for part in ['back','front']:
   path=entry['skin'+part.title()+'Variants'][a][s] if s else entry[part+'Variants'][a];url='/'+path.removeprefix('public/');im=loaded[url];assert (im['width'],im['height'])==(1024,1792)
  assert data['padding']=='256';shot=out/f'{idx:02d}--{a}--{s or "default"}--{"-".join(items)}.png';p.locator('main').screenshot(path=str(shot));sha=hashlib.sha256(shot.read_bytes()).hexdigest();previous=case.get('previous');oldsha=previous.get('screenshotSHA256') if previous else None
  report['rows'].append({'avatar':a,'skin':s,'items':items,'screenshot':str(shot),'screenshotSHA256':sha,'previousSHA256':oldsha,'byteIdenticalToReviewed':sha==oldsha if oldsha else None,'status':'AWAITING_VISUAL_REVIEW','dom':data});(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');c.close()
 for mode in ['missing-front','missing-back','invalid-size']:
  c=b.new_context(viewport={'width':600,'height':850},reduced_motion='reduce');c.route('**/api/**',lambda r:r.abort());c.route('**/src/data/avatarAssetManifest.json*',lambda r,request:r.fulfill(status=200,content_type='text/javascript',body='export default '+json.dumps(manifest)+';'))
  part='back' if mode=='missing-back' else 'front';url='/'+entry[part+'Variants']['brother'].removeprefix('public/')
  if mode=='invalid-size':
   wrong=(ROOT/'public/assets/v5/characters/brother/wardrobe/base-body.webp').read_bytes();c.route('**'+url,lambda r:r.fulfill(status=200,content_type='image/webp',body=wrong))
  else:c.route('**'+url,lambda r:r.fulfill(status=404,body='intentional missing fixture'))
  p=c.new_page();p.goto('http://127.0.0.1:5178/qa/v653/20261005/wearables/index.html?items=phones-legend&avatar=brother&size=560',wait_until='domcontentloaded');p.wait_for_function("document.querySelector('main')?.dataset.failures.includes('brother:wearable')",timeout=10000);p.wait_for_timeout(300)
  state=p.locator('main').evaluate("e=>({failures:e.dataset.failures,rendered:e.querySelector('.avatar-renderer').dataset.renderedItems})");assert 'phones-legend' not in state['rendered'];shot=out/f'{mode}.png';p.locator('main').screenshot(path=str(shot));report['negativeControls'].append({'mode':mode,'status':'PASS_ERROR_NOTIFIED_NOT_RENDERED','state':state,'screenshot':str(shot),'sha256':hashlib.sha256(shot.read_bytes()).hexdigest()});c.close()
 b.close()
report['status']='CAPTURED_AWAITING_VISUAL_REVIEW';(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');print({'rows':len(report['rows']),'changed':sum(r['byteIdenticalToReviewed'] is False for r in report['rows']),'negative':len(report['negativeControls'])})
