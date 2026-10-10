"""New pet acceptance, independent of the retained 63-SKU/252-case baseline."""
import argparse,copy,json,hashlib,re,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from qa_v653_shop_coverage import ROOT,BASE,URL,KEY,TIME,DECODE,AVATARS
ap=argparse.ArgumentParser();ap.add_argument('--attempt',required=True);ap.add_argument('--limit',type=int,default=16);ap.add_argument('--negative',choices=['missing','stale','wrong-sku']);ap.add_argument('--route-css',action='store_true');ap.add_argument('--formal',action='store_true');args=ap.parse_args()
OUT=BASE/'pet'/args.attempt;OUT.mkdir(parents=True,exist_ok=False)
sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
files=['types.ts','cosmetics.ts','shopLedger.ts','avatarShop.ts','equipmentPreview.ts','components/TreasureShowcase.tsx','components/PetCompanion.tsx','v4/SecondaryViews.tsx','v4/Dashboard.tsx','styles/components/pet.css','worldArtAssets.ts','useWorldDisplayPath.ts']
pins=lambda:{'src/'+f:sha(ROOT/'src'/f) for f in files}
manifestpath=ROOT/'qa/v653/20261005/blender/pet/runtime-candidate-r1/candidate-world-manifest.json';manifesttext=manifestpath.read_text();manifest=json.loads(manifesttext)
if args.formal:
 assert not args.route_css
 assert (ROOT/'src/data/worldArtManifest.json').read_bytes()==manifestpath.read_bytes(),'formal manifest differs from exact accepted candidate'
pet=next(r for r in manifest['records'] if r['itemId']=='pet-space-fox');assets={v['path']:v['sha256'] for v in [pet['source'],pet['delivery'],*pet['displayVariants']]};expected={'/'+k.removeprefix('public/'):v for k,v in assets.items()};assert all(sha(ROOT/k)==v for k,v in assets.items())
rows=[dict(zip(['id','slot','name'],m.groups())) for m in re.finditer(r"id:'([^']+)',slot:'([^']+)',name:'([^']+)'",(ROOT/'src/cosmetics.ts').read_text().split('export const cosmetics:')[1].split('];')[0])]
assert len(rows)==64 and len({r['id'] for r in rows})==64
assert sum(r['slot'] in ['spaceship','room','robot','card','effect','pet'] for r in rows)==16
(OUT/'inventory64.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
report={'sourcePins':pins(),'candidateManifestSHA256':sha(manifestpath),'candidateAssets':assets,'formalNoManifestRoute':args.formal,'negative':args.negative,'cssScope':'exact source CSS routed as Vite module; candidate-only' if args.route_css else 'normal dev URL, no CSS override','fixture':'Synthetic legacy completion records fund a real UI purchase; no persistent balance or real family calls. Robot is a preowned fixture.','cases':[]}
save=lambda:(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));save()
store=json.loads((ROOT/'qa/v653/20261005/lessons/default-storage.json').read_text());settings=json.loads(store['star-learning-v40:__local__:settings']);blank=json.loads(store[KEY])
with sync_playwright() as p:
 b=p.chromium.launch();c=b.new_context(viewport={'width':1440,'height':1050},service_workers='block',reduced_motion='reduce');c.route_web_socket('**',lambda w:None)
 c.route('**/api/**',lambda r:r.fulfill(status=200,json=TIME) if r.request.url.endswith(('/api/time','/api/server-time')) else r.fulfill(status=503,body='isolated synthetic fixture'))
 if not args.formal:c.route('**/src/data/worldArtManifest.json*',lambda r:r.fulfill(status=200,content_type='application/javascript',body='export default '+manifesttext+';'))
 if args.route_css:
  css=(ROOT/'src/styles/components/pet.css').read_text();body='import { updateStyle } from "/@vite/client"; const css='+json.dumps(css)+'; updateStyle('+json.dumps(str(ROOT/'src/styles/components/pet.css'))+',css); export default css;'
  c.route('**/src/styles/components/pet.css*',lambda r:r.fulfill(status=200,content_type='application/javascript',body=body))
 if args.negative:
  def corrupt(r):
   if args.negative=='missing':r.fulfill(status=404,body='intentional missing pet')
   else:r.fulfill(status=200,content_type='image/webp',body=(ROOT/('art-source/v653/pet-space-fox/pet-space-fox-r7.png' if args.negative=='stale' else 'public/assets/v6.4/world/robot/robot-sky.webp')).read_bytes())
  c.route('**/assets/v6.5.3/**/pet-space-fox*',corrupt)
 page=c.new_page();page.set_default_timeout(14000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(URL,wait_until='domcontentloaded')
 report['servedModules']={}
 if args.formal:
  actual=page.evaluate("async()=>(await import('/src/data/worldArtManifest.json')).default");assert actual==manifest;report['formalRuntimeManifestMatchesAcceptedCandidate']=True
 for module,marker in [('src/v4/Dashboard.tsx','PetCompanion'),('src/cosmetics.ts','pet-space-fox'),('src/avatarShop.ts','pet'),('src/shopLedger.ts','pet'),('src/styles/components/pet.css','grid-template-rows:auto 1fr auto')]:
  js=page.evaluate('u=>fetch(u).then(r=>r.text())',URL+module);assert marker in js,('stale Vite module: restart requested',module);report['servedModules'][module]=hashlib.sha256(js.encode()).hexdigest()
 catalog=page.evaluate("async()=> (await import('/src/data/curriculum.ts')).curriculum.slice(0,20).map(d=>({id:d.id,blocks:d.blocks.map(b=>({id:b.id,missions:b.missions.map(m=>m.id)}))}))")
 snapshot=lambda:page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)
 def rewards():return page.evaluate("async k=>(await import('/src/rewards.ts')).calculateRewards(JSON.parse(localStorage.getItem(k))['child-1'])",KEY)
 def gotopet():
  page.get_by_role('button',name='寶物商店',exact=True).first.click();page.locator('#shop-learner-tab-child-1').click();page.get_by_role('tab',name='寵物',exact=True).click();return page.locator('article[data-item-id="pet-space-fox"]')
 def capture(el,name):
  el.scroll_into_view_if_needed();el.evaluate(DECODE);el.screenshot(path=str(OUT/(name+'.png')),animations='disabled');return str(OUT/(name+'.png'))
 stop=False
 for avatar in AVATARS:
  for width in [1440,390]:
   for theme in ['light','dark']:
    if len(report['cases'])>=args.limit:stop=True;break
    name=f'{avatar}--{width}--{theme}';row={'name':name,'status':'RUNNING'};start=len(errors)
    try:
     assert pins()==report['sourcePins'],'source drift';assert not args.formal or (ROOT/'src/data/worldArtManifest.json').read_bytes()==manifestpath.read_bytes();page.set_viewport_size({'width':width,'height':1050 if width==1440 else 844})
     s=copy.deepcopy(settings);s['children'][0].update(avatar=avatar,name={'brother':'哥哥','younger':'弟弟','sister':'姐姐','younger-sister':'妹妹'}[avatar]);s.update(theme=theme,homeDisplayLearnerId='child-1');progress=copy.deepcopy(blank)
     progress['child-1'].update(completedDays=[d['id'] for d in catalog],completedBlocks=[v['id'] for d in catalog for v in d['blocks']],completedMissions=[m for d in catalog for v in d['blocks'] for m in v['missions']],unlockedCosmetics=['robot-sky'],equippedCosmetics=['robot-sky'],purchaseTransactions=[{'id':'fixture-robot','itemId':'robot-sky','childId':'child-1','cost':160,'createdAt':'2026-09-01T00:00:00.000Z','source':'purchase'}])
     store['star-learning-v40:__local__:settings']=json.dumps(s);store[KEY]=json.dumps(progress);store['little-explorers-v4-sound']='off';page.evaluate('(s)=>{localStorage.clear();sessionStorage.clear();for(const[k,v]of Object.entries(s))localStorage.setItem(k,v)}',store);page.reload(wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for();before=snapshot();row['beforeRewards']=rewards();assert row['beforeRewards']['coins']>=180
     card=gotopet();row['touchTargets']=card.locator('button').evaluate_all("es=>es.map(e=>{const r=e.getBoundingClientRect();return{text:e.textContent,width:r.width,height:r.height}})");row['touchTargets'].append(page.get_by_role('tab',name='寵物',exact=True).evaluate("e=>{const r=e.getBoundingClientRect();return{text:e.textContent,width:r.width,height:r.height}}"));assert all(v['width']>=44 and v['height']>=44 for v in row['touchTargets']);card.locator('.v6-preview-button').click();stage=page.locator('.v63-equipment-stage');page.wait_for_function("()=>document.querySelector('.v63-equipment-stage')?.dataset.previewMode==='pet'")
     if args.negative=='missing':
      page.locator('[data-pet-status="unavailable"]').wait_for();row['negativeCaught']='missing pet image shows explicit recoverable error';row['screenshot']=capture(stage,name+'--missing');row['status']='EXPECTED_FAILURE_CAUGHT';report['cases'].append(row);save();stop=True;break
     image=stage.locator('.v653-pet-art');image.wait_for();image.evaluate('i=>i.decode()');source=image.get_attribute('src');digest=page.evaluate("async u=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await(await fetch(u)).arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('')",source)
     if args.negative:
      assert digest!=expected[source];row.update(status='EXPECTED_FAILURE_CAUGHT',negativeCaught='same URL returned stale/wrong SKU bytes',observedSHA256=digest,expectedSHA256=expected[source]);row['screenshot']=capture(stage,name+'--'+args.negative);report['cases'].append(row);save();stop=True;break
     assert digest==expected[source];row['trialAsset']={'src':source,'sha256':digest};row['trialScreenshot']=capture(stage,name+'--trial')
     row['trialLayout']=stage.evaluate("e=>{const head=e.querySelector('.v63-stage-heading').getBoundingClientRect(),body=e.querySelector('.v653-pet-stage').getBoundingClientRect(),status=e.querySelector('.v63-stage-status').getBoundingClientRect(),copy=e.querySelector('.v653-pet-copy p'),img=e.querySelector('.v653-pet-art').getBoundingClientRect();return{headerBottom:head.bottom,bodyTop:body.top,bodyBottom:body.bottom,statusTop:status.top,textColor:getComputedStyle(copy).color,headingColor:getComputedStyle(e.querySelector('.v653-pet-copy h3')).color,ratio:img.width/img.height}}")
     assert row['trialLayout']['bodyTop']>=row['trialLayout']['headerBottom'] and row['trialLayout']['bodyBottom']<=row['trialLayout']['statusTop'];assert row['trialLayout']['textColor']=='rgb(255, 255, 255)' and row['trialLayout']['headingColor']=='rgb(255, 255, 255)';assert abs(row['trialLayout']['ratio']-6/7)<.002
     assert snapshot()==before;page.locator('#shop-learner-tab-child-2').click();assert stage.get_attribute('data-preview-item')!='pet-space-fox';page.locator('#shop-learner-tab-child-1').click();page.locator('#shop-preview-tab-trial').click();assert stage.get_attribute('data-preview-item')=='pet-space-fox';row['trialChildIsolation']=True;card.locator('.v6-preview-button').click();assert snapshot()==before;row['trialCancelNoMutation']=True
     card.get_by_role('button',name='用 180 金幣收藏').click();page.wait_for_function("k=>JSON.parse(localStorage.getItem(k))['child-1'].purchaseTransactions.some(t=>t.itemId==='pet-space-fox')",arg=KEY);purchased=snapshot();tx=[t for t in purchased['child-1']['purchaseTransactions'] if t['itemId']=='pet-space-fox'];assert len(tx)==1 and tx[0]['cost']==180 and tx[0]['source']=='purchase';row['afterPurchaseRewards']=rewards();assert row['beforeRewards']['coins']-row['afterPurchaseRewards']['coins']==180;assert row['afterPurchaseRewards']['earnedCoins']==row['beforeRewards']['earnedCoins'];assert purchased['child-2']==before['child-2']
     card.get_by_role('button',name='立即使用',exact=True).click();page.wait_for_function("k=>JSON.parse(localStorage.getItem(k))['child-1'].equippedCosmetics.includes('pet-space-fox')",arg=KEY);equipped=snapshot();assert 'robot-sky' in equipped['child-1']['equippedCosmetics'];pet_tx=[t for t in equipped['child-1']['equipmentTransactions'] if t['itemId']=='pet-space-fox'];assert len(pet_tx)==1 and pet_tx[0]['slot']=='pet'
     page.get_by_role('button',name='首頁',exact=True).first.click();home=page.locator('.v4-left-column [data-pet-item="pet-space-fox"]');home.wait_for();assert page.locator('.v6-ai-robot-art').count()==1;
     for lesson in page.locator('.v4-lesson-card').all():
      lesson.scroll_into_view_if_needed();lesson.locator('.v4-smart-image.loaded').first.wait_for()
     row['homeScreenshot']=capture(page.locator('.v4-left-column'),name+'--home');row['brokenImages']=page.evaluate("()=>[...document.images].filter(i=>i.complete&&i.currentSrc&&!i.naturalWidth).map(i=>i.currentSrc)");assert not row['brokenImages'];page.screenshot(path=str(OUT/(name+'--page.png')),full_page=True,animations='disabled')
     row['layout']=home.evaluate("e=>{const i=e.querySelector('img'),r=i.getBoundingClientRect(),b=e.querySelector('button').getBoundingClientRect();return{ratio:r.width/r.height,naturalRatio:i.naturalWidth/i.naturalHeight,button:{width:b.width,height:b.height},overflow:document.documentElement.scrollWidth-innerWidth,animation:getComputedStyle(i).animationName}}")
     assert abs(row['layout']['ratio']-6/7)<.002 and abs(row['layout']['naturalRatio']-6/7)<.002;assert row['layout']['button']['width']>=44 and row['layout']['button']['height']>=44;assert row['layout']['overflow']<=1;assert row['layout']['animation']=='none'
     home.get_by_role('button',name='和太空狐狸打招呼').click();assert home.get_attribute('data-pet-reaction')=='playing';assert home.locator('img').evaluate('i=>getComputedStyle(i).animationName')=='none';page.wait_for_function("()=>document.querySelector('.v4-left-column [data-pet-item]')?.dataset.petReaction==='resting'")
     if width==1440 and theme=='light':
      page.emulate_media(reduced_motion='no-preference');home.get_by_role('button',name='和太空狐狸打招呼').click();assert home.locator('img').evaluate('i=>getComputedStyle(i).animationName')=='v653-pet-greeting';assert home.locator('img').evaluate('i=>getComputedStyle(i).animationIterationCount')=='1';page.wait_for_function("()=>document.querySelector('.v4-left-column [data-pet-item]')?.dataset.petReaction==='resting'");assert home.locator('img').evaluate('i=>getComputedStyle(i).animationName')=='none';page.emulate_media(reduced_motion='reduce');row['finiteInteractionMotion']=True
     assert snapshot()==equipped;page.reload(wait_until='domcontentloaded');home.wait_for();assert snapshot()==equipped
     selector=page.locator('.v65-home-display-selector');selector.get_by_role('button').nth(1).click();assert page.locator('.v4-left-column [data-pet-item]').count()==0;selector.get_by_role('button').first.click();home.wait_for();assert snapshot()==equipped;row['homeChildIsolation']=True
     page.get_by_role('button',name='成就獎勵',exact=True).first.click();page.locator('#achievement-tab-child-1').click();page.locator('#achievement-panel').wait_for();assert snapshot()==equipped
     card=gotopet();card.get_by_role('button',name='先收起來',exact=True).click();page.wait_for_function("k=>!JSON.parse(localStorage.getItem(k))['child-1'].equippedCosmetics.includes('pet-space-fox')",arg=KEY);after=snapshot();assert after['child-1']['purchaseTransactions']==equipped['child-1']['purchaseTransactions'];assert len(after['child-1']['equipmentTransactions'])==len(equipped['child-1']['equipmentTransactions'])+1;assert after['child-1']['equipmentTransactions'][:-1]==equipped['child-1']['equipmentTransactions'];assert after['child-2']==before['child-2'];assert rewards()==row['afterPurchaseRewards'];page.get_by_role('button',name='首頁',exact=True).first.click();assert page.locator('.v4-left-column [data-pet-item]').count()==0;assert page.locator('.v6-ai-robot-art').count()==1
     assert not errors[start:];assert pins()==report['sourcePins'];row.update(status='PASS_FUNCTIONAL_PENDING_VISUAL',purchaseTransaction=tx[0],equipmentTransactions=[t for t in after['child-1']['equipmentTransactions'] if t['itemId']=='pet-space-fox'],reloadAchievementsIdempotent=True,unequipAppendOnly=True,childIsolation=True)
    except Exception as e:
     row.update(status='FAIL',error=str(e),traceback=traceback.format_exc());page.screenshot(path=str(OUT/(name+'--failure.png')),full_page=True);stop=True
    row['pageErrors']=errors[start:];report['cases'].append(row);save();print(name,row['status'],row.get('error','')[:180],flush=True)
    if stop:break
   if stop:break
  if stop:break
 b.close()
report['status']='PASS_FUNCTIONAL_PENDING_VISUAL' if len(report['cases'])==args.limit and all(r['status'].startswith('PASS') for r in report['cases']) else 'EXPECTED_FAILURE_CAUGHT' if args.negative and all(r['status']=='EXPECTED_FAILURE_CAUGHT' for r in report['cases']) else 'FAIL';save()
raise SystemExit(0 if report['status']!='FAIL' else 1)
