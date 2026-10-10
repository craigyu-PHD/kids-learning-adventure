"""Formal UI remaining21 after preserved r1 room-selector failure; one browser sequentially."""
import json,hashlib,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];base=root/'qa/v653/20261005/shop-coverage';freeze=root/'qa/v653/20261005/release-art/final/source-pins.json';expected='156bf02b0153d96bbf7feadd8b1ca2e982394acb0f8ef136e901a58f4beb6c8d';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(freeze)==expected;pins=json.loads(freeze.read_text());assert len(pins)==106
assert all(sha(root/p)==h for p,h in pins.items())
r1p=base/'purchase-ui-formal-r1/report.json';r1=json.loads(r1p.read_text());assert r1['status']=='FAIL' and len(r1['cases'])==44
assert all(r['status']=='PASS_UI_PURCHASE_CURRENT_COST_ONCE' for r in r1['cases'][:43])
remaining=[r['id'] for r in r1['inventory'][43:]];assert len(remaining)==21
summary={'status':'RUNNING','rootFreezeSHA256':expected,'rootSourcePins':pins,'sourceBeforeExact':True,'r1ReportSHA256':sha(r1p),'r1StatusPreserved':'FAIL','carryEligibleCases':43,'remainingSKUs':remaining,'jobs':[]}
out=base/'purchase-ui-formal-r2-source-freeze.json'
def save():out.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
save()
for attempt,items in [('formal-world-smoke-r2',['room-starlab','card-sky','effect-stars']),('formal-remaining-r2',remaining)]:
 cmd=[sys.executable,'scripts/qa_v653_shop_purchase_ui.py','--attempt',attempt,'--candidate-id','v6.5.3-formal-mf6','--formal','--avatar-manifest','src/data/avatarAssetManifest.json','--world-manifest','src/data/worldArtManifest.json','--items',','.join(items),'--run']
 rc=subprocess.run(cmd,cwd=root).returncode
 after=sha(freeze)==expected and all(sha(root/p)==h for p,h in pins.items());summary['jobs'].append({'attempt':attempt,'command':cmd,'exitCode':rc,'sourceAfterExact':after});save()
 if rc or not after:summary['status']='FAIL';save();sys.exit(1)
summary['status']='PASS_PROCESSES_AND_ROOT_FREEZE';save()
