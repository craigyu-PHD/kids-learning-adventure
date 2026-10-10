#!/usr/bin/env python3
"""Transactional B04 local promotion. Root is the sole --execute writer."""
from __future__ import annotations
import argparse,copy,hashlib,json,os,time
from pathlib import Path
import validate_v65_b04_acceptance as v
ROOT=v.ROOT;B=v.BATCH;MANIFEST=v.MANIFEST;OUT=B/'promotion-report.json';load=v.load;sha=v.sha
def destination(i,a,l):return ROOT/f'public/assets/v6.5/runtime/{a}/{i}-{l}.webp'
def atomic(path,data):
 path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_name(path.name+f'.b04-{os.getpid()}.tmp')
 try:tmp.write_bytes(data);tmp.replace(path)
 finally:
  if tmp.exists():tmp.unlink()
def manifest_plan(before):
 payload=copy.deepcopy(before);amap={x['id']:x for x in payload['accessories']};changed=[]
 for i,a in v.ROWS:
  row=amap.get(i) or {}
  if row.get('renderer')!='split-overlay':raise ValueError(f'{i} renderer contract')
  for l,key in (('back','backVariants'),('front','frontVariants')):
   expected=f'public/assets/v6.4/runtime/{a}/{i}-{l}.webp';actual=(row.get(key) or {}).get(a)
   if actual!=expected:raise ValueError(f'{i}/{a}/{l} current binding is not exact sealed V6.4: {actual}')
   new=str(destination(i,a,l).relative_to(ROOT));row[key][a]=new;changed.append((i,a,l,expected,new))
 if len(changed)!=24:return (_ for _ in ()).throw(ValueError('manifest exact 24 leaves'))
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
 for b in ('B01','B02','B03','B08','B09','B10','B11'):
  paths += [p for p in (ROOT/f'qa/v65/art-workpacks/{b}').rglob('*') if p.is_file() and p.name!='.DS_Store']
 return {str(p.relative_to(ROOT)):sha(p) for p in sorted(set(paths))}
def evidence_hashes():
 paths=[v.BOUNDARY,v.B06_BOUNDARY,v.B02_REPORT,v.K_REPORT,v.BUILD,v.RUNTIME,v.CAPE,v.NEGATIVE,v.SOL,v.ROOT_REVIEW,v.SUMMARY,
  ROOT/'scripts/validate_v65_b04_acceptance.py',Path(__file__),ROOT/'scripts/run_v65_b04_post_promotion.py',ROOT/'scripts/test_v65_b04_acceptance.py']
 b03=ROOT/'qa/v65/art-workpacks/B03/promotion-report.json';post=ROOT/'qa/v65/art-workpacks/B03/post-promotion/completion-summary.json'
 paths += [p for p in (b03,post,v.B03_VISUAL,v.B03_OVERSIGHT) if p.is_file()]
 return {str(p.relative_to(ROOT)):sha(p) for p in paths}
def verify_promotion(report):
 e=[]
 try:
  if report.get('status')!='PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE':e.append('promotion status')
  if report.get('manifestAfterSha256')!=sha(MANIFEST):e.append('manifest hash drift')
  if report.get('protectedHashes')!=protected_hashes():e.append('protected bytes drift')
  if report.get('evidenceHashes')!=evidence_hashes():e.append('acceptance evidence drift')
  expected_source=dict(report['sourceFilesBefore']);expected_source['src/data/avatarAssetManifest.json']=report['manifestAfterSha256']
  if v.normalize(v.source_snapshot())!=v.normalize(expected_source) or v.source_fingerprint()!=report.get('promotedInputFingerprint'):e.append('source drift beyond B04 manifest')
  expected_public=dict(report['publicFilesBefore'])
  for row in report['copies']:expected_public[row['destination']]=row['promotedSha256']
  if v.normalize(v.public_snapshot())!=v.normalize(expected_public):e.append('public drift beyond 24 B04 copies')
  original=load(ROOT/report['backupDirectory']/'avatarAssetManifest.original.json')
  if load(MANIFEST)!=manifest_plan(original):e.append('unexpected manifest mutation')
  copies=report.get('copies',[])
  if len(copies)!=24 or {(x['itemId'],x['avatarId'],x['layer']) for x in copies}!={(i,a,l) for i,a in v.ROWS for l in v.LAYERS}:e.append('copy coverage')
  for x in copies:
   dst=destination(x['itemId'],x['avatarId'],x['layer'])
   if str(dst.relative_to(ROOT))!=x['destination'] or sha(dst)!=x['promotedSha256'] or sha(ROOT/x['source'])!=x['promotedSha256']:e.append('promoted byte mismatch')
 except Exception as x:e.append(f'{type(x).__name__}: {x}')
 return e
def _failure_report(report:dict,x:Exception,started:bool,rollback_executed:bool)->dict:
 report['status']='FAIL_ROLLED_BACK' if started and rollback_executed else 'FAIL'
 report['promotionExecuted']=False
 report['rollbackExecuted']=bool(rollback_executed)
 report['error']=f'{type(x).__name__}: {x}'
 return report
def main():
 ap=argparse.ArgumentParser(description=__doc__);g=ap.add_mutually_exclusive_group(required=True);g.add_argument('--preflight',action='store_true');g.add_argument('--execute',action='store_true');ap.add_argument('--root-authorized',action='store_true');args=ap.parse_args()
 acceptance=v.run();report={'schemaVersion':1,'suite':'v65-b04-local-promotion','createdAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'status':'FAIL','promotionExecuted':False,'productionDeployed':False,'rootSolePromotionWriter':True};started=False;original={};before=None
 try:
  if not acceptance['promotionReady']:raise ValueError('strict acceptance rejected: '+str(acceptance['structuralErrors']+acceptance['visualErrors']))
  if args.execute and not args.root_authorized:raise ValueError('--execute requires --root-authorized and must be run by /root')
  before=MANIFEST.read_bytes();updated=manifest_plan(json.loads(before));rows=plan(acceptance);protect=protected_hashes();evidence=evidence_hashes();source_before=v.source_snapshot();public_before=v.public_snapshot()
  copies=[{'itemId':i,'avatarId':a,'layer':l,'source':str(src.relative_to(ROOT)),'destination':str(dst.relative_to(ROOT)),'sha256':h,'promotedSha256':h} for i,a,l,src,dst,data,h in rows]
  planned=(json.dumps(updated,ensure_ascii=False,indent=2)+'\n').encode()
  base={'promotionReady':True,'copyCount':24,'manifestFieldChangeCount':24,'manifestBeforeSha256':sha(MANIFEST),'plannedManifestSha256':hashlib.sha256(planned).hexdigest(),'candidateHashes':acceptance['candidateHashes'],'predecessorBoundary':acceptance['predecessorBoundary'],'b05ExactAllowlist':acceptance['b05ExactAllowlist'],'b06ExactAllowlist':acceptance['b06ExactAllowlist'],'protectedHashes':protect,'evidenceHashes':evidence,'copies':copies}
  if not args.execute:
   report.update(base, status='DRY_RUN_READY')
   (B/'promotion-dry-run.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':report['status'],'copyCount':24},ensure_ascii=False));return 0
  stamp=time.strftime('%Y%m%d-%H%M%S');backup=B/f'promotion-backups/{stamp}';backup.mkdir(parents=True,exist_ok=False);(backup/'avatarAssetManifest.original.json').write_bytes(before)
  for _,_,_,_,dst,_,_ in rows:
   if dst.exists():q=backup/dst.relative_to(ROOT);q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(dst.read_bytes());original[dst]=dst.read_bytes()
   else:original[dst]=None
  started=True;atomic(MANIFEST,planned)
  for _,_,_,_,dst,data,_ in rows:atomic(dst,data)
  promoted_fp=v.source_fingerprint()
  report.update(base,status='PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE',promotionExecuted=True,backupDirectory=str(backup.relative_to(ROOT)),manifestAfterSha256=sha(MANIFEST),sourceFilesBefore=source_before,publicFilesBefore=public_before,promotedInputFingerprint=promoted_fp)
  errors=verify_promotion(report)
  if errors:raise ValueError('post-write verification: '+'; '.join(errors))
  OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':report['status'],'copyCount':24,'promotedInputFingerprint':promoted_fp},ensure_ascii=False));return 0
 except Exception as x:
  rollback_executed=False
  if started and before is not None:
   atomic(MANIFEST,before)
   for dst,data in original.items():
    if data is None:
     if dst.exists():dst.unlink()
    else:atomic(dst,data)
   rollback_executed=True
  _failure_report(report,x,started,rollback_executed)
  target=B/'promotion-dry-run.json' if not args.execute else OUT;target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':report['status'],'error':report['error']},ensure_ascii=False));return 1
if __name__=='__main__':raise SystemExit(main())
