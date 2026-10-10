#!/usr/bin/env python3
"""Transactional LOCAL B09 promotion. Requires --execute; never deploys or commits."""
from __future__ import annotations
import argparse
import contextlib
import hashlib
import importlib.util
import io
import json
import os
import sys
import time
from pathlib import Path

from build_v65_b09_candidate_dist import (ROOT, ITEMS, AVATARS, MANIFEST, input_snapshot,
                                         fingerprint, sha_file, candidate_path)
import validate_v65_b09_acceptance as validator

BATCH = ROOT / "qa/v65/art-workpacks/B09"
WORKPACK = BATCH / "manifest.json"
NEGATIVE = BATCH / "runtime/negative-controls.json"
OUT = BATCH / "promotion-report.json"


def load(path: Path):
    return json.loads(path.read_text())


def hashes(paths):
    return {str(p.relative_to(ROOT)): sha_file(p) for p in sorted(set(paths)) if p.is_file()}


def protected_hashes():
    paths = list((ROOT / "public/assets/v6.4/runtime").rglob("*"))
    paths += list((ROOT / "qa/v65/art-workpacks/B08").rglob("*"))
    for item in ("glasses-holo", "glasses-legend", "sister-heart-glasses"):
        for avatar in AVATARS:
            paths.append(ROOT / f"public/assets/v6.5/runtime/{avatar}/{item}.webp")
    paths += list((ROOT / "scripts").glob("*b08*.py"))
    return hashes(paths)


def review_hashes():
    return hashes(list(validator.VISUAL_DIR.glob("*.json")) + list(validator.BOARD_DIR.glob("*.jpg"))
                  + [validator.RUNTIME_REPORT, validator.DIST_REPORT, validator.CANDIDATE_REPORT])


def atomic_bytes(path: Path, data: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + f".b09-{os.getpid()}.tmp")
    try:
        temp.write_bytes(data)
        temp.replace(path)
    finally:
        if temp.exists():
            temp.unlink()


def verify_promotion(report: dict) -> list[str]:
    errors = []
    if report.get("status") != "PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE":
        errors.append("promotion not completed locally")
    try:
        if report.get("promoterSha256") != sha_file(Path(__file__)):
            errors.append("promotion implementation changed")
        current = input_snapshot()
        if report.get("promotedInputs") != current or report.get("promotedInputFingerprint") != fingerprint(current):
            errors.append("promoted source inputs changed")
        if sha_file(MANIFEST) != report.get("avatarManifestAfterSha256"):
            errors.append("promoted manifest changed")
        if protected_hashes() != report.get("protectedHashes"):
            errors.append("V64/B08 protected files changed")
        if review_hashes() != report.get("reviewEvidenceHashes"):
            errors.append("candidate runtime/review evidence changed")
        if sha_file(NEGATIVE) != report.get("negativeControlsSha256"):
            errors.append("negative controls evidence changed")
        binding = report.get("negativeBinding") or {}
        if binding.get("negativeReportSha256") != sha_file(NEGATIVE) or binding.get("runtimeReportSha256") != sha_file(validator.RUNTIME_REPORT) or binding.get("candidateFingerprint") != report.get("candidateFingerprint"):
            errors.append("negative controls same-candidate binding changed")
        if binding.get("negativeScriptSha256") != sha_file(ROOT / "scripts/test_v65_b09_negative_controls.py") or binding.get("validatorSha256") != sha_file(Path(validator.__file__)):
            errors.append("negative/validator implementation changed")
        expected = {(i, a) for i in ITEMS for a in AVATARS}
        seen = set()
        manifest = {e["id"]: e for e in load(MANIFEST)["accessories"]}
        for row in report.get("copies", []):
            key = row.get("itemId"), row.get("avatarId")
            if key not in expected or key in seen:
                errors.append(f"unexpected/duplicate promoted row {key}")
                continue
            seen.add(key)
            destination = ROOT / f"public/assets/v6.5/runtime/{key[1]}/{key[0]}.webp"
            if row.get("promoted") != str(destination.relative_to(ROOT)) or sha_file(destination) != row.get("candidateSha256"):
                errors.append(f"promoted byte/path mismatch {key}")
            if sha_file(candidate_path(*key)) != row.get("candidateSha256"):
                errors.append(f"candidate changed after promotion {key}")
            entry = manifest[key[0]]
            if entry["variants"].get(key[1]) != row.get("promoted") or entry.get("defaultSkinDetails") or entry.get("headwearVariants"):
                errors.append(f"promoted manifest binding/alternate-path mismatch {key}")
        if seen != expected:
            errors.append("promoted coverage not exactly 12")
    except Exception as exc:
        errors.append(f"{type(exc).__name__}: {exc}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if not args.execute:
        parser.error("No changes made. Pass --execute only when local promotion is authorized.")
    result = {"schemaVersion": 2, "suite": "v65-b09-local-promotion",
              "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "status": "FAIL",
              "productionDeployed": False, "copies": [], "bindings": [],
              "promoterSha256": sha_file(Path(__file__))}
    before = None
    original_targets = {}
    mutations_started = False
    try:
        if OUT.exists() and load(OUT).get("status") == "PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE":
            raise RuntimeError("B09 already promoted; inspect existing report instead of replacing rollback evidence")
        before = MANIFEST.read_bytes()
        result["avatarManifestBeforeSha256"] = hashlib.sha256(before).hexdigest()
        acceptance = validator.run()
        if acceptance.get("promotionReady") is not True:
            raise RuntimeError("fresh acceptance validator promotionReady is not true")
        inputs_before = input_snapshot()
        evidence_before = review_hashes()
        protected = protected_hashes()
        # Re-execute frozen negative controls against the exact current runtime;
        # the binding envelope below ties their report to current candidate/source bytes.
        spec = importlib.util.spec_from_file_location("b09_negative_preflight", ROOT / "scripts/test_v65_b09_negative_controls.py")
        negative_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(negative_module)
        log = io.StringIO()
        with contextlib.redirect_stdout(log):
            negative_rc = negative_module.main()
        negative = load(NEGATIVE)
        if negative_rc != 0 or negative.get("status") != "PASS" or negative.get("baselineSameCandidatePass") is not True:
            raise RuntimeError("fresh negative controls failed")
        if input_snapshot() != inputs_before or review_hashes() != evidence_before:
            raise RuntimeError("candidate/source/review drift during negative controls")
        fresh = validator.run()
        if fresh.get("promotionReady") is not True or fresh != acceptance:
            raise RuntimeError("acceptance changed during preflight")
        manifest = json.loads(before)
        entries = {e["id"]: e for e in manifest["accessories"]}
        # Existing B09 entries had no alternate paths at implementation time.
        # New nonempty variants need a separate compatibility review, never silent deletion.
        removed = {}
        for item in ITEMS:
            entry = entries[item]
            if entry.get("renderer") != "aligned-overlay":
                raise RuntimeError(f"unexpected renderer {item}")
            removed[item] = {k: entry.get(k) for k in ("defaultSkinDetails", "headwearVariants") if k in entry}
            if any(removed[item].values()):
                raise RuntimeError(f"unreviewed high-priority alternate paths found for {item}; headwear compatibility gate required")
            entry.pop("defaultSkinDetails", None)
            entry.pop("headwearVariants", None)
        plan, seen = [], set()
        for product in load(WORKPACK).get("products", []):
            item = product.get("itemId")
            if item not in ITEMS:
                continue
            for role in product.get("roles", []):
                avatar = role.get("avatarId")
                key = item, avatar
                if avatar not in AVATARS or key in seen:
                    raise RuntimeError(f"duplicate/unexpected role {key}")
                seen.add(key)
                src = candidate_path(item, avatar)
                dst = ROOT / f"public/assets/v6.5/runtime/{avatar}/{item}.webp"
                if role.get("candidateOutputs") != [str(src.relative_to(ROOT))] or role.get("promotedOutputs") != [str(dst.relative_to(ROOT))]:
                    raise RuntimeError(f"workpack path contract mismatch {key}")
                data = src.read_bytes()
                digest = hashlib.sha256(data).hexdigest()
                if acceptance["candidateHashes"].get(f"{item}:{avatar}") != digest:
                    raise RuntimeError(f"candidate hash drift {key}")
                original_targets[dst] = dst.read_bytes() if dst.exists() else None
                plan.append((item, avatar, src, dst, data, digest))
        if seen != {(i, a) for i in ITEMS for a in AVATARS} or len(plan) != 12:
            raise RuntimeError("preflight coverage is not exactly 12")
        backup = BATCH / "promotion-backups" / str(time.time_ns())
        backup.mkdir(parents=True, exist_ok=False)
        (backup / "avatarAssetManifest.original.json").write_bytes(before)
        backup_rows = []
        for item, avatar, src, dst, data, digest in plan:
            old = original_targets[dst]
            saved = backup / avatar / f"{item}.webp"
            if old is not None:
                saved.parent.mkdir(parents=True, exist_ok=True)
                saved.write_bytes(old)
            backup_rows.append({"destination": str(dst.relative_to(ROOT)), "existed": old is not None,
                                "backup": str(saved.relative_to(ROOT)) if old is not None else None,
                                "sha256": hashlib.sha256(old).hexdigest() if old is not None else None})
        binding = {"candidateFingerprint": acceptance["candidateFingerprint"],
                   "inputFingerprint": fingerprint(inputs_before),
                   "runtimeReportSha256": sha_file(validator.RUNTIME_REPORT),
                   "validatorSha256": sha_file(Path(validator.__file__)),
                   "negativeScriptSha256": sha_file(ROOT / "scripts/test_v65_b09_negative_controls.py"),
                   "negativeReportSha256": sha_file(NEGATIVE), "freshNegativeExitCode": negative_rc}
        (backup / "preflight.json").write_text(json.dumps({"acceptance": acceptance,
            "negativeBinding": binding, "targetBackups": backup_rows,
            "protectedHashes": protected}, ensure_ascii=False, indent=2)+"\n")
        result.update({"backupDirectory": str(backup.relative_to(ROOT)), "negativeBinding": binding,
                       "negativeControlsSha256": sha_file(NEGATIVE),
                       "candidateFingerprint": acceptance["candidateFingerprint"],
                       "protectedHashes": protected, "reviewEvidenceHashes": evidence_before,
                       "removedAlternatePaths": removed,
                       "headwearHairCompatibility": "NOT_COVERED_BY_BASE_ONLY_48_CASES"})
        if MANIFEST.read_bytes() != before or input_snapshot() != inputs_before or protected_hashes() != protected:
            raise RuntimeError("inputs changed before first product write")
        mutations_started = True
        for item, avatar, src, dst, data, digest in plan:
            atomic_bytes(dst, data)
            if sha_file(dst) != digest:
                raise RuntimeError(f"copy verification failed {item}/{avatar}")
            entry = entries[item]
            result["bindings"].append({"itemId": item, "avatarId": avatar,
                "from": entry["variants"].get(avatar), "to": str(dst.relative_to(ROOT))})
            entry["variants"][avatar] = str(dst.relative_to(ROOT))
            result["copies"].append({"itemId": item, "avatarId": avatar,
                "candidate": str(src.relative_to(ROOT)), "promoted": str(dst.relative_to(ROOT)),
                "candidateSha256": digest, "promotedSha256": sha_file(dst)})
        atomic_bytes(MANIFEST, (json.dumps(manifest, ensure_ascii=False, indent=2)+"\n").encode())
        result["avatarManifestAfterSha256"] = sha_file(MANIFEST)
        result["promotedInputs"] = input_snapshot()
        result["promotedInputFingerprint"] = fingerprint(result["promotedInputs"])
        result["copyCount"] = len(result["copies"])
        result["v64RuntimeTouched"] = False
        result["status"] = "PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE"
        errors = verify_promotion(result)
        if errors:
            raise RuntimeError("; ".join(errors))
    except Exception as exc:
        result["status"] = "FAIL"
        result["error"] = f"{type(exc).__name__}: {exc}"
        if mutations_started:
            rollback_errors = []
            for target, data in original_targets.items():
                try:
                    if data is None:
                        if target.exists(): target.unlink()
                    else:
                        atomic_bytes(target, data)
                except Exception as rollback_exc:
                    rollback_errors.append(f"{target}: {rollback_exc}")
            try:
                atomic_bytes(MANIFEST, before)
                if MANIFEST.read_bytes() != before: raise RuntimeError("manifest rollback bytes differ")
            except Exception as rollback_exc:
                rollback_errors.append(f"manifest: {rollback_exc}")
            result["rollbackErrors"] = rollback_errors
            result["rollbackComplete"] = not rollback_errors and all(
                (not path.exists()) if data is None else path.is_file() and path.read_bytes() == data
                for path, data in original_targets.items())
    BATCH.mkdir(parents=True, exist_ok=True)
    # A blocked repeat must not destroy the prior successful transaction report.
    output = OUT if not OUT.exists() or load(OUT).get("status") != "PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE" else BATCH / f"promotion-blocked-{time.time_ns()}.json"
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n")
    print(json.dumps({"status": result["status"], "report": str(output.relative_to(ROOT)),
                      "error": result.get("error"), "rollbackComplete": result.get("rollbackComplete")}, ensure_ascii=False))
    return 0 if result["status"] == "PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE" else 1


if __name__ == "__main__":
    raise SystemExit(main())
