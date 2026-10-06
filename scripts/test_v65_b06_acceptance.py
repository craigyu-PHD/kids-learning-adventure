#!/usr/bin/env python3
"""Focused non-promotion tests for the B06 boundary and transaction plan."""
from __future__ import annotations

import copy
import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import promote_v65_b06 as p
import validate_v65_b06_acceptance as v
import run_v65_b06_post_promotion as post


class B06AcceptanceTests(unittest.TestCase):
    def test_strict_acceptance_ready(self):
        result = v.run()
        self.assertTrue(result["promotionReady"], result["structuralErrors"] + result["visualErrors"])

    def test_exact_predecessor_identity(self):
        errors, details = v.predecessor_errors()
        self.assertEqual([], errors)
        self.assertEqual(v.B05_REPORT_SHA, details["b05Promotion"]["sha256"])
        self.assertEqual(v.B05_COMPLETION_SHA, details["b05Completion"]["sha256"])
        self.assertEqual(v.B05_VISUAL_SHA, details["b05RootVisual"]["sha256"])
        self.assertEqual(v.B05_MANIFEST_SHA, details["manifest"]["sha256"])
        self.assertEqual([], details["b05VerifyPromotionErrors"])

    def test_candidate_hashes_and_public_bytes_exact_24(self):
        hashes = v.candidate_hashes()
        self.assertEqual(24, len(hashes))
        for item, avatar in v.ROWS:
            for layer in v.LAYERS:
                self.assertEqual(v.source_path(item, avatar, layer).read_bytes(), v.public_candidate_path(item, avatar, layer).read_bytes())

    def test_manifest_plan_changes_only_exact_24_leaves(self):
        before = v.load(v.MANIFEST)
        after = p.manifest_plan(before)
        reverted = copy.deepcopy(after)
        bmap = {x["id"]: x for x in before["accessories"]}
        rmap = {x["id"]: x for x in reverted["accessories"]}
        count = 0
        for item, avatar in v.ROWS:
            for layer, key in (("back", "backVariants"), ("front", "frontVariants")):
                self.assertEqual(f"public/assets/v6.4/runtime/{avatar}/{item}-{layer}.webp", bmap[item][key][avatar])
                self.assertEqual(f"public/assets/v6.5/runtime/{avatar}/{item}-{layer}.webp", rmap[item][key][avatar])
                rmap[item][key][avatar] = bmap[item][key][avatar]
                count += 1
        self.assertEqual(24, count)
        self.assertEqual(before, reverted)

    def test_copy_plan_exact_24_unique_destinations(self):
        rows = p.copy_plan(v.run())
        self.assertEqual(24, len(rows))
        self.assertEqual(24, len({x[4] for x in rows}))

    def test_b07_allowlist_is_exact_paths_and_hashes(self):
        allow = v.b07_allowlist()
        self.assertEqual(v.b07_snapshot(), allow)
        self.assertEqual(12, len(allow))
        self.assertTrue(all(path.startswith("public/assets/v6.5/art-candidates/B07/") for path in allow))
        self.assertFalse(any(Path(path).name == ".DS_Store" for path in allow))

    def test_b07_extra_missing_and_changed_are_rejected(self):
        baseline = v.b07_snapshot()
        extra = dict(baseline, **{"public/assets/v6.5/art-candidates/B07/not-authorized.bin": "0" * 64})
        missing = dict(baseline)
        missing.pop(next(iter(missing)))
        changed = dict(baseline)
        changed[next(iter(changed))] = "0" * 64
        for snapshot in (extra, missing, changed):
            errors, _ = v.predecessor_errors(current_b07=snapshot, run_predecessor_verifier=False)
            self.assertTrue(any("B07 exact allowlist drift" in x for x in errors), errors)

    def test_five_negative_controls_are_independent(self):
        report = v.load(v.NEGATIVE)
        self.assertEqual({"wrong-avatar-candidate", "missing-back", "missing-front", "swapped-item", "stale-candidate-screenshot"}, {x["name"] for x in report["cases"]})
        self.assertTrue(all(x["actual"] == "REJECT" and x["detectedErrors"] for x in report["cases"]))

    def test_four_gap_same_dist_supplement_is_exact(self):
        result = v.run()
        self.assertTrue(result["promotionReady"], result["structuralErrors"] + result["visualErrors"])
        self.assertEqual(4, result["coverage"]["sameDistBaseReadinessGapCases"])
        self.assertTrue(result["coverage"]["allRuntimeAndCompatibilityStatesBaseReady"])

    def test_post_adapter_contract(self):
        path = ROOT / "scripts/run_v65_b06_post_promotion.py"
        compile(path.read_text(), str(path), "exec")
        text = path.read_text()
        self.assertIn('"focusedSixScreenshotFlow": 48', text)
        self.assertIn('"representativeCompatibility": 16', text)
        self.assertIn('"syntheticNegativeControls": 5', text)
        self.assertIn("public/assets/v6.5/runtime/", text)
        self.assertIn('("complete", "decoded", "visible")', text)
        for name in ("run-runtime-focused-supplement.py", "run-layering-compatibility.py"):
            runner = (v.S / name).read_text()
            self.assertIn("base_ready=", runner)
            self.assertIn("base skin not exactly one complete decoded visible image", runner)

    def test_promoter_failure_state_cannot_retain_promoted(self):
        report = {"status": "PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE", "promotionExecuted": True}
        p.mark_failed(report, RuntimeError("injected"), rolled_back=True)
        self.assertEqual("FAIL_ROLLED_BACK", report["status"])
        self.assertFalse(report["promotionExecuted"])
        self.assertTrue(report["rollbackCompleted"])

    def test_post_build_failure_cannot_retain_pass(self):
        result = {"status": "PASS", "distFingerprint": "sealed"}
        post.mark_failed(result, RuntimeError("injected"))
        self.assertEqual("FAIL", result["status"])
        self.assertIn("injected", result["error"])

    def test_preflight_is_no_shared_mutation(self):
        source_before = v.normalize(v.source_snapshot())
        public_before = v.normalize(v.public_snapshot())
        manifest_before = v.sha(v.MANIFEST)
        proc = subprocess.run([sys.executable, str(ROOT / "scripts/promote_v65_b06.py"), "--preflight"], cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        self.assertEqual(0, proc.returncode, proc.stdout)
        self.assertEqual(source_before, v.normalize(v.source_snapshot()))
        self.assertEqual(public_before, v.normalize(v.public_snapshot()))
        self.assertEqual(manifest_before, v.sha(v.MANIFEST))
        dry = v.load(v.BATCH / "promotion-dry-run.json")
        self.assertEqual("DRY_RUN_READY", dry["status"])
        self.assertFalse(dry["promotionExecuted"])
        self.assertEqual(24, dry["copyCount"])
        self.assertEqual(24, dry["manifestFieldChangeCount"])


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(B06AcceptanceTests)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    report = {
        "schemaVersion": 1,
        "suite": "v65-b06-focused-acceptance-tests",
        "testsRun": result.testsRun,
        "failures": [str(x[1]) for x in result.failures],
        "errors": [str(x[1]) for x in result.errors],
        "status": "PASS" if result.wasSuccessful() else "FAIL",
        "sharedSrcWritten": False,
        "sharedPublicWritten": False,
        "promotionExecuted": False,
    }
    (v.S / "acceptance-focused-tests.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    raise SystemExit(0 if result.wasSuccessful() else 1)
