#!/usr/bin/env python3
"""Strict B03 sealed-candidate acceptance. Root visual review is mandatory."""
from __future__ import annotations
import copy,hashlib,json,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
import validate_v65_b02_acceptance as b02v
import promote_v65_b02 as b02p
BATCH=ROOT/'qa/v65/art-workpacks/B03';S=BATCH/'full-candidate-runtime';MANIFEST=ROOT/'src/data/avatarAssetManifest.json'
BUILD=S/'candidate-dist-build.json';RUNTIME=S/'runtime-gate-report.json';NEGATIVE=S/'negative-controls-report.json';SOL=S/'actual-visual-review.json';ROOT_REVIEW=S/'actual-visual-review-root.json';B02_REPORT=ROOT/'qa/v65/art-workpacks/B02/promotion-report.json';B02_SEAL=ROOT/'qa/v65/art-workpacks/B02/runtime-harness/acceptance-seal-astra.json'
ITEMS=('trail-backpack','pack-rocket','pack-treasure');AVATARS=('brother','younger','sister','younger-sister');LAYERS=('back','front');ROWS=tuple((i,a) for i in ITEMS for a in AVATARS);MODES=((390,844,'light'),(390,844,'dark'),(1440,900,'light'),(1440,900,'dark'))
SEALED={'candidate-dist-build.json':'59fe496c8ddcfe58b7c9f8844637bc5f62f13ed2b0cc8148586e365ad96a57e0','runtime-gate-report.json':'1eaac82e82d416f8fc95c06a69500f9952c407017492e67e7cb1cf4d49df8bdd','negative-controls-report.json':'bc8382fdd5785dbe139255b5766a5c1fbf6411c5b4129a160e2d48a5e35d40a0','actual-visual-review.json':'b61e0ebfd6886f0b1391031aec6d894e4a1ae1f6c342af923bdf334705c0a127','completion-summary.json':'3afa641fa68a20e6a55bba8226dd265511f088b3591c039bcbe7358cfd0b1e29'}
ROOT_REVIEW_SHA256='4471809c2c063543a5ca20acff7d9afe98e56a27d7ba2e98c1bfa8b261f8e5fd'
load=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def fingerprint(x):return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def normalize(x):return {p:h for p,h in x.items() if Path(p).name!='.DS_Store'}
BOUNDARY=BATCH/'boundary-after-k/boundary-seal.json'
BOUNDARY_SHA256='465372b559f6ba57c63f3b98eb284e5768bedd71003495c77c36e81fb8166450'
K_REPORT=ROOT/'qa/v65/art-workpacks/B01/retained-cadet-repair/promotion-report.json'
K_DEST='public/assets/v6.5/runtime/brother/outfit-cadet.webp'
source_snapshot=b02v.source_snapshot
def public_snapshot():return {str(p.relative_to(ROOT)):sha(p) for p in sorted((ROOT/'public').rglob('*')) if p.is_file()}
def source_fingerprint():return fingerprint(normalize(source_snapshot()))
def boundary_errors(current_source=None,current_manifest=None,current_public=None):
 e=[];details={}
 try:
  seal=load(BOUNDARY);b02=load(B02_REPORT);kr=load(K_REPORT)
  if sha(BOUNDARY)!=BOUNDARY_SHA256:e.append('boundary seal SHA drift')
  if seal.get('b02PromotionReport')!=bound(B02_REPORT) or seal.get('kPromotionReport')!=bound(K_REPORT):e.append('sealed predecessor report SHA')
  if b02.get('status')!='PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE' or kr.get('status')!='PROMOTED_LOCAL_PENDING_FRESH_ACCEPTANCE':e.append('predecessor promotion status')
  if kr.get('destination')!=K_DEST or kr.get('candidateSha256')!='a849341f7728b9480f802c206cfebdf69fa75ba58cf2cf0c948e18b8378bff0c':e.append('K promoted identity/hash')
  if kr.get('manifestBeforeSha256')!=b02.get('manifestAfterSha256') or fingerprint(normalize(kr['sourceFilesBefore']))!=b02.get('promotedSourceFingerprint'):e.append('K input is not exact B02 result')
  before_k=load(ROOT/kr['backupDirectory']/'manifest.original.json');before_b02=load(ROOT/b02['backupDirectory']/'avatarAssetManifest.original.json')
  if before_k!=b02p.manifest_plan(before_b02):e.append('B02 to K manifest lineage')
  planned=copy.deepcopy(before_k);rows=[x for x in planned['skins'] if x.get('id')=='brother:outfit-cadet']
  if len(rows)!=1 or rows[0].get('path')!='public/assets/v6.4/runtime/brother/outfit-cadet.webp':e.append('K original binding')
  else:rows[0]['path']=K_DEST
  actual_manifest=load(MANIFEST) if current_manifest is None else current_manifest
  if actual_manifest!=planned or sha(MANIFEST)!=seal.get('manifestBeforeB03Sha256') or sha(MANIFEST)!=kr.get('manifestAfterSha256'):e.append('current manifest is not exact B02 plus one K leaf')
  expected_source=dict(kr['sourceFilesBefore']);expected_source['src/data/avatarAssetManifest.json']=kr['manifestAfterSha256']
  current_source=source_snapshot() if current_source is None else current_source
  if normalize(current_source)!=normalize(expected_source) or fingerprint(normalize(current_source))!=seal.get('normalizedSourceFingerprint'):e.append('current source is not exact B02 plus K')
  expected_public=dict(kr['publicFilesBefore']);expected_public[K_DEST]=kr['candidateSha256']
  authorized=seal.get('authorizedB05CandidateFiles',{})
  b05_expected={f'public/assets/v6.5/art-candidates/B05/{av}/{it}-{layer}.webp' for av in AVATARS for it in ('cape-nebula','cape-sky','hero-cape') for layer in ('back','front')}
  if set(authorized)!=b05_expected or len(authorized)!=24:e.append('authorized B05 exact 24 paths')
  expected_public.update(authorized)
  current_public=public_snapshot() if current_public is None else current_public
  if normalize(current_public)!=normalize(expected_public):e.append('current public is not exact B02 plus K')
  for x in b02['copies']:
   if sha(ROOT/x['source'])!=x['sha256'] or current_public.get(x['destination'])!=x['sha256']:e.append('B02 promoted copy drift')
  # Keep all prior acceptance scripts/reviews exact; Finder metadata alone is excluded.
  for path,h in {**normalize(b02['evidenceHashes']),**normalize(kr['evidenceHashes'])}.items():
   if not (ROOT/path).is_file() or sha(ROOT/path)!=h:e.append('predecessor evidence drift '+path)
  details={'boundarySeal':bound(BOUNDARY),'b02PromotionReport':bound(B02_REPORT),'kPromotionReport':bound(K_REPORT),'normalizedSourceFingerprint':fingerprint(normalize(current_source)),'rawSourceFingerprint':fingerprint(current_source),'sourceMetadataDeltas':b02v.metadata_delta(expected_source,current_source),'publicMetadataDeltas':b02v.metadata_delta(expected_public,current_public),'manifestBeforeB03Sha256':sha(MANIFEST),'authorizedB05CandidateFiles':authorized}
 except Exception as x:e.append(f'{type(x).__name__}: {x}')
 return e,details
def source_path(i,a,l):
 d={'trail-backpack':'prefit-trail-attempt2','pack-rocket':'prefit-rocket-attempt1','pack-treasure':'prefit-treasure-attempt1'}[i];return BATCH/d/f'{a}-{l}.webp'
def candidate_hashes():return {f'{i}:{a}:{l}':sha(source_path(i,a,l)) for i,a in ROWS for l in LAYERS}
def bound(p):return {'path':str(p.relative_to(ROOT)),'sha256':sha(p)}
def shot(x,e):
 p=ROOT/str(x.get('path',''))
 if not p.is_file() or sha(p)!=x.get('sha256'):e.append('screenshot/board SHA mismatch '+str(x.get('path')))
def exact(rows,fields,expected,e,label):
 keys=[tuple(tuple(r.get(k,[])) if k=='viewport' else r.get(k) for k in fields) for r in rows]
 if len(keys)!=len(expected) or set(keys)!=set(expected) or len(keys)!=len(set(keys)):e.append(label+' exact coverage')
def validate_state(st,i,a,surface,e,promoted=False):
 if st.get('avatar')!='avatar-'+a or i not in st.get('rendered',[]) or i not in st.get('cosmetics',[]):e.append(surface+' identity/items')
 ims=st.get('images',[]);layers=[x for x in ims if x.get('itemId')==i];skin=[x for x in ims if 'avatar-renderer-skin' in x.get('classes',[])]
 if len(layers)!=2 or len(skin)!=1:e.append(surface+' split/base count');return
 for l,c in (('back','avatar-wearable-back'),('front','avatar-wearable-front')):
  found=[x for x in layers if c in x.get('classes',[])]
  expected=f'/assets/v6.5/{"runtime" if promoted else "art-candidates/B03-full"}/{a}/{i}-{l}.webp'
  if len(found)!=1 or not found[0].get('src','').split('?')[0].endswith(expected) or not all(found[0].get(k) is True for k in ('complete','decoded','visible')) or (found[0].get('nw'),found[0].get('nh'))!=(1024,1536):e.append(surface+' '+l+' exact layer')
 back=next((x for x in layers if 'avatar-wearable-back' in x.get('classes',[])),None);front=next((x for x in layers if 'avatar-wearable-front' in x.get('classes',[])),None)
 if back and front and not back['index']<skin[0]['index']<front['index']:e.append(surface+' DOM order')
def root_visual_errors(review,b,r):
 e=[]
 if review.get('status')!='PASS_QA_CANDIDATE_ONLY' or review.get('reviewer')!='Astra root' or not review.get('method') or not review.get('findings'):e.append('root actual visual review identity/status')
 if review.get('candidateHashes')!=b['candidateHashes']:e.append('root same-candidate hash binding')
 for key,path in [('sealedBuildReport',BUILD),('runtimeReport',RUNTIME),('negativeControls',NEGATIVE)]:
  if review.get(key)!=bound(path):e.append('root report binding '+key)
 boards=review.get('boards',[]);expected_boards={str((S/f'visual-review-boards/{i}__{a}.jpg').relative_to(ROOT)) for i,a in ROWS}
 if len(boards)!=12 or {x.get('path') for x in boards}!=expected_boards or any(x.get('verdict')!='PASS' for x in boards):e.append('root exact board coverage/verdict')
 for x in boards:shot(x,e)
 originals=review.get('originalsViewed',[]);expected_originals=[]
 for i,a in ROWS:
  case=next(x for x in r['rows'] if (x['itemId'],x['avatarId'],x['viewport'],x['theme'])==(i,a,[1440,900],'light'))
  expected_originals.append(case['screenshots']['achievements'])
 if originals!=expected_originals:e.append('root exact 12 desktop Achievements originals')
 for x in originals:shot(x,e)
 return e
def run():
 e=[];ve=[];out={'schemaVersion':1,'suite':'v65-b03-strict-acceptance','createdAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'promotionReady':False}
 try:
  for n,h in SEALED.items():
   if sha(S/n)!=h:e.append('sealed evidence drift '+n)
  b,r,n,sol=map(load,(BUILD,RUNTIME,NEGATIVE,SOL)); hashes=candidate_hashes()
  if b.get('candidateHashes')!=hashes:e.append('24 candidate source hash drift')
  files={str(p.relative_to(S/'candidate-dist')):sha(p) for p in sorted((S/'candidate-dist').rglob('*')) if p.is_file()}
  if normalize(files)!=normalize(b.get('distFiles',{})) or fingerprint(normalize(files))!=b.get('distFingerprint'):e.append('sealed dist drift')
  if r.get('sealedBuildReportSha256')!=sha(BUILD) or r.get('candidateHashes')!=hashes or r.get('distFingerprint')!=b.get('distFingerprint'):e.append('runtime same-candidate binding')
  expected=[(i,a,(w,h),t) for i,a in ROWS for w,h,t in MODES];exact(r.get('rows',[]),('itemId','avatarId','viewport','theme'),expected,e,'runtime')
  for row in r.get('rows',[]):
   i,a=row['itemId'],row['avatarId'];states=row.get('states',{})
   if row.get('pass') is not True or row.get('errors') or row.get('candidateSourceHashes')!={l:hashes[f'{i}:{a}:{l}'] for l in LAYERS}:e.append('runtime row result/hash')
   for l in LAYERS:
    if (row.get('servedCandidateHashes',{}).get(l) or {}).get('sha256')!=hashes[f'{i}:{a}:{l}']:e.append('served byte mismatch')
   for k in ('shopTrial','shopEquipped','home','homeAfterReload','achievements'):validate_state(states.get(k,{}),i,a,k,e)
   c=states.get('shopCancelled',{});
   if i in c.get('rendered',[]) or i in c.get('cosmetics',[]) or any(x.get('itemId')==i for x in c.get('images',[])):e.append('cancel did not restore base')
   if row.get('staticStability',{}).get('pass') is not True:e.append('static stability')
   if set(row.get('screenshots',{}))!={'shopTrial','shopCancelled','home','achievements'}:e.append('screenshot coverage')
   for x in row.get('screenshots',{}).values():shot(x,e)
  expected_neg={'wrong-avatar-candidate','missing-layer','swapped-item','stale-candidate-screenshot'}
  if n.get('status')!='PASS' or not n.get('baselineIntegrityPass') or n.get('baselineErrors') or {x.get('name') for x in n.get('cases',[])}!=expected_neg or any(x.get('actual')!='REJECT' or not x.get('detectedErrors') for x in n.get('cases',[])):e.append('negative controls')
  if sol.get('status')!='PASS_QA_CANDIDATE_ONLY' or sol.get('candidateHashes')!=hashes or len(sol.get('boards',[]))!=12:e.append('Sol visual review status/binding')
  for x in sol.get('boards',[]):shot(x,e)
  b02report=load(B02_REPORT);boundary,details=boundary_errors();e+=['B02+K boundary: '+x for x in boundary];out['predecessorBoundary']=details
  seal=load(B02_SEAL);baseline=normalize(seal['sourceFiles'])
  if fingerprint(baseline)!=b.get('rootSourceStartFingerprint'):e.append('B03 sealed source is not exact original B01/B02-prepromotion boundary')
  if not ROOT_REVIEW.is_file():ve.append('root actual visual review missing; promotionReady must remain false')
  elif sha(ROOT_REVIEW)!=ROOT_REVIEW_SHA256:ve.append('root actual visual review sealed SHA drift')
  else:ve+=root_visual_errors(load(ROOT_REVIEW),b,r)
  out.update({'sealedSourceFingerprint':b.get('rootSourceStartFingerprint'),'currentB02PlusKSourceFingerprint':source_fingerprint(),'manifestBeforeB02Sha256':b02report.get('manifestBeforeSha256'),'manifestAfterB02Sha256':b02report.get('manifestAfterSha256'),'candidateHashes':hashes,'distFingerprint':b.get('distFingerprint'),'coverage':{'runtime':48,'negative':4,'solBoards':12},'requiredPostPromotion':{'freshFullFlow':48,'freshNegative':4,'limitedUnchangedHeroCapeCompatibility':12,'freshVisualReview':True}})
 except Exception as x:e.append(f'{type(x).__name__}: {x}')
 out.update({'structuralErrors':e,'visualErrors':ve,'promotionReady':not e and not ve});return out
if __name__=='__main__':
 r=run();(S/'acceptance-integrity-after-k.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps(r,ensure_ascii=False,indent=2));raise SystemExit(0 if r['promotionReady'] else 1)
