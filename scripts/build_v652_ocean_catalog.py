"""Exact native Ocean source, uniform scale/placement and lossless delivery only."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'qa/v652/generated-masters/hat-ocean-complete-v1.png'
OUT = ROOT / 'qa/v652/ocean-catalog-same-source-r1'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    assert digest(SOURCE) == '400c3cdf617b763982417d87a99884c2adefd41a7517dc3a56fff4822397a040'
    OUT.mkdir(exist_ok=False)
    original = Image.open(SOURCE).convert('RGBA')
    scaled = original.copy()
    scaled.thumbnail((480, 480), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (512, 512))
    position = ((512-scaled.width)//2, (512-scaled.height)//2)
    canvas.alpha_composite(scaled, position)
    target = OUT / 'hat-ocean.webp'
    canvas.save(target, 'WEBP', lossless=True, exact=True)
    assert Image.open(target).convert('RGBA').tobytes() == canvas.tobytes()
    boards = {}
    for tone, color in [('light', '#eef4ff'), ('dark', '#10182d')]:
        board = Image.new('RGBA', canvas.size, color)
        board.alpha_composite(canvas)
        path = OUT / f'{tone}.png'
        board.convert('RGB').save(path)
        boards[path.name] = digest(path)
    report = {'status':'QA_CATALOG_AWAITING_VISUAL_REVIEW', 'source':str(SOURCE.relative_to(ROOT)),
              'sourceSha256':digest(SOURCE), 'output':str(target.relative_to(ROOT)),
              'outputSha256':digest(target), 'scaledSize':list(scaled.size), 'position':list(position),
              'operation':'uniform-scale-center-lossless-compression-only',
              'noNewArtOrMask':True, 'promotionAllowed':False, 'boards':boards}
    (OUT/'report.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report))

if __name__ == '__main__': main()
