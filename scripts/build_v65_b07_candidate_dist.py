#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "src/data/avatarAssetManifest.json"
OUT_DIR = ROOT / "qa/v65/art-workpacks/B07/candidate-dist"
EVIDENCE = ROOT / "qa/v65/art-workpacks/B07/candidate-dist-build.json"
ITEMS = ("sky-view-glasses", "glasses-racer", "glasses-star")
AVATARS = ("brother", "younger", "sister", "younger-sister")


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    original = MANIFEST.read_bytes()
    original_sha = sha_bytes(original)
    payload = json.loads(original.decode("utf-8"))
    entries = {entry.get("id"): entry for entry in payload.get("accessories", [])}
    changes: list[dict[str, str]] = []
    candidates: dict[str, str] = {}
    for item in ITEMS:
        entry = entries.get(item)
        if not entry:
            raise RuntimeError(f"manifest accessory missing: {item}")
        variants = entry.setdefault("variants", {})
        for avatar in AVATARS:
            candidate_rel = f"public/assets/v6.5/art-candidates/B07/{avatar}/{item}.webp"
            candidate = ROOT / candidate_rel
            if not candidate.exists():
                raise RuntimeError(f"candidate missing: {candidate_rel}")
            old = variants.get(avatar)
            variants[avatar] = candidate_rel
            changes.append({"itemId": item, "avatarId": avatar, "from": str(old), "to": candidate_rel})
            candidates[f"{item}:{avatar}"] = sha_file(candidate)

    patched_text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    patched_sha = sha_bytes(patched_text.encode("utf-8"))
    result: dict = {
        "schemaVersion": 1,
        "suite": "v65-b07-candidate-dist-build",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "manifestBeforeSha256": original_sha,
        "manifestPatchedSha256": patched_sha,
        "candidateHashes": candidates,
        "temporaryBindings": changes,
        "outDir": str(OUT_DIR.relative_to(ROOT)),
    }
    rc = 1
    try:
        MANIFEST.write_text(patched_text, encoding="utf-8")
        proc = subprocess.run(
            ["npx", "vite", "build", "--outDir", str(OUT_DIR.relative_to(ROOT)), "--emptyOutDir"],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
        result["buildExitCode"] = proc.returncode
        result["buildOutputTail"] = proc.stdout[-12000:]
        if proc.returncode != 0:
            raise RuntimeError(f"vite build failed with {proc.returncode}")
        index = OUT_DIR / "index.html"
        if not index.exists():
            raise RuntimeError("candidate dist index.html missing")
        result["indexSha256"] = sha_file(index)
        rc = 0
    except Exception as exc:
        result["error"] = f"{type(exc).__name__}: {exc}"
    finally:
        MANIFEST.write_bytes(original)
        restored = MANIFEST.read_bytes()
        restored_sha = sha_bytes(restored)
        result["manifestAfterSha256"] = restored_sha
        result["manifestRestoredByteIdentical"] = restored == original
        result["status"] = "PASS" if rc == 0 and restored == original else "FAIL"
        EVIDENCE.parent.mkdir(parents=True, exist_ok=True)
        EVIDENCE.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({
            "status": result["status"],
            "buildExitCode": result.get("buildExitCode"),
            "manifestBeforeSha256": original_sha,
            "manifestAfterSha256": restored_sha,
            "manifestRestoredByteIdentical": result["manifestRestoredByteIdentical"],
            "outDir": result["outDir"],
            "error": result.get("error"),
        }, ensure_ascii=False, indent=2))
    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
