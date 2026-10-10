"""QA-only uniform catalog rendition of the same native mage master."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'qa/v652/generated-masters/hat-mage-v2.png'
out = ROOT / 'qa/v652/mage-catalog-same-source-r2'
digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
assert digest(source) == 'fdf7bf653655a0f9205cd7d6d4d155b151edcf94ac5b33d86770085960972d78'
out.mkdir(exist_ok=False)
original = Image.open(source).convert('RGBA')
image = original.copy()
image.thumbnail((480, 480), Image.Resampling.LANCZOS)
canvas = Image.new('RGBA', (512, 512))
position = ((512-image.width)//2, (512-image.height)//2)
canvas.alpha_composite(image, position)
target = out/'hat-mage.webp'
canvas.save(target, 'WEBP', lossless=True, exact=True)
assert Image.open(target).convert('RGBA').tobytes() == canvas.tobytes()
report = {'status': 'QA_CATALOG_AWAITING_VISUAL_REVIEW', 'source': str(source.relative_to(ROOT)),
          'sourceSha256': digest(source), 'output': str(target.relative_to(ROOT)),
          'outputSha256': digest(target), 'canvas': [512,512], 'scaledSize': list(image.size),
          'position': list(position), 'operation': 'uniform-scale-center-lossless-compression-only',
          'nativeAlphaPreservedByResampling': True, 'noNewArtOrMask': True, 'promotionAllowed': False}
(out/'report.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report))
