#!/usr/bin/env python3
"""V6.5 delivery gate.

Validates the full product/avatar evidence chain instead of trusting ledger
status text. The gate is intentionally strict about exact row coverage,
source/runtime hashes, decodability, renderer-manifest linkage, file-backed
review evidence, screenshot hashes, and candidate/run scoping.

By default this script validates technical/evidence integrity only. Add
--require-art-final for release acceptance; the R2 baseline must then FAIL until
new V6.5 visual review marks every required row final-pass.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
AVATAR_MANIFEST = ROOT / 'src/data/avatarAssetManifest.json'
WORLD_MANIFEST = ROOT / 'src/data/worldArtManifest.json'
DEFAULT_EVIDENCE = ROOT / 'qa/v65/delivery-evidence/baseline-r2.json'
DEFAULT_OUT_ROOT = ROOT / 'qa/v65/delivery-gate'
AVATARS = ('brother', 'younger', 'sister', 'younger-sister')
VALID_ENV = {'local', 'production', 'production-audit', 'candidate', 'fixture'}
SAFE_SEGMENT = re.compile(r'^[A-Za-z0-9._-]+$')


def sha_file(path: Path) -> str | None:
    if not path.is_file():
        return None
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def decode_image(path: Path) -> tuple[bool, str | None]:
    try:
        with Image.open(path) as im:
            im.verify()
        return True, None
    except Exception as exc:  # Pillow reports corrupt/zero-byte/format mismatch here.
        return False, f'{type(exc).__name__}: {exc}'


def expected_contracts() -> tuple[dict[tuple[str, str], dict[str, Any]], dict[str, dict[str, Any]]]:
    avatar = json.loads(AVATAR_MANIFEST.read_text(encoding='utf-8'))
    world = json.loads(WORLD_MANIFEST.read_text(encoding='utf-8'))
    wearable: dict[tuple[str, str], dict[str, Any]] = {}

    for skin in avatar.get('skins', []):
        if skin.get('skinId') == 'default':
            continue
        wearable[(skin['skinId'], skin['avatarId'])] = {
            'renderer': 'full-skin',
            'primaryCandidates': {skin['path']},
            'requiredRuntimePaths': {skin['path']},
        }

    for acc in avatar.get('accessories', []):
        if acc.get('renderer') == 'standard-effect':
            continue
        for avatar_id in AVATARS:
            if avatar_id not in acc.get('supportedAvatars', AVATARS):
                continue
            if acc['renderer'] == 'aligned-overlay':
                candidates: set[str] = set()
                variant = acc.get('variants', {}).get(avatar_id)
                detail = acc.get('defaultSkinDetails', {}).get(avatar_id, {}).get('overlay')
                if variant:
                    candidates.add(variant)
                if detail:
                    candidates.add(detail)
                for headwear in acc.get('headwearVariants', {}).get(avatar_id, {}).values():
                    if headwear.get('overlay'):
                        candidates.add(headwear['overlay'])
                wearable[(acc['id'], avatar_id)] = {
                    'renderer': 'aligned-overlay',
                    'primaryCandidates': candidates,
                    # Only the main variant is required as a row delivery. Detail/combination
                    # variants are verified by runtime/browser evidence, not by pretending
                    # every derived combination is another ledger row.
                    'requiredRuntimePaths': {variant or detail} if (variant or detail) else set(),
                }
            elif acc['renderer'] == 'split-overlay':
                back = acc.get('backVariants', {}).get(avatar_id)
                front = acc.get('frontVariants', {}).get(avatar_id)
                required = {p for p in (back, front) if p}
                wearable[(acc['id'], avatar_id)] = {
                    'renderer': 'split-overlay',
                    'primaryCandidates': set(required),
                    'requiredRuntimePaths': set(required),
                }

    world_by_id = {rec['itemId']: rec for rec in world.get('records', [])}
    return wearable, world_by_id


def expected_delivery_ids() -> set[str]:
    wearable, world = expected_contracts()
    ids = {f'{item}:{avatar}' for item, avatar in wearable}
    ids.update(f'{item}:world' for item in world)
    return ids


def add(errors: list[dict[str, Any]], code: str, message: str, delivery_id: str | None = None) -> None:
    rec: dict[str, Any] = {'code': code, 'message': message}
    if delivery_id:
        rec['deliveryId'] = delivery_id
    errors.append(rec)


def validate_file_record(
    rec: dict[str, Any] | None,
    errors: list[dict[str, Any]],
    *,
    code_prefix: str,
    delivery_id: str,
    must_decode: bool,
) -> None:
    if not rec or not rec.get('path'):
        add(errors, f'{code_prefix}_PATH_MISSING', 'file evidence path missing', delivery_id)
        return
    path_text = str(rec['path'])
    p = ROOT / path_text
    if not p.is_file():
        add(errors, f'{code_prefix}_FILE_MISSING', f'missing file: {path_text}', delivery_id)
        return
    expected = rec.get('sha256')
    if not expected or not re.fullmatch(r'[0-9a-f]{64}', str(expected)):
        add(errors, f'{code_prefix}_HASH_MISSING', f'missing/invalid sha256: {path_text}', delivery_id)
    else:
        actual = sha_file(p)
        if actual != expected:
            add(errors, f'{code_prefix}_HASH_MISMATCH', f'{path_text}: expected {expected}, actual {actual}', delivery_id)
    if must_decode:
        ok, reason = decode_image(p)
        if not ok:
            add(errors, f'{code_prefix}_DECODE_FAIL', f'{path_text}: {reason}', delivery_id)


def validate(data: dict[str, Any], *, require_art_final: bool = False) -> dict[str, Any]:
    errors: list[dict[str, Any]] = []
    wearable, world_by_id = expected_contracts()
    expected_ids = expected_delivery_ids()

    for field in ('environment', 'deploymentId', 'runId', 'candidateFingerprint'):
        if not str(data.get(field, '')).strip():
            add(errors, 'RUN_SCOPE_MISSING', f'top-level {field} is required')
    env = str(data.get('environment', ''))
    if env and env not in VALID_ENV:
        add(errors, 'RUN_ENV_INVALID', f'unsupported environment: {env}')
    for field in ('deploymentId', 'runId'):
        value = str(data.get(field, ''))
        if value and not SAFE_SEGMENT.fullmatch(value):
            add(errors, 'RUN_SCOPE_UNSAFE', f'{field} contains unsafe path characters: {value}')

    records = data.get('records')
    if not isinstance(records, list):
        add(errors, 'RECORDS_INVALID', 'records must be a list')
        records = []

    ids = [str(r.get('deliveryId', '')) for r in records if isinstance(r, dict)]
    dup = sorted(k for k, v in Counter(ids).items() if k and v > 1)
    if dup:
        add(errors, 'DUPLICATE_DELIVERY_ID', f'duplicate delivery ids: {dup[:20]}')
    actual_set = set(ids)
    missing = sorted(expected_ids - actual_set)
    extra = sorted(actual_set - expected_ids)
    if missing:
        add(errors, 'DELIVERY_COVERAGE_MISSING', f'missing expected deliveries: {missing[:30]}')
    if extra:
        add(errors, 'DELIVERY_COVERAGE_EXTRA', f'unexpected deliveries: {extra[:30]}')
    if len(records) != len(expected_ids):
        add(errors, 'DELIVERY_COUNT_MISMATCH', f'record count {len(records)}/{len(expected_ids)}')

    top_candidate = data.get('candidateFingerprint')
    current_visual_rows: dict[str, Any] = {}
    current_visual_boards: dict[str, Any] = {}
    current_root_review: dict[str, Any] = {}
    if require_art_final:
        fingerprint_source = data.get('candidateFingerprintSource')
        if not isinstance(fingerprint_source, dict):
            add(errors, 'CANDIDATE_FINGERPRINT_SOURCE_MISSING', 'current release evidence requires a file-backed candidate fingerprint')
        else:
            validate_file_record(fingerprint_source, errors, code_prefix='CANDIDATE_FINGERPRINT_SOURCE', delivery_id='', must_decode=False)
            fp_path = ROOT / str(fingerprint_source.get('path', ''))
            if fp_path.is_file():
                fp_data = json.loads(fp_path.read_text(encoding='utf-8'))
                if fp_data.get('aggregateSha256') != top_candidate:
                    add(errors, 'CANDIDATE_FINGERPRINT_CONTENT_MISMATCH', 'fingerprint file aggregate differs from evidence candidate')
        runtime_report = data.get('visualRuntimeReport')
        root_review = data.get('rootVisualReview')
        for rec, prefix in ((runtime_report, 'VISUAL_RUNTIME_REPORT'), (root_review, 'ROOT_VISUAL_REVIEW')):
            if not isinstance(rec, dict):
                add(errors, f'{prefix}_MISSING', f'{prefix.lower()} is required')
            else:
                validate_file_record(rec, errors, code_prefix=prefix, delivery_id='', must_decode=False)
        if isinstance(runtime_report, dict) and (ROOT / str(runtime_report.get('path', ''))).is_file():
            report_data = json.loads((ROOT / runtime_report['path']).read_text(encoding='utf-8'))
            if report_data.get('status') != 'PASS_PENDING_ROOT_VISUAL' or report_data.get('candidateFingerprint') != top_candidate:
                add(errors, 'VISUAL_RUNTIME_REPORT_SCOPE_MISMATCH', 'runtime visual report is stale or not technically complete')
            current_visual_rows = {row.get('deliveryId'): row for row in report_data.get('rows', [])}
            current_visual_boards = {delivery: board for board in report_data.get('boards', []) for delivery in board.get('deliveries', [])}
        if isinstance(root_review, dict) and (ROOT / str(root_review.get('path', ''))).is_file():
            current_root_review = json.loads((ROOT / root_review['path']).read_text(encoding='utf-8'))
            if current_root_review.get('status') != 'PASS_CURRENT_DELIVERY_VISUAL' or current_root_review.get('candidateFingerprint') != top_candidate:
                add(errors, 'ROOT_VISUAL_REVIEW_SCOPE_MISMATCH', 'root visual decision is stale or not PASS')
            if isinstance(runtime_report, dict) and current_root_review.get('runtimeVisualReportSha256') != runtime_report.get('sha256'):
                add(errors, 'ROOT_VISUAL_REVIEW_REPORT_MISMATCH', 'root review does not bind the current runtime visual report')
    for record in records:
        if not isinstance(record, dict):
            add(errors, 'RECORD_INVALID', 'record must be an object')
            continue
        delivery_id = str(record.get('deliveryId', ''))
        item = str(record.get('itemId', ''))
        avatar = str(record.get('avatarId', ''))
        expected_delivery = f'{item}:{avatar}'
        if delivery_id != expected_delivery:
            add(errors, 'DELIVERY_ID_MISMATCH', f'{delivery_id} != {expected_delivery}', delivery_id or None)
        if record.get('candidateFingerprint') != top_candidate:
            add(errors, 'CANDIDATE_SCOPE_MISMATCH', 'record candidate fingerprint differs from top-level candidate', delivery_id)

        if avatar == 'world':
            world = world_by_id.get(item)
            if not world:
                add(errors, 'WORLD_ITEM_UNKNOWN', f'world item not in manifest: {item}', delivery_id)
                continue
            expected_renderer = 'world'
            primary_candidates = {world.get('delivery', {}).get('path')}
            required_paths = set(primary_candidates)
            primary_candidates.discard(None)
            required_paths.discard(None)
        else:
            contract = wearable.get((item, avatar))
            if not contract:
                add(errors, 'WEARABLE_ITEM_AVATAR_UNKNOWN', f'no manifest contract for {item}/{avatar}', delivery_id)
                continue
            expected_renderer = contract['renderer']
            primary_candidates = set(contract['primaryCandidates'])
            required_paths = set(contract['requiredRuntimePaths'])

        renderer = record.get('rendererSelection') or {}
        if renderer.get('mode') != expected_renderer:
            add(errors, 'RENDERER_MODE_MISMATCH', f"expected {expected_renderer}, got {renderer.get('mode')}", delivery_id)
        declared_candidates = set(renderer.get('primaryCandidates') or [])
        if declared_candidates != primary_candidates:
            add(errors, 'RENDERER_CANDIDATES_MISMATCH', f'manifest candidates differ: expected {sorted(primary_candidates)}, got {sorted(declared_candidates)}', delivery_id)

        sources = record.get('sources') or []
        if not sources:
            add(errors, 'SOURCE_CHAIN_EMPTY', 'no source layers recorded', delivery_id)
        for src in sources:
            validate_file_record(src, errors, code_prefix='SOURCE', delivery_id=delivery_id, must_decode=True)

        runtime_layers = record.get('runtimeLayers') or []
        runtime_paths = {str(layer.get('path')) for layer in runtime_layers if isinstance(layer, dict) and layer.get('path')}
        if expected_renderer in {'full-skin', 'aligned-overlay', 'world'}:
            # One reviewed primary runtime is expected, and it must be a path the
            # current renderer can actually select for the same item/avatar.
            if len(runtime_paths) != 1:
                add(errors, 'RUNTIME_PRIMARY_COUNT', f'expected one primary runtime, got {sorted(runtime_paths)}', delivery_id)
            elif not runtime_paths.issubset(primary_candidates):
                add(errors, 'RUNTIME_RENDERER_MISMATCH', f'runtime {sorted(runtime_paths)} not selectable from {sorted(primary_candidates)}', delivery_id)
        elif expected_renderer == 'split-overlay' and runtime_paths != required_paths:
            add(errors, 'RUNTIME_SPLIT_MISMATCH', f'split runtime paths expected {sorted(required_paths)}, got {sorted(runtime_paths)}', delivery_id)
        for runtime in runtime_layers:
            validate_file_record(runtime, errors, code_prefix='RUNTIME', delivery_id=delivery_id, must_decode=True)

        observed = record.get('actualRuntimeObserved') or []
        observed_paths = {str(obs.get('path')) for obs in observed if isinstance(obs, dict) and obs.get('path')}
        if not observed:
            add(errors, 'OBSERVED_RUNTIME_EMPTY', 'fresh browser runtime observation is required', delivery_id)
        elif observed_paths != required_paths:
            add(errors, 'OBSERVED_RUNTIME_COVERAGE_MISMATCH', f'observed {sorted(observed_paths)} != required {sorted(required_paths)}', delivery_id)
        for obs in observed:
            path_text = obs.get('path')
            if not path_text:
                add(errors, 'OBSERVED_RUNTIME_PATH_MISSING', 'actual runtime observation missing path', delivery_id)
                continue
            if path_text not in primary_candidates and path_text not in required_paths:
                add(errors, 'OBSERVED_RUNTIME_NOT_RENDERER_SELECTABLE', f'observed path is not in current renderer contract: {path_text}', delivery_id)
            validate_file_record(obs, errors, code_prefix='OBSERVED_RUNTIME', delivery_id=delivery_id, must_decode=True)

        review_files = [r for r in (record.get('reviewEvidence') or []) if isinstance(r, dict) and r.get('kind') == 'file']
        if not review_files:
            add(errors, 'REVIEW_FILE_EVIDENCE_EMPTY', 'no file-backed review evidence recorded', delivery_id)
        for review in review_files:
            validate_file_record(review, errors, code_prefix='REVIEW', delivery_id=delivery_id, must_decode=False)

        visual = record.get('visual') or {}
        screenshots = visual.get('screenshots') or []
        if not screenshots:
            add(errors, 'VISUAL_SCREENSHOT_EMPTY', 'no visual screenshot evidence', delivery_id)
        for shot in screenshots:
            validate_file_record(shot, errors, code_prefix='SCREENSHOT', delivery_id=delivery_id, must_decode=True)
        if visual.get('reviewBoard'):
            validate_file_record(visual['reviewBoard'], errors, code_prefix='REVIEW_BOARD', delivery_id=delivery_id, must_decode=True)
        else:
            add(errors, 'REVIEW_BOARD_MISSING', 'visual review board missing', delivery_id)
        if require_art_final:
            if visual.get('artFinalPass') is not True:
                add(errors, 'ART_FINAL_NOT_PASS', f"auditCode={visual.get('auditCode')}", delivery_id)
            if visual.get('candidateFingerprint') != top_candidate:
                add(errors, 'VISUAL_CANDIDATE_SCOPE_MISMATCH', 'visual decision candidate differs from top-level candidate', delivery_id)
            report_row = current_visual_rows.get(delivery_id)
            report_board = current_visual_boards.get(delivery_id)
            if not report_row:
                add(errors, 'VISUAL_REPORT_ROW_MISSING', 'delivery absent from fresh current visual report', delivery_id)
            else:
                if report_row.get('runtimeObservationPass') is not True or set(report_row.get('requiredRuntimePaths') or []) != required_paths:
                    add(errors, 'VISUAL_REPORT_RUNTIME_MISMATCH', 'fresh visual row does not prove required current runtime paths', delivery_id)
                if (report_row.get('screenshot') or {}) != (screenshots[0] if len(screenshots) == 1 else None):
                    add(errors, 'VISUAL_REPORT_SCREENSHOT_MISMATCH', 'screenshot is not the fresh report screenshot', delivery_id)
            if not report_board or {k: report_board.get(k) for k in ('path', 'sha256')} != visual.get('reviewBoard'):
                add(errors, 'VISUAL_REPORT_BOARD_MISMATCH', 'board is not the fresh report board', delivery_id)
            reviewed_boards = {(row.get('path'), row.get('sha256')) for row in current_root_review.get('reviewedBoards', [])}
            board_pair = (visual.get('reviewBoard', {}).get('path'), visual.get('reviewBoard', {}).get('sha256'))
            if board_pair not in reviewed_boards:
                add(errors, 'ROOT_VISUAL_BOARD_NOT_REVIEWED', 'root review does not bind this board', delivery_id)

    counts = Counter(err['code'] for err in errors)
    return {
        'status': 'PASS' if not errors else 'FAIL',
        'suiteName': 'v65-delivery-gate',
        'environment': data.get('environment'),
        'deploymentId': data.get('deploymentId'),
        'runId': data.get('runId'),
        'candidateFingerprint': data.get('candidateFingerprint'),
        'recordCount': len(records),
        'expectedRecordCount': len(expected_ids),
        'requireArtFinal': require_art_final,
        'errorCount': len(errors),
        'errorCounts': dict(sorted(counts.items())),
        'errors': errors,
    }


def output_path(data: dict[str, Any], out_root: Path) -> Path:
    env = str(data.get('environment', ''))
    deployment = str(data.get('deploymentId', ''))
    run_id = str(data.get('runId', ''))
    for value in (env, deployment, run_id):
        if not value or not SAFE_SEGMENT.fullmatch(value):
            raise ValueError(f'unsafe or empty run-scope segment: {value!r}')
    return out_root / env / deployment / run_id / 'result.json'


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--evidence', default=str(DEFAULT_EVIDENCE.relative_to(ROOT)))
    ap.add_argument('--output-root', default=str(DEFAULT_OUT_ROOT.relative_to(ROOT)))
    ap.add_argument('--require-art-final', action='store_true')
    ap.add_argument('--no-write', action='store_true')
    args = ap.parse_args()

    evidence = Path(args.evidence)
    if not evidence.is_absolute():
        evidence = ROOT / evidence
    if not evidence.is_file():
        print(json.dumps({'status': 'FAIL', 'error': f'missing evidence {evidence}'}, ensure_ascii=False, indent=2))
        return 1
    data = json.loads(evidence.read_text(encoding='utf-8'))
    result = validate(data, require_art_final=args.require_art_final)

    if not args.no_write:
        out_root = Path(args.output_root)
        if not out_root.is_absolute():
            out_root = ROOT / out_root
        try:
            out = output_path(data, out_root)
        except ValueError as exc:
            print(json.dumps({'status': 'FAIL', 'error': str(exc)}, ensure_ascii=False, indent=2))
            return 1
        if out.exists():
            print(json.dumps({'status': 'FAIL', 'error': f'REFUSE_OVERWRITE: {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}'}, ensure_ascii=False, indent=2))
            return 1
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        result['resultPath'] = str(out.relative_to(ROOT)) if out.is_relative_to(ROOT) else str(out)

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result['status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
