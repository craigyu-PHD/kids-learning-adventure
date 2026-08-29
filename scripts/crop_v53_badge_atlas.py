#!/usr/bin/env python3
"""Split an approved 2×2 image-generation badge atlas into runtime WebP assets."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
BADGES = ROOT / "public/assets/v5/badges"
def main() -> int:
    if len(sys.argv) != 6:
        raise SystemExit(
            "Usage: crop_v53_badge_atlas.py /absolute/path/to/atlas.png "
            "badge-id-1 badge-id-2 badge-id-3 badge-id-4"
        )
    source = Path(sys.argv[1])
    badge_ids = tuple(sys.argv[2:])
    image = Image.open(source).convert("RGBA")
    if image.width != image.height or image.width < 1024:
        raise ValueError(f"expected a square atlas >=1024px, got {image.size}")
    half = image.width // 2
    cells = ((0, 0), (half, 0), (0, half), (half, half))
    BADGES.mkdir(parents=True, exist_ok=True)
    for badge_id, (left, top) in zip(badge_ids, cells, strict=True):
        icon = image.crop((left, top, left + half, top + half)).resize((512, 512), Image.Resampling.LANCZOS)
        icon.save(BADGES / f"{badge_id}.webp", "WEBP", quality=94, method=6)
        icon.resize((128, 128), Image.Resampling.LANCZOS).save(BADGES / f"{badge_id}-128.webp", "WEBP", quality=90, method=6)
        print(f"wrote {badge_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
