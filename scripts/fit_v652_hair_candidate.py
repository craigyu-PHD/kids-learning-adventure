"""QA-only uniform master placement with an existing immutable production mask."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops

ROOT=Path(__file__).resolve().parents[1]


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--attempt',required=True)
    p.add_argument('--master',type=Path,required=True)
    p.add_argument('--avatar',choices=['brother','younger','sister','younger-sister'],required=True)
    p.add_argument('--scale',type=float,required=True)
    p.add_argument('--x',type=int,required=True)
    p.add_argument('--y',type=int,required=True)
    p.add_argument('--no-mask',action='store_true',help='Diagnostic only: reveal whether original hair protrudes')
    p.add_argument('--mask',type=Path,help='Existing or built-in-model-generated QA mask, never painted by this script')
    a=p.parse_args()
    if not a.attempt.replace('-','').isalnum() or not 0<a.scale<=2:
        raise ValueError('invalid candidate parameters')
    out=ROOT/'qa/v652/hair-fit'/a.attempt
    out.mkdir(parents=True,exist_ok=False)
    master=a.master.resolve()
    basepath=ROOT/f'public/assets/v5/characters/{a.avatar}/wardrobe/base-body.webp'
    manifest=json.loads((ROOT/'src/data/avatarAssetManifest.json').read_text())
    item=next(i for i in manifest['accessories'] if i['id']=='hair-cloud')
    maskpath=a.mask.resolve() if a.mask else ROOT/item['defaultSkinDetails'][a.avatar]['hairVisibilityMask']
    source=Image.open(master).convert('RGBA')
    scaled=source.resize((round(source.width*a.scale),round(source.height*a.scale)),Image.Resampling.LANCZOS)
    overlay=Image.new('RGBA',(1024,1536))
    overlay.alpha_composite(scaled,(a.x,a.y))
    overlay.save(out/'overlay.webp',lossless=True)
    base=Image.open(basepath).convert('RGBA')
    mask=Image.open(maskpath).convert('L')
    if mask.size != base.size:
        raise ValueError('mask must already match canvas; no implicit mask warp')
    if not a.no_mask:
        base.putalpha(ImageChops.multiply(base.getchannel('A'),mask))
    result=Image.alpha_composite(base,overlay)
    for label,color in [('light','#e9f1ff'),('dark','#18233b')]:
        flat=Image.new('RGBA',result.size,color)
        flat.alpha_composite(result)
        flat.convert('RGB').save(out/f'{label}-full.jpg',quality=95)
        flat.crop((200,0,850,600)).convert('RGB').save(out/f'{label}-head.jpg',quality=95)
    alpha=overlay.getchannel('A')
    edges=[alpha.crop(box).getbbox() is not None for box in [(0,0,1024,1),(0,1535,1024,1536),(0,0,1,1536),(1023,0,1024,1536)]]
    sources={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in [master,basepath,maskpath]}
    report={'status':'CANDIDATE_AWAITING_VISUAL_REVIEW','maskApplied':not a.no_mask,'avatar':a.avatar,'scale':a.scale,'translation':[a.x,a.y],'alphaBBox':alpha.getbbox(),'edgeTouch':edges,'sources':sources,'overlaySha256':hashlib.sha256((out/'overlay.webp').read_bytes()).hexdigest(),'policy':'uniform scale/translation only; existing mask unchanged; no connected alpha edits'}
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'out':str(out),'edgeTouch':edges}))


if __name__=='__main__':
    main()
