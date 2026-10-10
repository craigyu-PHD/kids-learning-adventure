"""Optional card display codec; never substitutes for PNG or lossless WebP gates."""
import hashlib
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, __version__ as pillow_version


def inspect_card_avif(source, delivery, width):
    checks = {}
    result = {'status': 'FAIL', 'checks': checks, 'contract': 'v64-card-display-avif-v1',
              'resampling': 'Pillow-RGBA-LANCZOS', 'pillowVersion': pillow_version}
    try:
        src = Image.open(source); src.load()
        dst = Image.open(delivery); dst.load()
        checks['formats'] = src.format == 'PNG' and dst.format == 'AVIF'
        checks['singleFrame'] = getattr(dst, 'n_frames', 1) == 1
        checks['knownDisplayWidth'] = type(width) is int and width in (384, 768)
        checks['downscaleOnly'] = 0 < width < src.width
        size = (width, round(src.height * width / src.width))
        checks['explicitDimensions'] = dst.size == size
        checks['alphaChannels'] = 'A' in src.getbands() and 'A' in dst.getbands()
        result.update(sourceSha256=hashlib.sha256(Path(source).read_bytes()).hexdigest(),
                      deliverySha256=hashlib.sha256(Path(delivery).read_bytes()).hexdigest(),
                      sourceSize=list(src.size), size=list(dst.size))
        if not all(checks.values()):
            return result
        expected = np.array(src.convert('RGBA').resize(size, Image.Resampling.LANCZOS))
        actual = np.array(dst.convert('RGBA'))
        checks['resampledAlphaExact'] = bool(np.array_equal(expected[:, :, 3], actual[:, :, 3]))
        checks['realTransparency'] = bool((expected[:, :, 3] == 0).any() and (expected[:, :, 3] > 0).any())
        visible = (expected[:, :, 3] > 8) | (actual[:, :, 3] > 8)
        checks['nonempty'] = bool(visible.any())
        delta = np.abs(expected[:, :, :3].astype(np.int16) - actual[:, :, :3].astype(np.int16)).max(axis=2)
        changed = float((delta[visible] > 8).mean()) if visible.any() else 1.0
        # Same color tolerance as the full PNG/WebP and optional room codec gate.
        # The mandatory lossless display WebP gate still requires exact RGB.
        checks['visibleContentStable'] = changed <= .01
        result['changedVisibleRgbRatioGt8'] = changed
        if all(checks.values()):
            result['status'] = 'PASS_OPTIONAL_CARD_DISPLAY_CODEC'
    except Exception as exc:
        result['error'] = type(exc).__name__ + ': ' + str(exc)
    return result


if __name__ == '__main__':
    result = inspect_card_avif(sys.argv[1], sys.argv[2], int(sys.argv[3]))
    print(json.dumps(result, indent=2))
    sys.exit(0 if result['status'] == 'PASS_OPTIONAL_CARD_DISPLAY_CODEC' else 1)
