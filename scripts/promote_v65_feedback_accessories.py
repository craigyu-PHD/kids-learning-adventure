#!/usr/bin/env python3
"""Promote the reviewed V6.5 feedback-r1 accessory candidate exactly once."""
from __future__ import annotations

import hashlib
import json
import shutil
import sys
import time
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CANDIDATES = ROOT / "qa/v65/user-feedback-r1/accessory-candidates"
ATTEMPTS = ROOT / "qa/v65/user-feedback-r1/promotion-attempts"
RUNTIME = ROOT / "public/assets/v6.5/runtime"
MANIFEST = ROOT / "src/data/avatarAssetManifest.json"
AVATARS = ("brother", "younger", "sister", "younger-sister")
ITEMS = (
    "starter-sky-glasses", "sky-view-glasses", "glasses-racer", "glasses-star",
    "glasses-holo", "glasses-legend", "sister-heart-glasses",
    "starter-buddy-headphones", "story-headphones", "phones-sky", "phones-racer",
    "phones-ai", "phones-legend", "sister-cat-headphones",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    errors: list[str] = []
    manifest = json.loads(MANIFEST.read_text())
    by_id = {row["id"]: row for row in manifest["accessories"]}
    rows = []
    for item in ITEMS:
        entry = by_id.get(item)
        if not entry:
            errors.append(f"manifest item missing: {item}")
            continue
        for avatar in AVATARS:
            source = CANDIDATES / item / avatar / "overlay.webp"
            destination = RUNTIME / avatar / f"{item}.webp"
            expected = str(destination.relative_to(ROOT))
            current_manifest_path = entry.get("variants", {}).get(avatar)
            current = ROOT / current_manifest_path if current_manifest_path else None
            if not source.is_file() or current is None or not current.is_file():
                errors.append(f"missing candidate/current runtime: {item}/{avatar}")
                continue
            with Image.open(source) as image:
                if image.size != (1024, 1536) or image.mode != "RGBA":
                    errors.append(f"invalid candidate canvas: {item}/{avatar} {image.size} {image.mode}")
                alpha = image.getchannel("A")
                if not alpha.getbbox() or alpha.getextrema()[0] != 0:
                    errors.append(f"invalid candidate alpha: {item}/{avatar}")
            rows.append({
                "itemId": item,
                "avatarId": avatar,
                "source": str(source.relative_to(ROOT)),
                "destination": expected,
                "manifestPathBefore": current_manifest_path,
                "beforeSha256": sha256(current),
                "destinationBeforeSha256": sha256(destination) if destination.is_file() else None,
                "candidateSha256": sha256(source),
            })
    if len(rows) != 56:
        errors.append(f"expected 56 rows, got {len(rows)}")
    if errors:
        print(json.dumps({"status": "FAIL", "errors": errors}, ensure_ascii=False, indent=2))
        return 1

    attempt_id = time.strftime("%Y%m%d-%H%M%S")
    attempt = ATTEMPTS / attempt_id
    attempt.mkdir(parents=True, exist_ok=False)
    backup = attempt / "runtime-before"
    manifest_before = MANIFEST.read_bytes()
    (attempt / "avatarAssetManifest.original.json").write_bytes(manifest_before)
    for row in rows:
        destination = ROOT / row["destination"]
        current = ROOT / row["manifestPathBefore"]
        backup_path = backup / row["avatarId"] / current.name
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(current, backup_path)
        if destination.is_file() and destination != current:
            destination_backup = backup / row["avatarId"] / f"destination-{destination.name}"
            shutil.copy2(destination, destination_backup)
        shutil.copy2(ROOT / row["source"], destination)
        by_id[row["itemId"]]["variants"][row["avatarId"]] = row["destination"]
        row["afterSha256"] = sha256(destination)
        row["promotedExactly"] = row["afterSha256"] == row["candidateSha256"]
    manifest_after = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode()
    MANIFEST.write_bytes(manifest_after)
    report = {
        "status": "PASS" if all(row["promotedExactly"] for row in rows) else "FAIL",
        "attemptId": attempt_id,
        "copyCount": len(rows),
        "manifestChanged": manifest_after != manifest_before,
        "manifestFieldChangeCount": sum(row["manifestPathBefore"] != row["destination"] for row in rows),
        "manifestBeforeSha256": hashlib.sha256(manifest_before).hexdigest(),
        "manifestAfterSha256": sha256(MANIFEST),
        "visualBoards": [
            "qa/v65/user-feedback-r1/accessory-candidates/glasses-all-avatars-board.webp",
            "qa/v65/user-feedback-r1/accessory-candidates/headphones-all-avatars-board.webp",
        ],
        "rows": rows,
    }
    (attempt / "promotion-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"status": report["status"], "attemptId": attempt_id, "copyCount": len(rows)}, ensure_ascii=False))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
