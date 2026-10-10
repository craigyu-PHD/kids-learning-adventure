#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / 'qa/v65/art-workpacks/B07/runtime'
OUT = RUNTIME / 'runtime-visual-review-boards'
ITEMS = ('sky-view-glasses','glasses-racer','glasses-star')
AVATARS = ('brother','younger','sister','younger-sister')
MODES = (
    ('390x844-light','390 Light'),
    ('390x844-dark','390 Night'),
    ('1440x900-light','1440 Light'),
    ('1440x900-dark','1440 Night'),
)
SURFACES = (('shop-trial','SHOP TRIAL'),('home','HOME'))


def fit(im: Image.Image, box=(420, 600)) -> Image.Image:
    canvas = Image.new('RGB', box, (245,245,245))
    thumb = ImageOps.contain(im.convert('RGB'), (box[0]-20, box[1]-42))
    x=(box[0]-thumb.width)//2; y=32+(box[1]-32-thumb.height)//2
    canvas.paste(thumb,(x,y))
    return canvas


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    font = ImageFont.load_default()
    made=0
    for item in ITEMS:
        for avatar in AVATARS:
            cap = RUNTIME/item/avatar/'integrated-runtime-capture'
            board = Image.new('RGB',(1800,1320),(225,225,225))
            draw=ImageDraw.Draw(board)
            draw.rectangle((0,0,1800,65), fill=(35,35,35))
            draw.text((18,20), f'V6.5 B07 ACTUAL RUNTIME | {item} | {avatar} | candidate-only QA build', fill='white', font=font)
            for row,(surface,label_surface) in enumerate(SURFACES):
                for col,(prefix,label_mode) in enumerate(MODES):
                    p=cap/f'{prefix}-{surface}.png'
                    if not p.exists():
                        raise SystemExit(f'missing screenshot: {p}')
                    cell=fit(Image.open(p),(440,600))
                    d=ImageDraw.Draw(cell)
                    d.rectangle((0,0,440,30),fill=(15,15,15))
                    d.text((8,9),f'{label_surface} | {label_mode}',fill='white',font=font)
                    board.paste(cell,(col*450+5,80+row*615))
            out=OUT/f'{item}__{avatar}.jpg'
            board.save(out,'JPEG',quality=88,optimize=True)
            made+=1
            print(out.relative_to(ROOT))
    print(f'MADE={made}')

if __name__=='__main__':
    main()
