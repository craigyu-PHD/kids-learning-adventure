#!/usr/bin/env python3
"""Focused in-memory corruption tests; no candidate or shared source mutation."""
import copy,importlib.util,json,sys
from unittest.mock import patch
import validate_v65_b02_acceptance as v
import promote_v65_b02 as p

def main():
 results=[];runtime=v.load(v.RUNTIME);supp=v.load(v.SUPPLEMENT);build=v.load(v.BUILD);astra=v.load(v.S/'actual-visual-review-astra.json');sol=v.load(v.S/'actual-visual-review.json');sv=v.load(v.S/'supplemental-cancel-achievements-visual-review.json')
 def check(name,fn):
  try:assert fn();results.append({'name':name,'status':'PASS'})
  except Exception as x:results.append({'name':name,'status':'FAIL','error':str(x)})
 def runtime_reject(mutate):
  r,s=copy.deepcopy(runtime),copy.deepcopy(supp);mutate(r,s);return bool(v.runtime_errors(r,s))
 def review_reject(mutate):
  a,so,su=copy.deepcopy(astra),copy.deepcopy(sol),copy.deepcopy(sv);mutate(a,so,su);return bool(v.visual_errors(a,so,su,build,runtime,supp))
 check('only exact DS_Store basename excluded',lambda:v.normalize({'src/.DS_Store':'a','src/.hidden':'b','src/.DS_Store.js':'c'})=={'src/.hidden':'b','src/.DS_Store.js':'c'})
 check('metadata raw before/after SHA retained',lambda:v.metadata_delta({'src/.DS_Store':'old'},{'src/.DS_Store':'new'})==[{'path':'src/.DS_Store','beforeSha256':'old','afterSha256':'new'}])
 check('unchanged main+supplement+compat pass',lambda:not v.runtime_errors(runtime,supp))
 check('original four negative cases reject',lambda:all(x['actual']=='REJECT' for x in v.fresh_negatives(runtime)[1]))
 check('missing supplemental case rejects',lambda:runtime_reject(lambda r,s:s['rows'].pop()))
 check('duplicate mode cannot replace missing mode',lambda:runtime_reject(lambda r,s:r['rows'].__setitem__(1,copy.deepcopy(r['rows'][0]))))
 check('wrong actual trial image rejects',lambda:runtime_reject(lambda r,s:r['rows'][0]['states']['shopTrial']['images'][0].__setitem__('src','https://example.test/old.webp')))
 check('compatibility painted canvas shift rejects',lambda:runtime_reject(lambda r,s:r['compatibilityCases'][0]['state']['images'][1]['rect'].__setitem__('x',999)))
 check('failed decode rejects',lambda:runtime_reject(lambda r,s:r['rows'][0]['states']['home']['images'][0].__setitem__('decoded',False)))
 check('stale screenshot rejects',lambda:runtime_reject(lambda r,s:s['rows'][0]['screenshots']['achievements'].__setitem__('sha256','0'*64)))
 check('missing Astra row rejects',lambda:review_reject(lambda a,so,su:a['rows'].pop()))
 check('Astra FAIL cannot pass',lambda:review_reject(lambda a,so,su:a['rows'][0].__setitem__('verdict','FAIL')))
 check('Sol supplemental FAIL cannot pass',lambda:review_reject(lambda a,so,su:su['reviewBoards'][0].__setitem__('verdict','FAIL')))
 check('Astra stale panel binding rejects',lambda:review_reject(lambda a,so,su:a['rows'][0]['reviewedScreenshots'][0].__setitem__('sha256','0'*64)))
 # Change URL namespace only in a copied report: historical incomplete cancelled loads MUST fail fresh gate.
 def fresh_cancel():
  r=json.loads(json.dumps(runtime).replace('/art-candidates/B02/','/runtime/').replace('/art-candidates/B02-compat/brother/glasses-holo.webp','/runtime/brother/glasses-holo-b01-fit.webp'))
  s=json.loads(json.dumps(supp).replace('/art-candidates/B02/','/runtime/'));s['rows'][0]['states']['cancelled']['images'][0]['decoded']=False
  return any('fresh decode' in x for x in v.runtime_errors(r,s,True))
 check('fresh cancellation rejects undecoded restored base',fresh_cancel)
 before=v.load(v.MANIFEST);after=p.manifest_plan(before)
 check('manifest only 12 skin paths change',lambda:all({k:x for k,x in after.items() if k!='skins'}=={k:x for k,x in before.items() if k!='skins'} for _ in [0]) and sum(x!=y for x,y in zip(before['skins'],after['skins']))==12)
 check('B01 cadet and all accessory bindings remain identical',lambda:before['accessories']==after['accessories'] and all(x==y for x,y in zip(before['skins'],after['skins']) if (x['skinId'],x['avatarId']) not in set(v.ROWS)))
 real=v.source_snapshot()
 def source_reject():
  changed=dict(real);changed['src/components/AvatarRenderer.tsx']='0'*64
  with patch.object(v,'source_snapshot',return_value=changed):return 'exact B01-promoted source drift' in v.run()['structuralErrors']
 check('unapproved source hash rejects',source_reject)
 spec=importlib.util.spec_from_file_location('b02_post_prepare',v.ROOT/'scripts/run_v65_b02_post_promotion.py');post=importlib.util.module_from_spec(spec);spec.loader.exec_module(post)
 check('exact replacement rejects missing adapter anchor',lambda:anchor_reject(post))
 report={'status':'PASS' if all(x['status']=='PASS' for x in results) else 'FAIL','cases':results,'count':len(results),'scope':'In-memory focused assertions and pure manifest plan; no promotion/build/runtime executed.'}
 (v.S/'acceptance-focused-tests-astra.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2));return 0 if report['status']=='PASS' else 1

def anchor_reject(post):
 try:post.replace_once('unchanged','absent','replacement');return False
 except ValueError:return True
if __name__=='__main__':raise SystemExit(main())
