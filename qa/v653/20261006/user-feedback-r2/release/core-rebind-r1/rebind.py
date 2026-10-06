"""Rebind unchanged service dependencies; rerun strict for the final source tree."""
from pathlib import Path
import argparse,json,hashlib,subprocess,datetime
R=Path.cwd();B=Path('qa/v653/20261006/user-feedback-r2/release');HERE=B/'core-rebind-r1'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p):return json.loads(Path(p).read_text())
def ref(p):
 p=Path(p);p=p.relative_to(R) if p.is_absolute() else p
 return {'path':str(p),'sha256':sha(p)}
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def write(p,d):
 with Path(p).open('x') as f:json.dump(d,f,ensure_ascii=False,indent=2);f.write('\n')
def check_ref(r):
 assert set(r)=={'path','sha256'} and sha(r['path'])==r['sha256'],r
 return read(r['path'])
def validate_dependency_map(new,old):
 issues=[p for p,h in old.items() if new.get(p)!=h]
 if issues:raise ValueError('Core execution dependencies changed or omitted; rerun affected tests: '+str(issues))
def main():
 p=argparse.ArgumentParser();p.add_argument('--source-pins',required=True);p.add_argument('--out',required=True);a=p.parse_args();out=Path(a.out)
 if out.exists() and any(out.iterdir()):raise ValueError('Require fresh output directory')
 out.mkdir(parents=True,exist_ok=True);source=read(a.source_pins);contract=read(HERE/'dependency-contract.json');raw=check_ref(contract['coreRaw']);check_ref(contract['originalCompilerSources']);protected=check_ref(contract['protected15'])
 validate_dependency_map(source,contract['sourceDependencies']);assert all(sha(p)==h for p,h in source.items());assert all(sha(p)==h for p,h in contract['runnerDependencies'].items());assert all(source.get(p)==h for p,h in protected.items())
 required=['date','auth','state','structural','online','shop_service','lessonpolicy'];assert [x['case'] for x in raw['cases']]==required and all(x['passed']is True for x in raw['cases'])
 for row in raw['cases']:
  for key in ['log','runner']:
   if key in row:assert sha(row[key]['path'])==row[key]['sha256']
  if 'result'in row.get('details',{}):check_ref(row['details']['result'])
 deps=out/'core-source-dependencies.json';write(deps,contract['sourceDependencies']);receipt=out/'dependency-rebind-receipt.json';write(receipt,{'status':'PASS_UNCHANGED_EXECUTED_CORE_DEPENDENCIES','observedAt':stamp(),'newCompilerSources':ref(a.source_pins),'executionDependencies':ref(deps),'originalRaw':contract['coreRaw'],'dependencyContract':ref(HERE/'dependency-contract.json'),'exactUnchangedDependencies':len(contract['sourceDependencies']),'runnerDependencies':contract['runnerDependencies'],'scope':'Original service/online observations remain unmodified. New compile is not attributed to these source/service tests.'})
 adapter={'group':'core','mode':'fresh','status':'PASS','observedAt':raw['completedAt'],'sourcePins':ref(deps),'runner':ref(HERE/'rebind.py'),'dependencyRebind':ref(receipt),'cases':[],'limitations':['Source/service tests only, no compiled browser or family cloud writes','Online264 within-goal raw carry on unchanged dependencies; no semantic or child ASR acceptance']}
 for i,row in enumerate(raw['cases']):adapter['cases'].append({'values':{'case':row['case']},'raw':contract['coreRaw'],'bindings':{'case':f'/cases/{i}/case'},'checks':{'passed':{'ref':contract['coreRaw'],'pointer':f'/cases/{i}/passed','equals':True}}})
 write(out/'gate-core.json',adapter)
 # Never merely relabel an old strict result when UI TSX changed.
 qa_deps={p:sha(p) for p in ['qa/art-gate/brand-display/manifest.json','qa/art-gate/weekly-poster-delivery/manifest.json']};started=stamp();args=['node','node_modules/typescript/bin/tsc','--noEmit','--noUnusedLocals','--noUnusedParameters'];log=out/'strict.log'
 with log.open('x') as f:r=subprocess.run(args,stdout=f,stderr=subprocess.STDOUT,timeout=120)
 stable=all(sha(p)==h for p,h in source.items()) and all(sha(p)==h for p,h in qa_deps.items())
 record={'passed':r.returncode==0 and stable,'exitCode':r.returncode,'sourceStable':stable,'startedAt':started,'completedAt':stamp(),'command':args,'sourcePins':ref(a.source_pins),'qaManifestDependencies':qa_deps,'scriptTypecheckInputs':{str(p):sha(p) for p in sorted(Path('scripts').rglob('*.ts'))},'compilerVersion':read('node_modules/typescript/package.json')['version'],'compilerSHA256':sha('node_modules/typescript/lib/_tsc.js'),'log':ref(log),'scope':'Fresh strict check against final complete source pins, not relabeled earlier strict.'}
 write(out/'strict-record.json',record)
 if not record['passed']:raise RuntimeError('Strict failed; no strict adapter created')
 sr=ref(out/'strict-record.json');write(out/'gate-strict.json',{'assertion':{'ref':sr,'pointer':'/passed','equals':True},'sourcePins':ref(a.source_pins),'runner':ref(HERE/'rebind.py')})
 print(json.dumps({'status':'PASS','core':ref(out/'gate-core.json'),'strict':ref(out/'gate-strict.json')}))
if __name__=='__main__':main()
