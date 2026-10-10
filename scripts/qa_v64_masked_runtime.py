"""Freshly reproduce an alpha-only mask and proportional runtime transform."""
from pathlib import Path
import hashlib, json, sys
import numpy as np
from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[1]
evidence_path = root / sys.argv[1]
evidence = json.loads(evidence_path.read_text())
sha = lambda path: hashlib.sha256((root / path).read_bytes()).hexdigest()
for key in ['raw', 'mask']:
    assert sha(evidence[key]['path']) == evidence[key]['sha256'], key
raw = np.array(Image.open(root / evidence['raw']['path']).convert('RGBA'))
mask = np.array(Image.open(root / evidence['mask']['path']).convert('L'))
expected_alpha = (raw[:, :, 3].astype(np.uint16) * mask.astype(np.uint16) // 255).astype(np.uint8)
if 'maskedNative' in evidence:
    assert sha(evidence['maskedNative']['path']) == evidence['maskedNative']['sha256']
    masked = np.array(Image.open(root / evidence['maskedNative']['path']).convert('RGBA'))
    assert np.array_equal(raw[:, :, :3], masked[:, :, :3])
    assert np.array_equal(expected_alpha, masked[:, :, 3])
else:
    masked = raw.copy(); masked[:, :, 3] = expected_alpha
transform = evidence['transform']
resized = Image.fromarray(masked).resize(tuple(transform['roundedSize']), Image.Resampling.LANCZOS)
canvas = Image.new('RGBA', tuple(transform['canvas']))
canvas.alpha_composite(resized, tuple(transform['translation']))
delivery_record = evidence.get('delivery', evidence.get('derived'))
assert delivery_record and sha(delivery_record['path']) == delivery_record['sha256']
delivery = Image.open(root / delivery_record['path']).convert('RGBA')
assert ImageChops.difference(canvas, delivery).getbbox() is None
print(json.dumps({'status': 'PASS', 'evidence': sys.argv[1], 'rgbPreserved': True,
                  'alphaEquationExact': True, 'transformExact': True}))
