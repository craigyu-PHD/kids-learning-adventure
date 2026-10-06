#!/usr/bin/env python3
"""Focused isolated QA for feedback-r1 vocabulary contrast and recording entry."""
from __future__ import annotations

import copy
import hashlib
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright
from qa_v63_browser_seed import SETTINGS as BASE_SETTINGS, PROGRESS as BASE_PROGRESS

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get("AUDIT_URL", "http://127.0.0.1:4175/")
OUT = ROOT / "qa/v65/user-feedback-r1/lesson"
OUT.mkdir(parents=True, exist_ok=True)
RESULT = OUT / "focused-report.json"
TIME = {"now":"2026-09-17T06:00:00.000Z","activeDate":"2026-09-17","taipeiDate":"2026-09-17","taipeiTime":"14:00:00","timeZone":"Asia/Taipei"}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def seed() -> str:
    settings = copy.deepcopy(BASE_SETTINGS)
    settings["theme"] = "dark"
    progress = copy.deepcopy(BASE_PROGRESS)
    return f"""(() => {{
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem('star-learning-v40:__local__:settings', JSON.stringify({json.dumps(settings, ensure_ascii=False)}));
      localStorage.setItem('star-learning-v40:__local__:progress', JSON.stringify({json.dumps(progress, ensure_ascii=False)}));
      localStorage.setItem('star-learning-v40:__local__:attendance', JSON.stringify({{}}));
      localStorage.setItem('star-learning-v40:__local__:reflections', JSON.stringify({{}}));
      localStorage.setItem('little-explorers-v4-sound', 'off');
    }})();"""


def route_time(route) -> None:
    route.fulfill(status=200, content_type="application/json", body=json.dumps(TIME))


def main() -> int:
    failures: list[str] = []
    evidence = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1512, "height": 982}, reduced_motion="reduce")
        context.add_init_script(seed())
        context.route("**/api/server-time", route_time)
        context.route("**/api/time", route_time)
        page = context.new_page()
        page.goto(URL, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector(".v4-dashboard-grid", timeout=30000)
        page.wait_for_function("document.querySelector('.v53-date-strip strong')?.textContent?.includes('Day 14')")
        page.locator(".v4-lesson-card").nth(0).get_by_role("button").click()
        page.wait_for_selector(".v4-quest-shell", timeout=15000)
        page.get_by_role("button", name="3. 單字預覽", exact=True).click()
        page.locator(".v64-word-flip").nth(0).click()
        word = page.locator(".v64-word-face.word-face").nth(0)
        contrast = word.evaluate("""el => {
          const strong=el.querySelector('strong'); const s=getComputedStyle(strong); const b=getComputedStyle(el);
          return {text:strong.textContent?.trim(), color:s.color, background:b.backgroundImage || b.backgroundColor,
            visible:!!(el.offsetWidth&&el.offsetHeight), buttonText:el.closest('button')?.innerText};
        }""")
        if not contrast["visible"] or contrast["color"] in ("rgb(255, 255, 255)", "rgba(255, 255, 255, 1)"):
            failures.append(f"flipped word contrast invalid: {contrast}")
        entry = page.locator(".v65-recording-entry")
        if entry.count() != 1 or not entry.is_visible():
            failures.append("recording entry missing from vocabulary stage")
        evidence["wordContrast"] = contrast
        word_shot = OUT / "dark-word-flip.png"
        page.screenshot(path=str(word_shot), animations="disabled")
        if not failures:
            entry.click()
            page.wait_for_selector(".speaking-practice", timeout=10000)
            speaking_text = page.locator(".speaking-practice").inner_text()
            required = ["錄音回放", "換我說", "AI 字詞辨識（選用）", "不是音素級發音檢定", "不顯示發音分數"]
            missing = [text for text in required if text not in speaking_text]
            if missing:
                failures.append(f"recording mode missing copy: {missing}")
            evidence["recording"] = {
                "requiredCopy": required,
                "mediaRecorderAvailable": page.evaluate("typeof MediaRecorder !== 'undefined'"),
                "speechRecognitionAvailable": page.evaluate("Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)"),
            }
            speaking_shot = OUT / "recording-mode.png"
            page.screenshot(path=str(speaking_shot), animations="disabled")
            evidence["screenshots"] = [
                {"path": str(word_shot.relative_to(ROOT)), "sha256": sha(word_shot)},
                {"path": str(speaking_shot.relative_to(ROOT)), "sha256": sha(speaking_shot)},
            ]
        context.close(); browser.close()
    result = {"status":"PASS" if not failures else "FAIL", "environment":"isolated-local-family-fixture", "auditUrl":URL, "failures":failures, "evidence":evidence}
    RESULT.write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
