#!/usr/bin/env python3
"""Split a 2×2 vocabulary atlas into 640×480 transparent V5 teaching art."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/assets/v5/vocab"


def main() -> int:
    if not 3 <= len(sys.argv) <= 6:
        raise SystemExit(
            "Usage: crop_v53_vocab_atlas.py /absolute/path/to/atlas.png "
            "word-slug-1 [word-slug-2 word-slug-3 word-slug-4]"
        )
    atlas = Image.open(Path(sys.argv[1])).convert("RGBA")
    if min(atlas.size) < 1024:
        raise ValueError(f"expected a 2x2 atlas with each edge >=1024px, got {atlas.size}")
    half_width = atlas.width // 2
    half_height = atlas.height // 2
    cells = (
        (0, 0, half_width, half_height),
        (half_width, 0, atlas.width, half_height),
        (0, half_height, half_width, atlas.height),
        (half_width, half_height, atlas.width, atlas.height),
    )
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for slug, cell in zip(sys.argv[2:], cells):
        subject = atlas.crop(cell)
        subject.thumbnail((560, 400), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (640, 480))
        offset = ((640 - subject.width) // 2, (480 - subject.height) // 2)
        canvas.alpha_composite(subject, offset)
        canvas.save(OUTPUT / f"{slug}.webp", "WEBP", quality=94, method=6)
        print(f"wrote {slug}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
