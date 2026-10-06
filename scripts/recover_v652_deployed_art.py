"""Recover absent assets from the verified unchanged production release by SHA256."""
import concurrent.futures
import hashlib
import json
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa/v653/20261005/recovery'
PINS = json.loads((ROOT / 'qa/v652/root/20260927-css-mask-ready-fix/static-file-sha256.json').read_text())
BASE = 'https://kids-learning-adventure-chi.vercel.app/'

def recover(name):
    target = ROOT / 'public' / name
    if target.exists():
        return {'path': name, 'status': 'PRESERVED_EXISTING'}
    try:
        data = urllib.request.urlopen(BASE + urllib.parse.quote(name), timeout=20).read()
        actual = hashlib.sha256(data).hexdigest()
        if actual != PINS[name]:
            return {'path': name, 'status': 'DIFFERENT_BYTES_NOT_RESTORED', 'actual': actual}
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open('xb') as handle:
            handle.write(data)
        return {'path': name, 'status': 'RESTORED_EXACT_DEPLOYED_SHA256', 'bytes': len(data), 'sha256': actual}
    except Exception as error:
        return {'path': name, 'status': 'ERROR', 'error': str(error)}

if __name__ == '__main__':
    names = [name for name in PINS if name.startswith('assets/v') and '/' in name]
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        rows = list(pool.map(recover, names))
    (OUT / 'deployed-art-recovery.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2))
    print(json.dumps({s: sum(r['status'] == s for r in rows) for s in sorted({r['status'] for r in rows})}))
