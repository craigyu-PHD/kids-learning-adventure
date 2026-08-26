from __future__ import annotations

import io
import math
import time
import urllib.parse
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "generated"
OUT.mkdir(parents=True, exist_ok=True)

AVATARS = {
    "nova": "cheerful East Asian boy, neat black side-swept hair, bright blue hoodie with tiny star pin",
    "thunder": "cheerful East Asian boy, warm brown hair, electric blue jacket with subtle yellow lightning pin",
    "titan": "cheerful East Asian girl, dark brown bob haircut, silver-blue jacket with tiny geometric pin",
    "turbo": "cheerful East Asian boy, black hair, sporty red cap and orange racing jacket, no brand logos",
    "rex": "cheerful East Asian boy, short brown hair, green dinosaur-inspired hoodie with tiny rounded spikes",
    "aqua": "cheerful East Asian girl, dark hair, teal sea-explorer cap and aqua jacket",
}

BADGES = {
    "rocket": "friendly red and blue toy rocket",
    "treasure": "golden treasure chest overflowing with bright coins",
    "star": "rounded golden five-point star with a tiny happy face",
    "xp": "orange-red energy flame badge with the letters XP clearly centered",
    "crystal": "faceted purple-blue energy crystal",
    "trophy": "golden trophy cup with a small star emblem",
}

BASE = "https://image.pollinations.ai/prompt/"


def fetch(prompt: str, size: int, seed: int) -> Image.Image:
    enhanced = (
        f"{prompt}, original character design, polished premium 3D emoji icon style, "
        "soft studio lighting, rounded friendly shapes, expressive but simple, high-end kids app art, "
        "single centered subject, clean pale pastel background, no text except when explicitly requested, "
        "no logos, no copyrighted characters, no watermark"
    )
    url = f"{BASE}{urllib.parse.quote(enhanced)}?model=flux&width={size}&height={size}&seed={seed}&nologo=true"
    response = requests.get(url, timeout=180)
    response.raise_for_status()
    return Image.open(io.BytesIO(response.content)).convert("RGB")


def rounded_webp(image: Image.Image, path: Path, radius: int = 80) -> None:
    image = image.resize((384, 384), Image.Resampling.LANCZOS)
    image = ImageEnhance.Contrast(image).enhance(1.035)
    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, 383, 383), radius=radius, fill=255)
    rgba = image.convert("RGBA")
    rgba.putalpha(mask)
    rgba.save(path, "WEBP", quality=91, method=6)


def animated_gif(image: Image.Image, path: Path) -> None:
    base = image.resize((118, 118), Image.Resampling.LANCZOS).convert("RGBA")
    frames: list[Image.Image] = []
    for i in range(12):
        phase = 2 * math.pi * i / 12
        scale = 0.91 + 0.055 * math.sin(phase)
        yoff = int(4 * math.sin(phase))
        frame = Image.new("RGBA", (140, 140), (0, 0, 0, 0))
        glow = Image.new("RGBA", frame.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        alpha = int(35 + 20 * (1 + math.sin(phase)))
        gd.ellipse((23, 23, 117, 117), fill=(255, 204, 62, alpha))
        glow = glow.filter(ImageFilter.GaussianBlur(13))
        frame.alpha_composite(glow)
        size = max(1, int(118 * scale))
        icon = base.resize((size, size), Image.Resampling.LANCZOS)
        frame.alpha_composite(icon, ((140 - size) // 2, (140 - size) // 2 + yoff))
        d = ImageDraw.Draw(frame)
        sx = 26 + (i * 7) % 82
        sy = 24 + (i * 5) % 72
        d.ellipse((sx, sy, sx + 4, sy + 4), fill=(255, 255, 255, 210))
        frames.append(frame)
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=72, loop=0, disposal=2, optimize=True)


def main() -> None:
    for idx, (name, description) in enumerate(AVATARS.items(), start=1):
        target = OUT / f"avatar-{name}.webp"
        if not target.exists():
            image = fetch(f"head-and-shoulders portrait of a {description}", 512, 8100 + idx)
            rounded_webp(image, target)
            time.sleep(7)
        print(target.relative_to(ROOT), target.stat().st_size)

    for idx, (name, description) in enumerate(BADGES.items(), start=1):
        target = OUT / f"badge-{name}.gif"
        if not target.exists():
            image = fetch(description, 384, 9200 + idx)
            animated_gif(image, target)
            time.sleep(7)
        print(target.relative_to(ROOT), target.stat().st_size)


if __name__ == "__main__":
    main()
