#!/usr/bin/env python3
"""Generate V6.5 delivery-only display derivatives from already accepted artwork.

This script never changes an art master and never marks art as accepted. It only
creates smaller delivery files for known UI paint sizes, with explicit lineage.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public/assets/v6.5/display"
EVIDENCE = ROOT / "qa/v65/performance/display-derivatives.json"

ASSETS = [
    {
        "id": "brand-logo-256",
        "source": "public/assets/v5/brand/little-explorers-logo-v2.png",
        "sourceSha256": "056b8a3eb51adaef9606a0ef17f4e75f98dd5219ff4ae1e9d46d9390badb102b",
        "output": "public/assets/v6.5/display/little-explorers-logo-v2-256.webp",
        "width": 256,
        "height": 101,
        "quality": 92,
        "scope": "delivery-only derivative; accepted V5/V6.4 brand art remains the master",
    },
    {
        "id": "brand-logo-384",
        "source": "public/assets/v5/brand/little-explorers-logo-v2.png",
        "sourceSha256": "056b8a3eb51adaef9606a0ef17f4e75f98dd5219ff4ae1e9d46d9390badb102b",
        "output": "public/assets/v6.5/display/little-explorers-logo-v2-384.webp",
        "width": 384,
        "height": 151,
        "quality": 100,
        "scope": "delivery-only high-DPR derivative; accepted V5/V6.4 brand art remains the master",
    },
    {
        "id": "header-rocket-poster-384",
        "source": "public/assets/v5/animations/rocket-flyby-poster.webp",
        "sourceSha256": "cf33a514574715b850617ba8412d684e70c9896da610309875fedd3bebc81706",
        "output": "public/assets/v6.5/display/rocket-flyby-poster-384.webp",
        "width": 384,
        "height": 384,
        "quality": 100,
        "scope": "delivery-only header poster derivative; accepted V5 animation poster remains the master",
    },
]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    EVIDENCE.parent.mkdir(parents=True, exist_ok=True)
    existing_payload = None
    existing_records: dict[str, dict] = {}
    if EVIDENCE.exists():
        try:
            existing_payload = json.loads(EVIDENCE.read_text(encoding="utf-8"))
            existing_records = {record["id"]: record for record in existing_payload.get("records", [])}
        except (json.JSONDecodeError, KeyError, TypeError) as error:
            raise SystemExit(f"REFUSE_CORRUPT_EVIDENCE: {error}") from error

    records = []
    generated = False
    for spec in ASSETS:
        source = ROOT / spec["source"]
        output = ROOT / spec["output"]
        actual_source_sha = sha(source)
        if actual_source_sha != spec["sourceSha256"]:
            raise SystemExit(
                f"REFUSE_SOURCE_DRIFT {spec['id']}: expected {spec['sourceSha256']} got {actual_source_sha}"
            )

        previous = existing_records.get(spec["id"])
        if output.exists():
            if not previous:
                raise SystemExit(f"REFUSE_UNTRACKED_OUTPUT {spec['id']}: {spec['output']}")
            actual_output_sha = sha(output)
            if actual_output_sha != previous.get("outputSha256"):
                raise SystemExit(
                    f"REFUSE_OUTPUT_DRIFT {spec['id']}: expected {previous.get('outputSha256')} got {actual_output_sha}"
                )
            with Image.open(output) as decoded:
                decoded.load()
                if decoded.size != (spec["width"], spec["height"]):
                    raise SystemExit(f"DECODE_DIMENSION_MISMATCH {spec['id']}: {decoded.size}")
            records.append(previous)
            continue

        if previous:
            raise SystemExit(f"REFUSE_MISSING_FROZEN_OUTPUT {spec['id']}: {spec['output']}")

        with Image.open(source) as image:
            original_size = image.size
            derivative = image.convert("RGBA").resize(
                (spec["width"], spec["height"]), Image.Resampling.LANCZOS
            )
            derivative.save(output, "WEBP", quality=spec["quality"], method=6, exact=True)
        with Image.open(output) as decoded:
            decoded.load()
            if decoded.size != (spec["width"], spec["height"]):
                raise SystemExit(f"DECODE_DIMENSION_MISMATCH {spec['id']}: {decoded.size}")
        records.append(
            {
                **spec,
                "sourceSize": list(original_size),
                "sourceBytes": source.stat().st_size,
                "outputBytes": output.stat().st_size,
                "outputSha256": sha(output),
                "decoded": True,
            }
        )
        generated = True

    payload = {
        "status": "PASS_DELIVERY_DERIVATIVES_ONLY" if generated else "PASS_FROZEN_DELIVERY_DERIVATIVES",
        "scope": "performance delivery only; no new art acceptance and no master replacement",
        "records": records,
    }
    if generated:
        EVIDENCE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
