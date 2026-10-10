#!/usr/bin/env python3
"""Fail-closed B07 repair-v4 acceptance; B06 predecessor hashes are placeholders."""
from __future__ import annotations

import argparse, hashlib, json, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import validate_v65_b03_acceptance as snapshot_support
import promote_v65_b06 as b06p

BATCH = ROOT / "qa/v65/art-workpacks/B07/repair-v4"
S = BATCH / "full-candidate-runtime"
O = BATCH / "oversight-astra"
MANIFEST = ROOT / "src/data/avatarAssetManifest.json"
ITEMS = ("sky-view-glasses", "glasses-racer", "glasses-star")
AVATARS = ("brother", "younger", "sister", "younger-sister")
ROWS = tuple((i, a) for i in ITEMS for a in AVATARS)
MODES = ((390, 844, "light"), (390, 844, "dark"), (1440, 900, "light"), (1440, 900, "dark"))
COMPAT_ROWS = (("sky-view-glasses", "brother"), ("glasses-racer", "younger"), ("glasses-star", "sister"), ("sky-view-glasses", "younger-sister"))
STATES = ("shopTrial", "shopCancelled", "shopEquipped", "home", "homeAfterReload", "achievements")

BUILD = S / "candidate-dist-build.json"
RUNTIME = S / "runtime-gate-report.json"
COMPAT = S / "compatibility-report.json"
NEGATIVE = S / "negative-controls-report.json"
SOL = S / "actual-visual-review-sol.json"
ROOT_VISUAL = S / "actual-visual-review-root.json"
INTEGRITY = S / "candidate-runtime-integrity.json"
COMPLETION = S / "runtime-completion-summary.json"
INITIAL_GAP = O / "original-readiness-gap.json"
SUPPLEMENT = O / "readiness-supplement/report.json"
SUPPLEMENT_VISUAL = O / "readiness-supplement/actual-visual-review-astra.json"
INDEPENDENT_NEGATIVE = O / "negative-controls-independent.json"
OVERSIGHT = O / "prepromotion-oversight.json"
ALLOWLIST = BATCH / "candidate-authorized-files.json"

SEALED = {
    BUILD: "25d79b0aad2a029b7e07b37e0e50cfdbb1cf5efb86671199ff4c199f9ff40be0",
    RUNTIME: "350a827fe2fd98092cb9e12ad0982a2790eb6f29d6debaf9d1c22d0a6b057679",
    COMPAT: "781c0b8a38388d509b2ff6b6690aacab9d4d7a040cead1217eaec5935a0161d0",
    NEGATIVE: "4e0c2cce1f453102dfb2935e3d92c2ba5472384d0c0e40eefb0e04e55b022fcd",
    SOL: "7dd15a279280e4ec9ef84c49cb45565cabc2cb8e4df396cfd6e0ac4ee13cb5ff",
    ROOT_VISUAL: "a24f7104bd82a830e2f1cb6101921de1f7d7dfffb71196e7abbdf40b65b072c9",
    INTEGRITY: "d6ea89f448a97bf5e380547d127eb6207c10cf95122b41cc3d23bc150c2b536b",
    COMPLETION: "15212b6b84869e8791ffa5f67ff65b74f3e1e48df7357c741cf3f28f401092b8",
    INITIAL_GAP: "ce67e7d3183a8dca7e3d14f5334ee02bf10bd66443db9276b405b20045f5b88e",
    SUPPLEMENT: "1df2a69c51817543dc07c39f567489be029a4b3726ea1b8ff2c673f89d8c79f6",
    SUPPLEMENT_VISUAL: "f2c886a94e1010de2e9602a80e093628bb5419b73e13e216c7ca2da6a72a588d",
    INDEPENDENT_NEGATIVE: "8581c1554a064b99df0c9ae14e307f0cf8ddfec2c022d62ce467632dfe1b4d08",
    OVERSIGHT: "22b1640ccaaea60a63aaf4dd349d6da900f4a48d016826c8b27e5c167c1ba4d9",
}

# Root must replace every value after B06 local promotion and fresh acceptance.
B06_FINAL = {
    "promotion": "18f8f27faa4254f95889dffc249e4b1d504921bf93ffd70b3a4b7a226ac3c021",
    "manifest": "fe5e767326b5882d2a61352a6b65268d9eba33067224a5f40b06afec0b31c41c",
    "build": "ba177c0d703b0de7885df48ac7e9c9a74251b7e57e85e2b7f6eac70af210d4fc",
    "runtime": "e04b132a10002ded7562d3482db4e6d53de0b8117f723ca2b29e90fdf9b5b234",
    "compatibility": "58ea822e9771b564045d0429fd76d7cad1fdafe1a96cb741a8ae78d290ab411f",
    "negative": "2010e7781bfe558b20ad71f7ad9e4e643db2862fc712ec8f4d99666f0bddcfce",
    "completion": "6f455623ed5b3b02ea29ef06c3a0d6ccb8e0122147a97cf7c2a13ccc458d9480",
    "rootVisual": "6ddd80068e7417f4b29a3669f4f24583bf73cb95ac3f06b9d962f64806108221",
    "finalOversight": "b50dc5d528c35dcf0831a92a7fc8ce24699f92ac17031419c1ec69eda362efd5",
}
B06_PATHS = {
    "promotion": ROOT / "qa/v65/art-workpacks/B06/promotion-report.json",
    "build": ROOT / "qa/v65/art-workpacks/B06/post-promotion/candidate-dist-build.json",
    "runtime": ROOT / "qa/v65/art-workpacks/B06/post-promotion/runtime-focused-supplement-report.json",
    "compatibility": ROOT / "qa/v65/art-workpacks/B06/post-promotion/layering-compat-report.json",
    "negative": ROOT / "qa/v65/art-workpacks/B06/post-promotion/negative-controls-report.json",
    "completion": ROOT / "qa/v65/art-workpacks/B06/post-promotion/completion-summary.json",
    "rootVisual": ROOT / "qa/v65/art-workpacks/B06/post-promotion/fresh-visual-review-root.json",
    "finalOversight": ROOT / "qa/v65/art-workpacks/B06/oversight-astra/final-oversight.json",
}

def load(p: Path): return json.loads(p.read_text())
def sha(p: Path): return hashlib.sha256(p.read_bytes()).hexdigest()
def fingerprint(v): return hashlib.sha256(json.dumps(v, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
def normalize(v): return {p:h for p,h in v.items() if Path(p).name != ".DS_Store"}
def source_snapshot(): return snapshot_support.source_snapshot()
def public_snapshot(): return snapshot_support.public_snapshot()
def source_fingerprint(): return fingerprint(normalize(source_snapshot()))
def bound(p: Path): return {"path": str(p.relative_to(ROOT)), "sha256": sha(p)}
def source_path(i, a): return BATCH / f"candidates/{a}/{i}.webp"
def public_candidate_path(i, a): return ROOT / f"public/assets/v6.5/art-candidates/B07/{a}/{i}.webp"
def candidate_hashes(): return {f"{i}:{a}": sha(source_path(i,a)) for i,a in ROWS}

def candidate_snapshot():
    base = ROOT / "public/assets/v6.5/art-candidates/B07"
    return {str(p.relative_to(ROOT)):sha(p) for p in sorted(base.rglob("*")) if p.is_file() and p.name != ".DS_Store"}

def expected_allowlist(): return load(ALLOWLIST)["authorizedFiles"]

def predecessor_errors():
    errors, details = [], {"requiredHashes": B06_FINAL}
    unresolved = sorted(k for k,v in B06_FINAL.items() if v.startswith("__B06_FINAL_"))
    if unresolved: errors.append("unresolved B06 final placeholders: " + ",".join(unresolved))
    for key,path in B06_PATHS.items():
        if not path.is_file() and not B06_FINAL[key].startswith("__"): errors.append("missing B06 predecessor " + key)
        elif not B06_FINAL[key].startswith("__") and sha(path) != B06_FINAL[key]: errors.append("B06 predecessor SHA drift " + key)
        elif path.is_file(): details[key] = bound(path)
    if not B06_FINAL["manifest"].startswith("__") and sha(MANIFEST) != B06_FINAL["manifest"]: errors.append("B06 final manifest drift")
    details["manifest"] = bound(MANIFEST)
    live_verify = []
    if B06_PATHS["promotion"].is_file() and not B06_FINAL["promotion"].startswith("__"):
        live_verify = b06p.verify_promotion(load(B06_PATHS["promotion"]))
        if live_verify: errors += ["B06 live verify_promotion: " + x for x in live_verify]
    details["b06LiveVerifyPromotionErrors"] = live_verify
    if not errors:
        final = load(B06_PATHS["finalOversight"])
        if final.get("status") != "PASS_TRANSACTION_AND_FRESH_EVIDENCE_BOUNDARIES" or final.get("errors") != [] or final.get("currentPostPromotionVerificationErrors") != []:
            errors.append("B06 final oversight status")
        if final.get("promotionSHA256") != B06_FINAL["promotion"] or final.get("manifestSHA256") != B06_FINAL["manifest"]:
            errors.append("B06 final oversight transaction binding")
        for key in ("promotion","build","runtime","compatibility","negative","completion","rootVisual"):
            if final.get("evidence",{}).get(key,{}).get("sha256") != B06_FINAL[key]: errors.append("B06 final oversight evidence " + key)
    return errors, details

def check_screenshot(entry, errors, label):
    p = ROOT / str(entry.get("path", ""))
    if not p.is_file() or sha(p) != entry.get("sha256"): errors.append(label + " screenshot drift")

def check_base(state, errors, label):
    bases = [x for x in state.get("images",[]) if "avatar-renderer-skin" in x.get("classes",[])]
    if len(bases) != 1 or not all(bases[0].get(k) is True for k in ("complete","decoded","visible")):
        errors.append(label + " base not complete decoded visible")

def exact_case_keys(rows, kind=None):
    return {(kind or r.get("kind"),r.get("itemId"),r.get("avatarId"),tuple(r.get("viewport",[])),r.get("theme")) for r in rows}

def run(*, allow_placeholders=False):
    structural, visual = [], []
    result = {"schemaVersion":1,"suite":"v65-b07-repair-v4-strict-acceptance","createdAt":time.strftime("%Y-%m-%dT%H:%M:%S%z"),"promotionReady":False}
    try:
        for p,d in SEALED.items():
            if sha(p) != d: structural.append("sealed evidence drift " + str(p.relative_to(ROOT)))
        hashes = candidate_hashes()
        build,runtime,compat,negative,sol,root_visual,supplement,oversight = map(load,(BUILD,RUNTIME,COMPAT,NEGATIVE,SOL,ROOT_VISUAL,SUPPLEMENT,OVERSIGHT))
        if len(hashes)!=12 or build.get("candidateHashes")!=hashes: structural.append("12 candidate hash binding")
        if candidate_snapshot()!=expected_allowlist(): structural.append("B07 exact public candidate allowlist drift")
        # repair-v4 promotion sources are the sealed QA candidates. The existing
        # public B07 candidate set is a separately frozen boundary and must not be
        # silently overwritten during preparation.
        dist={str(p.relative_to(S/'candidate-dist')):sha(p) for p in sorted((S/'candidate-dist').rglob('*')) if p.is_file() and p.name!='.DS_Store'}
        if dist!=build.get('distFiles') or fingerprint(dist)!=build.get('distFingerprint'): structural.append('candidate dist drift')
        expected_normal={("normal",i,a,(w,h),t) for i,a in ROWS for w,h,t in MODES}
        expected_compat={("compat",i,a,(w,h),t) for i,a in COMPAT_ROWS for w,h,t in MODES}
        if exact_case_keys(runtime.get('rows',[]),'normal')!=expected_normal or len(runtime.get('rows',[]))!=48: structural.append('runtime exact 48 cases')
        if exact_case_keys(compat.get('rows',[]),'compat')!=expected_compat or len(compat.get('rows',[]))!=16: structural.append('compat exact 16 cases')
        for report,label in ((runtime,'normal'),(compat,'compat')):
            if report.get('status')!='PASS_TECHNICAL_CAPTURE_ONLY' or report.get('bindingErrors') or report.get('distFingerprint')!=build.get('distFingerprint'): structural.append(label+' same-candidate/status')
            for row in report.get('rows',[]):
                if row.get('pass') is not True or row.get('failures') or row.get('staleAssetRequests'): structural.append(label+' row failure')
                if set(row.get('screenshots',{}))!=set(STATES): structural.append(label+' six screenshot states')
                for e in row.get('screenshots',{}).values(): check_screenshot(e,structural,label)
        if load(INITIAL_GAP).get('missingDecodedCount')!=384 or load(INITIAL_GAP).get('stateCount')!=384: structural.append('original 384-state gap identity')
        if supplement.get('status')!='PASS_SAME_DIST_ALL_STATE_READINESS' or supplement.get('errors')!=[] or supplement.get('expectedCases')!=64 or supplement.get('candidateHashes')!=hashes or supplement.get('distFingerprint')!=build.get('distFingerprint'): structural.append('64-case readiness supplement binding/status')
        if len(supplement.get('rows',[]))!=64 or exact_case_keys(supplement.get('rows',[]))!=(expected_normal|expected_compat): structural.append('readiness supplement exact 64 cases')
        state_count=0
        for row in supplement.get('rows',[]):
            if row.get('pass') is not True or row.get('failures'): structural.append('readiness row failure')
            for name in STATES:
                state_count += 1; check_base(row.get('states',{}).get(name,{}),structural,'readiness '+name)
            if set(row.get('screenshots',{}))!=set(STATES): structural.append('readiness six screenshots')
            for e in row.get('screenshots',{}).values(): check_screenshot(e,structural,'readiness')
        if state_count!=384: structural.append('readiness exact 384 states')
        names={x.get('name') for x in negative.get('cases',[])}
        if negative.get('status')!='PASS' or negative.get('baselineErrors') or len(names)<5 or any(x.get('actual')!='REJECT' or not x.get('detectedErrors') for x in negative.get('cases',[])): structural.append('five-plus negative controls')
        independent=load(INDEPENDENT_NEGATIVE)
        if independent.get('status')!='PASS' or len(independent.get('cases',[]))<5 or any(x.get('actual')!='REJECT' or not x.get('errors') for x in independent.get('cases',[])): structural.append('independent five-plus negatives')
        if len(supplement.get('readinessNegativeControls',[]))<4 or any(x.get('actual')!='REJECT' or not x.get('errors') for x in supplement.get('readinessNegativeControls',[])): structural.append('readiness negatives')
        if sol.get('deterministicDecision')!='PASS_ACTUAL_VISUAL_CANDIDATE_ONLY' or sol.get('coverage',{}).get('panelsActuallyViewed')!=384 or sol.get('blockingIssues'): visual.append('Sol visual scope/status')
        if root_visual.get('status')!='PASS_QA_CANDIDATE_ONLY' or root_visual.get('actualViewing',{}).get('boundPanels')!=384 or root_visual.get('visualFindings',{}).get('blockingIssues'): visual.append('root visual scope/status')
        sv=load(SUPPLEMENT_VISUAL)
        if sv.get('status')!='PASS_ACTUAL_VISUAL_SUPPLEMENT' or sv.get('blockingIssues') or sv.get('report')!=bound(SUPPLEMENT): visual.append('Astra supplement visual binding')
        if oversight.get('status')!='PASS_CANDIDATE_EVIDENCE_PENDING_PREDECESSOR_PREFLIGHT' or oversight.get('errors')!=[] or oversight.get('coverage',{}).get('newReadyStates')!=384: structural.append('Astra oversight identity/status')
        pred,pred_details=predecessor_errors()
        if allow_placeholders: pred=[x for x in pred if not x.startswith('unresolved B06 final placeholders:')]
        structural += ['predecessor boundary: '+x for x in pred]
        result.update({"predecessorBoundary":pred_details,"blockingPlaceholders":sorted(k for k,v in B06_FINAL.items() if v.startswith('__B06_FINAL_')),"candidateHashes":hashes,"distFingerprint":build.get('distFingerprint'),"coverage":{"fullFlowCases":48,"compatibilityCases":16,"totalCases":64,"baseReadyStates":384,"negativeControls":len(names)+len(supplement.get('readinessNegativeControls',[])),"actualVisualPanels":384},"requiredPostPromotion":{"totalCases":64,"baseReadyStates":384,"syntheticNegativeControls":5,"freshRootVisualRequired":True}})
    except Exception as exc: structural.append(f"{type(exc).__name__}: {exc}")
    placeholders=result.get('blockingPlaceholders',[])
    result.update({"errors":structural+visual,"structuralErrors":structural,"visualErrors":visual,"candidateEvidenceReady":not structural and not visual,"promotionReady":not structural and not visual and not placeholders})
    if allow_placeholders and placeholders and not structural and not visual: result['status']='PREPARED_PENDING_B06_FINAL_HASHES'
    elif result['promotionReady']: result['status']='PASS'
    else: result['status']='FAIL'
    return result

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--prepare-only',action='store_true');args=ap.parse_args()
    out=run(allow_placeholders=args.prepare_only)
    target=BATCH/('acceptance-preparation.json' if args.prepare_only else 'strict-acceptance.json')
    target.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(out,ensure_ascii=False,indent=2))
    ok=out['candidateEvidenceReady'] if args.prepare_only else out['promotionReady']
    return 0 if ok else 1

if __name__=='__main__': raise SystemExit(main())
