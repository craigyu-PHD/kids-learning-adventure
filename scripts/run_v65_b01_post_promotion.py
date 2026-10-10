#!/usr/bin/env python3
"""Fresh current-source B01 post-promotion build and complete 44+22+12+4 runtime gates.

Frozen candidate runners are copied into B01/post-promotion with explicit URL/
path adapters. Assertions are retained; candidate evidence is never overwritten.
"""
from __future__ import annotations
import argparse, hashlib, json, os, subprocess, sys, time, urllib.request
from pathlib import Path
import validate_v65_b01_acceptance as v
import promote_v65_b01 as p
ROOT=v.ROOT;POST=v.BATCH/'post-promotion';DIST=POST/'candidate-dist';BUILD=POST/'candidate-dist-build.json';PORT=4211
RUNNERS=('run-candidate-runtime-gate.py','run-compatibility-fit.py','run-static-stability.py','test-negative-controls.py')
def adapters():
 POST.mkdir(parents=True,exist_ok=True);out={};changes=[]
 for name in RUNNERS:
  original=(v.S/name).read_text()
  if v.sha(v.S/name)!=v.FROZEN_SCRIPT_SHA[name]:raise ValueError('frozen runner changed '+name)
  code=original.replace('Path(__file__).resolve().parents[6]',f'Path({str(ROOT)!r})')
  code=code.replace('/assets/v6.5/art-candidates/B01-round2/','/assets/v6.5/runtime/').replace('http://127.0.0.1:4201/',f'http://127.0.0.1:{PORT}/')
  code=code.replace('v65-b01-round2-candidate','v65-b01-fresh-post-promotion')
  compile(code,name,'exec');(POST/name).write_text(code);out[name]=v.sha(POST/name)
  changes.append({'file':name,'frozenSha256':v.FROZEN_SCRIPT_SHA[name],'adaptedSha256':out[name],'edits':['explicit ROOT','candidate fullskin URL -> promoted runtime URL','isolated server port','post-promotion suite label']})
 # Preserve the full image/decode/dimensions contract verbatim except URL namespace.
 image_contract=(v.S/'runtime_support.py').read_text().split('def image_state_errors',1)[1]
 image_contract='def image_state_errors'+image_contract.replace('/assets/v6.5/art-candidates/B01-round2/','/assets/v6.5/runtime/')
 code=f'''from pathlib import Path
import sys,json
ROOT=Path({str(ROOT)!r});sys.path.insert(0,str(ROOT/'scripts'))
import validate_v65_b01_acceptance as v
import promote_v65_b01 as p
WORK=Path(__file__).resolve().parent;REPORT=WORK/'candidate-dist-build.json'
ROWS=v.ROWS;ITEMS=v.support.ITEMS;AVATARS=v.AVATARS
HOLO_CANDIDATE_SHA=v.support.HOLO_CANDIDATE_SHA
sha_file=v.sha;fingerprint=v.fingerprint
current_candidate_hashes=v.support.current_candidate_hashes
def holo_candidate_url():return 'public/assets/v6.5/runtime/brother/glasses-holo-b01-fit.webp'
def verify_dist_report(r):
 e=p.verify_promotion(v.load(p.OUT))
 if r.get('status')!='PASS' or r.get('buildExitCode')!=0:e.append('fresh build failed')
 if r.get('promotionReportSha256')!=sha_file(p.OUT):e.append('promotion report binding mismatch')
 if r.get('workspaceSourceFingerprint')!=fingerprint(v.source_snapshot()):e.append('fresh build source drift')
 files={{str(x.relative_to(WORK/'candidate-dist')):sha_file(x) for x in sorted((WORK/'candidate-dist').rglob('*')) if x.is_file()}}
 if r.get('distFiles')!=files or r.get('distFingerprint')!=fingerprint(files):e.append('fresh dist drift')
 for n,h in r.get('adapterHashes',{{}}).items():
  if sha_file(WORK/n)!=h:e.append('adapter drift '+n)
 return e
'''+image_contract
 compile(code,'runtime_support.py','exec');(POST/'runtime_support.py').write_text(code);out['runtime_support.py']=v.sha(POST/'runtime_support.py')
 info={'status':'PREPARED_NOT_EXECUTED','adapterHashes':out,'changes':changes,'assertionPolicy':'Original runtime/compat/static/five negative controls retained; only source/path adapter changes. Protected K remains V64.','port':PORT}
 (POST/'adapter-preparation.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n');return out

def build_only():
 r={'suite':'v65-b01-fresh-post-promotion-build','status':'FAIL','productionDeployed':False,'createdAt':time.strftime('%Y-%m-%dT%H:%M:%S%z')}
 try:
  errors=p.verify_promotion(v.load(p.OUT))
  if errors:raise ValueError('; '.join(errors))
  before=v.source_snapshot();r.update({'promotionReportSha256':v.sha(p.OUT),'workspaceSourceFingerprint':v.fingerprint(before),'artDigest':v.art_digest(),'adapterHashes':adapters(),'runnerSha256':v.sha(Path(__file__))})
  proc=subprocess.run([str(ROOT/'node_modules/.bin/vite'),'build','--outDir',str(DIST),'--emptyOutDir'],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  r['buildExitCode']=proc.returncode;r['buildOutputTail']=proc.stdout[-10000:]
  if proc.returncode:raise ValueError('fresh vite build failed')
  files={str(x.relative_to(DIST)):v.sha(x) for x in sorted(DIST.rglob('*')) if x.is_file()}
  for row in v.load(p.OUT)['copies']:
   if files.get(row['destination'].removeprefix('public/'))!=row['sha256']:raise ValueError('fresh built promoted byte mismatch')
  if before!=v.source_snapshot() or p.verify_promotion(v.load(p.OUT)):raise ValueError('source/art drift during fresh build')
  r.update({'status':'PASS','distFiles':files,'distFingerprint':v.fingerprint(files),'indexSha256':files['index.html'],'candidateHashes':v.support.current_candidate_hashes(),'holoCandidateSha256':v.support.HOLO_CANDIDATE_SHA})
 except Exception as x:r['error']=f'{type(x).__name__}: {x}'
 POST.mkdir(parents=True,exist_ok=True);BUILD.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:r.get(k) for k in ('status','error','buildExitCode')},ensure_ascii=False));return 0 if r['status']=='PASS' else 1

def run_runtime():
 report={'suite':'v65-b01-fresh-post-promotion-all-gates','status':'FAIL','technicalEvidenceOnly':True,'visualAcceptance':'PENDING_FRESH_SCREENSHOT_REVIEW','promotionExecutedByRunner':False,'runs':[]};server=None
 try:
  build=v.load(BUILD)
  if build.get('status')!='PASS' or build.get('runnerSha256')!=v.sha(Path(__file__)):raise ValueError('fresh build/runner missing or drift')
  for n,h in build['adapterHashes'].items():
   if v.sha(POST/n)!=h:raise ValueError('adapter changed '+n)
  if p.verify_promotion(v.load(p.OUT)):raise ValueError('promotion binding drift')
  # Refuse another server on this port. Only terminate the process created here.
  import socket
  probe=socket.socket();probe.bind(('127.0.0.1',PORT));probe.close()
  server=subprocess.Popen([sys.executable,'-m','http.server',str(PORT),'--bind','127.0.0.1','--directory',str(DIST)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  for _ in range(60):
   try:
    with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/',timeout=1) as res:served=hashlib.sha256(res.read()).hexdigest()
    break
   except OSError:time.sleep(.1)
  else:raise ValueError('post server failed to start')
  if served!=build['indexSha256']:raise ValueError('wrong fresh server index')
  for name in RUNNERS:
   proc=subprocess.run([sys.executable,str(POST/name)],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
   log=POST/(name+'.log');log.write_text(proc.stdout);report['runs'].append({'runner':name,'exitCode':proc.returncode,'log':str(log.relative_to(ROOT))})
   if proc.returncode:raise ValueError(name+' failed; see preserved log')
  rt=v.load(POST/'runtime/all-role-integrated-runtime-gate.json');co=v.load(POST/'compatibility/report.json');st=v.load(POST/'static-stability/report.json');ne=v.load(POST/'runtime/negative-controls.json')
  if len(rt['rows'])!=11 or sum(len(x['cases']) for x in rt['rows'])!=44 or len(co['rows'])!=22 or len(st['staticRows'])!=12 or len(st['defaultBlinkControls'])!=4 or len(ne['cases'])!=5:raise ValueError('fresh coverage mismatch')
  for row in rt['rows']:
   for case in row['cases']:
    for state in case['states'].values():
     if isinstance(state,dict) and any('/assets/v6.5/art-candidates/' in im.get('src','') for im in state.get('images',[])):raise ValueError('candidate URL leaked into fresh promoted runtime')
  for row in co['rows']:
   item,av,x=row['itemId'],row['avatarId'],row['coEquippedItemId'];images=row['state']['images']
   base=next(im for im in images if im.get('isBase'));extras=[im for im in images if im.get('itemId')==x]
   suffix='glasses-holo-b01-fit' if (av,x)==('brother','glasses-holo') else x
   expected=f'/assets/v6.5/runtime/{av}/{suffix}.webp'
   if len(extras)!=1 or expected not in extras[0].get('src','') or extras[0].get('decoded') is not True or extras[0].get('visible') is not True:raise ValueError('fresh compatibility actual extra invalid')
   if any(abs(extras[0].get(field,{}).get(n,-999)-base.get(field,{}).get(n,999))>.5 for field in ('painted','rect') for n in ('x','y','width','height')):raise ValueError('fresh compatibility painted canvas mismatch')
  # Candidate code's static pass does not assert byte identity; enforce it here.
  if any(x['state'].get('screenshotBytesIdentical') is not True for x in st['staticRows']):raise ValueError('fresh fullskin static pixels changed')
  if p.verify_promotion(v.load(p.OUT)) or build['workspaceSourceFingerprint']!=v.fingerprint(v.source_snapshot()):raise ValueError('post capture source drift')
  report.update({'status':'PASS_TECHNICAL_PENDING_FRESH_VISUAL','artDigest':v.art_digest(),'promotionReportSha256':v.sha(p.OUT),'freshBuildSha256':v.sha(BUILD),'distFingerprint':build['distFingerprint'],'coverage':{'runtimeCases':44,'compatibility':22,'static':12,'defaultBlink':4,'negativeControls':5},'protectedKProductVisualPass':False})
 except Exception as x:report['error']=f'{type(x).__name__}: {x}'
 finally:
  if server:server.terminate();server.wait(timeout=10)
 POST.mkdir(parents=True,exist_ok=True);(POST/'completion-summary.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2));return 0 if report['status'].startswith('PASS_') else 1

def main():
 ap=argparse.ArgumentParser(description=__doc__);g=ap.add_mutually_exclusive_group(required=True);g.add_argument('--prepare-only',action='store_true');g.add_argument('--build-only',action='store_true');g.add_argument('--runtime',action='store_true');args=ap.parse_args()
 if args.prepare_only:print(json.dumps({'prepared':adapters(),'executed':False}));return 0
 return build_only() if args.build_only else run_runtime()
if __name__=='__main__':raise SystemExit(main())
