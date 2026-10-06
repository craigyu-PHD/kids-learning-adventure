#!/usr/bin/env python3
"""Prepare or run fresh B06 post-promotion gates. Never performs promotion."""
from __future__ import annotations

import argparse
import hashlib
import json
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import promote_v65_b06 as p
import validate_v65_b06_acceptance as v

ROOT = v.ROOT
POST = v.BATCH / "post-promotion"
DIST = POST / "candidate-dist"
BUILD = POST / "candidate-dist-build.json"
PORT = 4217
SOURCE_NAMES = (
    "run-runtime-focused-supplement.py",
    "run-layering-compatibility.py",
    "test-negative-controls.py",
    "build-focused-review-boards.py",
)


def mark_failed(result, exc):
    result["status"] = "FAIL"
    result["error"] = f"{type(exc).__name__}: {exc}"
    return result


def adapters():
    POST.mkdir(parents=True, exist_ok=True)
    hashes = {}
    for name in SOURCE_NAMES:
        code = (v.S / name).read_text()
        code = code.replace("http://127.0.0.1:4216/", f"http://127.0.0.1:{PORT}/")
        code = code.replace('"candidateOnly":True', '"candidateOnly":False,"postPromotion":True')
        compile(code, name, "exec")
        target = POST / name
        target.write_text(code)
        hashes[name] = v.sha(target)
    support = f'''from pathlib import Path
import hashlib,json,sys
ROOT=Path({str(ROOT)!r});sys.path.insert(0,str(ROOT/'scripts'))
import validate_v65_b06_acceptance as v
import promote_v65_b06 as p
WORK=Path(__file__).resolve().parent;OUT=WORK/'candidate-dist';BUILD_REPORT=WORK/'candidate-dist-build.json';RUNTIME_REPORT=WORK/'runtime-focused-supplement-report.json'
ITEMS=v.ITEMS;AVATARS=v.AVATARS;LAYERS=v.LAYERS;ROWS=v.ROWS;VIEW_MODES=v.MODES
SOURCE_DIR=v.BATCH/'fit-candidates'
def sha_file(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def fingerprint(x):return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def source_path(i,a,l):return SOURCE_DIR/f'{{a}}__{{i}}-{{l}}.webp'
def candidate_url(i,a,l):return f'public/assets/v6.5/runtime/{{a}}/{{i}}-{{l}}.webp'
def candidate_hashes():return {{f'{{i}}:{{a}}:{{l}}':sha_file(source_path(i,a,l)) for i,a in ROWS for l in LAYERS}}
def dist_snapshot():return {{str(x.relative_to(OUT)):sha_file(x) for x in sorted(OUT.rglob('*')) if x.is_file() and x.name!='.DS_Store'}}
def verify_dist_report(r):
 e=p.verify_promotion(v.load(p.OUT))
 if r.get('status')!='PASS' or r.get('postPromotion') is not True:e.append('fresh build/promotion binding')
 if r.get('candidateHashes')!=candidate_hashes():e.append('candidate source drift')
 if r.get('rootSourceStartFingerprint')!=v.load(p.OUT).get('promotedInputFingerprint'):e.append('post build source fingerprint')
 files=dist_snapshot()
 if r.get('distFiles')!=files or r.get('distFingerprint')!=fingerprint(files):e.append('fresh dist drift')
 for n,h in r.get('adapterHashes',{{}}).items():
  if sha_file(WORK/n)!=h:e.append('adapter drift '+n)
 return e
'''
    compile(support, "runtime_support.py", "exec")
    (POST / "runtime_support.py").write_text(support)
    hashes["runtime_support.py"] = v.sha(POST / "runtime_support.py")
    info = {
        "schemaVersion": 1,
        "status": "PREPARED_NOT_EXECUTED",
        "port": PORT,
        "adapterHashes": hashes,
        "freshScope": {"focusedSixScreenshotFlow": 48, "representativeCompatibility": 16, "syntheticNegativeControls": 5, "actualVisualBoards": 16, "rootFreshVisualRequired": True},
        "promotionExecuted": False,
        "productionDeployed": False,
    }
    (POST / "adapter-preparation.json").write_text(json.dumps(info, ensure_ascii=False, indent=2) + "\n")
    return hashes


def build_only():
    result = {"schemaVersion": 1, "suite": "v65-b06-fresh-post-build", "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "status": "FAIL", "postPromotion": True}
    try:
        promotion = v.load(p.OUT)
        errors = p.verify_promotion(promotion)
        if errors:
            raise ValueError("; ".join(errors))
        result.update({"promotionReportSha256": v.sha(p.OUT), "adapterHashes": adapters(), "candidateHashes": v.candidate_hashes(), "rootSourceStartFingerprint": v.source_fingerprint()})
        if result["rootSourceStartFingerprint"] != promotion.get("promotedInputFingerprint"):
            raise ValueError("source fingerprint before fresh build")
        proc = subprocess.run([str(ROOT / "node_modules/.bin/vite"), "build", "--outDir", str(DIST), "--emptyOutDir"], cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        result["buildExitCode"] = proc.returncode
        result["buildOutputTail"] = proc.stdout[-10000:]
        if proc.returncode:
            raise ValueError("fresh build failed")
        files = {str(x.relative_to(DIST)): v.sha(x) for x in sorted(DIST.rglob("*")) if x.is_file() and x.name != ".DS_Store"}
        for row in promotion["copies"]:
            if files.get(row["destination"].removeprefix("public/")) != row["promotedSha256"]:
                raise ValueError("built promoted byte mismatch")
        if p.verify_promotion(promotion):
            raise ValueError("promotion drift during build")
        result.update({"status": "PASS", "distFiles": files, "distFingerprint": v.fingerprint(files), "indexSha256": files["index.html"], "rootSourceEndFingerprint": v.source_fingerprint()})
        if result["rootSourceEndFingerprint"] != result["rootSourceStartFingerprint"]:
            raise ValueError("source drift during build")
    except Exception as exc:
        mark_failed(result, exc)
    BUILD.parent.mkdir(parents=True, exist_ok=True)
    BUILD.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"status": result["status"], "error": result.get("error")}, ensure_ascii=False))
    return 0 if result["status"] == "PASS" else 1


def runtime():
    result = {"schemaVersion": 1, "suite": "v65-b06-fresh-post-gates", "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "status": "FAIL", "visualAcceptance": "PENDING_FRESH_ROOT_ACTUAL_REVIEW", "runs": []}
    server = None
    try:
        build = v.load(BUILD)
        if build.get("status") != "PASS":
            raise ValueError("fresh build absent")
        for name, digest in build["adapterHashes"].items():
            if v.sha(POST / name) != digest:
                raise ValueError("adapter drift " + name)
        promotion = v.load(p.OUT)
        if p.verify_promotion(promotion):
            raise ValueError("promotion drift")
        probe = socket.socket()
        probe.bind(("127.0.0.1", PORT))
        probe.close()
        server = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1", "--directory", str(DIST)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(60):
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/", timeout=1) as response:
                    served = hashlib.sha256(response.read()).hexdigest()
                break
            except OSError:
                time.sleep(.1)
        else:
            raise ValueError("fresh server failed")
        if served != build["indexSha256"]:
            raise ValueError("wrong served dist")
        for name in ("run-runtime-focused-supplement.py", "run-layering-compatibility.py", "test-negative-controls.py"):
            proc = subprocess.run([sys.executable, str(POST / name)], cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            log = POST / (name + ".log")
            log.write_text(proc.stdout)
            result["runs"].append({"runner": name, "exitCode": proc.returncode, "log": str(log.relative_to(ROOT))})
            if proc.returncode:
                raise ValueError(name + " failed")
        focused = v.load(POST / "runtime-focused-supplement-report.json")
        compat = v.load(POST / "layering-compat-report.json")
        negative = v.load(POST / "negative-controls-report.json")
        if focused.get("status") != "PASS_TECHNICAL_CAPTURE_ONLY" or len(focused.get("rows", [])) != 48 or not all(x.get("pass") for x in focused["rows"]):
            raise ValueError("fresh focused 48 flow")
        if compat.get("status") != "PASS_TECHNICAL_CAPTURE_ONLY" or len(compat.get("rows", [])) != 16 or not all(x.get("pass") for x in compat["rows"]):
            raise ValueError("fresh compatibility 16")
        if negative.get("status") != "PASS" or not negative.get("baselineIntegrityPass") or len(negative.get("cases", [])) != 5:
            raise ValueError("fresh five negatives")
        for report_name, report in (("focused", focused), ("compatibility", compat)):
            for row in report.get("rows", []):
                for state_name in ("shopTrial", "shopCancelled", "shopEquipped", "home", "homeAfterReload", "achievements"):
                    images = row.get("states", {}).get(state_name, {}).get("images", [])
                    bases = [x for x in images if "avatar-renderer-skin" in x.get("classes", [])]
                    if len(bases) != 1 or not all(bases[0].get(k) is True for k in ("complete", "decoded", "visible")):
                        raise ValueError(f"fresh {report_name} base readiness {row.get('itemId')}/{row.get('avatarId')}/{state_name}")
        subprocess.run([sys.executable, str(POST / "build-focused-review-boards.py")], cwd=ROOT, check=True)
        result.update({
            "status": "PASS_TECHNICAL_PENDING_FRESH_ROOT_VISUAL",
            "promotionReportSha256": v.sha(p.OUT),
            "buildReportSha256": v.sha(BUILD),
            "sourceFingerprint": v.source_fingerprint(),
            "coverage": {"focusedSixScreenshotFlow": 48, "representativeCompatibility": 16, "syntheticNegativeControls": 5, "freshBoards": 16},
            "reports": {n: v.bound(POST / n) for n in ("runtime-focused-supplement-report.json", "layering-compat-report.json", "negative-controls-report.json")},
        })
    except Exception as exc:
        mark_failed(result, exc)
    finally:
        if server:
            server.terminate()
            server.wait(timeout=10)
    (POST / "completion-summary.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["status"].startswith("PASS_") else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--prepare-only", action="store_true")
    mode.add_argument("--build-only", action="store_true")
    mode.add_argument("--runtime", action="store_true")
    args = parser.parse_args()
    if args.prepare_only:
        print(json.dumps({"prepared": adapters(), "executed": False}, ensure_ascii=False))
        return 0
    return build_only() if args.build_only else runtime()


if __name__ == "__main__":
    raise SystemExit(main())
