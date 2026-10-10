#!/usr/bin/env python3
"""Strict B06 candidate acceptance against the exact final B03 predecessor."""
from __future__ import annotations

import hashlib
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import validate_v65_b03_acceptance as b03v
import promote_v65_b05 as b05p

BATCH = ROOT / "qa/v65/art-workpacks/B06"
S = BATCH / "full-candidate-runtime"
MANIFEST = ROOT / "src/data/avatarAssetManifest.json"
B05_REPORT = ROOT / "qa/v65/art-workpacks/B05/promotion-report.json"
B05_BUILD = ROOT / "qa/v65/art-workpacks/B05/post-promotion/candidate-dist-build.json"
B05_RUNTIME = ROOT / "qa/v65/art-workpacks/B05/post-promotion/runtime-focused-supplement-report.json"
B05_COMPAT = ROOT / "qa/v65/art-workpacks/B05/post-promotion/layering-compat-report.json"
B05_NEGATIVE = ROOT / "qa/v65/art-workpacks/B05/post-promotion/negative-controls-report.json"
B05_COMPLETION = ROOT / "qa/v65/art-workpacks/B05/post-promotion/completion-summary.json"
B05_VISUAL = ROOT / "qa/v65/art-workpacks/B05/post-promotion/fresh-visual-review-root.json"
B07_ALLOWLIST = BATCH / "b07-authorized-files.json"
B06_INITIAL_GAP = BATCH / "oversight-astra/base-readiness-original-fail.json"
B06_BASE_SUPPLEMENT = BATCH / "oversight-astra/base-readiness-supplement/report.json"
B06_BASE_SUPPLEMENT_VISUAL = BATCH / "oversight-astra/base-readiness-supplement/actual-visual-review-astra.json"
B06_OVERSIGHT = BATCH / "oversight-astra/prepromotion-oversight.json"

BUILD = S / "candidate-dist-build.json"
RUNTIME = S / "runtime-gate-report.json"
COMPAT = S / "layering-compat-report.json"
NEGATIVE = S / "negative-controls-report.json"
SOL = S / "actual-visual-review-sol.json"
ROOT_ACTUAL = S / "actual-visual-review-root.json"
ROOT_PREFIT = BATCH / "prefit-visual-review-root.json"
INTEGRITY = S / "candidate-runtime-integrity.json"
SUMMARY = S / "runtime-completion-summary.json"

ITEMS = ("cape-ocean", "cape-legend", "sister-galaxy-cape")
AVATARS = ("brother", "younger", "sister", "younger-sister")
LAYERS = ("back", "front")
ROWS = tuple((i, a) for i in ITEMS for a in AVATARS)
MODES = ((390, 844, "light"), (390, 844, "dark"), (1440, 900, "light"), (1440, 900, "dark"))
COMPAT_ROWS = (("cape-legend", "brother"), ("cape-ocean", "younger"), ("sister-galaxy-cape", "sister"), ("cape-legend", "younger-sister"))

B05_REPORT_SHA = "36dd63725287b88e16f8f677ccb76428687c9336bba061700f113d07b6e1295e"
B05_MANIFEST_SHA = "b4f8f7e6fe4b60925bbc5c746b427e7ef050a2722ce5af06f8466f5cd1103bbf"
B05_BUILD_SHA = "1a699eda092ddae567c7c4d2c6deb80c5023393128ef0df4d07f12701cedb556"
B05_RUNTIME_SHA = "86576e7a069a23d756e1838d93ff99c1d21868ba95cc32d2f710ce41341d395c"
B05_COMPAT_SHA = "1079381c04fdd0ddcb8063d51b8eed560f1114dc488797948ea622f4cebdaec0"
B05_NEGATIVE_SHA = "981008a41e641b282266148cb3bce5f63be324b1fca865796c36ede243698779"
B05_COMPLETION_SHA = "45a02537bec39a926cefeed3510b9e1152f28b8e0ea21c64f091eb20cab00f29"
B05_VISUAL_SHA = "0d9e553b711247db9a5cdd4052ec46b2fc1ae0ad0defaaa201ac26e5252678ea"
SEALED = {
 "candidate-dist-build.json":"7968cedfa46d8d7e0f9f0dc87685e8a84e34ec58489e5335cc2cebeaeb82e327",
 "runtime-gate-report.json":"60ffbb5560499bf4060379096654574a9c1a5307d185084a353018c011bdaf34",
 "layering-compat-report.json":"fa65513b73cc49e627a9668d9ed62c22848eb138ccd7659f39f70b3defd01b41",
 "negative-controls-report.json":"5b5354f1b607da14ebdc8216a3ccbda2b4ade16eaaa80c54b0c7be70a244a2b2",
 "actual-visual-review-sol.json":"6fe80877989879b7907a267cab4e798df51821023e983ee74ad846a27b820fa6",
 "actual-visual-review-root.json":"1572faf153595a5419b954fb1f379f6ed6874f60a47d2df2626d9904f9a4ac17",
 "candidate-runtime-integrity.json":"60117f4fee7fa4f52c0f4b81e4d8beff76ea5d1d4ca72c52d83e2960496592f8",
 "runtime-completion-summary.json":"9dc5c623f1917faa61e045fecaca14b622e4bf37173c649f40f1daf9c9a52eb1",
}
ROOT_PREFIT_SHA="5f68f8547c9e8371fc69a24ef7275b1c9bfa6c30701c9cbf7501a3d5f3d3137e"
B06_INITIAL_GAP_SHA="41898bb170382d49be42c74dafcb7ce13a6e6680c780ac80c2f727ef35fa8f7e"
B06_BASE_SUPPLEMENT_SHA="c12009c7abf2e3e13169a34e2bc58a8d0a5ae4b77d71ed02d6fbcbaf2b083b6d"
B06_BASE_SUPPLEMENT_VISUAL_SHA="2392928213993b5b24fa7cf0ac73e704690a4a371e9238756167ffb697762c4a"
B06_OVERSIGHT_SHA="1667e70e80036cf7599511f2f6a33d780b55887f8988b0535740aa0b61436964"

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
    return ROOT / f"public/assets/v6.5/art-candidates/B06/{avatar}/{item}-{layer}.webp"


def candidate_hashes():
    return {f"{i}:{a}:{l}": sha(source_path(i, a, l)) for i, a in ROWS for l in LAYERS}


def b07_snapshot():
    public_b07 = ROOT / "public/assets/v6.5/art-candidates/B07"
    paths = list(public_b07.rglob("*")) if public_b07.exists() else []
    return {
        str(p.relative_to(ROOT)): sha(p) for p in sorted(paths)
        if p.is_file() and p.name != ".DS_Store" and "__pycache__" not in p.parts and p.suffix != ".pyc"
    }


def b07_allowlist():
    return load(B07_ALLOWLIST)["authorizedFiles"]


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
            expected = f"/assets/v6.5/art-candidates/B06-full/{avatar}/{item}-{layer}.webp"
            if len(found) != 1 or not found[0].get("src", "").split("?")[0].endswith(expected):
                errors.append(surface + " " + layer + " path")
            elif not all(found[0].get(k) is True for k in ("complete", "decoded", "visible")):
                errors.append(surface + " " + layer + " visible")
    elif item in state.get("rendered", []) or item in state.get("cosmetics", []) or layers:
        errors.append(surface + " cancel did not restore base")
    if compat:
        if not {"pack-rocket", "hat-rocket"}.issubset(set(state.get("rendered", []))):
            errors.append(surface + " compatibility items")


def predecessor_errors(current_b07=None, run_predecessor_verifier=True):
    errors=[];details={}
    try:
        report=load(B05_REPORT);build=load(B05_BUILD);runtime=load(B05_RUNTIME);compat=load(B05_COMPAT);negative=load(B05_NEGATIVE);completion=load(B05_COMPLETION);visual=load(B05_VISUAL)
        exact=((B05_REPORT,B05_REPORT_SHA),(B05_BUILD,B05_BUILD_SHA),(B05_RUNTIME,B05_RUNTIME_SHA),(B05_COMPAT,B05_COMPAT_SHA),(B05_NEGATIVE,B05_NEGATIVE_SHA),(B05_COMPLETION,B05_COMPLETION_SHA),(B05_VISUAL,B05_VISUAL_SHA))
        for path,digest in exact:
            if sha(path)!=digest:errors.append('B05 predecessor SHA drift '+str(path.relative_to(ROOT)))
        if report.get('status')!='PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE' or report.get('manifestAfterSha256')!=B05_MANIFEST_SHA or sha(MANIFEST)!=B05_MANIFEST_SHA:errors.append('B05 promotion/manifest identity')
        if build.get('status')!='PASS' or runtime.get('status')!='PASS_TECHNICAL_CAPTURE_ONLY' or compat.get('status')!='PASS_TECHNICAL_CAPTURE_ONLY' or negative.get('status')!='PASS':errors.append('B05 fresh technical status')
        if completion.get('status')!='PASS_TECHNICAL_PENDING_FRESH_ROOT_VISUAL' or completion.get('promotionReportSha256')!=B05_REPORT_SHA:errors.append('B05 fresh completion binding')
        bv=visual.get('boundEvidence',{})
        if visual.get('status')!='PASS_POST_PROMOTION_VISUAL' or bv.get('promotionReport')!=B05_REPORT_SHA or bv.get('manifest')!=B05_MANIFEST_SHA or bv.get('freshCompletion')!=B05_COMPLETION_SHA:errors.append('B05 root fresh visual binding')
        verify=b05p.verify_promotion(report) if run_predecessor_verifier else []
        if verify:errors += ['B05 verify_promotion: '+x for x in verify]
        expected=b07_allowlist();actual=b07_snapshot() if current_b07 is None else current_b07
        if actual!=expected:
            missing=sorted(set(expected)-set(actual));extra=sorted(set(actual)-set(expected));changed=sorted(x for x in set(actual)&set(expected) if actual[x]!=expected[x])
            errors.append(f'B07 exact allowlist drift missing={missing} extra={extra} changed={changed}')
        details={'b05Promotion':bound(B05_REPORT),'b05Build':bound(B05_BUILD),'b05Runtime':bound(B05_RUNTIME),'b05Compatibility':bound(B05_COMPAT),'b05Negative':bound(B05_NEGATIVE),'b05Completion':bound(B05_COMPLETION),'b05RootVisual':bound(B05_VISUAL),'manifest':bound(MANIFEST),'b05VerifyPromotionErrors':verify,'b07Allowlist':bound(B07_ALLOWLIST),'b07AuthorizedFileCount':len(expected)}
    except Exception as exc:errors.append(f'{type(exc).__name__}: {exc}')
    return errors,details


def run():
    structural, visual_errors = [], []
    result = {"schemaVersion": 1, "suite": "v65-b06-strict-acceptance", "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "promotionReady": False}
    try:
        for name, expected in SEALED.items():
            if sha(S / name) != expected:
                structural.append("sealed evidence drift " + name)
        if sha(ROOT_PREFIT) != ROOT_PREFIT_SHA:
            structural.append("prefit review drift")
        root_prefit = load(ROOT_PREFIT)
        if root_prefit.get("status") != "PASS_PREFIT_VISUAL_ONLY_PENDING_ACTUAL_RUNTIME" or root_prefit.get("reviewedCounts", {}).get("boards") != 12:
            structural.append("root prefit scope/status")
        build, runtime, compat, negative, sol, root_actual = map(load, (BUILD, RUNTIME, COMPAT, NEGATIVE, SOL, ROOT_ACTUAL))
        initial_gap = load(B06_INITIAL_GAP)
        gap_keys = {
            (row.get("kind"), row.get("itemId"), row.get("avatarId"), tuple(row.get("viewport", [])), row.get("theme"), row.get("state"))
            for row in initial_gap.get("gaps", [])
        }
        if sha(B06_INITIAL_GAP) != B06_INITIAL_GAP_SHA or initial_gap.get("status") != "FAIL_EVIDENCE_GAP" or initial_gap.get("unreadyStateCount") != 4 or initial_gap.get("affectedCaseCount") != 4 or len(gap_keys) != 4:
            structural.append("B06 original four-gap evidence identity")
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
            (runtime, "runtime", expected_full, False, True),
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

        supplement = load(B06_BASE_SUPPLEMENT)
        supplement_visual = load(B06_BASE_SUPPLEMENT_VISUAL)
        original_hashes = {
            "candidate-dist-build.json": sha(BUILD),
            "runtime-gate-report.json": sha(RUNTIME),
            "layering-compat-report.json": sha(COMPAT),
            "negative-controls-report.json": sha(NEGATIVE),
            "runtime-completion-summary.json": sha(SUMMARY),
            "actual-visual-review-root.json": sha(ROOT_ACTUAL),
            "actual-visual-review-sol.json": sha(SOL),
            "candidate-runtime-integrity.json": sha(INTEGRITY),
        }
        if sha(B06_BASE_SUPPLEMENT) != B06_BASE_SUPPLEMENT_SHA or supplement.get("status") != "PASS_SAME_DIST_BASE_READINESS_SUPPLEMENT" or supplement.get("errors") != [] or supplement.get("gapStateCount") != 4 or supplement.get("expectedCases") != 4:
            structural.append("B06 four-case readiness supplement identity/status")
        if supplement.get("candidateBuildReportSha256") != sha(BUILD) or supplement.get("distFingerprint") != build.get("distFingerprint") or supplement.get("candidateHashes") != hashes or supplement.get("originalReportHashes") != original_hashes:
            structural.append("B06 four-case readiness supplement same-candidate binding")
        repaired = set()
        for row in supplement.get("rows", []):
            identity = (row.get("kind"), row.get("itemId"), row.get("avatarId"), tuple(row.get("viewport", [])), row.get("theme"))
            for state_name in row.get("repairedGapStates", []):
                repaired.add(identity + (state_name,))
            if row.get("pass") is not True or row.get("errors"):
                structural.append("B06 readiness supplement row result")
            compat_row = row.get("kind") == "compat"
            for state_name in ("shopTrial", "shopEquipped", "home", "homeAfterReload", "achievements"):
                check_state(row.get("states", {}).get(state_name, {}), row.get("itemId"), row.get("avatarId"), "readiness supplement " + state_name, structural, compat=compat_row, require_base=True)
            check_state(row.get("states", {}).get("shopCancelled", {}), row.get("itemId"), row.get("avatarId"), "readiness supplement shopCancelled", structural, present=False, compat=compat_row, require_base=True)
            for entry in row.get("gapScreenshots", {}).values():
                check_screenshot(entry, structural, "readiness supplement")
        if repaired != gap_keys or len(supplement.get("rows", [])) != 4:
            structural.append("B06 readiness supplement exact gap coverage")
        if sha(B06_BASE_SUPPLEMENT_VISUAL) != B06_BASE_SUPPLEMENT_VISUAL_SHA or supplement_visual.get("status") != "PASS_FOCUSED_BASE_READINESS_VISUAL" or supplement_visual.get("supplementReport") != bound(B06_BASE_SUPPLEMENT):
            visual_errors.append("B06 readiness supplement visual identity/binding")
        visual_keys = set()
        for row in supplement_visual.get("rows", []):
            key = (row.get("kind"), row.get("itemId"), row.get("avatarId"), tuple(row.get("viewport", [])), row.get("theme"), row.get("state"))
            visual_keys.add(key)
            if row.get("actuallyViewed") is not True or row.get("decision") != "PASS_BASE_READINESS_VISUAL":
                visual_errors.append("B06 readiness supplement visual decision")
            check_screenshot(row.get("screenshot", {}), visual_errors, "readiness supplement visual")
        if visual_keys != gap_keys or len(supplement_visual.get("rows", [])) != 4:
            visual_errors.append("B06 readiness supplement visual exact coverage")
        oversight = load(B06_OVERSIGHT)
        if sha(B06_OVERSIGHT) != B06_OVERSIGHT_SHA or oversight.get("status") != "PASS_CANDIDATE_EVIDENCE_PENDING_B05_FINAL_BOUNDARY" or oversight.get("errors") != [] or oversight.get("candidateEvidencePass") is not True:
            structural.append("B06 Astra prepromotion oversight identity/status")
        if oversight.get("readinessSupplement", {}).get("sha256") != B06_BASE_SUPPLEMENT_SHA or oversight.get("supplementActualVisual", {}).get("sha256") != B06_BASE_SUPPLEMENT_VISUAL_SHA or oversight.get("coverage", {}).get("supplementCases") != 4:
            structural.append("B06 Astra prepromotion oversight supplement binding")

        names = {x.get("name") for x in negative.get("cases", [])}
        required_names = {"wrong-avatar-candidate", "missing-back", "missing-front", "swapped-item", "stale-candidate-screenshot"}
        if negative.get("status") != "PASS" or negative.get("baselineIntegrityPass") is not True or negative.get("baselineErrors") or names != required_names or any(x.get("actual") != "REJECT" or not x.get("detectedErrors") for x in negative.get("cases", [])):
            structural.append("five synthetic negative controls")

        if sol.get("status") != "PASS_ACTUAL_VISUAL_CANDIDATE_ONLY_PENDING_INDEPENDENT_ROOT_ACCEPTANCE_AND_PROMOTION" or sol.get("reviewedCounts", {}).get("totalBoards") != 16:
            visual_errors.append("Sol actual visual status/scope")
        if {(x.get("kind"), x.get("itemId"), x.get("avatarId")) for x in sol.get("rows", [])} != ({("full-flow", i, a) for i, a in ROWS} | {("backpack-hat-compatibility", i, a) for i, a in COMPAT_ROWS}):
            visual_errors.append("Sol board exact coverage")
        for row in sol.get("rows", []):
            path = ROOT / row.get("board", "")
            if not row.get("actuallyViewed") or row.get("verdict") != "PASS_ACTUAL_VISUAL" or not path.is_file() or sha(path) != row.get("sha256"):
                visual_errors.append("Sol board binding " + str(row.get("board")))
        bindings = sol.get("technicalBindings", {})
        for key, path in {"buildReport": BUILD, "runtime": RUNTIME, "compatibility": COMPAT, "negativeControls": NEGATIVE}.items():
            if bindings.get(key) != bound(path):
                visual_errors.append("Sol technical binding " + key)
        expected_root_evidence = {
            "build": BUILD, "normalRuntime": RUNTIME,
            "layeringCompatibility": COMPAT, "negativeControls": NEGATIVE,
            "producerReview": SOL, "integrity": INTEGRITY, "completion": SUMMARY,
        }
        if root_actual.get("reviewer") != "root" or root_actual.get("status") != "PASS_QA_CANDIDATE_ONLY" or root_actual.get("actualViewing") != {"fullFlowBoards": 12, "compatibilityBoards": 4, "boundPanels": 384, "boardFingerprint": "8b9609e50e0af4688abe6d89e4e7be3e0f122f6550e008a0c185834be602d6e7"}:
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
            "manifestBeforeB06Sha256": sha(MANIFEST),
            "coverage": {"sixScreenshotFullFlow": 48, "representativeCompatibility": 16, "sameDistBaseReadinessGapCases": 4, "allRuntimeAndCompatibilityStatesBaseReady": True, "syntheticNegativeControls": 5, "solActualVisualBoards": 16, "rootActualVisualBoards": 16, "rootPrefitBoards": 12},
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
