#!/usr/bin/env python3
"""Prepare/build/run fresh B04 post-promotion gates. Does not promote or deploy."""
from __future__ import annotations
import argparse,hashlib,json,socket,subprocess,sys,time,urllib.request
from pathlib import Path
import validate_v65_b04_acceptance as v
import promote_v65_b04 as p
ROOT=v.ROOT;POST=v.BATCH/'post-promotion';DIST=POST/'candidate-dist';BUILD=POST/'candidate-dist-build.json';PORT=4214
SOURCE_NAMES=('run-runtime-gate.py','run-cape-compat-gate.py','test-negative-controls.py','build-review-boards.py','build-cape-review-boards.py')
def adapters():
 POST.mkdir(parents=True,exist_ok=True);hashes={}
 for name in SOURCE_NAMES:
  source=v.S/name;code=source.read_text()
  code=code.replace('http://127.0.0.1:4214/',f'http://127.0.0.1:{PORT}/')
  if name in ('run-runtime-gate.py','run-cape-compat-gate.py'):code=code.replace('"candidateOnly":True','"candidateOnly":False,"postPromotion":True')
  compile(code,name,'exec');(POST/name).write_text(code);hashes[name]=v.sha(POST/name)
 code=f'''from pathlib import Path
import hashlib,json,sys
ROOT=Path({str(ROOT)!r});sys.path.insert(0,str(ROOT/'scripts'))
import validate_v65_b04_acceptance as v
import promote_v65_b04 as p
WORK=Path(__file__).resolve().parent;OUT=WORK/'candidate-dist';BUILD_REPORT=WORK/'candidate-dist-build.json';RUNTIME_REPORT=WORK/'runtime-gate-report.json'
ITEMS=v.ITEMS;AVATARS=v.AVATARS;LAYERS=v.LAYERS;ROWS=v.ROWS;VIEW_MODES=v.MODES
SOURCE_DIR=v.BATCH/'fit-candidates'
def sha_file(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def fingerprint(x):return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def source_path(i,a,l):return SOURCE_DIR/f'{{a}}__{{i}}-{{l}}.webp'
def candidate_url(i,a,l):return f'public/assets/v6.5/runtime/{{a}}/{{i}}-{{l}}.webp'
def candidate_hashes():return {{f'{{i}}:{{a}}:{{l}}':sha_file(source_path(i,a,l)) for i,a in ROWS for l in LAYERS}}
def dist_snapshot():return {{str(x.relative_to(OUT)):sha_file(x) for x in sorted(OUT.rglob('*')) if x.is_file() and x.name!='.DS_Store'}}
def verify_dist_report(r):
 e=p.verify_promotion(v.load(p.OUT))
 if r.get('status')!='PASS' or r.get('promotionReportSha256')!=sha_file(p.OUT):e.append('fresh build/promotion binding')
 if r.get('candidateHashes')!=candidate_hashes():e.append('candidate source drift')
 if r.get('rootSourceStartFingerprint')!=v.load(p.OUT).get('promotedInputFingerprint'):e.append('post build source fingerprint')
 files=dist_snapshot()
 if r.get('distFiles')!=files or r.get('distFingerprint')!=fingerprint(files):e.append('fresh dist drift')
 for n,h in r.get('adapterHashes',{{}}).items():
  if sha_file(WORK/n)!=h:e.append('adapter drift '+n)
 return e
'''
 compile(code,'runtime_support.py','exec');(POST/'runtime_support.py').write_text(code);hashes['runtime_support.py']=v.sha(POST/'runtime_support.py')
 info={'schemaVersion':1,'status':'PREPARED_NOT_EXECUTED','port':PORT,'adapterHashes':hashes,'freshScope':{'fullFlow':48,'capeCompatibility':48,'negativeControls':4,'boards':24},'promotionExecuted':False}
 (POST/'adapter-preparation.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n');return hashes
def _failed_result(result:dict,x:Exception)->dict:
 result['status']='FAIL';result['error']=f'{type(x).__name__}: {x}';return result
def build_only():
 result={'schemaVersion':1,'suite':'v65-b04-fresh-post-build','createdAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'status':'FAIL'}
 try:
  promotion=v.load(p.OUT);errors=p.verify_promotion(promotion)
  if errors:raise ValueError('; '.join(errors))
  result.update({'promotionReportSha256':v.sha(p.OUT),'adapterHashes':adapters(),'candidateHashes':v.candidate_hashes(),'rootSourceStartFingerprint':v.source_fingerprint()})
  if result['rootSourceStartFingerprint']!=promotion.get('promotedInputFingerprint'):raise ValueError('source fingerprint before post build')
  proc=subprocess.run([str(ROOT/'node_modules/.bin/vite'),'build','--outDir',str(DIST),'--emptyOutDir'],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT);result['buildExitCode']=proc.returncode;result['buildOutputTail']=proc.stdout[-10000:]
  if proc.returncode:raise ValueError('fresh build failed')
  files={str(x.relative_to(DIST)):v.sha(x) for x in sorted(DIST.rglob('*')) if x.is_file() and x.name!='.DS_Store'}
  for row in promotion['copies']:
   if files.get(row['destination'].removeprefix('public/'))!=row['promotedSha256']:raise ValueError('built promoted byte mismatch')
  if p.verify_promotion(promotion):raise ValueError('promotion drift during build')
  result.update({'status':'PASS','distFiles':files,'distFingerprint':v.fingerprint(files),'indexSha256':files['index.html'],'rootSourceEndFingerprint':v.source_fingerprint()})
  if result['rootSourceEndFingerprint']!=result['rootSourceStartFingerprint']:raise ValueError('source drift during build')
 except Exception as x:_failed_result(result,x)
 BUILD.parent.mkdir(parents=True,exist_ok=True);BUILD.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':result['status'],'error':result.get('error')},ensure_ascii=False));return 0 if result['status']=='PASS' else 1
def runtime():
 result={'schemaVersion':1,'suite':'v65-b04-fresh-post-gates','createdAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'status':'FAIL','visualAcceptance':'PENDING_FRESH_ACTUAL_REVIEW','runs':[]};server=None
 try:
  build=v.load(BUILD)
  if build.get('status')!='PASS':raise ValueError('fresh build absent')
  for n,h in build['adapterHashes'].items():
   if v.sha(POST/n)!=h:raise ValueError('adapter drift '+n)
  promotion=v.load(p.OUT)
  if p.verify_promotion(promotion):raise ValueError('promotion drift')
  probe=socket.socket();probe.bind(('127.0.0.1',PORT));probe.close()
  server=subprocess.Popen([sys.executable,'-m','http.server',str(PORT),'--bind','127.0.0.1','--directory',str(DIST)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  for _ in range(60):
   try:
    with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/',timeout=1) as res:served=hashlib.sha256(res.read()).hexdigest()
    break
   except OSError:time.sleep(.1)
  else:raise ValueError('server failed')
  if served!=build['indexSha256']:raise ValueError('wrong served dist')
  for name in ('run-runtime-gate.py','test-negative-controls.py','run-cape-compat-gate.py'):
   proc=subprocess.run([sys.executable,str(POST/name)],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
   log=POST/(name+'.log');log.write_text(proc.stdout);result['runs'].append({'runner':name,'exitCode':proc.returncode,'log':str(log.relative_to(ROOT))})
   if proc.returncode:raise ValueError(name+' failed')
  rt=v.load(POST/'runtime-gate-report.json');neg=v.load(POST/'negative-controls-report.json');cape=v.load(POST/'cape-compat-report.json')
  if rt.get('status')!='PASS_TECHNICAL_CAPTURE_ONLY' or len(rt.get('rows',[]))!=48 or not all(x.get('pass') for x in rt['rows']):raise ValueError('fresh 48 flow')
  if cape.get('status')!='PASS_TECHNICAL_CAPTURE_ONLY' or len(cape.get('rows',[]))!=48 or not all(x.get('pass') for x in cape['rows']):raise ValueError('fresh 48 cape')
  if neg.get('status')!='PASS' or not neg.get('baselineIntegrityPass') or len(neg.get('cases',[]))!=4:raise ValueError('fresh negatives')
  for name in ('build-review-boards.py','build-cape-review-boards.py'):subprocess.run([sys.executable,str(POST/name)],cwd=ROOT,check=True)
  result.update({'status':'PASS_TECHNICAL_PENDING_FRESH_VISUAL','promotionReportSha256':v.sha(p.OUT),'buildReportSha256':v.sha(BUILD),'sourceFingerprint':v.source_fingerprint(),'coverage':{'fullFlow':48,'capeCompatibility':48,'negativeControls':4,'freshBoards':24},'reports':{n:v.bound(POST/n) for n in ('runtime-gate-report.json','cape-compat-report.json','negative-controls-report.json')}})
 except Exception as x:_failed_result(result,x)
 finally:
  if server:server.terminate();server.wait(timeout=10)
 (POST/'completion-summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False,indent=2));return 0 if result['status'].startswith('PASS_') else 1
def main():
 ap=argparse.ArgumentParser(description=__doc__);g=ap.add_mutually_exclusive_group(required=True);g.add_argument('--prepare-only',action='store_true');g.add_argument('--build-only',action='store_true');g.add_argument('--runtime',action='store_true');a=ap.parse_args()
 if a.prepare_only:print(json.dumps({'prepared':adapters(),'executed':False}));return 0
 return build_only() if a.build_only else runtime()
if __name__=='__main__':raise SystemExit(main())
