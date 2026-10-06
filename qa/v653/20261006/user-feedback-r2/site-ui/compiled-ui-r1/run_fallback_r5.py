import argparse
parser=argparse.ArgumentParser()
parser.add_argument('--base',required=True)
parser.add_argument('--out',required=True)
from compiled_binding import arguments,Binding
arguments(parser)
args=parser.parse_args()
from urllib.parse import urlsplit as _split
if _split(args.base).hostname not in ['localhost','127.0.0.1']:parser.error('Only isolated localhost candidates are permitted')
import argparse,copy,hashlib,json,time,traceback
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();OUT=Path(args.out).resolve();OUT.mkdir(parents=True,exist_ok=False)
binding=Binding(args,OUT,__file__)
URL=args.base.rstrip('/')+'/';KEY='star-learning-v40:__local__:progress';SETTINGS='star-learning-v40:__local__:settings';REFLECTION='star-learning-v40:__local__:reflections'
TIME={'now':'2026-09-17T06:00:00.000Z','activeDate':'2026-09-17','taipeiDate':'2026-09-17','taipeiTime':'14:00:00','timeZone':'Asia/Taipei'}
SOURCES=['src/v5/AnimatedMedia.tsx','src/v4/Dashboard.tsx','src/v4/ParentSettings.tsx','src/v4/ParentAccess.tsx','src/v4/SecondaryViews.tsx','src/v4/RewardModal.tsx','src/styles/components/dashboard.css','src/styles/components/actions.css','src/styles/components/reward.css','src/styles/components/parent.css','src/styles/components/navigation.css','src/styles/themes.css','src/styles/responsive.css','src/styles/index.css','src/App.tsx']
PINS={f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in SOURCES};(OUT/'source-pins.json').write_text(json.dumps(PINS,indent=2)+'\n')
HEALTH='''()=>{const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0};return {overflow:document.documentElement.scrollWidth-innerWidth,broken:[...document.images].filter(i=>vis(i)&&(!i.complete||!i.naturalWidth)).map(i=>i.currentSrc||i.src),smallButtons:[...document.querySelectorAll('button,[role=tab]')].filter(vis).map(e=>({text:e.innerText||e.getAttribute('aria-label'),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,cls:e.className})).filter(e=>e.width<43.5||e.height<43.5),navigation:[...document.querySelectorAll('.v4-main-navigation button')].map(e=>({id:e.dataset.navigation,text:e.innerText,box:e.getBoundingClientRect().toJSON()}))}}'''
READY='''()=>[...document.images].filter(i=>{const r=i.getBoundingClientRect(),s=getComputedStyle(i);return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&s.visibility!=='hidden'&&s.display!=='none'&&Number(s.opacity)>0}).every(i=>i.complete&&i.naturalWidth>0)'''
def save(report): (OUT/'result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
def fixture(theme='light',world='hero',state='start'):
 s=json.loads((ROOT/'qa/v653/20261005/lessons/default-storage.json').read_text());settings=json.loads(s[SETTINGS]);settings.update(theme=theme,visualTheme=world,motionEffects=False);s[SETTINGS]=json.dumps(settings,ensure_ascii=False);s[KEY]='{}';s['little-explorers-v4-sound']='off'
 if state=='selected0':s[REFLECTION]=json.dumps({'day-14':{'excludedLearnerIds':['child-1','child-2']}})
 if state in ['midLesson','allDone']:
  blocks=['w3d4b1','w3d4b2'] if state=='allDone' else ['w3d4b1'];s[KEY]=json.dumps({c:{'completedDays':['day-14'] if state=='allDone' else [],'completedBlocks':blocks,'completedMissions':[],'claimedEggs':[],'unlockedCosmetics':[],'equippedCosmetics':[],'rewardTransactions':[],'answerEvents':[],'purchaseTransactions':[],'equipmentTransactions':[]} for c in ['child-1','child-2']})
 return s
def context(browser,width,theme,missing=False):
 c=browser.new_context(viewport={'width':width,'height':844 if width<600 else 1000},color_scheme=theme,reduced_motion='reduce',service_workers='block')
 traffic=[]
 def route(r):
  u=urlsplit(r.request.url)
  if u.path in ['/api/time','/api/server-time']:
   traffic.append({'path':u.path,'mock':'503' if missing else 'trusted-200'});return r.fulfill(status=503,body='time unavailable fixture') if missing else r.fulfill(json=TIME)
  if u.path.startswith('/api/') or r.request.method not in ['GET','HEAD','OPTIONS']:
   traffic.append({'path':u.path,'method':r.request.method,'blocked':True});return r.fulfill(status=503,body='isolated UI QA; cloud blocked')
  if u.hostname not in ['127.0.0.1','localhost']:return r.fulfill(status=503,body='external disabled')
  return r.continue_()
 c.route('**/*',route);c.route_web_socket('**',lambda ws:None);return c,traffic
def seed(p,s):
 u=URL+'__qa_site_seed__';p.route(u,lambda r:r.fulfill(content_type='text/html',body='<!doctype html><title>isolated</title>'));p.goto(u);p.evaluate('(s)=>{localStorage.clear();sessionStorage.clear();for(const[k,v]of Object.entries(s))localStorage.setItem(k,v)}',s);p.unroute(u);p.goto(URL,wait_until='domcontentloaded');p.locator('.v4-dashboard-grid').wait_for();p.wait_for_timeout(120)
def ledger(p):return p.evaluate('(k)=>JSON.parse(localStorage.getItem(k)||"{}")',KEY)
def snap(p,name,loc=None):
 if loc:loc.evaluate("e=>e.scrollIntoView({block:'center',inline:'nearest'})")
 p.evaluate('()=>document.fonts.ready');p.wait_for_timeout(180)
 ready=True
 try:p.wait_for_function(READY,timeout=10000)
 except:ready=False
 path=OUT/(name+'.png');p.screenshot(path=str(path),full_page=False,animations='disabled');return {'name':name,'file':str(path),'ready':ready,'health':p.evaluate(HEALTH)}
def primary(browser,width,theme,world,state):
 name=f'primary-{width}-{theme}-{world}-{state}';row={'name':name,'width':width,'theme':theme,'world':world,'fixtureState':state,'errors':[],'captures':[]};c,traffic=context(browser,width,theme,state=='missingtrusteddate');p=c.new_page();binding.attach(p);p.set_default_timeout(18000);p.on('pageerror',lambda e:row['errors'].append(str(e)))
 try:
  seed(p,fixture(theme,world,state));before=ledger(p);btn=p.locator('.v64-home-primary-cta');btn.wait_for();row['label']=btn.inner_text();row['actionKind']=btn.get_attribute('data-home-primary-action');row['captures'].append(snap(p,name,btn));row['button']=btn.evaluate('e=>{const s=getComputedStyle(e);return {rect:e.getBoundingClientRect().toJSON(),color:s.color,background:s.background,shadow:s.boxShadow,theme:document.documentElement.dataset.theme,visual:document.documentElement.dataset.visualTheme}}');btn.click();p.wait_for_timeout(350)
  if state=='selected0':
   row['focus']=p.evaluate('()=>({tag:document.activeElement.tagName,type:document.activeElement.type,within:!!document.activeElement.closest(".v64-daily-participants")})');assert not p.locator('.v4-quest-shell').count() and row['focus']['within'];expected='start'
  elif state=='allDone':assert p.locator('#achievement-panel').count();expected='rewards'
  elif state=='missingtrusteddate':assert p.locator('.v4-semester-view').count() or p.locator('.v4-page-heading').filter(has_text='學習日曆').count() or 'semester' in p.locator('.v4-main-navigation button.active').get_attribute('data-navigation');expected='next-adventure'
  else:
   p.locator('.v4-quest-shell').wait_for();row['lessonTitle']=p.locator('.v4-quest-title').inner_text();assert 'DAY 14' in row['lessonTitle'];assert ('LESSON 2' if state=='midLesson' else 'LESSON 1') in row['lessonTitle'];expected='resume' if state=='midLesson' else 'start'
  row['correctAction']=row['actionKind']==expected;assert row['correctAction'];row['ledgerUnchanged']=before==ledger(p);assert row['ledgerUnchanged'];assert not row['errors'];row['healthy']=all(x['ready'] and x['health']['overflow']<=1 and not x['health']['broken'] and not x['health']['smallButtons'] for x in row['captures']);assert row['healthy'];row['pass']=True
 except Exception as e:row.update(pass_=False,error=repr(e),traceback=traceback.format_exc());p.screenshot(path=str(OUT/(name+'-failure.png')),full_page=False)
 finally:row['traffic']=traffic;c.close();row['contextClosed']=True
 return row
def navigation(browser,width,theme):
 name=f'navigation-{width}-{theme}';row={'name':name,'width':width,'theme':theme,'errors':[],'captures':[]};c,traffic=context(browser,width,theme);p=c.new_page();binding.attach(p);p.set_default_timeout(18000);p.on('pageerror',lambda e:row['errors'].append(str(e)))
 try:
  seed(p,fixture(theme));before=ledger(p);row['captures'].append(snap(p,name+'-menu',p.locator('.v4-main-navigation')))
  for view in ['home','semester','achievements','shop']:
   p.locator(f'.v4-main-navigation [data-navigation="{view}"]').click();p.wait_for_timeout(150)
   if view=='home':target=p.locator('.v64-home-primary-cta')
   elif view=='shop':target=p.locator('.v63-equipment-stage').first
   else:target=p.locator('.v4-page-heading').first
   target.wait_for();row['captures'].append(snap(p,name+'-'+view+'-top',target))
   p.evaluate('()=>window.scrollTo(0,Math.min(document.documentElement.scrollHeight-innerHeight,innerHeight*1.5))');row['captures'].append(snap(p,name+'-'+view+'-lower'))
   nav=p.locator('.v4-main-navigation button').evaluate_all('es=>es.map(e=>e.dataset.navigation)');assert nav==['home','semester','achievements','shop','parent-login'],nav
   assert before==ledger(p)
  p.locator('.v4-main-navigation [data-navigation="parent-login"]').click();dialog=p.locator('[role="dialog"]').first;dialog.wait_for();row['parentDialog']=dialog.get_attribute('aria-label');row['captures'].append(snap(p,name+'-parent',dialog))
  dialog.get_by_role('button',name='取消並留在目前頁面',exact=True).click();dialog.wait_for(state='hidden');assert not p.locator('[data-navigation="report"]').count();assert before==ledger(p)
  p.locator('.v4-main-navigation [data-navigation="parent-login"]').click();dialog.wait_for();p.keyboard.press('Escape');dialog.wait_for(state='hidden');assert not p.locator('[data-navigation="report"]').count();assert before==ledger(p)
  row['allRoutes']=True;row['cancelAndEscape']=True;row['ledgerUnchanged']=True;row['healthy']=all(x['ready'] and x['health']['overflow']<=1 and not x['health']['broken'] and not x['health']['smallButtons'] for x in row['captures']);row['pass']=row['healthy'] and not row['errors'] and all(x['ready'] and x['health']['overflow']<=1 and not x['health']['broken'] for x in row['captures'])
 except Exception as e:row.update(pass_=False,error=repr(e),traceback=traceback.format_exc());p.screenshot(path=str(OUT/(name+'-failure.png')),full_page=False)
 finally:row['traffic']=traffic;c.close();row['contextClosed']=True
 return row
report={'scope':'Compiled 1024px fallback with real external thumbnail failure; synthetic empty completion state','profiles':[]}
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True)
 try:
  for width,theme in [(390,'light'),(390,'dark'),(1440,'light'),(1440,'dark')]:
   row={'width':width,'theme':theme,'captures':[],'errors':[]};report['profiles'].append(row);c,traffic=context(b,width,theme);p=c.new_page();binding.attach(p);p.set_default_timeout(18000);p.on('pageerror',lambda e:row['errors'].append(str(e)))
   try:
    seed(p,fixture(theme));before=ledger(p)
    for i in range(2):
     card=p.locator('.v4-lesson-card').nth(i);thumb=card.locator('.v4-lesson-thumb');thumb.scroll_into_view_if_needed();data=None
     for attempt in range(150):
      if thumb.locator('img').count():
       data=thumb.locator('img').evaluate("async i=>{const ready=()=>i.isConnected&&i.complete&&i.naturalWidth===1024&&i.naturalHeight===1024&&i.currentSrc&&new URL(i.currentSrc).pathname==='/assets/v5/themes/space-hero-v2.webp';if(!ready())return null;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return ready()?{src:new URL(i.currentSrc).pathname,natural:[i.naturalWidth,i.naturalHeight],alt:i.alt}:null}")
       if data:break
      p.wait_for_timeout(100)
     assert data,'fallback natural loading/remount barrier timeout'
     proof=p.evaluate("async u=>{const r=await fetch(u,{cache:'no-store'});const b=await r.arrayBuffer();return {status:r.status,sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('')}}",data['src']);assert proof['status']==200 and proof['sha256']==binding.artifacts[data['src'].lstrip('/')];data['byteProof']=proof;label=card.locator('.v4-lesson-content div.v653-lesson-cover-status');assert data['src']=='/assets/v5/themes/space-hero-v2.webp' and data['natural']==[1024,1024];assert label.is_visible() and label.inner_text()=='影片封面暫時無法載入，仍可開啟課程' and data['alt']==label.inner_text();capture=snap(p,f'fallback-{width}-{theme}-{i}',card)
     geometry=label.evaluate('''e=>{const r=e.getBoundingClientRect(),c=e.closest('.v4-lesson-card').getBoundingClientRect(),im=e.closest('.v4-lesson-card').querySelector('.v4-lesson-thumb').getBoundingClientRect();const range=document.createRange();range.selectNodeContents(e);const lines=[...range.getClientRects()].map(x=>x.toJSON());return {label:r.toJSON(),card:c.toJSON(),image:im.toJSON(),viewport:{width:innerWidth,height:innerHeight},lines,insideCard:r.left>=c.left-1&&r.right<=c.right+1&&r.top>=c.top-1&&r.bottom<=c.bottom+1,insideViewport:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1,noImageOverlap:Math.max(0,Math.min(r.right,im.right)-Math.max(r.left,im.left))*Math.max(0,Math.min(r.bottom,im.bottom)-Math.max(r.top,im.top))<=1,noTextClip:e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1&&lines.every(x=>x.left>=r.left-1&&x.right<=r.right+1&&x.top>=r.top-1&&x.bottom<=r.bottom+1)}}''')
     assert all(geometry[k] for k in ['insideCard','insideViewport','noImageOverlap','noTextClip']),geometry
     row['captures'].append(dict(capture,image=data,labelGeometry=geometry))
    p.locator('.v64-home-primary-cta').click();p.locator('.v4-quest-shell').wait_for();row['lessonTitle']=p.locator('.v4-quest-title').inner_text();assert 'DAY 14' in row['lessonTitle'];row['ledgerUnchanged']=before==ledger(p);assert row['ledgerUnchanged'];row['pass']=not row['errors'] and all(x['ready'] and x['health']['overflow']<=1 and not x['health']['broken'] for x in row['captures'])
   except Exception as e:row.update(pass_=False,error=repr(e),traceback=traceback.format_exc())
   finally:c.close();row['contextClosed']=True;save(report)
 finally:b.close();report['browserClosed']=True
report['flowCases']=[{'case':'thumbnail-fallback','passed':len(report['profiles'])==4 and all(r.get('pass') is True for r in report['profiles'])}]
save(report);binding.finish()
raise SystemExit(0 if report['flowCases'][0]['passed'] else 1)
