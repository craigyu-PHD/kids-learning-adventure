"""Existing native source delivery: transparent padding removal, scale, placement.

Uses the pre-existing alpha-clean source audited by Astra (RGB unchanged,
only original alpha=1 cleanup), never paints or alters hairstyle pixels.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'qa/art-gate/attempts/20260910_051119/worker-a3/hair-nebula/brother/runtime-attempt01/alpha-clean.png'
OUT = ROOT/'qa/v652/nebula-catalog-same-native-r1'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    assert sha(SOURCE) == '7ac9d7f976e506a5386d11ff053d1eb8d63704703b45651698ab510be7aad777'
    OUT.mkdir(exist_ok=False)
    source = Image.open(SOURCE).convert('RGBA')
    bbox = source.getchannel('A').getbbox()
    crop = source.crop(bbox)  # Remove only fully transparent outside padding.
    fitted = crop.copy()
    fitted.thumbnail((480, 480), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (512, 512))
    position = ((512-fitted.width)//2, (512-fitted.height)//2)
    canvas.alpha_composite(fitted, position)
    target = OUT/'hair-nebula.webp'
    canvas.save(target, 'WEBP', lossless=True, exact=True)
    assert Image.open(target).convert('RGBA').tobytes() == canvas.tobytes()
    boards = {}
    for tone, color in [('light', '#eef4ff'), ('dark', '#10182d')]:
        board = Image.new('RGBA', canvas.size, color)
        board.alpha_composite(canvas)
        path = OUT/f'{tone}.png'
        board.convert('RGB').save(path)
        boards[path.name] = sha(path)
    report = {'status':'QA_CATALOG_AWAITING_VISUAL_REVIEW',
              'source':{'path':str(SOURCE.relative_to(ROOT)), 'sha256':sha(SOURCE), 'size':list(source.size)},
              'alphaBoundingBox':list(bbox), 'croppedSize':list(crop.size),
              'scaledSize':list(fitted.size), 'position':list(position),
              'operations':'remove alpha-zero padding; uniform fit; center; lossless exact compression',
              'output':{'path':str(target.relative_to(ROOT)), 'sha256':sha(target)},
              'boards':boards, 'newArt':False, 'promotionAllowed':False}
    (OUT/'report.json').write_text(json.dumps(report, indent=2)+'\n')

if __name__ == '__main__':
    main()
