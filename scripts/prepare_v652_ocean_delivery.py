"""Immutable QA-only lossless delivery; never modifies public or the manifest."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / 'qa/v652/terra/ocean-accepted-integration-inventory-r1.json'
PIN = 'e0e4dac9027d61c825a481458bb4ab1f36e291d7a45499ef982557dceda46be2'
OUT = ROOT / 'qa/v652/ocean-delivery-candidate-r1'
AVATARS = {'brother', 'younger', 'sister', 'younger-sister'}
SKINS = {'base', 'outfit-cadet', 'outfit-mecha', 'outfit-ocean',
         'outfit-legend', 'outfit-mage', 'sister-bloom-outfit'}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(link):
    path = (ROOT / link['path']).resolve()
    assert path.is_relative_to(ROOT), 'path outside project'
    assert sha(path) == link['sha256'], f'source drift: {path}'
    if 'size' in link:
        with Image.open(path) as image:
            assert list(image.size) == link['size'], f'dimensions: {path}'
    return path


def main():
    assert sha(INVENTORY) == PIN, 'inventory drift'
    inventory = json.loads(INVENTORY.read_text())
    assert inventory['missingEvidence'] == []
    rows = inventory['acceptedPairs']
    assert len(rows) == 28
    assert {(r['avatar'], r['skinId']) for r in rows} == {
        (avatar, skin) for avatar in AVATARS for skin in SKINS}
    verify(inventory['master'])
    for row in rows:
        for key in ('source', 'overlay', 'independentReview', 'reportEvidence'):
            verify(row[key])
        assert row['mask'] is None and row['canvasTopPadding'] == 256
        assert row['overlay']['size'] == [1024, 1792]
        assert row['source']['size'] == [1024, 1536]
    for key in ('source', 'output', 'independentReview', 'reportEvidence'):
        verify(inventory['catalog'][key])
    OUT.mkdir(exist_ok=False)
    deliveries = []
    for row in rows:
        path = OUT / f"{row['avatar']}--{row['skinId']}.webp"
        with Image.open(verify(row['overlay'])) as original:
            rgba = original.convert('RGBA')
            rgba.save(path, format='WEBP', lossless=True, quality=100, method=6, exact=True)
            with Image.open(path) as decoded:
                assert np.array_equal(np.asarray(rgba), np.asarray(decoded.convert('RGBA'))), 'RGBA drift'
        deliveries.append({
            'avatar': row['avatar'], 'skinId': row['skinId'],
            'source': row['overlay'], 'path': str(path.relative_to(ROOT)),
            'sha256': sha(path), 'bytes': path.stat().st_size,
            'rgbaExact': True, 'canvasTopPadding': 256, 'mask': None,
            'independentReview': row['independentReview'],
        })
    report = {'status': 'QA_DELIVERY_ONLY_PENDING_INTEGRATION_AUDIT',
              'promotionAllowed': False, 'inventory': {'path': str(INVENTORY.relative_to(ROOT)), 'sha256': PIN},
              'deliveries': deliveries, 'catalog': inventory['catalog']['output'],
              'excludedSkins': ['outfit-racer']}
    (OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'output': str(OUT), 'pairs': len(deliveries),
                      'rgbaExact': True, 'bytes': sum(r['bytes'] for r in deliveries)}))


if __name__ == '__main__':
    main()
