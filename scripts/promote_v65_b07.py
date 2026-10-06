#!/usr/bin/env python3
"""Transactional B07 repair-v4 promoter; prepare-only until B06 hashes are bound."""
from __future__ import annotations
import argparse, copy, hashlib, json, os, time
from pathlib import Path
import validate_v65_b07_acceptance as v

ROOT=v.ROOT; BATCH=v.BATCH; MANIFEST=v.MANIFEST; OUT=BATCH/'promotion-report.json'

def destination(item,avatar): return ROOT/f'public/assets/v6.5/runtime/{avatar}/{item}.webp'
def atomic(path,data):
    path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_name(path.name+f'.b07-{os.getpid()}.tmp')
    try: tmp.write_bytes(data);tmp.replace(path)
    finally:
        if tmp.exists():tmp.unlink()
def mark_failed(report,exc,*,rolled_back):
    report.update(status='FAIL_ROLLED_BACK' if rolled_back else 'FAIL',promotionExecuted=False,error=f'{type(exc).__name__}: {exc}')
    if rolled_back:report['rollbackCompleted']=True
    return report

def manifest_plan(before):
    planned=copy.deepcopy(before);acc={x['id']:x for x in planned['accessories']};changes=[]
    for item,avatar in v.ROWS:
        row=acc[item]
        if row.get('renderer')!='aligned-overlay' or row.get('slot')!='face':raise ValueError(item+' renderer/slot contract')
        expected=f'public/assets/v6.4/runtime/{avatar}/{item}.webp';actual=row.get('variants',{}).get(avatar)
        if actual!=expected:raise ValueError(f'{item}/{avatar} exact V6.4 leaf required: {actual}')
        new=str(destination(item,avatar).relative_to(ROOT));row['variants'][avatar]=new;changes.append((item,avatar,expected,new))
    if len(changes)!=12:raise ValueError('manifest change count is not 12')
    return planned

def copy_plan(acceptance):
    rows=[]
    for item,avatar in v.ROWS:
        src=v.source_path(item,avatar);data=src.read_bytes();digest=hashlib.sha256(data).hexdigest()
        if digest!=acceptance['candidateHashes'][f'{item}:{avatar}']:raise ValueError('candidate bytes drift')
        rows.append((item,avatar,src,destination(item,avatar),data,digest))
    if len(rows)!=12 or len({x[3] for x in rows})!=12:raise ValueError('copy plan exact coverage')
    return rows

def protected_hashes():
    targets={destination(i,a) for i,a in v.ROWS};paths=[]
    for base in (ROOT/'public/assets/v6.4',ROOT/'public/assets/v6.5'):
        paths += [p for p in base.rglob('*') if p.is_file() and p.name!='.DS_Store' and p not in targets]
    for batch in ('B01','B02','B03','B04','B05','B06','B08','B09','B10','B11'):
        base=ROOT/f'qa/v65/art-workpacks/{batch}'
        if base.exists():paths += [p for p in base.rglob('*') if p.is_file() and p.name!='.DS_Store']
    paths += [ROOT/p for p in v.expected_allowlist()]
    return {str(p.relative_to(ROOT)):v.sha(p) for p in sorted(set(paths))}

def evidence_hashes():
    paths=list(v.SEALED)+list(v.B06_PATHS.values())+[v.ALLOWLIST,v.BATCH/'acceptance-preparation.json',ROOT/'scripts/validate_v65_b07_acceptance.py',Path(__file__),ROOT/'scripts/run_v65_b07_post_promotion.py',ROOT/'scripts/test_v65_b07_acceptance.py']
    return {str(p.relative_to(ROOT)):v.sha(p) for p in paths if p.is_file()}

def verify_promotion(report):
    errors=[]
    try:
        if report.get('status')!='PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE':errors.append('promotion status')
        if report.get('manifestAfterSha256')!=v.sha(MANIFEST):errors.append('manifest hash')
        if report.get('protectedHashes')!=protected_hashes():errors.append('protected bytes drift')
        if report.get('evidenceHashes')!=evidence_hashes():errors.append('evidence bytes drift')
        expected_source=dict(report['sourceFilesBefore']);expected_source['src/data/avatarAssetManifest.json']=report['manifestAfterSha256']
        if v.normalize(v.source_snapshot())!=v.normalize(expected_source):errors.append('source drift beyond B07 manifest')
        expected_public=dict(report['publicFilesBefore'])
        for row in report['copies']:expected_public[row['destination']]=row['promotedSha256']
        if v.normalize(v.public_snapshot())!=v.normalize(expected_public):errors.append('public drift beyond 12 B07 runtime copies')
        original=v.load(ROOT/report['backupDirectory']/'avatarAssetManifest.original.json')
        if v.load(MANIFEST)!=manifest_plan(original):errors.append('manifest mutation beyond exact 12 leaves')
        copies=report.get('copies',[])
        if len(copies)!=12 or {(x['itemId'],x['avatarId']) for x in copies}!=set(v.ROWS):errors.append('copy coverage')
        for row in copies:
            dst=destination(row['itemId'],row['avatarId'])
            if str(dst.relative_to(ROOT))!=row['destination'] or v.sha(dst)!=row['promotedSha256'] or v.sha(ROOT/row['source'])!=row['promotedSha256']:errors.append('promoted byte mismatch')
    except Exception as exc:errors.append(f'{type(exc).__name__}: {exc}')
    return errors

def main():
    ap=argparse.ArgumentParser();g=ap.add_mutually_exclusive_group(required=True);g.add_argument('--prepare-only',action='store_true');g.add_argument('--preflight',action='store_true');g.add_argument('--execute',action='store_true');ap.add_argument('--root-authorized',action='store_true');args=ap.parse_args()
    report={'schemaVersion':1,'suite':'v65-b07-repair-v4-local-promotion','createdAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'status':'FAIL','errors':[],'promotionExecuted':False,'productionDeployed':False,'rootSolePromotionWriter':True};started=False;before_bytes=None;originals={}
    try:
        acceptance=v.run(allow_placeholders=args.prepare_only)
        if args.prepare_only:
            if not acceptance.get('candidateEvidenceReady'):raise ValueError('prepare-only candidate contract rejected')
        elif not acceptance['promotionReady']:raise ValueError('strict acceptance rejected: '+str(acceptance['structuralErrors']+acceptance['visualErrors']))
        if args.execute and not args.root_authorized:raise ValueError('--execute requires --root-authorized and /root')
        before_bytes=MANIFEST.read_bytes();planned=manifest_plan(json.loads(before_bytes));rows=copy_plan(acceptance);planned_bytes=(json.dumps(planned,ensure_ascii=False,indent=2)+'\n').encode()
        copies=[{'itemId':i,'avatarId':a,'source':str(src.relative_to(ROOT)),'destination':str(dst.relative_to(ROOT)),'sha256':h,'promotedSha256':h} for i,a,src,dst,_,h in rows]
        base={'errors':[],'promotionReady':acceptance['promotionReady'],'copyCount':12,'manifestFieldChangeCount':12,'manifestBeforeSha256':v.sha(MANIFEST),'plannedManifestSha256':hashlib.sha256(planned_bytes).hexdigest(),'candidateHashes':acceptance['candidateHashes'],'predecessorBoundary':acceptance['predecessorBoundary'],'blockingPlaceholders':acceptance['blockingPlaceholders'],'candidateAuthorizedFiles':v.expected_allowlist(),'protectedHashes':protected_hashes(),'evidenceHashes':evidence_hashes(),'copies':copies}
        if args.prepare_only:
            report.update(base,status='PREPARED_READY_FOR_FORMAL_DRY_RUN')
            (BATCH/'promoter-preparation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':report['status'],'copyCount':12,'manifestFieldChangeCount':12}));return 0
        if not args.execute:
            report.update(base,status='DRY_RUN_READY');(BATCH/'promotion-dry-run.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':report['status'],'copyCount':12,'manifestFieldChangeCount':12}));return 0
        stamp=time.strftime('%Y%m%d-%H%M%S');backup=BATCH/f'promotion-backups/{stamp}';backup.mkdir(parents=True,exist_ok=False);(backup/'avatarAssetManifest.original.json').write_bytes(before_bytes)
        for _,_,_,dst,_,_ in rows:
            if dst.exists():arch=backup/dst.relative_to(ROOT);arch.parent.mkdir(parents=True,exist_ok=True);arch.write_bytes(dst.read_bytes());originals[dst]=dst.read_bytes()
            else:originals[dst]=None
        source_before=v.source_snapshot();public_before=v.public_snapshot();started=True;atomic(MANIFEST,planned_bytes)
        for _,_,_,dst,data,_ in rows:atomic(dst,data)
        report.update(base,status='PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE',promotionExecuted=True,backupDirectory=str(backup.relative_to(ROOT)),manifestAfterSha256=v.sha(MANIFEST),sourceFilesBefore=source_before,publicFilesBefore=public_before,promotedInputFingerprint=v.source_fingerprint())
        errors=verify_promotion(report)
        if errors:raise ValueError('post-write verification: '+'; '.join(errors))
        OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');return 0
    except Exception as exc:
        rollback=[]
        if started and before_bytes is not None:
            try:atomic(MANIFEST,before_bytes)
            except Exception as e:rollback.append('manifest '+repr(e))
            for dst,data in originals.items():
                try:
                    if data is None:
                        if dst.exists():dst.unlink()
                    else:atomic(dst,data)
                except Exception as e:rollback.append(str(dst)+' '+repr(e))
        mark_failed(report,exc,rolled_back=started and not rollback);report['errors']=[report['error']]
        if started and rollback:report.update(status='FAIL_ROLLBACK_INCOMPLETE',promotionExecuted=False,rollbackCompleted=False,rollbackErrors=rollback)
        target=BATCH/('promoter-preparation.json' if args.prepare_only else 'promotion-dry-run.json' if not args.execute else 'promotion-report.json');target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':'FAIL','error':report['error']}));return 1

if __name__=='__main__':raise SystemExit(main())
