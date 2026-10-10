"""Read-only current-source high-hair audit of every remaining earwear."""
import json,hashlib
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'qa/v653/20261005/wearables/remaining-earwear-high-r1';out.mkdir(exist_ok=False)
raw=(ROOT/'src/data/avatarAssetManifest.json').read_bytes();m=json.loads(raw);ids=[e['id'] for e in m['accessories'] if e['slot']=='earwear' and e['id']!='phones-legend'];rows=[]
with sync_playwright() as pw:
 b=pw.chromium.launch();c=b.new_context(viewport={'width':2200,'height':900},reduced_motion='reduce');c.route('**/api/**',lambda r:r.abort());p=c.new_page()
 for item in ids:
  items=['hair-legend',item];p.goto('http://127.0.0.1:5178/qa/v653/20261005/wearables/index.html?'+urlencode({'items':','.join(items),'size':520}),wait_until='domcontentloaded')
  p.wait_for_function("items=>[...document.querySelectorAll('.avatar-renderer')].length===4&&[...document.querySelectorAll('.avatar-renderer')].every(e=>items.every(i=>e.dataset.renderedItems.includes(i)))",arg=items,timeout=20000)
  p.locator('main').evaluate("async e=>{await Promise.all([...e.querySelectorAll('img')].map(i=>i.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}")
  assert not p.locator('main').get_attribute('data-failures');sheet=out/(item+'--four-roles.png');p.locator('main').screenshot(path=str(sheet))
  for a in ['brother','younger','sister','younger-sister']:
   node=p.locator(f'[data-review-avatar="{a}"]');shot=out/f'{item}--{a}.png';node.screenshot(path=str(shot));data=node.locator('.avatar-renderer').evaluate("e=>({rendered:e.dataset.renderedItems,images:[...e.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),mask:i.style.maskImage,width:i.naturalWidth,height:i.naturalHeight}))})")
   rows.append({'item':item,'avatar':a,'skin':'default','hair':'hair-legend','status':'CAPTURED_AWAITING_VISUAL_REVIEW','screenshot':str(shot),'sha256':hashlib.sha256(shot.read_bytes()).hexdigest(),'sheet':str(sheet),'dom':data})
  (out/'report.json').write_text(json.dumps({'manifestSHA256':hashlib.sha256(raw).hexdigest(),'rows':rows},indent=2)+'\n')
 b.close()
print(len(rows))
