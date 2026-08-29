#!/usr/bin/env python3
"""Split an approved 2×2 item atlas into 512px V5 shop item WebP assets."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/assets/v5/items"


def main() -> int:
    if len(sys.argv) != 6:
        raise SystemExit(
            "Usage: crop_v53_item_atlas.py /absolute/path/to/atlas.png "
            "item-id-1 item-id-2 item-id-3 item-id-4"
        )
    atlas = Image.open(Path(sys.argv[1])).convert("RGBA")
    if atlas.width != atlas.height or atlas.width < 1024:
        raise ValueError(f"expected a square atlas >=1024px, got {atlas.size}")
    half = atlas.width // 2
    cells = ((0, 0), (half, 0), (0, half), (half, half))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for item_id, (left, top) in zip(sys.argv[2:], cells, strict=True):
        item = atlas.crop((left, top, left + half, top + half)).resize((512, 512), Image.Resampling.LANCZOS)
        item.save(OUTPUT / f"{item_id}.webp", "WEBP", quality=94, method=6)
        print(f"wrote {item_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
