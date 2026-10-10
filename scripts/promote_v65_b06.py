#!/usr/bin/env python3
"""Transactional B06 local promoter. Only root may use --execute."""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import time
from pathlib import Path

import validate_v65_b06_acceptance as v

ROOT = v.ROOT
BATCH = v.BATCH
MANIFEST = v.MANIFEST
OUT = BATCH / "promotion-report.json"


def destination(item, avatar, layer):
    return ROOT / f"public/assets/v6.5/runtime/{avatar}/{item}-{layer}.webp"


def atomic(path: Path, data: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + f".b06-{os.getpid()}.tmp")
    try:
        temp.write_bytes(data)
        temp.replace(path)
    finally:
        if temp.exists():
            temp.unlink()


def mark_failed(report, exc, *, rolled_back):
    report.update(
        status="FAIL_ROLLED_BACK" if rolled_back else "FAIL",
        promotionExecuted=False,
        error=f"{type(exc).__name__}: {exc}",
    )
    if rolled_back:
        report["rollbackCompleted"] = True
    return report


def manifest_plan(before):
    planned = copy.deepcopy(before)
    accessories = {x["id"]: x for x in planned["accessories"]}
    changes = []
    for item, avatar in v.ROWS:
        row = accessories.get(item) or {}
        if row.get("renderer") != "split-overlay":
            raise ValueError(f"{item} renderer contract")
        for layer, key in (("back", "backVariants"), ("front", "frontVariants")):
            expected = f"public/assets/v6.4/runtime/{avatar}/{item}-{layer}.webp"
            actual = (row.get(key) or {}).get(avatar)
            if actual != expected:
                raise ValueError(f"{item}/{avatar}/{layer} must be exact V6.4 predecessor: {actual}")
            new = str(destination(item, avatar, layer).relative_to(ROOT))
            row[key][avatar] = new
            changes.append((item, avatar, layer, expected, new))
    if len(changes) != 24:
        raise ValueError("manifest change count is not 24")
    return planned


def copy_plan(acceptance):
    rows = []
    for item, avatar in v.ROWS:
        for layer in v.LAYERS:
            src = v.source_path(item, avatar, layer)
            data = src.read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            if digest != acceptance["candidateHashes"][f"{item}:{avatar}:{layer}"]:
                raise ValueError("candidate bytes drift")
            rows.append((item, avatar, layer, src, destination(item, avatar, layer), data, digest))
    if len(rows) != 24 or len({x[4] for x in rows}) != 24:
        raise ValueError("copy plan exact coverage")
    return rows


def protected_hashes():
    targets = {destination(i, a, l) for i, a in v.ROWS for l in v.LAYERS}
    paths = []
    for base in (ROOT / "public/assets/v6.4", ROOT / "public/assets/v6.5"):
        paths.extend(p for p in base.rglob("*") if p.is_file() and p.name != ".DS_Store" and p not in targets)
    for batch in ("B01", "B02", "B03", "B04", "B05", "B08", "B09", "B10", "B11"):
        paths.extend(p for p in (ROOT / f"qa/v65/art-workpacks/{batch}").rglob("*") if p.is_file() and p.name != ".DS_Store")
    # B07 is authorized only through the exact frozen path+SHA list.
    for rel in v.b07_allowlist():
        paths.append(ROOT / rel)
    return {str(p.relative_to(ROOT)): v.sha(p) for p in sorted(set(paths))}


def evidence_hashes():
    paths = [
        v.B05_REPORT, v.B05_BUILD, v.B05_RUNTIME, v.B05_COMPAT, v.B05_NEGATIVE,
        v.B05_COMPLETION, v.B05_VISUAL, v.B07_ALLOWLIST,
        v.BUILD, v.RUNTIME, v.COMPAT, v.NEGATIVE, v.SOL, v.ROOT_ACTUAL,
        v.B06_INITIAL_GAP, v.B06_BASE_SUPPLEMENT, v.B06_BASE_SUPPLEMENT_VISUAL,
        v.B06_OVERSIGHT, v.ROOT_PREFIT, v.INTEGRITY, v.SUMMARY,
        v.S / "strict-acceptance.json",
        ROOT / "scripts/validate_v65_b06_acceptance.py",
        Path(__file__),
        ROOT / "scripts/run_v65_b06_post_promotion.py",
        ROOT / "scripts/test_v65_b06_acceptance.py",
    ]
    return {str(p.relative_to(ROOT)): v.sha(p) for p in paths if p.is_file()}


def verify_promotion(report):
    errors = []
    try:
        if report.get("status") != "PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE":
            errors.append("promotion status")
        if report.get("manifestAfterSha256") != v.sha(MANIFEST):
            errors.append("manifest hash")
        if report.get("protectedHashes") != protected_hashes():
            errors.append("protected bytes drift")
        if report.get("evidenceHashes") != evidence_hashes():
            errors.append("evidence bytes drift")
        expected_source = dict(report["sourceFilesBefore"])
        expected_source["src/data/avatarAssetManifest.json"] = report["manifestAfterSha256"]
        if v.normalize(v.source_snapshot()) != v.normalize(expected_source):
            errors.append("source drift beyond B06 manifest")
        expected_public = dict(report["publicFilesBefore"])
        for row in report["copies"]:
            expected_public[row["destination"]] = row["promotedSha256"]
        if v.normalize(v.public_snapshot()) != v.normalize(expected_public):
            errors.append("public drift beyond 24 B06 runtime copies")
        original = v.load(ROOT / report["backupDirectory"] / "avatarAssetManifest.original.json")
        if v.load(MANIFEST) != manifest_plan(original):
            errors.append("manifest mutation beyond exact 24 leaves")
        copies = report.get("copies", [])
        expected = {(i, a, l) for i, a in v.ROWS for l in v.LAYERS}
        if len(copies) != 24 or {(x["itemId"], x["avatarId"], x["layer"]) for x in copies} != expected:
            errors.append("copy coverage")
        for row in copies:
            dst = destination(row["itemId"], row["avatarId"], row["layer"])
            if str(dst.relative_to(ROOT)) != row["destination"] or v.sha(dst) != row["promotedSha256"] or v.sha(ROOT / row["source"]) != row["promotedSha256"]:
                errors.append("promoted byte mismatch")
    except Exception as exc:
        errors.append(f"{type(exc).__name__}: {exc}")
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--preflight", action="store_true")
    mode.add_argument("--execute", action="store_true")
    parser.add_argument("--root-authorized", action="store_true")
    args = parser.parse_args()
    report = {"schemaVersion": 1, "suite": "v65-b06-local-promotion", "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "status": "FAIL", "promotionExecuted": False, "productionDeployed": False, "rootSolePromotionWriter": True}
    started = False
    before_bytes = None
    originals = {}
    try:
        acceptance = v.run()
        if not acceptance["promotionReady"]:
            raise ValueError("strict acceptance rejected: " + str(acceptance["structuralErrors"] + acceptance["visualErrors"]))
        if args.execute and not args.root_authorized:
            raise ValueError("--execute requires --root-authorized and must be run by /root")
        before_bytes = MANIFEST.read_bytes()
        planned = manifest_plan(json.loads(before_bytes))
        rows = copy_plan(acceptance)
        planned_bytes = (json.dumps(planned, ensure_ascii=False, indent=2) + "\n").encode()
        copies = [{"itemId": i, "avatarId": a, "layer": l, "source": str(src.relative_to(ROOT)), "destination": str(dst.relative_to(ROOT)), "sha256": h, "promotedSha256": h} for i, a, l, src, dst, _, h in rows]
        base = {
            "promotionReady": True,
            "copyCount": 24,
            "manifestFieldChangeCount": 24,
            "manifestBeforeSha256": v.sha(MANIFEST),
            "plannedManifestSha256": hashlib.sha256(planned_bytes).hexdigest(),
            "candidateHashes": acceptance["candidateHashes"],
            "predecessorBoundary": acceptance["predecessorBoundary"],
            "b07ExactAuthorizedFiles": v.b07_allowlist(),
            "protectedHashes": protected_hashes(),
            "evidenceHashes": evidence_hashes(),
            "copies": copies,
        }
        if not args.execute:
            report.update(base, status="DRY_RUN_READY")
            (BATCH / "promotion-dry-run.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
            print(json.dumps({"status": report["status"], "copyCount": 24, "manifestFieldChangeCount": 24}, ensure_ascii=False))
            return 0
        stamp = time.strftime("%Y%m%d-%H%M%S")
        backup = BATCH / f"promotion-backups/{stamp}"
        backup.mkdir(parents=True, exist_ok=False)
        (backup / "avatarAssetManifest.original.json").write_bytes(before_bytes)
        for _, _, _, _, dst, _, _ in rows:
            if dst.exists():
                archived = backup / dst.relative_to(ROOT)
                archived.parent.mkdir(parents=True, exist_ok=True)
                archived.write_bytes(dst.read_bytes())
                originals[dst] = dst.read_bytes()
            else:
                originals[dst] = None
        source_before = v.source_snapshot()
        public_before = v.public_snapshot()
        started = True
        atomic(MANIFEST, planned_bytes)
        for _, _, _, _, dst, data, _ in rows:
            atomic(dst, data)
        report.update(base, status="PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE", promotionExecuted=True, backupDirectory=str(backup.relative_to(ROOT)), manifestAfterSha256=v.sha(MANIFEST), sourceFilesBefore=source_before, publicFilesBefore=public_before, promotedInputFingerprint=v.source_fingerprint())
        errors = verify_promotion(report)
        if errors:
            raise ValueError("post-write verification: " + "; ".join(errors))
        OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        print(json.dumps({"status": report["status"], "copyCount": 24}, ensure_ascii=False))
        return 0
    except Exception as exc:
        rollback_errors = []
        if started and before_bytes is not None:
            try:
                atomic(MANIFEST, before_bytes)
            except Exception as rollback_exc:
                rollback_errors.append(f"manifest: {type(rollback_exc).__name__}: {rollback_exc}")
            for dst, data in originals.items():
                try:
                    if data is None:
                        if dst.exists():
                            dst.unlink()
                    else:
                        atomic(dst, data)
                except Exception as rollback_exc:
                    rollback_errors.append(f"{dst.relative_to(ROOT)}: {type(rollback_exc).__name__}: {rollback_exc}")
        mark_failed(report, exc, rolled_back=started and not rollback_errors)
        if started and rollback_errors:
            report.update(status="FAIL_ROLLBACK_INCOMPLETE", promotionExecuted=False, rollbackCompleted=False, rollbackErrors=rollback_errors)
        target = BATCH / "promotion-dry-run.json" if not args.execute else OUT
        target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        print(json.dumps({"status": "FAIL", "error": report["error"]}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
