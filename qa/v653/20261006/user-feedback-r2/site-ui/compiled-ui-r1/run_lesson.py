import argparse
parser=argparse.ArgumentParser()
parser.add_argument('--base',required=True)
parser.add_argument('--out',required=True)
from compiled_binding import arguments,Binding
arguments(parser)
args=parser.parse_args()
from urllib.parse import urlsplit as _split
if _split(args.base).hostname not in ['localhost','127.0.0.1']:parser.error('Only isolated localhost candidates are permitted')
import json,time,traceback,hashlib
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();OUT=Path(args.out).resolve();OUT.mkdir(parents=True,exist_ok=False)
binding=Binding(args,OUT,__file__)
URL=args.base.rstrip('/')+'/'
TIME={'now':'2026-09-17T06:00:00.000Z','activeDate':'2026-09-17','taipeiDate':'2026-09-17','taipeiTime':'14:00:00','timeZone':'Asia/Taipei'}
HEALTH='''()=>{const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};return {overflow:document.documentElement.scrollWidth-innerWidth,broken:[...document.querySelectorAll('main img')].filter(i=>visible(i)&&i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0&&(!i.complete||!i.naturalWidth)).map(i=>i.src),smallButtons:[...document.querySelectorAll('main button,main summary')].filter(visible).map(e=>({text:e.innerText,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(e=>e.w<43.5||e.h<43.5),cards:[...document.querySelectorAll('.v64-word-flip')].map(e=>{const b=e.getBoundingClientRect(),im=e.querySelector('img')?.getBoundingClientRect();return {box:b.toJSON(),image:im?.toJSON(),contained:!im||(im.left>=b.left-1&&im.right<=b.right+1&&im.top>=b.top-1&&im.bottom<=b.bottom+1)}})}}'''
def store(theme):
 s=json.loads((ROOT/'qa/v653/20261005/lessons/default-storage.json').read_text());settings=json.loads(s['star-learning-v40:__local__:settings']);settings['theme']=theme
 settings['children']=[{'id':'child-'+str(i+1),'name':name,'avatar':av,'role':'child','disabled':False} for i,(name,av) in enumerate([('哥哥','brother'),('弟弟','younger'),('姊姊長名字版面驗證','sister'),('妹妹','younger-sister')])]
 s['star-learning-v40:__local__:settings']=json.dumps(settings,ensure_ascii=False);s['star-learning-v40:__local__:progress']='{}';s['little-explorers-v4-sound']='off';return s
report={'scope':'supplied local candidate URL, isolated synthetic storage, blocked external/API network, stage layout inspection only; no reward completion seeded','profiles':[]}
import hashlib as _hashlib
_scope_before=['src/v4/LessonPreparation.tsx','src/v4/LessonQuest.tsx','src/styles/components/lesson.css','src/styles/components/speaking.css','src/v4/RewardModal.tsx','src/styles/components/reward.css']
(OUT/'scoped-source-before.json').write_text(json.dumps({f:_hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in _scope_before},indent=2)+'\n')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True)
 try:
  for width,theme in [(360,'light'),(390,'light'),(820,'light'),(1440,'light'),(390,'dark'),(1440,'dark'),(2560,'light')]:
   c=browser.new_context(viewport={'width':width,'height':900 if width>600 else 844},reduced_motion='reduce',color_scheme=theme,service_workers='block');row={'width':width,'theme':theme,'shots':[],'errors':[]};report['profiles'].append(row)
   def route(r):
    u=urlsplit(r.request.url)
    if u.path in ['/api/server-time','/api/time']:return r.fulfill(json=TIME)
    if u.path.startswith('/api/') or u.hostname not in ['127.0.0.1','localhost']:return r.fulfill(status=503,body='isolated layout QA')
    return r.continue_()
   c.route('**/*',route);c.route_web_socket('**',lambda ws:None);p=c.new_page();binding.attach(p);p.set_default_timeout(18000);p.on('pageerror',lambda e:row['errors'].append(str(e)))
   try:
    u=URL+'__qa_layout_seed__';p.route(u,lambda r:r.fulfill(content_type='text/html',body='<!doctype html><title>seed</title>'));p.goto(u);p.evaluate('(s)=>{localStorage.clear();for(const[k,v]of Object.entries(s))localStorage.setItem(k,v)}',store(theme));p.unroute(u);p.goto(URL,wait_until='domcontentloaded');p.locator('.v4-dashboard-grid').wait_for()
    p.screenshot(path=str(OUT/f'{width}-{theme}-home.png'),full_page=False)
    p.goto(URL+'?day=day-14&lesson=1',wait_until='domcontentloaded');p.locator('.v4-quest-shell').wait_for()
    # A real checkbox selection establishes only attendance. No completion or answers.
    p.locator('.v4-stage-map button').nth(0).click()
    for cb in p.locator('.v64-daily-participants input').all():
     if not cb.is_checked():cb.check()
    before=p.evaluate("localStorage.getItem('star-learning-v40:__local__:progress')")
    for st in [0,2,4,5,6,7,9]:
     p.locator('.v4-stage-map button').nth(st).click();p.locator('main').scroll_into_view_if_needed();p.evaluate('()=>document.fonts.ready');p.wait_for_timeout(250)
     for im in p.locator('main img').all():
      if im.is_visible():
       im.scroll_into_view_if_needed();
       try:im.evaluate('(i)=>i.complete&&i.naturalWidth>0 || new Promise(resolve=>{i.addEventListener("load",()=>resolve(true),{once:true});i.addEventListener("error",()=>resolve(false),{once:true});setTimeout(()=>resolve(false),2000)})')
       except:pass
     p.locator('main').scroll_into_view_if_needed();fn=f'{width}-{theme}-stage{st}.png';p.locator('main').screenshot(path=str(OUT/fn),animations='disabled');h=p.evaluate(HEALTH);row['shots'].append({'stage':str(st),'file':fn,'health':h,'healthy':h['overflow']<=1 and not h['smallButtons'] and not h['broken'] and all(k['contained'] for k in h['cards']),'interaction':p.locator('.v4-stage-map button').nth(st).get_attribute('aria-current')=='step'});print(width,theme,st,h['overflow'],h['smallButtons'],flush=True)
     if st==5:
      row['speakingLearnerCount']=p.locator('.speaking-practice-learners article').count();row['speakingFourChildren']=row['speakingLearnerCount']==4 and p.locator('.speaking-practice-learners article button').count()>=8;assert row['speakingFourChildren']
     if st==2:
      for card in p.locator('.v64-word-flip').all():card.click()
      p.locator('main').screenshot(path=str(OUT/f'{width}-{theme}-stage2-back.png'),animations='disabled');row['shots'].append({'stage':'2-back','file':f'{width}-{theme}-stage2-back.png','health':p.evaluate(HEALTH),'interaction':p.locator('.v64-word-flip').count()>0 and all(c.get_attribute('aria-pressed')=='true' for c in p.locator('.v64-word-flip').all())});back=row['shots'][-1];h=back['health'];back['healthy']=h['overflow']<=1 and not h['smallButtons'] and not h['broken'] and all(k['contained'] for k in h['cards'])
    after=p.evaluate("localStorage.getItem('star-learning-v40:__local__:progress')");row['progressUnchanged']=before==after
    row['pass']=not row['errors'] and row['progressUnchanged'] and all(x['health']['overflow']<=1 and not x['health']['smallButtons'] and not x['health']['broken'] and all(k['contained'] for k in x['health']['cards']) for x in row['shots'])
   except Exception as e:row.update(error=repr(e),traceback=traceback.format_exc(),passed=False)
   finally:c.close();(OUT/'result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 finally:browser.close()
print(json.dumps([{k:v for k,v in p.items() if k!='shots'} for p in report['profiles']],ensure_ascii=False,indent=2))

import hashlib as _hashlib
import sys as _sys
_scope=['src/v4/LessonPreparation.tsx','src/v4/LessonQuest.tsx','src/styles/components/lesson.css','src/styles/components/speaking.css','src/v4/RewardModal.tsx','src/styles/components/reward.css']
_meta={'base':URL,'browserClosed':True,'sourceAfter':{f:_hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in _scope},'note':'Source hashes require external compiled build binding; not release proof'}
_before=json.loads((OUT/'scoped-source-before.json').read_text())
_meta['sourceDrift']=[f for f,h in _before.items() if _meta['sourceAfter'].get(f)!=h]
(OUT/'candidate-meta.json').write_text(json.dumps(_meta,indent=2)+'\n')
_rows=report.get('profiles',report.get('primary',[])+report.get('navigation',[]))
report['flowCases']=[{'case':'speaking-four-children','passed':len(report['profiles'])==7 and all(r.get('speakingFourChildren') is True and r.get('pass') is True for r in report['profiles'])}]
(OUT/'result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
binding.finish()
_sys.exit(0 if _rows and all(r.get('pass') for r in _rows) and not _meta['sourceDrift'] and not report.get('sourceDrift',[]) else 1)
