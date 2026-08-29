#!/usr/bin/env python3
"""Split the approved 2×2 caregiver atlas into transparent V5 runtime art."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/assets/v5/characters/caregivers"
ROLES = ("avatar-father.webp", "avatar-mother.webp", "avatar-caregiver.webp")


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: crop_v53_caregiver_atlas.py /absolute/path/to/atlas.png")
    atlas = Image.open(Path(sys.argv[1])).convert("RGBA")
    if atlas.width != atlas.height or atlas.width < 1024:
        raise ValueError(f"expected a square atlas >=1024px, got {atlas.size}")
    half = atlas.width // 2
    cells = ((0, 0), (half, 0), (0, half))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, (left, top) in zip(ROLES, cells, strict=True):
        character = atlas.crop((left, top, left + half, top + half)).resize((1024, 1024), Image.Resampling.LANCZOS)
        character.save(OUTPUT / name, "WEBP", quality=94, method=6)
        print(f"wrote {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
