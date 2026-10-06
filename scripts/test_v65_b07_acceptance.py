#!/usr/bin/env python3
"""Focused fail-closed tests for B07 repair-v4 preparation."""
from __future__ import annotations
import copy,hashlib,json,shutil,subprocess,sys,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
import validate_v65_b07_acceptance as v
import promote_v65_b07 as p
import run_v65_b07_post_promotion as post

class B07AcceptanceTests(unittest.TestCase):
    def test_prepare_and_strict_acceptance_ready(self):
        r=v.run(allow_placeholders=True);self.assertTrue(r['candidateEvidenceReady'],r['structuralErrors']+r['visualErrors']);self.assertTrue(r['promotionReady']);self.assertEqual([],r['errors']);self.assertEqual([],r['blockingPlaceholders'])
    def test_exact_b06_final_predecessor(self):
        errors,details=v.predecessor_errors();self.assertEqual([],errors);self.assertEqual(v.B06_FINAL['manifest'],details['manifest']['sha256']);self.assertEqual(v.B06_FINAL['finalOversight'],details['finalOversight']['sha256'])
    def test_live_b06_verifier_rejects_synthetic_source_and_public_drift(self):
        source=v.b06p.v.source_snapshot();public=v.b06p.v.public_snapshot()
        with patch.object(v.b06p.v,'source_snapshot',return_value={**source,'src/__synthetic_b07_drift__.txt':'0'*64}):
            errors,_=v.predecessor_errors();self.assertTrue(any('B06 live verify_promotion' in x and 'source drift' in x for x in errors),errors)
        with patch.object(v.b06p.v,'public_snapshot',return_value={**public,'public/__synthetic_b07_drift__.txt':'0'*64}):
            errors,_=v.predecessor_errors();self.assertTrue(any('B06 live verify_promotion' in x and 'public drift' in x for x in errors),errors)
    def test_exact_12_candidates_and_public_bytes(self):
        self.assertEqual(12,len(v.candidate_hashes()));self.assertEqual(v.candidate_snapshot(),v.expected_allowlist())
        self.assertEqual(12,len(v.expected_allowlist()))
    def test_manifest_plan_exact_12_leaves(self):
        before=v.load(v.MANIFEST);after=p.manifest_plan(before);reverted=copy.deepcopy(after);b={x['id']:x for x in before['accessories']};r={x['id']:x for x in reverted['accessories']}
        for i,a in v.ROWS:
            self.assertEqual(f'public/assets/v6.4/runtime/{a}/{i}.webp',b[i]['variants'][a]);self.assertEqual(f'public/assets/v6.5/runtime/{a}/{i}.webp',r[i]['variants'][a]);r[i]['variants'][a]=b[i]['variants'][a]
        self.assertEqual(before,reverted)
    def test_copy_plan_exact_12(self):
        rows=p.copy_plan(v.run(allow_placeholders=True));self.assertEqual(12,len(rows));self.assertEqual(12,len({x[3] for x in rows}))
    def test_exact_64_cases_384_ready_states(self):
        r=v.run(allow_placeholders=True);self.assertEqual(64,r['coverage']['totalCases']);self.assertEqual(384,r['coverage']['baseReadyStates'])
    def test_five_plus_negative_controls(self):
        r=v.load(v.NEGATIVE);self.assertGreaterEqual(len(r['cases']),5);self.assertTrue(all(x['actual']=='REJECT' and x['detectedErrors'] for x in r['cases']))
        s=v.load(v.SUPPLEMENT);self.assertGreaterEqual(len(s['readinessNegativeControls']),4);self.assertTrue(all(x['actual']=='REJECT' and x['errors'] for x in s['readinessNegativeControls']))
    def test_public_boundary_mutations_rejected(self):
        base=v.candidate_snapshot();self.assertEqual(base,v.expected_allowlist())
        for bad in (dict(base,**{'public/assets/v6.5/art-candidates/B07/x.bin':'0'*64}),{k:h for n,(k,h) in enumerate(base.items()) if n},{k:('0'*64 if n==0 else h) for n,(k,h) in enumerate(base.items())}):self.assertNotEqual(bad,v.expected_allowlist())
    def test_failure_states_cannot_retain_success(self):
        report={'status':'PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE','promotionExecuted':True};p.mark_failed(report,RuntimeError('injected'),rolled_back=True);self.assertEqual('FAIL_ROLLED_BACK',report['status']);self.assertFalse(report['promotionExecuted'])
        result={'status':'PASS'};post.mark_failed(result,RuntimeError('injected'));self.assertEqual('FAIL',result['status'])
    def test_post_adapter_contract(self):
        attempt_id,work=post.new_attempt('test');hashes=post.adapters(work);self.assertEqual(set(post.SOURCES)|{'runtime_support.py'},set(hashes));info=v.load(work/'adapter-preparation.json');self.assertEqual('PREPARED_NOT_EXECUTED',info['status']);self.assertEqual(64,info['freshScope']['totalCases']);self.assertEqual(384,info['freshScope']['baseDecodedVisibleStates'])
        attempt_id_2,work_2=post.new_attempt('test');self.assertNotEqual(attempt_id,attempt_id_2);self.assertNotEqual(work,work_2);self.assertEqual(post.ATTEMPTS,work.parent);self.assertEqual(post.ATTEMPTS,work_2.parent)
        for n in ('run-runtime-gate.py','run-compatibility.py'):
            text=(work/n).read_text();self.assertIn('await img.decode()',text);self.assertIn('base skin not exactly one complete decoded visible image',text);self.assertIn('assets/v6.5/runtime/',text)
    def test_raw_screenshot_strings_are_preserved_then_normalized(self):
        _,work=post.new_attempt('normalize-test');post.adapters(work)
        source=next((v.S/'runtime-captures').rglob('*.png'));digest=hashlib.sha256(source.read_bytes()).hexdigest();states={'shopTrial':'shop-trial','shopCancelled':'shop-cancelled','shopEquipped':'shop-equipped','home':'home','homeAfterReload':'home-after-reload','achievements':'achievements'}
        for kind,report_name,capture_dir in (('normal','runtime-gate-report.json','runtime-captures'),('compat','compatibility-report.json','compatibility-captures')):
            row={'itemId':'sky-view-glasses','avatarId':'brother','viewport':[390,844],'theme':'light','screenshots':{k:digest for k in states}}
            (work/report_name).write_text(json.dumps({'rows':[row]})+'\n')
            base=work/capture_dir/'sky-view-glasses/brother';base.mkdir(parents=True)
            for suffix in states.values():shutil.copy2(source,base/f'390x844-light-{suffix}.png')
        post.preserve_and_normalize(work)
        raw=v.load(work/'raw-reports/runtime-gate-report.json');normalized=v.load(work/'runtime-gate-report.json')
        self.assertIsInstance(raw['rows'][0]['screenshots']['home'],str);self.assertEqual({'path','sha256'},set(normalized['rows'][0]['screenshots']['home']));self.assertEqual(digest,normalized['rows'][0]['screenshots']['home']['sha256'])
    def test_existing_attempt_reuse_is_rejected_before_overwrite(self):
        attempt_id,work=post.new_attempt('retention-test');sentinel=work/'completion-summary.json';sentinel.write_text('ORIGINAL_FAIL\n');before=sentinel.read_bytes()
        with self.assertRaisesRegex(ValueError,'already has runtime artifacts'):post.runtime(attempt_id)
        self.assertEqual(before,sentinel.read_bytes())
        with self.assertRaisesRegex(ValueError,'reuse is forbidden'):post.build_only(attempt_id)
        self.assertEqual(before,sentinel.read_bytes())
    def test_prepare_only_no_shared_mutation(self):
        sb=v.normalize(v.source_snapshot());pb=v.normalize(v.public_snapshot());mb=v.sha(v.MANIFEST)
        proc=subprocess.run([sys.executable,str(ROOT/'scripts/promote_v65_b07.py'),'--prepare-only'],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT);self.assertEqual(0,proc.returncode,proc.stdout)
        self.assertEqual(sb,v.normalize(v.source_snapshot()));self.assertEqual(pb,v.normalize(v.public_snapshot()));self.assertEqual(mb,v.sha(v.MANIFEST));self.assertEqual('PREPARED_READY_FOR_FORMAL_DRY_RUN',v.load(v.BATCH/'promoter-preparation.json')['status'])
    def test_formal_preflight_contract_is_ready(self):
        strict=v.run();self.assertTrue(strict['promotionReady'],strict['structuralErrors']+strict['visualErrors']);self.assertEqual([],strict['errors'])

if __name__=='__main__':
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(B07AcceptanceTests);result=unittest.TextTestRunner(verbosity=2).run(suite)
    report={'schemaVersion':1,'suite':'v65-b07-repair-v4-focused-acceptance-tests','testsRun':result.testsRun,'failures':[str(x[1]) for x in result.failures],'errors':[str(x[1]) for x in result.errors],'status':'PASS' if result.wasSuccessful() else 'FAIL','sharedSrcWritten':False,'sharedPublicWritten':False,'promotionExecuted':False}
    (v.BATCH/'acceptance-focused-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');raise SystemExit(0 if result.wasSuccessful() else 1)
