"""Compare a compiled static artifact with actual HTTP bytes; no family APIs."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
from urllib.parse import quote, urljoin
from urllib.request import urlopen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', required=True)
    parser.add_argument('--pins', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--workers', type=int, default=4)
    args = parser.parse_args()
    pins = json.loads(args.pins.read_bytes())
    assert 1 <= args.workers <= 8
    assert all(not p.startswith(('/', 'api/')) and '..' not in Path(p).parts for p in pins)

    def check(pair):
        relative, expected = pair
        try:
            with urlopen(urljoin(args.url.rstrip('/')+'/', quote(relative)), timeout=20) as response:
                actual = hashlib.sha256(response.read()).hexdigest()
                return {'path': relative, 'status': response.status,
                        'mime': response.headers.get_content_type(),
                        'sha256': actual, 'expected': expected,
                        'pass': response.status == 200 and actual == expected}
        except Exception as error:
            return {'path': relative, 'pass': False, 'error': str(error)}

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        rows = list(pool.map(check, pins.items()))
    failures = [row for row in rows if not row['pass']]
    result = {'status': 'PASS_HTTP_STATIC_BYTES' if not failures else 'FAIL',
              'url': args.url, 'count': len(rows), 'failures': failures,
              'artifactPinsSHA256': hashlib.sha256(args.pins.read_bytes()).hexdigest(),
              'familyApisRequested': False, 'rows': rows,
              'limits': ['Static bytes only; UI behavior and visual review are separate.']}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({k: result[k] for k in ['status','count','failures']}, ensure_ascii=False))
    return int(bool(failures))


if __name__ == '__main__':
    raise SystemExit(main())
