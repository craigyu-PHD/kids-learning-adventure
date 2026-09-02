#!/usr/bin/env python3
"""Generate V6.2 fixed-canvas wearable assets.

Runtime contract:
- every avatar layer is a 1024x1536 transparent canvas;
- placement happens here, never in React/CSS;
- product thumbnails are catalog art only and are never rendered directly on a body;
- split overlays have a back and front canvas so AvatarRenderer owns a fixed z-order.
"""
from __future__ import annotations

from pathlib import Path
from typing import Final
import json

from PIL import Image, ImageDraw, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ITEMS = ROOT / "public/assets/v5/items"
CHARACTERS = ROOT / "public/assets/v5/characters"
CANVAS: Final = (1024, 1536)
AVATARS: Final = ("brother", "younger", "sister", "younger-sister")

# Build-time geometry only. Runtime never receives these numbers.
GEOMETRY = {
    "brother": {"cx": 448, "hat_y": 142, "face_y": 330, "phones_y": 292, "hair_y": 145, "back_y": 785, "chest_y": 505, "shoulder": 155},
    "younger": {"cx": 505, "hat_y": 158, "face_y": 340, "phones_y": 300, "hair_y": 160, "back_y": 790, "chest_y": 515, "shoulder": 150},
    "sister": {"cx": 530, "hat_y": 160, "face_y": 335, "phones_y": 300, "hair_y": 160, "back_y": 805, "chest_y": 515, "shoulder": 150},
    "younger-sister": {"cx": 500, "hat_y": 155, "face_y": 330, "phones_y": 295, "hair_y": 155, "back_y": 790, "chest_y": 505, "shoulder": 145},
}

ALIGNED = {
    # item id: (source item, standard slot, width, y geometry key, optional tint)
    "starter-sun-cap": ("sunny-explorer-hat.webp", "head", 390, "hat_y", (63, 188, 235)),
    "starter-sky-glasses": ("sky-view-glasses.webp", "face", 345, "face_y", (79, 117, 255)),
    "starter-buddy-headphones": ("story-headphones.webp", "head", 485, "phones_y", (86, 205, 158)),
    "sunny-explorer-hat": ("sunny-explorer-hat.webp", "head", 410, "hat_y", None),
    "sky-view-glasses": ("sky-view-glasses.webp", "face", 360, "face_y", None),
    "story-headphones": ("story-headphones.webp", "head", 500, "phones_y", None),
    "hair-comet": ("hair-comet.webp", "head", 430, "hair_y", None),
}

SPLIT = {
    "trail-backpack": ("trail-backpack.webp", 430, "back_y"),
    "hero-cape": ("hero-cape.webp", 690, "back_y"),
}


def open_rgba(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError(f"empty alpha source: {path}")
    return image.crop(bbox)


def tint(image: Image.Image, color: tuple[int, int, int]) -> Image.Image:
    alpha = image.getchannel("A")
    gray = ImageOps.grayscale(image)
    gray = ImageEnhance.Contrast(gray).enhance(1.15)
    colored = ImageOps.colorize(gray, black=(22, 34, 55), white=color).convert("RGBA")
    colored.putalpha(alpha)
    return colored


def fit_width(image: Image.Image, width: int) -> Image.Image:
    ratio = width / image.width
    height = max(1, round(image.height * ratio))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def paste_center(canvas: Image.Image, image: Image.Image, cx: int, cy: int) -> None:
    x = round(cx - image.width / 2)
    y = round(cy - image.height / 2)
    canvas.alpha_composite(image, (x, y))


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", lossless=True, method=6)


def make_catalog_starters() -> None:
    for item_id, (source_name, _slot, _width, _y_key, tint_color) in ALIGNED.items():
        if not item_id.startswith("starter-"):
            continue
        source = open_rgba(ITEMS / source_name)
        if tint_color:
            source = tint(source, tint_color)
        thumb = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        fitted = fit_width(source, min(440, source.width if source.width > 380 else 420))
        if fitted.height > 440:
            ratio = 440 / fitted.height
            fitted = fitted.resize((round(fitted.width * ratio), 440), Image.Resampling.LANCZOS)
        paste_center(thumb, fitted, 256, 256)
        save_webp(thumb, ITEMS / f"{item_id}.webp")


def make_aligned_assets() -> None:
    for avatar in AVATARS:
        geo = GEOMETRY[avatar]
        for item_id, (source_name, slot, width, y_key, tint_color) in ALIGNED.items():
            source = open_rgba(ITEMS / source_name)
            if tint_color:
                source = tint(source, tint_color)
            layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
            fitted = fit_width(source, width)
            paste_center(layer, fitted, geo["cx"], geo[y_key])
            save_webp(layer, CHARACTERS / avatar / "wardrobe/accessories" / slot / f"{item_id}.webp")


def draw_backpack_front(avatar: str) -> Image.Image:
    geo = GEOMETRY[avatar]
    cx, chest, spread = geo["cx"], geo["chest_y"], geo["shoulder"]
    layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    # Soft shoulder straps; all coordinates are baked into the asset.
    for direction in (-1, 1):
        x0 = cx + direction * spread
        x1 = cx + direction * max(72, spread - 55)
        draw.line([(x0, chest - 45), (x1, chest + 330)], fill=(45, 91, 140, 205), width=34)
        draw.line([(x0, chest - 45), (x1, chest + 330)], fill=(116, 196, 230, 225), width=13)
    return layer


def draw_cape_front(avatar: str) -> Image.Image:
    geo = GEOMETRY[avatar]
    cx, chest = geo["cx"], geo["chest_y"]
    layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    r = 34
    draw.ellipse((cx-r, chest-r, cx+r, chest+r), fill=(255, 211, 90, 245), outline=(154, 91, 22, 235), width=7)
    pts = []
    import math
    for i in range(10):
        angle = -math.pi / 2 + i * math.pi / 5
        rr = 22 if i % 2 == 0 else 9
        pts.append((cx + math.cos(angle) * rr, chest + math.sin(angle) * rr))
    draw.polygon(pts, fill=(255, 249, 216, 255))
    return layer


def make_split_assets() -> None:
    for avatar in AVATARS:
        geo = GEOMETRY[avatar]
        for item_id, (source_name, width, y_key) in SPLIT.items():
            source = open_rgba(ITEMS / source_name)
            back = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
            fitted = fit_width(source, width)
            # Cape sits slightly lower and wider than the backpack.
            y = geo[y_key] + (55 if item_id == "hero-cape" else 0)
            paste_center(back, fitted, geo["cx"], y)
            front = draw_cape_front(avatar) if item_id == "hero-cape" else draw_backpack_front(avatar)
            base = CHARACTERS / avatar / "wardrobe/accessories/back"
            save_webp(back, base / f"{item_id}-back.webp")
            save_webp(front, base / f"{item_id}-front.webp")


def make_manifest() -> None:
    skins = []
    for avatar in AVATARS:
        skins.append({"id": f"{avatar}:default", "skinId": "default", "avatarId": avatar, "path": f"public/assets/v5/characters/{avatar}/wardrobe/base-body.webp"})
        skins.append({"id": f"{avatar}:racer", "skinId": "outfit-racer", "avatarId": avatar, "path": f"public/assets/v5/characters/{avatar}/wardrobe/looks/outfit-racer-v1.webp"})
    accessories = []
    for item_id, (_source_name, slot, _width, _y_key, _tint_color) in ALIGNED.items():
        accessories.append({
            "id": item_id,
            "slot": slot,
            "renderer": "aligned-overlay",
            "supportedAvatars": list(AVATARS),
            "variants": {avatar: f"public/assets/v5/characters/{avatar}/wardrobe/accessories/{slot}/{item_id}.webp" for avatar in AVATARS},
        })
    for item_id in SPLIT:
        accessories.append({
            "id": item_id,
            "slot": "back",
            "renderer": "split-overlay",
            "supportedAvatars": list(AVATARS),
            "backVariants": {avatar: f"public/assets/v5/characters/{avatar}/wardrobe/accessories/back/{item_id}-back.webp" for avatar in AVATARS},
            "frontVariants": {avatar: f"public/assets/v5/characters/{avatar}/wardrobe/accessories/back/{item_id}-front.webp" for avatar in AVATARS},
        })
    for effect_id in ("effect-stars", "effect-bubbles", "effect-legend"):
        accessories.append({"id": effect_id, "slot": "effect", "renderer": "standard-effect", "supportedAvatars": list(AVATARS)})
    manifest = {
        "version": 2,
        "contract": {
            "canvasWidth": 1024,
            "canvasHeight": 1536,
            "transparent": True,
            "characterCenterX": 512,
            "groundBaselineY": 1488,
            "runtimeRule": "all wearable alignment is baked into fixed-canvas assets; React/CSS must not reposition body gear",
        },
        "skins": skins,
        "accessories": accessories,
    }
    path = ROOT / "src/data/avatarAssetManifest.json"
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


def main() -> int:
    make_catalog_starters()
    make_aligned_assets()
    make_split_assets()
    make_manifest()
    generated = 3 + len(AVATARS) * (len(ALIGNED) + len(SPLIT) * 2)
    print(f"PASS generate_v62_avatar_accessories: generated {generated} WebP assets on fixed {CANVAS[0]}x{CANVAS[1]} contract")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
