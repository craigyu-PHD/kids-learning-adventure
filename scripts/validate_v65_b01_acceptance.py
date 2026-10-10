#!/usr/bin/env python3
"""B01 round2 same-art acceptance; only a sealed two-file course delta is allowed."""
from __future__ import annotations
import copy, hashlib, importlib.util, json, sys, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BATCH=ROOT/'qa/v65/art-workpacks/B01'; S=BATCH/'round2/scripts'; OUT=S/'acceptance-integrity.json'
sys.path.insert(0,str(S))
_spec=importlib.util.spec_from_file_location('b01_sealed_support',S/'runtime_support.py')
support=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(support)
ROWS=support.ROWS; AVATARS=support.AVATARS
DIST=S/'candidate-dist-build.json'; RUNTIME=S/'runtime/all-role-integrated-runtime-gate.json'; NEGATIVE=S/'runtime/negative-controls.json'; COMPAT=S/'compatibility/report.json'; STATIC=S/'static-stability/report.json'
MANIFEST=ROOT/'src/data/avatarAssetManifest.json'
ALLOWED_COURSE_SHA={'src/data/curriculum.ts':'01db572e24a879b6c698a01a04fe758c3d30d8e117ae3ace0f2ce8919924ebc2','src/data/videos.ts':'9e3045f635265ab5052007fd1ab83a7152dd8c9b4303fc05161702c7fb7b8270'}
FROZEN_SCRIPT_SHA={'runtime_support.py': '3b88dcc5782c58cf4739d932195f64301d1c6ea38088dfbe3e91782794212e58', 'run-candidate-runtime-gate.py': '54d58ed4ef2f7318e3928d18f7f886b6e1b4929c5344f2762579d0dd9aa3ff11', 'run-compatibility-fit.py': '2bd31bb6dc496e1248b961b4140c21a71f8425913b45082b1e888c4a5e2beb30', 'run-static-stability.py': 'd4aee7ee2cb3499b2d98423ac21ea82956dedf81d4355a91464022b5aa530c43', 'test-negative-controls.py': '8c62e683fe3dcc8584554982ebcba87962cde7792fc0744033d1573e24ebe4ce'}
sha=support.sha_file;fingerprint=support.fingerprint
load=lambda p:json.loads(p.read_text())
def module(name,path):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m

def source_snapshot():
 old=load(S/'pipeline-preflight.json')['sourceFiles'];paths=set(old)
 paths.update(str(p.relative_to(ROOT)) for p in (ROOT/'src').rglob('*') if p.is_file())
 return {p:sha(ROOT/p) for p in sorted(paths) if (ROOT/p).is_file()}
def source_errors(current):
 old=load(S/'pipeline-preflight.json')['sourceFiles'];e=[]
 if set(current)!=set(old):e.append('source file set changed')
 for p,h in old.items():
  if current.get(p)!=ALLOWED_COURSE_SHA.get(p,h):e.append('unapproved source SHA '+p)
 return e

def art_digest():return fingerprint({'fullskins':support.current_candidate_hashes(),'brotherHolo':sha(support.HOLO_CANDIDATE_PATH),'protectedK':sha(support.PROTECTED_K_PATH)})
def bound(p):return {'path':str(p.relative_to(ROOT)),'sha256':sha(p)}
def shot_bind(v,e,label):
 p=ROOT/str(v.get('path',''))
 if not p.is_file() or v.get('sha256')!=sha(p):e.append(label+': screenshot/file SHA mismatch')
def keyed(rows,fields,expected,e,label):
 keys=[tuple(r.get(k) for k in fields) for r in rows]
 if len(keys)!=len(expected) or set(keys)!=set(expected) or len(set(keys))!=len(keys):e.append(label+': exact row coverage mismatch')
 return dict(zip(keys,rows))
def visual_errors(d,model,agent,build,runtime,compat,static):
 e=[];tag=model
 if d.get('model')!=model or d.get('reviewerAgentId')!=agent or d.get('reviewerPromptVersion')!='b01-round2-item-specific-v1':e.append(tag+': reviewer identity/prompt')
 for k in ('workspaceSourceFingerprint','distFingerprint'):
  if d.get(k)!=build.get(k):e.append(tag+': '+k)
 if d.get('rootSourceFingerprint')!=build['rootSourceStartFingerprint'] or d.get('holoDerivativeSha256')!=support.HOLO_CANDIDATE_SHA:e.append(tag+': source/art mismatch')
 if d.get('candidateFingerprint')!=build['workspaceSourceFingerprint']:e.append(tag+': candidate binding mismatch')
 for k,p in [('preflight',S/'pipeline-preflight.json'),('build',DIST),('runtime',RUNTIME),('negativeControls',NEGATIVE),('compatibility',COMPAT),('staticStability',STATIC)]:
  if d.get('boundReports',{}).get(k)!=bound(p):e.append(tag+': bound report '+k)
 rs=keyed(d.get('runtimeRows',[]),('itemId','avatarId'),ROWS,e,tag+' runtime')
 modes={(390,'light'),(390,'dark'),(1440,'light'),(1440,'dark')}
 for (item,a),r in rs.items():
  if r.get('visuallyInspected') is not True or r.get('deterministicDecision')!='PASS' or r.get('blockingIssues') or not r.get('rationale'):e.append(tag+': runtime judgment '+str((item,a)))
  if r.get('reviewedPanelCount')!=16:e.append(tag+': not 16 panels')
  expected_board=S/f'runtime/runtime-visual-review-boards/{item}__{a}.jpg'
  if r.get('board')!=bound(expected_board):e.append(tag+': runtime board')
  actual=r.get('reviewedScreenshots',[]); expected={}
  for w,t in modes:
   h=844 if w==390 else 900
   for surface in ('shop-trial','shop-equipped','home','achievements'):
    p=S/f'runtime/{item}/{a}/integrated-runtime-capture/{w}x{h}-{t}-{surface}.png';expected[str(p.relative_to(ROOT))]=sha(p)
  if model=='gpt-6-astra':
   got={x.get('path'):x.get('sha256') for x in actual}
   if len(actual)!=16 or got!=expected:e.append(tag+': runtime screenshot set/SHA')
  else:
   if len(actual)!=4 or {(x.get('viewport',[None])[0],x.get('theme')) for x in actual}!=modes:e.append(tag+': runtime screenshot modes')
   for x in actual:
    w,h=x['viewport'];t=x['theme']
    for key,surf in [('shopTrialSha256','shop-trial'),('shopEquippedSha256','shop-equipped'),('homeSha256','home'),('achievementsSha256','achievements')]:
     p=str((S/f'runtime/{item}/{a}/integrated-runtime-capture/{w}x{h}-{t}-{surf}.png').relative_to(ROOT))
     if x.get(key)!=expected[p]:e.append(tag+': runtime screenshot SHA')
 cs=keyed(d.get('compatibilityRows',[]),('itemId','avatarId','coEquippedItemId'),[(i,a,x) for i,a in ROWS for x in ('glasses-holo','phones-ai')],e,tag+' compat')
 for k,r in cs.items():
  i,a,x=k
  if r.get('visuallyInspected') is not True or r.get('deterministicDecision')!='PASS' or r.get('blockingIssues') or not r.get('rationale'):e.append(tag+': compatibility judgment')
  if r.get('board')!=bound(S/f'visual-review-boards/compat__{i}__{a}.jpg') or r.get('reviewedScreenshot')!=bound(S/f'compatibility/{i}__{a}__{x}.png'):e.append(tag+': compatibility evidence')
 ss=keyed(d.get('staticRows',[]),('itemId','avatarId'),[(i,a) for a in AVATARS for i in support.ITEMS],e,tag+' static')
 for k,r in ss.items():
  i,a=k;protected=k==support.PROTECTED_K
  if not r.get('visuallyInspected') or r.get('byteIdenticalT0T1550') is not True or r.get('blockingIssues'):e.append(tag+': static judgment')
  if protected:
   # Sol originally scoped PASS to static comparison. Never treat it as product visual acceptance.
   if model=='gpt-6-astra' and (r.get('deterministicDecision')!='PASS_STATIC_ONLY' or r.get('productVisualDecision')!='NOT_ACCEPTED_OUT_OF_SCOPE_EXISTING_DEFECT'):e.append(tag+': protected K scope lost')
   if model=='gpt-5.6-sol' and r.get('deterministicDecision') not in ('PASS','PASS_STATIC_ONLY'):e.append(tag+': K static not pass')
  elif r.get('deterministicDecision')!='PASS':e.append(tag+': candidate static not pass')
  if r.get('board')!=bound(S/f'visual-review-boards/static__{a}.jpg'):e.append(tag+': static board')
  if r.get('reviewedScreenshots')!={t:bound(S/f'static-stability/{i}__{a}__{t}.png') for t in ('t0','t1550')}:e.append(tag+': static screenshots')
 ds=keyed(d.get('defaultBlinkControls',[]),('avatarId',),[(a,) for a in AVATARS],e,tag+' blink')
 for (a,),r in ds.items():
  if not r.get('visuallyInspected') or r.get('deterministicDecision')!='PASS' or r.get('blockingIssues'):e.append(tag+': blink judgment')
  if r.get('board')!=bound(S/'visual-review-boards/default-blink-controls.jpg') or r.get('reviewedScreenshots')!={t:bound(S/f'static-stability/default__{a}__{t}.png') for t in ('open','blink')}:e.append(tag+': blink evidence')
 return e

def fresh_negative_cases(neg,runtime,compat):
 def wrong(x):x['rows'][0]['avatarId']='brother'
 def missing(x):x['rows'][0]['cases'][0]['states']['shopTrial']['rendered']=[]
 def swapped(x):x['rows'][0]['itemId']='outfit-ocean'
 def stale(x):x['rows'][0]['cases'][0]['screenshots']['home']='0'*64
 cases=[neg.mutation(n,runtime,f) for n,f in [('wrong-avatar',wrong),('missing-layer',missing),('swapped-item',swapped),('stale-candidate',stale)]]
 bad=copy.deepcopy(compat);bad['holoCandidateSha256']='0'*64;e=neg.validate_holo_compat(bad)
 cases.append({'case':'stale-holo-derivative','expected':'REJECT','actual':'REJECT' if e else 'ACCEPT','errors':e})
 return cases

def run():
 e=[];ve=[];result={'schemaVersion':1,'suite':'v65-b01-acceptance','createdAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'promotionReady':False,'protectedKProductVisualPass':False,'protectedKScope':'STATIC_ONLY_EXISTING_VISUAL_DEFECT'}
 try:
  for n,h in FROZEN_SCRIPT_SHA.items():
   if sha(S/n)!=h:e.append('frozen runner changed '+n)
  build,runtime,negative,compat,static=map(load,(DIST,RUNTIME,NEGATIVE,COMPAT,STATIC))
  e+=source_errors(source_snapshot());e+=support.verify_dist_report(build)
  if sha(support.PROTECTED_K_PATH)!=support.PROTECTED_K_SHA or sha(support.HOLO_SOURCE_PATH)!=support.HOLO_SOURCE_SHA:e.append('K/original B08 bytes changed')
  neg=module('b01_negative_readonly',S/'test-negative-controls.py');e+=neg.validate(runtime)+neg.validate_holo_compat(compat)
  fresh=fresh_negative_cases(neg,runtime,compat)
  result['freshNegativeControls']=fresh
  if any(x['actual']!='REJECT' for x in fresh):e.append('fresh synthetic negative control accepted')
  for row in runtime.get('rows',[]):
   for c in row.get('cases',[]):
    state=c.get('states',{}).get('shopCancelled',{})
    if state.get('avatar')!='avatar-'+row['avatarId'] or row['itemId'] in state.get('cosmetics',[]) or row['itemId'] in state.get('rendered',[]):e.append('cancelled runtime state invalid')
    e+=support.image_state_errors(state,row['itemId'],row['avatarId'],'cancel',False)
  expected_cases={'wrong-avatar','missing-layer','swapped-item','stale-candidate','stale-holo-derivative'}
  if negative.get('status')!='PASS' or negative.get('baselineIntegrityPass') is not True or negative.get('baselineErrors') or len(negative.get('cases',[]))!=5 or {x.get('case') for x in negative.get('cases',[])}!=expected_cases or any(x.get('expected')!='REJECT' or x.get('actual')!='REJECT' or not x.get('errors') for x in negative.get('cases',[])):e.append('failed/missing negative controls')
  keys=keyed(compat.get('rows',[]),('itemId','avatarId','coEquippedItemId'),[(i,a,x) for i,a in ROWS for x in ('glasses-holo','phones-ai')],e,'technical compat')
  if compat.get('status')!='PASS_TECHNICAL_ONLY' or compat.get('bindingErrors'):e.append('compatibility failed')
  for k,r in keys.items():
   i,a,x=k
   if r.get('pass') is not True or r.get('errors'):e.append('compat failure '+str(k))
   e+=support.image_state_errors(r.get('state',{}),i,a,'compat')
   shot_bind(r.get('screenshot',{}),e,'compat')
   images=r.get('state',{}).get('images',[]);base=next((im for im in images if im.get('isBase')),{});extras=[im for im in images if im.get('itemId')==x]
   expected='/'+support.holo_candidate_url().removeprefix('public/') if (a,x)==('brother','glasses-holo') else f'/assets/v6.5/runtime/{a}/{x}.webp'
   if len(extras)!=1 or expected not in extras[0].get('src','') or extras[0].get('decoded') is not True or extras[0].get('visible') is not True:e.append('compat actual extra missing/undecoded')
   elif any(abs(extras[0].get(field,{}).get(n,-999)-base.get(field,{}).get(n,999))>.5 for field in ('painted','rect') for n in ('x','y','width','height')):e.append('compat painted canvas drift')
  if static.get('status')!='PASS_CAPTURE_ONLY' or static.get('distReportSha256')!=sha(DIST) or static.get('bindingErrors'):e.append('static binding/status')
  sk=keyed(static.get('staticRows',[]),('itemId','avatarId'),[(i,a) for a in AVATARS for i in support.ITEMS],e,'technical static')
  dk=keyed(static.get('defaultBlinkControls',[]),('avatarId',),[(a,) for a in AVATARS],e,'technical blink')
  for k,r in [*sk.items(),*dk.items()]:
   if r.get('pass') is not True or r.get('errors'):e.append('static/blink recorded failure '+str(k))
   for s in r.get('screenshots',{}).values():shot_bind(s,e,'static/blink')
  for k,r in sk.items():
   st=r.get('state',{})
   if st.get('baseSrcT0')!=st.get('baseSrcT1550') or st.get('blinkFrameCountT1550')!=0 or st.get('visibleMotionCountT1550')!=0 or st.get('screenshotBytesIdentical') is not True:e.append('static unstable '+str(k))
  for model,agent,n in [('gpt-5.6-sol','/root/sol_racer_art','sol'),('gpt-6-astra','/root/astra_scope','astra')]:ve+=visual_errors(load(S/f'actual-visual-review-{n}.json'),model,agent,build,runtime,compat,static)
  result.update({'candidateHashes':support.current_candidate_hashes(),'candidateFingerprint':art_digest(),'artDigest':art_digest(),'runtimeReportSha256':sha(RUNTIME),'negativeReportSha256':sha(NEGATIVE),'allowedCourseSourceDelta':ALLOWED_COURSE_SHA,'currentSourceFingerprint':fingerprint(source_snapshot()),'sealedSourceFingerprint':build['rootSourceEndFingerprint'],'distFingerprint':build['distFingerprint']})
 except Exception as x:e.append(type(x).__name__+': '+str(x))
 result.update({'structuralErrors':e,'visualErrors':ve,'sameCandidatePass':not e,'visualPass':not ve,'promotionReady':not e and not ve,'visualComplete':not ve})
 OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');return result
if __name__=='__main__':
 r=run();print(json.dumps(r,ensure_ascii=False,indent=2));raise SystemExit(0 if r['promotionReady'] else 1)
