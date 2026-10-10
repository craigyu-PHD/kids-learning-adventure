#!/usr/bin/env python3
"""B02 exact sealed art + two actual reviews + main AND supplemental acceptance."""
from __future__ import annotations
import copy,hashlib,importlib.util,json,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BATCH=ROOT/'qa/v65/art-workpacks/B02'; S=BATCH/'runtime-harness'; MANIFEST=ROOT/'src/data/avatarAssetManifest.json'; SEAL=S/'acceptance-seal-astra.json'
ITEMS=('outfit-mage','outfit-legend','sister-bloom-outfit');AVATARS=('brother','younger','sister','younger-sister');ROWS=tuple((i,a) for i in ITEMS for a in AVATARS)
MODES=((390,844,'light'),(390,844,'dark'),(1440,900,'light'),(1440,900,'dark'));EXTRAS=('glasses-holo','phones-ai')
BUILD=S/'candidate-dist-build.json';RUNTIME=S/'runtime-gate-report.json';SUPPLEMENT=S/'supplemental-cancel-achievements-report.json';NEGATIVE=S/'negative-controls-report.json';B01=ROOT/'qa/v65/art-workpacks/B01/promotion-report.json'
load=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def fingerprint(x):return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def bound(p):return {'path':str(p.relative_to(ROOT)),'sha256':sha(p)}
def candidate_path(i,a):return BATCH/f'fullskin-candidates/{a}/{i}.webp'
def candidate_hashes():return {f'{i}:{a}':sha(candidate_path(i,a)) for i,a in ROWS}
def source_snapshot():
 paths=set(load(SEAL)['sourceFiles']);paths.update(str(p.relative_to(ROOT)) for p in (ROOT/'src').rglob('*') if p.is_file())
 return {p:sha(ROOT/p) for p in sorted(paths) if (ROOT/p).is_file()}
def normalize(files):return {p:h for p,h in files.items() if Path(p).name!='.DS_Store'}
def metadata_delta(before,after):return [{'path':p,'beforeSha256':before.get(p),'afterSha256':after.get(p)} for p in sorted(set(before)|set(after)) if before.get(p)!=after.get(p) and Path(p).name=='.DS_Store']
def source_fingerprint():return fingerprint(normalize(source_snapshot()))
def art_digest():return fingerprint({'fullskins':candidate_hashes(),'brotherHolo':sha(ROOT/'public/assets/v6.5/runtime/brother/glasses-holo-b01-fit.webp')})
def exact(rows,fields,expected,e,label):
 keys=[tuple(tuple(r.get(k,[])) if k=='viewport' else r.get(k) for k in fields) for r in rows]
 if len(keys)!=len(expected) or set(keys)!=set(expected) or len(set(keys))!=len(keys):e.append(label+': exact coverage')
def shot(x,e):
 p=ROOT/str(x.get('path',''))
 if not p.is_file() or sha(p)!=x.get('sha256'):e.append('screenshot SHA mismatch '+str(x.get('path')))
def state_errors(s,i,a,surface,extra=None,promoted=False):
 e=[];expected=f'/assets/v6.5/{"runtime" if promoted else "art-candidates/B02"}/{a}/{i}.webp'
 required={i}|({extra} if extra else set())
 if s.get('avatar')!='avatar-'+a or s.get('artMode')!='runtime' or not required.issubset(s.get('rendered',[])) or not required.issubset(s.get('cosmetics',[])):e.append(surface+': wrong identity/items')
 ims=s.get('images',[]);bases=[x for x in ims if x.get('isBase')]
 if len(bases)!=1:return e+[surface+': base count']
 base=bases[0]
 if not base.get('src','').split('?')[0].endswith(expected):e.append(surface+': actual base path')
 for im in ims:
  if not all(im.get(k) is True for k in ('complete','decoded','visible')) or (im.get('nw'),im.get('nh'))!=(1024,1536) or im.get('objectFit')!='contain' or im.get('objectPosition')!='50% 50%':e.append(surface+': image/decode/canvas')
 if extra:
  layers=[x for x in ims if x.get('itemId')==extra]
  if len(layers)!=1:return e+[surface+': accessory count']
  overlay=layers[0]; suffix='glasses-holo-b01-fit' if promoted and (a,extra)==('brother','glasses-holo') else extra
  path=f'/assets/v6.5/runtime/{a}/{suffix}.webp'
  if not promoted and (a,extra)==('brother','glasses-holo'):path='/assets/v6.5/art-candidates/B02-compat/brother/glasses-holo.webp'
  if not overlay.get('src','').split('?')[0].endswith(path):e.append(surface+': accessory actual path')
  # Both contain canvases have identical 2:3 natural size; rect + fit/position thus determine painted canvas exactly.
  if any(abs(base.get('rect',{}).get(k,-999)-overlay.get('rect',{}).get(k,999))>.5 for k in ('x','y','width','height')) or base.get('transform')!=overlay.get('transform'):e.append(surface+': painted canvas/transform mismatch')
 return e

def runtime_errors(r,s,promoted=False):
 e=[];expected=[(i,a,(w,h),t) for i,a in ROWS for w,h,t in MODES]
 for d,label in ((r,'main'),(s,'supplement')):
  if d.get('status')!='PASS_TECHNICAL_CAPTURE_ONLY' or d.get('bindingErrors'):e.append(label+': status/binding')
  exact(d.get('rows',[]),('itemId','avatarId','viewport','theme'),expected,e,label)
  for row in d.get('rows',[]):
   i,a=row['itemId'],row['avatarId'];states=row.get('states',{})
   if row.get('pass') is not True or row.get('errors'):e.append(label+': failed case')
   keys=('shopTrial','shopEquipped','home','homeAfterReload') if label=='main' else ('trial','cancelled','retryEquipped','achievements')
   if set(states)!=set(keys):e.append(label+': state coverage')
   for key in keys:
    st=states.get(key,{})
    if key!='cancelled':e+=state_errors(st,i,a,label+':'+key,promoted=promoted)
    else:
     ims=[x for x in st.get('images',[]) if x.get('isBase')]
     if st.get('avatar')!='avatar-'+a or i in st.get('cosmetics',[]) or i in st.get('rendered',[]) or len(ims)!=1 or not ims[0].get('src','').split('?')[0].endswith(f"/assets/v6.4/avatar-display/{a}/base-body-{192 if row['viewport'][0]==390 else 384}.webp"):e.append('cancelled: wrong restored base')
     if promoted and (not ims or not all(ims[0].get(k) is True for k in ('complete','decoded','visible')) or min(ims[0].get('nw',0),ims[0].get('nh',0))<=0):e.append('cancelled: fresh decode/visible failed')
   if label=='main':
    stability=row.get('staticStability',{});samples=stability.get('samples',[])
    if stability.get('pass') is not True or len(samples)!=3 or not samples[0]==samples[1]==samples[2]:e.append('main stability')
   expected_shots={'shop','home'} if label=='main' else {'cancelled','achievements'}
   if set(row.get('screenshots',{}))!=expected_shots:e.append(label+': screenshot coverage')
   for x in row.get('screenshots',{}).values():shot(x,e)
 exact(r.get('compatibilityCases',[]),('itemId','avatarId','viewport','theme','accessoryId'),[(*x,z) for x in expected for z in EXTRAS],e,'compatibility')
 for row in r.get('compatibilityCases',[]):
  if row.get('pass') is not True or row.get('errors'):e.append('compatibility failed')
  e+=state_errors(row.get('state',{}),row['itemId'],row['avatarId'],'compatibility',row['accessoryId'],promoted)
  st=row.get('staticStability',{});samples=st.get('samples',[])
  if st.get('pass') is not True or len(samples)!=3 or not samples[0]==samples[1]==samples[2]:e.append('compatibility stability')
  shot(row.get('screenshot',{}),e)
 return e

def fresh_negatives(r):
 # Run the frozen original detector in memory, with its original candidate path contract.
 spec=importlib.util.spec_from_file_location('b02_sealed_support',S/'runtime_support.py');support=importlib.util.module_from_spec(spec);spec.loader.exec_module(support)
 previous=sys.modules.get('runtime_support');sys.modules['runtime_support']=support
 try:
  spec=importlib.util.spec_from_file_location('b02_negative',S/'test-negative-controls.py');n=importlib.util.module_from_spec(spec);spec.loader.exec_module(n)
 finally:
  if previous is None:sys.modules.pop('runtime_support',None)
  else:sys.modules['runtime_support']=previous
 def wrong(x):x['rows'][0]['states']['home']['avatar']='avatar-younger-sister'
 def missing(x):x['rows'][0]['states']['home']['images']=[]
 def swapped(x):x['rows'][0]['itemId']='outfit-legend'
 def stale(x):x['rows'][0]['screenshots']['home']['sha256']='0'*64
 return n.validate(r),[n.mutation(name,r,fn) for name,fn in [('wrong-avatar-candidate',wrong),('missing-layer',missing),('swapped-item',swapped),('stale-candidate-screenshot',stale)]]

def visual_errors(astra,sol,supp,b,r,s):
 e=[]
 if astra.get('model')!='gpt-6-astra' or astra.get('reviewerAgentId')!='/root/astra_scope' or astra.get('promptVersion')!='b02-item-specific-main-and-supplement-v1':e.append('Astra reviewer identity')
 if astra.get('candidateHashes')!=b['candidateHashes'] or astra.get('distFingerprint')!=b['distFingerprint'] or astra.get('sourceFingerprint')!=b['rootSourceStartFingerprint']:e.append('Astra same candidate binding')
 for n in ('candidate-dist-build.json','runtime-gate-report.json','supplemental-cancel-achievements-report.json','negative-controls-report.json'):
  if astra.get('boundReports',{}).get(n)!=bound(S/n):e.append('Astra bound '+n)
 for review,label in ((astra,'Astra'),(sol,'Sol')):
  if review.get('status')!='PASS_QA_CANDIDATE_ONLY':e.append(label+': overall verdict')
  exact(review.get('rows',[]),('itemId','avatarId'),ROWS,e,label)
  for x in review.get('rows',[]):
   i,a=x['itemId'],x['avatarId']
   if x.get('verdict')!='PASS_ACTUAL_VISUAL_QA_ONLY':e.append(label+': row verdict')
   if label=='Sol':
    if not x.get('review') or x.get('board')!=bound(S/f'visual-review-boards/{i}__{a}.jpg'):e.append('Sol row evidence')
   else:
    expected=[]
    for case in r['rows']+s['rows']:
     if (case['itemId'],case['avatarId'])==(i,a):expected+=list(case['screenshots'].values())
    expected += [c['screenshot'] for c in r['compatibilityCases'] if (c['itemId'],c['avatarId'])==(i,a)]
    if x.get('visuallyInspected') is not True or x.get('reviewedPanelCount')!=24 or x.get('defects') or not x.get('observations') or x.get('reviewedScreenshots')!=expected:e.append('Astra row judgment/screenshots')
    if x.get('boards')!=[bound(S/f'{folder}/{i}__{a}.jpg') for folder in ('visual-review-boards','supplemental-visual-boards')]:e.append('Astra boards')
 if sol.get('sourceLineage',{}).get('candidateHashes')!=b['candidateHashes'] or sol.get('technicalEvidence',{}).get('runtimeReport')!={'path':str(RUNTIME.relative_to(ROOT)),'sha256':sha(RUNTIME),'status':'PASS_TECHNICAL_CAPTURE_ONLY','mainCases':48,'compatibilityCases':96,'mainStaticStable':48,'compatibilityStaticStable':96}:e.append('Sol main binding')
 boards=supp.get('reviewBoards',[])
 if supp.get('status')!='PASS_QA_CANDIDATE_ONLY' or supp.get('technicalCases')!={'passed':48,'total':48} or len(boards)!=12:e.append('Sol supplement status/count')
 if {x.get('path') for x in boards}!={str((S/f'supplemental-visual-boards/{i}__{a}.jpg').relative_to(ROOT)) for i,a in ROWS}:e.append('Sol supplement exact boards')
 for x in boards:
  shot(x,e)
  if x.get('verdict')!='PASS':e.append('Sol supplement verdict')
 return e

def run():
 e=[];ve=[];out={'schemaVersion':1,'suite':'v65-b02-strict-acceptance','promotionReady':False,'technicalEvidenceOnly':False,'createdAt':time.strftime('%Y-%m-%dT%H:%M:%S%z')}
 try:
  seal=load(SEAL)
  for p,h in seal['evidenceHashes'].items():
   if sha(ROOT/p)!=h:e.append('sealed evidence drift '+p)
  current=source_snapshot()
  if normalize(current)!=normalize(seal['sourceFiles']):e.append('exact B01-promoted source drift')
  out['sourceMetadataOnlyDeltas']=metadata_delta(seal['sourceFiles'],current)
  b01=load(B01)
  for x in b01['copies']:
   if sha(ROOT/x['destination'])!=x['sha256'] or sha(ROOT/x['source'])!=x['sha256']:e.append('B01 promoted bytes drift')
  for path,h in normalize(b01['protectedHashes']).items():
   if not (ROOT/path).is_file() or sha(ROOT/path)!=h:e.append('B01 protected bytes drift '+path)
  if sha(B01)!=seal['b01PromotionReportSha256'] or sha(MANIFEST)!=seal['manifestBeforeSha256']:e.append('B01 promotion / manifest boundary')
  b,r,s,n=map(load,(BUILD,RUNTIME,SUPPLEMENT,NEGATIVE)); hashes=candidate_hashes()
  if hashes!=b['candidateHashes'] or hashes!=seal['candidateHashes']:e.append('candidate hash drift')
  if art_digest()!=seal['artDigest']:e.append('art digest drift')
  if b.get('status')!='PASS' or b.get('candidateOnly') is not True or b.get('buildExitCode')!=0 or b.get('sharedSrcWritten') is not False or b.get('sharedPublicWritten') is not False:e.append('candidate build contract')
  files={str(p.relative_to(S/'candidate-dist')):sha(p) for p in sorted((S/'candidate-dist').rglob('*')) if p.is_file()}
  if normalize(files)!=normalize(b.get('distFiles',{})):e.append('sealed dist drift')
  out['distMetadataOnlyDeltas']=metadata_delta(b.get('distFiles',{}),files)
  out['normalizedDistFingerprint']=fingerprint(normalize(files))
  out['currentRawDistFingerprint']=fingerprint(files)
  if r.get('buildReportSha256')!=sha(BUILD) or s.get('sealedDistBuildReportSha256')!=sha(BUILD):e.append('runtime/supplement build binding')
  e+=runtime_errors(r,s);be,fresh=fresh_negatives(r);e+=be;out['freshNegativeControls']=fresh
  names={x['name'] for x in fresh}
  if n.get('status')!='PASS' or n.get('baselineIntegrityPass') is not True or n.get('baselineErrors') or len(n.get('cases',[]))!=4 or {x.get('name') for x in n.get('cases',[])}!=names or any(x.get('actual')!='REJECT' or x.get('expected')!='REJECT' or not x.get('detectedErrors') for x in n.get('cases',[])) or any(x['actual']!='REJECT' for x in fresh):e.append('negative controls rejected')
  ve+=visual_errors(load(S/'actual-visual-review-astra.json'),load(S/'actual-visual-review.json'),load(S/'supplemental-cancel-achievements-visual-review.json'),b,r,s)
  out.update({'candidateHashes':hashes,'artDigest':art_digest(),'currentSourceFingerprint':fingerprint(normalize(current)),'currentRawSourceFingerprint':fingerprint(current),'sealedRawSourceFingerprint':seal['sourceFingerprint'],'runtimeReportSha256':sha(RUNTIME),'supplementReportSha256':sha(SUPPLEMENT),'negativeReportSha256':sha(NEGATIVE),'sealSha256':sha(SEAL),'coverage':{'main':48,'supplement':48,'compatibility':96},'historicalCancelledDecodeUnprovenCases':sum(not all(x.get(k) is True for k in ('complete','decoded')) for row in s['rows'] for x in row['states']['cancelled']['images'] if x.get('isBase')),'requiredPostGate':'Fresh decode after cancel; 48 main +48 supplemental +96 compatibility +4 negatives; fresh visual review required.'})
 except Exception as x:e.append(f'{type(x).__name__}: {x}')
 out.update({'structuralErrors':e,'visualErrors':ve,'promotionReady':not e and not ve});return out
if __name__=='__main__':
 r=run();(S/'acceptance-integrity-astra.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps(r,ensure_ascii=False,indent=2));raise SystemExit(0 if r['promotionReady'] else 1)
