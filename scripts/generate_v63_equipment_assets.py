#!/usr/bin/env python3
"""Generate V6.3 full equipment assets.

This is a build-time art pipeline. Runtime React/CSS never receives wearable
alignment coordinates. Every wearable is baked onto the fixed 1024×1536 avatar
canvas. Ship/Robot/Card/Effect preview art is purpose-built for its own preview
stage and is never rendered as a body thumbnail overlay.
"""
from __future__ import annotations

from pathlib import Path
from typing import Final
import colorsys
import json
import math

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
CHARACTERS = ROOT / "public/assets/v5/characters"
ITEMS = ROOT / "public/assets/v5/items"
WORLD = ROOT / "public/assets/v6.3/world"
MANIFEST = ROOT / "src/data/avatarAssetManifest.json"

CANVAS: Final = (1024, 1536)
AVATARS: Final = ("brother", "younger", "sister", "younger-sister")

# Build-time geometry only. Runtime layers always use inset:0.
GEO = {
    "brother": {"cx":448,"head_y":250,"face_y":340,"shoulder_y":505,"torso_y":545,"torso_w":330,"torso_h":385,"hip_y":900,"back_y":780},
    "younger": {"cx":505,"head_y":260,"face_y":350,"shoulder_y":515,"torso_y":555,"torso_w":342,"torso_h":390,"hip_y":920,"back_y":790},
    "sister": {"cx":530,"head_y":260,"face_y":345,"shoulder_y":520,"torso_y":565,"torso_w":350,"torso_h":400,"hip_y":935,"back_y":805},
    "younger-sister": {"cx":500,"head_y":255,"face_y":340,"shoulder_y":510,"torso_y":555,"torso_w":340,"torso_h":390,"hip_y":915,"back_y":790},
}

OUTFITS = [
    "outfit-cadet","outfit-racer","outfit-mecha","outfit-ocean","outfit-mage","outfit-legend","sister-bloom-outfit",
]
HAIR = ["hair-comet","hair-wave","hair-spike","hair-cloud","hair-nebula","hair-legend","sister-starlight-clip","sister-mint-bow"]
HATS = ["starter-sun-cap","sunny-explorer-hat","hat-rocket","hat-ocean","hat-mage","hat-crown","sister-lavender-hat"]
GLASSES = ["starter-sky-glasses","sky-view-glasses","glasses-racer","glasses-star","glasses-holo","glasses-legend","sister-heart-glasses"]
HEADPHONES = ["starter-buddy-headphones","story-headphones","phones-sky","phones-racer","phones-ai","phones-legend","sister-cat-headphones"]
BACKPACKS = ["trail-backpack","pack-rocket","pack-treasure","pack-ocean","pack-legend","sister-comet-pack"]
CAPES = ["hero-cape","cape-sky","cape-nebula","cape-ocean","cape-legend","sister-galaxy-cape"]
EFFECTS = ["effect-stars","effect-bubbles","effect-legend"]
SHIPS = ["ship-scout","ship-comet","ship-legend"]
ROBOTS = ["robot-sky","robot-mecha","robot-legend"]
CARDS = ["card-sky","card-nebula","card-legend"]

PALETTE = {
    "starter": ((50,190,235),(255,220,75)), "sunny": ((54,190,235),(255,219,77)),
    "sky": ((53,164,255),(135,229,255)), "comet": ((117,84,235),(86,214,255)),
    "wave": ((52,147,244),(141,224,255)), "spike": ((255,112,67),(255,204,74)),
    "cloud": ((223,241,255),(141,193,235)), "nebula": ((131,77,224),(239,132,255)),
    "legend": ((255,196,43),(255,240,139)), "cadet": ((28,129,214),(108,222,255)),
    "racer": ((229,70,83),(255,181,65)), "mecha": ((84,91,220),(83,218,238)),
    "ocean": ((9,145,188),(78,225,214)), "mage": ((147,74,232),(255,135,233)),
    "rocket": ((245,107,55),(255,211,65)), "treasure": ((211,137,30),(255,223,91)),
    "holo": ((36,203,225),(145,245,255)), "ai": ((99,83,225),(87,221,239)),
    "lavender": ((157,126,239),(236,197,255)), "heart": ((244,104,166),(255,195,220)),
    "mint": ((45,204,175),(173,247,226)), "galaxy": ((101,63,205),(234,113,255)),
    "bloom": ((40,188,142),(255,170,206)), "story": ((99,87,220),(112,212,255)),
}

def colors(item_id: str):
    for key, pair in PALETTE.items():
        if key in item_id:
            return pair
    return ((45,126,218),(117,215,244))

def rgba_canvas(size=CANVAS): return Image.new("RGBA", size, (0,0,0,0))

def save_webp(im: Image.Image, path: Path, *, lossless=True, quality=90):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "WEBP", lossless=lossless, quality=quality, method=6)

def gradient(size, top, bottom, alpha=255):
    w,h=size; im=rgba_canvas(size); px=im.load()
    for y in range(h):
        t=y/max(1,h-1)
        c=tuple(round(top[i]*(1-t)+bottom[i]*t) for i in range(3))+(alpha,)
        for x in range(w): px[x,y]=c
    return im

def star_points(cx,cy,r1,r2,n=5):
    pts=[]
    for i in range(n*2):
        a=-math.pi/2+i*math.pi/n; r=r1 if i%2==0 else r2
        pts.append((cx+math.cos(a)*r,cy+math.sin(a)*r))
    return pts

def emblem(draw,cx,cy,color=(255,245,175,255),r=28):
    draw.polygon(star_points(cx,cy,r,r*.45),fill=color)

def outfit_overlay(avatar,item_id):
    g=GEO[avatar]; c1,c2=colors(item_id); layer=rgba_canvas(); d=ImageDraw.Draw(layer)
    cx=g["cx"]; y=g["torso_y"]; w=g["torso_w"]; h=g["torso_h"]
    x0=cx-w//2; x1=cx+w//2; y1=y+h
    # broad jacket body, shoulder guards, belt and lower panels
    d.rounded_rectangle((x0,y,x1,y1),radius=70,fill=c1+(235,),outline=(255,255,255,210),width=9)
    d.rounded_rectangle((x0+34,y+34,x1-34,y+165),radius=42,fill=c2+(210,))
    d.polygon([(cx,y+38),(cx-54,y+124),(cx,y+102),(cx+54,y+124)],fill=(245,250,255,235))
    d.rounded_rectangle((x0-42,y+55,x0+55,y+220),radius=38,fill=c1+(225,))
    d.rounded_rectangle((x1-55,y+55,x1+42,y+220),radius=38,fill=c1+(225,))
    d.rounded_rectangle((x0+12,y1-92,x1-12,y1-43),radius=20,fill=(27,55,99,225))
    d.rectangle((cx-15,y1-87,cx+15,y1-48),fill=(255,223,88,255))
    emblem(d,cx,y+205,r=30)
    if "mecha" in item_id:
        for dx in (-105,105): d.rounded_rectangle((cx+dx-44,y+145,cx+dx+44,y+242),radius=24,fill=(42,57,115,245),outline=c2+(255,),width=8)
    if "ocean" in item_id:
        d.arc((cx-115,y+158,cx+115,y+335),180,355,fill=(190,250,255,255),width=15)
    if "mage" in item_id:
        for a in range(0,360,60):
            r=125; sx=cx+math.cos(math.radians(a))*r; sy=y+235+math.sin(math.radians(a))*r*.45
            d.ellipse((sx-8,sy-8,sx+8,sy+8),fill=(255,235,255,245))
    if "legend" in item_id:
        d.line((x0+35,y+30,cx,y1-35,x1-35,y+30),fill=(255,241,166,255),width=17)
    if "bloom" in item_id:
        for dx in (-92,92): d.ellipse((cx+dx-28,y+190,cx+dx+28,y+246),fill=(255,177,211,240))
    return layer

def make_outfits():
    skin_entries=[]
    for avatar in AVATARS:
        base=Image.open(CHARACTERS/avatar/"wardrobe/base-body.webp").convert("RGBA")
        for item in OUTFITS:
            if item=="outfit-racer" and (CHARACTERS/avatar/"wardrobe/looks/outfit-racer-v1.webp").exists():
                out=Image.open(CHARACTERS/avatar/"wardrobe/looks/outfit-racer-v1.webp").convert("RGBA")
            else:
                out=base.copy(); out.alpha_composite(outfit_overlay(avatar,item))
            path=CHARACTERS/avatar/"wardrobe/looks"/f"{item}-v1.webp"; save_webp(out,path)
            skin_entries.append({"id":f"{avatar}:{item}","skinId":item,"avatarId":avatar,"path":str(path.relative_to(ROOT))})
    return skin_entries

def draw_hair(item,avatar):
    g=GEO[avatar]; c1,c2=colors(item); im=rgba_canvas(); d=ImageDraw.Draw(im); cx=g['cx']; cy=g['head_y']
    if 'clip' in item or 'bow' in item:
        x=cx+130; y=cy-70
        if 'bow' in item:
            d.polygon([(x,y),(x-74,y-45),(x-65,y+40)],fill=c1+(245,)); d.polygon([(x,y),(x+74,y-45),(x+65,y+40)],fill=c2+(245,)); d.ellipse((x-22,y-22,x+22,y+22),fill=(255,224,88,255))
        else:
            emblem(d,x,y,c1+(255,),36)
        return im
    d.ellipse((cx-205,cy-145,cx+205,cy+112),fill=c1+(235,),outline=c2+(255,),width=12)
    # Cut a soft face opening.
    d.ellipse((cx-145,cy-40,cx+145,cy+165),fill=(0,0,0,0))
    if 'spike' in item:
        for dx in (-150,-75,0,75,150): d.polygon([(cx+dx-35,cy-70),(cx+dx,cy-205-randomish(dx)),(cx+dx+38,cy-72)],fill=c2+(250,))
    elif 'wave' in item:
        for dx in (-130,-45,45,130): d.arc((cx+dx-70,cy-135,cx+dx+70,cy+40),180,350,fill=c2+(255,),width=22)
    elif 'cloud' in item:
        for dx in (-145,-75,0,75,145): d.ellipse((cx+dx-70,cy-150,cx+dx+70,cy-20),fill=c2+(235,))
    elif 'legend' in item: emblem(d,cx,cy-175,(255,239,132,255),46)
    return im

def randomish(v): return abs(v)%37

def draw_hat(item,avatar):
    g=GEO[avatar]; c1,c2=colors(item); im=rgba_canvas(); d=ImageDraw.Draw(im); cx=g['cx']; cy=g['head_y']-65
    d.ellipse((cx-220,cy+45,cx+220,cy+125),fill=c2+(245,),outline=(255,255,255,210),width=8)
    if 'mage' in item:
        d.polygon([(cx-135,cy+55),(cx+118,cy+55),(cx+12,cy-260)],fill=c1+(245,),outline=c2+(255,))
        emblem(d,cx+15,cy-75,(255,242,166,255),34)
    elif 'crown' in item:
        d.polygon([(cx-150,cy+55),(cx-122,cy-100),(cx-50,cy-20),(cx,cy-135),(cx+55,cy-20),(cx+130,cy-105),(cx+150,cy+55)],fill=c1+(250,),outline=c2+(255,))
        for dx in (-110,0,110): d.ellipse((cx+dx-12,cy-65,cx+dx+12,cy-41),fill=(255,249,215,255))
    else:
        d.rounded_rectangle((cx-155,cy-110,cx+155,cy+70),radius=72,fill=c1+(245,),outline=c2+(255,),width=10)
        if 'rocket' in item: d.polygon([(cx+75,cy-50),(cx+150,cy-80),(cx+125,cy+5)],fill=(255,222,82,255))
        if 'ocean' in item: d.arc((cx-75,cy-60,cx+75,cy+45),190,350,fill=(210,252,255,255),width=15)
        if 'lavender' in item: emblem(d,cx,cy-28,(255,237,171,255),30)
    return im

def draw_glasses(item,avatar):
    g=GEO[avatar]; c1,c2=colors(item); im=rgba_canvas(); d=ImageDraw.Draw(im); cx=g['cx']; cy=g['face_y']; w=150; h=82
    if 'heart' in item:
        for dx in (-92,92):
            x=cx+dx; pts=[(x,cy+55),(x-73,cy-5),(x-60,cy-58),(x,cy-28),(x+60,cy-58),(x+73,cy-5)]
            d.polygon(pts,fill=c1+(85,),outline=c1+(255,))
        d.line((cx-22,cy,cx+22,cy),fill=c2+(255,),width=13)
    else:
        for dx in (-95,95):
            d.rounded_rectangle((cx+dx-w//2,cy-h//2,cx+dx+w//2,cy+h//2),radius=34,fill=c2+(80,),outline=c1+(255,),width=13)
        d.line((cx-24,cy,cx+24,cy),fill=c1+(255,),width=12)
        d.line((cx-170,cy-5,cx-225,cy-22),fill=c1+(255,),width=11); d.line((cx+170,cy-5,cx+225,cy-22),fill=c1+(255,),width=11)
        if 'star' in item:
            emblem(d,cx-95,cy,c1+(255,),35); emblem(d,cx+95,cy,c2+(255,),35)
        if 'holo' in item:
            d.rounded_rectangle((cx-225,cy-64,cx+225,cy+68),radius=28,outline=(170,249,255,220),width=6)
    return im

def draw_headphones(item,avatar):
    g=GEO[avatar]; c1,c2=colors(item); im=rgba_canvas(); d=ImageDraw.Draw(im); cx=g['cx']; cy=g['head_y']+45
    d.arc((cx-235,cy-205,cx+235,cy+160),190,350,fill=c1+(255,),width=34)
    for dx in (-205,205):
        d.rounded_rectangle((cx+dx-55,cy-20,cx+dx+55,cy+145),radius=44,fill=c2+(250,),outline=(255,255,255,220),width=8)
    if 'cat' in item:
        d.polygon([(cx-180,cy-150),(cx-125,cy-260),(cx-70,cy-150)],fill=c1+(245,)); d.polygon([(cx+70,cy-150),(cx+125,cy-260),(cx+180,cy-150)],fill=c1+(245,))
    if 'legend' in item: emblem(d,cx,cy-165,(255,244,166,255),36)
    if 'ai' in item:
        d.ellipse((cx+180,cy+135,cx+225,cy+180),fill=(107,242,255,255)); d.line((cx+205,cy+155,cx+125,cy+235),fill=c1+(255,),width=10)
    return im

def draw_back(item,avatar,is_cape):
    g=GEO[avatar]; c1,c2=colors(item); im=rgba_canvas(); d=ImageDraw.Draw(im); cx=g['cx']; y=g['back_y']
    if is_cape:
        pts=[(cx-165,y-245),(cx+165,y-245),(cx+265,y+390),(cx+70,y+540),(cx,y+470),(cx-75,y+545),(cx-265,y+385)]
        d.polygon(pts,fill=c1+(218,),outline=c2+(245,))
        d.line((cx,y-215,cx,y+450),fill=c2+(175,),width=16)
        if 'galaxy' in item or 'nebula' in item:
            for dx,dy in [(-95,30),(80,110),(-35,240),(110,315)]: emblem(d,cx+dx,y+dy,(255,232,164,220),18)
        if 'legend' in item:
            d.polygon([(cx-210,y-50),(cx-350,y+85),(cx-215,y+150)],fill=c2+(240,)); d.polygon([(cx+210,y-50),(cx+350,y+85),(cx+215,y+150)],fill=c2+(240,))
    else:
        d.rounded_rectangle((cx-220,y-235,cx+220,y+350),radius=105,fill=c1+(245,),outline=c2+(255,),width=14)
        d.rounded_rectangle((cx-165,y-125,cx+165,y+190),radius=65,fill=c2+(185,))
        if 'rocket' in item or 'comet' in item:
            for dx in (-112,112):
                d.rounded_rectangle((cx+dx-45,y+245,cx+dx+45,y+405),radius=25,fill=(48,67,105,245))
                d.polygon([(cx+dx-35,y+405),(cx+dx+35,y+405),(cx+dx,y+485)],fill=(255,162,58,230))
        elif 'treasure' in item:
            d.rectangle((cx-125,y-15,cx+125,y+135),fill=(160,91,30,230),outline=(255,221,93,255),width=12)
        elif 'ocean' in item:
            for dx in (-85,80): d.ellipse((cx+dx-45,y+25,cx+dx+45,y+115),outline=(195,251,255,255),width=12)
        elif 'legend' in item: emblem(d,cx,y+35,(255,245,166,255),50)
    return im

def draw_front(item,avatar,is_cape):
    g=GEO[avatar]; c1,c2=colors(item); im=rgba_canvas(); d=ImageDraw.Draw(im); cx=g['cx']; y=g['shoulder_y']
    if is_cape:
        d.rounded_rectangle((cx-112,y-30,cx+112,y+34),radius=28,fill=c2+(245,)); emblem(d,cx,y+2,(255,247,200,255),24)
    else:
        for dx in (-126,126): d.line((cx+dx,y-35,cx+dx*0.62,y+385),fill=c2+(230,),width=30)
    return im

def make_accessories():
    entries=[]
    aligned=[*( (x,'head',draw_hair) for x in HAIR),*( (x,'head',draw_hat) for x in HATS),*( (x,'face',draw_glasses) for x in GLASSES),*( (x,'head',draw_headphones) for x in HEADPHONES)]
    for item,slot,fn in aligned:
        variants={}
        for avatar in AVATARS:
            path=CHARACTERS/avatar/"wardrobe/accessories"/slot/f"{item}.webp"; save_webp(fn(item,avatar),path); variants[avatar]=str(path.relative_to(ROOT))
        entries.append({"id":item,"slot":slot,"renderer":"aligned-overlay","supportedAvatars":list(AVATARS),"variants":variants})
    for item,is_cape in [(x,False) for x in BACKPACKS]+[(x,True) for x in CAPES]:
        backs={}; fronts={}
        for avatar in AVATARS:
            base=CHARACTERS/avatar/"wardrobe/accessories/back"; bp=base/f"{item}-back.webp"; fp=base/f"{item}-front.webp"
            save_webp(draw_back(item,avatar,is_cape),bp); save_webp(draw_front(item,avatar,is_cape),fp)
            backs[avatar]=str(bp.relative_to(ROOT)); fronts[avatar]=str(fp.relative_to(ROOT))
        entries.append({"id":item,"slot":"back","renderer":"split-overlay","supportedAvatars":list(AVATARS),"backVariants":backs,"frontVariants":fronts})
    for effect in EFFECTS:
        entries.append({"id":effect,"slot":"effect","renderer":"standard-effect","supportedAvatars":list(AVATARS)})
    return entries

def ship_art(item,size=(1024,768)):
    c1,c2=colors(item); im=rgba_canvas(size); d=ImageDraw.Draw(im); w,h=size; cx=w//2; cy=h//2
    # shadow/engine glow layer
    glow=rgba_canvas(size); gd=ImageDraw.Draw(glow)
    gd.ellipse((cx-330,cy+145,cx+330,cy+300),fill=c2+(85,)); glow=glow.filter(ImageFilter.GaussianBlur(36)); im.alpha_composite(glow)
    d=ImageDraw.Draw(im)
    d.polygon([(cx-360,cy+80),(cx-170,cy-120),(cx+190,cy-120),(cx+365,cy+85),(cx+190,cy+180),(cx-190,cy+180)],fill=c1+(255,),outline=(240,250,255,255))
    d.polygon([(cx-150,cy-120),(cx-55,cy-245),(cx+90,cy-245),(cx+170,cy-120)],fill=c2+(255,),outline=(255,255,255,240))
    d.ellipse((cx-120,cy-155,cx+120,cy+25),fill=(135,224,255,210),outline=(228,252,255,255),width=12)
    d.polygon([(cx-310,cy+60),(cx-440,cy+165),(cx-260,cy+140)],fill=c2+(245,)); d.polygon([(cx+310,cy+60),(cx+440,cy+165),(cx+260,cy+140)],fill=c2+(245,))
    for dx in (-155,155):
        d.ellipse((cx+dx-62,cy+140,cx+dx+62,cy+245),fill=(36,52,90,255),outline=c2+(255,),width=10)
        d.ellipse((cx+dx-34,cy+180,cx+dx+34,cy+255),fill=(166,245,255,245))
    if 'comet' in item:
        d.polygon([(cx-360,cy+85),(cx-520,cy+20),(cx-410,cy+120)],fill=(194,126,255,225)); d.line((cx-420,cy+185,cx-560,cy+245),fill=(111,229,255,220),width=24)
    if 'legend' in item:
        emblem(d,cx,cy+85,(255,247,191,255),48); d.line((cx-230,cy+40,cx+230,cy+40),fill=(255,236,120,255),width=16)
    return im

def robot_art(item,size=(1024,768)):
    c1,c2=colors(item); im=rgba_canvas(size); d=ImageDraw.Draw(im); w,h=size; cx=w//2; cy=h//2
    glow=rgba_canvas(size); gd=ImageDraw.Draw(glow); gd.ellipse((cx-210,cy+230,cx+210,cy+330),fill=c2+(90,)); glow=glow.filter(ImageFilter.GaussianBlur(28)); im.alpha_composite(glow); d=ImageDraw.Draw(im)
    # antenna + head
    d.line((cx,cy-270,cx,cy-200),fill=c2+(255,),width=18); d.ellipse((cx-22,cy-300,cx+22,cy-256),fill=(255,230,95,255))
    d.rounded_rectangle((cx-205,cy-205,cx+205,cy+70),radius=90,fill=c1+(255,),outline=(240,250,255,255),width=12)
    d.rounded_rectangle((cx-150,cy-135,cx+150,cy+15),radius=54,fill=(16,45,90,240))
    for dx in (-70,70): d.ellipse((cx+dx-28,cy-85,cx+dx+28,cy-29),fill=c2+(255,))
    d.arc((cx-72,cy-45,cx+72,cy+20),10,170,fill=(230,251,255,255),width=8)
    # body, arms, feet
    d.rounded_rectangle((cx-155,cy+65,cx+155,cy+300),radius=75,fill=c2+(245,),outline=(255,255,255,230),width=10)
    for dx in (-205,205): d.rounded_rectangle((cx+dx-55,cy+95,cx+dx+55,cy+250),radius=42,fill=c1+(245,))
    for dx in (-92,92): d.rounded_rectangle((cx+dx-65,cy+275,cx+dx+65,cy+350),radius=35,fill=(48,67,109,250))
    emblem(d,cx,cy+175,(255,241,165,255),34)
    if 'mecha' in item:
        d.polygon([(cx-195,cy+95),(cx-270,cy+20),(cx-240,cy+180)],fill=(110,103,246,245)); d.polygon([(cx+195,cy+95),(cx+270,cy+20),(cx+240,cy+180)],fill=(110,103,246,245))
    if 'legend' in item:
        d.arc((cx-265,cy-275,cx+265,cy+265),205,335,fill=(255,224,91,255),width=18)
    return im

def card_art(item,size=(720,1000)):
    c1,c2=colors(item); im=rgba_canvas(size); w,h=size
    bg=gradient(size,tuple(max(0,x//4) for x in c1),tuple(max(0,x//3) for x in c2)); im.alpha_composite(bg)
    d=ImageDraw.Draw(im); rarity='LEGENDARY' if 'legend' in item else ('EPIC' if 'nebula' in item else 'COMMON')
    d.rounded_rectangle((25,25,w-25,h-25),radius=58,outline=c2+(255,),width=22)
    d.rounded_rectangle((62,80,w-62,h-210),radius=44,fill=(238,249,255,52),outline=(255,255,255,185),width=7)
    # central adventure planet / mission emblem
    d.ellipse((w//2-185,190,w//2+185,560),fill=c1+(210,),outline=(255,255,255,235),width=12)
    for a in range(0,360,45):
        x=w//2+math.cos(math.radians(a))*225; y=375+math.sin(math.radians(a))*145
        d.ellipse((x-8,y-8,x+8,y+8),fill=(255,238,160,230))
    emblem(d,w//2,375,(255,246,190,255),88)
    d.rounded_rectangle((80,h-190,w-80,h-80),radius=32,fill=(8,31,75,205))
    # no text baked into art: DOM supplies accessible/localized title and rarity
    for x in range(120,w-100,95): d.ellipse((x,h-135,x+12,h-123),fill=c2+(220,))
    if 'legend' in item:
        d.line((75,72,w-75,72),fill=(255,239,142,255),width=12); d.line((75,h-70,w-75,h-70),fill=(255,239,142,255),width=12)
    return im

def effect_catalog(item,size=(512,512)):
    c1,c2=colors(item); im=rgba_canvas(size); d=ImageDraw.Draw(im); cx=size[0]//2; cy=size[1]//2
    for i in range(12):
        a=i*math.tau/12; r=100+(i%3)*28; x=cx+math.cos(a)*r; y=cy+math.sin(a)*r
        if 'bubbles' in item: d.ellipse((x-22,y-22,x+22,y+22),fill=c1+(55,),outline=(230,252,255,230),width=5)
        elif 'legend' in item: d.polygon(star_points(x,y,23,10),fill=c2+(245,))
        else: d.polygon(star_points(x,y,20,9),fill=c1+(245,))
    d.ellipse((cx-82,cy-82,cx+82,cy+82),outline=c2+(200,),width=10)
    return im

def fit_catalog(obj: Image.Image):
    thumb=rgba_canvas((512,512)); bbox=obj.getchannel('A').getbbox(); crop=obj.crop(bbox) if bbox else obj
    crop.thumbnail((450,420),Image.Resampling.LANCZOS); thumb.alpha_composite(crop,((512-crop.width)//2,(512-crop.height)//2)); return thumb

def make_world_assets():
    for item in SHIPS:
        art=ship_art(item); save_webp(art,WORLD/"ships"/f"{item}.webp"); save_webp(fit_catalog(art),ITEMS/f"{item}.webp")
    for item in ROBOTS:
        art=robot_art(item); save_webp(art,WORLD/"robots"/f"{item}.webp"); save_webp(fit_catalog(art),ITEMS/f"{item}.webp")
    for item in CARDS:
        art=card_art(item); save_webp(art,WORLD/"cards"/f"{item}.webp"); save_webp(fit_catalog(art),ITEMS/f"{item}.webp")
    for item in EFFECTS:
        art=effect_catalog(item,(1024,768)); save_webp(art,WORLD/"effects"/f"{item}.webp"); save_webp(effect_catalog(item),ITEMS/f"{item}.webp")

def make_manifest(skins,accessories):
    # Keep default skins first.
    defaults=[]
    for avatar in AVATARS:
        defaults.append({"id":f"{avatar}:default","skinId":"default","avatarId":avatar,"path":f"public/assets/v5/characters/{avatar}/wardrobe/base-body.webp"})
    manifest={
        "version":3,
        "contract":{"canvasWidth":1024,"canvasHeight":1536,"transparent":True,"characterCenterX":512,"groundBaselineY":1488,"runtimeRule":"all wearable alignment is baked into fixed-canvas assets; React/CSS must not reposition body gear"},
        "skins":defaults+skins,
        "accessories":accessories,
    }
    MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")

def main():
    skins=make_outfits(); accessories=make_accessories(); make_world_assets(); make_manifest(skins,accessories)
    aligned=len(HAIR)+len(HATS)+len(GLASSES)+len(HEADPHONES)
    split=len(BACKPACKS)+len(CAPES)
    print(f"PASS generate_v63_equipment_assets: outfits={len(OUTFITS)*4}, aligned={aligned*4}, split={split*8}, world-preview={len(SHIPS)+len(ROBOTS)+len(CARDS)+len(EFFECTS)}")
    return 0

if __name__ == '__main__': raise SystemExit(main())
