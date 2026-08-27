#!/usr/bin/env python3
"""Generate original V3.0 raster production assets with Pillow.

The generator is deterministic and intentionally does not upscale legacy raster art.
It creates all high-resolution world, character, caregiver, mascot, badge and
vocabulary illustrations used by the V3 runtime.
"""
from __future__ import annotations

import hashlib
import math
import random
import re
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "v30"
CHAR_DIR = OUT / "characters"
BADGE_DIR = OUT / "badges"
VOCAB_DIR = OUT / "vocab"
for directory in (OUT, CHAR_DIR, BADGE_DIR, VOCAB_DIR):
    directory.mkdir(parents=True, exist_ok=True)


def hex_rgb(value: str):
    value = value.lstrip("#")
    return tuple(int(value[i:i+2], 16) for i in (0, 2, 4))


def mix(a, b, t: float):
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))


def gradient(size, top: str, bottom: str) -> Image.Image:
    w, h = size
    a, b = hex_rgb(top), hex_rgb(bottom)
    strip = Image.new("RGB", (1, h))
    strip.putdata([mix(a, b, y / max(1, h - 1)) for y in range(h)])
    return strip.resize((w, h), Image.Resampling.BILINEAR)


def rr(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def ellipse(draw, box, fill, outline=None, width=1):
    draw.ellipse(box, fill=fill, outline=outline, width=width)


def shadow_layer(size, shapes: Callable[[ImageDraw.ImageDraw], None], blur=28, opacity=80):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    shapes(d)
    alpha = layer.getchannel("A").point(lambda p: min(opacity, p))
    layer.putalpha(alpha)
    return layer.filter(ImageFilter.GaussianBlur(blur))


def cloud(draw, x, y, scale=1.0, fill=(255, 255, 255, 225)):
    r = 52 * scale
    ellipse(draw, (x, y, x + r * 1.6, y + r), fill)
    ellipse(draw, (x + r * .5, y - r * .35, x + r * 1.55, y + r * .7), fill)
    ellipse(draw, (x + r * 1.05, y + r * .05, x + r * 2.1, y + r), fill)


def hill(draw, points, fill):
    draw.polygon(points, fill=fill)


def tree(draw, x, y, s=1.0, foliage=(71, 169, 102), trunk=(126, 86, 54)):
    rr(draw, (x - 13*s, y, x + 13*s, y + 90*s), 8*s, trunk)
    for dx, dy, r in [(-35, -20, 48), (5, -35, 58), (42, -10, 45)]:
        ellipse(draw, (x + (dx-r)*s, y + (dy-r)*s, x + (dx+r)*s, y + (dy+r)*s), foliage)


def house(draw, x, y, s=1.0, wall=(255, 232, 185), roof=(255, 126, 114)):
    rr(draw, (x, y, x + 180*s, y + 145*s), 22*s, wall)
    draw.polygon([(x-14*s, y+20*s), (x+90*s, y-70*s), (x+194*s, y+20*s)], fill=roof)
    rr(draw, (x+70*s, y+72*s, x+112*s, y+145*s), 12*s, (151, 100, 72))
    rr(draw, (x+22*s, y+48*s, x+58*s, y+88*s), 10*s, (118, 211, 245))
    rr(draw, (x+126*s, y+48*s, x+162*s, y+88*s), 10*s, (118, 211, 245))


def flower(draw, x, y, s=1.0, petal=(255, 126, 114), center=(255, 211, 90)):
    draw.line((x, y, x, y+70*s), fill=(70, 170, 100), width=max(2, int(8*s)))
    for ang in range(0, 360, 72):
        dx = math.cos(math.radians(ang))*25*s
        dy = math.sin(math.radians(ang))*25*s
        ellipse(draw, (x+dx-17*s, y+dy-17*s, x+dx+17*s, y+dy+17*s), petal)
    ellipse(draw, (x-15*s, y-15*s, x+15*s, y+15*s), center)


def star_points(cx, cy, r1, r2, n=5):
    pts=[]
    for i in range(n*2):
        r = r1 if i % 2 == 0 else r2
        a = -math.pi/2 + i*math.pi/n
        pts.append((cx+math.cos(a)*r, cy+math.sin(a)*r))
    return pts


def world_scene(name: str, palette: tuple[str,str,str,str], props: str, filename: str):
    W,H=1920,1080
    image=gradient((W,H), palette[0], palette[1]).convert("RGBA")
    d=ImageDraw.Draw(image)
    # sky light
    ellipse(d,(1460,90,1640,270),(255,236,153,220))
    cloud(d,180,160,1.25); cloud(d,980,120,.95); cloud(d,1390,280,.75)
    # layered landscape
    hill(d,[(0,610),(250,420),(530,600),(810,350),(1120,590),(1460,400),(1920,620),(1920,1080),(0,1080)], hex_rgb(palette[2])+(255,))
    hill(d,[(0,720),(250,610),(560,740),(920,560),(1260,740),(1600,600),(1920,720),(1920,1080),(0,1080)], hex_rgb(palette[3])+(255,))
    # path
    d.polygon([(760,1080),(930,660),(1040,660),(1240,1080)], fill=(244,217,166,255))
    # thematic foreground
    if props == 'town':
        house(d,220,560,1.15); house(d,1390,575,.9,wall=(242,225,255),roof=(108,99,232))
        tree(d,105,590,1.0); tree(d,1720,610,.95)
    elif props == 'garden':
        for i,c in enumerate([(255,126,114),(108,99,232),(99,199,245),(88,210,160),(255,162,74),(255,211,90)]):
            flower(d,210+i*275,720+(i%2)*70,1.15,c)
        house(d,1350,545,.85,wall=(245,242,255),roof=(108,99,232))
    elif props == 'forest':
        for x,s in [(120,1.25),(360,.9),(1480,1.15),(1740,1.35)]: tree(d,x,600,s,foliage=(56,160,96))
        # friendly animal silhouettes
        ellipse(d,(760,650,900,780),(230,160,91,255)); ellipse(d,(782,610,850,680),(230,160,91,255))
        d.polygon([(790,625),(804,585),(820,630)],fill=(230,160,91,255)); d.polygon([(830,630),(850,587),(856,640)],fill=(230,160,91,255))
    elif props == 'family':
        house(d,160,540,1.2,wall=(255,235,210),roof=(255,126,114)); house(d,1450,565,.95,wall=(233,248,240),roof=(88,210,160))
        # three friendly figures, no facial detail at environment scale
        for x,h,c in [(785,150,(99,199,245,255)),(900,185,(255,126,114,255)),(1020,135,(255,211,90,255))]:
            ellipse(d,(x-38,650-h,x+38,726-h),(248,199,166,255)); rr(d,(x-48,720-h,x+48,850-h),40,c)
    elif props == 'mountain':
        d.polygon([(280,720),(680,270),(1040,720)],fill=(116,143,187,255)); d.polygon([(620,720),(1110,210),(1610,720)],fill=(94,127,174,255))
        d.polygon([(570,390),(680,270),(790,395)],fill=(250,250,255,255)); d.polygon([(960,360),(1110,210),(1260,365)],fill=(250,250,255,255))
        for i in range(6): ellipse(d,(790+i*90,760-i*18,850+i*90,820-i*18),(255,211,90,255))
    elif props == 'market':
        for x,c in [(220,(255,126,114)),(690,(255,211,90)),(1210,(88,210,160))]:
            rr(d,(x,585,x+350,810),30,(255,245,225,255)); d.polygon([(x-25,600),(x+50,520),(x+300,520),(x+375,600)],fill=c+(255,))
            for j,fc in enumerate([(230,72,72),(252,178,60),(100,184,90)]): ellipse(d,(x+70+j*80,675,x+125+j*80,730),fc+(255,))
    elif props == 'ocean':
        d.rectangle((0,600,W,H),fill=(62,178,225,255));
        for y in range(650,1030,90):
            for x in range(-60,W,180): d.arc((x,y,x+160,y+70),180,340,fill=(210,246,255,230),width=9)
        # island / boat / fish
        ellipse(d,(1220,620,1660,820),(246,210,133,255)); tree(d,1430,560,.7,foliage=(63,174,106))
        d.polygon([(680,650),(920,650),(820,730)],fill=(169,94,57,255)); d.polygon([(800,470),(800,650),(930,650)],fill=(255,255,245,255))
        ellipse(d,(360,790,500,860),(255,162,74,255)); d.polygon([(350,825),(300,790),(300,860)],fill=(255,162,74,255))
    elif props == 'dino':
        # volcano and prehistoric foliage
        d.polygon([(530,760),(870,290),(1190,760)],fill=(111,105,91,255)); d.polygon([(785,410),(870,290),(955,420)],fill=(218,103,67,255))
        for x in [100,250,1500,1720]: tree(d,x,610,1.1,foliage=(59,157,88))
        # simple long-tail dinosaur silhouette
        ellipse(d,(860,680,1130,840),(77,159,94,255)); ellipse(d,(1050,615,1165,725),(77,159,94,255));
        d.polygon([(880,760),(690,820),(880,800)],fill=(77,159,94,255)); d.polygon([(960,820),(900,930),(1010,835)],fill=(77,159,94,255))
    elif props == 'space':
        # redraw sky as night gradient
        image=gradient((W,H),'#20254E','#373B73').convert('RGBA'); d=ImageDraw.Draw(image)
        for i in range(120):
            x=(i*157)%W; y=(i*83)%620; r=2+(i%3); ellipse(d,(x-r,y-r,x+r,y+r),(255,255,255,180))
        ellipse(d,(1450,100,1660,310),(255,218,116,255)); ellipse(d,(230,190,370,330),(105,210,226,255))
        # planet ground / station
        ellipse(d,(-260,620,2180,1460),(87,112,169,255)); rr(d,(740,560,1190,820),60,(235,240,255,255));
        ellipse(d,(835,635,925,725),(99,199,245,255)); ellipse(d,(1000,635,1090,725),(108,99,232,255))
        d.polygon([(930,560),(965,390),(1000,560)],fill=(255,211,90,255))
    # soft foreground vignette
    overlay=Image.new('RGBA',(W,H),(0,0,0,0)); od=ImageDraw.Draw(overlay); od.rectangle((0,H-120,W,H),fill=(30,55,70,20)); image=Image.alpha_composite(image,overlay)
    image.convert('RGB').save(OUT/filename,'WEBP',quality=90,method=3)


def draw_character(avatar_id: str, stage: int, color: tuple[int,int,int], hair: tuple[int,int,int], filename: str):
    S=1024
    im=Image.new('RGBA',(S,S),(0,0,0,0))
    # ambient shadow
    shadow=Image.new('RGBA',(S,S),(0,0,0,0)); sd=ImageDraw.Draw(shadow); ellipse(sd,(280,850,760,960),(20,30,50,100)); shadow=shadow.filter(ImageFilter.GaussianBlur(26)); im=Image.alpha_composite(im,shadow)
    d=ImageDraw.Draw(im)
    skin=(248,197,160,255); dark=tuple(max(0,c-45) for c in color)+(255,); light=tuple(min(255,c+45) for c in color)+(255,)
    # legs / shoes
    rr(d,(410,700,490,880),34,(75,92,125,255)); rr(d,(535,700,615,880),34,(75,92,125,255))
    rr(d,(365,845,500,920),35,(92,65,51,255)); rr(d,(525,845,660,920),35,(92,65,51,255))
    # backpack behind body
    rr(d,(325,400,450,670),55,dark)
    # torso
    rr(d,(370,400,650,720),95,color+(255,))
    rr(d,(410,430,610,680),65,light)
    # stage vest / belt
    if stage>=2:
        rr(d,(370,500,650,570),26,dark); ellipse(d,(492,510,528,546),(255,211,90,255))
    # arms
    rr(d,(300,440,400,665),45,color+(255,)); rr(d,(625,440,725,665),45,color+(255,))
    ellipse(d,(300,620,390,710),skin); ellipse(d,(635,620,725,710),skin)
    # neck and head
    rr(d,(475,350,550,430),25,skin)
    ellipse(d,(320,110,705,465),skin)
    # ears
    ellipse(d,(300,245,360,330),skin); ellipse(d,(665,245,725,330),skin)
    # hair cap and locks
    ellipse(d,(330,80,700,295),hair+(255,)); ellipse(d,(350,145,680,430),skin)
    for x,y,r in [(380,120,72),(470,90,85),(570,105,82),(640,145,68)]: ellipse(d,(x-r,y-r,x+r,y+r),hair+(255,))
    # eyes
    for x in (435,585):
        ellipse(d,(x-34,245,x+34,325),(255,255,255,255)); ellipse(d,(x-15,265,x+15,310),(42,52,68,255)); ellipse(d,(x-6,270,x+4,284),(255,255,255,255))
    # nose, mouth, cheeks
    ellipse(d,(500,310,525,332),(225,145,123,210)); d.arc((455,315,570,395),15,165,fill=(120,65,60,255),width=9)
    ellipse(d,(385,330,425,355),(255,145,140,80)); ellipse(d,(600,330,640,355),(255,145,140,80))
    # hat & badge from stage 2
    if stage>=2:
        rr(d,(330,90,700,155),35,dark); ellipse(d,(390,20,645,185),color+(255,)); ellipse(d,(470,75,555,145),(255,211,90,255))
    # explorer tool / star effects
    if stage>=3:
        rr(d,(690,520,740,735),20,(166,113,70,255)); ellipse(d,(672,485,758,570),(99,199,245,255))
        for cx,cy in [(300,250),(760,360),(285,590)]: d.polygon(star_points(cx,cy,28,13),fill=(255,211,90,220))
    if stage>=4:
        # cape behind one side and compass pouch
        d.polygon([(360,470),(250,540),(290,820),(415,670)],fill=(255,126,114,220)); rr(d,(600,580,690,690),24,(255,211,90,255))
    if stage>=5:
        # legendary crown + radiant sparks
        d.polygon([(420,55),(460,0),(510,55),(560,0),(605,55),(640,5),(665,100),(405,100)],fill=(255,211,90,255));
        for i in range(10):
            a=i*math.pi/5; cx=510+math.cos(a)*360; cy=430+math.sin(a)*350; d.polygon(star_points(cx,cy,24,10),fill=(255,211,90,210))
    # highlights
    ellipse(d,(400,165,465,220),(255,255,255,30)); rr(d,(420,440,475,590),25,(255,255,255,25))
    im.save(CHAR_DIR/filename,'WEBP',quality=92,method=3)


def draw_caregiver(kind: str, color: tuple[int,int,int], hair: tuple[int,int,int], filename: str):
    S=1024; im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im); skin=(246,193,158,255)
    shadow=Image.new('RGBA',(S,S),(0,0,0,0)); sd=ImageDraw.Draw(shadow); ellipse(sd,(220,805,805,965),(20,30,50,90)); im=Image.alpha_composite(im,shadow.filter(ImageFilter.GaussianBlur(28))); d=ImageDraw.Draw(im)
    rr(d,(285,480,740,930),150,color+(255,)); rr(d,(430,400,590,540),55,skin)
    ellipse(d,(310,105,715,520),skin); ellipse(d,(300,245,360,335),skin); ellipse(d,(665,245,725,335),skin)
    # hair adapted by role
    ellipse(d,(320,65,705,300),hair+(255,)); ellipse(d,(342,135,685,500),skin)
    if kind=='mother':
        ellipse(d,(270,150,400,620),hair+(255,)); ellipse(d,(620,150,750,620),hair+(255,))
    else:
        for x,y,r in [(360,105,72),(455,75,82),(550,85,82),(630,120,68)]: ellipse(d,(x-r,y-r,x+r,y+r),hair+(255,))
    for x in (430,585):
        ellipse(d,(x-34,255,x+34,330),(255,255,255,255)); ellipse(d,(x-14,274,x+14,316),(48,55,66,255)); ellipse(d,(x-5,278,x+4,292),(255,255,255,255))
    d.arc((460,325,560,400),20,160,fill=(120,65,60,255),width=9)
    if kind=='caregiver':
        # friendly glasses
        d.rounded_rectangle((382,240,478,335),25,outline=(55,70,95,255),width=10); d.rounded_rectangle((538,240,634,335),25,outline=(55,70,95,255),width=10); d.line((478,285,538,285),fill=(55,70,95,255),width=10)
    rr(d,(365,560,660,630),25,tuple(max(0,c-35) for c in color)+(255,));
    im.save(CHAR_DIR/filename,'WEBP',quality=92,method=3)


def draw_mascot():
    S=1024; im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    shadow=Image.new('RGBA',(S,S),(0,0,0,0)); sd=ImageDraw.Draw(shadow); ellipse(sd,(240,790,790,930),(20,30,50,90)); im=Image.alpha_composite(im,shadow.filter(ImageFilter.GaussianBlur(28))); d=ImageDraw.Draw(im)
    orange=(233,151,74,255); cream=(255,238,205,255); dark=(64,54,52,255)
    ellipse(d,(310,260,720,720),orange); ellipse(d,(390,390,650,680),cream)
    d.polygon([(345,330),(260,120),(445,270)],fill=orange); d.polygon([(685,330),(770,120),(585,270)],fill=orange)
    d.polygon([(340,285),(300,175),(400,275)],fill=(246,193,158,255)); d.polygon([(690,285),(730,175),(630,275)],fill=(246,193,158,255))
    for x in (430,600): ellipse(d,(x-38,390,x+38,480),(255,255,255,255)); ellipse(d,(x-15,410,x+15,460),dark); ellipse(d,(x-6,415,x+4,430),(255,255,255,255))
    ellipse(d,(493,505,547,552),dark); d.arc((450,520,585,620),20,160,fill=(120,65,60,255),width=10)
    rr(d,(355,650,675,760),48,(108,99,232,255)); ellipse(d,(490,670,540,720),(255,211,90,255))
    # paws
    ellipse(d,(300,650,425,790),cream); ellipse(d,(600,650,725,790),cream)
    # goggles as playful signature
    d.rounded_rectangle((370,255,485,345),30,outline=(99,199,245,255),width=14); d.rounded_rectangle((545,255,660,345),30,outline=(99,199,245,255),width=14); d.line((485,300,545,300),fill=(99,199,245,255),width=14)
    im.save(CHAR_DIR/'mascot-helper.webp','WEBP',quality=92,method=3)


def badge_symbol(draw, badge_id: str, cx=256, cy=250):
    gold=(255,211,90,255); ink=(255,255,255,255); blue=(99,199,245,255); purple=(108,99,232,255); mint=(88,210,160,255); coral=(255,126,114,255)
    if badge_id.startswith('streak-'):
        # flame
        draw.polygon([(cx,cy+90),(cx-65,cy+15),(cx-15,cy-95),(cx+5,cy-25),(cx+55,cy-110),(cx+75,cy+5)],fill=coral); ellipse(draw,(cx-35,cy-5,cx+35,cy+80),gold)
    elif badge_id.startswith('speaking-'):
        rr(draw,(cx-95,cy-70,cx+95,cy+55),45,purple); draw.polygon([(cx-20,cy+45),(cx+15,cy+105),(cx+45,cy+45)],fill=purple); ellipse(draw,(cx-12,cy-25,cx+12,cy-1),ink); ellipse(draw,(cx-52,cy-25,cx-28,cy-1),ink); ellipse(draw,(cx+28,cy-25,cx+52,cy-1),ink)
    elif badge_id.startswith('listening-'):
        draw.arc((cx-110,cy-100,cx+110,cy+120),185,355,fill=blue,width=34); rr(draw,(cx-115,cy-15,cx-70,cy+85),20,blue); rr(draw,(cx+70,cy-15,cx+115,cy+85),20,blue); d2=[(cx,cy+70),(cx+45,cy+30),(cx+15,cy+15),(cx+15,cy-70),(cx-12,cy-70),(cx-12,cy+25),(cx-42,cy+40)]; draw.polygon(d2,fill=gold)
    elif badge_id.startswith('learning-'):
        rr(draw,(cx-115,cy-80,cx-5,cy+95),20,blue); rr(draw,(cx+5,cy-80,cx+115,cy+95),20,mint); draw.line((cx,cy-70,cx,cy+90),fill=ink,width=12); draw.line((cx-65,cy-10,cx-20,cy+30),fill=ink,width=14); draw.line((cx-20,cy+30,cx+75,cy-45),fill=ink,width=14)
    elif badge_id.startswith('adventure-'):
        if 'forest' in badge_id:
            draw.polygon([(cx,cy-115),(cx-100,cy+50),(cx+100,cy+50)],fill=mint); rr(draw,(cx-18,cy+40,cx+18,cy+120),8,(140,93,59,255))
        elif 'ocean' in badge_id:
            for off in [-50,10,70]: draw.arc((cx-120,cy+off-35,cx,cy+off+35),180,350,fill=blue,width=18); draw.arc((cx,cy+off-35,cx+120,cy+off+35),180,350,fill=blue,width=18)
        elif 'space' in badge_id:
            ellipse(draw,(cx-90,cy-90,cx+90,cy+90),purple); draw.ellipse((cx-145,cy-35,cx+145,cy+35),outline=gold,width=20)
        else:
            ellipse(draw,(cx-90,cy-90,cx+90,cy+90),purple); draw.polygon(star_points(cx,cy,75,32),fill=gold)
    else:
        if 'early' in badge_id:
            ellipse(draw,(cx-80,cy-80,cx+80,cy+80),gold); [draw.line((cx,cy,cx+math.cos(a)*130,cy+math.sin(a)*130),fill=gold,width=18) for a in [i*math.pi/4 for i in range(8)]]
        elif 'comeback' in badge_id:
            draw.arc((cx-120,cy-120,cx+120,cy+120),30,330,fill=mint,width=30); draw.polygon([(cx-120,cy-10),(cx-155,cy-85),(cx-65,cy-70)],fill=mint)
        elif 'super' in badge_id:
            draw.polygon([(cx-120,cy-75),(cx-55,cy-80),(cx,cy-145),(cx+55,cy-80),(cx+120,cy-75),(cx+80,cy+100),(cx-80,cy+100)],fill=gold); d=draw; d.polygon(star_points(cx,cy,62,25),fill=purple)
        else:
            draw.polygon(star_points(cx,cy,115,48),fill=gold); draw.polygon(star_points(cx,cy,65,28),fill=purple)


def draw_badge(badge_id: str, category: str, rare: bool):
    S=512; im=Image.new('RGBA',(S,S),(0,0,0,0));
    if rare:
        glow=Image.new('RGBA',(S,S),(0,0,0,0)); gd=ImageDraw.Draw(glow); ellipse(gd,(45,45,467,467),(255,211,90,110)); im=Image.alpha_composite(im,glow.filter(ImageFilter.GaussianBlur(28)))
    d=ImageDraw.Draw(im)
    category_colors={'streak':(255,126,114,255),'speaking':(108,99,232,255),'listening':(99,199,245,255),'learning':(88,210,160,255),'adventure':(255,162,74,255),'special':(157,145,255,255)}
    c=category_colors[category]
    ellipse(d,(52,52,460,460),(255,211,90,255)); ellipse(d,(78,78,434,434),(255,247,218,255)); ellipse(d,(98,98,414,414),c)
    # top highlight / bottom shade
    ellipse(d,(125,112,390,240),(255,255,255,35)); d.arc((90,90,422,422),20,160,fill=(255,255,255,120),width=12)
    badge_symbol(d,badge_id)
    im.save(BADGE_DIR/f'{badge_id}.webp','WEBP',quality=94,method=3)


def slug_word(word: str):
    clean=word.lower().strip().replace('?', '').replace('!', '')
    clean=re.sub(r'[^a-z0-9]+','-',clean).strip('-')
    if not clean:
        clean='zh-audio'
    return clean


def vocab_bg(word: str):
    digest=hashlib.sha1(word.encode()).digest()
    palettes=[('#F7F8FF','#EAF8FF'),('#FFF8E6','#FFFDF6'),('#F4EEFF','#FBF9FF'),('#ECFBF4','#F8FFFC'),('#FFF0EE','#FFF9F8')]
    return palettes[digest[0]%len(palettes)]


def draw_face_icon(d,cx,cy,emotion='happy'):
    ellipse(d,(cx-105,cy-105,cx+105,cy+105),(255,218,177,255));
    for x in (cx-42,cx+42): ellipse(d,(x-14,cy-25,x+14,cy+10),(50,58,70,255))
    if emotion=='sad': d.arc((cx-55,cy+35,cx+55,cy+100),200,340,fill=(120,70,65,255),width=9)
    elif emotion=='angry':
        d.line((cx-70,cy-55,cx-25,cy-35),fill=(80,60,60,255),width=10); d.line((cx+25,cy-35,cx+70,cy-55),fill=(80,60,60,255),width=10); d.arc((cx-55,cy+35,cx+55,cy+100),200,340,fill=(120,70,65,255),width=9)
    elif emotion=='tired': d.line((cx-70,cy-10,cx-20,cy-10),fill=(50,58,70,255),width=9); d.line((cx+20,cy-10,cx+70,cy-10),fill=(50,58,70,255),width=9); d.arc((cx-45,cy+35,cx+45,cy+85),20,160,fill=(120,70,65,255),width=9)
    else: d.arc((cx-55,cy+20,cx+55,cy+95),10,170,fill=(120,70,65,255),width=9)


def draw_animal(d, kind, cx=320, cy=230, s=1.0):
    tan=(225,157,92,255); dark=(64,55,54,255); cream=(255,239,210,255)
    if kind in {'fish','shark'}:
        c=(99,199,245,255) if kind=='fish' else (85,125,170,255); ellipse(d,(cx-120,cy-60,cx+95,cy+65),c); d.polygon([(cx-125,cy),(cx-210,cy-75),(cx-210,cy+75)],fill=c); ellipse(d,(cx+45,cy-25,cx+65,cy-5),dark); return
    if kind=='bird' or kind=='duck':
        c=(255,211,90,255) if kind=='duck' else (99,199,245,255); ellipse(d,(cx-80,cy-75,cx+85,cy+75),c); ellipse(d,(cx+30,cy-125,cx+115,cy-40),c); d.polygon([(cx+105,cy-92),(cx+160,cy-70),(cx+108,cy-52)],fill=(255,162,74,255)); d.polygon([(cx-80,cy),(cx-145,cy-55),(cx-130,cy+45)],fill=c); return
    if kind=='insect':
        ellipse(d,(cx-25,cy-90,cx+25,cy+90),(64,55,54,255)); ellipse(d,(cx-110,cy-75,cx-5,cy+20),(255,211,90,190)); ellipse(d,(cx+5,cy-75,cx+110,cy+20),(99,199,245,190)); return
    body=tan
    if kind=='pig': body=(255,174,180,255)
    if kind=='lion': body=(222,153,73,255)
    ellipse(d,(cx-115,cy-65,cx+115,cy+110),body); ellipse(d,(cx-90,cy-160,cx+90,cy+20),body)
    if kind in {'cat','lion'}:
        d.polygon([(cx-80,cy-115),(cx-65,cy-205),(cx-20,cy-135)],fill=body); d.polygon([(cx+80,cy-115),(cx+65,cy-205),(cx+20,cy-135)],fill=body)
    elif kind=='cow':
        d.polygon([(cx-70,cy-140),(cx-115,cy-195),(cx-110,cy-125)],fill=(120,90,70,255)); d.polygon([(cx+70,cy-140),(cx+115,cy-195),(cx+110,cy-125)],fill=(120,90,70,255)); ellipse(d,(cx-75,cy-120,cx-25,cy-65),(55,55,55,255)); ellipse(d,(cx+25,cy-70,cx+75,cy-20),(55,55,55,255))
    else:
        ellipse(d,(cx-105,cy-155,cx-40,cy-65),body); ellipse(d,(cx+40,cy-155,cx+105,cy-65),body)
    if kind=='lion': ellipse(d,(cx-130,cy-205,cx+130,cy+55),(174,101,52,255)); ellipse(d,(cx-90,cy-160,cx+90,cy+20),body)
    if kind=='pig': ellipse(d,(cx-40,cy-80,cx+40,cy-25),(240,125,140,255))
    for x in (cx-35,cx+35): ellipse(d,(x-10,cy-85,x+10,cy-65),dark)
    ellipse(d,(cx-12,cy-45,cx+12,cy-25),dark)
    rr(d,(cx-80,cy+70,cx-25,cy+155),24,body); rr(d,(cx+25,cy+70,cx+80,cy+155),24,body)


def draw_food(d, kind, cx=320, cy=235):
    if kind=='apple': ellipse(d,(cx-100,cy-85,cx+100,cy+120),(233,76,76,255)); rr(d,(cx-12,cy-135,cx+12,cy-70),8,(103,75,48,255)); ellipse(d,(cx+5,cy-135,cx+85,cy-80),(88,190,110,255))
    elif kind=='banana':
        d.arc((cx-150,cy-110,cx+150,cy+130),5,165,fill=(255,211,90,255),width=62); d.arc((cx-135,cy-90,cx+135,cy+105),5,165,fill=(255,247,200,255),width=18)
    elif kind=='grape':
        for r,cx2,cy2 in [(36,cx-55,cy-45),(36,cx,cy-65),(36,cx+55,cy-45),(36,cx-28,cy+5),(36,cx+28,cy+5),(36,cx,cy+55)]: ellipse(d,(cx2-r,cy2-r,cx2+r,cy2+r),(126,90,196,255))
    elif kind=='strawberry':
        d.polygon([(cx,cy+125),(cx-110,cy-40),(cx+110,cy-40)],fill=(239,78,88,255));
        for a in [-60,0,60]: d.polygon([(cx+a,cy-40),(cx+a-35,cy-100),(cx+a+25,cy-82)],fill=(88,190,110,255))
    elif kind=='broccoli':
        rr(d,(cx-35,cy,cx+35,cy+140),20,(88,170,92,255));
        for x,y,r in [(cx-70,cy-30,58),(cx,cy-65,70),(cx+70,cy-25,58)]: ellipse(d,(x-r,y-r,x+r,y+r),(60,145,75,255))
    elif kind=='pizza':
        d.polygon([(cx,cy-130),(cx-150,cy+120),(cx+150,cy+120)],fill=(255,211,90,255)); d.line((cx-150,cy+120,cx+150,cy+120),fill=(180,112,62,255),width=32); [ellipse(d,(cx+x-18,cy+y-18,cx+x+18,cy+y+18),(225,76,70,255)) for x,y in [(-60,30),(55,40),(0,85)]]
    elif kind=='juice': rr(d,(cx-90,cy-100,cx+90,cy+130),24,(255,172,67,255)); d.line((cx+20,cy-105,cx+80,cy-175),fill=(99,199,245,255),width=14)
    elif kind=='ice cream': d.polygon([(cx-85,cy+5),(cx+85,cy+5),(cx,cy+160)],fill=(221,162,96,255)); ellipse(d,(cx-90,cy-120,cx+90,cy+55),(255,180,198,255))
    elif kind=='soup': rr(d,(cx-140,cy,cx+140,cy+100),42,(255,126,114,255)); ellipse(d,(cx-140,cy-35,cx+140,cy+55),(255,232,178,255));


def draw_vocab(word: str):
    W,H=640,480; top,bottom=vocab_bg(word); im=gradient((W,H),top,bottom).convert('RGBA'); d=ImageDraw.Draw(im)
    key=word.lower().strip(); key=re.sub(r'\s+[\u4e00-\u9fff]+$','',key)
    # floor shadow
    ellipse(d,(185,365,455,415),(75,95,120,24))
    colors={'red':(240,86,86,255),'yellow':(255,211,90,255),'green':(88,210,160,255),'blue':(99,199,245,255),'orange':(255,162,74,255),'purple':(108,99,232,255),'pink':(255,155,184,255)}
    if key in colors:
        ellipse(d,(210,105,430,325),colors[key]); ellipse(d,(250,125,315,185),(255,255,255,55))
    elif key in {'circle','square','triangle'}:
        c=(108,99,232,255)
        if key=='circle': ellipse(d,(210,100,430,320),c)
        elif key=='square': rr(d,(210,100,430,320),32,c)
        else: d.polygon([(320,85),(190,330),(450,330)],fill=c)
    elif key in {'happy','sad','angry','tired'}: draw_face_icon(d,320,220,key)
    elif key in {'dog','cat','bird','fish','cow','pig','duck','lion','shark','insect'}: draw_animal(d,key)
    elif key in {'apple','banana','grape','strawberry','broccoli','pizza','juice','ice cream','soup'}: draw_food(d,key)
    elif key in {'one','two','three','four','five','six','seven','eight','nine','ten'}:
        n=['one','two','three','four','five','six','seven','eight','nine','ten'].index(key)+1
        for i in range(n):
            row=i//5; col=i%5; ellipse(d,(175+col*70,135+row*95,225+col*70,185+row*95),(108,99,232,255))
    elif key in {'sun','sunny','hot'}:
        ellipse(d,(230,120,410,300),(255,211,90,255));
        for i in range(8): a=i*math.pi/4; d.line((320+math.cos(a)*105,210+math.sin(a)*105,320+math.cos(a)*150,210+math.sin(a)*150),fill=(255,190,55,255),width=13)
    elif key in {'moon','star','sky','space'}:
        im=gradient((W,H),'#28315F','#6570A8').convert('RGBA'); d=ImageDraw.Draw(im); ellipse(d,(235,105,405,275),(255,228,145,255)); ellipse(d,(290,80,430,240),(61,71,120,255)); [ellipse(d,((i*97)%W,50+(i*61)%300,(i*97)%W+5,55+(i*61)%300),(255,255,255,190)) for i in range(20)]
    elif key in {'rainy','cloudy','cold','weather'}:
        cloud(d,225,120,1.25,fill=(210,225,240,255));
        if key=='rainy':
            for x in range(250,430,45): d.line((x,245,x-15,310),fill=(99,199,245,255),width=10)
        if key=='cold':
            for a in [0,math.pi/3,2*math.pi/3]: d.line((320-math.cos(a)*80,300-math.sin(a)*80,320+math.cos(a)*80,300+math.sin(a)*80),fill=(99,199,245,255),width=9)
    elif key in {'tree','flower','water','mountain'}:
        if key=='tree': tree(d,320,160,1.25)
        elif key=='flower': flower(d,320,180,1.8)
        elif key=='water':
            for y in [170,230,290]: d.arc((150,y,330,y+80),180,350,fill=(99,199,245,255),width=18); d.arc((310,y,490,y+80),180,350,fill=(99,199,245,255),width=18)
        else: d.polygon([(150,330),(320,90),(500,330)],fill=(100,135,180,255)); d.polygon([(255,180),(320,90),(385,180)],fill=(255,255,255,255))
    elif key in {'shirt','pants','shoes','hat','jacket','clothes'}:
        if key in {'shirt','jacket','clothes'}: d.polygon([(220,125),(285,95),(355,95),(420,125),(390,210),(365,190),(365,340),(275,340),(275,190),(250,210)],fill=(108,99,232,255))
        elif key=='pants': d.polygon([(235,110),(405,110),(385,340),(325,340),(320,220),(315,340),(255,340)],fill=(75,92,125,255))
        elif key=='shoes': rr(d,(170,230,310,315),40,(99,199,245,255)); rr(d,(330,230,470,315),40,(99,199,245,255))
        else: ellipse(d,(215,135,425,295),(255,162,74,255)); rr(d,(175,245,465,290),28,(255,162,74,255))
    elif key in {'car','bus','train','bike','transport'}:
        if key=='bike':
            ellipse(d,(160,220,270,330),(0,0,0,0),outline=(75,92,125,255),width=12); ellipse(d,(370,220,480,330),(0,0,0,0),outline=(75,92,125,255),width=12); d.line((215,275,325,180,425,275,290,275,215,275),fill=(108,99,232,255),width=12)
        else:
            c=(99,199,245,255) if key=='bus' else (255,126,114,255); rr(d,(150,160,490,305),48,c); rr(d,(230,105,405,190),38,c); ellipse(d,(190,275,260,345),(50,58,70,255)); ellipse(d,(380,275,450,345),(50,58,70,255))
    elif key in {'home','room','school','store','park','road'}:
        house(d,220,160,1.05,wall=(255,235,205),roof=(108,99,232));
        if key=='road': d.polygon([(250,420),(300,210),(340,210),(390,420)],fill=(85,95,112,255)); d.line((320,380,320,230),fill=(255,211,90,255),width=12)
        if key=='park': tree(d,480,210,.55)
    elif key in {'bed','table','chair','toy','book','clean','open','close'}:
        if key=='bed': rr(d,(140,210,500,330),40,(99,199,245,255)); rr(d,(160,160,290,235),30,(255,255,255,255))
        elif key=='table': rr(d,(155,190,485,245),24,(170,110,65,255)); rr(d,(185,235,220,355),10,(170,110,65,255)); rr(d,(420,235,455,355),10,(170,110,65,255))
        elif key=='chair': rr(d,(235,150,405,255),30,(255,162,74,255)); rr(d,(250,255,285,365),12,(255,162,74,255)); rr(d,(355,255,390,365),12,(255,162,74,255))
        elif key=='book': rr(d,(160,145,310,330),24,(99,199,245,255)); rr(d,(330,145,480,330),24,(88,210,160,255)); d.line((320,150,320,330),fill=(255,255,255,255),width=12)
        else: rr(d,(220,130,420,340),50,(255,211,90,255)); d.polygon(star_points(320,235,70,28),fill=(108,99,232,255))
    elif key in {'dinosaur'}: draw_animal(d,'lion'); d.polygon([(205,185),(160,120),(245,145)],fill=(88,170,100,255)); d.polygon([(430,185),(485,115),(395,150)],fill=(88,170,100,255))
    elif key in {'ocean'}:
        for y in [160,230,300]: d.arc((120,y,330,y+90),180,350,fill=(99,199,245,255),width=20); d.arc((300,y,520,y+90),180,350,fill=(99,199,245,255),width=20)
    elif key in {'rocket'}:
        d.polygon([(320,80),(235,280),(405,280)],fill=(245,248,255,255)); ellipse(d,(285,155,355,225),(99,199,245,255)); d.polygon([(235,255),(180,330),(250,310)],fill=(255,126,114,255)); d.polygon([(405,255),(460,330),(390,310)],fill=(255,126,114,255)); d.polygon([(280,280),(320,390),(360,280)],fill=(255,162,74,255))
    elif key in {'big','small'}:
        ellipse(d,(130,130,360,360),(108,99,232,255)); ellipse(d,(410,250,485,325),(99,199,245,255))
    elif key in {'head','eyes','ears','nose','body','shoulders','knees','toes','hands','feet'}:
        draw_face_icon(d,320,215,'happy')
        if key=='hands': ellipse(d,(190,180,280,270),(248,197,160,255)); ellipse(d,(360,180,450,270),(248,197,160,255))
        if key=='feet': rr(d,(180,250,305,330),40,(99,199,245,255)); rr(d,(335,250,460,330),40,(99,199,245,255))
    elif key in {'mom','dad','brother','family','friend','teacher'}:
        draw_face_icon(d,245,220,'happy'); draw_face_icon(d,395,220,'happy')
    elif key in {'jump','turn','hug','love','go','stop','fast','actions'}:
        # simple motion figure
        ellipse(d,(275,85,365,175),(248,197,160,255)); rr(d,(280,170,360,300),32,(108,99,232,255)); d.line((300,200,215,135),fill=(108,99,232,255),width=26); d.line((340,200,430,135),fill=(108,99,232,255),width=26); d.line((300,290,235,385),fill=(75,92,125,255),width=28); d.line((340,290,415,365),fill=(75,92,125,255),width=28)
        if key=='love': d.polygon([(450,180),(420,145),(385,170),(450,250),(515,170),(480,145)],fill=(255,126,114,255))
    else:
        # Abstract phrase / alphabet / review: speech bubble + friendly star, no text baked into artwork.
        rr(d,(145,120,495,315),60,(255,255,255,235),outline=(210,218,238,255),width=5); d.polygon([(255,300),(300,380),(350,300)],fill=(255,255,255,235)); d.polygon(star_points(320,220,78,34),fill=(108,99,232,255))
    im.convert('RGB').save(VOCAB_DIR/f'{slug_word(word)}.webp','WEBP',quality=90,method=3)


def main():
    worlds=[
        ('Hello Town',('#9DDFFF','#F4FBFF','#9ED987','#5FCB92'),'town','world-hello.webp'),
        ('Color Garden',('#BDEBFF','#FFF9E6','#B6DE84','#73CE98'),'garden','world-color.webp'),
        ('Animal Forest',('#A8E2FF','#EBFFF6','#79C98E','#4FA879'),'forest','world-animal.webp'),
        ('Family Village',('#C8E9FF','#FFF5ED','#A8D78A','#74C596'),'family','world-family.webp'),
        ('Number Mountain',('#A9DFFF','#F2F5FF','#A8C1D5','#6DAF91'),'mountain','world-number.webp'),
        ('Food Market',('#BCE9FF','#FFF4D8','#A8D987','#69C58E'),'market','world-food.webp'),
        ('Ocean Adventure',('#9EE8FF','#E8FBFF','#86D1AF','#3AA9C5'),'ocean','world-ocean.webp'),
        ('Dino Island',('#B5E9D0','#FFF3D9','#84C68B','#4B9B72'),'dino','world-dino.webp'),
        ('Space Station',('#20254E','#373B73','#526893','#344B79'),'space','world-space.webp'),
    ]
    for item in worlds: world_scene(*item)
    # Hero is a dedicated high-res adventure scene rather than an enlarged card image.
    world_scene('Hero',('#A8E6FF','#F8FCFF','#94D48A','#5FBE8C'),'town','hero-storybook.webp')

    avatars={
        'nova':((108,99,232),(81,55,45)), 'thunder':((99,199,245),(72,52,44)), 'titan':((216,94,144),(76,50,42)),
        'turbo':((255,162,74),(58,47,45)), 'rex':((88,210,160),(84,58,40)), 'aqua':((62,179,203),(64,54,48)),
    }
    for aid,(color,hair) in avatars.items():
        for stage in range(1,6): draw_character(aid,stage,color,hair,f'{aid}-stage-{stage}.webp')
    # Compatibility names used by old profiles now point to generated V3 art.
    draw_character('nova',1,avatars['nova'][0],avatars['nova'][1],'avatar-brother.webp')
    draw_character('rex',1,avatars['rex'][0],avatars['rex'][1],'avatar-younger.webp')
    draw_caregiver('father',(99,199,245),(70,52,45),'avatar-father.webp')
    draw_caregiver('mother',(255,126,114),(85,55,50),'avatar-mother.webp')
    draw_caregiver('caregiver',(88,210,160),(65,55,50),'avatar-caregiver.webp')
    draw_caregiver('caregiver',(108,99,232),(65,55,50),'avatar-robot.webp')
    draw_mascot()

    badge_defs=[
        ('streak-3','streak',False),('streak-7','streak',False),('streak-14','streak',False),('streak-30','streak',True),
        ('speaking-first-word','speaking',False),('speaking-brave','speaking',False),('speaking-sentence','speaking',False),('speaking-hero','speaking',True),
        ('listening-good','listening',False),('listening-sound-hunter','listening',False),('listening-music-explorer','listening',False),('listening-master','listening',True),
        ('learning-first-mission','learning',False),('learning-10','learning',False),('learning-50','learning',False),('learning-100','learning',True),
        ('adventure-world-explorer','adventure',False),('adventure-forest','adventure',False),('adventure-ocean','adventure',False),('adventure-space','adventure',True),
        ('special-perfect-day','special',True),('special-early-bird','special',False),('special-comeback','special',False),('special-super-explorer','special',True),
    ]
    for bid,cat,rare in badge_defs: draw_badge(bid,cat,rare)

    # Parse vocabulary directly from the curriculum source to keep the asset set deterministic.
    source=(ROOT/'src/data/curriculum.ts').read_text(encoding='utf-8')
    # Runtime-generated curriculum includes literal vocabulary arrays in the source; fallback list is populated from a small TS helper if needed.
    vocab=[]
    for match in re.finditer(r"vocabulary:\s*\[([^\]]+)\]",source):
        vocab.extend(re.findall(r"['\"]([^'\"]+)['\"]",match.group(1)))
    if len(set(vocab)) < 50:
        # Source is compact/generated; use maintained export through a subprocess-free static list matching current curriculum.
        vocab_text='''hello|hi|bye|yes|no|please|thank you|friend|teacher|family|red|yellow|green|blue|orange|purple|pink|circle|square|triangle|head|shoulders|knees|toes|eyes|ears|hands|feet|jump|turn|mom|dad|brother|happy|sad|angry|tired|hug|love|dog|cat|bird|fish|cow|pig|duck|lion|shark|insect|one|two|three|four|five|six|seven|eight|nine|ten|apple|banana|grape|strawberry|broccoli|pizza|juice|ice cream|soup|sunny|rainy|cloudy|hot|cold|shirt|pants|shoes|hat|jacket|home|room|bed|table|chair|toy|book|clean|open|close|car|bus|train|bike|go|stop|school|park|store|road|sun|moon|star|sky|tree|flower|water|mountain|big|small|A apple|B ball|C cat|D dog|E egg|F fish|G grape|H hat|I ice|J juice|N nose|O orange|P pig|Q queen|R red|S sun|T toy|U umbrella|V van|W water|ball 球|pig 豬|moon 月亮|fish 魚|dog 狗|toy 玩具|nose 鼻子|lion 獅子|grape 葡萄|cat 貓|dinosaur|ocean|space|rocket|fast|I like|I have|I see|I can|I am|What is it?|Where is it?|Yes|No|Please|colors|body|animals|numbers|food|weather|ABC|中文聲音'''
        vocab=vocab_text.split('|')
    for word in sorted(set(vocab), key=lambda x:x.lower()): draw_vocab(word)
    print(f'generated worlds={len(worlds)+1} characters={len(avatars)*5+6} badges={len(badge_defs)} vocab={len(set(vocab))}')

if __name__=='__main__':
    main()
