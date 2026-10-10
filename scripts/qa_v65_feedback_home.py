#!/usr/bin/env python3
"""Focused isolated QA for feedback-r1 home header, calendar and themes."""
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
OUT = ROOT / "qa/v65/user-feedback-r1/home"
OUT.mkdir(parents=True, exist_ok=True)
RESULT = OUT / "focused-report.json"
TIME = {"now":"2026-09-17T06:00:00.000Z","activeDate":"2026-09-17","taipeiDate":"2026-09-17","taipeiTime":"14:00:00","timeZone":"Asia/Taipei"}
THEMES = [("hero","星際英雄"),("mecha","機甲戰士"),("racing","賽車冒險"),("tank","奇幻精靈"),("creature","海底世界")]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def seed() -> str:
    settings = copy.deepcopy(BASE_SETTINGS)
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
    evidence: dict = {"themes": [], "screenshots": []}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width":1512,"height":982}, reduced_motion="reduce")
        context.add_init_script(seed())
        context.route("**/api/server-time", route_time); context.route("**/api/time", route_time)
        page = context.new_page(); page.goto(URL, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector(".v4-dashboard-grid", timeout=30000)
        layout = page.evaluate("""() => ({
          root:[document.documentElement.clientWidth,document.documentElement.scrollWidth],
          header:[...document.querySelectorAll('.v65-hero-showcase .v5-hero-character')].map(e=>({alt:e.getAttribute('alt'),rect:e.getBoundingClientRect().toJSON()})),
          parents:document.querySelectorAll('.v65-hero-showcase .v6-hero-parent').length,
          calendar:[...document.querySelectorAll('.v4-calendar-day')].map(e=>({cw:e.clientWidth,sw:e.scrollWidth,ch:e.clientHeight,sh:e.scrollHeight})),
          crest:document.querySelectorAll('.v65-team-crest').length,
          pointer:document.querySelectorAll('.v64-theme-pointer').length,
          trail:document.querySelectorAll('.v64-theme-pointer-effects,.v64-theme-pointer-trail,.v64-theme-click-burst').length,
        })""")
        evidence["layout"] = layout
        if layout["root"][1] > layout["root"][0] + 1: failures.append(f"horizontal overflow: {layout['root']}")
        if len(layout["header"]) != 4 or any(row["rect"]["width"] < 90 for row in layout["header"]): failures.append(f"header showcase invalid: {layout['header']}")
        if layout["parents"] != 0: failures.append("parent art remains in V6.5 header showcase")
        if any(row["sw"] > row["cw"] or row["sh"] > row["ch"] for row in layout["calendar"]): failures.append("calendar cell overflow")
        if layout["crest"] != 1 or layout["pointer"] != 1 or layout["trail"] != 0: failures.append(f"crest/pointer contract invalid: {layout}")
        for theme_id, label in THEMES:
            mobile_trigger = page.locator(".v6-mobile-theme-trigger")
            if mobile_trigger.is_visible():
                mobile_trigger.click()
                page.locator(".v6-theme-sheet > div > button", has_text=label).click()
            else:
                page.locator(f'.v5-header-theme button[title="{label}"]').click()
            row = page.evaluate("""() => ({
              id:document.documentElement.dataset.adventureTheme,
              accent:getComputedStyle(document.documentElement).getPropertyValue('--home-accent').trim(),
              border:getComputedStyle(document.querySelector('.v4-left-column')).borderColor,
              hero:document.querySelector('.v5-hero-bg')?.getAttribute('src'),
            })""")
            row["label"] = label
            evidence["themes"].append(row)
            if row["id"] != theme_id: failures.append(f"theme click failed: {label} -> {row}")
            shot = OUT / f"theme-{theme_id}.png"
            page.screenshot(path=str(shot), animations="disabled")
            evidence["screenshots"].append({"path":str(shot.relative_to(ROOT)),"sha256":sha(shot)})
        if len({row["hero"] for row in evidence["themes"]}) != 5: failures.append("theme hero images are not unique")
        if len({row["accent"] for row in evidence["themes"]}) != 5: failures.append("theme accent palettes are not unique")
        if len({row["border"] for row in evidence["themes"]}) != 5: failures.append("theme frame borders are not unique")
        context.close(); browser.close()
    result={"status":"PASS" if not failures else "FAIL","environment":"isolated-local-family-fixture","auditUrl":URL,"failures":failures,"evidence":evidence}
    RESULT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps(result,ensure_ascii=False,indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
