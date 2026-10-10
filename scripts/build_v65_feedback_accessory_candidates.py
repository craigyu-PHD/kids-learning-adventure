#!/usr/bin/env python3
"""Build non-destructive catalogue-faithful glasses/headphone candidates.

The artwork is either a built-in image-model master or the existing catalogue
asset.  This script only crops transparent padding, positions, scales and
compresses it. Production runtime files and the avatar manifest are untouched.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ITEMS = ROOT / "public/assets/v5/items"
BASES = ROOT / "public/assets/v5/characters"
OUT = ROOT / "qa/v65/user-feedback-r1/accessory-candidates"
GENERATED = ROOT / "qa/v65/user-feedback-r1/generated-masters"
CANVAS = (1024, 1536)
AVATARS = ("brother", "younger", "sister", "younger-sister")
GEOMETRY = {
    "brother": {"cx": 448, "face_y": 258, "phones_y": 244},
    "younger": {"cx": 505, "face_y": 270, "phones_y": 254},
    "sister": {"cx": 530, "face_y": 265, "phones_y": 250},
    "younger-sister": {"cx": 500, "face_y": 262, "phones_y": 248},
}
GLASSES = (
    "starter-sky-glasses", "sky-view-glasses", "glasses-racer",
    "glasses-star", "glasses-holo", "glasses-legend", "sister-heart-glasses",
)
HEADPHONES = (
    "starter-buddy-headphones", "story-headphones", "phones-sky",
    "phones-racer", "phones-ai", "phones-legend", "sister-cat-headphones",
)
WIDTHS = {
    "starter-sky-glasses": 292,
    "sky-view-glasses": 300,
    "glasses-racer": 306,
    "glasses-star": 298,
    "glasses-holo": 306,
    "glasses-legend": 300,
    "sister-heart-glasses": 296,
    "starter-buddy-headphones": 400,
    "story-headphones": 408,
    "phones-sky": 404,
    "phones-racer": 344,
    "phones-ai": 420,
    "phones-legend": 420,
    "sister-cat-headphones": 350,
}
TARGET_HEIGHTS = {
    "starter-buddy-headphones": 326,
    "story-headphones": 334,
    "phones-sky": 330,
    "phones-ai": 344,
    "phones-legend": 344,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def open_trimmed(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError(f"empty alpha: {path}")
    return image.crop(bbox)


def fit_width(image: Image.Image, width: int) -> Image.Image:
    height = max(1, round(image.height * width / image.width))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def source_path(item: str) -> Path:
    generated = GENERATED / f"{item}.png"
    if generated.exists():
        return generated
    png = ITEMS / f"{item}.png"
    return png if png.exists() else ITEMS / f"{item}.webp"


def place(item: str, avatar: str) -> tuple[Image.Image, tuple[int, int, int, int]]:
    source = fit_width(open_trimmed(source_path(item)), WIDTHS[item])
    if item in TARGET_HEIGHTS:
        source = source.resize((source.width, TARGET_HEIGHTS[item]), Image.Resampling.LANCZOS)
    geo = GEOMETRY[avatar]
    target_y = geo["face_y"] if item in GLASSES else geo["phones_y"]
    x = round(geo["cx"] - source.width / 2)
    y = round(target_y - source.height / 2)
    layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    layer.alpha_composite(source, (x, y))
    return layer, (x, y, x + source.width, y + source.height)


def main() -> int:
    rows = []
    for item in (*GLASSES, *HEADPHONES):
        src = source_path(item)
        if not src.exists():
            raise FileNotFoundError(src)
        for avatar in AVATARS:
            layer, bbox = place(item, avatar)
            item_dir = OUT / item / avatar
            item_dir.mkdir(parents=True, exist_ok=True)
            overlay = item_dir / "overlay.webp"
            composite = item_dir / "composite.webp"
            layer.save(overlay, "WEBP", quality=94, method=4)
            base = Image.open(BASES / avatar / "wardrobe/base-body.webp").convert("RGBA")
            base.alpha_composite(layer)
            base.save(composite, "WEBP", quality=92, method=4)
            rows.append({
                "itemId": item,
                "avatarId": avatar,
                "catalogue": str(src.relative_to(ROOT)),
                "catalogueSha256": sha256(src),
                "overlay": str(overlay.relative_to(ROOT)),
                "overlaySha256": sha256(overlay),
                "composite": str(composite.relative_to(ROOT)),
                "compositeSha256": sha256(composite),
                "bbox": bbox,
            })
        board = Image.new("RGB", (4 * 320, 520), "#eaf1ff")
        for index, avatar in enumerate(AVATARS):
            composite = Image.open(OUT / item / avatar / "composite.webp").convert("RGB")
            composite.thumbnail((300, 450), Image.Resampling.LANCZOS)
            board.paste(composite, (index * 320 + (320 - composite.width) // 2, 12))
        board.save(OUT / item / "four-avatar-board.webp", "WEBP", quality=92, method=4)
    for category, items in (("glasses", GLASSES), ("headphones", HEADPHONES)):
        sheet = Image.new("RGB", (1280, 7 * 520), "#dfe9fb")
        for row_index, item in enumerate(items):
            item_board = Image.open(OUT / item / "four-avatar-board.webp").convert("RGB")
            sheet.paste(item_board, (0, row_index * 520))
        sheet.save(OUT / f"{category}-all-avatars-board.webp", "WEBP", quality=90, method=4)
    report = OUT / "candidate-report.json"
    report.write_text(json.dumps({
        "status": "CANDIDATES_ONLY_NOT_PROMOTED",
        "rule": "built-in image-model master or catalogue source; alpha crop, scale, position and WebP compression only",
        "rows": rows,
    }, ensure_ascii=False, indent=2) + "\n")
    print(f"PASS: wrote {len(rows)} non-destructive candidates to {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
