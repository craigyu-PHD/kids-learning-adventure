import argparse
parser=argparse.ArgumentParser()
parser.add_argument('--base',required=True)
parser.add_argument('--out',required=True)
from compiled_binding import arguments,Binding
arguments(parser)
args=parser.parse_args()
from urllib.parse import urlsplit as _split
if _split(args.base).hostname not in ['localhost','127.0.0.1']:parser.error('Only isolated localhost candidates are permitted')
import json,traceback
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();OUT=Path(args.out).resolve();OUT.mkdir(parents=True,exist_ok=False)
binding=Binding(args,OUT,__file__)
URL=args.base.rstrip('/')+'/';TIME={'now':'2026-09-17T06:00:00.000Z','activeDate':'2026-09-17','taipeiDate':'2026-09-17','taipeiTime':'14:00:00','timeZone':'Asia/Taipei'}
KEY='star-learning-v40:__local__:progress'
report={'scope':'Local synthetic empty-progress fixture; actual UI stage advancement/answer/mission completion; no seeded completions','profiles':[]}
import hashlib as _hashlib
_scope_before=['src/v4/LessonPreparation.tsx','src/v4/LessonQuest.tsx','src/styles/components/lesson.css','src/styles/components/speaking.css','src/v4/RewardModal.tsx','src/styles/components/reward.css']
(OUT/'scoped-source-before.json').write_text(json.dumps({f:_hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in _scope_before},indent=2)+'\n')
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True)
 try:
  for width,height,theme,motion in [(360,560,'dark','reduce')]:
   row={'width':width,'height':height,'theme':theme,'errors':[]};report['profiles'].append(row)
   c=b.new_context(viewport={'width':width,'height':height},reduced_motion=motion,color_scheme=theme,service_workers='block')
   def route(r):
    u=urlsplit(r.request.url)
    if u.path in ['/api/time','/api/server-time']:return r.fulfill(json=TIME)
    if u.hostname not in ['localhost','127.0.0.1'] or u.path.startswith('/api/'):return r.fulfill(status=503,body='isolated synthetic QA')
    return r.continue_()
   c.route('**/*',route);c.route_web_socket('**',lambda ws:None);p=c.new_page();binding.attach(p);p.set_default_timeout(18000);p.on('pageerror',lambda e:row['errors'].append(str(e)))
   try:
    s=json.loads((ROOT/'qa/v653/20261005/lessons/default-storage.json').read_text());settings=json.loads(s['star-learning-v40:__local__:settings']);settings['theme']=theme;settings['motionEffects']=motion!='reduce';settings['children'][0]['name']='哥哥長名字獎勵版面驗證';s['star-learning-v40:__local__:settings']=json.dumps(settings,ensure_ascii=False);s[KEY]='{}';s['little-explorers-v4-sound']='off'
    u=URL+'__qa_reward_seed__';p.route(u,lambda r:r.fulfill(content_type='text/html',body='<!doctype html><title>seed</title>'));p.goto(u);p.evaluate('(s)=>{localStorage.clear();for(const[k,v]of Object.entries(s))localStorage.setItem(k,v)}',s);p.unroute(u);p.goto(URL+'?day=day-14&lesson=1',wait_until='domcontentloaded');p.locator('.v4-quest-shell').wait_for();p.locator('.v4-stage-map button').nth(0).click()
    for cb in p.locator('.v64-daily-participants input').all():
     if not cb.is_checked():cb.check()
    row['initialProgress']=p.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)
    for st in range(6):p.get_by_role('button',name='下一關',exact=True).click()
    learner=p.locator('[data-quick-child="child-1"]');row['actualAnswers']=[]
    for option in learner.get_by_role('button').all():
     row['actualAnswers'].append(option.inner_text());option.click();p.wait_for_timeout(80)
     if 'correct' in learner.get_attribute('class'):break
    p.locator('.v4-mission-learners button').first.click();modal=p.locator('.v4-reward-modal');modal.wait_for(state='visible');p.wait_for_timeout(800)
    row['badgeInViewport']=p.locator('.v4-new-badge').evaluate('(e)=>{const r=e.getBoundingClientRect(),footer=document.querySelector(".v4-reward-continue").getBoundingClientRect();return {rect:r.toJSON(),footer:footer.toJSON(),visible:r.bottom<=footer.top&&r.top>=0}}')
    row['voices']=p.evaluate('()=>speechSynthesis.getVoices().map(v=>({name:v.name,lang:v.lang,localService:v.localService,default:v.default,voiceURI:v.voiceURI}))')
    row['modal']=modal.evaluate('e=>({text:e.innerText,box:e.getBoundingClientRect().toJSON(),overflow:e.scrollWidth-e.clientWidth,buttons:[...e.querySelectorAll("button")].map(b=>({text:b.innerText,w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height})),animations:e.getAnimations({subtree:true}).map(a=>({state:a.playState,name:a.animationName}))})')
    modal.screenshot(path=str(OUT/f'{width}-{theme}-modal.png'),animations='disabled');p.screenshot(path=str(OUT/f'{width}-{theme}-viewport.png'),full_page=False)
    row['afterReward']=p.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)
    p.locator('.v4-reward-continue').click();modal.wait_for(state='detached')
    row['unchangedAfterClose']=row['afterReward']==p.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)
    assert len(row['afterReward']['child-1']['completedMissions'])==1
    assert not row['afterReward'].get('child-2',{}).get('completedMissions')
    assert row['modal']['overflow']<=1 and all(b['w']>=44 and b['h']>=44 for b in row['modal']['buttons'])
    row['missionWrongRight']=any(e['correct'] is False for e in row['afterReward']['child-1']['answerEvents']) and any(e['correct'] is True for e in row['afterReward']['child-1']['answerEvents']);assert row['missionWrongRight'];assert row['badgeInViewport']['visible'];p.reload(wait_until='domcontentloaded');p.locator('.v4-quest-shell').wait_for();row['afterReload']=p.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY);row['rewardIdempotency']=row['unchangedAfterClose'] and row['afterReload']==row['afterReward'] and p.locator('.v4-reward-modal').count()==0;assert row['rewardIdempotency'] and not row['errors'];row['pass']=True
   except Exception as e:row.update(error=repr(e),traceback=traceback.format_exc(),passed=False)
   finally:c.close();(OUT/'result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 finally:b.close()
print(json.dumps([{k:v for k,v in r.items() if k not in ['afterReward','voices']} for r in report['profiles']],ensure_ascii=False,indent=2))

import hashlib as _hashlib
import sys as _sys
_scope=['src/v4/LessonPreparation.tsx','src/v4/LessonQuest.tsx','src/styles/components/lesson.css','src/styles/components/speaking.css','src/v4/RewardModal.tsx','src/styles/components/reward.css']
_meta={'base':URL,'browserClosed':True,'sourceAfter':{f:_hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in _scope},'note':'Source hashes require external compiled build binding; not release proof'}
_before=json.loads((OUT/'scoped-source-before.json').read_text())
_meta['sourceDrift']=[f for f,h in _before.items() if _meta['sourceAfter'].get(f)!=h]
(OUT/'candidate-meta.json').write_text(json.dumps(_meta,indent=2)+'\n')
_rows=report.get('profiles',report.get('primary',[])+report.get('navigation',[]))
report['flowCases']=[{'case':name,'passed':len(report['profiles'])==1 and all(r.get(key) is True and r.get('pass') is True for r in report['profiles'])} for name,key in [('mission-wrong-right','missionWrongRight'),('reward-idempotency','rewardIdempotency')]]
report['flowCases'].append({'case':'360x560-badge','passed':len(report['profiles'])==1 and all(r.get('badgeInViewport',{}).get('visible') is True and r.get('pass') is True for r in report['profiles'])})
(OUT/'result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
binding.finish()
_sys.exit(0 if _rows and all(r.get('pass') for r in _rows) and not _meta['sourceDrift'] and not report.get('sourceDrift',[]) else 1)
