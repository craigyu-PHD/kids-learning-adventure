"""Optional room codec only; PNG and formal WebP acceptance remain mandatory."""
import hashlib
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, __version__ as pillow_version


def inspect_room_avif(source, delivery):
    checks = {}
    result = {'status': 'FAIL', 'checks': checks, 'contract': 'v64-room-avif-v1',
              'pillowVersion': pillow_version}
    try:
        a = Image.open(source); a.load()
        b = Image.open(delivery); b.load()
        checks['formats'] = a.format == 'PNG' and b.format == 'AVIF'
        checks['sameDimensions'] = a.size == b.size
        result.update(sourceSha256=hashlib.sha256(Path(source).read_bytes()).hexdigest(),
                      deliverySha256=hashlib.sha256(Path(delivery).read_bytes()).hexdigest(), size=list(a.size))
        if not all(checks.values()):
            return result
        aa = np.array(a.convert('RGBA')); ba = np.array(b.convert('RGBA'))
        checks['opaqueRoom'] = bool((aa[:, :, 3] == 255).all())
        checks['alphaExact'] = bool(np.array_equal(aa[:, :, 3], ba[:, :, 3]))
        visible = (aa[:, :, 3] > 8) | (ba[:, :, 3] > 8)
        checks['nonempty'] = bool(visible.any())
        delta = np.abs(aa[:, :, :3].astype(np.int16) - ba[:, :, :3].astype(np.int16)).max(axis=2)
        changed = float((delta[visible] > 8).mean()) if visible.any() else 1.0
        # Identical full-size color/alpha tolerance to qa_v64_image_pair.py.
        checks['visibleContentStable'] = changed <= .01
        result['changedVisibleRgbRatioGt8'] = changed
        if all(checks.values()):
            result['status'] = 'PASS_OPTIONAL_ROOM_CODEC'
    except Exception as exc:
        result['error'] = type(exc).__name__ + ': ' + str(exc)
    return result


if __name__ == '__main__':
    result = inspect_room_avif(sys.argv[1], sys.argv[2])
    print(json.dumps(result, indent=2))
    sys.exit(0 if result['status'] == 'PASS_OPTIONAL_ROOM_CODEC' else 1)
