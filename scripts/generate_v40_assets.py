#!/usr/bin/env python3
"""Generate V4.0 production art from deterministic original vector/raster primitives.
No legacy low-resolution asset is upscaled. V4 outputs live under public/assets/v40.
"""
from __future__ import annotations
import importlib.util, json, math, re, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/v40'
CHAR = OUT / 'characters'; BUST = CHAR / 'bust'; ITEM = OUT / 'items'; BADGE = OUT / 'badges'; VOCAB = OUT / 'vocab'; THEME = OUT / 'themes'; REWARD = OUT / 'rewards'
for d in (OUT, CHAR, BUST, ITEM, BADGE, VOCAB, THEME, REWARD): d.mkdir(parents=True, exist_ok=True)

spec = importlib.util.spec_from_file_location('v30gen', ROOT/'scripts/generate_v30_assets.py')
v30 = importlib.util.module_from_spec(spec); assert spec and spec.loader; spec.loader.exec_module(v30)
v30.OUT = OUT; v30.CHAR_DIR = CHAR; v30.BADGE_DIR = BADGE; v30.VOCAB_DIR = VOCAB

def rr(d,b,r,fill,outline=None,width=1): d.rounded_rectangle(b,radius=r,fill=fill,outline=outline,width=width)
def ellipse(d,b,fill,outline=None,width=1): d.ellipse(b,fill=fill,outline=outline,width=width)
def star_points(cx,cy,r1,r2,n=5):
    pts=[]
    for i in range(n*2):
        r=r1 if i%2==0 else r2; a=-math.pi/2+i*math.pi/n; pts.append((cx+math.cos(a)*r,cy+math.sin(a)*r))
    return pts

def save_webp(im,path,quality=92):
    path.parent.mkdir(parents=True,exist_ok=True); im.save(path,'WEBP',quality=quality,method=3)

def space_banner():
    W,H=1920,600; im=v30.gradient((W,H),'#061D57','#075BC7').convert('RGBA'); d=ImageDraw.Draw(im)
    for i in range(110):
        x=(i*173+47)%W; y=(i*79+23)%H; r=2+(i%4==0)*2; ellipse(d,(x-r,y-r,x+r,y+r),(255,255,255,130+(i%3)*35))
    # planets
    ellipse(d,(1480,50,1740,310),(76,112,235,255)); ellipse(d,(1515,72,1710,278),(127,205,248,130));
    ellipse(d,(180,330,340,490),(255,216,61,255)); d.arc((145,365,380,455),180,350,fill=(255,247,194,180),width=16)
    # station glow
    glow=Image.new('RGBA',(W,H),(0,0,0,0)); gd=ImageDraw.Draw(glow); ellipse(gd,(690,140,1270,720),(16,188,235,105)); glow=glow.filter(ImageFilter.GaussianBlur(70)); im=Image.alpha_composite(im,glow); d=ImageDraw.Draw(im)
    # rocket
    d.polygon([(1040,92),(975,265),(1105,265)],fill=(249,251,255,255)); ellipse(d,(1015,145,1065,195),(16,188,235,255)); d.polygon([(975,245),(925,300),(990,285)],fill=(255,123,50,255)); d.polygon([(1105,245),(1155,300),(1090,285)],fill=(255,123,50,255)); d.polygon([(1015,265),(1040,370),(1065,265)],fill=(255,216,61,220))
    # soft vignette
    ov=Image.new('RGBA',(W,H),(0,0,0,0)); od=ImageDraw.Draw(ov); od.rectangle((0,H-120,W,H),fill=(2,12,42,65)); im=Image.alpha_composite(im,ov)
    save_webp(im.convert('RGB'),OUT/'hero-space-dashboard.webp',94)

def robot():
    S=1024; im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    shadow=Image.new('RGBA',(S,S),(0,0,0,0)); sd=ImageDraw.Draw(shadow); ellipse(sd,(250,815,775,945),(1,17,50,110)); im=Image.alpha_composite(im,shadow.filter(ImageFilter.GaussianBlur(30))); d=ImageDraw.Draw(im)
    # antenna
    d.line((512,110,512,190),fill=(98,210,250,255),width=20); ellipse(d,(476,68,548,140),(255,216,61,255))
    # head/body with glossy 3D highlights
    rr(d,(250,180,775,555),140,(229,246,255,255),outline=(105,211,246,255),width=18); rr(d,(310,250,715,470),90,(20,68,140,255))
    for x in (405,620): ellipse(d,(x-55,310,x+55,420),(114,222,255,255)); ellipse(d,(x-22,335,x+22,395),(255,255,255,235))
    d.arc((425,380,595,485),10,170,fill=(255,216,61,255),width=12)
    rr(d,(330,530,695,815),120,(238,249,255,255),outline=(105,211,246,255),width=18); ellipse(d,(455,610,570,725),(7,91,199,255)); d.polygon(star_points(512,667,40,18),fill=(255,216,61,255))
    rr(d,(220,565,335,760),55,(229,246,255,255)); rr(d,(690,565,805,760),55,(229,246,255,255)); ellipse(d,(220,725,335,840),(105,211,246,255)); ellipse(d,(690,725,805,840),(105,211,246,255))
    # highlight
    ellipse(d,(300,210,510,320),(255,255,255,70)); save_webp(im,CHAR/'avatar-robot.webp')
    bust=im.crop((225,100,800,675)).resize((512,512),Image.Resampling.LANCZOS); save_webp(bust,BUST/'avatar-robot.webp')

def character_assets():
    avatars={
      'nova':((7,91,199),(60,48,42)), 'thunder':((16,188,235),(58,48,42)), 'titan':((168,77,245),(73,48,44)),
      'turbo':((255,123,50),(56,45,42)), 'rex':((32,201,104),(75,54,38)), 'aqua':((20,182,211),(57,51,48)),
    }
    for aid,(color,hair) in avatars.items():
        for stage in range(1,6):
            name=f'{aid}-stage-{stage}.webp'; v30.draw_character(aid,stage,color,hair,name)
            p=CHAR/name; im=Image.open(p).convert('RGBA')
            # V4 glossy rim/light without changing facial identity.
            glow=Image.new('RGBA',im.size,(0,0,0,0)); gd=ImageDraw.Draw(glow); gd.ellipse((210,55,820,900),outline=(114,214,255,85),width=18); glow=glow.filter(ImageFilter.GaussianBlur(10)); im=Image.alpha_composite(glow,im); save_webp(im,p)
        src=Image.open(CHAR/f'{aid}-stage-1.webp').convert('RGBA'); bust=src.crop((235,80,790,635)).resize((512,512),Image.Resampling.LANCZOS); save_webp(bust,BUST/f'{aid}.webp')
    robot()
    v30.draw_caregiver('father',(7,91,199),(65,50,44),'avatar-father.webp')
    v30.draw_caregiver('mother',(168,77,245),(82,54,48),'avatar-mother.webp')
    v30.draw_caregiver('caregiver',(32,201,104),(61,54,49),'avatar-caregiver.webp')
    for name in ('avatar-father.webp','avatar-mother.webp','avatar-caregiver.webp'):
        src=Image.open(CHAR/name).convert('RGBA'); bust=src.crop((225,90,800,665)).resize((512,512),Image.Resampling.LANCZOS); save_webp(bust,BUST/name)

def item_art(item):
    S=512; im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    rarity=item.get('rarity','common'); palette={'common':('#DDF6FF','#0D8ED4'),'rare':('#D8E9FF','#075BC7'),'epic':('#F0DDFF','#A84DF5'),'legendary':('#FFF2A8','#E79B00')}[rarity]
    bg=v30.gradient((S,S),palette[0],'#FFFFFF').convert('RGBA'); mask=Image.new('L',(S,S),0); md=ImageDraw.Draw(mask); md.rounded_rectangle((30,30,482,482),90,fill=255); im=Image.composite(bg,im,mask); d=ImageDraw.Draw(im)
    # floor shadow
    shadow=Image.new('RGBA',(S,S),(0,0,0,0)); sd=ImageDraw.Draw(shadow); ellipse(sd,(120,370,392,440),(5,35,80,75)); im=Image.alpha_composite(im,shadow.filter(ImageFilter.GaussianBlur(18))); d=ImageDraw.Draw(im)
    c=tuple(int(palette[1].lstrip('#')[i:i+2],16) for i in (0,2,4))+(255,); gold=(255,216,61,255); white=(246,251,255,255); dark=(13,48,95,255)
    slot=item['slot']
    if slot=='hairstyle':
        ellipse(d,(135,120,377,340),c); forlock=[(170,160),(220,105),(270,120),(325,150)];
        for x,y in forlock: ellipse(d,(x-55,y-50,x+55,y+65),c)
    elif slot=='outfit':
        d.polygon([(145,150),(215,105),(297,105),(367,150),(342,240),(316,220),(316,390),(196,390),(196,220),(170,240)],fill=c); rr(d,(205,205,307,255),24,gold)
    elif slot=='hat':
        ellipse(d,(135,150,377,315),c); rr(d,(100,270,412,325),28,c); ellipse(d,(220,190,292,262),gold)
    elif slot=='glasses':
        rr(d,(90,190,225,305),45,(235,250,255,220),outline=c,width=18); rr(d,(287,190,422,305),45,(235,250,255,220),outline=c,width=18); d.line((225,245,287,245),fill=c,width=18)
    elif slot=='backpack':
        rr(d,(135,105,377,405),85,c); rr(d,(185,175,327,280),40,dark); ellipse(d,(220,310,292,382),gold)
    elif slot=='cape':
        d.polygon([(150,100),(362,100),(410,390),(256,430),(102,390)],fill=c); d.polygon([(210,110),(302,110),(330,355),(256,390),(182,355)],fill=(255,255,255,55)); d.polygon(star_points(256,240,52,23),fill=gold)
    elif slot=='headphones':
        d.arc((105,110,407,405),185,355,fill=c,width=46); rr(d,(88,235,155,335),28,c); rr(d,(357,235,424,335),28,c); ellipse(d,(222,115,290,183),gold)
    elif slot=='spaceship':
        d.polygon([(256,75),(155,300),(357,300)],fill=white); ellipse(d,(215,155,297,237),c); d.polygon([(155,275),(90,365),(185,330)],fill=c); d.polygon([(357,275),(422,365),(327,330)],fill=c); d.polygon([(208,300),(256,425),(304,300)],fill=gold)
    elif slot=='room':
        rr(d,(105,120,407,390),55,white,outline=c,width=18); rr(d,(145,165,367,280),35,(20,66,125,255)); ellipse(d,(190,195,265,270),(114,222,255,255)); ellipse(d,(280,195,345,260),gold); rr(d,(150,315,362,360),18,c)
    elif slot=='robot':
        rr(d,(135,105,377,310),72,white,outline=c,width=16); rr(d,(180,155,332,260),42,dark); ellipse(d,(205,185,245,225),gold); ellipse(d,(275,185,315,225),gold); rr(d,(170,305,342,405),45,c); d.line((256,75,256,110),fill=c,width=14); ellipse(d,(238,50,274,86),gold)
    elif slot=='card':
        rr(d,(110,100,402,405),48,white,outline=c,width=20); rr(d,(145,145,367,205),22,c); rr(d,(145,235,320,258),11,(180,211,230,255)); rr(d,(145,280,345,303),11,(180,211,230,255)); d.polygon(star_points(340,345,38,16),fill=gold)
    else:
        for i in range(7):
            a=i*math.tau/7; x=256+math.cos(a)*120; y=255+math.sin(a)*120; d.polygon(star_points(x,y,28,12),fill=c)
        d.polygon(star_points(256,255,92,40),fill=gold)
    # highlights and rarity mark
    ellipse(d,(110,75,220,145),(255,255,255,75)); d.polygon(star_points(420,92,30,13),fill=gold); save_webp(im,ITEM/f"{item['id']}.webp")

def load_cosmetics():
    code="import {cosmetics} from './src/cosmetics.ts'; console.log(JSON.stringify(cosmetics))"; raw=subprocess.check_output(['npx','tsx','-e',code],cwd=ROOT,text=True); return json.loads(raw.strip())

def items():
    for item in load_cosmetics(): item_art(item)

def badges():
    defs=[('streak-3','streak',False),('streak-7','streak',False),('streak-14','streak',False),('streak-30','streak',True),('speaking-first-word','speaking',False),('speaking-brave','speaking',False),('speaking-sentence','speaking',False),('speaking-hero','speaking',True),('listening-good','listening',False),('listening-sound-hunter','listening',False),('listening-music-explorer','listening',False),('listening-master','listening',True),('learning-first-mission','learning',False),('learning-10','learning',False),('learning-50','learning',False),('learning-100','learning',True),('adventure-world-explorer','adventure',False),('adventure-forest','adventure',False),('adventure-ocean','adventure',False),('adventure-space','adventure',True),('special-perfect-day','special',True),('special-early-bird','special',False),('special-comeback','special',False),('special-super-explorer','special',True)]
    for bid,cat,rare in defs: v30.draw_badge(bid,cat,rare)

def theme_card(name,colors,kind):
    W,H=1024,768; im=v30.gradient((W,H),colors[0],colors[1]).convert('RGBA'); d=ImageDraw.Draw(im)
    for i in range(45): x=(i*137+60)%W; y=(i*83+40)%H; ellipse(d,(x,y,x+5,y+5),(255,255,255,150))
    if kind=='space': ellipse(d,(660,100,900,340),(91,126,240,255)); d.polygon([(500,120),(430,350),(570,350)],fill=(245,249,255,255))
    elif kind=='mecha': rr(d,(300,150,720,610),120,(90,104,160,255)); rr(d,(380,230,640,410),65,(24,56,110,255)); ellipse(d,(420,275,500,355),(114,222,255,255)); ellipse(d,(540,275,620,355),(114,222,255,255))
    elif kind=='racing': d.polygon([(130,540),(420,330),(950,330),(740,540)],fill=(25,45,75,255)); rr(d,(340,300,730,500),90,(255,123,50,255)); ellipse(d,(380,455,485,560),(20,24,34,255)); ellipse(d,(610,455,715,560),(20,24,34,255))
    elif kind=='fantasy':
        for x in [180,350,690,850]: d.polygon([(x,610),(x+70,250),(x+140,610)],fill=(80,125,110,255)); ellipse(d,(395,130,630,365),(199,133,255,190))
    else:
        d.rectangle((0,430,W,H),fill=(19,145,190,255)); ellipse(d,(640,160,860,380),(255,216,61,220)); ellipse(d,(300,500,470,585),(255,123,50,255)); d.polygon([(290,540),(230,495),(230,585)],fill=(255,123,50,255))
    save_webp(im.convert('RGB'),THEME/f'{name}.webp')

def themes():
    theme_card('space-hero',('#061D57','#075BC7'),'space'); theme_card('mecha-warrior',('#171D4A','#5D4DE0'),'mecha'); theme_card('racing-adventure',('#1D2D50','#D34C31'),'racing'); theme_card('fantasy-spirit',('#30215F','#9E5AD8'),'fantasy'); theme_card('ocean-world',('#063D76','#10BCEB'),'ocean')

def vocabulary():
    code="import {curriculum} from './src/data/curriculum.ts'; console.log(JSON.stringify([...new Set(curriculum.flatMap(d=>d.blocks).flatMap(b=>b.vocabulary))]))"; words=json.loads(subprocess.check_output(['npx','tsx','-e',code],cwd=ROOT,text=True).strip())
    for word in words:
        v30.draw_vocab(word); p=VOCAB/f'{v30.slug_word(word)}.webp'; im=Image.open(p).convert('RGBA');
        # V4 glossy HUD frame, generated at native size.
        d=ImageDraw.Draw(im); rr(d,(8,8,632,472),38,(0,0,0,0),outline=(16,188,235,120),width=5); save_webp(im.convert('RGB'),p,91)

def reward_icons():
    colors={'xp':(16,188,235,255),'coin':(255,216,61,255),'star':(255,199,46,255),'gem':(168,77,245,255),'treasure':(255,123,50,255)}
    for name,c in colors.items():
        S=512; im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im); ellipse(d,(70,70,442,442),(255,255,255,230)); ellipse(d,(105,105,407,407),c)
        if name=='star': d.polygon(star_points(256,256,120,52),fill=(255,255,255,255))
        elif name=='gem': d.polygon([(256,125),(370,215),(320,370),(192,370),(142,215)],fill=(255,255,255,235))
        elif name=='treasure': rr(d,(150,205,362,355),35,(255,255,255,245)); rr(d,(145,165,367,245),40,(255,255,255,245)); ellipse(d,(235,245,277,287),c)
        elif name=='coin': ellipse(d,(175,175,337,337),(255,255,255,245)); d.polygon(star_points(256,256,65,28),fill=c)
        else: d.polygon([(215,125),(310,125),(270,230),(345,230),(190,390),(225,270),(160,270)],fill=(255,255,255,245))
        save_webp(im,REWARD/f'{name}.webp')

def main():
    space_banner(); character_assets(); items(); badges(); themes(); vocabulary(); reward_icons()
    print(f'V4 assets generated: characters={len(list(CHAR.glob("*-stage-*.webp")))} busts={len(list(BUST.glob("*.webp")))} items={len(list(ITEM.glob("*.webp")))} badges={len(list(BADGE.glob("*.webp")))} vocab={len(list(VOCAB.glob("*.webp")))} themes={len(list(THEME.glob("*.webp")))}')

if __name__=='__main__': main()
