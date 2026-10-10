#!/usr/bin/env python3
"""Build a structured V6.5 delivery-evidence snapshot from the current V6.4 ledger.

This is a migration/scaffolding utility for the V6.5 gate. It does not turn the
R2 audit into a new PASS: visual adjudication is copied verbatim, including
R/C/K/W and artFinalPass=false. Historical V6.4 evidence is never overwritten.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LEDGER = ROOT / 'docs/plans/V6.4_完整交付重整計畫_20260914/商品角色交付清單.csv'
AVATAR_MANIFEST = ROOT / 'src/data/avatarAssetManifest.json'
WORLD_MANIFEST = ROOT / 'src/data/worldArtManifest.json'
AUDIT_INDEX = ROOT / 'V6.4審查包/05_逐件審查索引.json'
AUDIT_COMPLETION = ROOT / 'qa/judge-audit/20260917_R2/evidence/audit-completion.json'
DEFAULT_OUT = ROOT / 'qa/v65/delivery-evidence/baseline-r2.json'
AVATARS = ('brother', 'younger', 'sister', 'younger-sister')
SPLIT_FRONT_RE = re.compile(
    r'Paired FRONT reviewed source=(\S+) sha256=([0-9a-f]{64}); runtime=(\S+) sha256=([0-9a-f]{64})'
)


def sha_file(path: Path) -> str | None:
    if not path.is_file():
        return None
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def rel_record(path_text: str, expected_sha: str | None = None) -> dict[str, Any]:
    p = ROOT / path_text
    return {
        'path': path_text,
        'sha256': expected_sha or sha_file(p),
        'observedSha256': sha_file(p),
        'exists': p.is_file(),
    }


def parse_review_refs(text: str) -> list[dict[str, Any]]:
    refs: list[dict[str, Any]] = []
    for raw in (part.strip() for part in text.split('|')):
        if not raw:
            continue
        path_text = raw.split('#', 1)[0].strip()
        # Human approval tokens are preserved as labels but are not file evidence.
        if '/' not in path_text or Path(path_text).suffix.lower() not in {'.json', '.md', '.txt', '.log', '.png', '.jpg', '.jpeg', '.webp'}:
            refs.append({'label': raw, 'kind': 'label'})
            continue
        rec = rel_record(path_text)
        rec.update({'kind': 'file', 'reference': raw})
        refs.append(rec)
    return refs


def manifest_contracts() -> tuple[dict[tuple[str, str], dict[str, Any]], dict[str, dict[str, Any]]]:
    avatar = json.loads(AVATAR_MANIFEST.read_text(encoding='utf-8'))
    world = json.loads(WORLD_MANIFEST.read_text(encoding='utf-8'))
    wearable: dict[tuple[str, str], dict[str, Any]] = {}

    for skin in avatar.get('skins', []):
        if skin.get('skinId') == 'default':
            continue
        wearable[(skin['skinId'], skin['avatarId'])] = {
            'renderer': 'full-skin',
            'primaryCandidates': [skin['path']],
            'requiredRuntimePaths': [skin['path']],
        }

    for acc in avatar.get('accessories', []):
        if acc.get('renderer') == 'standard-effect':
            continue
        for avatar_id in AVATARS:
            if avatar_id not in acc.get('supportedAvatars', AVATARS):
                continue
            if acc['renderer'] == 'aligned-overlay':
                candidates: list[str] = []
                variant = acc.get('variants', {}).get(avatar_id)
                if variant:
                    candidates.append(variant)
                detail = acc.get('defaultSkinDetails', {}).get(avatar_id, {}).get('overlay')
                if detail and detail not in candidates:
                    candidates.append(detail)
                for hw in acc.get('headwearVariants', {}).get(avatar_id, {}).values():
                    overlay = hw.get('overlay')
                    if overlay and overlay not in candidates:
                        candidates.append(overlay)
                wearable[(acc['id'], avatar_id)] = {
                    'renderer': 'aligned-overlay',
                    'primaryCandidates': candidates,
                    'requiredRuntimePaths': [variant or detail] if (variant or detail) else [],
                }
            elif acc['renderer'] == 'split-overlay':
                back = acc.get('backVariants', {}).get(avatar_id)
                front = acc.get('frontVariants', {}).get(avatar_id)
                wearable[(acc['id'], avatar_id)] = {
                    'renderer': 'split-overlay',
                    'primaryCandidates': [p for p in (back, front) if p],
                    'requiredRuntimePaths': [p for p in (back, front) if p],
                }

    world_by_id = {rec['itemId']: rec for rec in world.get('records', [])}
    return wearable, world_by_id


def load_audit_index() -> dict[str, dict[str, Any]]:
    data = json.loads(AUDIT_INDEX.read_text(encoding='utf-8'))
    return {rec['itemId']: rec for rec in data.get('records', [])}


def visual_for(audit: dict[str, Any] | None, avatar_id: str) -> dict[str, Any]:
    if not audit:
        return {'auditCode': None, 'artFinalPass': False, 'screenshots': [], 'reviewBoard': None, 'catalogScreenshot': None}
    roles = audit.get('roles', [])
    selected = roles if avatar_id == 'world' else [r for r in roles if r.get('avatar') == avatar_id]
    screenshots: list[dict[str, Any]] = []
    for role in selected:
        for path_text in role.get('screenshots', []):
            rec = rel_record(path_text)
            if not any(x['path'] == path_text for x in screenshots):
                screenshots.append(rec)
    codes = sorted({r.get('code') for r in selected if r.get('code')})
    art_pass = bool(selected) and all(bool(r.get('artFinalPass')) for r in selected)
    review_board = rel_record(audit['reviewBoard']) if audit.get('reviewBoard') else None
    catalog = rel_record(audit['catalogScreenshot']) if audit.get('catalogScreenshot') else None
    return {
        'auditCode': '+'.join(codes) if codes else None,
        'artFinalPass': art_pass,
        'screenshots': screenshots,
        'reviewBoard': review_board,
        'catalogScreenshot': catalog,
        'action': audit.get('action'),
    }


def build(ledger_path: Path, *, environment: str, deployment_id: str, run_id: str, candidate_fingerprint: str) -> dict[str, Any]:
    wearable_contracts, world_by_id = manifest_contracts()
    audit_by_id = load_audit_index()
    with ledger_path.open(encoding='utf-8-sig', newline='') as f:
        rows = list(csv.DictReader(f))

    records: list[dict[str, Any]] = []
    for row in rows:
        item_id = row['item_id']
        avatar_id = row['avatar_id']
        review_refs = parse_review_refs(row.get('review_evidence', ''))
        if avatar_id == 'world':
            world = world_by_id.get(item_id, {})
            source = [rel_record(row['source_path'], row.get('source_sha256') or None)]
            runtime_path = row['runtime_path']
            runtime = [rel_record(runtime_path)]
            renderer = {
                'mode': 'world',
                'primaryCandidates': [world.get('delivery', {}).get('path')] if world else [],
                'requiredRuntimePaths': [world.get('delivery', {}).get('path')] if world else [],
            }
        else:
            contract = wearable_contracts.get((item_id, avatar_id), {})
            source = [rel_record(row['source_path'], row.get('source_sha256') or None)]
            runtime = [rel_record(row['runtime_path'])]
            front = SPLIT_FRONT_RE.search(row.get('notes', ''))
            if contract.get('renderer') == 'split-overlay' and front:
                source.append(rel_record(front.group(1), front.group(2)))
                if front.group(3) != row['runtime_path']:
                    runtime.append(rel_record(front.group(3), front.group(4)))
            renderer = {
                'mode': contract.get('renderer'),
                'primaryCandidates': contract.get('primaryCandidates', []),
                'requiredRuntimePaths': contract.get('requiredRuntimePaths', []),
            }

        audit = audit_by_id.get(item_id)
        actual_observed: list[dict[str, Any]] = []
        if audit and avatar_id != 'world':
            role = next((r for r in audit.get('roles', []) if r.get('avatar') == avatar_id), None)
            for layer in (role or {}).get('actualRuntimeLayers', []):
                actual_observed.append({
                    'path': layer.get('path'),
                    'sha256': layer.get('sha256'),
                    'observedSha256': sha_file(ROOT / layer['path']) if layer.get('path') else None,
                })

        records.append({
            'deliveryId': row.get('delivery_id'),
            'itemId': item_id,
            'avatarId': avatar_id,
            'slot': row.get('slot'),
            'legacyStatus': row.get('status'),
            'candidateFingerprint': candidate_fingerprint,
            'sources': source,
            'runtimeLayers': runtime,
            'rendererSelection': renderer,
            'actualRuntimeObserved': actual_observed,
            'reviewEvidence': review_refs,
            'visual': visual_for(audit, avatar_id),
        })

    return {
        'schemaVersion': 1,
        'suiteName': 'v65-delivery-evidence',
        'environment': environment,
        'deploymentId': deployment_id,
        'runId': run_id,
        'candidateFingerprint': candidate_fingerprint,
        'sourceLedger': str(ledger_path.relative_to(ROOT)) if ledger_path.is_relative_to(ROOT) else str(ledger_path),
        'records': records,
    }


def build_current(
    ledger_path: Path,
    *,
    visual_report_path: Path,
    root_review_path: Path,
    candidate_fingerprint_source: Path,
    environment: str,
    deployment_id: str,
    run_id: str,
    candidate_fingerprint: str,
) -> dict[str, Any]:
    """Bind all 207 deliveries to one fresh current-build visual run.

    Historical ledger files remain source-lineage evidence only. Runtime paths
    come exclusively from the live manifests, and visual PASS comes exclusively
    from the fresh current-candidate browser report plus root board review.
    """
    wearable_contracts, world_by_id = manifest_contracts()
    visual_report = json.loads(visual_report_path.read_text(encoding='utf-8'))
    root_review = json.loads(root_review_path.read_text(encoding='utf-8'))
    fingerprint = json.loads(candidate_fingerprint_source.read_text(encoding='utf-8'))
    if fingerprint.get('aggregateSha256') != candidate_fingerprint:
        raise ValueError('candidate fingerprint source does not match requested candidate')
    if visual_report.get('candidateFingerprint') != candidate_fingerprint:
        raise ValueError('visual report candidate fingerprint mismatch')
    if root_review.get('candidateFingerprint') != candidate_fingerprint:
        raise ValueError('root review candidate fingerprint mismatch')
    if visual_report.get('status') != 'PASS_PENDING_ROOT_VISUAL' or root_review.get('status') != 'PASS_CURRENT_DELIVERY_VISUAL':
        raise ValueError('fresh visual report/root review is not accepted')
    visual_by_id = {row['deliveryId']: row for row in visual_report.get('rows', [])}
    board_by_id = {
        delivery_id: board
        for board in visual_report.get('boards', [])
        for delivery_id in board.get('deliveries', [])
    }
    with ledger_path.open(encoding='utf-8-sig', newline='') as f:
        ledger_by_id = {row['delivery_id']: row for row in csv.DictReader(f)}

    expected: list[tuple[str, str, str, dict[str, Any]]] = []
    for (item_id, avatar_id), contract in sorted(wearable_contracts.items()):
        expected.append((item_id, avatar_id, ledger_by_id[f'{item_id}:{avatar_id}'].get('slot', ''), contract))
    for item_id, world in sorted(world_by_id.items()):
        path = world.get('delivery', {}).get('path')
        expected.append((item_id, 'world', ledger_by_id[f'{item_id}:world'].get('slot', ''), {
            'renderer': 'world', 'primaryCandidates': [path], 'requiredRuntimePaths': [path],
        }))

    report_record = rel_record(visual_report_path.relative_to(ROOT).as_posix())
    review_record = rel_record(root_review_path.relative_to(ROOT).as_posix())
    records: list[dict[str, Any]] = []
    for item_id, avatar_id, slot, contract in expected:
        delivery_id = f'{item_id}:{avatar_id}'
        ledger = ledger_by_id[delivery_id]
        observed = visual_by_id.get(delivery_id)
        board = board_by_id.get(delivery_id)
        if not observed or not board:
            raise ValueError(f'missing fresh visual observation: {delivery_id}')
        sources = [rel_record(ledger['source_path'], ledger.get('source_sha256') or None)]
        front = SPLIT_FRONT_RE.search(ledger.get('notes', ''))
        if contract['renderer'] == 'split-overlay' and front:
            sources.append(rel_record(front.group(1), front.group(2)))
        runtime = [rel_record(path) for path in contract['requiredRuntimePaths']]
        screenshot = dict(observed['screenshot'])
        board_record = {'path': board['path'], 'sha256': board['sha256']}
        records.append({
            'deliveryId': delivery_id,
            'itemId': item_id,
            'avatarId': avatar_id,
            'slot': slot,
            'legacyStatus': ledger.get('status'),
            'candidateFingerprint': candidate_fingerprint,
            'sources': sources,
            'runtimeLayers': runtime,
            'rendererSelection': {
                'mode': contract['renderer'],
                'primaryCandidates': contract['primaryCandidates'],
                'requiredRuntimePaths': contract['requiredRuntimePaths'],
            },
            'actualRuntimeObserved': [
                {**rel_record(path), 'browserReport': report_record, 'complete': True, 'decoded': True, 'visible': True}
                for path in observed['requiredRuntimePaths']
            ],
            'reviewEvidence': [
                {**report_record, 'kind': 'file', 'reference': f'{report_record["path"]}#{delivery_id}'},
                {**review_record, 'kind': 'file', 'reference': f'{review_record["path"]}#PASS_CURRENT_DELIVERY_VISUAL'},
            ],
            'visual': {
                'auditCode': 'V65_CURRENT_BUILD_ROOT_REVIEW',
                'artFinalPass': True,
                'screenshots': [screenshot],
                'reviewBoard': board_record,
                'runtimeReport': report_record,
                'decisionEvidence': review_record,
                'candidateFingerprint': candidate_fingerprint,
            },
        })
    return {
        'schemaVersion': 2,
        'suiteName': 'v65-delivery-evidence',
        'environment': environment,
        'deploymentId': deployment_id,
        'runId': run_id,
        'candidateFingerprint': candidate_fingerprint,
        'candidateFingerprintSource': rel_record(candidate_fingerprint_source.relative_to(ROOT).as_posix()),
        'sourceLedger': ledger_path.relative_to(ROOT).as_posix(),
        'visualRuntimeReport': report_record,
        'rootVisualReview': review_record,
        'records': records,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--ledger', default=str(DEFAULT_LEDGER.relative_to(ROOT)))
    ap.add_argument('--output', default=str(DEFAULT_OUT.relative_to(ROOT)))
    ap.add_argument('--environment', default='production-audit')
    ap.add_argument('--deployment-id', default='dpl_J3bRcfYxQZcG5LERwJfHumYxLHxx')
    ap.add_argument('--run-id', default='20260917_R2_baseline')
    ap.add_argument('--candidate-fingerprint', default='')
    ap.add_argument('--mode', choices=('historical', 'current'), default='historical')
    ap.add_argument('--visual-report', default='')
    ap.add_argument('--root-review', default='')
    ap.add_argument('--candidate-fingerprint-source', default='')
    args = ap.parse_args()

    ledger = Path(args.ledger)
    if not ledger.is_absolute():
        ledger = ROOT / ledger
    out = Path(args.output)
    if not out.is_absolute():
        out = ROOT / out
    if out.exists():
        raise SystemExit(f'REFUSE_OVERWRITE: {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}')

    candidate = args.candidate_fingerprint
    if not candidate and AUDIT_COMPLETION.is_file():
        candidate = json.loads(AUDIT_COMPLETION.read_text(encoding='utf-8')).get('baselineAggregate', '')
    if not candidate:
        raise SystemExit('candidate fingerprint is required')

    if args.mode == 'current':
        required_args = (args.visual_report, args.root_review, args.candidate_fingerprint_source)
        if not all(required_args):
            raise SystemExit('current mode requires --visual-report, --root-review and --candidate-fingerprint-source')
        def rooted(value: str) -> Path:
            path = Path(value)
            return path if path.is_absolute() else ROOT / path
        data = build_current(
            ledger,
            visual_report_path=rooted(args.visual_report),
            root_review_path=rooted(args.root_review),
            candidate_fingerprint_source=rooted(args.candidate_fingerprint_source),
            environment=args.environment,
            deployment_id=args.deployment_id,
            run_id=args.run_id,
            candidate_fingerprint=candidate,
        )
    else:
        data = build(
            ledger,
            environment=args.environment,
            deployment_id=args.deployment_id,
            run_id=args.run_id,
            candidate_fingerprint=candidate,
        )
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': 'CAPTURED', 'path': str(out.relative_to(ROOT)), 'records': len(data['records']), 'candidateFingerprint': candidate}, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
