#!/usr/bin/env python3
"""V6.4 current delivery-ledger release gate.

Validates the authoritative 207-row delivery ledger after T06 reconciliation.
This is the current candidate contract; it intentionally does not replay the
obsolete pre-reconciliation built-in-generation evidence schema.
"""
from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = ROOT / 'docs/plans/V6.4_完整交付重整計畫_20260914/商品角色交付清單.csv'
WORLD_MANIFEST = ROOT / 'src/data/worldArtManifest.json'
EXPECTED_TOTAL = 207
EXPECTED_WEARABLE = 192
EXPECTED_WORLD = 15


def fail(message: str) -> None:
    raise AssertionError(message)


def main() -> int:
    with LEDGER.open(encoding='utf-8-sig', newline='') as f:
        rows = list(csv.DictReader(f))
    if len(rows) != EXPECTED_TOTAL:
        fail(f'ledger row count {len(rows)}/{EXPECTED_TOTAL}')
    delivery_ids = [r['delivery_id'] for r in rows]
    if len(delivery_ids) != len(set(delivery_ids)):
        dup = [k for k, v in Counter(delivery_ids).items() if v > 1]
        fail(f'duplicate delivery ids: {dup[:10]}')
    if any(r['status'] != 'CANDIDATE_VERIFIED' for r in rows):
        bad = [(r['delivery_id'], r['status']) for r in rows if r['status'] != 'CANDIDATE_VERIFIED']
        fail(f'non-candidate rows remain: {bad[:10]}')

    world = [r for r in rows if r['avatar_id'] == 'world']
    wearable = [r for r in rows if r['avatar_id'] != 'world']
    if len(wearable) != EXPECTED_WEARABLE:
        fail(f'wearable rows {len(wearable)}/{EXPECTED_WEARABLE}')
    if len(world) != EXPECTED_WORLD:
        fail(f'world rows {len(world)}/{EXPECTED_WORLD}')

    manifest = json.loads(WORLD_MANIFEST.read_text(encoding='utf-8'))
    records = manifest.get('records', [])
    if len(records) != EXPECTED_WORLD:
        fail(f'world manifest records {len(records)}/{EXPECTED_WORLD}')
    by_id = {r['itemId']: r for r in records}
    if len(by_id) != EXPECTED_WORLD:
        fail('world manifest item IDs are not unique')

    failures: list[str] = []
    for row in world:
        item = row['item_id']
        rec = by_id.get(item)
        if rec is None:
            failures.append(f'{item}: missing world manifest row')
            continue
        if row['source_path'] != rec['source']['path']:
            failures.append(f'{item}: ledger source path mismatch')
        if row['source_sha256'] != rec['source']['sha256']:
            failures.append(f'{item}: ledger source hash mismatch')
        if row['runtime_path'] != rec['delivery']['path']:
            failures.append(f'{item}: ledger runtime path mismatch')
        if not row['review_evidence'] or 'world-reconciliation.json#CANDIDATE_VERIFIED' not in row['review_evidence']:
            failures.append(f'{item}: current T06 reconciliation evidence missing')
        if not row['candidate_build'].startswith('LOCAL-T06:runtime:'):
            failures.append(f'{item}: current T06 candidate build fingerprint missing')
        if row['production_build'].strip():
            failures.append(f'{item}: production_build must remain blank before P13/P14')
        if rec.get('productionUrlPass') != 'PENDING':
            failures.append(f"{item}: productionUrlPass must remain PENDING, got {rec.get('productionUrlPass')}")
        for rel in (row['source_path'], row['runtime_path']):
            if not (ROOT / rel).is_file():
                failures.append(f'{item}: missing referenced file {rel}')
    if failures:
        fail('; '.join(failures[:30]))

    status_counts = Counter(r['status'] for r in rows)
    result = {
        'status': 'PASS',
        'rows': len(rows),
        'wearableRows': len(wearable),
        'worldRows': len(world),
        'candidateVerified': status_counts['CANDIDATE_VERIFIED'],
        'needsReconcile': status_counts['NEEDS_RECONCILE'],
        'worldProductionUrlPending': sum(rec.get('productionUrlPass') == 'PENDING' for rec in records),
        'worldProductionBuildBlank': sum(not r['production_build'].strip() for r in world),
        'releaseBoundary': 'LOCAL_CANDIDATE_ONLY; P13 user approval required before P14 deployment',
    }
    out = ROOT / '.qa/v64_delivery_ledger_result.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
