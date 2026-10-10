"""Read-only exact decoded RGBA comparison; never infer equality from alpha bbox."""
import argparse
import json

import numpy as np
from PIL import Image


def compare_rgba(left, right):
    if left.shape != right.shape:
        return {'rgbaIdentical': False, 'reason': 'shape-mismatch',
                'leftShape': list(left.shape), 'rightShape': list(right.shape)}
    delta = np.abs(left.astype(np.int16) - right.astype(np.int16))
    changed = np.any(delta != 0, axis=2)
    ys, xs = np.nonzero(changed)
    return {'rgbaIdentical': not bool(changed.any()), 'changedPixels': int(changed.sum()),
            'maxChannelDelta': int(delta.max(initial=0)),
            'bbox': [int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1)] if xs.size else None}


def compare_files(left, right):
    with Image.open(left) as a, Image.open(right) as b:
        return compare_rgba(np.asarray(a.convert('RGBA')), np.asarray(b.convert('RGBA')))


def self_test():
    original = np.full((2, 2, 4), 255, dtype=np.uint8)
    assert compare_rgba(original, original)['rgbaIdentical']
    rgb_only = original.copy()
    rgb_only[1, 0, 0] = 0
    result = compare_rgba(original, rgb_only)
    assert not result['rgbaIdentical'] and result['changedPixels'] == 1
    assert result['bbox'] == [0, 1, 1, 2] and result['maxChannelDelta'] == 255
    alpha_only = original.copy()
    alpha_only[0, 1, 3] = 0
    assert not compare_rgba(original, alpha_only)['rgbaIdentical']
    assert not compare_rgba(original, original[:1])['rgbaIdentical']
    return {'status': 'PASS', 'cases': ['identical', 'RGB-diff-with-identical-alpha', 'alpha-only-diff', 'shape-mismatch']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('paths', nargs='*')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        print(json.dumps(self_test()))
    else:
        if len(args.paths) != 2:
            parser.error('two image paths required')
        result = compare_files(*args.paths)
        print(json.dumps(result))
        raise SystemExit(0 if result['rgbaIdentical'] else 1)
