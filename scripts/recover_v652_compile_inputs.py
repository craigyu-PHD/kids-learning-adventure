"""Recover only absent compile inputs matching the frozen deployed-candidate SHA256.

Existing files are never overwritten. GitHub fallback is the exact recorded commit;
different bytes remain outside runtime for further provenance checks.
"""
import concurrent.futures
import hashlib
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa/v653/20261005/recovery'
PINS = json.loads((OUT / 'frozen-compile-inputs.json').read_text())
TREE = json.loads((OUT / 'github-tree.json').read_text())
COMMIT = '51ff808af4389dbe4f25c88aebb7f87e78aa073b'
BASE = f'https://raw.githubusercontent.com/craigyu-PHD/kids-learning-adventure/{COMMIT}/'

def recover(name):
    target = ROOT / name
    if target.exists():
        return {'path': name, 'status': 'PRESERVED_EXISTING'}
    if name not in TREE:
        return {'path': name, 'status': 'NEEDS_LOCAL_SOURCE'}
    try:
        data = urllib.request.urlopen(BASE + name, timeout=20).read()
        actual = hashlib.sha256(data).hexdigest()
        source = OUT / 'github-exact-commit' / name
        source.parent.mkdir(parents=True, exist_ok=True)
        source.write_bytes(data)
        if actual != PINS[name]:
            return {'path': name, 'status': 'OLDER_BYTES_NOT_RESTORED', 'expected': PINS[name], 'actual': actual}
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open('xb') as handle:
            handle.write(data)
        return {'path': name, 'status': 'RESTORED_EXACT_FROZEN_SHA256', 'sha256': actual}
    except Exception as error:
        return {'path': name, 'status': 'ERROR', 'error': str(error)}

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        rows = list(pool.map(recover, PINS))
    (OUT / 'github-recovery.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2))
    counts = {status: sum(row['status'] == status for row in rows) for status in sorted({row['status'] for row in rows})}
    print(json.dumps(counts, ensure_ascii=False))
