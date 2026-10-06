#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import shutil
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
B08 = ROOT / "qa/v65/art-workpacks/B08"
WORKPACK = B08 / "manifest.json"
AVATAR_MANIFEST = ROOT / "src/data/avatarAssetManifest.json"
ACCEPTANCE = B08 / "acceptance-integrity.json"
NEGATIVE = B08 / "runtime/negative-controls.json"
OUT = B08 / "promotion-report.json"

ITEMS = ("glasses-holo", "glasses-legend", "sister-heart-glasses")
AVATARS = ("brother", "younger", "sister", "younger-sister")


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    acceptance = load(ACCEPTANCE)
    negative = load(NEGATIVE)
    if acceptance.get("promotionReady") is not True:
        raise SystemExit("B08 promotion blocked: acceptance promotionReady != true")
    if negative.get("status") != "PASS":
        raise SystemExit("B08 promotion blocked: negative controls != PASS")

    workpack = load(WORKPACK)
    before = AVATAR_MANIFEST.read_bytes()
    before_sha = sha_bytes(before)
    manifest = json.loads(before.decode("utf-8"))
    entries = {e.get("id"): e for e in manifest.get("accessories", [])}

    copies = []
    bindings = []
    for product in workpack.get("products", []):
        item = product.get("itemId")
        if item not in ITEMS:
            continue
        entry = entries.get(item)
        if not entry:
            raise RuntimeError(f"avatar manifest missing item {item}")
        variants = entry.setdefault("variants", {})
        for role in product.get("roles", []):
            avatar = role.get("avatarId")
            if avatar not in AVATARS:
                raise RuntimeError(f"unexpected avatar {avatar}")
            candidates = role.get("candidateOutputs") or []
            promoted = role.get("promotedOutputs") or []
            if len(candidates) != 1 or len(promoted) != 1:
                raise RuntimeError(f"expected single candidate/promoted output: {item}/{avatar}")
            src = ROOT / candidates[0]
            dst = ROOT / promoted[0]
            if not src.exists():
                raise RuntimeError(f"missing candidate {src.relative_to(ROOT)}")
            expected = acceptance["candidateHashes"].get(f"{item}:{avatar}")
            current = sha(src)
            if current != expected:
                raise RuntimeError(f"candidate hash drift {item}/{avatar}")
            old_dst = sha(dst) if dst.exists() else None
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, dst)
            promoted_hash = sha(dst)
            if promoted_hash != current:
                raise RuntimeError(f"promotion hash mismatch {item}/{avatar}")
            old_binding = variants.get(avatar)
            variants[avatar] = promoted[0]
            copies.append({
                "itemId": item,
                "avatarId": avatar,
                "candidate": candidates[0],
                "promoted": promoted[0],
                "candidateSha256": current,
                "promotedSha256": promoted_hash,
                "previousPromotedSha256": old_dst,
            })
            bindings.append({
                "itemId": item,
                "avatarId": avatar,
                "from": old_binding,
                "to": promoted[0],
            })

    if len(copies) != 12:
        raise RuntimeError(f"promotion copy coverage {len(copies)} != 12")

    patched = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    AVATAR_MANIFEST.write_bytes(patched)
    after_sha = sha(AVATAR_MANIFEST)

    result = {
        "schemaVersion": 1,
        "suite": "v65-b08-promotion",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "status": "PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE",
        "candidateFingerprint": acceptance["candidateFingerprint"],
        "acceptanceSha256": sha(ACCEPTANCE),
        "negativeControlsSha256": sha(NEGATIVE),
        "avatarManifestBeforeSha256": before_sha,
        "avatarManifestAfterSha256": after_sha,
        "copies": copies,
        "bindings": bindings,
        "copyCount": len(copies),
        "v64RuntimeTouched": False,
        "productionDeployed": False,
    }
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": result["status"],
        "copyCount": len(copies),
        "candidateFingerprint": result["candidateFingerprint"],
        "avatarManifestBeforeSha256": before_sha,
        "avatarManifestAfterSha256": after_sha,
        "report": str(OUT.relative_to(ROOT)),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
