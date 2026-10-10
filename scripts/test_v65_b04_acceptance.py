#!/usr/bin/env python3
"""Focused no-promotion tests for B04 acceptance and transactional scope."""
from __future__ import annotations
import copy,json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
import validate_v65_b04_acceptance as v
import promote_v65_b04 as p
import run_v65_b04_post_promotion as post
class B04AcceptanceTests(unittest.TestCase):
 def test_strict_acceptance_ready(self):
  result=v.run();self.assertTrue(result['promotionReady'],result['structuralErrors']+result['visualErrors'])
 def test_candidate_hashes_exact_24(self):
  h=v.candidate_hashes();self.assertEqual(24,len(h));self.assertEqual(set(h),{f'{i}:{a}:{l}' for i,a in v.ROWS for l in v.LAYERS})
 def test_b05_allowlist_exact_bytes(self):
  allow=v.b05_allowlist();self.assertEqual(24,len(allow))
  self.assertEqual(set(allow),{f'public/assets/v6.5/art-candidates/B05/{a}/{i}-{l}.webp' for a in v.AVATARS for i in ('cape-nebula','cape-sky','hero-cape') for l in v.LAYERS})
  self.assertTrue(all((v.ROOT/path).is_file() and v.sha(v.ROOT/path)==h for path,h in allow.items()))
 def test_b06_allowlist_exact_authorized_bytes(self):
  allow=v.b06_allowlist();self.assertEqual(24,len(allow))
  self.assertEqual(set(allow),{f'public/assets/v6.5/art-candidates/B06/{a}/{i}-{l}.webp' for a in v.AVATARS for i in ('cape-legend','cape-ocean','sister-galaxy-cape') for l in v.LAYERS})
  self.assertTrue(all((v.ROOT/path).is_file() and v.sha(v.ROOT/path)==h for path,h in allow.items()))
 def test_unrelated_protected_qa_hash_drift_rejected(self):
  base={'qa/v65/art-workpacks/B01/frozen.json':'1'*64};current=dict(base);current.update(v.b06_allowlist())
  self.assertEqual([],v.protected_boundary_errors(current,base,v.b06_allowlist()))
  current['qa/v65/art-workpacks/B01/frozen.json']='2'*64
  self.assertTrue(v.protected_boundary_errors(current,base,v.b06_allowlist()))
 def test_manifest_plan_exact_24_leaves_only(self):
  before=v.load(v.MANIFEST);after=p.manifest_plan(before);diff=[]
  for i,a in v.ROWS:
   rb=next(x for x in before['accessories'] if x['id']==i);ra=next(x for x in after['accessories'] if x['id']==i)
   for l,key in (('back','backVariants'),('front','frontVariants')):
    self.assertEqual(f'public/assets/v6.4/runtime/{a}/{i}-{l}.webp',rb[key][a])
    self.assertEqual(f'public/assets/v6.5/runtime/{a}/{i}-{l}.webp',ra[key][a]);diff.append((i,a,l))
  reverted=copy.deepcopy(after);rbmap={x['id']:x for x in before['accessories']};rrmap={x['id']:x for x in reverted['accessories']}
  for i,a,l in diff:
   key='backVariants' if l=='back' else 'frontVariants';rrmap[i][key][a]=rbmap[i][key][a]
  self.assertEqual(before,reverted);self.assertEqual(24,len(diff));self.assertEqual(before['skins'],after['skins'])
 def test_plan_exact_24_unique_destinations(self):
  rows=p.plan(v.run());self.assertEqual(24,len(rows));self.assertEqual(24,len({x[4] for x in rows}))
 def test_unknown_public_path_rejected(self):
  current=v.public_snapshot();current['public/assets/v6.5/art-candidates/UNAUTHORIZED.webp']='0'*64
  errors,_=v.predecessor_errors(current_public=current);self.assertTrue(errors)
 def test_b05_changed_hash_rejected(self):
  current=v.public_snapshot();key=next(iter(v.b05_allowlist()));current[key]='0'*64
  errors,_=v.predecessor_errors(current_public=current);self.assertTrue(any('B05' in x or 'public' in x for x in errors),errors)
 def test_root_review_is_exactly_bound(self):
  result=v.run();self.assertFalse(result['visualErrors'],result['visualErrors']);self.assertEqual(v.SEALED['actual-visual-review-root.json'],v.sha(v.ROOT_REVIEW))
 def test_post_runner_contract(self):
  post=ROOT/'scripts/run_v65_b04_post_promotion.py';compile(post.read_text(),str(post),'exec')
  text=post.read_text();self.assertIn("'fullFlow':48",text);self.assertIn("'capeCompatibility':48",text);self.assertIn("'negativeControls':4",text);self.assertIn("candidate_url(i,a,l):return f'public/assets/v6.5/runtime/",text)
 def test_terminal_failure_reports_are_not_success(self):
  post_result={'status':'PASS'};post._failed_result(post_result,ValueError('late drift'));self.assertEqual('FAIL',post_result['status'])
  promoted={'status':'PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE','promotionExecuted':True}
  p._failure_report(promoted,ValueError('post-write verification'),True,True)
  self.assertEqual('FAIL_ROLLED_BACK',promoted['status']);self.assertFalse(promoted['promotionExecuted']);self.assertTrue(promoted['rollbackExecuted'])
 def test_preflight_is_no_shared_mutation(self):
  source_before=v.normalize(v.source_snapshot());public_before=v.normalize(v.public_snapshot());manifest_before=v.sha(v.MANIFEST)
  proc=subprocess.run([sys.executable,str(ROOT/'scripts/promote_v65_b04.py'),'--preflight'],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  self.assertEqual(0,proc.returncode,proc.stdout);self.assertEqual(source_before,v.normalize(v.source_snapshot()));self.assertEqual(public_before,v.normalize(v.public_snapshot()));self.assertEqual(manifest_before,v.sha(v.MANIFEST))
  dry=v.load(v.BATCH/'promotion-dry-run.json');self.assertEqual('DRY_RUN_READY',dry['status']);self.assertFalse(dry['promotionExecuted']);self.assertEqual(24,dry['copyCount']);self.assertEqual(24,dry['manifestFieldChangeCount'])
if __name__=='__main__':
 suite=unittest.defaultTestLoader.loadTestsFromTestCase(B04AcceptanceTests);result=unittest.TextTestRunner(verbosity=2).run(suite)
 report={'schemaVersion':1,'suite':'v65-b04-focused-acceptance-tests','testsRun':result.testsRun,'failures':[str(x[1]) for x in result.failures],'errors':[str(x[1]) for x in result.errors],'status':'PASS' if result.wasSuccessful() else 'FAIL','sharedSrcWritten':False,'sharedPublicWritten':False,'promotionExecuted':False}
 out=v.S/'acceptance-focused-tests.json';out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');raise SystemExit(0 if result.wasSuccessful() else 1)
