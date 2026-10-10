"""QA catalog from the exact native Lavender master, no new art or alpha edits."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'qa/v652/generated-masters/sister-lavender-hat-v1.png'
out=ROOT/'qa/v652/lavender-catalog-same-source-r1'
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
assert digest(source)=='20e7c284909d787f426a15d7fef3d29a9298272c5d7aa8ac069b0e6d669d8045'
out.mkdir(exist_ok=False)
original=Image.open(source).convert('RGBA')
scaled=original.copy(); scaled.thumbnail((480,480),Image.Resampling.LANCZOS)
canvas=Image.new('RGBA',(512,512))
position=((512-scaled.width)//2,(512-scaled.height)//2)
canvas.alpha_composite(scaled,position)
target=out/'sister-lavender-hat.webp'
canvas.save(target,'WEBP',lossless=True,exact=True)
assert Image.open(target).convert('RGBA').tobytes()==canvas.tobytes()
for tone,color in [('light','#eef4ff'),('dark','#10182d')]:
    board=Image.new('RGBA',canvas.size,color); board.alpha_composite(canvas)
    board.convert('RGB').save(out/f'{tone}.png')
report={'status':'QA_CATALOG_AWAITING_VISUAL_REVIEW','source':str(source.relative_to(ROOT)),'sourceSha256':digest(source),'output':str(target.relative_to(ROOT)),'outputSha256':digest(target),'scaledSize':list(scaled.size),'position':list(position),'operation':'uniform-scale-center-lossless-compression-only','noNewArtOrMask':True,'promotionAllowed':False}
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
