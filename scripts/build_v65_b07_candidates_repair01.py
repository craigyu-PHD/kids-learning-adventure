#!/usr/bin/env python3
from __future__ import annotations

import base64
import hashlib
import json
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ATTEMPT = ROOT / "qa/v65/art-workpacks/B07"
BRIDGE = ATTEMPT / ".bridge"
MANIFEST = ATTEMPT / "manifest.json"
REPORT = ATTEMPT / "candidate-build-report-repair01.json"

MASTER_MAP = {
    "sky-view-glasses": ("sky_master_q80.b64", "sky_master_q80.webp", "sky_master_repair01.webp"),
    "glasses-racer": ("racer_master_q80.b64", "racer_master_q80.webp", "racer_master_repair01.webp"),
    "glasses-star": ("star_master_q80.b64", "star_master_q80.webp", "star_master_repair01.webp"),
}

FRAME_COLORS = {
    "sky-view-glasses": {
        "base": (29, 145, 236, 255),
        "dark": (8, 72, 132, 205),
        "highlight": (136, 225, 255, 185),
        "glass": (142, 226, 238),
    },
    "glasses-racer": {
        "base": (231, 79, 86, 255),
        "dark": (118, 34, 39, 215),
        "highlight": (255, 174, 156, 185),
        "glass": (238, 178, 79),
    },
    "glasses-star": {
        "base": (31, 151, 235, 255),
        "dark": (9, 70, 132, 210),
        "highlight": (150, 231, 255, 190),
        "glass": (147, 227, 238),
    },
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def alpha_bbox(im: Image.Image):
    return im.convert("RGBA").getchannel("A").getbbox()


def weighted_alpha_centroid(im: Image.Image, threshold: int = 180) -> tuple[float, float] | None:
    a = im.convert("RGBA").getchannel("A")
    pix = a.load()
    sw = sx = sy = 0
    for y in range(a.height):
        for x in range(a.width):
            v = pix[x, y]
            if v >= threshold:
                sw += v
                sx += x * v
                sy += y * v
    if not sw:
        return None
    return sx / sw, sy / sw


def large_components(mask: Image.Image, minimum: int = 1000) -> list[dict]:
    m = mask.convert("L")
    px = m.load()
    w, h = m.size
    seen: set[tuple[int, int]] = set()
    out: list[dict] = []
    for y in range(h):
        for x in range(w):
            if px[x, y] == 0 or (x, y) in seen:
                continue
            q = [(x, y)]
            seen.add((x, y))
            pts: list[tuple[int, int]] = []
            for qx, qy in q:
                pts.append((qx, qy))
                for nx, ny in ((qx + 1, qy), (qx - 1, qy), (qx, qy + 1), (qx, qy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny] and (nx, ny) not in seen:
                        seen.add((nx, ny))
                        q.append((nx, ny))
            if len(pts) >= minimum:
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                out.append(
                    {
                        "size": len(pts),
                        "bbox": (min(xs), min(ys), max(xs) + 1, max(ys) + 1),
                        "centroid": (sum(xs) / len(xs), sum(ys) / len(ys)),
                        "points": pts,
                    }
                )
    out.sort(key=lambda c: c["size"], reverse=True)
    return out


def detect_lens_mask(item: str, im: Image.Image) -> tuple[Image.Image, list[dict]]:
    rgba = im.convert("RGBA")
    pix = rgba.load()
    mask = Image.new("L", rgba.size, 0)
    mp = mask.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pix[x, y]
            if item == "glasses-racer":
                is_lens = 140 <= a <= 175 and r >= 185 and 115 <= g <= 220 and b <= 150
            else:
                is_lens = 140 <= a <= 175 and 75 <= r <= 185 and g >= 175 and b >= 175
            if is_lens:
                mp[x, y] = 255
    comps = large_components(mask, minimum=1000)[:2]
    if len(comps) != 2:
        raise RuntimeError(f"{item}: expected 2 large lens components, got {len(comps)}")
    clean = Image.new("L", rgba.size, 0)
    cp = clean.load()
    for comp in comps:
        for x, y in comp["points"]:
            cp[x, y] = 255
    comps.sort(key=lambda c: c["centroid"][0])
    return clean, comps


def endpoint_y(im: Image.Image, x0: int, x1: int, fallback: int) -> int:
    a = im.convert("RGBA").getchannel("A")
    px = a.load()
    ys: list[int] = []
    for y in range(a.height):
        for x in range(max(0, x0), min(a.width, x1)):
            if px[x, y] >= 96:
                ys.append(y)
    return round(sum(ys) / len(ys)) if ys else fallback


def overlay_color(dst: Image.Image, mask: Image.Image, rgba: tuple[int, int, int, int]) -> Image.Image:
    layer = Image.new("RGBA", dst.size, rgba)
    alpha = mask.convert("L")
    if rgba[3] != 255:
        alpha = alpha.point(lambda v: round(v * rgba[3] / 255))
    layer.putalpha(alpha)
    return Image.alpha_composite(dst, layer)


def repair_master(item: str, original: Image.Image) -> tuple[Image.Image, dict]:
    original = original.convert("RGBA")
    lens_mask, comps = detect_lens_mask(item, original)
    left, right = comps
    colors = FRAME_COLORS[item]

    # Start with a subtle depth/shadow shell around the two lens rims.
    repaired = Image.new("RGBA", original.size, (0, 0, 0, 0))
    dilated = lens_mask.filter(ImageFilter.MaxFilter(17))
    rim = ImageChops.subtract(dilated, lens_mask)

    # Lower-right thickness shadow, then clean colored rim.
    shadow_mask = Image.new("L", original.size, 0)
    shadow_mask.paste(rim, (2, 3))
    repaired = overlay_color(repaired, shadow_mask, colors["dark"])
    repaired = overlay_color(repaired, rim, colors["base"])

    # Put the original art back on top so design-specific frame details remain.
    repaired = Image.alpha_composite(repaired, original)

    # Make the two actual lens interiors visibly translucent rather than opaque.
    rp = repaired.load()
    lm = lens_mask.load()
    glass_rgb = colors["glass"]
    for y in range(repaired.height):
        for x in range(repaired.width):
            if not lm[x, y]:
                continue
            r, g, b, a = rp[x, y]
            # Preserve the original tint but reduce alpha to ~28%.
            nr = round(r * 0.72 + glass_rgb[0] * 0.28)
            ng = round(g * 0.72 + glass_rgb[1] * 0.28)
            nb = round(b * 0.72 + glass_rgb[2] * 0.28)
            rp[x, y] = (nr, ng, nb, 72)

    draw = ImageDraw.Draw(repaired, "RGBA")
    lb = left["bbox"]
    rb = right["bbox"]
    ly = round(left["centroid"][1])
    ry = round(right["centroid"][1])
    cy = round((ly + ry) / 2)

    # Reinforce a physically legible nose bridge with shadow + bright body.
    bridge_a = (lb[2] - 1, cy)
    bridge_b = (rb[0] + 1, cy)
    draw.line((bridge_a, bridge_b), fill=colors["dark"], width=11)
    draw.line((bridge_a, bridge_b), fill=colors["base"], width=7)
    draw.line(((bridge_a[0] + 2, cy - 2), (bridge_b[0] - 2, cy - 2)), fill=colors["highlight"], width=2)

    # Reinforce temple arms to visibly reach toward the ears.
    ab = alpha_bbox(original)
    if not ab:
        raise RuntimeError(f"{item}: original master has no alpha")
    x0, y0, x1, y1 = ab
    left_end_y = endpoint_y(original, x0, x0 + 14, cy - 10)
    right_end_y = endpoint_y(original, x1 - 14, x1, cy - 10)
    left_start = (lb[0] - 5, ly)
    left_end = (x0 + 2, left_end_y)
    right_start = (rb[2] + 4, ry)
    right_end = (x1 - 3, right_end_y)
    for a, b in ((left_start, left_end), (right_start, right_end)):
        draw.line((a, b), fill=colors["dark"], width=11)
        draw.line((a, b), fill=colors["base"], width=7)
        draw.line(((a[0], a[1] - 2), (b[0], b[1] - 2)), fill=colors["highlight"], width=2)

    # Add restrained glass highlights; these remain translucent and do not cover eyes.
    for comp in (left, right):
        bx0, by0, bx1, by1 = comp["bbox"]
        hx0 = bx0 + round((bx1 - bx0) * 0.18)
        hy0 = by0 + round((by1 - by0) * 0.18)
        hx1 = bx0 + round((bx1 - bx0) * 0.42)
        hy1 = by0 + round((by1 - by0) * 0.30)
        draw.line((hx0, hy0, hx1, hy1), fill=(255, 255, 255, 82), width=3)

    return repaired, {
        "lensComponents": [
            {"size": c["size"], "bbox": c["bbox"], "centroid": c["centroid"]} for c in (left, right)
        ],
        "alphaBBoxBefore": alpha_bbox(original),
        "alphaBBoxAfter": alpha_bbox(repaired),
        "lensAlphaAfter": 72,
        "bridgeY": cy,
        "templeEndpoints": {"left": left_end, "right": right_end},
    }


def shift_canvas(im: Image.Image, dx: int, dy: int) -> Image.Image:
    if dx == 0 and dy == 0:
        return im
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.alpha_composite(im, (dx, dy))
    return out


def fit_master(master: Image.Image, reference: Image.Image) -> tuple[Image.Image, dict]:
    mb = alpha_bbox(master)
    rb = alpha_bbox(reference)
    if not mb or not rb:
        raise ValueError("missing alpha bbox")
    crop = master.crop(mb)
    tx0, ty0, tx1, ty1 = rb
    tw, th = tx1 - tx0, ty1 - ty0

    # B07 repair01 intentionally fills the reviewed reference footprint more closely.
    inset = 0.98
    maxw, maxh = max(1, int(tw * inset)), max(1, int(th * inset))
    scale = min(maxw / crop.width, maxh / crop.height)
    nw, nh = max(1, round(crop.width * scale)), max(1, round(crop.height * scale))
    crop = crop.resize((nw, nh), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (1024, 1536), (0, 0, 0, 0))
    cx, cy = (tx0 + tx1) // 2, (ty0 + ty1) // 2
    x, y = cx - nw // 2, cy - nh // 2
    canvas.alpha_composite(crop, (x, y))

    # Align the physical frame centroid (high alpha), not just the bounding-box center.
    ref_cent = weighted_alpha_centroid(reference, threshold=180)
    cand_cent = weighted_alpha_centroid(canvas, threshold=180)
    dx = dy = 0
    if ref_cent and cand_cent:
        dx = round(ref_cent[0] - cand_cent[0])
        dy = round(ref_cent[1] - cand_cent[1])
        canvas = shift_canvas(canvas, dx, dy)

    return canvas, {
        "referenceBBox": rb,
        "candidateBBox": alpha_bbox(canvas),
        "scale": scale,
        "initialPlacement": (x, y),
        "centroidReference": ref_cent,
        "centroidCandidateBeforeShift": cand_cent,
        "centroidShift": (dx, dy),
        "centroidCandidateAfterShift": weighted_alpha_centroid(canvas, threshold=180),
    }


def main() -> int:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    repaired_masters: dict[str, Path] = {}
    master_reports: dict[str, dict] = {}

    for item, (b64name, original_name, repaired_name) in MASTER_MAP.items():
        raw = base64.b64decode((BRIDGE / b64name).read_text(encoding="utf-8").strip())
        original_path = BRIDGE / original_name
        original_path.write_bytes(raw)
        original = Image.open(original_path).convert("RGBA")
        repaired, info = repair_master(item, original)
        repaired_path = BRIDGE / repaired_name
        repaired.save(repaired_path, "WEBP", lossless=True, method=6)
        repaired_masters[item] = repaired_path
        master_reports[item] = {
            "original": str(original_path.relative_to(ROOT)),
            "originalSha256": sha256_file(original_path),
            "repaired": str(repaired_path.relative_to(ROOT)),
            "repairedSha256": sha256_file(repaired_path),
            **info,
        }

    rows: list[dict] = []
    for prod in data["products"]:
        item = prod["itemId"]
        master = Image.open(repaired_masters[item]).convert("RGBA")
        for role in prod["roles"]:
            ref = ROOT / role["currentRuntime"][0]
            reference = Image.open(ref).convert("RGBA")
            cand, fit = fit_master(master, reference)
            out = ROOT / role["candidateOutputs"][0]
            out.parent.mkdir(parents=True, exist_ok=True)
            cand.save(out, "WEBP", lossless=True, method=6)
            rows.append(
                {
                    "itemId": item,
                    "avatarId": role["avatarId"],
                    "reference": str(ref.relative_to(ROOT)),
                    "candidate": str(out.relative_to(ROOT)),
                    "candidateSha256": sha256_file(out),
                    "candidateBytes": out.stat().st_size,
                    "size": cand.size,
                    "mode": cand.mode,
                    **fit,
                }
            )

    payload = {
        "schemaVersion": 1,
        "suite": "v65-b07-candidate-repair01",
        "status": "BUILT_REPAIR01_NOT_VISUALLY_PROMOTED",
        "repairIntent": [
            "reduce lens opacity so eyes remain visible",
            "add readable frame depth",
            "reinforce nose bridge and temple-arm contact",
            "align high-alpha frame centroid to reviewed V6.4 role footprint",
        ],
        "masters": master_reports,
        "rows": rows,
    }
    REPORT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "OK", "rows": len(rows), "report": str(REPORT.relative_to(ROOT))}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
