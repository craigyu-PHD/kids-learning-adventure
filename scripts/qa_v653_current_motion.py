#!/usr/bin/env python3
"""Fresh single-browser component motion evidence. No product or asset writes."""
import asyncio,hashlib,json,argparse,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
def save(p,v):(ROOT/p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
STATE="""() => ({time:Date.now(), blink:!!document.querySelector('[data-character-motion="blink"],[data-robot-motion="blink"]'), imgs:[...document.querySelectorAll('#subject img')].map(e=>({src:e.currentSrc||e.src,complete:e.complete,natural:[e.naturalWidth,e.naturalHeight],visibility:getComputedStyle(e).visibility,classes:e.className,rect:[e.getBoundingClientRect().x,e.getBoundingClientRect().y,e.getBoundingClientRect().width,e.getBoundingClientRect().height]}))})"""
def body_source_correct(states,role,skin,robot,avatar_manifest,world_manifest):
 from urllib.parse import urlsplit,unquote
 am=json.loads((ROOT/avatar_manifest).read_text());wm=json.loads((ROOT/world_manifest).read_text())
 record=next(r for r in wm['records'] if r['itemId']==robot) if robot else next(r for r in am['skins'] if r['avatarId']==role and r['skinId']==skin)
 candidates=[]
 def paths(x):
  if isinstance(x,dict):
   if 'path' in x:candidates.append('/'+x['path'].removeprefix('public/'))
   for k,v in x.items():
    if k!='blink':paths(v)
  elif isinstance(x,list):
   for v in x:paths(v)
 paths(record)
 if not robot and skin=='default':paths([r for r in am['baseDisplayVariants'] if r['avatarId']==role])
 for state in states:
  if not state:continue
  rows=state.get('imgs',state.get('images',[]));base=[i for i in rows if ('v6-ai-robot-art' in i['classes'] if robot else 'avatar-renderer-skin' in i['classes'])]
  if not base or any(unquote(urlsplit(i['src']).path) not in candidates for i in base):return False
 return True

async def main(a):
 out=Path(a.out);(ROOT/out).mkdir(parents=True,exist_ok=True)
 paths=[str(p.relative_to(ROOT)) for p in (ROOT/'src').rglob('*') if p.suffix in {'.ts','.tsx','.json','.css'}]
 pins={p:sha(p) for p in paths}; manifests={a.avatar_manifest:sha(a.avatar_manifest),a.world_manifest:sha(a.world_manifest)}
 cases=[]; failures=[]; errors=[]
 async with async_playwright() as pw:
  browser=await pw.chromium.launch()
  async def case(role='brother',skin='default',robot=None,mode='normal'):
   name=f'{robot or role}--{skin}--{mode}';print(name,flush=True)
   context=await browser.new_context(viewport={'width':900,'height':780},device_scale_factor=1,reduced_motion='reduce' if mode=='reduced' else 'no-preference')
   blocked=[];optional=[];motion_requests=[]
   async def route(r):
    u=r.request.url
    if 'blink' in u and '/assets/' in u:motion_requests.append(u)
    if '/api/' in u:blocked.append(u);await r.fulfill(status=403,body='synthetic isolated QA');return
    for suffix,path in ([] if a.formal else [('avatarAssetManifest.json',a.avatar_manifest),('worldArtManifest.json',a.world_manifest)]):
     if '/src/data/'+suffix in u:
      await r.fulfill(content_type='application/javascript',body='export default '+(ROOT/path).read_text());return
    if mode=='failed' and ('blink' in u and '/assets/' in u):optional.append(u);await r.abort();return
    await r.continue_()
   await context.route('**/*',route)
   page=await context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   await page.clock.install(time=__import__('datetime').datetime(2026,10,6,2,0,tzinfo=__import__('datetime').timezone.utc));await page.clock.pause_at(__import__('datetime').datetime(2026,10,6,2,0,0,100000,tzinfo=__import__('datetime').timezone.utc))
   url=f'http://127.0.0.1:5178/qa/v653/20261005/release-art/retained-motion/current-r1/index.html?role={role}&skin={skin}&mode={mode}'+(f'&robot={robot}' if robot else '')
   await page.goto(url);await page.wait_for_selector('#subject img',state='attached')
   await page.evaluate("async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))}")
   # Flush production resize/React work while images load independently of virtual timers.
   await page.clock.run_for(50);await asyncio.sleep(.25)
   await page.evaluate("async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))}")
   before=await page.evaluate(STATE)
   screenshots=[]
   if mode=='normal':
    f=str(out/(name+'--open.png'));await page.screenshot(path=str(ROOT/f));screenshots.append({'path':f,'sha256':sha(f),'frame':'open'})
   timeline=[];closed=None
   for _ in range(30):
    await page.clock.run_for(50);state=await page.evaluate(STATE);timeline.append(state['blink'])
    if state['blink'] and closed is None:
     closed=state
     f=str(out/(name+'--closed.png'));await page.screenshot(path=str(ROOT/f));screenshots.append({'path':f,'sha256':sha(f),'frame':'closed'})
   after=await page.evaluate(STATE)
   is_expected=mode=='normal' and skin=='default' and robot not in a.static_robots.split(',')
   okay=(closed is not None)==is_expected and not after['blink']
   # Base source and wearable layers must persist across frame swap, including full skins.
   def stable(s):return [(i['src'],i['rect']) for i in s['imgs'] if 'blink' not in i['classes']]
   okay=okay and stable(before)==stable(after) and (not closed or stable(before)==stable(closed))
   okay=okay and all(i['natural'][0]>0 for i in after['imgs'] if 'blink' not in i['classes'])
   if mode=='failed' and robot not in a.static_robots.split(','):okay=okay and bool(optional)
   if robot in a.static_robots.split(','):okay=okay and not motion_requests and not any('blink' in i['classes'] for i in after['imgs'])
   body_correct=body_source_correct([before,closed,after],role,skin,robot,a.avatar_manifest,a.world_manifest);okay=okay and body_correct
   if not okay:failures.append(name)
   row={'id':name,'role':role,'skin':skin,'robot':robot,'mode':mode,'passed':okay,'bodySourceCorrect':body_correct,'expectedBlink':is_expected,'before':before,'closed':closed,'after':after,'timeline':timeline,'screenshots':screenshots,'blockedAPIs':blocked,'failedOptionalRequests':optional,'motionAssetRequests':motion_requests}
   cases.append(row);save(str(out/'progress.json'),{'cases':cases,'failures':failures});await context.close()
  roles=['brother','younger','sister','younger-sister'];skins=['outfit-cadet','outfit-racer','outfit-mecha','outfit-ocean','outfit-mage','outfit-legend','sister-bloom-outfit']
  for role in roles:
   for mode in ['normal','reduced','disabled','offscreen','failed']:await case(role=role,mode=mode)
  for robot in ['robot-sky','robot-mecha','robot-legend']:
   for mode in ['normal','reduced','disabled','offscreen','failed']:await case(robot=robot,mode=mode)
  for role in roles:
   for skin in skins:await case(role=role,skin=skin)
  await browser.close()
 for p,h in pins.items():
  if sha(p)!=h:failures.append('source changed: '+p)
 result={'schemaVersion':1,'formal':a.formal,'status':'PASS_CURRENT_COMPONENT_RUNTIME' if not failures and not errors else 'FAIL','scope':'isolated production components; synthetic no family state; candidate manifest route only','clock':'Production 1100ms/110ms timers via Playwright clock, screenshot freezes time without altering component state/styles','createdEpoch':time.time(),'manifestPins':manifests,'sourcePins':pins,'harnessPins':{p:sha(p) for p in ['scripts/qa_v653_current_motion.py','qa/v653/20261005/release-art/retained-motion/current-r1/main.tsx']},'browserCount':1,'apiPolicy':'all /api requests blocked','cases':cases,'failures':failures,'pageErrors':errors}
 save(str(out/'runtime.json'),result);print(result['status'],len(cases),failures,errors)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--avatar-manifest',required=True);p.add_argument('--world-manifest',required=True);p.add_argument('--out',required=True);p.add_argument('--static-robots',default='');p.add_argument('--formal',action='store_true');asyncio.run(main(p.parse_args()))
