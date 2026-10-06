"""Isolated browser-only scale study. No production CSS/assets/state mutations."""
import copy,json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
from qa_v653_shop_coverage import ROOT,BASE,URL,KEY,TIME,DECODE,pins
OUT=BASE/'backpack-candidate'/'rocket-scale-r1';OUT.mkdir(parents=True,exist_ok=False)
store=json.loads((ROOT/'qa/v653/20261005/lessons/default-storage.json').read_text()); settings=json.loads(store['star-learning-v40:__local__:settings']);blank=json.loads(store[KEY]);report={'sourcePins':pins(),'cases':[],'type':'isolated DOM-only positioning study; not accepted runtime asset'}
with sync_playwright() as p:
 b=p.chromium.launch();c=b.new_context(viewport={'width':1440,'height':1050},reduced_motion='reduce',service_workers='block');c.route_web_socket('**',lambda w:None);c.route('**/api/**',lambda r:r.fulfill(status=200,json=TIME) if r.request.url.endswith(('/api/time','/api/server-time')) else r.fulfill(status=503,body='isolated'));page=c.new_page();page.goto(URL,wait_until='domcontentloaded')
 for avatar in ['brother','younger','sister','younger-sister']:
  s=copy.deepcopy(settings);s['children'][0].update(avatar=avatar,name=avatar);s.update(homeDisplayLearnerId='child-1',theme='light');store['star-learning-v40:__local__:settings']=json.dumps(s);progress=copy.deepcopy(blank);progress['child-1'].update(unlockedCosmetics=['pack-rocket'],equippedCosmetics=[],purchaseTransactions=[{'id':'fixture-rocket','childId':'child-1','itemId':'pack-rocket','cost':0,'createdAt':'2026-09-02T00:00:00.000Z','source':'purchase'}]);store[KEY]=json.dumps(progress);store['little-explorers-v4-sound']='off'
  page.evaluate('(s)=>{localStorage.clear();sessionStorage.clear();for(const[k,v]of Object.entries(s))localStorage.setItem(k,v)}',store);page.reload(wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for();page.get_by_role('button',name='寶物商店',exact=True).first.click();page.locator('#shop-learner-tab-child-1').click();page.get_by_role('tab',name='背包',exact=True).click();page.locator('article[data-item-id="pack-rocket"] .v6-preview-button').click();stage=page.locator('.v63-equipment-stage');stage.scroll_into_view_if_needed();stage.evaluate(DECODE);back=stage.locator('.avatar-wearable-back');before=stage.locator('.avatar-character-image').count();proof=stage.evaluate(DECODE)
  for scale in [1,1.15,1.3,1.45]:
   back.evaluate('(e,s)=>{e.style.transformOrigin="50% 26.0416667%";e.style.scale=String(s)}',scale);stage.screenshot(path=str(OUT/f'{avatar}--scale-{scale}.png'),animations='disabled');report['cases'].append({'avatar':avatar,'scale':scale,'proof':proof,'backStyle':back.get_attribute('style')})
 b.close()
report['sourcePinsAfter']=pins();assert report['sourcePins']==report['sourcePinsAfter'];(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('DONE',len(report['cases']))
