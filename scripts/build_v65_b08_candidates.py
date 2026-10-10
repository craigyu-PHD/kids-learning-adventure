#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
WORKPACK = ROOT / "qa/v65/art-workpacks/B08"
BRIDGE = WORKPACK / ".bridge"
MANIFEST = WORKPACK / "manifest.json"

MASTER_MAP = {
    "glasses-holo": BRIDGE / "glasses-holo-master.webp",
    "glasses-legend": BRIDGE / "glasses-legend-master.webp",
    "sister-heart-glasses": BRIDGE / "sister-heart-glasses-master.webp",
}

# Calibrated from B08 4-role preview review in the 2026-09-18 session.
# Width is relative to the existing V6.4 aligned-overlay reference bbox.
# Y shift corrects the current V6.4 art's low-on-face placement.
FIT = {
    "glasses-holo": {"widthScale": 0.96, "yShift": -55},
    "glasses-legend": {"widthScale": 0.96, "yShift": -55},
    "sister-heart-glasses": {"widthScale": 0.98, "yShift": -58},
}

CANVAS = (1024, 1536)


def alpha_bbox(im: Image.Image):
    return im.getchannel("A").getbbox()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fit_master(master: Image.Image, target_bbox, width_scale: float, y_shift: int) -> Image.Image:
    bbox = alpha_bbox(master)
    if not bbox:
        raise ValueError("master has no alpha content")
    crop = master.crop(bbox)

    x0, y0, x1, y1 = target_bbox
    tw, th = x1 - x0, y1 - y0
    new_w = max(1, round(tw * width_scale))
    new_h = max(1, round(crop.height * (new_w / crop.width)))

    # Preserve readable frame thickness without letting the master become face-covering.
    max_h = max(1, round(th * 1.10))
    if new_h > max_h:
        scale = max_h / crop.height
        new_w = max(1, round(crop.width * scale))
        new_h = max(1, round(crop.height * scale))

    fitted = crop.resize((new_w, new_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))

    cx = (x0 + x1) // 2
    cy = (y0 + y1) // 2 + y_shift
    canvas.alpha_composite(fitted, (cx - new_w // 2, cy - new_h // 2))
    return canvas


def main() -> int:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    rows = []

    for item_id, master_path in MASTER_MAP.items():
        if not master_path.exists():
            raise SystemExit(f"missing B08 master: {master_path.relative_to(ROOT)}")

        master = Image.open(master_path).convert("RGBA")
        if not alpha_bbox(master):
            raise SystemExit(f"master has no visible alpha: {master_path.relative_to(ROOT)}")

        product = next((p for p in data["products"] if p["itemId"] == item_id), None)
        if not product:
            raise SystemExit(f"manifest product missing: {item_id}")

        fit = FIT[item_id]
        for role in product["roles"]:
            ref_path = ROOT / role["currentRuntime"][0]
            ref = Image.open(ref_path).convert("RGBA")
            ref_bbox = alpha_bbox(ref)
            if not ref_bbox:
                raise SystemExit(f"reference has no alpha bbox: {ref_path.relative_to(ROOT)}")

            candidate = fit_master(
                master,
                ref_bbox,
                width_scale=fit["widthScale"],
                y_shift=fit["yShift"],
            )

            out_path = ROOT / role["candidateOutputs"][0]
            out_path.parent.mkdir(parents=True, exist_ok=True)
            candidate.save(out_path, "WEBP", quality=90, method=6)

            rows.append(
                {
                    "itemId": item_id,
                    "avatarId": role["avatarId"],
                    "master": str(master_path.relative_to(ROOT)),
                    "masterSha256": sha256(master_path),
                    "reference": str(ref_path.relative_to(ROOT)),
                    "referenceBBox": list(ref_bbox),
                    "candidate": str(out_path.relative_to(ROOT)),
                    "candidateBBox": list(alpha_bbox(candidate) or ()),
                    "fit": fit,
                    "size": list(candidate.size),
                    "bytes": out_path.stat().st_size,
                    "sha256": sha256(out_path),
                }
            )

    report = WORKPACK / "candidate-build-report.json"
    payload = {
        "schemaVersion": 1,
        "batchId": "B08",
        "status": "BUILT_CANDIDATE_ONLY_NOT_PROMOTED",
        "candidateCount": len(rows),
        "canvas": list(CANVAS),
        "fitCalibration": FIT,
        "rows": rows,
        "promotion": "NOT_STARTED",
        "v64RuntimeTouched": False,
    }
    report.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": payload["status"], "count": len(rows), "report": str(report.relative_to(ROOT))}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
