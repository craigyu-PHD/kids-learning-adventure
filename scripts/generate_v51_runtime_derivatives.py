#!/usr/bin/env python3
"""Generate small V5.1 runtime derivatives without replacing archival masters."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
V5 = ROOT / "public" / "assets" / "v5"


def resize(source: Path, target: Path, size: tuple[int, int], quality: int = 82) -> None:
    with Image.open(source) as image:
        rgba = image.convert("RGBA")
        rgba.thumbnail(size, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", size, (0, 0, 0, 0))
        canvas.alpha_composite(rgba, ((size[0] - rgba.width) // 2, (size[1] - rgba.height) // 2))
        target.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(target, "WEBP", quality=quality, method=6)
        print(f"{target.relative_to(ROOT)} {target.stat().st_size} bytes")


for name in ("home", "book", "calendar", "star", "chart", "chest"):
    resize(V5 / "nav-icons" / f"{name}-3d.webp", V5 / "nav-icons" / f"{name}-3d-96.webp", (96, 96), 84)

for name in ("space-hero", "mecha-warrior", "racing-adventure", "fantasy-spirit", "ocean-world"):
    resize(V5 / "themes" / f"{name}-v2.webp", V5 / "themes" / f"{name}-v2-thumb.webp", (128, 128), 82)

for role in ("brother", "younger"):
    for stage in range(1, 5):
        resize(V5 / "characters" / role / f"stage-{stage}.webp", V5 / "characters" / role / f"stage-{stage}-thumb.webp", (192, 192), 84)

for source in sorted((V5 / "badges").glob("*.webp")):
    if source.stem.endswith("-128"):
        continue
    resize(source, source.with_name(f"{source.stem}-128.webp"), (128, 128), 82)
