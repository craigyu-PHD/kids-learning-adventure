"""Supervise the unchanged canonical online validator; preserve fresh logs only."""
from pathlib import Path
import subprocess,json,hashlib,datetime,time
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'qa/v653/20261005/lessons/online-20261006';OUT.mkdir(exist_ok=True)
assert not (OUT/'canonical.log').exists(),'refuse to overwrite an earlier run'
files=['scripts/validate_curriculum.ts','scripts/curriculum_video_policy.ts','src/data/curriculum.ts','src/data/videos.ts','src/data/videoReuseReview.ts']
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();pins={f:sha(ROOT/f) for f in files}
state={'status':'RUNNING','startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':['node_modules/.bin/tsx','scripts/validate_curriculum.ts','--online'],'canonicalScriptUnmodified':True,'sourcePins':pins,'ok':0,'fail':0,'videoIds':[]}
save=lambda:(OUT/'status.json').write_text(json.dumps(state,ensure_ascii=False,indent=2));save()
with (OUT/'canonical.log').open('w') as log:
 process=subprocess.Popen(state['command'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,bufsize=1);state['pid']=process.pid;save()
 for line in process.stdout:
  log.write(line);log.flush()
  if line.startswith(('YT OK','YT FAIL')):
   state['ok' if line.startswith('YT OK') else 'fail']+=1;state['videoIds'].append(line.split()[2]);state['latest']=line.strip();save()
   if len(state['videoIds'])%10==0:print(f"Checked {len(state['videoIds'])}/264: OK {state['ok']}, FAIL {state['fail']}",flush=True)
  elif line.startswith(('STRUCTURE','SUBJECTS','VIDEOS','METADATA','REUSE','SEMANTICS','ONLINE')):print(line.strip(),flush=True)
 code=process.wait()
state.update(status='PASS_ONLINE_ONLY' if code==0 else 'FAIL_ONLINE',exitCode=code,finishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),sourcesUnchanged=all(sha(ROOT/f)==v for f,v in pins.items()));save();print(json.dumps({k:v for k,v in state.items() if k not in ['sourcePins','videoIds']},ensure_ascii=False),flush=True)
raise SystemExit(code)
