#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
B08 = ROOT / "qa/v65/art-workpacks/B08"
CANDIDATE_REPORT = B08 / "candidate-build-report.json"
DIST_REPORT = B08 / "candidate-dist-build.json"
RUNTIME_REPORT = B08 / "runtime/all-role-integrated-runtime-gate.json"
VISUAL_DIR = B08 / "runtime/actual-visual-review"
BOARD_DIR = B08 / "runtime/runtime-visual-review-boards"
OUT = B08 / "acceptance-integrity.json"

ITEMS = ("glasses-holo", "glasses-legend", "sister-heart-glasses")
AVATARS = ("brother", "younger", "sister", "younger-sister")
MODELS = ("gemma3:4b", "gemma3:12b")
SURFACE_FILE = {
    "shopTrial": "shop-trial",
    "shopEquipped": "shop-equipped",
    "home": "home",
    "achievements": "achievements",
}
REQUIRED_STATES = ("shopTrial", "shopCancelled", "shopEquipped", "home", "homeAfterReload", "achievements")


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def expected_candidate(item: str, avatar: str) -> Path:
    return ROOT / f"public/assets/v6.5/art-candidates/B08/{avatar}/{item}.webp"


def candidate_baseline() -> tuple[dict[tuple[str, str], str], list[str]]:
    errors: list[str] = []
    build = load(CANDIDATE_REPORT)
    dist = load(DIST_REPORT)
    mapping: dict[tuple[str, str], str] = {}
    rows = build.get("rows", [])
    if len(rows) != 12:
        errors.append(f"candidate-build rows={len(rows)} expected=12")
    for row in rows:
        key = (row.get("itemId"), row.get("avatarId"))
        if key in mapping:
            errors.append(f"duplicate candidate row {key}")
            continue
        if key[0] not in ITEMS or key[1] not in AVATARS:
            errors.append(f"unexpected candidate row {key}")
            continue
        path = expected_candidate(*key)
        if not path.exists():
            errors.append(f"missing candidate {path.relative_to(ROOT)}")
            continue
        current = sha(path)
        mapping[key] = current
        if row.get("sha256") != current:
            errors.append(f"candidate-build hash mismatch {key}")
        dist_hash = (dist.get("candidateHashes") or {}).get(f"{key[0]}:{key[1]}")
        if dist_hash != current:
            errors.append(f"candidate-dist hash mismatch {key}")
    if set(mapping) != {(i, a) for i in ITEMS for a in AVATARS}:
        errors.append("candidate coverage mismatch")
    return mapping, errors


def validate_runtime(runtime: dict[str, Any], mapping: dict[tuple[str, str], str]) -> list[str]:
    errors: list[str] = []
    rows = runtime.get("rows", [])
    if runtime.get("status") != "PASS":
        errors.append(f"runtime status={runtime.get('status')}")
    if len(rows) != 12:
        errors.append(f"runtime rows={len(rows)} expected=12")
    seen: set[tuple[str, str]] = set()
    for row in rows:
        item, avatar = row.get("itemId"), row.get("avatarId")
        key = (item, avatar)
        if key not in mapping:
            errors.append(f"runtime unexpected row {key}")
            continue
        if key in seen:
            errors.append(f"runtime duplicate row {key}")
        seen.add(key)
        expected_rel = f"public/assets/v6.5/art-candidates/B08/{avatar}/{item}.webp"
        expected_fragment = f"/assets/v6.5/art-candidates/B08/{avatar}/{item}.webp"
        if row.get("candidateAsset") != expected_rel:
            errors.append(f"candidateAsset mismatch {key}")
        if row.get("candidateSha256") != mapping[key]:
            errors.append(f"runtime candidate hash mismatch {key}")
        if row.get("pass") is not True:
            errors.append(f"runtime row not PASS {key}")
        cases = row.get("cases") or []
        if len(cases) != 4:
            errors.append(f"runtime case count {key}={len(cases)}")
        modes: set[tuple[tuple[int, int], str]] = set()
        for case in cases:
            viewport = tuple(case.get("viewport") or [])
            theme = case.get("theme")
            if len(viewport) == 2:
                modes.add((viewport, theme))
            if case.get("pass") is not True or case.get("failures"):
                errors.append(f"runtime case failure {key} {viewport} {theme}")
            if not any(expected_fragment in u for u in (case.get("assetRequests") or [])):
                errors.append(f"candidate request missing {key} {viewport} {theme}")
            if case.get("staleAssetRequests"):
                errors.append(f"stale asset request {key} {viewport} {theme}")
            states = case.get("states") or {}
            for state_name in REQUIRED_STATES:
                if state_name not in states:
                    errors.append(f"missing state {key} {viewport} {theme} {state_name}")
                    continue
                state = states[state_name]
                cosmetics = set(state.get("cosmetics") or [])
                rendered = set(state.get("rendered") or [])
                should_have = state_name != "shopCancelled"
                if should_have and (item not in cosmetics or item not in rendered):
                    errors.append(f"missing layer {key} {viewport} {theme} {state_name}")
                if not should_have and (item in cosmetics or item in rendered):
                    errors.append(f"cancelled layer persisted {key} {viewport} {theme}")
                if state.get("avatar") != f"avatar-{avatar}":
                    errors.append(f"wrong avatar state {key} {viewport} {theme} {state_name}")
            cap = B08 / "runtime" / item / avatar / "integrated-runtime-capture"
            for shot_key, suffix in SURFACE_FILE.items():
                stored = (case.get("screenshots") or {}).get(shot_key)
                p = cap / f"{viewport[0]}x{viewport[1]}-{theme}-{suffix}.png"
                if not p.exists():
                    errors.append(f"missing screenshot {p.relative_to(ROOT)}")
                elif stored != sha(p):
                    errors.append(f"stale screenshot hash {key} {viewport} {theme} {shot_key}")
        if modes != {((390, 844), "light"), ((390, 844), "dark"), ((1440, 900), "light"), ((1440, 900), "dark")}:
            errors.append(f"runtime mode coverage mismatch {key}")
    if seen != set(mapping):
        errors.append("runtime row coverage mismatch")
    return errors


def validate_visual() -> tuple[bool, bool, list[str]]:
    errors: list[str] = []
    complete = True
    all_pass = True
    for item in ITEMS:
        for avatar in AVATARS:
            board = BOARD_DIR / f"{item}__{avatar}.jpg"
            if not board.exists():
                complete = False
                all_pass = False
                errors.append(f"missing board {item}/{avatar}")
                continue
            board_sha = sha(board)
            for model in MODELS:
                p = VISUAL_DIR / f"{item}__{avatar}__{model.replace(':','-')}.json"
                if not p.exists():
                    complete = False
                    all_pass = False
                    errors.append(f"missing visual evidence {item}/{avatar}/{model}")
                    continue
                d = load(p)
                if d.get("itemId") != item or d.get("avatarId") != avatar or d.get("model") != model:
                    all_pass = False
                    errors.append(f"visual identity mismatch {item}/{avatar}/{model}")
                if d.get("reviewerPromptVersion") != "b08-item-specific-v2":
                    all_pass = False
                    errors.append(f"visual reviewer prompt mismatch {item}/{avatar}/{model}")
                if d.get("boardSha256") != board_sha:
                    all_pass = False
                    errors.append(f"visual board hash mismatch {item}/{avatar}/{model}")
                response = d.get("response") or {}
                if d.get("deterministicDecision") != "PASS" or response.get("blocking_issues"):
                    all_pass = False
    return complete, all_pass, errors


def run(runtime_override: dict[str, Any] | None = None) -> dict[str, Any]:
    mapping, candidate_errors = candidate_baseline()
    runtime = runtime_override if runtime_override is not None else load(RUNTIME_REPORT)
    runtime_errors = validate_runtime(runtime, mapping)
    visual_complete, visual_pass, visual_errors = validate_visual()

    ordered = {f"{i}:{a}": mapping[(i, a)] for i in ITEMS for a in AVATARS if (i, a) in mapping}
    fingerprint = hashlib.sha256(json.dumps(ordered, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    structural_pass = not candidate_errors and not runtime_errors
    result = {
        "schemaVersion": 1,
        "suite": "v65-b08-acceptance-integrity",
        "candidateFingerprint": fingerprint,
        "candidateHashes": ordered,
        "candidateIntegrityPass": not candidate_errors,
        "runtimeIntegrityPass": not runtime_errors,
        "sameCandidatePass": structural_pass,
        "visualComplete": visual_complete,
        "visualPass": visual_pass,
        "promotionReady": structural_pass and visual_complete and visual_pass,
        "candidateErrors": candidate_errors,
        "runtimeErrors": runtime_errors,
        "visualErrors": visual_errors,
    }
    return result


def main() -> int:
    result = run()
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["sameCandidatePass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
