#!/usr/bin/env python3
"""Run four role shards in two waves, at most two isolated Chromium browsers."""
import argparse,concurrent.futures,hashlib,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
AVATARS=['brother','younger','sister','younger-sister']
def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--output',type=Path,required=True)
 parser.add_argument('--manifest-sha',required=True)
 parser.add_argument('--base-url',default='http://127.0.0.1:5178/')
 args=parser.parse_args();out=args.output.resolve();assert not out.exists(),'preserve prior attempt'
 actual=hashlib.sha256((ROOT/'src/data/avatarAssetManifest.json').read_bytes()).hexdigest();assert actual==args.manifest_sha,'final freeze mismatch'
 out.mkdir(parents=True);status={'status':'RUNNING','manifestSHA256':actual,'maxBrowsers':2,'roles':{}}
 def save():(out/'launcher.json').write_text(json.dumps(status,indent=2)+'\n')
 def run(avatar):
  command=[sys.executable,str(ROOT/'scripts/qa_v652_all_shop_lifecycle.py'),'--avatar',avatar,'--manifest-sha',args.manifest_sha,'--base-url',args.base_url,'--output',str(out/avatar)]
  with (out/(avatar+'.log')).open('w') as log:return subprocess.run(command,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT).returncode
 save()
 for group in [AVATARS[:2],AVATARS[2:]]:
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
   tasks={pool.submit(run,avatar):avatar for avatar in group}
   for task in concurrent.futures.as_completed(tasks):
    avatar=tasks[task];code=task.result();status['roles'][avatar]={'exitCode':code,'directory':str(out/avatar)};save();print(avatar,code,flush=True)
  if any(status['roles'][a]['exitCode'] for a in group):status['status']='FAIL_SHARD';save();return 1
 command=[sys.executable,str(ROOT/'scripts/qa_v652_shop_lifecycle_summary.py'),'--shards',*[str(out/a) for a in AVATARS],'--output',str(out/'summary-1008.json')]
 code=subprocess.run(command,cwd=ROOT).returncode;status['status']='PASS_1008_ACTUAL_SHOP_LIFECYCLES' if code==0 else 'FAIL_AGGREGATION';save();return code
if __name__=='__main__':sys.exit(main())
