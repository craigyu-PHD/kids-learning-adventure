"""Narrow pet mobile mini preview; separate from real purchase lifecycle gate."""
import copy,json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
from qa_v653_shop_coverage import ROOT,BASE,URL,KEY,TIME,DECODE,AVATARS
out=BASE/'pet/mini-r3';out.mkdir(exist_ok=False)
manifest=(ROOT/'qa/v653/20261005/blender/pet/runtime-candidate-r1/candidate-world-manifest.json').read_text();store=json.loads((ROOT/'qa/v653/20261005/lessons/default-storage.json').read_text());base=json.loads(store['star-learning-v40:__local__:settings']);rows=[]
with sync_playwright() as p:
 b=p.chromium.launch();c=b.new_context(viewport={'width':390,'height':844},service_workers='block',reduced_motion='reduce');c.route_web_socket('**',lambda ws:None);c.route('**/api/**',lambda r:r.fulfill(status=200,json=TIME) if r.request.url.endswith(('/api/time','/api/server-time')) else r.fulfill(status=503,body='isolated'));c.route('**/src/data/worldArtManifest.json*',lambda r:r.fulfill(status=200,content_type='application/javascript',body='export default '+manifest+';'));page=c.new_page();page.goto(URL)
 for avatar in AVATARS:
  settings=copy.deepcopy(base);settings['children'][0].update(avatar=avatar,name=avatar);store['star-learning-v40:__local__:settings']=json.dumps(settings);store['little-explorers-v4-sound']='off';page.evaluate('(s)=>{localStorage.clear();sessionStorage.clear();for(const[k,v]of Object.entries(s))localStorage.setItem(k,v)}',store);page.reload();page.locator('.v4-dashboard-grid').wait_for();page.get_by_role('button',name='寶物商店',exact=True).first.click();page.locator('#shop-learner-tab-child-1').click();page.get_by_role('tab',name='寵物',exact=True).click();page.locator('article[data-item-id="pet-space-fox"] .v6-preview-button').click();mini=page.locator('.v64-mobile-mini-preview');mini.scroll_into_view_if_needed();mini.locator('.v4-smart-image.loaded').wait_for();proof=mini.evaluate(DECODE);mini.screenshot(path=str(out/(avatar+'.png')),animations='disabled');geometry=mini.evaluate("e=>{const v=e.querySelector('.v65-mini-preview-visual').getBoundingClientRect(),a=e.querySelector('.avatar-renderer').getBoundingClientRect(),p=e.querySelector('.v653-mini-pet-art').getBoundingClientRect();return{container:v.toJSON(),avatar:a.toJSON(),pet:p.toJSON()}}");rows.append({'avatar':avatar,'proof':proof,'geometry':geometry});print(avatar,geometry,flush=True)
 b.close()
(out/'report.json').write_text(json.dumps({'scope':'fresh normal CSS; candidate MF only; no purchase claim','cases':rows},ensure_ascii=False,indent=2))
