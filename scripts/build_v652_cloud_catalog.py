"""Deliver the existing Cloud master as a same-source catalog thumbnail."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'qa/v652/generated-masters/hair-cloud-v2.png'
OUT = ROOT/'qa/v652/cloud-catalog-same-native-r1'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    assert sha(SOURCE) == 'bc4a8922724590f49e0cfbabb3a34ca536eb4699c612259c07b6ec9a48a01815'
    OUT.mkdir(exist_ok=False)
    source = Image.open(SOURCE).convert('RGBA')
    bbox = source.getchannel('A').getbbox()
    fitted = source.crop(bbox)
    fitted.thumbnail((480,480), Image.Resampling.LANCZOS)
    target = Image.new('RGBA',(512,512))
    position = ((512-fitted.width)//2,(512-fitted.height)//2)
    target.alpha_composite(fitted,position)
    output = OUT/'hair-cloud.webp'
    target.save(output,'WEBP',lossless=True,exact=True)
    assert Image.open(output).convert('RGBA').tobytes() == target.tobytes()
    boards = {}
    for tone,color in [('light','#eef4ff'),('dark','#10182d')]:
        board = Image.new('RGBA',target.size,color)
        board.alpha_composite(target)
        path = OUT/f'{tone}.png'
        board.convert('RGB').save(path)
        boards[path.name] = sha(path)
    report = {'status':'QA_CATALOG_AWAITING_VISUAL_REVIEW','newArt':False,'promotionAllowed':False,
        'source':{'path':str(SOURCE.relative_to(ROOT)),'sha256':sha(SOURCE),'size':list(source.size)},
        'alphaBoundingBox':list(bbox),'scaledSize':list(fitted.size),'position':list(position),
        'operations':'remove alpha-zero outside padding; uniform scale; center; lossless exact compression',
        'output':{'path':str(output.relative_to(ROOT)),'sha256':sha(output)},'boards':boards}
    (OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n')

if __name__=='__main__':
    main()
