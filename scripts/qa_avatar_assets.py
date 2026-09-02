#!/usr/bin/env python3
"""Validate the V6.3 full equipment asset contract."""
from __future__ import annotations
import json, sys
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'src/data/avatarAssetManifest.json'
AVATARS=('brother','younger','sister','younger-sister')
OUTFITS={'outfit-cadet','outfit-racer','outfit-mecha','outfit-ocean','outfit-mage','outfit-legend','sister-bloom-outfit'}
ALIGNED={
 'starter-sun-cap','sunny-explorer-hat','hat-rocket','hat-ocean','hat-mage','hat-crown','sister-lavender-hat',
 'starter-sky-glasses','sky-view-glasses','glasses-racer','glasses-star','glasses-holo','glasses-legend','sister-heart-glasses',
 'starter-buddy-headphones','story-headphones','phones-sky','phones-racer','phones-ai','phones-legend','sister-cat-headphones',
 'hair-comet','hair-wave','hair-spike','hair-cloud','hair-nebula','hair-legend','sister-starlight-clip','sister-mint-bow',
}
SPLIT={'trail-backpack','pack-rocket','pack-treasure','pack-ocean','pack-legend','sister-comet-pack','hero-cape','cape-sky','cape-nebula','cape-ocean','cape-legend','sister-galaxy-cape'}
EFFECTS={'effect-stars','effect-bubbles','effect-legend'}
WORLD={'ships':{'ship-scout','ship-comet','ship-legend'},'robots':{'robot-sky','robot-mecha','robot-legend'},'cards':{'card-sky','card-nebula','card-legend'},'effects':EFFECTS}

def fail(msg): raise AssertionError(msg)
def fixed(path,w=1024,h=1536,label='asset'):
 if not path.exists(): fail(f'missing {label}: {path}')
 with Image.open(path) as im:
  if im.size!=(w,h): fail(f'{label} size {im.size}: {path}')
  if 'A' not in im.getbands(): fail(f'{label} no alpha: {path}')
  if im.getchannel('A').getbbox() is None: fail(f'{label} empty alpha: {path}')

def main():
 m=json.loads(MANIFEST.read_text())
 if int(m.get('version',0))<3: fail('manifest version must be >=3')
 c=m['contract']; w,h=int(c['canvasWidth']),int(c['canvasHeight'])
 if (w,h)!=(1024,1536) or not c.get('transparent'): fail('avatar contract mismatch')
 skins={(e['avatarId'],e['skinId']):e for e in m['skins']}
 for a in AVATARS:
  fixed(ROOT/skins[(a,'default')]['path'],w,h,'base skin')
  for item in OUTFITS:
   e=skins.get((a,item));
   if not e: fail(f'missing full skin {a}:{item}')
   fixed(ROOT/e['path'],w,h,'full skin')
 accessories={e['id']:e for e in m['accessories']}
 if len(accessories)!=len(m['accessories']): fail('duplicate accessory IDs')
 for item in ALIGNED:
  e=accessories.get(item)
  if not e or e.get('renderer')!='aligned-overlay': fail(f'missing aligned contract: {item}')
  if set(e.get('supportedAvatars') or [])!=set(AVATARS): fail(f'4-avatar coverage missing: {item}')
  for a in AVATARS: fixed(ROOT/e['variants'][a],w,h,'aligned overlay')
 for item in SPLIT:
  e=accessories.get(item)
  if not e or e.get('renderer')!='split-overlay': fail(f'missing split contract: {item}')
  if set(e.get('supportedAvatars') or [])!=set(AVATARS): fail(f'4-avatar coverage missing: {item}')
  for a in AVATARS:
   fixed(ROOT/e['backVariants'][a],w,h,'split back'); fixed(ROOT/e['frontVariants'][a],w,h,'split front')
 for item in EFFECTS:
  e=accessories.get(item)
  if not e or e.get('renderer')!='standard-effect' or set(e.get('supportedAvatars') or [])!=set(AVATARS): fail(f'effect contract missing: {item}')
 for kind,items in WORLD.items():
  for item in items:
   p=ROOT/'public/assets/v6.3/world'/kind/f'{item}.webp'
   if not p.exists(): fail(f'missing world preview: {p}')
   with Image.open(p) as im:
    expected=(720,1000) if kind=='cards' else (1024,768)
    if im.size!=expected or 'A' not in im.getbands(): fail(f'world preview contract mismatch: {p} {im.size} {im.mode}')
   cat=ROOT/'public/assets/v5/items'/f'{item}.webp'
   with Image.open(cat) as im:
    if im.size!=(512,512) or 'A' not in im.getbands(): fail(f'world catalog contract mismatch: {cat}')
 wearable_count=len(OUTFITS)+len(ALIGNED)+len(SPLIT)
 print(f'PASS qa_avatar_assets: {wearable_count}/48 wearables × 4 avatars; full-skin={len(OUTFITS)}, aligned={len(ALIGNED)}, split={len(SPLIT)}, world-redesign=12, effects=3')
 return 0
if __name__=='__main__':
 try: raise SystemExit(main())
 except (AssertionError,KeyError) as e:
  print(f'FAIL qa_avatar_assets: {e}',file=sys.stderr); raise SystemExit(1)
