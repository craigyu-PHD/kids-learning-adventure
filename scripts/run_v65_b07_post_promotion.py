#!/usr/bin/env python3
"""Prepare or run fresh B07 repair-v4 gates. Never performs promotion."""
from __future__ import annotations
import argparse, hashlib, json, os, re, shutil, socket, subprocess, sys, time, urllib.request
from pathlib import Path
import promote_v65_b07 as p
import validate_v65_b07_acceptance as v

ROOT=v.ROOT;POST_ROOT=v.BATCH/'post-promotion';ATTEMPTS=POST_ROOT/'attempts';PORT=4219
SOURCES={'run-runtime-gate.py':'runtime-gate-report.json','run-compatibility.py':'compatibility-report.json','normalize-screenshot-evidence.py':None,'test-negative-controls.py':'negative-controls-report.json','build-review-boards.py':None}
STATE_FN='''def avatar_state(locator) -> dict[str, Any]:
    return locator.evaluate("""async el => ({
      avatar:[...el.classList].find(v=>v.startsWith('avatar-') && !['avatar-renderer','avatar-photo-hero'].includes(v)) || '',
      cosmetics:(el.dataset.cosmetics||'').split(/\\s+/).filter(Boolean), rendered:(el.dataset.renderedItems||'').split(/\\s+/).filter(Boolean),
      artMode:el.dataset.artMode||'', runtimeDetail:el.dataset.runtimeDetail||'',
      images:await Promise.all([...el.querySelectorAll('img')].map(async(img,index)=>{let decoded=false;try{await img.decode();decoded=true}catch{};const r=img.getBoundingClientRect();let visible=r.width>0&&r.height>0;for(let n=img;n;n=n.parentElement){const c=getComputedStyle(n);if(c.visibility!=='visible'||c.display==='none'||Number(c.opacity)===0)visible=false};return {index,src:img.currentSrc||img.src,itemId:img.dataset.wearableItem||'',classes:[...img.classList],nw:img.naturalWidth,nh:img.naturalHeight,complete:img.complete,decoded,visible}}))
    })""")

'''

def mark_failed(result,exc):result.update(status='FAIL',error=f'{type(exc).__name__}: {exc}');return result

def new_attempt(label):
    attempt_id=f"attempt-{time.strftime('%Y%m%d-%H%M%S')}-{time.time_ns()%1000000:06d}-{os.getpid()}-{label}"
    work=ATTEMPTS/attempt_id;work.mkdir(parents=True,exist_ok=False);return attempt_id,work

def attempt_path(attempt_id):
    work=ATTEMPTS/attempt_id
    if not work.is_dir() or work.parent!=ATTEMPTS:raise ValueError('unknown attempt id')
    return work

def record_attempt(attempt_id,work,mode,status):
    index=POST_ROOT/'attempt-index.json';data={'schemaVersion':1,'attempts':[]}
    if index.is_file():data=v.load(index)
    data['attempts'].append({'attemptId':attempt_id,'path':str(work.relative_to(ROOT)),'mode':mode,'status':status,'recordedAt':time.strftime('%Y-%m-%dT%H:%M:%S%z')})
    index.parent.mkdir(parents=True,exist_ok=True);index.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

def assert_build_attempt_unused(attempt_id):
    if attempt_id is not None:raise ValueError('--build-only always creates a new attempt; existing attempt-id reuse is forbidden')

def assert_runtime_attempt_unused(work):
    forbidden=('completion-summary.json','runtime-gate-report.json','compatibility-report.json','negative-controls-report.json','raw-reports','runtime-captures','compatibility-captures','visual-review-boards','compatibility-review-boards')
    present=[name for name in forbidden if (work/name).exists()]
    if present:raise ValueError('attempt already has runtime artifacts; create a new build attempt: '+','.join(present))

def preserve_and_normalize(work):
    raw=work/'raw-reports';raw.mkdir(exist_ok=False)
    for name in ('runtime-gate-report.json','compatibility-report.json'):shutil.copy2(work/name,raw/name)
    proc=subprocess.run([sys.executable,str(work/'normalize-screenshot-evidence.py')],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    log=work/'normalize-screenshot-evidence.py.log';log.write_text(proc.stdout)
    if proc.returncode:raise ValueError('normalize-screenshot-evidence.py failed: '+proc.stdout[-1000:])
    return {'runner':'normalize-screenshot-evidence.py','exitCode':proc.returncode,'log':str(log.relative_to(ROOT)),'rawReports':str(raw.relative_to(ROOT))}

def adapters(work):
    work.mkdir(parents=True,exist_ok=True);hashes={}
    for name in SOURCES:
        code=(v.S/name).read_text().replace('http://127.0.0.1:4217/',f'http://127.0.0.1:{PORT}/').replace('art-candidates/B07-repair-v4','runtime')
        if name in ('run-runtime-gate.py','run-compatibility.py'):
            code,n=re.subn(r'def avatar_state\(locator\).*?\n\ndef wait_item_state',lambda _:STATE_FN+'def wait_item_state',code,flags=re.S)
            if n!=1:raise ValueError('avatar_state adapter mismatch '+name)
            code=code.replace('decoded = all(row["nw"] > 0 and row["nh"] > 0 for row in last["images"])','decoded = all(row.get("complete") is True and row.get("decoded") is True and row.get("visible") is True and row["nw"] > 0 and row["nh"] > 0 for row in last["images"]) and len([row for row in last["images"] if "avatar-renderer-skin" in row.get("classes", [])]) == 1')
            code=code.replace('for row in state["images"]:\n        if row["nw"] <= 0 or row["nh"] <= 0: failures.append', 'bases=[x for x in state["images"] if "avatar-renderer-skin" in x.get("classes",[])]\n    if len(bases)!=1 or not all(bases[0].get(k) is True for k in ("complete","decoded","visible")): failures.append(f"{surface}: base skin not exactly one complete decoded visible image")\n    for row in state["images"]:\n        if row["nw"] <= 0 or row["nh"] <= 0 or not all(row.get(k) is True for k in ("complete","decoded","visible")): failures.append')
        compile(code,name,'exec');target=work/name;target.write_text(code);hashes[name]=v.sha(target)
    support=f'''from pathlib import Path
import hashlib,json,sys
ROOT=Path({str(ROOT)!r});sys.path.insert(0,str(ROOT/'scripts'))
import validate_v65_b07_acceptance as v
import promote_v65_b07 as p
WORK=Path(__file__).resolve().parent;OUT=WORK/'candidate-dist';BUILD_REPORT=WORK/'candidate-dist-build.json';RUNTIME_REPORT=WORK/'runtime-gate-report.json'
ITEMS=v.ITEMS;AVATARS=v.AVATARS;ROWS=v.ROWS;VIEW_MODES=v.MODES;SOURCE_DIR=v.BATCH/'candidates'
def sha_file(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def fingerprint(x):return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def source_path(i,a):return SOURCE_DIR/a/f'{{i}}.webp'
def candidate_url(i,a):return f'public/assets/v6.5/runtime/{{a}}/{{i}}.webp'
def candidate_hashes():return {{f'{{i}}:{{a}}':sha_file(source_path(i,a)) for i,a in ROWS}}
def dist_snapshot():return {{str(x.relative_to(OUT)):sha_file(x) for x in sorted(OUT.rglob('*')) if x.is_file() and x.name!='.DS_Store'}}
def verify_dist_report(r):
 e=p.verify_promotion(v.load(p.OUT))
 if r.get('status')!='PASS' or r.get('postPromotion') is not True:e.append('fresh build/promotion binding')
 if r.get('candidateHashes')!=candidate_hashes():e.append('candidate source drift')
 if r.get('rootSourceStartFingerprint')!=v.load(p.OUT).get('promotedInputFingerprint'):e.append('post build source fingerprint')
 files=dist_snapshot()
 if r.get('distFiles')!=files or r.get('distFingerprint')!=fingerprint(files):e.append('fresh dist drift')
 for n,h in r.get('adapterHashes',{{}}).items():
  if sha_file(WORK/n)!=h:e.append('adapter drift '+n)
 return e
'''
    compile(support,'runtime_support.py','exec');(work/'runtime_support.py').write_text(support);hashes['runtime_support.py']=v.sha(work/'runtime_support.py')
    info={'schemaVersion':1,'status':'PREPARED_NOT_EXECUTED','attemptPath':str(work.relative_to(ROOT)),'port':PORT,'adapterHashes':hashes,'freshScope':{'fullFlowCases':48,'representativeCompatibility':16,'totalCases':64,'baseDecodedVisibleStates':384,'syntheticNegativeControls':5,'actualVisualBoards':16,'rootFreshVisualRequired':True},'promotionExecuted':False,'productionDeployed':False}
    (work/'adapter-preparation.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n');return hashes

def build_only(attempt_id=None):
    assert_build_attempt_unused(attempt_id);attempt_id,work=new_attempt('build')
    dist=work/'candidate-dist';build_path=work/'candidate-dist-build.json'
    result={'schemaVersion':1,'suite':'v65-b07-fresh-post-build','createdAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'status':'FAIL','postPromotion':True}
    try:
        promotion=v.load(p.OUT);errors=p.verify_promotion(promotion)
        if errors:raise ValueError('; '.join(errors))
        result.update(attemptId=attempt_id,attemptPath=str(work.relative_to(ROOT)),promotionReportSha256=v.sha(p.OUT),adapterHashes=adapters(work),candidateHashes=v.candidate_hashes(),rootSourceStartFingerprint=v.source_fingerprint())
        if result['rootSourceStartFingerprint']!=promotion.get('promotedInputFingerprint'):raise ValueError('source fingerprint before fresh build')
        proc=subprocess.run([str(ROOT/'node_modules/.bin/vite'),'build','--outDir',str(dist),'--emptyOutDir'],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(work/'build.log').write_text(proc.stdout);result.update(buildExitCode=proc.returncode,buildLog=str((work/'build.log').relative_to(ROOT)),buildOutputTail=proc.stdout[-10000:])
        if proc.returncode:raise ValueError('fresh build failed')
        files={str(x.relative_to(dist)):v.sha(x) for x in sorted(dist.rglob('*')) if x.is_file() and x.name!='.DS_Store'}
        for row in promotion['copies']:
            if files.get(row['destination'].removeprefix('public/'))!=row['promotedSha256']:raise ValueError('built promoted byte mismatch')
        if p.verify_promotion(promotion):raise ValueError('promotion drift during build')
        result.update(status='PASS',distFiles=files,distFingerprint=v.fingerprint(files),indexSha256=files['index.html'],rootSourceEndFingerprint=v.source_fingerprint())
        if result['rootSourceEndFingerprint']!=result['rootSourceStartFingerprint']:raise ValueError('source drift during build')
    except Exception as exc:mark_failed(result,exc)
    build_path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');record_attempt(attempt_id,work,'build',result['status']);print(json.dumps({'attemptId':attempt_id,'status':result['status']}));return 0 if result['status']=='PASS' else 1

def runtime(attempt_id):
    work=attempt_path(attempt_id);dist=work/'candidate-dist';build_path=work/'candidate-dist-build.json'
    assert_runtime_attempt_unused(work)
    result={'schemaVersion':1,'suite':'v65-b07-fresh-post-gates','createdAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'status':'FAIL','visualAcceptance':'PENDING_FRESH_ROOT_ACTUAL_REVIEW','runs':[]};server=None
    try:
        build=v.load(build_path)
        if build.get('status')!='PASS':raise ValueError('fresh build absent')
        for n,h in build['adapterHashes'].items():
            if v.sha(work/n)!=h:raise ValueError('adapter drift '+n)
        if p.verify_promotion(v.load(p.OUT)):raise ValueError('promotion drift')
        probe=socket.socket();probe.bind(('127.0.0.1',PORT));probe.close();server=subprocess.Popen([sys.executable,'-m','http.server',str(PORT),'--bind','127.0.0.1','--directory',str(dist)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(60):
            try:served=hashlib.sha256(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/',timeout=1).read()).hexdigest();break
            except OSError:time.sleep(.1)
        else:raise ValueError('fresh server failed')
        if served!=build['indexSha256']:raise ValueError('wrong served dist')
        for name in ('run-runtime-gate.py','run-compatibility.py'):
            proc=subprocess.run([sys.executable,str(work/name)],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT);log=work/(name+'.log');log.write_text(proc.stdout);result['runs'].append({'runner':name,'exitCode':proc.returncode,'log':str(log.relative_to(ROOT))})
            if proc.returncode:raise ValueError(name+' failed')
        result['runs'].append(preserve_and_normalize(work))
        proc=subprocess.run([sys.executable,str(work/'test-negative-controls.py')],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT);log=work/'test-negative-controls.py.log';log.write_text(proc.stdout);result['runs'].append({'runner':'test-negative-controls.py','exitCode':proc.returncode,'log':str(log.relative_to(ROOT))})
        if proc.returncode:raise ValueError('test-negative-controls.py failed')
        normal=v.load(work/'runtime-gate-report.json');compat=v.load(work/'compatibility-report.json');negative=v.load(work/'negative-controls-report.json')
        if len(normal.get('rows',[]))!=48 or len(compat.get('rows',[]))!=16 or normal.get('status')!='PASS_TECHNICAL_CAPTURE_ONLY' or compat.get('status')!='PASS_TECHNICAL_CAPTURE_ONLY':raise ValueError('fresh exact 64 cases')
        states=0
        for report in (normal,compat):
            for row in report['rows']:
                if not row.get('pass') or row.get('failures'):raise ValueError('fresh row failed')
                for name in v.STATES:
                    states+=1;bases=[x for x in row['states'][name].get('images',[]) if 'avatar-renderer-skin' in x.get('classes',[])]
                    if len(bases)!=1 or not all(bases[0].get(k) is True for k in ('complete','decoded','visible')):raise ValueError('fresh base readiness')
        if states!=384:raise ValueError('fresh state count')
        if negative.get('status')!='PASS' or len(negative.get('cases',[]))<5:raise ValueError('fresh five-plus negatives')
        subprocess.run([sys.executable,str(work/'build-review-boards.py')],cwd=ROOT,check=True)
        result.update(attemptId=attempt_id,attemptPath=str(work.relative_to(ROOT)),status='PASS_TECHNICAL_PENDING_FRESH_ROOT_VISUAL',promotionReportSha256=v.sha(p.OUT),buildReportSha256=v.sha(build_path),sourceFingerprint=v.source_fingerprint(),coverage={'fullFlowCases':48,'representativeCompatibility':16,'totalCases':64,'baseDecodedVisibleStates':384,'syntheticNegativeControls':len(negative['cases']),'freshBoards':16},reports={n:v.bound(work/n) for n in ('runtime-gate-report.json','compatibility-report.json','negative-controls-report.json')})
    except Exception as exc:mark_failed(result,exc)
    finally:
        if server:server.terminate();server.wait(timeout=10)
    (work/'completion-summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');record_attempt(attempt_id,work,'runtime',result['status']);return 0 if result['status'].startswith('PASS_') else 1

def main():
    ap=argparse.ArgumentParser();g=ap.add_mutually_exclusive_group(required=True);g.add_argument('--prepare-only',action='store_true');g.add_argument('--build-only',action='store_true');g.add_argument('--runtime',action='store_true');ap.add_argument('--attempt-id');args=ap.parse_args()
    if args.prepare_only:
        attempt_id,work=new_attempt('prepare');prepared=adapters(work);record_attempt(attempt_id,work,'prepare','PREPARED_NOT_EXECUTED');print(json.dumps({'attemptId':attempt_id,'attemptPath':str(work.relative_to(ROOT)),'prepared':prepared,'executed':False}));return 0
    if args.runtime and not args.attempt_id:ap.error('--runtime requires --attempt-id from --build-only')
    return build_only(args.attempt_id) if args.build_only else runtime(args.attempt_id)
if __name__=='__main__':raise SystemExit(main())
