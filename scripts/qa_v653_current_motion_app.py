#!/usr/bin/env python3
"""Fresh full App blink proof using isolated synthetic localStorage; no real API."""
import asyncio,copy,json,argparse,time
from pathlib import Path
from urllib.parse import urlsplit
from playwright.async_api import async_playwright
from qa_v653_current_motion import ROOT,sha,save,body_source_correct
from qa_v653_shop_coverage import KEY,TIME
async def main(a):
 out=Path(a.out);(ROOT/out).mkdir(parents=True,exist_ok=True); cases=[];errors=[]
 pins={str(p.relative_to(ROOT)):sha(str(p.relative_to(ROOT))) for p in (ROOT/'src').rglob('*') if p.suffix in {'.ts','.tsx','.json','.css'}}
 async with async_playwright() as pw:
  browser=await pw.chromium.launch()
  for role,skin,robot in [(r,s,None) for r in ['brother','younger','sister','younger-sister'] for s in ['default','outfit-racer']]+[('brother','default',r) for r in ['robot-sky','robot-mecha','robot-legend']]:
   name=f'{robot or role}--{skin}';print(name,flush=True);c=await browser.new_context(viewport={'width':1440,'height':1100},reduced_motion='no-preference',service_workers='block');blocked=[];motion_requests=[]
   store=json.loads((ROOT/'qa/v653/20261005/lessons/default-storage.json').read_text());settings=json.loads(store['star-learning-v40:__local__:settings']);settings.update(theme='light',motionEffects=True,homeDisplayLearnerId='child-1');settings['children'][0].update(avatar=role,name='測試角色');store['star-learning-v40:__local__:settings']=json.dumps(settings)
   items=['hat-crown','phones-legend']+([skin] if skin!='default' else [])+([robot] if robot else []);slots={'hat-crown':'hat','phones-legend':'headphones',skin:'outfit',robot:'robot'};progress=json.loads(store[KEY]);progress['child-1'].update(unlockedCosmetics=items,equippedCosmetics=items,purchaseTransactions=[{'id':'owned-'+i,'childId':'child-1','itemId':i,'cost':0,'createdAt':'2026-09-02T00:00:00.000Z','source':'purchase'} for i in items],equipmentTransactions=[{'id':'equip-'+i,'childId':'child-1','itemId':i,'slot':slots[i],'action':'equip','createdAt':'2026-09-02T00:00:00.000Z'} for i in items]);store[KEY]=json.dumps(progress);store['little-explorers-v4-sound']='off'
   await c.add_init_script('(s=>{localStorage.clear();sessionStorage.clear();for(const[k,v] of Object.entries(s))localStorage.setItem(k,v)})('+json.dumps(store)+')')
   async def route(r):
    u=r.request.url
    if 'blink' in u and '/assets/' in u:motion_requests.append(u)
    if '/api/' in u:
     blocked.append(u);await r.fulfill(status=200,json=TIME) if urlsplit(u).path in ['/api/time','/api/server-time'] else await r.fulfill(status=503,body='isolated');return
    if not a.formal:
     for suffix,path in [('avatarAssetManifest.json',a.avatar_manifest),('worldArtManifest.json',a.world_manifest)]:
      if '/src/data/'+suffix in u:await r.fulfill(content_type='text/javascript',body='export default '+(ROOT/path).read_text());return
    await r.continue_()
   await c.route('**/*',route);p=await c.new_page();p.on('pageerror',lambda e:errors.append(e.stack));await p.clock.install(time=__import__('datetime').datetime(2026,10,6,2,0,tzinfo=__import__('datetime').timezone.utc));await p.clock.pause_at(__import__('datetime').datetime(2026,10,6,2,0,0,100000,tzinfo=__import__('datetime').timezone.utc));await p.goto('http://127.0.0.1:5178/');
   for _ in range(100):
    await p.clock.run_for(50);await asyncio.sleep(.05)
    if await p.locator('.v4-dashboard-grid').count():break
   await p.locator('.v4-dashboard-grid').wait_for()
   if robot:subject=p.locator('.v4-ai-bot').first
   else:
    await p.get_by_role('button',name='寶物商店',exact=True).first.click();
    for _ in range(60):
     await p.clock.run_for(25);await asyncio.sleep(.05)
     if await p.locator('#shop-learner-tab-child-1').count():break
    await p.locator('#shop-learner-tab-child-1').click();subject=p.locator('.v63-equipment-stage').first
   await subject.scroll_into_view_if_needed();await subject.locator('img').first.wait_for();await subject.evaluate('async e=>await Promise.all([...e.querySelectorAll("img")].map(i=>i.decode().catch(()=>{})))');await p.clock.run_for(50);await asyncio.sleep(.25)
   statejs='e=>({blink:!!e.querySelector("[data-character-motion=blink],[data-robot-motion=blink]"),images:[...e.querySelectorAll("img")].map(i=>({src:i.currentSrc,classes:i.className,visibility:getComputedStyle(i).visibility,natural:[i.naturalWidth,i.naturalHeight]}))})'
   before=await subject.evaluate(statejs);f=str(out/(name+'--open.png'));await subject.screenshot(path=str(ROOT/f));shots=[{'path':f,'sha256':sha(f),'frame':'open'}];closed=None
   for _ in range(32):
    await p.clock.run_for(50);s=await subject.evaluate(statejs)
    if s['blink'] and closed is None:
     closed=s;f=str(out/(name+'--closed.png'));await subject.screenshot(path=str(ROOT/f));shots.append({'path':f,'sha256':sha(f),'frame':'closed'})
   after=await subject.evaluate(statejs);expected=skin=='default' and robot not in a.static_robots.split(',');okay=bool(closed)==expected and not after['blink'];okay=okay and (robot not in a.static_robots.split(',') or (not any(robot+'-blink' in u for u in motion_requests) and not any('blink' in i['classes'] for i in after['images'])));body_correct=body_source_correct([before,closed,after],role,skin,robot,a.avatar_manifest,a.world_manifest);okay=okay and body_correct;cases.append({'bodySourceCorrect':body_correct,'id':name,'role':role,'skin':skin,'robot':robot,'passed':okay,'before':before,'closed':closed,'after':after,'screenshots':shots,'blockedAPIs':blocked,'motionAssetRequests':[u for u in motion_requests if robot and robot+'-blink' in u]});save(str(out/'progress.json'),{'cases':cases});await c.close()
  await browser.close()
 drift=[k for k,v in pins.items() if sha(k)!=v];r={'status':'PASS_CURRENT_APP_FUNCTIONAL' if all(x['passed'] for x in cases) and not errors and not drift else 'FAIL','createdEpoch':time.time(),'scope':'Full App Shop 4 default blink + 4 racer static; Home 3 robots; all family APIs blocked, synthetic local fixture','formal':a.formal,'manifestPins':{a.avatar_manifest:sha(a.avatar_manifest),a.world_manifest:sha(a.world_manifest)},'sourcePins':pins,'harnessPins':{'scripts/qa_v653_current_motion_app.py':sha('scripts/qa_v653_current_motion_app.py')},'cases':cases,'pageErrors':errors,'drift':drift,'browserCount':1,'apiPolicy':'all family APIs blocked; only synthetic time mock'};save(str(out/'runtime-app.json'),r);print(r['status'],[x['id'] for x in cases if not x['passed']],errors)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--avatar-manifest',required=True);p.add_argument('--world-manifest',required=True);p.add_argument('--out',required=True);p.add_argument('--formal',action='store_true');p.add_argument('--static-robots',default='');asyncio.run(main(p.parse_args()))
