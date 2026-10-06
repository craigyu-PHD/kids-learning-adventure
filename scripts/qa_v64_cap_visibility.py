"""Measure the specific original-hair mask; does not generate or edit artwork."""
import hashlib
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter


def inspect_visibility(master, runtime_body, mask, avatar="brother"):
    checks = {}
    result = {'status': 'FAIL', 'checks': checks, 'scope': f'{avatar} default-skin original hair only'}
    try:
        if avatar not in ('brother', 'younger'):
            raise ValueError('Avatar has no reviewed cap visibility profile')
        original = Image.open(master); original.load()
        runtime = Image.open(runtime_body); runtime.load()
        matte = Image.open(mask); matte.load()
        checks['formats'] = original.format == 'PNG' and runtime.format == 'WEBP' and matte.format == 'PNG' and matte.mode == 'L'
        checks['dimensions'] = original.size == runtime.size == matte.size == (1024, 1536)
        result['hashes'] = {str(p): hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in [master, runtime_body, mask]}
        if not all(checks.values()):
            return result
        a = np.array(original.convert('RGBA')); b = np.array(runtime.convert('RGBA')); m = np.array(matte)
        checks['runtimeAlphaGeometryExact'] = bool(np.array_equal(a[:, :, 3], b[:, :, 3]))
        yy, xx = np.indices(m.shape)
        hair = (yy < 175) & (xx >= 315) & (xx <= 710) & (a[:, :, 3] > 8) & (a[:, :, 0] < 185) & (a[:, :, 1] < 135) & (a[:, :, 2] < 100)
        if avatar == 'younger':
            # The reviewed younger master has a left crown flyaway at X278-350,
            # above Y225. Preserve the central forehead opening below Y175.
            hair = ((yy < 175) & (xx >= 240) & (xx <= 784) & (a[:, :, 3] > 8)
                    & (a[:, :, 0] < 185) & (a[:, :, 1] < 135) & (a[:, :, 2] < 100))
            hair |= (xx >= 240) & (xx < 350) & (yy < 225) & (a[:, :, 3] > 0)
        protected_y = 230 if avatar == 'younger' else 180
        expected = np.array(Image.fromarray(np.where(hair, 0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(.5)))
        checks['recomputedHairMaskExact'] = bool(np.array_equal(expected, m))
        checks['bodyBelowHeadUntouched'] = not bool(((m < 255) & (yy >= protected_y) & (a[:, :, 3] > 8)).any())
        checks['strongMaskOnlyDeclaredHair'] = not bool(((m < 128) & ~hair).any())
        checks['nonemptyHairMask'] = bool((m < 128).any())
        if all(checks.values()):
            result['status'] = 'PASS_MASK_SCOPE_ONLY'
    except Exception as exc:
        result['error'] = type(exc).__name__ + ': ' + str(exc)
    return result


if __name__ == '__main__':
    result = inspect_visibility(*sys.argv[1:])
    print(json.dumps(result, indent=2))
    sys.exit(0 if result['status'] == 'PASS_MASK_SCOPE_ONLY' else 1)
