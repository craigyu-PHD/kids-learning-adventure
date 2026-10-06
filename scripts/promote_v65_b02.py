#!/usr/bin/env python3
"""Transactional B02 LOCAL promotion. Default dry-run; --execute is root's explicit apply step."""
from __future__ import annotations
import argparse,copy,hashlib,json,os,time
from pathlib import Path
import validate_v65_b02_acceptance as v
ROOT=v.ROOT;B=v.BATCH;MANIFEST=v.MANIFEST;OUT=B/'promotion-report.json'
sha=v.sha;load=v.load
def destination(i,a):return ROOT/f'public/assets/v6.5/runtime/{a}/{i}.webp'
def atomic(p,data):
 p.parent.mkdir(parents=True,exist_ok=True);tmp=p.with_name(p.name+f'.b02-{os.getpid()}.tmp')
 try:tmp.write_bytes(data);tmp.replace(p)
 finally:
  if tmp.exists():tmp.unlink()
def protected_hashes(include_metadata=False):
 paths=list((ROOT/'public/assets/v6.4').rglob('*'))
 targets={destination(i,a) for i,a in v.ROWS}
 paths += [p for p in (ROOT/'public/assets/v6.5').rglob('*') if p not in targets]
 for b in ('B08','B09','B10','B11'):paths+=list((ROOT/f'qa/v65/art-workpacks/{b}').rglob('*'))
 return {str(p.relative_to(ROOT)):sha(p) for p in sorted(set(paths)) if p.is_file() and (include_metadata or p.name!='.DS_Store')}
def evidence_hashes():
 paths=[ROOT/x for x in v.load(v.SEAL)['evidenceHashes']]+[v.SEAL,v.B01,ROOT/'scripts/validate_v65_b02_acceptance.py',Path(__file__),ROOT/'scripts/run_v65_b02_post_promotion.py']
 return {str(p.relative_to(ROOT)):sha(p) for p in paths}

def manifest_plan(before):
 m=copy.deepcopy(before);skins={x['id']:x for x in m['skins']}
 for i,a in v.ROWS:
  r=skins[f'{a}:{i}']
  if r.get('skinId')!=i or r.get('avatarId')!=a or r.get('path')!=f'public/assets/v6.4/runtime/{a}/{i}.webp':raise ValueError('sealed B02 skin contract/binding mismatch')
  r['path']=str(destination(i,a).relative_to(ROOT))
 return m

def plan(acceptance):
 rows=[]
 for i,a in v.ROWS:
  src=v.candidate_path(i,a);data=src.read_bytes();h=hashlib.sha256(data).hexdigest()
  if h!=acceptance['candidateHashes'][f'{i}:{a}']:raise ValueError('candidate bytes drift')
  rows.append((i,a,src,destination(i,a),data,h))
 if len(rows)!=12 or len({r[3] for r in rows})!=12:raise ValueError('12-input preflight coverage')
 return rows

def verify_promotion(r):
 e=[]
 try:
  if r.get('status')!='PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE':e.append('promotion not ready for post gate')
  if r.get('artDigest')!=v.art_digest():e.append('same art digest drift')
  if r.get('manifestAfterSha256')!=sha(MANIFEST):e.append('manifest drift')
  if r.get('promotedSourceFingerprint')!=v.source_fingerprint():e.append('post-promotion source drift')
  if r.get('protectedHashes')!=protected_hashes():e.append('protected V64/B08/B09/B10/B11 drift')
  if r.get('evidenceHashes')!=evidence_hashes():e.append('sealed review/runner evidence drift')
  original=load(ROOT/r['backupDirectory']/'avatarAssetManifest.original.json')
  if load(MANIFEST)!=manifest_plan(original):e.append('unexpected manifest mutation')
  expected=set(v.ROWS);rows=r.get('copies',[])
  if len(rows)!=12 or {(x['itemId'],x['avatarId']) for x in rows}!=expected:e.append('copy coverage')
  for x in rows:
   dst=destination(x['itemId'],x['avatarId'])
   if str(dst.relative_to(ROOT))!=x['destination'] or sha(dst)!=x['sha256'] or sha(ROOT/x['source'])!=x['sha256']:e.append('promoted copy mismatch')
 except Exception as x:e.append(f'{type(x).__name__}: {x}')
 return e

def main():
 ap=argparse.ArgumentParser(description=__doc__);g=ap.add_mutually_exclusive_group();g.add_argument('--execute',action='store_true');g.add_argument('--preflight',action='store_true');args=ap.parse_args()
 a=v.run();report={'schemaVersion':1,'suite':'v65-b02-local-promotion','status':'FAIL','createdAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'productionDeployed':False,'promotionExecuted':False};started=False;original={};before=None
 try:
  if not a['promotionReady']:raise ValueError('fresh acceptance rejected: '+str(a['structuralErrors']+a['visualErrors']))
  before=MANIFEST.read_bytes();updated=manifest_plan(json.loads(before));rows=plan(a)
  protect=protected_hashes();evidence=evidence_hashes();raw_protect=protected_hashes(True)
  if not args.execute:
   report.update({'status':'DRY_RUN_READY','promotionReady':True,'copyCount':12,'metadataPolicy':'Only basename .DS_Store excluded; every other source/dist/public byte exact','metadataDeltasFromSealedSource':a.get('sourceMetadataOnlyDeltas',[]),'metadataDeltasFromSealedDist':a.get('distMetadataOnlyDeltas',[]),'artDigest':a['artDigest'],'exactSourceSealSha256':sha(v.SEAL),'manifestBeforeSha256':sha(MANIFEST),'plannedManifestSha256':hashlib.sha256((json.dumps(updated,ensure_ascii=False,indent=2)+'\n').encode()).hexdigest(),'copies':[{'itemId':i,'avatarId':av,'source':str(src.relative_to(ROOT)),'destination':str(dst.relative_to(ROOT)),'sha256':h} for i,av,src,dst,data,h in rows],'protectedKProductVisualPass':False,'b01OriginalHoloPreserved':True})
  else:
   if OUT.exists() and load(OUT).get('status')=='PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE':raise ValueError('already promoted: preserve original transaction')
   # Recheck all acceptance and bound negative reports immediately before writing.
   fresh=v.run()
   if not fresh['promotionReady'] or any(fresh[k]!=a[k] for k in ('artDigest','runtimeReportSha256','supplementReportSha256','negativeReportSha256','currentSourceFingerprint','sealSha256')):raise ValueError('acceptance changed during preflight')
   for i,av,src,dst,data,h in rows:
    if sha(src)!=h:raise ValueError('source changed after preflight')
    original[dst]=dst.read_bytes() if dst.exists() else None
   backup=B/'promotion-backups'/str(time.time_ns());backup.mkdir(parents=True);(backup/'avatarAssetManifest.original.json').write_bytes(before)
   for dst,data in original.items():
    if data is not None:
     p=backup/dst.relative_to(ROOT);p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
   (backup/'preflight.json').write_text(json.dumps({'acceptance':a,'protectedHashes':protect,'evidenceHashes':evidence,'targetsPreviouslyAbsent':[str(p.relative_to(ROOT)) for p,b in original.items() if b is None]},ensure_ascii=False,indent=2)+'\n')
   if MANIFEST.read_bytes()!=before or protect!=protected_hashes() or evidence!=evidence_hashes() or v.source_fingerprint()!=a['currentSourceFingerprint']:raise ValueError('input drift before first write')
   started=True
   for _,_,_,dst,data,_ in rows:atomic(dst,data)
   atomic(MANIFEST,(json.dumps(updated,ensure_ascii=False,indent=2)+'\n').encode())
   report.update({'status':'PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE','promotionExecuted':True,'backupDirectory':str(backup.relative_to(ROOT)),'artDigest':a['artDigest'],'candidateFingerprint':a['artDigest'],'protectedHashes':protect,'protectedRawHashesBefore':raw_protect,'metadataDeltasDuringPromotion':v.metadata_delta(raw_protect,protected_hashes(True)),'evidenceHashes':evidence,'manifestBeforeSha256':hashlib.sha256(before).hexdigest(),'manifestAfterSha256':sha(MANIFEST),'promotedSourceFingerprint':v.source_fingerprint(),'copies':[{'itemId':i,'avatarId':av,'source':str(src.relative_to(ROOT)),'destination':str(dst.relative_to(ROOT)),'sha256':h} for i,av,src,dst,data,h in rows],'protectedKProductVisualPass':False,'b01OriginalHoloPreserved':True})
   errors=verify_promotion(report)
   if errors:raise ValueError('; '.join(errors))
 except Exception as x:
  report['status']='FAIL';report['error']=f'{type(x).__name__}: {x}'
  if started:
   failures=[]
   for p,data in original.items():
    try:
     if data is None:p.unlink(missing_ok=True)
     else:atomic(p,data)
    except Exception as z:failures.append(str(z))
   try:atomic(MANIFEST,before)
   except Exception as z:failures.append(str(z))
   report['rollbackErrors']=failures;report['rollbackComplete']=not failures
 target=B/'promotion-dry-run.json' if not args.execute else OUT
 if args.execute and target.exists():
  if load(target).get('status')=='PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE':target=B/f'promotion-attempt-{time.time_ns()}.json'
  else:atomic(B/f'promotion-previous-{time.time_ns()}.json',target.read_bytes())
 target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':report['status'],'report':str(target.relative_to(ROOT)),'error':report.get('error')},ensure_ascii=False));return 0 if report['status']!='FAIL' else 1
if __name__=='__main__':raise SystemExit(main())
