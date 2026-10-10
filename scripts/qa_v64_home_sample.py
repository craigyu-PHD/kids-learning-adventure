#!/usr/bin/env python3
"""P03 home complete-sample gate and four-viewport interaction recording.

Runs only against the controlled QA family from qa_v64_4k_layout. It records
real browser video for 390/820/1440/3440 CSS-pixel viewports and verifies the
P03 contract: four learners, two lesson cards, one high-priority Home CTA,
V6.5 static four-child header with once-per-entry suppression, M04 learner/companion
reaction with 1s throttle, and reduced-motion fallback. No production family
state is read or written.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any

from playwright.sync_api import Browser, Page, sync_playwright

from qa_v64_4k_layout import URL, install_routes, make_snapshot, wait_page_ready

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa" / "production-audit" / "2026-09-14" / "v64-p03-home-sample"
OUT.mkdir(parents=True, exist_ok=True)
RESULT_PATH = OUT / "p03-home-sample.json"
VIEWPORTS = [(390, 844), (820, 1180), (1440, 900), (3440, 1440)]


def run_text(*args: str) -> str:
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def tree_hash(path: Path) -> str:
    h = hashlib.sha256()
    for file in sorted(p for p in path.rglob("*") if p.is_file()):
        rel = file.relative_to(path).as_posix().encode()
        h.update(len(rel).to_bytes(4, "big")); h.update(rel)
        digest = bytes.fromhex(sha256_file(file))
        h.update(digest)
    return h.hexdigest()


def dirty_tree_hash() -> str:
    status = subprocess.check_output(["git", "status", "--porcelain=v1", "-z"], cwd=ROOT)
    return hashlib.sha256(status).hexdigest()


def center_hit(page: Page, selector: str) -> dict[str, Any]:
    return page.evaluate(
        """selector => {
          const el=document.querySelector(selector); if(!el) return {exists:false};
          const r=el.getBoundingClientRect(); const x=r.left+r.width/2, y=r.top+r.height/2;
          const top=document.elementFromPoint(x,y);
          return {exists:true,left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,
            inViewport:r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth,
            hit:!!top&&(top===el||el.contains(top)||top.contains(el)),
            coveredBy:top?`${top.tagName}.${String(top.className||'')}`:'none'};
        }""",
        selector,
    )


def wait_reaction_cycle(page: Page, selector: str, playing_value: str = "playing") -> dict[str, Any]:
    start = time.perf_counter()
    page.wait_for_function(
        "([selector,value]) => document.querySelector(selector)?.getAttribute(selector.includes('companion')?'data-companion-reaction':'data-character-reaction')===value",
        arg=[selector, playing_value], timeout=1500,
    )
    playing_ms = (time.perf_counter() - start) * 1000
    page.wait_for_function(
        "([selector]) => { const el=document.querySelector(selector); if(!el)return false; const name=selector.includes('companion')?'data-companion-reaction':'data-character-reaction'; return el.getAttribute(name)==='resting'; }",
        arg=[selector], timeout=1800,
    )
    total_ms = (time.perf_counter() - start) * 1000
    return {"playingDetectedMs": round(playing_ms, 1), "restedAfterMs": round(total_ms, 1)}


def exercise_throttled_character_reaction(page: Page, button_selector: str, state_selector: str) -> tuple[dict[str, Any], bool]:
    """Simulate a +400ms second click and prove the first timer was not extended.

    Video recording can delay Playwright's wall-clock waits beyond one second on
    small viewports, so event time is controlled while the 760ms UI timer remains
    real. This exercises the product's Date.now-based throttle deterministically.
    """
    start = time.perf_counter()
    page.evaluate(
        """() => {
          const nativeNow = Date.now.bind(Date);
          window.__v64QaNativeDateNow = nativeNow;
          window.__v64QaEventNow = nativeNow();
          Date.now = () => window.__v64QaEventNow;
        }"""
    )
    page.locator(button_selector).first.click()
    page.wait_for_function(
        "selector => document.querySelector(selector)?.getAttribute('data-character-reaction') === 'playing'",
        arg=state_selector,
        timeout=1500,
    )
    playing_ms = (time.perf_counter() - start) * 1000
    page.evaluate("window.__v64QaEventNow += 400")
    page.locator(button_selector).first.click()
    page.evaluate("Date.now = window.__v64QaNativeDateNow")
    page.wait_for_function(
        "selector => document.querySelector(selector)?.getAttribute('data-character-reaction') === 'resting'",
        arg=state_selector,
        timeout=1800,
    )
    total_ms = (time.perf_counter() - start) * 1000
    page.wait_for_timeout(80)
    restarted = page.locator(f'{state_selector}[data-character-reaction="playing"]').count() > 0
    cycle = {"playingDetectedMs": round(playing_ms, 1), "restedAfterMs": round(total_ms, 1)}
    return cycle, not restarted and total_ms <= 1000


def ensure_greeting(page: Page) -> dict[str, Any]:
    # Initial script clears sessionStorage, so the first Home entry is eligible.
    page.wait_for_function("document.querySelector('[data-home-greeting=\"playing\"]') !== null", timeout=1500)
    during = page.evaluate("getComputedStyle(document.querySelector('.v6-hero-learner-roster')).animationName")
    page.wait_for_function("document.querySelector('[data-home-greeting=\"resting\"]') !== null", timeout=1500)
    # Re-enter Home through the real SPA navigation so sessionStorage survives.
    page.get_by_role("button", name="學期日曆", exact=True).click()
    wait_page_ready(page, "semester")
    page.get_by_role("button", name="首頁", exact=True).click()
    wait_page_ready(page, "home")
    page.wait_for_timeout(160)
    replayed = page.locator('[data-home-greeting="playing"]').count() > 0
    return {"animationName": during, "replayedWithinFiveMinutes": replayed}


def idle_motion(page: Page) -> dict[str, Any]:
    page.wait_for_timeout(120)
    first = page.locator(".v6-hero-learner-roster .v5-hero-character").first
    read_transform = """el => { const s=getComputedStyle(el); const m=new DOMMatrixReadOnly(s.transform==='none'?undefined:s.transform); return {name:s.animationName,duration:s.animationDuration,tx:m.m41,ty:m.m42,rotationDeg:Math.atan2(m.m12,m.m11)*180/Math.PI}; }"""
    a = first.evaluate(read_transform)
    page.wait_for_timeout(2700)
    b = first.evaluate(read_transform)
    return {
        "animation": {"name": a["name"], "duration": a["duration"]},
        "sampleA": a, "sampleB": b,
        "maxSampleTranslationY": round(max(abs(a["ty"]), abs(b["ty"])), 3),
        "maxSampleRotationDeg": round(max(abs(a["rotationDeg"]), abs(b["rotationDeg"])), 3),
    }


def interact_and_record(browser: Browser, width: int, height: int) -> dict[str, Any]:
    snapshot, seed = make_snapshot(4, False)
    temp_video_dir = OUT / f"video-temp-{width}x{height}"
    if temp_video_dir.exists(): shutil.rmtree(temp_video_dir)
    temp_video_dir.mkdir(parents=True)
    context = browser.new_context(
        viewport={"width": width, "height": height},
        reduced_motion="no-preference",
        record_video_dir=str(temp_video_dir),
    )
    context.add_init_script(seed); install_routes(context, snapshot)
    page = context.new_page()
    console_errors: list[str] = []
    page_errors: list[str] = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda exc: page_errors.append(str(exc)))
    page.goto(URL, wait_until="domcontentloaded", timeout=60000)
    wait_page_ready(page, "home")

    greeting = ensure_greeting(page)
    idle = idle_motion(page)
    # P03 records visible interaction timing. Headless Chromium's synthetic TTS
    # can block the browser main thread, so stub only the audio sink after the
    # real M01/M02 load cycle; the product's visible state remains unmodified.
    page.evaluate("""() => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel=()=>{}; window.speechSynthesis.speak=()=>{}; } }""")
    learner_cards = page.locator(".v4-player-card").count()
    lesson_cards = page.locator(".v4-daily-panel .v4-lesson-card").count()
    participant_labels = page.locator(".v64-daily-participants label").count()
    primary_ctas = page.locator(".v64-home-primary-cta").count()
    primary = center_hit(page, ".v64-home-primary-cta")
    primary_text = page.locator(".v64-home-primary-cta").inner_text().strip()
    primary_kind = page.locator(".v64-home-primary-cta").get_attribute("data-home-primary-action")
    primary_style = page.locator(".v64-home-primary-cta").evaluate(
        "el=>({minHeight:getComputedStyle(el).minHeight,fontSize:getComputedStyle(el).fontSize,background:getComputedStyle(el).backgroundImage})"
    )

    # Four-child switching: exercise each participant checkbox, then restore it.
    participant_states: list[dict[str, Any]] = []
    for i in range(min(4, participant_labels)):
        checkbox = page.locator(".v64-daily-participants input").nth(i)
        before = checkbox.is_checked()
        if checkbox.is_enabled():
            checkbox.click(); page.wait_for_timeout(80)
            middle = checkbox.is_checked()
            checkbox.click(); page.wait_for_timeout(80)
            after = checkbox.is_checked()
        else:
            middle = before; after = before
        participant_states.append({"index": i, "enabled": checkbox.is_enabled(), "before": before, "middle": middle, "switched": middle != before, "restored": after == before})

    # M04 learner response and throttle.
    player_button = page.locator(".v64-player-reactor").first
    player_button.scroll_into_view_if_needed()
    character_cycle, throttled_second_click = exercise_throttled_character_reaction(
        page,
        ".v64-player-reactor",
        ".v4-player-card",
    )
    page.wait_for_timeout(950)

    # M04 companion response; speech audio is not required for visible comprehension.
    bot = page.locator(".v4-ai-bot").first
    bot.scroll_into_view_if_needed(); bot.click()
    companion_cycle = wait_reaction_cycle(page, ".v4-ai-companion")

    page.locator(".v64-home-primary-cta").scroll_into_view_if_needed()
    screenshot = OUT / f"home-{width}x{height}.jpg"
    page.screenshot(path=str(screenshot), full_page=True, type="jpeg", quality=88, animations="disabled", caret="hide")

    # Exercise the Home CTA at the end of the recording. If no learner is
    # selected, the first press must route focus to participation instead of
    # silently writing progress; then select one learner and press again.
    cta = page.locator(".v64-home-primary-cta")
    first_checkbox = page.locator(".v64-daily-participants input").first
    selected_before_cta = page.locator(".v64-daily-participants input:checked").count()
    if primary_kind in ("start", "resume") and selected_before_cta == 0:
        cta.click(); page.wait_for_timeout(120)
        focused_participant = page.evaluate("document.activeElement?.matches('.v64-daily-participants input') || false")
        if first_checkbox.is_enabled() and not first_checkbox.is_checked():
            first_checkbox.click(); page.wait_for_timeout(80)
        cta.click()
    else:
        focused_participant = None
        cta.click()
    if primary_kind in ("start", "resume"):
        try: page.locator(".v4-quest-shell").wait_for(state="visible", timeout=5000)
        except Exception: pass
        primary_outcome = "lesson-opened" if page.locator(".v4-quest-shell").count() else "lesson-not-opened"
    elif primary_kind == "rewards":
        try: page.locator(".v6-achievement-wall").wait_for(state="visible", timeout=5000)
        except Exception: pass
        primary_outcome = "achievements-opened" if page.locator(".v6-achievement-wall").count() else "achievements-not-opened"
    else:
        try: page.locator(".v4-semester-weeks").wait_for(state="visible", timeout=5000)
        except Exception: pass
        primary_outcome = "semester-opened" if page.locator(".v4-semester-weeks").count() else "semester-not-opened"
    video = page.video
    context.close()
    source_video = Path(video.path()) if video else None
    final_video = OUT / f"home-{width}x{height}.webm"
    if source_video and source_video.exists():
        if final_video.exists(): final_video.unlink()
        shutil.move(str(source_video), final_video)
    shutil.rmtree(temp_video_dir, ignore_errors=True)

    failures: list[str] = []
    if learner_cards != 4: failures.append(f"learner cards {learner_cards}/4")
    if participant_labels != 4: failures.append(f"participant controls {participant_labels}/4")
    if lesson_cards != 2: failures.append(f"lesson cards {lesson_cards}/2")
    if primary_ctas != 1: failures.append(f"primary CTA count {primary_ctas}/1")
    if not primary.get("hit"): failures.append(f"primary CTA obstructed: {primary}")
    if float(primary_style["minHeight"].replace("px", "") or 0) < 56: failures.append(f"primary CTA min-height {primary_style['minHeight']}")
    if width == 390 and not primary.get("inViewport"): failures.append("390px primary CTA not in first viewport")
    if greeting["animationName"] != "none": failures.append(f"V6.5 static greeting animation {greeting['animationName']}")
    if greeting["replayedWithinFiveMinutes"]: failures.append("M01 replayed within five-minute suppression window")
    if idle["animation"]["name"] != "none": failures.append(f"V6.5 header must remain static: {idle['animation']}")
    if idle["maxSampleTranslationY"] > 0.01: failures.append(f"V6.5 static header translated {idle['maxSampleTranslationY']}px")
    if idle["maxSampleRotationDeg"] > 0.01: failures.append(f"V6.5 static header rotated {idle['maxSampleRotationDeg']}deg")
    if not (500 <= character_cycle["restedAfterMs"] <= 1000): failures.append(f"M04 character duration {character_cycle['restedAfterMs']}ms")
    if not throttled_second_click: failures.append("M04 character second click was not throttled")
    if not (500 <= companion_cycle["restedAfterMs"] <= 1000): failures.append(f"M04 companion duration {companion_cycle['restedAfterMs']}ms")
    if any(not s["enabled"] or not s["switched"] or not s["restored"] for s in participant_states): failures.append(f"participant switching incomplete {participant_states}")
    if not primary_outcome.endswith("opened"): failures.append(f"primary CTA outcome {primary_outcome}")
    if console_errors: failures.append(f"console errors {console_errors[:3]}")
    if page_errors: failures.append(f"page errors {page_errors[:3]}")
    if not final_video.exists() or final_video.stat().st_size < 1000: failures.append("interaction video missing/empty")
    if not screenshot.exists() or screenshot.stat().st_size < 1000: failures.append("screenshot missing/empty")

    return {
        "viewport": f"{width}x{height}", "pass": not failures, "failures": failures,
        "counts": {"learnerCards": learner_cards, "participantControls": participant_labels, "lessonCards": lesson_cards, "primaryCtas": primary_ctas},
        "primaryCta": {"text": primary_text, "kind": primary_kind, "geometry": primary, "style": primary_style, "selectedBeforeClick": selected_before_cta, "focusRoutedWhenEmpty": focused_participant, "outcome": primary_outcome},
        "greeting": greeting, "idle": idle,
        "participantSwitching": participant_states,
        "characterReaction": {**character_cycle, "throttledSecondClick": throttled_second_click},
        "companionReaction": companion_cycle,
        "consoleErrors": console_errors, "pageErrors": page_errors,
        "screenshot": str(screenshot.relative_to(ROOT)), "screenshotSha256": sha256_file(screenshot),
        "video": str(final_video.relative_to(ROOT)) if final_video.exists() else None,
        "videoSha256": sha256_file(final_video) if final_video.exists() else None,
        "videoBytes": final_video.stat().st_size if final_video.exists() else 0,
    }


def reduced_motion_gate(browser: Browser) -> dict[str, Any]:
    snapshot, seed = make_snapshot(4, False)
    context = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
    context.add_init_script(seed); install_routes(context, snapshot)
    page = context.new_page(); page.goto(URL, wait_until="domcontentloaded", timeout=60000); wait_page_ready(page, "home")
    values = page.evaluate("""() => ({
      media:matchMedia('(prefers-reduced-motion: reduce)').matches,
      greeting:document.querySelector('.v4-adventure-header')?.getAttribute('data-home-greeting'),
      heroAnimation:getComputedStyle(document.querySelector('.v5-hero-character')).animationName,
      activeAnimations:document.getAnimations().filter(a=>a.playState==='running').length,
      primaryTransition:getComputedStyle(document.querySelector('.v64-home-primary-cta')).transitionDuration
    })""")
    context.close()
    failures=[]
    if not values.get("media"): failures.append("reduced-motion media did not match")
    if values.get("greeting") != "resting": failures.append(f"greeting state {values.get('greeting')}")
    if values.get("activeAnimations", 1) != 0: failures.append(f"running animations {values.get('activeAnimations')}")
    return {"pass": not failures, "failures": failures, **values}


def main() -> int:
    started_at = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        cases = [interact_and_record(browser, w, h) for w, h in VIEWPORTS]
        reduced = reduced_motion_gate(browser)
        browser.close()
    finished_at = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    failures = [case for case in cases if not case["pass"]]
    status = "PASS" if not failures and reduced["pass"] else "FAIL"
    payload = {
        "schemaVersion": 1,
        "suiteName": "v64-p03-home-complete-sample",
        "status": status,
        "sourceRevision": run_text("git", "rev-parse", "HEAD"),
        "dirtyTreeHash": dirty_tree_hash(),
        "artifactHash": tree_hash(ROOT / "dist"),
        "runId": f"p03-{int(time.time())}",
        "scope": {
            "viewports": [f"{w}x{h}" for w,h in VIEWPORTS],
            "controlledFamily": True,
            "requirements": ["4 learners", "2 lesson cards", "single primary CTA", "static four-child header", "once-per-entry suppression", "M04 learner/companion reaction", "reduced motion", "four real-browser videos"],
            "notClaimed": ["M03 full 32-look blinking", "P04 wearable closure", "production acceptance"],
        },
        "environment": {"browser": "Playwright Chromium", "auditUrl": URL, "visualReactionAudioSink": "speechSynthesis stubbed only during M04 visible-timing recording to avoid headless audio main-thread blocking"},
        "startedAt": started_at, "finishedAt": finished_at,
        "cases": cases, "reducedMotion": reduced,
        "evidencePaths": [case["video"] for case in cases if case.get("video")] + [case["screenshot"] for case in cases],
    }
    RESULT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": status,
        "cases": [{"viewport": c["viewport"], "pass": c["pass"], "failures": c["failures"], "primary": c["primaryCta"]["text"], "videoBytes": c["videoBytes"]} for c in cases],
        "reducedMotion": reduced,
        "result": str(RESULT_PATH.relative_to(ROOT)),
    }, ensure_ascii=False, indent=2))
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
