#!/usr/bin/env python3
"""B02 fresh current-source build and 48 main +48 supplemental +96 compatibility.
Only --prepare-only is safe before root promotes. No shared source/public writes.
"""
from __future__ import annotations
import argparse,hashlib,importlib.util,json,socket,subprocess,sys,time,urllib.request
from pathlib import Path
import validate_v65_b02_acceptance as v
import promote_v65_b02 as p
ROOT=v.ROOT;POST=v.BATCH/'post-promotion';DIST=POST/'candidate-dist';BUILD=POST/'candidate-dist-build.json';PORT=4212
RUNNERS=('run-candidate-runtime-gate.py','run-supplemental-cancel-achievements.py','test-negative-controls.py')
def replace_once(code,old,new):
 if code.count(old)!=1:raise ValueError('adapter anchor mismatch '+old[:80])
 return code.replace(old,new)
def adapters():
 POST.mkdir(parents=True,exist_ok=True);hashes={};seal=v.load(v.SEAL)
 for name in (*RUNNERS,'build-visual-review-boards.py'):
  path=v.S/name
  if v.sha(path)!=seal['evidenceHashes'][str(path.relative_to(ROOT))]:raise ValueError('frozen runner changed')
  code=path.read_text().replace('http://127.0.0.1:4202/',f'http://127.0.0.1:{PORT}/').replace('/assets/v6.5/art-candidates/B02/','/assets/v6.5/runtime/')
  if name=='run-supplemental-cancel-achievements.py':
   code=replace_once(code,'cancel=gate.avatar_state(loc)','cancel=gate.wait_rendered(page,loc,set())')
   code=replace_once(code,"if len(skins)!=1 or expected in skins[0].get('src',''):errors.append('cancel did not restore exactly one non-candidate base skin')","if len(skins)!=1 or expected in skins[0].get('src',''):errors.append('cancel did not restore exactly one non-candidate base skin')\n      if len(skins)!=1 or not all(skins[0].get(k) is True for k in ('complete','decoded','visible')) or min(skins[0].get('nw',0),skins[0].get('nh',0))<=0:errors.append('cancel restored base failed decode/visible')")
  compile(code,name,'exec');(POST/name).write_text(code);hashes[name]=v.sha(POST/name)
 code=f'''from pathlib import Path
import sys,json
ROOT=Path({str(ROOT)!r});sys.path.insert(0,str(ROOT/'scripts'))
import validate_v65_b02_acceptance as v
import promote_v65_b02 as p
WORK=Path(__file__).resolve().parent;OUT=WORK/'candidate-dist';BUILD_REPORT=WORK/'candidate-dist-build.json';RUNTIME_REPORT=WORK/'runtime-gate-report.json'
ITEMS=v.ITEMS;AVATARS=v.AVATARS;ROWS=v.ROWS;VIEW_MODES=v.MODES;ACCESSORIES=v.EXTRAS
sha_file=v.sha;fingerprint=v.fingerprint
def verify_dist_report(r):
 e=p.verify_promotion(v.load(p.OUT))
 if r.get('status')!='PASS' or r.get('buildExitCode')!=0:e.append('fresh build failed')
 if r.get('promotionReportSha256')!=sha_file(p.OUT):e.append('promotion binding')
 if r.get('workspaceSourceFingerprint')!=v.source_fingerprint():e.append('fresh source drift')
 files={{str(x.relative_to(OUT)):sha_file(x) for x in sorted(OUT.rglob('*')) if x.is_file()}}
 if v.normalize(r.get('distFiles',{{}}))!=v.normalize(files) or r.get('distFingerprint')!=fingerprint(v.normalize(files)):e.append('fresh dist drift')
 for n,h in r.get('adapterHashes',{{}}).items():
  if sha_file(WORK/n)!=h:e.append('adapter drift '+n)
 return e
def image_state_errors(state,item,avatar,surface,accessory=None):return v.state_errors(state,item,avatar,surface,accessory,True)
'''
 compile(code,'runtime_support.py','exec');(POST/'runtime_support.py').write_text(code);hashes['runtime_support.py']=v.sha(POST/'runtime_support.py')
 info={'status':'PREPARED_NOT_EXECUTED','adapterHashes':hashes,'port':PORT,'retainedAssertions':'Frozen main+supplement+4 negative assertions, plus stricter exact-image/canvas/decode and cancellation wait. Fresh runner never requests compatibility reuse.','captureScope':{'main':48,'supplement':48,'compatibility':96,'negative':4}}
 (POST/'adapter-preparation.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n');return hashes

def build_only():
 r={'suite':'v65-b02-fresh-build','status':'FAIL','productionDeployed':False,'createdAt':time.strftime('%Y-%m-%dT%H:%M:%S%z')}
 try:
  errors=p.verify_promotion(v.load(p.OUT))
  if errors:raise ValueError('; '.join(errors))
  before=v.source_snapshot();r.update({'promotionReportSha256':v.sha(p.OUT),'workspaceSourceFingerprint':v.fingerprint(v.normalize(before)),'rawSourceBeforeFingerprint':v.fingerprint(before),'artDigest':v.art_digest(),'adapterHashes':adapters(),'runnerSha256':v.sha(Path(__file__))})
  proc=subprocess.run([str(ROOT/'node_modules/.bin/vite'),'build','--outDir',str(DIST),'--emptyOutDir'],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  r['buildExitCode']=proc.returncode;r['buildOutputTail']=proc.stdout[-10000:]
  if proc.returncode:raise ValueError('fresh build failed')
  files={str(x.relative_to(DIST)):v.sha(x) for x in sorted(DIST.rglob('*')) if x.is_file()}
  for row in v.load(p.OUT)['copies']:
   if files.get(row['destination'].removeprefix('public/'))!=row['sha256']:raise ValueError('built promoted byte mismatch')
  if v.normalize(before)!=v.normalize(v.source_snapshot()) or p.verify_promotion(v.load(p.OUT)):raise ValueError('source/art drift during build')
  r.update({'status':'PASS','distFiles':files,'distFingerprint':v.fingerprint(v.normalize(files)),'rawDistFingerprint':v.fingerprint(files),'sourceMetadataDeltas':v.metadata_delta(before,v.source_snapshot()),'indexSha256':files['index.html'],'candidateHashes':v.candidate_hashes()})
 except Exception as x:r['error']=f'{type(x).__name__}: {x}'
 POST.mkdir(parents=True,exist_ok=True);BUILD.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:r.get(k) for k in ('status','error','buildExitCode')},ensure_ascii=False));return 0 if r['status']=='PASS' else 1

def supplemental_boards():
 from PIL import Image,ImageDraw,ImageFont
 out=POST/'supplemental-visual-boards';out.mkdir(exist_ok=True)
 for i,a in v.ROWS:
  board=Image.new('RGB',(1480,820),'#e6e7ea');draw=ImageDraw.Draw(board);font=ImageFont.load_default(size=15)
  draw.text((10,8),f'B02 FRESH supplemental | {i} | {a}',fill='black',font=font)
  for col,(w,h,t) in enumerate(v.MODES):
   for row,surface in enumerate(('cancelled','achievements')):
    mode='night' if t=='dark' else 'light';path=POST/f'supplemental-cancel-achievements/{i}/{a}/{w}x{h}-{mode}-{surface}.png'
    with Image.open(path) as im:
     im=im.convert('RGB');im.thumbnail((350,340));board.paste(im,(10+col*370+(350-im.width)//2,35+row*380))
    draw.text((10+col*370,375+row*380),f'{w} {mode} {surface}',fill='black',font=font)
  board.save(out/f'{i}__{a}.jpg',quality=92)

def run_runtime():
 r={'suite':'v65-b02-fresh-post-all-gates','status':'FAIL','technicalEvidenceOnly':True,'visualAcceptance':'PENDING_FRESH_ACTUAL_REVIEW','runs':[]};server=None
 try:
  build=v.load(BUILD)
  if build.get('status')!='PASS' or build.get('runnerSha256')!=v.sha(Path(__file__)):raise ValueError('build/runner drift')
  for n,h in build['adapterHashes'].items():
   if v.sha(POST/n)!=h:raise ValueError('adapter drift')
  if p.verify_promotion(v.load(p.OUT)):raise ValueError('promotion binding drift')
  probe=socket.socket();probe.bind(('127.0.0.1',PORT));probe.close()
  server=subprocess.Popen([sys.executable,'-m','http.server',str(PORT),'--bind','127.0.0.1','--directory',str(DIST)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  for _ in range(60):
   try:
    with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/',timeout=1) as res:served=hashlib.sha256(res.read()).hexdigest()
    break
   except OSError:time.sleep(.1)
  else:raise ValueError('server failed')
  if served!=build['indexSha256']:raise ValueError('wrong server')
  for name in RUNNERS:
   proc=subprocess.run([sys.executable,str(POST/name)],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
   log=POST/(name+'.log');log.write_text(proc.stdout);r['runs'].append({'runner':name,'exitCode':proc.returncode,'log':str(log.relative_to(ROOT))})
   if proc.returncode:raise ValueError(name+' failed; see log')
  rt=v.load(POST/'runtime-gate-report.json');su=v.load(POST/'supplemental-cancel-achievements-report.json');ne=v.load(POST/'negative-controls-report.json')
  errors=v.runtime_errors(rt,su,promoted=True)
  if rt.get('buildReportSha256')!=v.sha(BUILD) or su.get('sealedDistBuildReportSha256')!=v.sha(BUILD):errors.append('fresh report build binding')
  if rt.get('compatibilityEvidenceReusedFromReportSha256'):errors.append('fresh compatibility reused')
  expected={'wrong-avatar-candidate','missing-layer','swapped-item','stale-candidate-screenshot'}
  if ne.get('status')!='PASS' or not ne.get('baselineIntegrityPass') or ne.get('baselineErrors') or len(ne.get('cases',[]))!=4 or {x.get('name') for x in ne.get('cases',[])}!=expected or any(x.get('actual')!='REJECT' or not x.get('detectedErrors') for x in ne.get('cases',[])):errors.append('fresh negatives failed')
  if errors:raise ValueError('; '.join(errors))
  subprocess.run([sys.executable,str(POST/'build-visual-review-boards.py')],cwd=ROOT,check=True);supplemental_boards()
  if p.verify_promotion(v.load(p.OUT)) or build['workspaceSourceFingerprint']!=v.source_fingerprint():raise ValueError('post source drift')
  r.update({'status':'PASS_TECHNICAL_PENDING_FRESH_VISUAL','artDigest':v.art_digest(),'promotionReportSha256':v.sha(p.OUT),'buildReportSha256':v.sha(BUILD),'coverage':{'mainCases':48,'supplementalCases':48,'compatibilityCases':96,'negativeControls':4},'reports':{n:v.bound(POST/n) for n in ('runtime-gate-report.json','supplemental-cancel-achievements-report.json','negative-controls-report.json')},'freshBoards':24})
 except Exception as x:r['error']=f'{type(x).__name__}: {x}'
 finally:
  if server:server.terminate();server.wait(timeout=10)
 POST.mkdir(parents=True,exist_ok=True);(POST/'completion-summary.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps(r,ensure_ascii=False,indent=2));return 0 if r['status'].startswith('PASS_') else 1

def main():
 ap=argparse.ArgumentParser(description=__doc__);g=ap.add_mutually_exclusive_group(required=True);g.add_argument('--prepare-only',action='store_true');g.add_argument('--build-only',action='store_true');g.add_argument('--runtime',action='store_true');a=ap.parse_args()
 if a.prepare_only:print(json.dumps({'prepared':adapters(),'executed':False}));return 0
 return build_only() if a.build_only else run_runtime()
if __name__=='__main__':raise SystemExit(main())
