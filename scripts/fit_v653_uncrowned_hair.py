"""Fit coherent role-specific hair masters to accepted face openings.

Uniform scale and translation only. These are candidates, not art admission.
Original generated RGB/alpha is retained; only alpha below 16/255 is cleared
in delivery to remove almost transparent generation noise outside the object.
"""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa/v653/20261005/hair/uncrowned-r1'
SOURCES = json.loads((ROOT / 'art-source/v653/hair-legend/source-lineage-r1.json').read_text())['rows']
MF = json.loads((ROOT / 'src/data/avatarAssetManifest.json').read_text())
HAIR = next(x for x in MF['accessories'] if x['id'] == 'hair-legend')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def opening(image):
    mask = np.array(image.getchannel('A')) > 128
    ys, xs = np.where(mask)
    center = int((xs.min() + xs.max()) // 2)
    apex = int(np.where(mask[:, center])[0].max() + 1)
    return mask, center, apex


def gap(mask, center, y):
    if y < 0 or y >= mask.shape[0] or mask[y, center]:
        return None
    left = center
    right = center
    while left > 0 and not mask[y, left - 1]:
        left -= 1
    while right < mask.shape[1] - 1 and not mask[y, right + 1]:
        right += 1
    if left == 0 or right == mask.shape[1] - 1:
        return None
    return left, right


def fit(source, target):
    sm, sc, sa = opening(source)
    tm, tc, ta = opening(target)
    target_points = [(ta + d, gap(tm, tc, ta + d)) for d in [30, 50, 70, 90, 110]]
    target_points = [(y, p) for y, p in target_points if p]
    assert len(target_points) >= 3
    candidates = []
    for scale in np.arange(.60, 1.201, .005):
        for apex_shift in range(-24, 25, 2):
            ty = ta - sa * scale + apex_shift
            pairs = []
            for y, points in target_points:
                p = gap(sm, sc, round((y - ty) / scale))
                if not p:
                    break
                pairs.extend([(points[0], p[0] * scale), (points[1], p[1] * scale)])
            if len(pairs) != 2 * len(target_points):
                continue
            tx = float(np.median([a - b for a, b in pairs]))
            error = float(np.mean([abs(a - (b + tx)) for a, b in pairs]))
            candidates.append((error + abs(apex_shift) * .025, error, scale, tx, ty))
    assert candidates
    _, error, scale, tx, ty = min(candidates)
    return float(scale), round(tx), round(ty), error


def main():
    OUT.mkdir(parents=True, exist_ok=False)
    manifest = json.loads(json.dumps(MF))
    candidate_hair = next(x for x in manifest['accessories'] if x['id'] == 'hair-legend')
    rows = []
    for record in SOURCES:
        avatar = record['avatar']
        source_path = ROOT / record['source']
        assert sha(source_path) == record['sha256']
        source = Image.open(source_path).convert('RGBA')
        alpha = source.getchannel('A')
        source.putalpha(alpha.point(lambda value: 0 if value < 16 else value))
        details = {'default': HAIR['defaultSkinDetails'][avatar], **HAIR['skinDetails'][avatar]}
        for skin, detail in details.items():
            target_path = ROOT / detail['overlay']
            target = Image.open(target_path).convert('RGBA')
            scale, x, y, error = fit(source, target)
            resized = source.resize((round(source.width * scale), round(source.height * scale)), Image.Resampling.LANCZOS)
            result = Image.new('RGBA', (1024, 1792))
            result.alpha_composite(resized, (x, y))
            path = OUT / f'{avatar}--{skin}.png'
            result.save(path)
            # Route-only candidate uses the existing masks for the original body.
            entry = candidate_hair['defaultSkinDetails'][avatar] if skin == 'default' else candidate_hair['skinDetails'][avatar][skin]
            entry['overlay'] = str(path.relative_to(ROOT))
            rows.append({'avatar': avatar, 'skin': skin, 'source': record['source'], 'sourceSha256': record['sha256'],
                         'reference': detail['overlay'], 'referenceSha256': sha(target_path), 'scale': scale,
                         'translation': [x, y], 'canvasTopPadding': 256, 'alphaTechnicalThreshold': 16,
                         'sourceRGBPainted': False, 'openingFitMeanError': error,
                         'overlay': str(path.relative_to(ROOT)), 'overlaySha256': sha(path),
                         'status': 'CANDIDATE_AWAITING_ACTUAL_RENDERER_REVIEW'})
    (OUT / 'candidate-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (OUT / 'fit.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps([{'avatar': r['avatar'], 'skin': r['skin'], 'scale': r['scale'], 'xy': r['translation'], 'error': round(r['openingFitMeanError'], 2)} for r in rows]))


if __name__ == '__main__':
    main()
