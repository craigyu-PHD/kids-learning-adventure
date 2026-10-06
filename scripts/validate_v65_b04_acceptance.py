#!/usr/bin/env python3
"""Strict B04 sealed-candidate acceptance. Requires root and Sol visual evidence."""
from __future__ import annotations
import hashlib,json,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
import validate_v65_b03_acceptance as predecessor
import promote_v65_b03 as b03p
BATCH=ROOT/'qa/v65/art-workpacks/B04';S=BATCH/'full-candidate-runtime';MANIFEST=ROOT/'src/data/avatarAssetManifest.json'
BUILD=S/'candidate-dist-build.json';RUNTIME=S/'runtime-gate-report.json';CAPE=S/'cape-compat-report.json';NEGATIVE=S/'negative-controls-report.json'
SOL=S/'actual-visual-review-sol.json';ROOT_REVIEW=S/'actual-visual-review-root.json';SUMMARY=S/'runtime-completion-summary.json'
B02_REPORT=ROOT/'qa/v65/art-workpacks/B02/promotion-report.json';K_REPORT=ROOT/'qa/v65/art-workpacks/B01/retained-cadet-repair/promotion-report.json'
BOUNDARY=ROOT/'qa/v65/art-workpacks/B03/boundary-after-k/boundary-seal.json'
B03_REPORT=ROOT/'qa/v65/art-workpacks/B03/promotion-report.json'
B03_POST=ROOT/'qa/v65/art-workpacks/B03/post-promotion/completion-summary.json'
B03_VISUAL=ROOT/'qa/v65/art-workpacks/B03/post-promotion/fresh-visual-review-root.json'
B03_OVERSIGHT=ROOT/'qa/v65/art-workpacks/B03/oversight-astra/final-oversight.json'
B06_BOUNDARY=BATCH/'authorized-b06-boundary.json'
ITEMS=('pack-ocean','pack-legend','sister-comet-pack');AVATARS=('brother','younger','sister','younger-sister');LAYERS=('back','front')
ROWS=tuple((i,a) for i in ITEMS for a in AVATARS);MODES=((390,844,'light'),(390,844,'dark'),(1440,900,'light'),(1440,900,'dark'))
SEALED={
 'candidate-dist-build.json':'7488e89b65eef6684632ef8eda7abceaed24ccca4378a00241a274e3b6e78091',
 'runtime-gate-report.json':'6f83502a4ec43847c6ce02122bb0fddb801fcd42171ac8b4268669e5396c6301',
 'cape-compat-report.json':'147f34409dba8be7c4c33128b4441aa6f16786e77ef09b68aa98a74a92eab6d3',
 'negative-controls-report.json':'6d798e9596eb74f9fe5b62efbb7ee4a1ac24dc8a35a2d6ec73b6b046012c29be',
 'actual-visual-review-sol.json':'b84ce092b54741e765d69851e86ceb529c93ae529302845884cdbeff88846e01',
 'actual-visual-review-root.json':'437d0f977bbe9a59b505f4ee60625ef42f82351fc544c114bc97cbe7f33a258e',
 'runtime-completion-summary.json':'a587ffede2e54a0eb474e48a9fab5752e3e6f6285d5ff72d9c661d9e43193f30',
}
BOUNDARY_SHA256='465372b559f6ba57c63f3b98eb284e5768bedd71003495c77c36e81fb8166450'
B03_REPORT_SHA256='bf74befeb887dc5983ad838b1e3fd97d2b4ba37241f281e47c465a1b8eeb35e3'
B03_MANIFEST_SHA256='d6d8563e3c410a8b230ba923f3f67eb7ca0381658d3196e7e30010cbbcf60d29'
B03_POST_SHA256='45a35fdc3320e598d5c96c6159d212655f34f5cb1f93f51e969d5ed0954a31ba'
B03_VISUAL_SHA256='0d2cb41b23a7839b00902c04cb72c3c656d1cbdd0510e4b1db925025e66c9c9c'
B03_OVERSIGHT_SHA256='c26ec6a6f497dd70fbd0b7f76671fe271853c808d95a776ecebf4c3b054d607e'
B06_BOUNDARY_SHA256='e574e900c286ce14148735fe46684d00e0338ecb59c37893a8258fd8a6bce0cd'
B02_SOURCE_FP='e3b90b6d5504eba6e7029b26f8335874bf94600d126855fca4141b4867a24348'
B02_MANIFEST_SHA='dacf39953ebe60ebc1d55b2f149871fc32dbdd080ace78d73cf654ae5258599c'
load=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def fingerprint(x):return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def normalize(x):return {p:h for p,h in x.items() if Path(p).name!='.DS_Store'}
def bound(p):return {'path':str(Path(p).relative_to(ROOT)),'sha256':sha(p)}
def source_snapshot():return predecessor.source_snapshot()
def public_snapshot():return predecessor.public_snapshot()
def source_fingerprint():return fingerprint(normalize(source_snapshot()))
def source_path(i,a,l):return BATCH/'fit-candidates'/f'{a}__{i}-{l}.webp'
def candidate_hashes():return {f'{i}:{a}:{l}':sha(source_path(i,a,l)) for i,a in ROWS for l in LAYERS}
def b05_allowlist():
 seal=load(BOUNDARY);return seal.get('authorizedB05CandidateFiles',{})
def b06_allowlist():
 seal=load(B06_BOUNDARY);return seal.get('authorizedB06CandidateFiles',{})
def protected_boundary_errors(current:dict,base:dict,authorized_additions:dict):
 expected=dict(base);expected.update(authorized_additions)
 return [] if current==expected else ['B03 protected hashes drift outside exact authorized B06 additions']
def predecessor_errors(current_source=None,current_manifest=None,current_public=None):
 e=[];details={};allow=b05_allowlist();allow_b06=b06_allowlist()
 expected_b05={f'public/assets/v6.5/art-candidates/B05/{a}/{i}-{l}.webp' for a in AVATARS for i in ('cape-nebula','cape-sky','hero-cape') for l in LAYERS}
 expected_b06={f'public/assets/v6.5/art-candidates/B06/{a}/{i}-{l}.webp' for a in AVATARS for i in ('cape-legend','cape-ocean','sister-galaxy-cape') for l in LAYERS}
 try:
  report=load(B03_REPORT);post=load(B03_POST);visual=load(B03_VISUAL);oversight=load(B03_OVERSIGHT)
  if sha(BOUNDARY)!=BOUNDARY_SHA256:e.append('B02+K boundary seal SHA drift')
  if sha(B03_REPORT)!=B03_REPORT_SHA256:e.append('B03 promotion report SHA drift')
  if sha(B03_POST)!=B03_POST_SHA256:e.append('B03 post completion SHA drift')
  if sha(B03_VISUAL)!=B03_VISUAL_SHA256:e.append('B03 fresh visual SHA drift')
  if sha(B03_OVERSIGHT)!=B03_OVERSIGHT_SHA256:e.append('B03 final oversight SHA drift')
  if sha(B06_BOUNDARY)!=B06_BOUNDARY_SHA256:e.append('B06 exact authorization boundary SHA drift')
  b06_boundary=load(B06_BOUNDARY)
  if b06_boundary.get('status')!='AUTHORIZED_EXACT_24' or b06_boundary.get('count')!=24 or b06_boundary.get('genericExceptions') is not False:e.append('B06 authorization identity')
  if report.get('manifestAfterSha256')!=B03_MANIFEST_SHA256 or report.get('status')!='PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE':e.append('B03 promotion identity/status')
  if post.get('status')!='PASS_TECHNICAL_PENDING_FRESH_VISUAL' or post.get('promotionReportSha256')!=B03_REPORT_SHA256 or post.get('coverage')!={'fullFlow':48,'negativeControls':4,'limitedUnchangedHeroCapeCompatibility':12}:e.append('B03 fresh post status/binding')
  bound_visual=visual.get('boundEvidence',{})
  if visual.get('status')!='PASS_POST_PROMOTION_VISUAL' or visual.get('reviewer')!='root' or bound_visual.get('promotionReport')!=B03_REPORT_SHA256 or bound_visual.get('manifest')!=B03_MANIFEST_SHA256 or bound_visual.get('freshCompletion')!=B03_POST_SHA256:e.append('B03 fresh root visual status/binding')
  if oversight.get('status')!='PASS_TRANSACTION_AND_FRESH_EVIDENCE_BOUNDARIES' or oversight.get('currentPostPromotionVerificationErrors')!=[] or oversight.get('boundReports',{}).get('freshCompletion')!=B03_POST_SHA256 or oversight.get('rootActualVisualReview',{}).get('sha256')!=B03_VISUAL_SHA256:e.append('B03 independent oversight status/binding')
  if current_source is None and current_manifest is None and current_public is None:
   current_protected=b03p.protected_hashes()
   e+=protected_boundary_errors(current_protected,report['protectedHashes'],allow_b06)
   raw=b03p.verify_promotion(report);allowed={'protected V64/V65/B01/B02/B08-B11 drift','public drift beyond 24 B03 copies'}
   if set(raw)-allowed or (raw and set(raw)!=allowed):e+=['B03 verify_promotion unexpected: '+x for x in raw]
  expected_source=dict(report['sourceFilesBefore']);expected_source['src/data/avatarAssetManifest.json']=report['manifestAfterSha256']
  actual_source=source_snapshot() if current_source is None else current_source
  if normalize(actual_source)!=normalize(expected_source):e.append('current source is not exact B03 promoted result')
  actual_manifest=load(MANIFEST) if current_manifest is None else current_manifest
  original=load(ROOT/report['backupDirectory']/'avatarAssetManifest.original.json')
  if actual_manifest!=b03p.manifest_plan(original) or report['manifestAfterSha256']!=B03_MANIFEST_SHA256:e.append('current manifest is not exact B03 promoted result')
  expected_public=dict(report['publicFilesBefore'])
  for row in report['copies']:expected_public[row['destination']]=row.get('promotedSha256',row['sha256'])
  expected_public.update(allow_b06)
  actual_public=public_snapshot() if current_public is None else current_public
  if normalize(actual_public)!=normalize(expected_public):e.append('current public is not exact B03 promoted result')
  if set(allow)!=expected_b05 or len(allow)!=24:e.append('B05 allowlist must be exact 24 known paths')
  if set(allow_b06)!=expected_b06 or len(allow_b06)!=24:e.append('B06 allowlist must be exact 24 authorized paths')
  for p,h in allow.items():
   if actual_public.get(p)!=h or not (ROOT/p).is_file() or sha(ROOT/p)!=h:e.append('B05 exact candidate drift '+p)
  for p,h in allow_b06.items():
   if actual_public.get(p)!=h or not (ROOT/p).is_file() or sha(ROOT/p)!=h:e.append('B06 exact candidate drift '+p)
  details={'b03PromotionReport':bound(B03_REPORT),'b03PostCompletion':bound(B03_POST),'b03FreshVisual':bound(B03_VISUAL),'b03FinalOversight':bound(B03_OVERSIGHT),'manifestBeforeB04Sha256':sha(MANIFEST),'normalizedSourceFingerprint':fingerprint(normalize(actual_source)),'authorizedB05CandidateFiles':allow,'authorizedB06CandidateFiles':allow_b06,'b06AuthorizationBoundary':bound(B06_BOUNDARY)}
 except Exception as x:e.append(f'{type(x).__name__}: {x}')
 return e,details
def shot(x,e,label='evidence'):
 p=ROOT/str(x.get('path',''))
 if not p.is_file() or sha(p)!=x.get('sha256'):e.append(label+' SHA mismatch '+str(x.get('path')))
def exact(rows,fields,expected,e,label):
 keys=[tuple(tuple(r.get(k,[])) if k=='viewport' else r.get(k) for k in fields) for r in rows]
 if len(keys)!=len(expected) or set(keys)!=set(expected) or len(keys)!=len(set(keys)):e.append(label+' exact coverage')
def validate_state(st,i,a,surface,e,cape=False):
 if st.get('avatar')!='avatar-'+a or i not in st.get('rendered',[]) or i not in st.get('cosmetics',[]):e.append(surface+' identity/items')
 ims=st.get('images',[]);skin=[x for x in ims if 'avatar-renderer-skin' in x.get('classes',[])];layers=[x for x in ims if x.get('itemId')==i]
 if len(skin)!=1 or len(layers)!=2:e.append(surface+' split/base count');return
 found={}
 for l,c in (('back','avatar-wearable-back'),('front','avatar-wearable-front')):
  xs=[x for x in layers if c in x.get('classes',[])];found[l]=xs[0] if len(xs)==1 else None
  expected=f'/assets/v6.5/art-candidates/B04-full/{a}/{i}-{l}.webp'
  if len(xs)!=1 or not xs[0].get('src','').split('?')[0].endswith(expected) or not all(xs[0].get(k) is True for k in ('complete','decoded','visible')) or (xs[0].get('nw'),xs[0].get('nh'))!=(1024,1536):e.append(surface+' '+l+' exact layer')
 if found['back'] and found['front'] and not found['back']['index']<skin[0]['index']<found['front']['index']:e.append(surface+' backpack DOM order')
 if cape:
  cs=[x for x in ims if x.get('itemId')=='hero-cape'];cb=[x for x in cs if 'avatar-wearable-back' in x.get('classes',[])];cf=[x for x in cs if 'avatar-wearable-front' in x.get('classes',[])]
  if len(cb)!=1 or len(cf)!=1 or 'hero-cape' not in st.get('rendered',[]) or 'hero-cape' not in st.get('cosmetics',[]):e.append(surface+' cape layers')
  elif found['back'] and found['front'] and not cb[0]['index']<found['back']['index']<skin[0]['index']<cf[0]['index']<found['front']['index']:e.append(surface+' cape/backpack DOM order')
def review_errors(sol,root_review,b,r,c,n):
 e=[]
 bindings=sol.get('bindings',{})
 if sol.get('model')!='gpt-5.6-sol' or sol.get('reviewerAgentId')!='/root/sol_racer_art' or sol.get('response',{}).get('deterministicDecision')!='PASS_CANDIDATE_ONLY':e.append('Sol review identity/decision')
 if bindings.get('candidateHashes')!=b['candidateHashes'] or bindings.get('distFingerprint')!=b['distFingerprint']:e.append('Sol same-candidate binding')
 expected_reports={'candidateDistBuild':sha(BUILD),'runtimeGate':sha(RUNTIME),'capeCompatibilityGate':sha(CAPE),'negativeControls':sha(NEGATIVE)}
 if any(bindings.get('reportSha256',{}).get(k)!=h for k,h in expected_reports.items()):e.append('Sol report binding')
 for section in ('normalRows','capeCompatibilityRows'):
  rows=sol.get(section,[])
  if len(rows)!=12 or {(x.get('itemId'),x.get('avatarId')) for x in rows}!=set(ROWS):e.append('Sol '+section+' exact coverage')
  for x in rows:
   if x.get('deterministicDecision')!='PASS' or not x.get('visuallyInspected') or x.get('blockingIssues'):e.append('Sol '+section+' row decision')
   shot(x.get('board',{}),e,'Sol board')
   if len(x.get('reviewedScreenshots',[]))!=16:e.append('Sol screenshot count')
   for y in x.get('reviewedScreenshots',[]):shot(y,e,'Sol screenshot')
 ev=root_review.get('evidence',{})
 expected={'build':BUILD,'normalRuntime':RUNTIME,'capeCompatibility':CAPE,'negativeControls':NEGATIVE,'producerReview':SOL}
 if root_review.get('reviewer')!='root' or root_review.get('status')!='PASS_QA_CANDIDATE_ONLY' or root_review.get('actualViewing')!={'normalBoards':12,'capeCompatibilityBoards':12,'boundPanels':384,'boardFingerprint':'b1ce2d6ce26212e35c26bf1ae6c27548235ffd9d6b290aa862a84acdb30aa0ce'}:e.append('root visual review identity/scope')
 for k,p in expected.items():
  if not isinstance(ev.get(k),dict) or ev[k].get('path')!=str(p.relative_to(ROOT)) or ev[k].get('sha256')!=sha(p):e.append('root report binding '+k)
 return e
def run():
 e=[];ve=[];out={'schemaVersion':1,'suite':'v65-b04-strict-acceptance','createdAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'promotionReady':False}
 try:
  for name,h in SEALED.items():
   if sha(S/name)!=h:e.append('sealed evidence drift '+name)
  b,r,c,n,sol,rr=map(load,(BUILD,RUNTIME,CAPE,NEGATIVE,SOL,ROOT_REVIEW));hashes=candidate_hashes()
  if b.get('candidateHashes')!=hashes:e.append('24 candidate source hash drift')
  files={str(p.relative_to(S/'candidate-dist')):sha(p) for p in sorted((S/'candidate-dist').rglob('*')) if p.is_file() and p.name!='.DS_Store'}
  if normalize(files)!=normalize(b.get('distFiles',{})) or fingerprint(normalize(files))!=b.get('distFingerprint'):e.append('sealed dist drift')
  b02=load(B02_REPORT)
  if b.get('rootSourceStartFingerprint')!=B02_SOURCE_FP or b.get('rootManifestStartSha256')!=B02_MANIFEST_SHA or b02.get('promotedSourceFingerprint')!=B02_SOURCE_FP or b02.get('manifestAfterSha256')!=B02_MANIFEST_SHA:e.append('B04 build is not exact B02 promoted input')
  expected=[(i,a,(w,h),t) for i,a in ROWS for w,h,t in MODES]
  for report,label,is_cape in ((r,'runtime',False),(c,'cape',True)):
   if report.get('sealedBuildReportSha256')!=sha(BUILD) or report.get('candidateHashes')!=hashes or report.get('distFingerprint')!=b.get('distFingerprint'):e.append(label+' same-candidate binding')
   exact(report.get('rows',[]),('itemId','avatarId','viewport','theme'),expected,e,label)
   for row in report.get('rows',[]):
    i,a=row['itemId'],row['avatarId'];states=row.get('states',{})
    if row.get('pass') is not True or row.get('errors') or row.get('candidateSourceHashes')!={l:hashes[f'{i}:{a}:{l}'] for l in LAYERS}:e.append(label+' row result/hash')
    for k in ('shopTrial','shopEquipped','home','homeAfterReload','achievements'):validate_state(states.get(k,{}),i,a,label+' '+k,e,is_cape)
    cancelled=states.get('shopCancelled',{})
    if i in cancelled.get('rendered',[]) or i in cancelled.get('cosmetics',[]) or any(x.get('itemId')==i for x in cancelled.get('images',[])):e.append(label+' cancel backpack persisted')
    if is_cape and ('hero-cape' not in cancelled.get('rendered',[]) or len([x for x in cancelled.get('images',[]) if x.get('itemId')=='hero-cape'])!=2):e.append(label+' cancel cape missing')
    if row.get('staticStability',{}).get('pass') is not True:e.append(label+' static stability')
    for x in row.get('screenshots',{}).values():shot(x,e,label+' screenshot')
  cases=n.get('cases',[]);names={x.get('name') for x in cases}
  if n.get('status')!='PASS' or not n.get('baselineIntegrityPass') or n.get('baselineErrors') or names!={'wrong-avatar-candidate','missing-layer-back-and-front','swapped-item','stale-candidate-screenshot'}:e.append('negative controls exact set')
  missing=next((x for x in cases if x.get('name')=='missing-layer-back-and-front'),{})
  if missing.get('actual')!='REJECT_BOTH' or {x.get('layerClass') for x in missing.get('variants',[])}!={'avatar-wearable-back','avatar-wearable-front'}:e.append('missing back/front independent rejection')
  boundary,details=predecessor_errors();e+=['B02+K+B05 boundary: '+x for x in boundary];out['predecessorBoundary']=details
  ve+=review_errors(sol,rr,b,r,c,n)
  out.update({'sealedCandidateBuildSourceFingerprint':b.get('rootSourceStartFingerprint'),'currentPredecessorSourceFingerprint':source_fingerprint(),'manifestBeforeB04Sha256':sha(MANIFEST),'candidateHashes':hashes,'distFingerprint':b.get('distFingerprint'),'coverage':{'runtime':48,'capeCompatibility':48,'negative':4,'solBoards':24,'rootBoards':24},'requiredPostPromotion':{'freshFullFlow':48,'freshCapeCompatibility':48,'freshNegative':4,'freshBoards':24,'freshVisualReview':True},'b05ExactAllowlist':b05_allowlist(),'b06ExactAllowlist':b06_allowlist()})
 except Exception as x:e.append(f'{type(x).__name__}: {x}')
 out.update({'structuralErrors':e,'visualErrors':ve,'promotionReady':not e and not ve});return out
if __name__=='__main__':
 result=run();(S/'acceptance-integrity.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False,indent=2));raise SystemExit(0 if result['promotionReady'] else 1)
