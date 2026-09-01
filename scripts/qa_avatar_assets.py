#!/usr/bin/env python3
import json
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'src/data/avatarAssetManifest.json'
ALLOWED_ACCESSORY_SLOTS = {'head', 'face', 'back', 'hand', 'effect'}
REQUIRED_AVATARS = {'brother', 'younger', 'sister', 'younger-sister'}

errors = []
data = json.loads(MANIFEST.read_text(encoding='utf-8'))
contract = data.get('contract', {})
expected_size = (contract.get('canvasWidth'), contract.get('canvasHeight'))
ids = []

for skin in data.get('skins', []):
    ids.append(skin.get('id'))
    path = ROOT / skin.get('path', '')
    if not path.is_file():
        errors.append(f"missing skin asset: {skin.get('id')} -> {path}")
        continue
    with Image.open(path) as image:
        if image.size != expected_size:
            errors.append(f"dimension mismatch {skin.get('id')}: {image.size} != {expected_size}")
        if 'A' not in image.getbands():
            errors.append(f"alpha channel missing: {skin.get('id')} ({image.mode})")
        elif image.getchannel('A').getbbox() is None:
            errors.append(f"alpha is fully transparent: {skin.get('id')}")

for accessory in data.get('accessories', []):
    ids.append(accessory.get('id'))
    if accessory.get('slot') not in ALLOWED_ACCESSORY_SLOTS:
        errors.append(f"unsupported slot: {accessory.get('id')} -> {accessory.get('slot')}")
    anchor = accessory.get('anchor')
    if not isinstance(anchor, dict) or not all(k in anchor for k in ('x', 'y', 'scale')):
        errors.append(f"missing anchor contract: {accessory.get('id')}")
    asset = accessory.get('path')
    if asset:
        path = ROOT / asset
        if not path.is_file():
            errors.append(f"missing accessory asset: {accessory.get('id')} -> {path}")
        else:
            with Image.open(path) as image:
                if 'A' not in image.getbands():
                    errors.append(f"accessory alpha channel missing: {accessory.get('id')}")

seen = set()
for item_id in ids:
    if not item_id:
        errors.append('manifest entry missing id')
    elif item_id in seen:
        errors.append(f'duplicate manifest id: {item_id}')
    seen.add(item_id)

avatars = {skin.get('avatarId') for skin in data.get('skins', []) if skin.get('skinId') == 'default'}
if avatars != REQUIRED_AVATARS:
    errors.append(f'default skin coverage mismatch: {sorted(avatars)}')
for avatar in REQUIRED_AVATARS:
    if not any(s.get('avatarId') == avatar and s.get('skinId') == 'outfit-racer' for s in data.get('skins', [])):
        errors.append(f'missing racer full skin: {avatar}')

print(f"avatar manifest: skins={len(data.get('skins', []))} accessories={len(data.get('accessories', []))} contract={expected_size}")
if errors:
    for error in errors:
        print('FAIL:', error)
    sys.exit(1)
print('PASS: Avatar Asset Contract validated')
