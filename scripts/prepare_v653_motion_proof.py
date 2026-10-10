#!/usr/bin/env python3
"""Assemble fresh, manually reviewed motion proof; never manufactures visual PASS."""
import argparse,json,re,subprocess,sys,time
from pathlib import Path
from qa_v653_retained_motion import ROOT,sha,load,safe,current_proof
BASE=ROOT/'qa/v653/20261005/release-art/retained-motion'

def put(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')

def ref(path):return {'path':str(path.relative_to(ROOT)),'sha256':sha(str(path.relative_to(ROOT)))}

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    for option in ['runtime','app-runtime','visual-review','approved-hook-sha','output']:ap.add_argument('--'+option,required=True)
    args=ap.parse_args();out=safe(args.output)
    if not out.is_relative_to(BASE) or 'current-r1' in out.parts:raise ValueError('Output must be new owned retained-motion attempt; preserve current-r1')
    paths={k:safe(getattr(args,k.replace('-','_'))) for k in ['runtime','app-runtime','visual-review']}
    failures=['Missing fresh input: '+str(p.relative_to(ROOT)) for p in paths.values() if not p.is_file()]
    if not re.fullmatch('[a-f0-9]{64}',args.approved_hook_sha):failures.append('Exact approved hook SHA required')
    elif sha('src/useRobotBlink.ts')!=args.approved_hook_sha:failures.append('Approved hook SHA does not match current source')
    status=out.parent/'assembly-status.json'
    if failures:
        put(status,{'status':'FAIL_MISSING_OR_UNAPPROVED_INPUT','failures':failures,'currentProofCreated':False,'oldgate':'NOT_RUN'});print(json.dumps(failures,ensure_ascii=False));return 1
    runtime=load(str(paths['runtime'].relative_to(ROOT)));app=load(str(paths['app-runtime'].relative_to(ROOT)));visual=load(str(paths['visual-review'].relative_to(ROOT)))
    if runtime.get('formal') is not True or app.get('formal') is not True:failures.append('Fresh formal runtime requires no manifest/CSS override')
    expected={'src/data/avatarAssetManifest.json':sha('src/data/avatarAssetManifest.json'),'src/data/worldArtManifest.json':sha('src/data/worldArtManifest.json')}
    for r in [runtime,app]:
        if r.get('manifestPins')!=expected:failures.append('Formal manifest/source pin mismatch')
        if r.get('status','').startswith('PASS_') is False:failures.append('Runtime functional result is not PASS')
    if visual.get('status')!='PASS_CURRENT_ACTIVE_VISUAL':failures.append('Manual fresh visual acceptance absent')
    if failures:
        put(status,{'status':'FAIL_INPUT_ACCEPTANCE','failures':failures,'currentProofCreated':False,'oldgate':'NOT_RUN'});print(json.dumps(failures,ensure_ascii=False));return 1
    policy={'schemaVersion':1,'scope':'formal current acceptance; preserve all old assets and missing historical status','enabledRobots':['robot-sky'],'rejectedRobots':['robot-mecha','robot-legend'],'fullSkinStatic':True,'approvedHookPins':{'src/useRobotBlink.ts':args.approved_hook_sha},'decision':'Root independently reviewed current-r1 robot pair05/06/07 and authorized sky-only optional blink; no old frame repair or old acceptance claimed','rejectionEvidence':ref(BASE/'current-r1/visual-review.json')}
    policy_path=out.parent/'current-policy.json';put(policy_path,policy)
    controls=out.parent/'negative-controls.json';put(controls,{'status':'PENDING','controlIds':[]})
    proof={'schemaVersion':1,'mode':'formal','runtime':ref(paths['runtime']),'appRuntime':ref(paths['app-runtime']),'visual':ref(paths['visual-review']),'policy':ref(policy_path),'negativeControls':ref(controls),'archiveUnavailable':True,'oldgate':'NOT_RUN'};put(out,proof)
    cmd=[sys.executable,str(BASE/'test_current_proof.py'),'--proof',str(out.relative_to(ROOT)),'--out',str(controls.relative_to(ROOT))]
    run=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True)
    if run.returncode:
        put(status,{'status':'FAIL_NEGATIVE_CONTROLS','returncode':run.returncode,'stdout':run.stdout,'stderr':run.stderr,'oldgate':'NOT_RUN'});print(run.stderr);return 1
    proof['negativeControls']=ref(controls);put(out,proof)
    gate=current_proof(str(out.relative_to(ROOT)),argparse.Namespace(avatar_manifest='src/data/avatarAssetManifest.json',world_manifest='src/data/worldArtManifest.json'))
    put(status,{'status':gate['status'],'failures':gate['failures'],'proof':ref(out),'createdEpoch':time.time(),'scope':'current linked proof only; run full retained asset gate separately','oldgate':'NOT_RUN'});print(json.dumps({'status':gate['status'],'proof':ref(out),'failures':gate['failures']},ensure_ascii=False));return 0 if not gate['failures'] else 1
if __name__=='__main__':sys.exit(main())
