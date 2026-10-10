#!/usr/bin/env python3
"""V6.4 T08/P12 same-candidate fresh release acceptance runner.

This runner never deploys, pushes, changes credentials, or edits product inputs.
It requires a pre-existing owning-input fingerprint and verifies that fingerprint
before and after every gate. QA/evidence outputs are allowed to change.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import signal
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FINGERPRINT = ROOT / "qa/release-candidate/20260917/v64-t08-owning-input-fingerprint.json"
DEFAULT_OUT = ROOT / "qa/release-candidate/20260917/p12-fresh"
AUDIT_URL = os.environ.get("AUDIT_URL", "http://127.0.0.1:4173/")
VERCEL_CLI_VERSION = "59.19.0"
LIGHTHOUSE_VERSION = "13.4.1"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def run_process(command: str, log_path: Path, env: dict[str, str]) -> tuple[int, float]:
    start = time.monotonic()
    with log_path.open("w", encoding="utf-8") as log:
        log.write(f"$ {command}\n")
        log.flush()
        proc = subprocess.Popen(
            command,
            cwd=ROOT,
            shell=True,
            executable="/bin/bash",
            stdout=log,
            stderr=subprocess.STDOUT,
            env=env,
            text=True,
        )
        rc = proc.wait()
    return rc, round(time.monotonic() - start, 3)


def verify_fingerprint(fp_path: Path, log_path: Path, env: dict[str, str]) -> tuple[bool, dict[str, Any]]:
    command = f"python3 scripts/qa_v64_candidate_fingerprint.py --output {fp_path.relative_to(ROOT)} --verify"
    rc, duration = run_process(command, log_path, env)
    payload: dict[str, Any] = {"status": "FAIL", "durationSec": duration}
    try:
        text = log_path.read_text(encoding="utf-8")
        start = text.rfind("{\n")
        if start >= 0:
            payload.update(json.loads(text[start:]))
    except Exception as exc:
        payload["parseError"] = str(exc)
    payload["exitCode"] = rc
    return rc == 0, payload


def ollama_ready(timeout: float = 1.5) -> bool:
    try:
        with urllib.request.urlopen("http://127.0.0.1:11434/api/tags", timeout=timeout) as res:
            return res.status == 200
    except Exception:
        return False


def run_local_world_vision(out_dir: Path, env: dict[str, str]) -> dict[str, Any]:
    gate_id = "world-local-vision"
    log_path = out_dir / f"{gate_id}.log"
    if not shutil.which("ollama"):
        log_path.write_text("ollama executable missing\n", encoding="utf-8")
        return {"id": gate_id, "status": "FAIL", "exitCode": 127, "durationSec": 0, "log": str(log_path.relative_to(ROOT)), "reason": "ollama missing"}

    started_server = False
    server: subprocess.Popen[str] | None = None
    server_log = out_dir / "ollama-local-vision.log"
    server_handle = None
    start = time.monotonic()
    try:
        if not ollama_ready():
            server_handle = server_log.open("w", encoding="utf-8")
            server = subprocess.Popen(
                ["ollama", "serve"],
                cwd=ROOT,
                stdout=server_handle,
                stderr=subprocess.STDOUT,
                env=env,
                text=True,
                start_new_session=True,
            )
            started_server = True
            deadline = time.monotonic() + 45
            while time.monotonic() < deadline and not ollama_ready():
                if server.poll() is not None:
                    break
                time.sleep(0.5)
        if not ollama_ready():
            log_path.write_text("local Ollama service did not become ready\n", encoding="utf-8")
            return {"id": gate_id, "status": "FAIL", "exitCode": 1, "durationSec": round(time.monotonic()-start,3), "log": str(log_path.relative_to(ROOT)), "reason": "ollama not ready"}
        listed = subprocess.run(["ollama", "list"], cwd=ROOT, env=env, text=True, capture_output=True)
        if "gemma3:4b" not in listed.stdout:
            log_path.write_text("gemma3:4b is not already installed; runner will not download models.\n" + listed.stdout + listed.stderr, encoding="utf-8")
            return {"id": gate_id, "status": "FAIL", "exitCode": 1, "durationSec": round(time.monotonic()-start,3), "log": str(log_path.relative_to(ROOT)), "reason": "preinstalled gemma3:4b missing"}
        rc, _ = run_process("python3 scripts/qa_v64_world_local_vision.py --model gemma3:4b", log_path, env)
        return {"id": gate_id, "status": "PASS" if rc == 0 else "FAIL", "exitCode": rc, "durationSec": round(time.monotonic()-start,3), "log": str(log_path.relative_to(ROOT)), "model": "gemma3:4b", "externalUpload": False}
    finally:
        if started_server and server is not None and server.poll() is None:
            try:
                os.killpg(server.pid, signal.SIGTERM)
                server.wait(timeout=10)
            except Exception:
                try:
                    os.killpg(server.pid, signal.SIGKILL)
                except Exception:
                    pass
        if server_handle is not None:
            server_handle.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fingerprint", default=str(DEFAULT_FINGERPRINT.relative_to(ROOT)))
    parser.add_argument("--output", default=str(DEFAULT_OUT.relative_to(ROOT)))
    args = parser.parse_args()

    fingerprint = ROOT / args.fingerprint
    out_dir = ROOT / args.output
    out_dir.mkdir(parents=True, exist_ok=True)
    summary_path = out_dir / "p12-summary.json"
    matrix_path = out_dir / "p12-matrix.json"
    env = os.environ.copy()
    env.update({"AUDIT_URL": AUDIT_URL, "CI": "1", "TZ": "Asia/Taipei"})

    if not fingerprint.is_file():
        payload = {"status": "FAIL", "reason": "candidate fingerprint missing", "fingerprint": str(fingerprint.relative_to(ROOT))}
        summary_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 1

    expected = json.loads(fingerprint.read_text(encoding="utf-8"))
    fingerprint_sha = sha256(fingerprint)
    initial_ok, initial_verify = verify_fingerprint(fingerprint, out_dir / "fingerprint-initial.log", env)
    if not initial_ok:
        payload = {"status": "FAIL", "reason": "candidate fingerprint already drifted", "fingerprintSha256": fingerprint_sha, "verify": initial_verify}
        summary_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 1

    gates: list[tuple[str, str]] = [
        ("curriculum-offline", "npm run validate"),
        ("curriculum-online-360", "npm run validate:online"),
        ("architecture", "npm run qa:architecture"),
        ("learning", "npm run qa:learning"),
        ("strict", "npm run qa:strict"),
        ("speech-recorder-engineering", "npm run qa:speech-recorder"),
        ("state", "npm run qa:state"),
        ("auth", "npm run qa:auth"),
        ("migration", "npm run qa:migration"),
        ("date", "npm run qa:date"),
        ("shop-core-concurrency", "npm run qa:shop"),
        ("assets", "npm run qa:assets"),
        ("avatar-assets", "npm run qa:avatar-assets"),
        ("content-health", "npm run qa:content-health"),
        ("avatar-slots", "npm run qa:v64:slots"),
        ("shop-preview-252", "npm run qa:v63:shop-preview"),
        ("shop-transactions-252", "npm run qa:v63:shop-transactions"),
        ("preview-layout", "npm run qa:v63:preview-layout"),
        ("responsive-p02", "npm run qa:v64:4k"),
        ("home-interaction-sample", "npm run qa:v64:home-sample"),
        ("shop-ux", "npm run qa:v64:shop-ux"),
        ("browser-three-engine", "npm run qa:v64:browser"),
        ("motion-reduced-motion", "npm run qa:v64:motion"),
        ("world-runtime", "npm run qa:v64:world-runtime"),
        ("art-manifest-current", "npm run prebuild"),
        ("delivery-ledger-207", "npm run qa:v64:delivery-ledger"),
        ("build", "npm run build"),
        ("vercel-prod-local-build", f"npx --yes vercel@{VERCEL_CLI_VERSION} build --prod --yes"),
        ("lighthouse-fresh", f"npx --yes lighthouse@{LIGHTHOUSE_VERSION} {AUDIT_URL} --preset=desktop --output=json --output-path=.qa/lighthouse-v51.json --only-categories=performance --chrome-flags='--headless --no-sandbox --disable-gpu' --quiet"),
        ("performance", "npm run qa:v51:performance"),
        ("orbit", "npm run qa:orbit"),
        ("css-debt", "npm run qa:v62:css"),
        ("git-diff-check", "git diff --check"),
    ]

    results: list[dict[str, Any]] = []
    candidate_drift = False
    for index, (gate_id, command) in enumerate(gates, start=1):
        pre_ok, pre_verify = verify_fingerprint(fingerprint, out_dir / f"{index:02d}-{gate_id}-fingerprint-pre.log", env)
        if not pre_ok:
            results.append({"id": gate_id, "status": "NOT_RUN_FINGERPRINT_DRIFT", "command": command, "fingerprintPre": pre_verify})
            candidate_drift = True
            break
        log_path = out_dir / f"{index:02d}-{gate_id}.log"
        print(f"[P12 {index}/{len(gates)+1}] {gate_id}", flush=True)
        rc, duration = run_process(command, log_path, env)
        post_ok, post_verify = verify_fingerprint(fingerprint, out_dir / f"{index:02d}-{gate_id}-fingerprint-post.log", env)
        row = {
            "id": gate_id,
            "status": "PASS" if rc == 0 and post_ok else ("FAIL_FINGERPRINT_DRIFT" if not post_ok else "FAIL"),
            "exitCode": rc,
            "durationSec": duration,
            "command": command,
            "log": str(log_path.relative_to(ROOT)),
            "logSha256": sha256(log_path),
            "fingerprintPost": post_verify,
        }
        results.append(row)
        print(json.dumps({"gate": gate_id, "status": row["status"], "exitCode": rc, "durationSec": duration}, ensure_ascii=False), flush=True)
        if not post_ok:
            candidate_drift = True
            break

    if not candidate_drift:
        index = len(results) + 1
        pre_ok, pre_verify = verify_fingerprint(fingerprint, out_dir / f"{index:02d}-world-local-vision-fingerprint-pre.log", env)
        if pre_ok:
            print(f"[P12 {index}/{len(gates)+1}] world-local-vision", flush=True)
            visual = run_local_world_vision(out_dir, env)
            post_ok, post_verify = verify_fingerprint(fingerprint, out_dir / f"{index:02d}-world-local-vision-fingerprint-post.log", env)
            visual["fingerprintPost"] = post_verify
            if not post_ok:
                visual["status"] = "FAIL_FINGERPRINT_DRIFT"
                candidate_drift = True
            if Path(ROOT / visual["log"]).is_file():
                visual["logSha256"] = sha256(ROOT / visual["log"])
            results.append(visual)
            print(json.dumps({"gate": visual["id"], "status": visual["status"], "durationSec": visual.get("durationSec")}, ensure_ascii=False), flush=True)
        else:
            candidate_drift = True
            results.append({"id": "world-local-vision", "status": "NOT_RUN_FINGERPRINT_DRIFT", "fingerprintPre": pre_verify})

    final_ok, final_verify = verify_fingerprint(fingerprint, out_dir / "fingerprint-final.log", env)
    if not final_ok:
        candidate_drift = True

    pass_count = sum(r.get("status") == "PASS" for r in results)
    fail_rows = [r for r in results if r.get("status") != "PASS"]
    status = "PASS" if not fail_rows and final_ok and not candidate_drift and len(results) == len(gates)+1 else "FAIL"
    matrix = {
        "schemaVersion": 1,
        "suiteName": "v64-p12-same-candidate-fresh-gate-matrix",
        "status": status,
        "candidate": {
            "fingerprintPath": str(fingerprint.relative_to(ROOT)),
            "fingerprintFileSha256": fingerprint_sha,
            "aggregateSha256": expected.get("aggregateSha256"),
            "gitHead": expected.get("gitHead"),
            "fileCount": expected.get("fileCount"),
        },
        "releaseBoundary": {
            "productionDeploy": "NOT_PERFORMED",
            "push": "NOT_PERFORMED",
            "credentialsPermissions": "NOT_CHANGED",
            "pronunciationAssessment": "EXTERNAL_BLOCKED_SAFE_MODE_ONLY",
            "nextIfPass": "P13 explicit user Production confirmation",
        },
        "auditUrl": AUDIT_URL,
        "vercelCliVersion": VERCEL_CLI_VERSION,
        "lighthouseVersion": LIGHTHOUSE_VERSION,
        "gateCount": len(results),
        "passCount": pass_count,
        "failureCount": len(fail_rows),
        "candidateDrift": candidate_drift,
        "initialFingerprintVerify": initial_verify,
        "finalFingerprintVerify": final_verify,
        "results": results,
    }
    matrix_path.write_text(json.dumps(matrix, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    summary = {
        "status": status,
        "gateCount": len(results),
        "passCount": pass_count,
        "failureCount": len(fail_rows),
        "failures": [{"id": r.get("id"), "status": r.get("status"), "exitCode": r.get("exitCode")} for r in fail_rows],
        "candidateDrift": candidate_drift,
        "candidateAggregateSha256": expected.get("aggregateSha256"),
        "matrix": str(matrix_path.relative_to(ROOT)),
        "matrixSha256": sha256(matrix_path),
        "productionDeploy": "NOT_PERFORMED",
        "next": "P13_USER_CONFIRMATION" if status == "PASS" else "FIX_AND_REFREEZE_CANDIDATE",
    }
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
