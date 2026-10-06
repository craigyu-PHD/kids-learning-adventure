#!/usr/bin/env python3
"""Authorized cleanup: remove disconnected alpha islands, without painting pixels."""
from pathlib import Path
import argparse
import hashlib
import json
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("output")
    args = ap.parse_args()
    source, output = ROOT / args.source, ROOT / args.output
    if output.exists():
        raise SystemExit("Refusing to overwrite an existing cleanup artifact")
    source_hash = sha(source)
    image = Image.open(source)
    if image.mode != "RGBA":
        raise SystemExit("Expected native RGBA source")
    pixels = np.array(image)
    alpha = pixels[:, :, 3]
    labels, count = ndimage.label(alpha > 8, structure=np.ones((3, 3), dtype=bool))
    areas = np.bincount(labels.ravel())
    areas[0] = 0
    if count == 0:
        raise SystemExit("Empty source")
    body = int(areas.argmax())
    keep = ndimage.binary_dilation(labels == body, iterations=2)
    remove = (alpha > 0) & ~keep
    removed, visible = int(remove.sum()), int((alpha > 0).sum())
    removed_mass = float(alpha[remove].sum()) / float(alpha.sum())
    removed_max = int(alpha[remove].max()) if removed else 0
    if removed_mass > 0.001 or removed_max > 32:
        raise SystemExit("Cleanup would remove visible artwork; manual source review required")
    cleaned = pixels.copy()
    clear = remove | (alpha == 0)
    cleaned[clear] = 0
    assert np.array_equal(cleaned[~clear], pixels[~clear])
    output.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(cleaned).save(output)
    assert sha(source) == source_hash
    decoded = np.array(Image.open(output))
    assert np.array_equal(decoded, cleaned)
    report = {
        "operation": "remove-disconnected-alpha-islands-only",
        "authorization": "User explicitly allowed cleanup, placement, scaling and compression on 2026-09-18",
        "source": str(source.relative_to(ROOT)), "sourceSha256": source_hash,
        "output": str(output.relative_to(ROOT)), "outputSha256": sha(output),
        "dimensions": list(image.size), "connectivity": 8, "alphaThreshold": 8,
        "originalAntialiasHaloPixels": 2, "removedAlphaMassFraction": removed_mass,
        "maxRemovedAlpha": removed_max,
        "componentsBefore": int(count), "componentsAfter": 1,
        "visiblePixelsBefore": visible, "removedPixels": removed,
        "removedFraction": removed / visible, "bodyPixelsRetained": int(areas[body]),
        "allRetainedPixelsByteIdentical": True, "transparentRGBZeroed": True,
        "allRetainedRGBValuesByteIdentical": True,
        "originalPreserved": True, "paintedOrComposited": False,
        "visualAdmission": "PENDING_DIRECT_REVIEW"
    }
    output.with_suffix(".cleanup.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False))
if __name__ == "__main__":
    main()
