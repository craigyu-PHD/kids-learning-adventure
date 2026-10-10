#!/usr/bin/env python3
"""Strict B05 candidate acceptance against the exact final B03 predecessor."""
from __future__ import annotations

import hashlib
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import validate_v65_b03_acceptance as b03v
import promote_v65_b04 as b04p

BATCH = ROOT / "qa/v65/art-workpacks/B05"
S = BATCH / "full-candidate-runtime"
MANIFEST = ROOT / "src/data/avatarAssetManifest.json"
B04_REPORT = ROOT / "qa/v65/art-workpacks/B04/promotion-report.json"
B04_COMPLETION = ROOT / "qa/v65/art-workpacks/B04/post-promotion/completion-summary.json"
B04_VISUAL = ROOT / "qa/v65/art-workpacks/B04/post-promotion/fresh-visual-review-root.json"
B04_SUPPLEMENT = ROOT / "qa/v65/art-workpacks/B04/oversight-astra/base-readiness-supplement/report.json"
B04_SUPPLEMENT_VISUAL = ROOT / "qa/v65/art-workpacks/B04/oversight-astra/base-readiness-supplement/actual-visual-review-astra.json"
B04_OVERSIGHT = ROOT / "qa/v65/art-workpacks/B04/oversight-astra/final-oversight.json"
B06 = ROOT / "qa/v65/art-workpacks/B06"
B06_ALLOWLIST = BATCH / "b06-authorized-files.json"
B05_INITIAL_GAP = BATCH / "oversight-astra/base-readiness-original-fail.json"
B05_BASE_SUPPLEMENT = BATCH / "oversight-astra/base-readiness-supplement/report.json"
B05_BASE_SUPPLEMENT_VISUAL = BATCH / "oversight-astra/base-readiness-supplement/actual-visual-review-astra.json"

BUILD = S / "candidate-dist-build.json"
RUNTIME = S / "runtime-gate-report.json"
FOCUSED = S / "runtime-focused-supplement-report.json"
COMPAT = S / "layering-compat-report.json"
NEGATIVE = S / "negative-controls-report.json"
SOL = S / "actual-visual-review-sol.json"
ROOT_ACTUAL = S / "actual-visual-review-root.json"
ROOT_PREFIT = BATCH / "prefit-visual-review-root.json"
SOL_PREFIT = BATCH / "prefit-visual-review-sol.json"
INTEGRITY = S / "acceptance-integrity.json"
SUMMARY = S / "runtime-completion-summary.json"

ITEMS = ("hero-cape", "cape-sky", "cape-nebula")
AVATARS = ("brother", "younger", "sister", "younger-sister")
LAYERS = ("back", "front")
ROWS = tuple((i, a) for i in ITEMS for a in AVATARS)
MODES = ((390, 844, "light"), (390, 844, "dark"), (1440, 900, "light"), (1440, 900, "dark"))
COMPAT_ROWS = (("hero-cape", "brother"), ("cape-sky", "younger"), ("cape-nebula", "sister"), ("hero-cape", "younger-sister"))

B04_REPORT_SHA = "e4599ab341cb260b0db1d68d21bb51d99961ad856172e1ffcfb35d49e1df5a75"
B04_MANIFEST_SHA = "489f381713a6e1329fae21e234e42ee71475284b236a1506534725819648fb3c"
B04_COMPLETION_SHA = "4f17c2e6f0d52fd11eb60252acca121ff061bb10e20b7ac2dd39464a7fc4f8cf"
B04_VISUAL_SHA = "7babbff47f1f845de03f3a89b256797eebb26983bdf5c350701522ac1a14714f"
B04_SUPPLEMENT_SHA = "800a3bea9d3d3b618a84b102665ec9f9eebf0e8ac097dd864da1047db2b2d899"
B04_SUPPLEMENT_VISUAL_SHA = "a0e05eb30f46daeaf773f1b0a13a9d8716fd03d8b90d540cc25a64d222c6b8eb"
B04_OVERSIGHT_SHA = "75c8455d76aed30f02360411d625c7b0c047a6504f5aab8c65f871072bba4577"
SEALED = {
    "candidate-dist-build.json": "b632e0794ee20a94eba98039ad1b32117faa9e76e69eafaa49e5805d6c096fcf",
    "runtime-gate-report.json": "a2040d5a270d9360ea96eefa3758dbea7b8bfb87e1163e70581b0c3252dcc54e",
    "runtime-focused-supplement-report.json": "6a4b2414a61ef7781276230353a7fe2f39ce04bb562e0ca2eae728027f6d7850",
    "layering-compat-report.json": "8ab5f1816b606ada525d6d2cbee6bbe1e8df8262c1092e736d208832bc546cd4",
    "negative-controls-report.json": "df1b68b54d7f0dbe00fd6e410d31d1fe33a9bf054e2c084e0bdf42401a362176",
    "actual-visual-review-sol.json": "0ba0c0ce92659d6ee57b1c8cd60516dedc63429414915f13e41bd709cf816446",
    "actual-visual-review-root.json": "249abb834aaa32b366785e7e48ad897158719f8d9d4c953e17a0dc7d05f5daf9",
    "acceptance-integrity.json": "e11ef3301b0022ec6df034e43028f966adde2950b4544d960eebdbe1624f2ef4",
    "runtime-completion-summary.json": "7c59d3bbf33ebc79fd1e8ea6dd1c981604b5051015d4b1059febd6e132d9447f",
}
ROOT_PREFIT_SHA = "b754f6b5df4b2a923123b3aaf088ff34fae8b78a6ebad3aecd112eadea5947cd"
SOL_PREFIT_SHA = "8781ab5d1b6c51804a0f4092626539910191b185d2137c13ffff2f6bd80c4f1d"
B05_INITIAL_GAP_SHA = "4e7fa95a438f420edc89f446ab4e1854ac8e50d021fc3e07ff8dc2bd6f99c52e"
B05_BASE_SUPPLEMENT_SHA = "6ef25ad910a39271e9c67bde5986724eb3c1f6acee2f87a98065e0068707b364"
B05_BASE_SUPPLEMENT_VISUAL_SHA = "479001ac9f346ad5a8a5af6ee72fe5dcf7d1ffff6db6bed96d79aab627fd95cf"


def load(path: Path):
    return json.loads(path.read_text())


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fingerprint(value) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def normalize(snapshot):
    return {p: h for p, h in snapshot.items() if Path(p).name != ".DS_Store"}


def bound(path: Path):
    return {"path": str(path.relative_to(ROOT)), "sha256": sha(path)}


def source_snapshot():
    return b03v.source_snapshot()


def public_snapshot():
    return b03v.public_snapshot()


def source_fingerprint():
    return fingerprint(normalize(source_snapshot()))


def source_path(item: str, avatar: str, layer: str) -> Path:
    return BATCH / "fit-candidates" / f"{avatar}__{item}-{layer}.webp"


def public_candidate_path(item: str, avatar: str, layer: str) -> Path:
    return ROOT / f"public/assets/v6.5/art-candidates/B05/{avatar}/{item}-{layer}.webp"


def candidate_hashes():
    return {f"{i}:{a}:{l}": sha(source_path(i, a, l)) for i, a in ROWS for l in LAYERS}


def b06_snapshot():
    public_b06 = ROOT / "public/assets/v6.5/art-candidates/B06"
    paths = list(public_b06.rglob("*")) if public_b06.exists() else []
    return {
        str(p.relative_to(ROOT)): sha(p) for p in sorted(paths)
        if p.is_file() and p.name != ".DS_Store" and "__pycache__" not in p.parts and p.suffix != ".pyc"
    }


def b06_allowlist():
    return load(B06_ALLOWLIST)["authorizedFiles"]


def exact_cases(rows, expected, errors, label):
    actual = [(x.get("itemId"), x.get("avatarId"), tuple(x.get("viewport", [])), x.get("theme")) for x in rows]
    if len(actual) != len(expected) or len(set(actual)) != len(actual) or set(actual) != set(expected):
        errors.append(label + " exact coverage")


def check_screenshot(entry, errors, label):
    path = ROOT / str(entry.get("path", ""))
    if not path.is_file() or sha(path) != entry.get("sha256"):
        errors.append(label + " screenshot drift: " + str(entry.get("path")))


def check_state(state, item, avatar, surface, errors, *, present=True, compat=False, require_base=False):
    if state.get("avatar") != "avatar-" + avatar:
        errors.append(surface + " avatar")
    images = state.get("images", [])
    bases = [x for x in images if "avatar-renderer-skin" in x.get("classes", [])]
    if require_base and (len(bases) != 1 or not all(bases[0].get(k) is True for k in ("complete", "decoded", "visible"))):
        errors.append(surface + " decoded visible base")
    layers = [x for x in images if x.get("itemId") == item]
    if present:
        if item not in state.get("rendered", []) or item not in state.get("cosmetics", []) or len(layers) != 2:
            errors.append(surface + " cape presence")
        for layer, cls in (("back", "avatar-wearable-back"), ("front", "avatar-wearable-front")):
            found = [x for x in layers if cls in x.get("classes", [])]
            expected = f"/assets/v6.5/art-candidates/B05-full/{avatar}/{item}-{layer}.webp"
            if len(found) != 1 or not found[0].get("src", "").split("?")[0].endswith(expected):
                errors.append(surface + " " + layer + " path")
            elif not all(found[0].get(k) is True for k in ("complete", "decoded", "visible")):
                errors.append(surface + " " + layer + " visible")
    elif item in state.get("rendered", []) or item in state.get("cosmetics", []) or layers:
        errors.append(surface + " cancel did not restore base")
    if compat:
        if not {"pack-rocket", "hat-rocket"}.issubset(set(state.get("rendered", []))):
            errors.append(surface + " compatibility items")


def predecessor_errors(current_b06=None, run_predecessor_verifier=True):
    errors = []
    details = {}
    try:
        report = load(B04_REPORT)
        completion = load(B04_COMPLETION)
        visual = load(B04_VISUAL)
        supplement = load(B04_SUPPLEMENT)
        supplement_visual = load(B04_SUPPLEMENT_VISUAL)
        oversight = load(B04_OVERSIGHT)
        if sha(B04_REPORT) != B04_REPORT_SHA or report.get("status") != "PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE":
            errors.append("B04 promotion identity/status")
        if sha(MANIFEST) != B04_MANIFEST_SHA or report.get("manifestAfterSha256") != B04_MANIFEST_SHA:
            errors.append("current manifest is not exact B04 final")
        if sha(B04_COMPLETION) != B04_COMPLETION_SHA or completion.get("status") != "PASS_TECHNICAL_PENDING_FRESH_VISUAL" or completion.get("promotionReportSha256") != B04_REPORT_SHA:
            errors.append("B04 completion identity/binding")
        bound_visual = visual.get("boundEvidence", {})
        if sha(B04_VISUAL) != B04_VISUAL_SHA or visual.get("status") != "PASS_POST_PROMOTION_VISUAL" or bound_visual.get("promotionReport") != B04_REPORT_SHA or bound_visual.get("manifest") != B04_MANIFEST_SHA or bound_visual.get("freshCompletion") != B04_COMPLETION_SHA:
            errors.append("B04 root fresh visual identity/binding")
        if sha(B04_SUPPLEMENT) != B04_SUPPLEMENT_SHA or supplement.get("status") != "PASS_SAME_DIST_BASE_READINESS_SUPPLEMENT" or supplement.get("errors") != [] or supplement.get("gapStateCount") != 27 or supplement.get("expectedCases") != 25 or supplement.get("promotionReportSha256") != B04_REPORT_SHA or supplement.get("manifestSha256") != B04_MANIFEST_SHA:
            errors.append("B04 base-readiness supplement identity/status")
        if sha(B04_SUPPLEMENT_VISUAL) != B04_SUPPLEMENT_VISUAL_SHA or supplement_visual.get("status") != "PASS_FOCUSED_BASE_READINESS_VISUAL":
            errors.append("B04 supplement visual identity/status")
        if sha(B04_OVERSIGHT) != B04_OVERSIGHT_SHA or oversight.get("status") != "PASS_TRANSACTION_AND_FRESH_EVIDENCE_BOUNDARIES" or oversight.get("currentPostPromotionVerificationErrors") != []:
            errors.append("B04 final oversight identity/status")
        if oversight.get("boundReports", {}).get("promotionReport") != B04_REPORT_SHA or oversight.get("boundReports", {}).get("manifest") != B04_MANIFEST_SHA or oversight.get("boundReports", {}).get("freshCompletion") != B04_COMPLETION_SHA or oversight.get("boundReports", {}).get("rootFreshVisual") != B04_VISUAL_SHA:
            errors.append("B04 final oversight report bindings")
        if oversight.get("readinessSupplement", {}).get("sha256") != B04_SUPPLEMENT_SHA or oversight.get("supplementActualVisual", {}).get("sha256") != B04_SUPPLEMENT_VISUAL_SHA or oversight.get("coverage", {}).get("gapStatesNowReady") != 27 or oversight.get("coverage", {}).get("astraActuallyViewedSupplementPNGs") != 27:
            errors.append("B04 final oversight supplement bindings")
        verify = b04p.verify_promotion(report) if run_predecessor_verifier else []
        if verify:
            errors += ["B04 verify_promotion: " + x for x in verify]
        expected_b06 = b06_allowlist()
        actual_b06 = b06_snapshot() if current_b06 is None else current_b06
        if actual_b06 != expected_b06:
            missing = sorted(set(expected_b06) - set(actual_b06))
            extra = sorted(set(actual_b06) - set(expected_b06))
            changed = sorted(path for path in set(actual_b06) & set(expected_b06) if actual_b06[path] != expected_b06[path])
            errors.append(f"B06 exact allowlist drift missing={missing} extra={extra} changed={changed}")
        details = {
            "b04Promotion": bound(B04_REPORT),
            "b04Completion": bound(B04_COMPLETION),
            "b04RootVisual": bound(B04_VISUAL),
            "b04BaseReadinessSupplement": bound(B04_SUPPLEMENT),
            "b04SupplementVisual": bound(B04_SUPPLEMENT_VISUAL),
            "b04FinalOversight": bound(B04_OVERSIGHT),
            "manifest": bound(MANIFEST),
            "b04VerifyPromotionErrors": verify,
            "b06Allowlist": bound(B06_ALLOWLIST),
            "b06AuthorizedFileCount": len(expected_b06),
        }
    except Exception as exc:
        errors.append(f"{type(exc).__name__}: {exc}")
    return errors, details


def run():
    structural, visual_errors = [], []
    result = {"schemaVersion": 1, "suite": "v65-b05-strict-acceptance", "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "promotionReady": False}
    try:
        for name, expected in SEALED.items():
            if sha(S / name) != expected:
                structural.append("sealed evidence drift " + name)
        if sha(ROOT_PREFIT) != ROOT_PREFIT_SHA or sha(SOL_PREFIT) != SOL_PREFIT_SHA:
            structural.append("prefit review drift")
        root_prefit, sol_prefit = load(ROOT_PREFIT), load(SOL_PREFIT)
        if root_prefit.get("status") != "PASS_PREFIT_VISUAL_ONLY_PENDING_ACTUAL_RUNTIME" or root_prefit.get("reviewedCounts", {}).get("boards") != 12:
            structural.append("root prefit scope/status")
        if root_prefit.get("boundEvidence", {}).get("prefitVisualSol") != SOL_PREFIT_SHA:
            structural.append("root prefit Sol binding")
        if sol_prefit.get("status") != "PASS_PREFIT_VISUAL_ONLY_PENDING_ACTUAL_RUNTIME" or sol_prefit.get("reviewedCounts", {}).get("boards") != 12:
            structural.append("Sol prefit scope/status")

        build, runtime, focused, compat, negative, sol, root_actual = map(load, (BUILD, RUNTIME, FOCUSED, COMPAT, NEGATIVE, SOL, ROOT_ACTUAL))
        initial_gap = load(B05_INITIAL_GAP)
        gap_keys = {
            (row.get("kind"), row.get("itemId"), row.get("avatarId"), tuple(row.get("viewport", [])), row.get("theme"), row.get("state"))
            for row in initial_gap.get("gaps", [])
        }
        if sha(B05_INITIAL_GAP) != B05_INITIAL_GAP_SHA or initial_gap.get("status") != "FAIL_EVIDENCE_GAP" or initial_gap.get("unreadyStateCount") != 7 or initial_gap.get("affectedCaseCount") != 7 or len(gap_keys) != 7:
            structural.append("B05 original seven-gap evidence identity")
        hashes = candidate_hashes()
        if len(hashes) != 24 or build.get("candidateHashes") != hashes:
            structural.append("24 candidate hash binding")
        for i, a in ROWS:
            for layer in LAYERS:
                src, pub = source_path(i, a, layer), public_candidate_path(i, a, layer)
                if not pub.is_file() or pub.read_bytes() != src.read_bytes():
                    structural.append(f"QA/public candidate byte mismatch {i}/{a}/{layer}")
        dist_files = {str(p.relative_to(S / "candidate-dist")): sha(p) for p in sorted((S / "candidate-dist").rglob("*")) if p.is_file() and p.name != ".DS_Store"}
        if dist_files != build.get("distFiles") or fingerprint(dist_files) != build.get("distFingerprint"):
            structural.append("candidate dist drift")

        expected_full = [(i, a, (w, h), t) for i, a in ROWS for w, h, t in MODES]
        expected_compat = [(i, a, (w, h), t) for i, a in COMPAT_ROWS for w, h, t in MODES]
        for report, label, expected, compat_mode, six_shots in (
            (runtime, "original runtime", expected_full, False, False),
            (focused, "focused runtime", expected_full, False, True),
            (compat, "compatibility runtime", expected_compat, True, True),
        ):
            if report.get("status") != "PASS_TECHNICAL_CAPTURE_ONLY" or report.get("bindingErrors") or report.get("sealedBuildReportSha256") != sha(BUILD) or report.get("candidateHashes") != hashes or report.get("distFingerprint") != build.get("distFingerprint"):
                structural.append(label + " same-candidate/status")
            exact_cases(report.get("rows", []), expected, structural, label)
            for row in report.get("rows", []):
                i, a = row.get("itemId"), row.get("avatarId")
                kind = "compat" if compat_mode else "normal"
                row_identity = (kind, i, a, tuple(row.get("viewport", [])), row.get("theme"))
                expected_hashes = {l: hashes[f"{i}:{a}:{l}"] for l in LAYERS}
                served = row.get("servedCandidateHashes", {})
                served_ok = all(
                    served.get(layer, {}).get("sha256") == digest
                    and served.get(layer, {}).get("expectedSha256") == digest
                    and served.get(layer, {}).get("httpOk") is True
                    for layer, digest in expected_hashes.items()
                )
                if not row.get("pass") or row.get("errors") or row.get("candidateSourceHashes") != expected_hashes or not served_ok:
                    structural.append(label + f" row/hash {i}/{a}")
                states = row.get("states", {})
                for key in ("shopTrial", "shopEquipped", "home", "homeAfterReload", "achievements"):
                    gap = row_identity + (key,)
                    check_state(states.get(key, {}), i, a, label + " " + key, structural, compat=compat_mode, require_base=six_shots and gap not in gap_keys)
                check_state(
                    states.get("shopCancelled", {}), i, a, label + " shopCancelled", structural,
                    present=False, compat=compat_mode, require_base=six_shots and row_identity + ("shopCancelled",) not in gap_keys,
                )
                if row.get("staticStability", {}).get("pass") is not True:
                    structural.append(label + " static stability")
                wanted = {"shopTrial", "shopCancelled", "shopEquipped", "home", "homeAfterReload", "achievements"} if six_shots else {"shopTrial", "shopCancelled", "home", "achievements"}
                if set(row.get("screenshots", {})) != wanted:
                    structural.append(label + " screenshot state set")
                for entry in row.get("screenshots", {}).values():
                    check_screenshot(entry, structural, label)

        supplement = load(B05_BASE_SUPPLEMENT)
        supplement_visual = load(B05_BASE_SUPPLEMENT_VISUAL)
        original_hashes = {
            "candidate-dist-build.json": sha(BUILD),
            "runtime-gate-report.json": sha(RUNTIME),
            "runtime-focused-supplement-report.json": sha(FOCUSED),
            "layering-compat-report.json": sha(COMPAT),
            "negative-controls-report.json": sha(NEGATIVE),
            "runtime-completion-summary.json": sha(SUMMARY),
            "actual-visual-review-root.json": sha(ROOT_ACTUAL),
            "actual-visual-review-sol.json": sha(SOL),
            "acceptance-integrity.json": sha(INTEGRITY),
        }
        if sha(B05_BASE_SUPPLEMENT) != B05_BASE_SUPPLEMENT_SHA or supplement.get("status") != "PASS_SAME_DIST_BASE_READINESS_SUPPLEMENT" or supplement.get("errors") != [] or supplement.get("gapStateCount") != 7 or supplement.get("expectedCases") != 7:
            structural.append("B05 seven-case readiness supplement identity/status")
        if supplement.get("candidateBuildReportSha256") != sha(BUILD) or supplement.get("distFingerprint") != build.get("distFingerprint") or supplement.get("candidateHashes") != hashes or supplement.get("originalReportHashes") != original_hashes:
            structural.append("B05 seven-case readiness supplement same-candidate binding")
        repaired = set()
        for row in supplement.get("rows", []):
            identity = (row.get("kind"), row.get("itemId"), row.get("avatarId"), tuple(row.get("viewport", [])), row.get("theme"))
            for state_name in row.get("repairedGapStates", []):
                repaired.add(identity + (state_name,))
            if row.get("pass") is not True or row.get("errors"):
                structural.append("B05 readiness supplement row result")
            compat_row = row.get("kind") == "compat"
            for state_name in ("shopTrial", "shopEquipped", "home", "homeAfterReload", "achievements"):
                check_state(row.get("states", {}).get(state_name, {}), row.get("itemId"), row.get("avatarId"), "readiness supplement " + state_name, structural, compat=compat_row, require_base=True)
            check_state(row.get("states", {}).get("shopCancelled", {}), row.get("itemId"), row.get("avatarId"), "readiness supplement shopCancelled", structural, present=False, compat=compat_row, require_base=True)
            for entry in row.get("gapScreenshots", {}).values():
                check_screenshot(entry, structural, "readiness supplement")
        if repaired != gap_keys or len(supplement.get("rows", [])) != 7:
            structural.append("B05 readiness supplement exact gap coverage")
        if sha(B05_BASE_SUPPLEMENT_VISUAL) != B05_BASE_SUPPLEMENT_VISUAL_SHA or supplement_visual.get("status") != "PASS_FOCUSED_BASE_READINESS_VISUAL" or supplement_visual.get("supplementReport") != bound(B05_BASE_SUPPLEMENT):
            visual_errors.append("B05 readiness supplement visual identity/binding")
        visual_keys = set()
        for row in supplement_visual.get("rows", []):
            key = (row.get("kind"), row.get("itemId"), row.get("avatarId"), tuple(row.get("viewport", [])), row.get("theme"), row.get("state"))
            visual_keys.add(key)
            if row.get("actuallyViewed") is not True or row.get("decision") != "PASS_BASE_READINESS_VISUAL":
                visual_errors.append("B05 readiness supplement visual decision")
            check_screenshot(row.get("screenshot", {}), visual_errors, "readiness supplement visual")
        if visual_keys != gap_keys or len(supplement_visual.get("rows", [])) != 7:
            visual_errors.append("B05 readiness supplement visual exact coverage")

        names = {x.get("name") for x in negative.get("cases", [])}
        required_names = {"wrong-avatar-candidate", "missing-back", "missing-front", "swapped-item", "stale-candidate-screenshot"}
        if negative.get("status") != "PASS" or negative.get("baselineIntegrityPass") is not True or negative.get("baselineErrors") or names != required_names or any(x.get("actual") != "REJECT" or not x.get("detectedErrors") for x in negative.get("cases", [])):
            structural.append("five synthetic negative controls")

        if sol.get("status") != "PASS_ACTUAL_VISUAL_CANDIDATE_ONLY_PENDING_ROOT_ACCEPTANCE_AND_PROMOTION" or sol.get("reviewedCounts", {}).get("totalBoards") != 16:
            visual_errors.append("Sol actual visual status/scope")
        if {(x.get("kind"), x.get("itemId"), x.get("avatarId")) for x in sol.get("rows", [])} != ({("full-flow", i, a) for i, a in ROWS} | {("backpack-hat-compatibility", i, a) for i, a in COMPAT_ROWS}):
            visual_errors.append("Sol board exact coverage")
        for row in sol.get("rows", []):
            path = ROOT / row.get("board", "")
            if not row.get("actuallyViewed") or row.get("verdict") != "PASS_ACTUAL_VISUAL" or not path.is_file() or sha(path) != row.get("sha256"):
                visual_errors.append("Sol board binding " + str(row.get("board")))
        bindings = sol.get("technicalBindings", {})
        for key, path in {"buildReport": BUILD, "focusedRuntime": FOCUSED, "compatibility": COMPAT, "negativeControls": NEGATIVE}.items():
            if bindings.get(key) != bound(path):
                visual_errors.append("Sol technical binding " + key)
        expected_root_evidence = {
            "build": BUILD, "normalRuntime": RUNTIME, "focusedRuntime": FOCUSED,
            "layeringCompatibility": COMPAT, "negativeControls": NEGATIVE,
            "producerReview": SOL,
        }
        if root_actual.get("reviewer") != "root" or root_actual.get("status") != "PASS_QA_CANDIDATE_ONLY" or root_actual.get("actualViewing") != {"fullFlowBoards": 12, "compatibilityBoards": 4, "boundPanels": 384, "boardFingerprint": "d56ac2820b538b4ac2e4a471a0cd1effbb6455f7865d0425ea08a70e468c14aa"}:
            visual_errors.append("root actual visual identity/scope")
        for key, path in expected_root_evidence.items():
            evidence = root_actual.get("evidence", {}).get(key, {})
            if evidence.get("path") != str(path.relative_to(ROOT)) or evidence.get("sha256") != sha(path):
                visual_errors.append("root actual visual binding " + key)

        pred, pred_details = predecessor_errors()
        structural += ["predecessor boundary: " + x for x in pred]
        result.update({
            "predecessorBoundary": pred_details,
            "candidateHashes": hashes,
            "distFingerprint": build.get("distFingerprint"),
            "manifestBeforeB05Sha256": sha(MANIFEST),
            "coverage": {"originalFullFlow": 48, "focusedSixScreenshotFlow": 48, "representativeCompatibility": 16, "sameDistBaseReadinessGapCases": 7, "allFocusedAndCompatibilityStatesBaseReady": True, "syntheticNegativeControls": 5, "solActualVisualBoards": 16, "rootActualVisualBoards": 16, "rootPrefitBoards": 12},
            "requiredPostPromotion": {"focusedSixScreenshotFlow": 48, "representativeCompatibility": 16, "syntheticNegativeControls": 5, "actualVisualBoards": 16, "freshRootVisualReview": True},
        })
    except Exception as exc:
        structural.append(f"{type(exc).__name__}: {exc}")
    result.update({"structuralErrors": structural, "visualErrors": visual_errors, "promotionReady": not structural and not visual_errors})
    return result


if __name__ == "__main__":
    out = run()
    (S / "strict-acceptance.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(out, ensure_ascii=False, indent=2))
    raise SystemExit(0 if out["promotionReady"] else 1)
