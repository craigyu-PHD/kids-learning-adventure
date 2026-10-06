#!/usr/bin/env python3
"""Adversarial controls for the V6.5 delivery gate.

Synthetic/corrupt fixtures created here are QA-only and must never be promoted
as art or runtime assets.
"""
from __future__ import annotations

import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from generate_v65_delivery_evidence import DEFAULT_LEDGER, ROOT, build
from qa_v65_delivery_gate import sha_file, validate

FIXTURES = ROOT / 'qa/judge-audit/20260917_R2/negative-fixtures'
CANDIDATE = 'ec06e3c48e7894ad72e20dfbda78e9790705f5c393bf4ad2bd62745ccb3763c3'


def codes(result: dict) -> set[str]:
    return {err['code'] for err in result['errors']}


class V65DeliveryGateControls(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.baseline = build(
            DEFAULT_LEDGER,
            environment='fixture',
            deployment_id='baseline',
            run_id='positive',
            candidate_fingerprint=CANDIDATE,
        )
        # The R2 ledger and audit runtime fields are historical observations.
        # Once V6.5 legally changes a renderer binding, those old paths must not
        # poison the positive adversarial-control fixture.  Keep R2 visual/review
        # evidence intact, but bind both declared and observed runtime layers to
        # the current manifest contract for this structural-only baseline.
        for record in cls.baseline['records']:
            required = record.get('rendererSelection', {}).get('requiredRuntimePaths') or []
            record['runtimeLayers'] = [
                {
                    'path': path,
                    'sha256': sha_file(ROOT / path),
                    'observedSha256': sha_file(ROOT / path),
                    'exists': (ROOT / path).is_file(),
                }
                for path in required
            ]
            record['actualRuntimeObserved'] = copy.deepcopy(record.get('runtimeLayers') or [])
        result = validate(cls.baseline, require_art_final=False)
        if result['status'] != 'PASS':
            raise AssertionError(f'current-contract structural baseline must pass controls: {result["errorCounts"]}')

    def test_release_art_gate_rejects_r2_unfinished_visuals(self) -> None:
        result = validate(copy.deepcopy(self.baseline), require_art_final=True)
        self.assertEqual(result['status'], 'FAIL')
        self.assertEqual(result['errorCounts'].get('ART_FINAL_NOT_PASS'), 207)

    def test_original_major_negative_missing_source_runtime_is_rejected(self) -> None:
        evidence = build(
            FIXTURES / 'wearable-missing-source-runtime.csv',
            environment='fixture', deployment_id='neg', run_id='missing-source', candidate_fingerprint=CANDIDATE,
        )
        result = validate(evidence)
        self.assertEqual(result['status'], 'FAIL')
        self.assertTrue({'SOURCE_FILE_MISSING', 'RUNTIME_FILE_MISSING', 'REVIEW_FILE_MISSING'} & codes(result))

    def test_original_major_negative_all_wrong_avatar_coverage_is_rejected(self) -> None:
        evidence = build(
            FIXTURES / 'wearable-all-wrong-avatar-coverage.csv',
            environment='fixture', deployment_id='neg', run_id='wrong-avatar', candidate_fingerprint=CANDIDATE,
        )
        result = validate(evidence)
        self.assertEqual(result['status'], 'FAIL')
        self.assertIn('DELIVERY_ID_MISMATCH', codes(result))

    def test_original_major_negative_fabricated_world_review_is_rejected(self) -> None:
        evidence = build(
            FIXTURES / 'world-fabricated-review-path.csv',
            environment='fixture', deployment_id='neg', run_id='fake-review', candidate_fingerprint=CANDIDATE,
        )
        result = validate(evidence)
        self.assertEqual(result['status'], 'FAIL')
        self.assertIn('REVIEW_FILE_MISSING', codes(result))

    def test_zero_of_zero_is_rejected(self) -> None:
        evidence = copy.deepcopy(self.baseline)
        evidence['records'] = []
        result = validate(evidence)
        self.assertEqual(result['status'], 'FAIL')
        self.assertIn('DELIVERY_COVERAGE_MISSING', codes(result))
        self.assertIn('DELIVERY_COUNT_MISMATCH', codes(result))

    def test_missing_role_is_rejected(self) -> None:
        evidence = copy.deepcopy(self.baseline)
        evidence['records'] = evidence['records'][1:]
        result = validate(evidence)
        self.assertEqual(result['status'], 'FAIL')
        self.assertIn('DELIVERY_COVERAGE_MISSING', codes(result))

    def test_duplicate_row_is_rejected(self) -> None:
        evidence = copy.deepcopy(self.baseline)
        evidence['records'][1] = copy.deepcopy(evidence['records'][0])
        result = validate(evidence)
        self.assertEqual(result['status'], 'FAIL')
        self.assertIn('DUPLICATE_DELIVERY_ID', codes(result))

    def test_wrong_but_decodable_runtime_item_is_rejected(self) -> None:
        evidence = copy.deepcopy(self.baseline)
        a = evidence['records'][0]
        b = next(rec for rec in evidence['records'] if rec['avatarId'] == a['avatarId'] and rec['itemId'] != a['itemId'] and rec['runtimeLayers'])
        a['runtimeLayers'] = copy.deepcopy(b['runtimeLayers'])
        result = validate(evidence)
        self.assertEqual(result['status'], 'FAIL')
        self.assertTrue({'RUNTIME_RENDERER_MISMATCH', 'RUNTIME_SPLIT_MISMATCH'} & codes(result))

    def test_zero_byte_decodable_claim_is_rejected(self) -> None:
        evidence = copy.deepcopy(self.baseline)
        with tempfile.TemporaryDirectory(prefix='v65-zero-', dir=ROOT / 'qa') as td:
            p = Path(td) / 'zero.png'
            p.write_bytes(b'')
            rel = p.relative_to(ROOT).as_posix()
            target = evidence['records'][0]
            target['sources'] = [{'path': rel, 'sha256': hashlib.sha256(b'').hexdigest()}]
            result = validate(evidence)
            self.assertEqual(result['status'], 'FAIL')
            self.assertIn('SOURCE_DECODE_FAIL', codes(result))

    def test_old_candidate_scope_is_rejected(self) -> None:
        evidence = copy.deepcopy(self.baseline)
        evidence['records'][0]['candidateFingerprint'] = '0' * 64
        result = validate(evidence)
        self.assertEqual(result['status'], 'FAIL')
        self.assertIn('CANDIDATE_SCOPE_MISMATCH', codes(result))

    def test_empty_runtime_observation_is_rejected(self) -> None:
        evidence = copy.deepcopy(self.baseline)
        evidence['records'][0]['actualRuntimeObserved'] = []
        result = validate(evidence)
        self.assertEqual(result['status'], 'FAIL')
        self.assertIn('OBSERVED_RUNTIME_EMPTY', codes(result))

    def test_truthy_string_cannot_fabricate_art_final(self) -> None:
        evidence = copy.deepcopy(self.baseline)
        for record in evidence['records']:
            record['visual']['artFinalPass'] = 'true'
        result = validate(evidence, require_art_final=True)
        self.assertEqual(result['status'], 'FAIL')
        self.assertEqual(result['errorCounts'].get('ART_FINAL_NOT_PASS'), 207)
        self.assertIn('CANDIDATE_FINGERPRINT_SOURCE_MISSING', codes(result))

    def test_replaced_screenshot_after_hash_capture_is_rejected(self) -> None:
        evidence = copy.deepcopy(self.baseline)
        source_shot = Path(ROOT / evidence['records'][0]['visual']['screenshots'][0]['path'])
        alternate = next(
            Path(ROOT / rec['visual']['screenshots'][0]['path'])
            for rec in evidence['records'][1:]
            if rec.get('visual', {}).get('screenshots')
            and Path(ROOT / rec['visual']['screenshots'][0]['path']).is_file()
            and rec['visual']['screenshots'][0]['path'] != evidence['records'][0]['visual']['screenshots'][0]['path']
        )
        with tempfile.TemporaryDirectory(prefix='v65-shot-', dir=ROOT / 'qa') as td:
            p = Path(td) / 'shot.png'
            p.write_bytes(source_shot.read_bytes())
            rel = p.relative_to(ROOT).as_posix()
            captured_hash = sha_file(p)
            evidence['records'][0]['visual']['screenshots'] = [{'path': rel, 'sha256': captured_hash}]
            p.write_bytes(alternate.read_bytes())
            result = validate(evidence)
            self.assertEqual(result['status'], 'FAIL')
            self.assertIn('SCREENSHOT_HASH_MISMATCH', codes(result))


if __name__ == '__main__':
    unittest.main(verbosity=2)
