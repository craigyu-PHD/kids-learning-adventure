"""Bounded representative full-outfit mix: actual Equip controls, local fixture only."""
import copy,json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
from qa_v653_shop_coverage import ROOT,BASE,URL,KEY,TIME,DECODE,pins,inventory,LABELS
OUT=BASE/'mix-r1';OUT.mkdir(parents=True,exist_ok=False)
LOOKS={'ocean':['outfit-ocean','hair-wave','hat-ocean','glasses-holo','pack-ocean','cape-ocean','phones-sky'],'mage':['outfit-mage','hair-nebula','hat-mage','glasses-star','pack-treasure','cape-nebula','story-headphones'],'racer':['outfit-racer','hair-spike','hat-rocket','glasses-racer','pack-rocket','hero-cape','phones-racer']}
store=json.loads((ROOT/'qa/v653/20261005/lessons/default-storage.json').read_text());settings=json.loads(store['star-learning-v40:__local__:settings']);blank=json.loads(store[KEY]);report={'sourcePins':pins(),'cases':[],'fixture':'synthetic ownership; actual equip clicks; no real cloud'};catalog={r['id']:r for r in inventory()}
with sync_playwright() as p:
 b=p.chromium.launch();c=b.new_context(viewport={'width':1440,'height':1050},reduced_motion='reduce',service_workers='block');c.route_web_socket('**',lambda w:None);c.route('**/api/**',lambda r:r.fulfill(status=200,json=TIME) if r.request.url.endswith(('/api/time','/api/server-time')) else r.fulfill(status=503,body='isolated'));page=c.new_page();page.goto(URL,wait_until='domcontentloaded')
 for avatar in ['brother','younger','sister','younger-sister']:
  for look,items in LOOKS.items():
   assert pins()==report['sourcePins'];s=copy.deepcopy(settings);s['children'][0].update(avatar=avatar,name=avatar);s.update(homeDisplayLearnerId='child-1',theme='light');store['star-learning-v40:__local__:settings']=json.dumps(s);progress=copy.deepcopy(blank);progress['child-1'].update(unlockedCosmetics=items,equippedCosmetics=[],purchaseTransactions=[{'id':'fixture-'+i,'childId':'child-1','itemId':i,'cost':0,'createdAt':'2026-09-02T00:00:00.000Z','source':'purchase'} for i in items]);store[KEY]=json.dumps(progress);store['little-explorers-v4-sound']='off';page.evaluate('(s)=>{localStorage.clear();sessionStorage.clear();for(const[k,v]of Object.entries(s))localStorage.setItem(k,v)}',store);page.reload(wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for();page.get_by_role('button',name='寶物商店',exact=True).first.click();page.locator('#shop-learner-tab-child-1').click()
   for i in items:
    page.get_by_role('tab',name=LABELS[catalog[i]['slot']],exact=True).click();card=page.locator(f'article[data-item-id="{i}"]')
    for _ in range(4):
     if card.count():break
     page.locator('.v64-load-more').click()
    card.get_by_role('button',name='立即穿上',exact=True).click();page.wait_for_function('([k,i])=>JSON.parse(localStorage.getItem(k))["child-1"].equippedCosmetics.includes(i)',arg=[KEY,i])
   stage=page.locator('.v63-equipment-stage');stage.scroll_into_view_if_needed();proof=stage.evaluate(DECODE);stage.screenshot(path=str(OUT/f'{avatar}--{look}.png'),animations='disabled');state=page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY);assert len(state['child-1']['equipmentTransactions'])==len(items);page.get_by_role('button',name='首頁',exact=True).first.click();page.reload(wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for();assert page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)==state;page.get_by_role('button',name='成就獎勵',exact=True).first.click();page.locator('#achievement-tab-child-1').click();ach=page.locator('#achievement-panel header .avatar-renderer');ach.scroll_into_view_if_needed();achproof=ach.evaluate(DECODE);assert page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)==state;report['cases'].append({'avatar':avatar,'look':look,'items':items,'trial':proof,'achievement':achproof,'ledgerStable':True});print(avatar,look,flush=True)
 b.close()
report['sourcePinsAfter']=pins();assert report['sourcePins']==report['sourcePinsAfter'];(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('DONE',len(report['cases']))
