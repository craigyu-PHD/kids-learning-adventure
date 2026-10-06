#!/usr/bin/env python3
"""Synthetic negative fixtures only; never mutate captured evidence or shared assets."""
import copy,json
import validate_v65_b01_acceptance as v
import promote_v65_b01 as p
cases=[]
def check(name,condition):
 cases.append({'case':name,'pass':bool(condition)})
 if not condition:raise AssertionError(name)
base=v.run();check('baseline-same-art-pass',base['promotionReady'])
check('all-five-fresh-negative-controls-rejected',len(base['freshNegativeControls'])==5 and all(x['actual']=='REJECT' for x in base['freshNegativeControls']))
source=v.source_snapshot();bad=dict(source);bad['src/data/videos.ts']='0'*64;check('different-course-sha-rejected',bool(v.source_errors(bad)))
bad=dict(source);bad['src/data/avatarAssetManifest.json']='0'*64;check('changed-avatar-manifest-rejected',bool(v.source_errors(bad)))
bad=dict(source);bad['src/unreviewed-file.ts']='0'*64;check('new-source-file-rejected',bool(v.source_errors(bad)))
a=v.load(v.S/'actual-visual-review-astra.json');args=[v.load(x) for x in (v.DIST,v.RUNTIME,v.COMPAT,v.STATIC)]
def visual(b):return v.visual_errors(b,'gpt-6-astra','/root/astra_scope',*args)
b=copy.deepcopy(a);b['runtimeRows'].pop();check('missing-visual-row-rejected',bool(visual(b)))
b=copy.deepcopy(a);b['runtimeRows'][0]['reviewedScreenshots'][0]['sha256']='0'*64;check('stale-screenshot-rejected',bool(visual(b)))
b=copy.deepcopy(a);b['compatibilityRows'][0]['deterministicDecision']='FAIL';check('failed-compat-review-rejected',bool(visual(b)))
b=copy.deepcopy(a);b['staticRows'][0]['deterministicDecision']='PASS';b['staticRows'][0]['productVisualDecision']='PASS';check('K-product-pass-escalation-rejected',bool(visual(b)))
b=copy.deepcopy(a);b['boundReports']['negativeControls']['sha256']='0'*64;check('stale-negative-binding-rejected',bool(visual(b)))
m=v.load(v.MANIFEST);proposed=p.manifest_plan(m);oldskins={x['id']:x for x in m['skins']};newskins={x['id']:x for x in proposed['skins']}
check('K-manifest-byte-structure-preserved',oldskins['brother:outfit-cadet']==newskins['brother:outfit-cadet'])
oldaccess={x['id']:x for x in m['accessories']};newaccess={x['id']:x for x in proposed['accessories']}
check('all-other-accessories-preserved',all(newaccess[k]==oldaccess[k] for k in oldaccess if k!='glasses-holo'))
check('other-holo-roles-preserved',all(newaccess['glasses-holo']['variants'][av]==oldaccess['glasses-holo']['variants'][av] for av in v.AVATARS if av!='brother'))
report={'status':'PASS','cases':cases,'sharedFilesWritten':False,'evidenceFilesMutated':False};out=v.S/'acceptance-focused-tests.json';out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':'PASS','cases':len(cases)}))
