#!/usr/bin/env python3
"""Isolated Production verification for the V6.5.1 feedback release."""
from __future__ import annotations

import hashlib
import json
import random
import re
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from playwright.sync_api import sync_playwright
from qa_v65_feedback_home import THEMES, route_time, seed

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://kids-learning-adventure-chi.vercel.app"
DEPLOYMENT_URL = "https://kids-learning-adventure-fgdw0mezd-kui-yus-projects.vercel.app"
DEPLOYMENT_ID = "dpl_ES3FZ1C8dUoSxcExNz5TySWt6oPF"
FINGERPRINT = "7babac9d7a8d60609fb4a89b9217bb8f3e6a692cab829252971b5f5912c67ce5"
PROMOTION = ROOT / "qa/v65/user-feedback-r1/promotion-attempts/20260919-222319/promotion-report.json"
OUTPUT = ROOT / "qa/v65/post-deploy/20260920-v651-production-verification-final-pass.json"


def request(url: str, *, data: bytes | None = None, headers: dict[str, str] | None = None) -> tuple[int, bytes]:
    req = urllib.request.Request(url, data=data, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def family_session(pin: str) -> tuple[int, dict]:
    status, body = request(
        f"{BASE}/api/family-session",
        data=json.dumps({"pin": pin}).encode(),
        headers={"Content-Type": "application/json", "Origin": BASE},
    )
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        payload = {}
    return status, payload


def main() -> int:
    failures: list[str] = []
    home_status, home = request(f"{BASE}/")
    if home_status != 200:
        failures.append(f"home HTTP {home_status}")
    html = home.decode("utf-8", errors="replace")
    match = re.search(r'assets/index-[^" ]+\.js', html)
    production_chunks = sorted((ROOT / ".vercel/output/static/assets").glob("*.js"))
    chunk_responses = [(chunk.name, *request(f"{BASE}/assets/{chunk.name}")) for chunk in production_chunks]
    bundle_text = "\n".join(body.decode("utf-8", errors="replace") for _, status, body in chunk_responses if status == 200)
    chunk_http_200 = sum(status == 200 for _, status, _ in chunk_responses)
    bundle_checks = {
        "entrypointFound": bool(match),
        "chunksExpected": len(production_chunks),
        "chunksHttp200": chunk_http_200,
        "version651": "6.5.1" in bundle_text,
        "recordingMode": "錄音模式" in bundle_text,
        "wordRecognitionOptional": "AI 字詞辨識（選用）" in bundle_text,
        "pronunciationBoundary": "不是音素級發音檢定" in bundle_text and "不顯示發音分數" in bundle_text,
    }
    if not bundle_checks["entrypointFound"] or chunk_http_200 != len(production_chunks) or not all(
        bundle_checks[key] for key in ("version651", "recordingMode", "wordRecognitionOptional", "pronunciationBoundary")
    ):
        failures.append(f"bundle contract failed: {bundle_checks}")

    promotion = json.loads(PROMOTION.read_text())
    asset_http = 0
    asset_sha = 0
    for row in promotion["rows"]:
        path = "/" + row["destination"].removeprefix("public/")
        status, body = request(f"{BASE}{path}")
        asset_http += status == 200
        asset_sha += status == 200 and hashlib.sha256(body).hexdigest() == row["afterSha256"]
    if asset_http != 56 or asset_sha != 56:
        failures.append(f"accessory assets http={asset_http}/56 sha={asset_sha}/56")

    pins = [str(random.randint(100000, 999999)) for _ in range(2)]
    sessions = [family_session(pin) for pin in pins]
    family_ids = [payload.get("familyId") for status, payload in sessions if status == 200]
    state_status, _ = request(f"{BASE}/api/state")
    if len(family_ids) != 2 or not all(family_ids) or family_ids[0] == family_ids[1]:
        failures.append(f"isolated session contract failed: statuses={[status for status, _ in sessions]}")
    if state_status != 401:
        failures.append(f"missing bearer state HTTP {state_status}")

    browser_evidence: dict = {}
    console_errors: list[str] = []
    page_errors: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1512, "height": 982}, reduced_motion="reduce")
        context.add_init_script(seed())
        context.route("**/api/server-time", route_time)
        context.route("**/api/time", route_time)
        page = context.new_page()
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.goto(f"{BASE}/", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector(".v4-dashboard-grid", timeout=30000)
        page.wait_for_timeout(1500)
        browser_evidence = page.evaluate("""() => ({
          version:[...document.querySelectorAll('.v4-status-bar small')].map(e=>e.textContent?.trim()).find(Boolean),
          overflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),
          broken:[...document.images].filter(img=>img.complete&&!img.naturalWidth).map(img=>img.currentSrc||img.src),
          bopomofo:(document.body.innerText.match(/[ㄅ-ㄩ˙]/g)||[]).length,
          headerCharacters:[...document.querySelectorAll('.v65-hero-showcase .v5-hero-character')].map(e=>({stage:e.dataset.stage,rect:e.getBoundingClientRect().toJSON()})),
          headerParents:document.querySelectorAll('.v65-hero-showcase .v6-hero-parent').length,
          calendar:[...document.querySelectorAll('.v4-calendar-day')].map(e=>({cw:e.clientWidth,sw:e.scrollWidth,ch:e.clientHeight,sh:e.scrollHeight})),
          crest:document.querySelectorAll('.v65-team-crest').length,
          pointer:document.querySelectorAll('.v64-theme-pointer').length,
          trail:document.querySelectorAll('.v64-theme-pointer-effects,.v64-theme-pointer-trail,.v64-theme-click-burst').length
        })""")
        theme_rows: list[dict] = []
        for theme_id, label in THEMES:
            page.locator(f'.v5-header-theme button[title="{label}"]').click()
            page.wait_for_function("theme => document.documentElement.dataset.adventureTheme === theme", arg=theme_id)
            theme_rows.append(page.evaluate("""() => ({
              id:document.documentElement.dataset.adventureTheme,
              accent:getComputedStyle(document.documentElement).getPropertyValue('--home-accent').trim(),
              border:getComputedStyle(document.querySelector('.v4-left-column')).borderColor,
              hero:document.querySelector('.v5-hero-bg')?.getAttribute('src')
            })"""))
        browser_evidence["themes"] = theme_rows
        context.close()
        browser.close()

    if browser_evidence.get("version") != "Version V6.5.1 · Updated 2026-09-20":
        failures.append(f"visible version mismatch: {browser_evidence.get('version')}")
    if browser_evidence.get("overflow") != 0 or browser_evidence.get("broken"):
        failures.append("browser overflow or broken image")
    if browser_evidence.get("bopomofo") != 0:
        failures.append("Bopomofo found")
    header = browser_evidence.get("headerCharacters", [])
    if len(header) != 4 or any(row.get("stage") != "4" for row in header):
        failures.append(f"header contract failed: {header}")
    if browser_evidence.get("headerParents") != 0:
        failures.append("parent art remains in header")
    calendar = browser_evidence.get("calendar", [])
    if len(calendar) != 15 or any(row["sw"] > row["cw"] or row["sh"] > row["ch"] for row in calendar):
        failures.append(f"calendar contract failed: {calendar}")
    if browser_evidence.get("crest") != 1 or browser_evidence.get("pointer") != 1 or browser_evidence.get("trail") != 0:
        failures.append("crest/pointer contract failed")
    themes = browser_evidence.get("themes", [])
    if [row.get("id") for row in themes] != [theme_id for theme_id, _ in THEMES]:
        failures.append(f"theme IDs failed: {themes}")
    if len({row.get("accent") for row in themes}) != 5 or len({row.get("border") for row in themes}) != 5 or len({row.get("hero") for row in themes}) != 5:
        failures.append(f"theme visual differentiation failed: {themes}")
    if console_errors or page_errors:
        failures.append(f"browser errors console={console_errors[:3]} page={page_errors[:3]}")

    result = {
        "schemaVersion": 1,
        "suite": "v651-production-post-deploy",
        "checkedAt": datetime.now(ZoneInfo("Asia/Taipei")).isoformat(timespec="seconds"),
        "status": "PASS" if not failures else "FAIL",
        "failures": failures,
        "productionVersion": "6.5.1",
        "productionUrl": f"{BASE}/",
        "deploymentId": DEPLOYMENT_ID,
        "deploymentUrl": DEPLOYMENT_URL,
        "candidateFingerprint": FINGERPRINT,
        "homeHttp": home_status,
        "bundle": bundle_checks,
        "assets": {"expected": 56, "http200": asset_http, "sha256Matches": asset_sha},
        "familyApi": {
            "isolatedRandomSessions": 2,
            "sessionsIssued": len(family_ids),
            "familyIdsDistinct": len(family_ids) == 2 and family_ids[0] != family_ids[1],
            "missingBearerRejected": state_status,
            "cloudStateWritten": False,
            "realFamilyDataTouched": False,
        },
        "browser": {**browser_evidence, "consoleErrors": console_errors, "pageErrors": page_errors},
        "limitations": [
            "Chromium engine evidence is not physical iPhone Safari or physical Android Chrome acceptance.",
            "No child holdout audio or two-adult speech annotation was performed.",
        ],
    }
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
