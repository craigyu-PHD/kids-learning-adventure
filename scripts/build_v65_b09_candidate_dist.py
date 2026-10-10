#!/usr/bin/env python3
"""Build an isolated B09 candidate; always restore manifest bytes and retain failure evidence."""
from __future__ import annotations

import hashlib
import json
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BATCH = ROOT / "qa/v65/art-workpacks/B09"
MANIFEST = ROOT / "src/data/avatarAssetManifest.json"
OUT_DIR = BATCH / "candidate-dist"
EVIDENCE = BATCH / "candidate-dist-build.json"
ADMISSION = BATCH / "source-admission-static-v1.json"
CANDIDATE_REPORT = BATCH / "candidate-build-report.json"
ITEMS = ("story-headphones", "phones-sky", "phones-racer")
AVATARS = ("brother", "younger", "sister", "younger-sister")


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha_file(path: Path) -> str:
    return sha_bytes(path.read_bytes())


def fingerprint(mapping: dict) -> str:
    return sha_bytes(json.dumps(mapping, sort_keys=True, separators=(",", ":")).encode())


def relative_file(value: str) -> Path:
    path = (ROOT / value).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        raise ValueError(f"invalid/missing project file: {value}")
    return path


def candidate_path(item: str, avatar: str) -> Path:
    return ROOT / f"public/assets/v6.5/art-candidates/B09/{avatar}/{item}.webp"


def source_file_hashes() -> dict[str, str]:
    # Explicit source/code roots only. Later runtime/review/acceptance reports are
    # never inputs, so producing evidence cannot invalidate its own fingerprint.
    paths = {p for p in (ROOT / "src").rglob("*") if p.is_file()}
    for pattern in ("package*.json", "vite.config.*", "tsconfig*.json", "index.html"):
        paths.update(p for p in ROOT.glob(pattern) if p.is_file())
    paths.update(ROOT / p for p in (
        "scripts/build_v65_b09_candidates.py",
        "scripts/build_v65_b09_candidate_dist.py",
        "scripts/validate_v65_b09_acceptance.py",
        "scripts/test_v65_b09_negative_controls.py",
        "scripts/qa_v63_browser_seed.py",
        "scripts/qa_v64_4k_layout.py",
        "qa/v65/art-workpacks/B09/run-candidate-runtime-gate.py",
    ))
    for avatar in AVATARS:
        paths.update((ROOT / f"public/assets/v5/characters/{avatar}/wardrobe").glob("base-body.*"))
        paths.update((ROOT / f"public/assets/v6.4/avatar-display/{avatar}").glob("base-body-*.webp"))
    return {str(p.relative_to(ROOT)): sha_file(p) for p in sorted(paths)}


def input_snapshot() -> dict:
    admission = json.loads(ADMISSION.read_text())
    build = json.loads(CANDIDATE_REPORT.read_text())
    if admission.get("batchId") != "B09" or admission.get("status") != "ADMITTED_SOURCE_ONLY":
        raise ValueError("source admission is not B09 ADMITTED_SOURCE_ONLY")
    admission_sha = sha_file(ADMISSION)
    if build.get("sourceAdmission") != str(ADMISSION.relative_to(ROOT)) or build.get("sourceAdmissionSha256") != admission_sha:
        raise ValueError("candidate build is not bound to current source admission")
    if build.get("batchId") != "B09" or build.get("candidateCount") != 12:
        raise ValueError("candidate build identity/count mismatch")
    masters = admission.get("masters") or {}
    if set(masters) != set(ITEMS):
        raise ValueError("source admission master coverage mismatch")
    cleaned = {}
    for item, entry in masters.items():
        path = relative_file(entry["path"])
        actual = sha_file(path)
        if entry.get("sha256") != actual:
            raise ValueError(f"cleaned source hash mismatch: {item}")
        cleaned[item] = {"path": entry["path"], "sha256": actual}
    candidates = {}
    for row in build.get("rows", []):
        item, avatar = row.get("itemId"), row.get("avatarId")
        if item not in ITEMS or avatar not in AVATARS or f"{item}:{avatar}" in candidates:
            raise ValueError(f"unexpected/duplicate candidate row: {item}/{avatar}")
        path = candidate_path(item, avatar)
        actual = sha_file(path)
        if row.get("candidate") != str(path.relative_to(ROOT)) or row.get("sha256") != actual:
            raise ValueError(f"candidate report hash/path mismatch: {item}/{avatar}")
        if row.get("master") != cleaned[item]["path"] or row.get("masterSha256") != cleaned[item]["sha256"]:
            raise ValueError(f"candidate cleaned-source binding mismatch: {item}/{avatar}")
        candidates[f"{item}:{avatar}"] = actual
    if set(candidates) != {f"{i}:{a}" for i in ITEMS for a in AVATARS}:
        raise ValueError("candidate coverage mismatch")
    sources = source_file_hashes()
    return {
        "sourceAdmissionSha256": admission_sha,
        "candidateBuildReportSha256": sha_file(CANDIDATE_REPORT),
        "cleanedSources": cleaned,
        "candidateHashes": candidates,
        "sourceFiles": sources,
        "sourceFilesFingerprint": fingerprint(sources),
    }


def dist_snapshot() -> dict[str, str]:
    if not (OUT_DIR / "index.html").is_file():
        raise ValueError("candidate dist index missing")
    return {str(p.relative_to(OUT_DIR)): sha_file(p)
            for p in sorted(OUT_DIR.rglob("*")) if p.is_file()}


def v64_hashes() -> dict[str, str]:
    return {str(p.relative_to(ROOT)): sha_file(p)
            for p in sorted((ROOT / "public/assets/v6.4/runtime").rglob("*")) if p.is_file()}


def verify_dist_report(report: dict) -> list[str]:
    issues = []
    if report.get("status") != "PASS" or report.get("candidateOnly") is not True:
        issues.append("candidate dist build not PASS/candidate-only")
    if report.get("manifestRestoredByteIdentical") is not True or report.get("noV64RuntimeOverwrite") is not True:
        issues.append("manifest restoration/V64 preservation unverified")
    if report.get("buildExitCode") != 0:
        issues.append("candidate build exit code not zero")
    try:
        inputs = input_snapshot()
        if report.get("inputSnapshot") != inputs or report.get("inputFingerprint") != fingerprint(inputs):
            issues.append("current inputs differ from candidate build")
        outputs = dist_snapshot()
        if report.get("distFiles") != outputs or report.get("distFingerprint") != fingerprint(outputs):
            issues.append("candidate build outputs changed")
        if report.get("manifestBeforeSha256") != sha_file(MANIFEST):
            issues.append("current manifest differs from restored build baseline")
    except Exception as exc:
        issues.append(f"{type(exc).__name__}: {exc}")
    return issues


def main() -> int:
    result = {"schemaVersion": 2, "suite": "v65-b09-candidate-dist-build",
              "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
              "candidateOnly": True, "outDir": str(OUT_DIR.relative_to(ROOT)), "status": "FAIL"}
    original = None
    before_v64 = None
    patched = False
    try:
        original = MANIFEST.read_bytes()
        result["manifestBeforeSha256"] = sha_bytes(original)
        inputs = input_snapshot()
        result["inputSnapshot"] = inputs
        result["inputFingerprint"] = fingerprint(inputs)
        result["candidateHashes"] = inputs["candidateHashes"]
        before_v64 = v64_hashes()
        payload = json.loads(original)
        entries = {entry["id"]: entry for entry in payload["accessories"]}
        changes = []
        for item in ITEMS:
            entry = entries[item]
            if entry.get("renderer") != "aligned-overlay":
                raise ValueError(f"unexpected candidate renderer: {item}")
            for avatar in AVATARS:
                target = str(candidate_path(item, avatar).relative_to(ROOT))
                changes.append({"itemId": item, "avatarId": avatar,
                                "from": entry["variants"].get(avatar), "to": target})
                entry["variants"][avatar] = target
            # Do not retain a higher-priority old default/headwear alternate path.
            # This isolated matrix exercises the default base without a hat.
            entry.pop("defaultSkinDetails", None)
            entry.pop("headwearVariants", None)
        patched_bytes = (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode()
        result["temporaryBindings"] = changes
        result["manifestPatchedSha256"] = sha_bytes(patched_bytes)
        patched = True
        MANIFEST.write_bytes(patched_bytes)
        proc = subprocess.run(["npx", "vite", "build", "--outDir", str(OUT_DIR.relative_to(ROOT)),
                               "--emptyOutDir"], cwd=ROOT, text=True, stdout=subprocess.PIPE,
                              stderr=subprocess.STDOUT, check=False)
        result["buildExitCode"] = proc.returncode
        result["buildOutputTail"] = proc.stdout[-12000:]
        if proc.returncode:
            raise RuntimeError(f"vite build failed: {proc.returncode}")
        outputs = dist_snapshot()
        for item in ITEMS:
            for avatar in AVATARS:
                rel = f"assets/v6.5/art-candidates/B09/{avatar}/{item}.webp"
                if outputs.get(rel) != inputs["candidateHashes"][f"{item}:{avatar}"]:
                    raise ValueError(f"dist candidate byte mismatch: {item}/{avatar}")
        result["distFiles"] = outputs
        result["distFingerprint"] = fingerprint(outputs)
        result["indexSha256"] = outputs["index.html"]
        result["status"] = "PASS"
    except Exception as exc:
        result["error"] = f"{type(exc).__name__}: {exc}"
    finally:
        try:
            if patched and original is not None:
                MANIFEST.write_bytes(original)
            restored = original is not None and MANIFEST.read_bytes() == original
            result["manifestRestoredByteIdentical"] = restored
            result["manifestAfterSha256"] = sha_file(MANIFEST) if MANIFEST.exists() else None
            result["noV64RuntimeOverwrite"] = before_v64 is not None and before_v64 == v64_hashes()
            if not restored or not result["noV64RuntimeOverwrite"]:
                result["status"] = "FAIL"
            if result["status"] == "PASS" and input_snapshot() != result["inputSnapshot"]:
                result["status"] = "FAIL"
                result["error"] = "source inputs changed during candidate build"
        except Exception as exc:
            result["status"] = "FAIL"
            result["restoreError"] = f"{type(exc).__name__}: {exc}"
        EVIDENCE.parent.mkdir(parents=True, exist_ok=True)
        EVIDENCE.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
        print(json.dumps({k: result.get(k) for k in ("status", "outDir", "buildExitCode",
                         "manifestRestoredByteIdentical", "noV64RuntimeOverwrite", "error", "restoreError")},
                         ensure_ascii=False, indent=2))
    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
