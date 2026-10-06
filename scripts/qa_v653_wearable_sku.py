"""SKU native candidate in current Renderer. Includes actual visible sources and failure controls."""
import argparse,json,copy,hashlib
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--sku',required=True);p.add_argument('--attempt',required=True);p.add_argument('--base-only',action='store_true');p.add_argument('--hat-controls',action='store_true');args=p.parse_args();ROOT=Path(__file__).resolve().parents[1];source=ROOT/'art-source/v653'/args.sku;out=ROOT/'qa/v653/20261005/wearables/remaining-earwear-repair'/args.sku/args.attempt;out.mkdir(parents=True,exist_ok=False)
raw=(ROOT/'qa/v653/20261005/wearables/combined-candidate-r1/candidate-avatar-manifest.json').read_bytes();manifest=json.loads(raw);entry=next(e for e in manifest['accessories'] if e['id']==args.sku);ledger=json.loads((source/'body-ear-anchors.json').read_text())['rows']
for key in ['variants','skinVariants','defaultSkinDetails','skinDetails','headwearVariants']:entry.pop(key,None)
entry.update(renderer='split-overlay',canvasTopPadding=256,backVariants={},frontVariants={},skinBackVariants={},skinFrontVariants={})
for row in ledger:
 a,s=row['avatar'],row['skin'];projection='default' if row['reusesBaseProjection'] else s
 for part in ['back','front']:
  path=f'art-source/v653/{args.sku}/fit-r2/{a}--{projection}--{part}.png'
  if s=='default':entry[part+'Variants'][a]=path
  else:entry['skin'+part.title()+'Variants'].setdefault(a,{})[s]=path
(out/'manifest-entry.json').write_text(json.dumps(entry,indent=2)+'\n');cases=[]
for row in ledger:
 if args.base_only and row['skin']!='default':continue
 if row['skin']=='default':cases.append({**row,'high':False,'width':1440,'theme':'light'})
 cases.append({**row,'high':True,'width':1440,'theme':'light'})
if not args.base_only:
 for row in ledger:
  if row['skin']=='default':
   for width,theme in [(390,'light'),(390,'dark'),(1440,'dark')]:cases.append({**row,'high':True,'width':width,'theme':theme})
if args.hat_controls:
 cases=[{**row,'high':True,'width':1440,'theme':'light','hat':hat} for row in ledger if row['skin']=='default' for hat in ['hat-crown','starter-sun-cap']]
 cases+=[{**row,'high':False,'width':1440,'theme':'light','hat':'starter-sun-cap'} for row in ledger if row['avatar']=='brother' and row['skin'] in ['default','outfit-mecha']]
report={'sku':args.sku,'inputManifestSHA256':hashlib.sha256(raw).hexdigest(),'status':'RUNNING','rows':[]}
with sync_playwright() as pw:
 b=pw.chromium.launch()
 for idx,case in enumerate(cases):
  a,s=case['avatar'],case['skin'];skin='' if s=='default' else s;items=[args.sku]+(['hair-legend'] if case['high'] else [])+([case['hat']] if case.get('hat') else []);size=330 if case['width']==390 else 560
  c=b.new_context(viewport={'width':case['width'],'height':900},reduced_motion='reduce');c.route('**/api/**',lambda r:r.abort());c.route('**/src/data/avatarAssetManifest.json*',lambda r,request:r.fulfill(status=200,content_type='text/javascript',body='export default '+json.dumps(manifest)+';'));page=c.new_page()
  url='http://127.0.0.1:5178/qa/v653/20261005/wearables/remaining-earwear-repair/story-headphones/index.html?'+urlencode({'avatar':a,'skin':skin,'items':','.join(items),'size':size,'theme':case['theme']});page.goto(url,wait_until='domcontentloaded');page.wait_for_function("items=>items.every(i=>document.querySelector('.avatar-renderer')?.dataset.renderedItems.includes(i))",arg=items,timeout=20000);page.locator('main').evaluate("async e=>{await Promise.all([...e.querySelectorAll('img')].map(i=>i.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}");assert not page.locator('main').get_attribute('data-failures')
  data=page.locator('.avatar-renderer').evaluate("e=>({rendered:e.dataset.renderedItems,padding:e.dataset.canvasTopPadding,images:[...e.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),width:i.naturalWidth,height:i.naturalHeight}))})");loaded={i['src']:i for i in data['images']};layers=[]
  for part in ['back','front']:
   path=entry['skin'+part.title()+'Variants'][a][s] if skin else entry[part+'Variants'][a];im=loaded['/'+path];assert (im['width'],im['height'])==(1024,1792);layers.append({'part':part,'path':str(ROOT/path),'sha256':hashlib.sha256((ROOT/path).read_bytes()).hexdigest()})
  assert data['padding']=='256';assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');shot=out/f'{idx:02d}--{a}--{s}--{"high" if case["high"] else "normal"}--{case["width"]}--{case["theme"]}.png';page.locator('main').screenshot(path=str(shot));report['rows'].append({'avatar':a,'skin':s,'high':case['high'],'hat':case.get('hat'),'viewport':case['width'],'theme':case['theme'],'layers':layers,'dom':data,'screenshot':str(shot),'sha256':hashlib.sha256(shot.read_bytes()).hexdigest(),'status':'AWAITING_VISUAL_REVIEW'});(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');c.close()
 b.close()
report['status']='CAPTURED_AWAITING_VISUAL_REVIEW';(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(len(report['rows']))
