#!/usr/bin/env python3
"""Targeted browser gate for the V5.1 art replacement sprint."""

import base64
import hashlib
import json
import os
import shutil
import signal
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

import websocket


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "qa" / "screenshots" / "v51"
RESULT_PATH = ROOT / ".qa" / "v51_browser_result.json"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)
RESULT_PATH.parent.mkdir(parents=True, exist_ok=True)
URL = "http://127.0.0.1:4173/"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PIN = "2468"
FAMILY_ID = hashlib.sha256(f"little-explorers-dev-family:{PIN}".encode()).hexdigest()


def credential(pin: str, salt: bytes) -> tuple[str, str]:
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt, 180000, 32)
    return base64.b64encode(digest).decode(), base64.b64encode(salt).decode()


father_hash, father_salt = credential("1357", b"father-v51-salt!")
SESSION = {
    "familyId": FAMILY_ID,
    "token": f"dev.{FAMILY_ID}.9999999999.v51-browser-qa",
    "expiresAt": "2286-11-20T17:46:39.000Z",
}
SETTINGS = {
    "theme": "light",
    "visualTheme": "hero",
    "semesterStart": "2026-08-26",
    "users": [
        {
            "id": "user-father",
            "name": "爸爸",
            "role": "father",
            "disabled": False,
            "userPinHash": father_hash,
            "userPinSalt": father_salt,
            "userPinIterations": 180000,
        }
    ],
    "children": [
        {"id": "child-1", "name": "哥哥", "avatar": "nova", "role": "child", "disabled": False},
        {"id": "child-2", "name": "弟弟", "avatar": "rex", "role": "child", "disabled": False},
    ],
    "cloudSync": {"enabled": False, "familyCode": ""},
}
EMPTY_PROGRESS = {
    "completedDays": [],
    "completedBlocks": [],
    "completedMissions": [],
    "claimedEggs": [],
    "unlockedCosmetics": [],
    "equippedCosmetics": [],
    "badgeUnlocks": {},
    "completionTimestamps": {},
    "rewardTransactions": [],
    "answerEvents": [],
}
PROGRESS = {"child-1": dict(EMPTY_PROGRESS), "child-2": dict(EMPTY_PROGRESS)}


def free_port() -> int:
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


class CDP:
    def __init__(self, ws_url: str):
        self.ws = websocket.create_connection(ws_url, timeout=15, origin="http://localhost")
        self.request_id = 0

    def call(self, method: str, params=None):
        self.request_id += 1
        request_id = self.request_id
        self.ws.send(json.dumps({"id": request_id, "method": method, "params": params or {}}))
        while True:
            message = json.loads(self.ws.recv())
            if message.get("id") == request_id:
                if "error" in message:
                    raise RuntimeError(f"{method}: {message['error']}")
                return message.get("result", {})

    def eval(self, expression: str):
        response = self.call(
            "Runtime.evaluate",
            {"expression": expression, "returnByValue": True, "awaitPromise": True},
        )
        if response.get("exceptionDetails"):
            raise RuntimeError(str(response["exceptionDetails"]))
        return response.get("result", {}).get("value")

    def close(self):
        self.ws.close()


def wait_http(url: str, timeout: float = 20) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status < 500:
                    return
        except Exception:
            time.sleep(0.2)
    raise RuntimeError(f"HTTP unavailable: {url}")


def wait_js(cdp: CDP, expression: str, timeout: float = 30) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            if cdp.eval(expression):
                return
        except Exception:
            pass
        time.sleep(0.15)
    raise RuntimeError(f"Browser wait timed out: {expression}")


def click(cdp: CDP, selector: str, index: int = 0) -> None:
    selector_json = json.dumps(selector)
    expression = f"""(() => {{
      const target = [...document.querySelectorAll({selector_json})][{index}];
      if (!target) throw new Error('missing target: {selector}');
      target.click();
      return true;
    }})()"""
    if not cdp.eval(expression):
        raise RuntimeError(f"click failed: {selector}")


def js_snapshot() -> str:
    return r"""
(() => {
  const allMedia = [...document.querySelectorAll('img, video')];
  const source = (node) => node.currentSrc || node.src || '';
  const brokenImages = [...document.images]
    .filter((image) => !image.complete || image.naturalWidth === 0)
    .map((image) => source(image));
  const lessonLayouts = [...document.querySelectorAll('.v4-lesson-card')].map((card) => {
    const body = card.querySelector('.v5-lesson-card-body');
    const thumb = card.querySelector('.v4-lesson-thumb');
    const info = card.querySelector('.v4-lesson-content');
    if (!body || !thumb || !info) return { valid: false };
    const thumbRect = thumb.getBoundingClientRect();
    const infoRect = info.getBoundingClientRect();
    return {
      valid: true,
      separated: thumbRect.right <= infoRect.left + 1,
      gap: Math.round((infoRect.left - thumbRect.right) * 10) / 10,
    };
  });
  const evolution = [...document.querySelectorAll('.v5-evolution-lane')]
    .map((lane) => lane.querySelectorAll('.v5-evolution-stage').length);
  const videos = [...document.querySelectorAll('.v5-cinematic-header video, .v5-ai-bot video')]
    .map((video) => ({src: source(video), readyState: video.readyState, paused: video.paused}));
  const interactive = [...document.querySelectorAll('button, a, input, select')]
    .filter((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });
  return {
    viewport: {width: innerWidth, height: innerHeight},
    overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    header: document.querySelectorAll('.v5-cinematic-header').length,
    headerCharacters: document.querySelectorAll('.v5-hero-character').length,
    rocket: document.querySelectorAll('.v5-rocket-flyby').length,
    navigationIcons: [...document.querySelectorAll('.v4-main-navigation img')].map(source),
    themeImages: [...document.querySelectorAll('.v5-header-theme img')].map(source),
    videos,
    weeklyRobot: (() => { const video = document.querySelector('.v53-weekly-rocket'); return video ? {src: source(video), readyState: video.readyState, paused: video.paused} : null; })(),
    evolution,
    lessonLayouts,
    aiLegacyActions: document.querySelectorAll('.v4-ai-actions').length,
    v40RuntimeMedia: allMedia.map(source).filter((src) => src.includes('/assets/v40/')),
    brokenImages,
    bopomofoCount: (document.body.innerText.match(/[ㄅ-ㄩ˙ˊˇˋ]/g) || []).length,
    undersizedTargets: interactive.filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    }).map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        tag: node.tagName,
        className: String(node.className || ''),
        text: String(node.textContent || '').trim().slice(0, 40),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    }),
    dashboardColumnWidths: [...document.querySelectorAll('.v4-left-column, .v4-center-column, .v4-right-column')]
      .map((node) => Math.round(node.getBoundingClientRect().width)),
  };
})()
"""


def check_snapshot(snapshot: dict, width: int) -> list[str]:
    failures = []
    if snapshot["header"] != 1:
        failures.append("cinematic header missing")
    if snapshot["headerCharacters"] != 3:
        failures.append("header must contain three character video layers")
    if snapshot["rocket"] != 1:
        failures.append("rocket flyby video missing")
    if len(snapshot["navigationIcons"]) != 6 or any("/assets/v5/nav-icons/" not in path for path in snapshot["navigationIcons"]):
        failures.append("six V5 navigation icons were not rendered")
    if len(snapshot["themeImages"]) != 5 or any("/assets/v5/themes/" not in path or "-v2-thumb.webp" not in path for path in snapshot["themeImages"]):
        failures.append("five V5 theme v2 images were not rendered")
    if any(video["readyState"] < 2 for video in snapshot["videos"]):
        failures.append("one or more V5 videos failed to decode")
    if not snapshot["weeklyRobot"] or "/assets/v5/animations/weekly-rocket-robot.webm" not in snapshot["weeklyRobot"]["src"] or snapshot["weeklyRobot"]["readyState"] < 2:
        failures.append("weekly Robot Rocket WebM failed to render")
    if snapshot["evolution"] != [4, 4]:
        failures.append("each learner must render four evolution stages")
    if len(snapshot["lessonLayouts"]) != 2 or any(not item.get("valid") or not item.get("separated") for item in snapshot["lessonLayouts"]):
        failures.append("lesson thumbnail and content are not separated DOM grid columns")
    if snapshot["aiLegacyActions"]:
        failures.append("legacy AI action buttons are still visible")
    if snapshot["v40RuntimeMedia"]:
        failures.append("visible media still depends on assets/v40")
    if snapshot["brokenImages"]:
        failures.append("broken images detected")
    if snapshot["bopomofoCount"]:
        failures.append("Bopomofo appeared in production DOM")
    if snapshot["overflow"] > 1:
        failures.append(f"horizontal overflow is {snapshot['overflow']}px")
    if width < 600 and any(column < width - 30 for column in snapshot["dashboardColumnWidths"]):
        failures.append(f"mobile dashboard columns do not fill viewport: {snapshot['dashboardColumnWidths']}")
    # The compact mobile bottom navigation intentionally presents icon and label in a 44px parent button.
    if width >= 820 and snapshot["undersizedTargets"]:
        failures.append(f"{len(snapshot['undersizedTargets'])} interactive targets are under 44px: {snapshot['undersizedTargets']}")
    return failures


def main() -> int:
    vite = None
    chrome = None
    cdp = None
    profile = tempfile.mkdtemp(prefix="v51-browser-")
    seed = ROOT / "public" / "__qa_v51_seed.html"
    result = {"status": "FAIL", "checks": [], "screenshots": []}
    try:
        try:
            wait_http(URL, 1)
        except RuntimeError:
            vite = subprocess.Popen(
                ["npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", "4173"],
                cwd=ROOT,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
            wait_http(URL, 30)

        settings_json = json.dumps(SETTINGS, ensure_ascii=False).replace("</", "<\\/")
        progress_json = json.dumps(PROGRESS, ensure_ascii=False).replace("</", "<\\/")
        session_json = json.dumps(SESSION).replace("</", "<\\/")
        seed.write_text(
            '<!doctype html><meta charset="utf-8"><script>'
            f'localStorage.setItem("star-learning-active-family-session-v40",JSON.stringify({session_json}));'
            f'localStorage.setItem("star-learning-v40:{FAMILY_ID}:settings",JSON.stringify({settings_json}));'
            f'localStorage.setItem("star-learning-v40:{FAMILY_ID}:progress",JSON.stringify({progress_json}));'
            f'sessionStorage.setItem("star-learning-v40:{FAMILY_ID}:active-user","user-father");'
            'location.replace("/");</script>',
            encoding="utf-8",
        )

        debug_port = free_port()
        chrome = subprocess.Popen(
            [
                CHROME,
                "--headless=new",
                "--disable-gpu",
                "--no-first-run",
                "--no-default-browser-check",
                "--remote-allow-origins=*",
                f"--remote-debugging-port={debug_port}",
                f"--user-data-dir={profile}",
                "--window-size=1536,1024",
                URL.rstrip("/") + "/__qa_v51_seed.html",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        wait_http(f"http://127.0.0.1:{debug_port}/json/version")
        page = None
        deadline = time.time() + 30
        while time.time() < deadline:
            targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{debug_port}/json"))
            page = next((target for target in targets if target.get("type") == "page" and target.get("url") == URL), None)
            if page:
                break
            time.sleep(0.2)
        if not page:
            raise RuntimeError("browser page was not found")

        cdp = CDP(page["webSocketDebuggerUrl"])
        cdp.call("Page.enable")
        cdp.call("Runtime.enable")
        wait_js(cdp, "!!document.querySelector('.v4-dashboard-grid')", 30)
        wait_js(cdp, "[...document.querySelectorAll('.v5-cinematic-header video')].every(v => v.readyState >= 2)", 30)

        # Children get only a future-theme teaser and read-only past outcomes. Full lesson routes are parent-PIN only.
        preview_failures: list[str] = []
        click(cdp, '.v4-main-navigation button', 2)
        wait_js(cdp, "!!document.querySelector('.v4-semester-weeks')")
        all_day_actions = cdp.eval("document.querySelectorAll('.v4-semester-day .v4-semester-actions').length")
        if all_day_actions != 90:
            preview_failures.append(f"semester preview actions {all_day_actions}/90")
        progress_key = f"star-learning-v40:{FAMILY_ID}:progress"
        progress_before = cdp.eval(f"localStorage.getItem('{progress_key}')")
        click(cdp, '.v4-semester-day.future .v4-semester-actions button', 0)
        wait_js(cdp, "!!document.querySelector('.v53-teaser-panel')")
        if cdp.eval("document.querySelectorAll('.v53-teaser-panel iframe, .v53-teaser-panel .v4-word-grid').length"):
            preview_failures.append("future teaser exposed lesson material")
        if cdp.eval(f"localStorage.getItem('{progress_key}')") != progress_before:
            preview_failures.append("future teaser wrote progress")
        click(cdp, '.v4-history-close')
        wait_js(cdp, "!!document.querySelector('.v4-semester-weeks') && !document.querySelector('.v53-teaser-panel')")
        click(cdp, '.v4-semester-day.past .v4-semester-actions button', 0)
        wait_js(cdp, "!!document.querySelector('.v4-history-panel')")
        if cdp.eval("document.querySelectorAll('.v4-history-panel .v4-history-lessons').length"):
            preview_failures.append("past child review exposed lesson material")
        if cdp.eval(f"localStorage.getItem('{progress_key}')") != progress_before:
            preview_failures.append("past child review wrote progress")
        click(cdp, '.v4-history-close')
        wait_js(cdp, "!!document.querySelector('.v4-semester-weeks') && !document.querySelector('.v4-history-panel')")
        result["contentPreview"] = {
            "semesterDaysWithActions": all_day_actions,
            "futureTeaser": not any("future" in failure for failure in preview_failures),
            "pastResultOnly": not any("past" in failure for failure in preview_failures),
            "noProgressWrites": not any("wrote progress" in failure for failure in preview_failures),
        }
        all_failures = list(preview_failures)
        click(cdp, '.v4-main-navigation button', 0)
        wait_js(cdp, "!!document.querySelector('.v4-dashboard-grid')")

        # The parent entry point remains available after leaving the dashboard, and the PIN dialog is actually mounted.
        click(cdp, '.v4-main-navigation button', 2)
        wait_js(cdp, "!!document.querySelector('.v4-semester-weeks')")
        click(cdp, '.v4-main-navigation button', 4)
        wait_js(cdp, "!!document.querySelector('.v4-pin-modal')")
        result["parentDialog"] = cdp.eval("({open:!!document.querySelector('.v4-pin-modal'), hasCancel:!![...document.querySelectorAll('button')].find(b=>b.textContent?.includes('取消'))})")
        if not result["parentDialog"]["open"] or not result["parentDialog"]["hasCancel"]:
            all_failures.append("parent PIN dialog is unavailable from a secondary page")
        for digit in PIN:
            cdp.eval(f"(() => {{ const button = [...document.querySelectorAll('.v4-pin-grid button')].find(b => b.textContent === '{digit}'); if (!button) throw new Error('missing PIN digit'); button.click(); return true; }})()")
        click(cdp, '.v4-pin-submit')
        wait_js(cdp, "!document.querySelector('.v4-pin-modal') && !!document.querySelector('.v4-report-grid')", 30)
        click(cdp, '.v4-main-navigation button', 2)
        wait_js(cdp, "!!document.querySelector('.v4-semester-weeks')")
        parent_progress_before = cdp.eval(f"localStorage.getItem('{progress_key}')")
        click(cdp, '.v4-semester-day.future .v4-semester-actions button', 0)
        wait_js(cdp, "!!document.querySelector('.v4-quest-shell') && document.querySelector('.v4-quest-mode.preview')?.innerText.includes('課前預覽')")
        if cdp.eval(f"localStorage.getItem('{progress_key}')") != parent_progress_before:
            preview_failures.append("parent future preview wrote progress")
        click(cdp, '.v4-quest-back')
        wait_js(cdp, "!!document.querySelector('.v4-semester-weeks') && !document.querySelector('.v4-quest-shell')")
        click(cdp, '.v4-semester-day.past .v4-semester-actions button', 0)
        wait_js(cdp, "!!document.querySelector('.v4-quest-shell') && document.querySelector('.v4-quest-mode.preview')?.innerText.includes('歷史複習')")
        if cdp.eval(f"localStorage.getItem('{progress_key}')") != parent_progress_before:
            preview_failures.append("parent past review wrote progress")
        click(cdp, '.v4-quest-back')
        wait_js(cdp, "!!document.querySelector('.v4-semester-weeks') && !document.querySelector('.v4-quest-shell')")
        result["contentPreview"]["parentFullPreview"] = not any("parent future" in failure or "parent past" in failure for failure in preview_failures)
        click(cdp, '.v4-main-navigation button', 0)
        wait_js(cdp, "!!document.querySelector('.v4-dashboard-grid')")

        viewports = [(1536, 1024), (820, 1180), (390, 844)]
        for width, height in viewports:
            cdp.call(
                "Emulation.setDeviceMetricsOverride",
                {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": width < 600},
            )
            time.sleep(1)
            snapshot = cdp.eval(js_snapshot())
            failures = check_snapshot(snapshot, width)
            all_failures.extend(f"{width}x{height}: {failure}" for failure in failures)
            result["checks"].append({"viewport": f"{width}x{height}", "snapshot": snapshot, "failures": failures})
            image = cdp.call("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True})
            path = SCREENSHOTS / f"v51-{width}x{height}.png"
            path.write_bytes(base64.b64decode(image["data"]))
            result["screenshots"].append(str(path.relative_to(ROOT)))

        # Media-emulated reduced-motion is checked after reload so AnimatedMedia mounts in reduced mode.
        cdp.call("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
        cdp.call("Page.reload", {"ignoreCache": True})
        wait_js(cdp, "!!document.querySelector('.v5-cinematic-header')", 30)
        time.sleep(1)
        reduced_motion = cdp.eval(
            "({matches:matchMedia('(prefers-reduced-motion: reduce)').matches, "
            "paused:[...document.querySelectorAll('.v5-cinematic-header video, .v53-weekly-rocket')].every(v=>v.paused)})"
        )
        result["reducedMotion"] = reduced_motion
        if not reduced_motion["matches"] or not reduced_motion["paused"]:
            all_failures.append("reduced-motion emulation did not pause cinematic videos")

        result["status"] = "PASS" if not all_failures else "FAIL"
        result["failures"] = all_failures
        RESULT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"status": result["status"], "failures": all_failures}, ensure_ascii=False, indent=2))
        print(f"Result: {RESULT_PATH}")
        return 0 if not all_failures else 1
    finally:
        if cdp:
            cdp.close()
        if chrome:
            try:
                os.killpg(chrome.pid, signal.SIGTERM)
                chrome.wait(timeout=3)
            except Exception:
                try:
                    os.killpg(chrome.pid, signal.SIGKILL)
                except Exception:
                    pass
        if vite:
            try:
                os.killpg(vite.pid, signal.SIGTERM)
                vite.wait(timeout=3)
            except Exception:
                try:
                    os.killpg(vite.pid, signal.SIGKILL)
                except Exception:
                    pass
        shutil.rmtree(profile, ignore_errors=True)
        try:
            seed.unlink()
        except FileNotFoundError:
            pass


if __name__ == "__main__":
    raise SystemExit(main())
