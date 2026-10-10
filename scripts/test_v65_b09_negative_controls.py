#!/usr/bin/env python3
from __future__ import annotations

import copy
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VALIDATOR_PATH = ROOT / "scripts/validate_v65_b09_acceptance.py"
RUNTIME_PATH = ROOT / "qa/v65/art-workpacks/B09/runtime/all-role-integrated-runtime-gate.json"
OUT = ROOT / "qa/v65/art-workpacks/B09/runtime/negative-controls.json"

spec = importlib.util.spec_from_file_location("v65_b09_acceptance", VALIDATOR_PATH)
validator = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(validator)


def rejected(runtime: dict) -> tuple[bool, list[str]]:
    result = validator.run(runtime)
    errors = result["runtimeErrors"]
    return not result["runtimeIntegrityPass"], errors


def main() -> int:
    baseline = json.loads(RUNTIME_PATH.read_text(encoding="utf-8"))
    baseline_result = validator.run(copy.deepcopy(baseline))
    cases = []

    wrong = copy.deepcopy(baseline)
    wrong["rows"][0]["avatarId"] = "younger"
    ok, errors = rejected(wrong)
    cases.append({"case": "wrong-avatar-candidate", "expected": "REJECT", "actual": "REJECT" if ok else "ACCEPT", "errors": errors[:8]})

    missing = copy.deepcopy(baseline)
    row = missing["rows"][0]
    item = row["itemId"]
    state = row["cases"][0]["states"]["shopTrial"]
    state["rendered"] = [v for v in state.get("rendered", []) if v != item]
    ok, errors = rejected(missing)
    cases.append({"case": "missing-layer", "expected": "REJECT", "actual": "REJECT" if ok else "ACCEPT", "errors": errors[:8]})

    swapped = copy.deepcopy(baseline)
    swapped["rows"][0]["itemId"] = "phones-sky"
    ok, errors = rejected(swapped)
    cases.append({"case": "swapped-item", "expected": "REJECT", "actual": "REJECT" if ok else "ACCEPT", "errors": errors[:8]})

    stale = copy.deepcopy(baseline)
    stale["rows"][0]["cases"][0]["screenshots"]["home"] = "0" * 64
    ok, errors = rejected(stale)
    cases.append({"case": "stale-candidate-screenshot", "expected": "REJECT", "actual": "REJECT" if ok else "ACCEPT", "errors": errors[:8]})

    missing_src = copy.deepcopy(baseline)
    state = missing_src["rows"][0]["cases"][0]["states"]["shopTrial"]
    for image in state.get("images", []):
        if "/art-candidates/B09/" in image.get("src", ""):
            image["src"] = "/assets/v6.4/runtime/brother/story-headphones.webp"
    ok, errors = rejected(missing_src)
    cases.append({"case": "metadata-only-without-candidate-image", "expected": "REJECT",
                  "actual": "REJECT" if ok else "ACCEPT", "errors": errors[:8]})

    shifted = copy.deepcopy(baseline)
    state = shifted["rows"][0]["cases"][0]["states"]["shopTrial"]
    for image in state.get("images", []):
        if "/art-candidates/B09/" in image.get("src", ""):
            image["painted"]["x"] += 3
    ok, errors = rejected(shifted)
    cases.append({"case": "painted-canvas-shift", "expected": "REJECT",
                  "actual": "REJECT" if ok else "ACCEPT", "errors": errors[:8]})

    status = "PASS" if baseline_result["sameCandidatePass"] and all(c["actual"] == "REJECT" for c in cases) else "FAIL"
    out = {
        "schemaVersion": 1,
        "suite": "v65-b09-negative-controls",
        "baselineRuntimeIntegrityPass": baseline_result["runtimeIntegrityPass"],
        "baselineSameCandidatePass": baseline_result["sameCandidatePass"],
        "cases": cases,
        "status": status,
        "note": "Synthetic mutations are negative QA fixtures only; candidate and runtime artwork are not modified.",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
