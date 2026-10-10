#!/usr/bin/env python3
"""Transactional B03 local promotion. Root is the sole --execute writer."""
from __future__ import annotations
import argparse,copy,hashlib,json,os,time
from pathlib import Path
import validate_v65_b03_acceptance as v
ROOT=v.ROOT;B=v.BATCH;MANIFEST=v.MANIFEST;OUT=B/'promotion-report.json';load=v.load;sha=v.sha
def destination(i,a,l):return ROOT/f'public/assets/v6.5/runtime/{a}/{i}-{l}.webp'
def atomic(path,data):
 path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_name(path.name+f'.b03-{os.getpid()}.tmp')
 try:tmp.write_bytes(data);tmp.replace(path)
 finally:
  if tmp.exists():tmp.unlink()
def manifest_plan(before):
 payload=copy.deepcopy(before);amap={x['id']:x for x in payload['accessories']}
 for i,a in v.ROWS:
  row=amap.get(i) or {}
  if row.get('renderer')!='split-overlay':raise ValueError(f'{i} renderer contract')
  for l,key in (('back','backVariants'),('front','frontVariants')):
   expected=f'public/assets/v6.4/runtime/{a}/{i}-{l}.webp'
   if (row.get(key) or {}).get(a)!=expected:raise ValueError(f'{i}/{a}/{l} current binding is not sealed V6.4')
   row[key][a]=str(destination(i,a,l).relative_to(ROOT))
 return payload
def plan(acceptance):
 rows=[]
 for i,a in v.ROWS:
  for l in v.LAYERS:
   src=v.source_path(i,a,l);data=src.read_bytes();h=hashlib.sha256(data).hexdigest()
   if h!=acceptance['candidateHashes'][f'{i}:{a}:{l}']:raise ValueError('candidate bytes drift')
   rows.append((i,a,l,src,destination(i,a,l),data,h))
 if len(rows)!=24 or len({x[4] for x in rows})!=24:raise ValueError('24-copy coverage')
 return rows
def protected_hashes():
 targets={destination(i,a,l) for i,a in v.ROWS for l in v.LAYERS};paths=[]
 for base in (ROOT/'public/assets/v6.4',ROOT/'public/assets/v6.5'):
  paths += [p for p in base.rglob('*') if p.is_file() and p not in targets and p.name!='.DS_Store']
 for b in ('B01','B02','B08','B09','B10','B11'):paths += [p for p in (ROOT/f'qa/v65/art-workpacks/{b}').rglob('*') if p.is_file() and p.name!='.DS_Store']
 return {str(p.relative_to(ROOT)):sha(p) for p in sorted(set(paths))}
def evidence_hashes():
 paths=[v.BOUNDARY,v.B02_REPORT,v.K_REPORT,v.BUILD,v.RUNTIME,v.NEGATIVE,v.SOL,v.ROOT_REVIEW,v.S/'completion-summary.json',ROOT/'scripts/validate_v65_b03_acceptance.py',Path(__file__),ROOT/'scripts/run_v65_b03_post_promotion.py']
 return {str(p.relative_to(ROOT)):sha(p) for p in paths}
def verify_promotion(report):
 e=[]
 try:
  if report.get('status')!='PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE':e.append('promotion status')
  if report.get('manifestAfterSha256')!=sha(MANIFEST):e.append('manifest hash drift')
  if report.get('protectedHashes')!=protected_hashes():e.append('protected V64/V65/B01/B02/B08-B11 drift')
  if report.get('evidenceHashes')!=evidence_hashes():e.append('acceptance evidence drift')
  expected_source=dict(report['sourceFilesBefore']);expected_source['src/data/avatarAssetManifest.json']=report['manifestAfterSha256']
  if v.normalize(v.source_snapshot())!=v.normalize(expected_source):e.append('source drift beyond B03 manifest')
  expected_public=dict(report['publicFilesBefore'])
  for row in report['copies']:expected_public[row['destination']]=row['sha256']
  if v.normalize(v.public_snapshot())!=v.normalize(expected_public):e.append('public drift beyond 24 B03 copies')
  original=load(ROOT/report['backupDirectory']/'avatarAssetManifest.original.json')
  if load(MANIFEST)!=manifest_plan(original):e.append('unexpected manifest mutation')
  copies=report.get('copies',[])
  if len(copies)!=24 or {(x['itemId'],x['avatarId'],x['layer']) for x in copies}!={(i,a,l) for i,a in v.ROWS for l in v.LAYERS}:e.append('copy coverage')
  for x in copies:
   dst=destination(x['itemId'],x['avatarId'],x['layer'])
   if str(dst.relative_to(ROOT))!=x['destination'] or sha(dst)!=x['sha256'] or sha(ROOT/x['source'])!=x['sha256']:e.append('promoted byte mismatch')
 except Exception as x:e.append(f'{type(x).__name__}: {x}')
 return e
def main():
 ap=argparse.ArgumentParser(description=__doc__);g=ap.add_mutually_exclusive_group();g.add_argument('--preflight',action='store_true');g.add_argument('--execute',action='store_true');ap.add_argument('--root-authorized',action='store_true',help='Required with --execute; only /root may use it.');args=ap.parse_args()
 acceptance=v.run();report={'schemaVersion':1,'suite':'v65-b03-local-promotion','createdAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'status':'FAIL','promotionExecuted':False,'productionDeployed':False,'rootSolePromotionWriter':True};started=False;original={};before=None
 try:
  if not acceptance['promotionReady']:raise ValueError('strict acceptance rejected: '+str(acceptance['structuralErrors']+acceptance['visualErrors']))
  if args.execute and not args.root_authorized:raise ValueError('--execute requires --root-authorized and must be run by /root')
  before=MANIFEST.read_bytes();updated=manifest_plan(json.loads(before));rows=plan(acceptance);protect=protected_hashes();evidence=evidence_hashes();source_before=v.source_snapshot();public_before=v.public_snapshot()
  if not args.execute:
   report.update({'status':'DRY_RUN_READY','promotionReady':True,'copyCount':24,'predecessorBoundary':acceptance['predecessorBoundary'],'manifestFieldChangeCount':24,'manifestBeforeSha256':sha(MANIFEST),'plannedManifestSha256':hashlib.sha256((json.dumps(updated,ensure_ascii=False,indent=2)+'\n').encode()).hexdigest(),'candidateHashes':acceptance['candidateHashes'],'protectedHashes':protect,'evidenceHashes':evidence,'copies':[{'itemId':i,'avatarId':a,'layer':l,'source':str(src.relative_to(ROOT)),'destination':str(dst.relative_to(ROOT)),'sha256':h} for i,a,l,src,dst,data,h in rows]})
  else:
   fresh=v.run()
   if not fresh['promotionReady'] or fresh['candidateHashes']!=acceptance['candidateHashes'] or fresh['distFingerprint']!=acceptance['distFingerprint'] or any(fresh['predecessorBoundary'].get(key)!=acceptance['predecessorBoundary'].get(key) for key in ('boundarySeal','b02PromotionReport','kPromotionReport','normalizedSourceFingerprint','manifestBeforeB03Sha256')):raise ValueError('acceptance changed during preflight')
   for i,a,l,src,dst,data,h in rows:
    if sha(src)!=h:raise ValueError('candidate source drift before write')
    original[dst]=dst.read_bytes() if dst.exists() else None
   backup=B/'promotion-backups'/str(time.time_ns());backup.mkdir(parents=True);(backup/'avatarAssetManifest.original.json').write_bytes(before)
   for dst,data in original.items():
    if data is not None:
     path=backup/dst.relative_to(ROOT);path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
   (backup/'preflight.json').write_text(json.dumps({'acceptance':acceptance,'sourceFilesBefore':source_before,'publicFilesBefore':public_before,'protectedHashes':protect,'evidenceHashes':evidence,'targetsPreviouslyAbsent':[str(x.relative_to(ROOT)) for x,data in original.items() if data is None]},ensure_ascii=False,indent=2)+'\n')
   if MANIFEST.read_bytes()!=before or v.normalize(v.source_snapshot())!=v.normalize(source_before) or v.normalize(v.public_snapshot())!=v.normalize(public_before) or protected_hashes()!=protect or evidence_hashes()!=evidence:raise ValueError('source/public/evidence drift before first write')
   started=True
   for i,a,l,src,dst,data,h in rows:atomic(dst,data)
   atomic(MANIFEST,(json.dumps(updated,ensure_ascii=False,indent=2)+'\n').encode())
   report.update({'status':'PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE','promotionExecuted':True,'backupDirectory':str(backup.relative_to(ROOT)),'manifestBeforeSha256':hashlib.sha256(before).hexdigest(),'manifestAfterSha256':sha(MANIFEST),'sourceFilesBefore':source_before,'publicFilesBefore':public_before,'predecessorBoundary':acceptance['predecessorBoundary'],'candidateHashes':acceptance['candidateHashes'],'protectedHashes':protect,'evidenceHashes':evidence,'copies':[{'itemId':i,'avatarId':a,'layer':l,'source':str(src.relative_to(ROOT)),'destination':str(dst.relative_to(ROOT)),'sha256':h} for i,a,l,src,dst,data,h in rows]})
   errors=verify_promotion(report)
   if errors:raise ValueError('; '.join(errors))
 except Exception as x:
  report['status']='FAIL';report['error']=f'{type(x).__name__}: {x}'
  if started:
   failures=[]
   for p,data in original.items():
    try:p.unlink(missing_ok=True) if data is None else atomic(p,data)
    except Exception as z:failures.append(str(z))
   try:atomic(MANIFEST,before)
   except Exception as z:failures.append(str(z))
   report.update({'rollbackComplete':not failures,'rollbackErrors':failures})
 target=B/'promotion-dry-run-after-k.json' if not args.execute else OUT
 if args.execute and target.exists():target=B/f'promotion-attempt-{time.time_ns()}.json'
 target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':report['status'],'report':str(target.relative_to(ROOT)),'error':report.get('error')},ensure_ascii=False));return 0 if report['status']!='FAIL' else 1
if __name__=='__main__':raise SystemExit(main())
