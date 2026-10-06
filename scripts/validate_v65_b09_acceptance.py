#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any
from build_v65_b09_candidate_dist import verify_dist_report, input_snapshot, fingerprint

ROOT = Path(__file__).resolve().parents[1]
B09 = ROOT / "qa/v65/art-workpacks/B09"
CANDIDATE_REPORT = B09 / "candidate-build-report.json"
DIST_REPORT = B09 / "candidate-dist-build.json"
RUNTIME_REPORT = B09 / "runtime/all-role-integrated-runtime-gate.json"
VISUAL_DIR = B09 / "runtime/actual-visual-review"
BOARD_DIR = B09 / "runtime/runtime-visual-review-boards"
OUT = B09 / "acceptance-integrity.json"

ITEMS = ("story-headphones", "phones-sky", "phones-racer")
AVATARS = ("brother", "younger", "sister", "younger-sister")
MIN_REVIEW_MODELS = 2
REVIEW_PROMPT_VERSION = "b09-item-specific-v1"
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
    return ROOT / f"public/assets/v6.5/art-candidates/B09/{avatar}/{item}.webp"


def candidate_baseline() -> tuple[dict[tuple[str, str], str], list[str]]:
    errors: list[str] = []
    build = load(CANDIDATE_REPORT)
    dist = load(DIST_REPORT)
    errors += verify_dist_report(dist)
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


def image_state_errors(state: dict, item: str, avatar: str, surface: str, require_item: bool = True) -> list[str]:
    """Validate observed images, never infer visual quality from DOM metadata."""
    errors = []
    images = state.get("images") or []
    candidate_fragment = f"/assets/v6.5/art-candidates/B09/{avatar}/{item}.webp"
    candidates = [image for image in images if candidate_fragment in image.get("src", "")
                  and image.get("itemId") == item]
    if not require_item:
        if candidates:
            errors.append(f"{surface}: cancelled candidate image persists")
        return errors
    if len(candidates) != 1:
        return [f"{surface}: expected one actual candidate image for {item}/{avatar}, got {len(candidates)}"]
    bases = [image for image in images if image.get("isBase") is True]
    if len(bases) != 1:
        return [f"{surface}: expected one actual base image"]
    base, wearable = bases[0], candidates[0]
    for label, image in (("base", base), ("candidate", wearable)):
        if image.get("decoded") is not True or image.get("complete") is not True or image.get("nw", 0) <= 0 or image.get("nh", 0) <= 0:
            errors.append(f"{surface}: {label} image not decoded")
        if image.get("visible") is not True:
            errors.append(f"{surface}: {label} image not visible")
        if image.get("objectFit") != "contain" or image.get("objectPosition") != "50% 50%":
            errors.append(f"{surface}: {label} painted-canvas contract mismatch")
    for field in ("rect", "painted"):
        left, right = base.get(field) or {}, wearable.get(field) or {}
        for axis in ("x", "y", "width", "height"):
            x, y = left.get(axis), right.get(axis)
            if not isinstance(x, (int, float)) or not isinstance(y, (int, float)) or abs(x-y) > 0.5:
                errors.append(f"{surface}: base/candidate {field}.{axis} differ")
            elif axis in ("width", "height") and min(x, y) <= 0:
                errors.append(f"{surface}: zero {field}.{axis}")
    if base.get("transform") != wearable.get("transform"):
        errors.append(f"{surface}: base/candidate transforms differ")
    if (wearable.get("nw"), wearable.get("nh")) != (1024, 1536):
        errors.append(f"{surface}: candidate is not the 1024x1536 rig canvas")
    return errors


def validate_runtime(runtime: dict[str, Any], mapping: dict[tuple[str, str], str]) -> list[str]:
    errors: list[str] = []
    dist = load(DIST_REPORT)
    for field in ("inputFingerprint", "distFingerprint"):
        if runtime.get(field) != dist.get(field):
            errors.append(f"runtime {field} differs from build")
    if runtime.get("distReportSha256") != sha(DIST_REPORT):
        errors.append("runtime build-report binding mismatch")
    if runtime.get("servedIndexSha256") != dist.get("indexSha256"):
        errors.append("runtime served index is not candidate build")
    if runtime.get("bindingErrors"):
        errors.append("runtime reported same-candidate binding errors")
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
        expected_rel = f"public/assets/v6.5/art-candidates/B09/{avatar}/{item}.webp"
        expected_fragment = f"/assets/v6.5/art-candidates/B09/{avatar}/{item}.webp"
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
            if case.get("itemId") != item or case.get("avatarId") != avatar:
                errors.append(f"runtime case identity mismatch {key}")
            if len(viewport) != 2:
                errors.append(f"runtime malformed viewport {key}")
                continue
            if case.get("pass") is not True or case.get("failures"):
                errors.append(f"runtime case failure {key} {viewport} {theme}")
            if not any(expected_fragment in u for u in (case.get("assetRequests") or [])):
                errors.append(f"candidate request missing {key} {viewport} {theme}")
            if case.get("staleAssetRequests"):
                errors.append(f"stale asset request {key} {viewport} {theme}")
            states = case.get("states") or {}
            served = states.get("servedCandidate") or {}
            if served.get("sha256") != mapping[key] or served.get("status") != 200:
                errors.append(f"served candidate bytes mismatch {key} {viewport} {theme}")
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
                errors += image_state_errors(state, item, avatar, f"{key}/{viewport}/{theme}/{state_name}", should_have)
                if state.get("artMode") != "runtime":
                    errors.append(f"state is not runtime rendering {key}/{state_name}")
                if state.get("avatar") != f"avatar-{avatar}":
                    errors.append(f"wrong avatar state {key} {viewport} {theme} {state_name}")
            cap = B09 / "runtime" / item / avatar / "integrated-runtime-capture"
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


def screenshot_binding(item: str, avatar: str, runtime: dict) -> dict[str, str]:
    binding = {}
    row = next((r for r in runtime.get("rows", []) if r.get("itemId") == item and r.get("avatarId") == avatar), {})
    for case in row.get("cases", []):
        viewport = case.get("viewport") or []
        if len(viewport) != 2:
            continue
        for key, suffix in SURFACE_FILE.items():
            path = B09 / "runtime" / item / avatar / "integrated-runtime-capture" / f"{viewport[0]}x{viewport[1]}-{case.get('theme')}-{suffix}.png"
            binding[str(path.relative_to(ROOT))] = (case.get("screenshots") or {}).get(key)
    return binding


def validate_visual(runtime: dict, candidate_fingerprint: str) -> tuple[bool, bool, list[str]]:
    errors = []
    complete, all_pass = True, True
    runtime_sha = sha(RUNTIME_REPORT)
    for item in ITEMS:
        for avatar in AVATARS:
            board = BOARD_DIR / f"{item}__{avatar}.jpg"
            if not board.exists():
                complete = all_pass = False
                errors.append(f"missing board {item}/{avatar}")
                continue
            paths = sorted(VISUAL_DIR.glob(f"{item}__{avatar}__*.json"))
            models, agents = set(), set()
            screenshots = screenshot_binding(item, avatar, runtime)
            for path in paths:
                d = load(path)
                model, agent = d.get("model"), d.get("reviewerAgentId")
                if not isinstance(model, str) or not model.strip() or model in models:
                    errors.append(f"missing/duplicate actual model identity: {path.name}")
                    all_pass = False
                else:
                    models.add(model)
                if not isinstance(agent, str) or not agent.strip() or agent in agents:
                    errors.append(f"missing/duplicate reviewer agent identity: {path.name}")
                    all_pass = False
                else:
                    agents.add(agent)
                checks = {
                    "itemId": item, "avatarId": avatar,
                    "reviewerPromptVersion": REVIEW_PROMPT_VERSION,
                    "boardSha256": sha(board),
                    "candidateFingerprint": candidate_fingerprint,
                    "runtimeReportSha256": runtime_sha,
                    "reviewedScreenshots": screenshots,
                    "visuallyInspected": True,
                }
                for field, expected in checks.items():
                    if d.get(field) != expected:
                        errors.append(f"visual {field} binding mismatch: {path.name}")
                        all_pass = False
                response = d.get("response") or {}
                if d.get("deterministicDecision") != "PASS" or response.get("blocking_issues") != []:
                    all_pass = False
                if not isinstance(response.get("rationale"), str) or not response["rationale"].strip():
                    errors.append(f"visual review rationale missing: {path.name}")
                    all_pass = False
            if len(models) < MIN_REVIEW_MODELS or len(agents) < MIN_REVIEW_MODELS or len(screenshots) != 16:
                complete = all_pass = False
                errors.append(f"two independent model reviews / 16 screenshot coverage missing: {item}/{avatar}")
    return complete, all_pass, errors


def run(runtime_override: dict[str, Any] | None = None) -> dict[str, Any]:
    mapping, candidate_errors = candidate_baseline()
    runtime = runtime_override if runtime_override is not None else load(RUNTIME_REPORT)
    runtime_errors = validate_runtime(runtime, mapping)

    ordered = {f"{i}:{a}": mapping[(i, a)] for i in ITEMS for a in AVATARS if (i, a) in mapping}
    candidate_fingerprint = fingerprint(ordered)
    visual_complete, visual_pass, visual_errors = validate_visual(runtime, candidate_fingerprint)
    structural_pass = not candidate_errors and not runtime_errors
    result = {
        "schemaVersion": 1,
        "suite": "v65-b09-acceptance-integrity",
        "candidateFingerprint": candidate_fingerprint,
        "inputFingerprint": load(DIST_REPORT).get("inputFingerprint"),
        "distFingerprint": load(DIST_REPORT).get("distFingerprint"),
        "technicalEvidenceIsNotArtPass": True,
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
    try:
        result = run()
    except Exception as exc:
        result = {"schemaVersion": 2, "suite": "v65-b09-acceptance-integrity",
                  "sameCandidatePass": False, "promotionReady": False,
                  "error": f"{type(exc).__name__}: {exc}"}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["sameCandidatePass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
