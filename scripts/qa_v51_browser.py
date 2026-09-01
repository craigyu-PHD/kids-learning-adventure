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
SCREENSHOTS = ROOT / "qa" / "screenshots" / "v60"
RESULT_PATH = ROOT / ".qa" / "v60_browser_result.json"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)
RESULT_PATH.parent.mkdir(parents=True, exist_ok=True)
URL = "http://127.0.0.1:4173/"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PIN = "2468"
FAMILY_ID = hashlib.sha256(f"little-explorers-dev-family:{PIN}".encode()).hexdigest()


def credential(pin: str, salt: bytes) -> tuple[str, str]:
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt, 180000, 32)
    return base64.b64encode(digest).decode(), base64.b64encode(salt).decode()


father_hash, father_salt = credential("1357", b"father-v60-salt!")
SESSION = {
    "familyId": FAMILY_ID,
    "token": f"dev.{FAMILY_ID}.9999999999.v60-browser-qa",
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
        {"id": "child-1", "name": "哥哥", "avatar": "brother", "role": "child", "disabled": False},
        {"id": "child-2", "name": "弟弟", "avatar": "younger", "role": "child", "disabled": False},
        {"id": "child-3", "name": "姐姐", "avatar": "sister", "role": "child", "disabled": False},
        {"id": "child-4", "name": "妹妹", "avatar": "younger-sister", "role": "child", "disabled": False},
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
PROGRESS = {
    child_id: {**EMPTY_PROGRESS, "unlockedCosmetics": ["outfit-racer"], "equippedCosmetics": ["outfit-racer"]}
    for child_id in ("child-1", "child-2", "child-3", "child-4")
}


def evidence_identity() -> dict:
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    files = [
        ROOT / "package.json",
        ROOT / "src" / "App.tsx",
        ROOT / "src" / "v4" / "Dashboard.tsx",
        ROOT / "src" / "v4" / "LessonQuest.tsx",
        ROOT / "src" / "v4" / "SecondaryViews.tsx",
        ROOT / "src" / "v4" / "caregivers.tsx",
        ROOT / "src" / "components" / "AvatarHero.tsx",
        ROOT / "src" / "components" / "AvatarWardrobe.tsx",
        ROOT / "src" / "components" / "TreasureShowcase.tsx",
        ROOT / "src" / "cosmetics.ts",
        ROOT / "src" / "styles" / "components" / "dashboard.css",
        ROOT / "src" / "styles" / "components" / "header.css",
        ROOT / "src" / "styles" / "responsive.css",
    ]
    digest = hashlib.sha256()
    for file in files:
        digest.update(file.relative_to(ROOT).as_posix().encode())
        digest.update(file.read_bytes())
    git_sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    worktree_clean = subprocess.run(["git", "diff", "--quiet"], cwd=ROOT).returncode == 0
    return {
        "appVersion": package.get("version"),
        "gitSha": git_sha,
        "worktree": "clean" if worktree_clean else "dirty",
        "sourceFingerprint": digest.hexdigest(),
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


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
  const overflowElements = [...document.querySelectorAll('*')]
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return {tag: node.tagName, className: String(node.className || ''), right: Math.round(rect.right), width: Math.round(rect.width)};
    })
    .filter((node) => node.right > innerWidth + 1)
    .sort((left, right) => right.right - left.right)
    .slice(0, 12);
  const source = (node) => node.currentSrc || node.src || '';
  const brokenImages = [...document.images]
    // Lazy art below the fold has not been requested yet; it is not a broken
    // asset. Every image inside or near the viewport must nevertheless load.
    .filter((image) => {
      const rect = image.getBoundingClientRect();
      const nearViewport = rect.bottom >= -200 && rect.top <= innerHeight + 200;
      return nearViewport && image.complete && image.naturalWidth === 0;
    })
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
  const videos = [...document.querySelectorAll('.v5-cinematic-header video')]
    .map((video) => ({src: source(video), readyState: video.readyState, paused: video.paused}));
  const interactive = [...document.querySelectorAll('button, a, input, select')]
    .filter((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });
  const focusTarget = interactive[0];
  if (focusTarget) focusTarget.focus();
  const focusStyle = focusTarget ? getComputedStyle(focusTarget) : null;
  const unlabeledControls = interactive.filter((node) => {
    const text = String(node.textContent || '').trim();
    const label = node.getAttribute('aria-label') || node.getAttribute('title') || node.getAttribute('name') || '';
    return !text && !label;
  }).map((node) => ({tag: node.tagName, className: String(node.className || '')}));
  return {
    viewport: {width: innerWidth, height: innerHeight},
    overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    overflowElements,
    header: document.querySelectorAll('.v5-cinematic-header').length,
    headerCharacters: document.querySelectorAll('.v5-hero-character').length,
    headerParents: document.querySelectorAll('.v6-hero-parent').length,
    navigationLabels: [...document.querySelectorAll('.v4-main-navigation button')].map((node) => String(node.textContent || '').trim()),
    rocket: document.querySelectorAll('.v5-rocket-flyby').length,
    navigationIcons: [...document.querySelectorAll('.v4-main-navigation img')].map(source),
    themeImages: [...document.querySelectorAll('.v5-header-theme img')].map(source),
    videos,
    weeklyRobot: (() => { const video = document.querySelector('.v53-weekly-rocket'); return video ? {src: source(video), readyState: video.readyState, paused: video.paused} : null; })(),
    evolution,
    composedWardrobeLooks: [...document.querySelectorAll('.v4-player-profile .avatar-renderer-skin')].map(source),
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
    focusVisible: focusStyle ? {style: focusStyle.outlineStyle, width: focusStyle.outlineWidth, color: focusStyle.outlineColor} : null,
    unlabeledControls,
    dashboardColumnWidths: [...document.querySelectorAll('.v4-left-column, .v4-center-column, .v4-right-column')]
      .map((node) => Math.round(node.getBoundingClientRect().width)),
    dashboardLearners: [...document.querySelectorAll('.v4-player-profile .v4-player-card')].map((node) => String(node.textContent || '').trim()),
    companionVisible: (() => { const node = document.querySelector('.v4-ai-companion'); const profile = document.querySelector('.v4-player-profile'); const rect = node?.getBoundingClientRect(); const profileRect = profile?.getBoundingClientRect(); return Boolean(rect && profileRect && rect.height > 0 && rect.top >= profileRect.bottom - 1); })(),
  };
})()
"""


def check_snapshot(snapshot: dict, width: int) -> list[str]:
    failures = []
    if snapshot["header"] != 1:
        failures.append("cinematic header missing")
    if snapshot["headerCharacters"] != 4 or snapshot["headerParents"] != 2:
        failures.append("header must contain four child motion layers and two parent layers")
    if snapshot["rocket"] != 1:
        failures.append("rocket flyby video missing")
    if snapshot["navigationLabels"] != ["首頁", "今日課程", "學期日曆", "成就獎勵", "學習報表", "寶物商店"]:
        failures.append(f"V6 navigation order is incorrect: {snapshot['navigationLabels']}")
    if len(snapshot["navigationIcons"]) != 6 or any("/assets/v5/nav-icons/" not in path for path in snapshot["navigationIcons"]):
        failures.append("six V5 navigation icons were not rendered")
    if len(snapshot["themeImages"]) != 5 or any("/assets/v5/themes/" not in path or "-v2-thumb.webp" not in path for path in snapshot["themeImages"]):
        failures.append("five V5 theme v2 images were not rendered")
    if any(video["readyState"] < 2 for video in snapshot["videos"]):
        failures.append("one or more V5 videos failed to decode")
    if not snapshot["weeklyRobot"] or "/assets/v5/animations/weekly-rocket-robot.webm" not in snapshot["weeklyRobot"]["src"] or snapshot["weeklyRobot"]["readyState"] < 2:
        failures.append("weekly Robot Rocket WebM failed to render")
    if snapshot["evolution"] != [4, 4, 4, 4]:
        failures.append("each learner must render four evolution stages")
    if len(snapshot["dashboardLearners"]) != 4:
        failures.append(f"dashboard did not render all four enabled learners: {snapshot['dashboardLearners']}")
    if not snapshot["companionVisible"]:
        failures.append("AI companion is covered or pushed outside the desktop sidebar")
    if len(snapshot["composedWardrobeLooks"]) < 4 or any("/wardrobe/looks/outfit-racer-v1.webp" not in path for path in snapshot["composedWardrobeLooks"]):
        failures.append("all four equipped wardrobes must render their own validated composed look assets")
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
    if snapshot["undersizedTargets"]:
        failures.append(f"{len(snapshot['undersizedTargets'])} interactive targets are under 44px: {snapshot['undersizedTargets']}")
    if snapshot["unlabeledControls"]:
        failures.append(f"{len(snapshot['unlabeledControls'])} interactive controls have no accessible name: {snapshot['unlabeledControls']}")
    if not snapshot["focusVisible"] or snapshot["focusVisible"]["style"] == "none" or snapshot["focusVisible"]["width"] in ("0px", ""):
        failures.append("keyboard focus indicator is not visible")
    return failures


def main() -> int:
    vite = None
    chrome = None
    cdp = None
    profile = tempfile.mkdtemp(prefix="v60-browser-")
    seed = ROOT / "public" / "__qa_v60_seed.html"
    result = {"status": "FAIL", "evidence": evidence_identity(), "checks": [], "screenshots": []}
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
                URL.rstrip("/") + "/__qa_v60_seed.html",
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
            page = next((target for target in targets if target.get("type") == "page" and target.get("url", "").startswith(URL.rstrip("/"))), None)
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
        result["equipmentMetrics"] = cdp.eval("""[...document.querySelectorAll('.avatar-equipped-cosmetic')].map(node => {
          const style = getComputedStyle(node); const rect = node.getBoundingClientRect();
          return {classes: node.className, width: style.width, height: style.height, top: style.top, left: style.left, objectFit: style.objectFit, rect: {width: Math.round(rect.width), height: Math.round(rect.height)}};
        })""")

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
        mastery_panel = cdp.eval("({present:!!document.querySelector('.learning-mastery-panel'), copy:document.querySelector('.learning-mastery-panel')?.innerText || ''})")
        result["learningMastery"] = mastery_panel
        if not mastery_panel["present"] or "僅依真實互動與口說作答計算" not in mastery_panel["copy"]:
            all_failures.append("parent report is missing the derived learning-mastery panel")
        click(cdp, '.v4-settings-link')
        wait_js(cdp, "!!document.querySelector('.content-health-grid')", 30)
        content_health = cdp.eval("({count:document.querySelectorAll('.content-health-grid article').length, failed:document.querySelectorAll('.content-health-grid article.fail').length})")
        result["contentHealth"] = content_health
        if content_health["count"] != 8 or content_health["failed"]:
            all_failures.append(f"content health dashboard is incomplete: {content_health}")
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

        # Every learner can preview the verified shared flight suit. The body
        # image must be a complete same-pose character render, never a catalog
        # product thumbnail layered over a different body.
        click(cdp, '.v4-main-navigation button', 5)
        wait_js(cdp, "!!document.querySelector('.v4-shop-card')")
        shop = cdp.eval("""(() => ({
          total: Number(document.querySelector('.v4-page-kpi strong')?.textContent || 0),
          characterItems: document.querySelectorAll('.v4-shop-grid article').length,
          learnerTabs: [...document.querySelectorAll('.v6-shop-tabs button')].map(node => node.textContent?.trim()),
          base: document.querySelector('.v6-treasure-showcase .avatar-renderer-skin')?.currentSrc || '',
          catalogThumbnails: [...document.querySelectorAll('.v4-item-art img')].map(img => img.src),
        }))()""")
        result["shop"] = shop
        if shop["total"] != 60 or len(shop["learnerTabs"]) != 4 or "/wardrobe/looks/outfit-racer-v1.webp" not in shop["base"]:
            all_failures.append(f"four-learner wardrobe or composed preview is incorrect: {shop}")
        if any("/assets/v5/items/" in shop["base"] for _ in [0]):
            all_failures.append("wardrobe is using a catalog item thumbnail as a body layer")

        # The dressing studio must keep the learner centered and visible.
        studio = cdp.eval("""(() => {
          const stage = document.querySelector('.v6-treasure-showcase')?.getBoundingClientRect();
          const character = document.querySelector('.v6-showcase-character')?.getBoundingClientRect();
          return {
            stagePresent: !!stage,
            characterPresent: !!character,
            centerDelta: stage && character
              ? Math.abs((stage.left + stage.width / 2) - (character.left + character.width / 2))
              : 999,
          };
        })()""")
        result["shopStudio"] = studio
        if not studio["stagePresent"] or not studio["characterPresent"] or studio["centerDelta"] > 2:
            all_failures.append(f"shop character is not centered in the live dressing studio: {studio}")

        cdp.eval("""(() => {
          const outfit = [...document.querySelectorAll('.v4-shop-grid article')]
            .find(card => card.querySelector('h3')?.textContent?.trim() === '極速飛行服');
          outfit?.querySelector('.v6-preview-button')?.click();
          return Boolean(outfit);
        })()""")
        wait_js(cdp, "document.querySelector('.v6-preview-integrity')?.textContent.includes('完整角色 Skin')")
        composed_preview = cdp.eval("""(() => { const image=document.querySelector('.v6-treasure-showcase .avatar-renderer-skin'); return {src:image?.currentSrc||'', loaded:!!image?.complete&&image.naturalWidth>0, hasCatalogOverlay:document.querySelectorAll('.v6-treasure-showcase .wardrobe-socket-item,.v6-treasure-showcase .wardrobe-garment-cutout').length}; })()""")
        result["composedPreview"] = composed_preview
        if not composed_preview["loaded"] or "outfit-racer-v1.webp" not in composed_preview["src"] or composed_preview["hasCatalogOverlay"]:
            all_failures.append(f"shop outfit is not a clean composed look: {composed_preview}")

        world_mounts = {}
        expected_mounts = [
            ("飛船", ".v6-showcase-ship", "ship-scout.webp"),
            ("Robot", ".v6-showcase-robot", "robot-sky.webp"),
        ]
        for label, selector, asset_name in expected_mounts:
            cdp.eval(f"""(() => {{
              const tab = [...document.querySelectorAll('.v6-shop-category-tabs button')]
                .find(button => button.textContent?.trim() === {json.dumps(label)});
              if (!tab) throw new Error('missing shop category: {label}');
              tab.click();
              return true;
            }})()""")
            wait_js(cdp, f"[...document.querySelectorAll('.v6-shop-category-tabs button')].find(button => button.textContent?.trim() === {json.dumps(label)})?.getAttribute('aria-selected') === 'true'")
            cdp.eval("document.querySelector('.v4-shop-grid .v6-preview-button')?.click()")
            wait_js(cdp, f"document.querySelector({json.dumps(selector)})?.currentSrc.includes({json.dumps(asset_name)})")
            mount = cdp.eval(f"""(() => {{
              const image = document.querySelector({json.dumps(selector)});
              return {{present: !!image, src: image?.currentSrc || '', loaded: image?.complete && image?.naturalWidth > 0}};
            }})()""")
            world_mounts[label] = mount
            if not mount["present"] or not mount["loaded"] or asset_name not in mount["src"]:
                all_failures.append(f"{label} is not mounted as the expected live raster asset: {mount}")

        # Base, card and effect are whole-scene layers, so assert their actual
        # scene state instead of looking for obsolete per-card image tags.
        for label, item_id, assertion in [
            ("基地", "room-starlab", "(() => { const scene=document.querySelector('.v6-showcase-scene'); const style=scene?getComputedStyle(scene):null; return {present:!!scene, scene:style?.backgroundImage||'', loaded:(style?.backgroundImage||'').includes('room-starlab-v2.png')}; })()"),
            ("卡面", "card-sky", "(() => { const stage=document.querySelector('.v6-treasure-showcase'); const skin=document.querySelector('.v6-showcase-card-skin'); return {present:!!skin, active:stage?.dataset.card === 'card-sky', scene:getComputedStyle(skin||document.body).backgroundImage}; })()"),
            ("特效", "effect-stars", "(() => { const stage=document.querySelector('.v6-treasure-showcase'); const effect=document.querySelector('.v6-showcase-event-effect'); return {present:!!effect, active:stage?.dataset.effect === 'effect-stars', particles:effect?.querySelectorAll('i').length || 0}; })()"),
        ]:
            cdp.eval(f"""(() => {{
              const tab = [...document.querySelectorAll('.v6-shop-category-tabs button')]
                .find(button => button.textContent?.trim() === {json.dumps(label)});
              if (!tab) throw new Error('missing shop category: {label}');
              tab.click();
              return true;
            }})()""")
            wait_js(cdp, f"[...document.querySelectorAll('.v6-shop-category-tabs button')].find(button => button.textContent?.trim() === {json.dumps(label)})?.getAttribute('aria-selected') === 'true'")
            cdp.eval("document.querySelector('.v4-shop-grid .v6-preview-button')?.click()")
            wait_js(cdp, f"document.querySelector('.v6-treasure-showcase')?.dataset.{ 'room' if label == '基地' else 'card' if label == '卡面' else 'effect'} === {json.dumps(item_id)}")
            mount = cdp.eval(assertion)
            world_mounts[label] = mount
            if not mount.get("present") or not mount.get("active", mount.get("loaded", False)) or (label == "特效" and mount.get("particles", 0) != 18):
                all_failures.append(f"{label} is not mounted as the expected full-scene layer: {mount}")
        result["shopWorldMounts"] = world_mounts

        image = cdp.call("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
        path = SCREENSHOTS / "v60-shop-composed-1536x1024.png"
        path.write_bytes(base64.b64decode(image["data"]))
        result["screenshots"].append(str(path.relative_to(ROOT)))

        # Each of the four learner tabs must resolve to its own complete look,
        # not reuse the brother file or a product thumbnail.
        learner_looks = []
        for index, avatar in enumerate(("brother", "younger", "sister", "younger-sister")):
            cdp.eval(f"document.querySelectorAll('.v6-shop-tabs button')[{index}]?.click()")
            wait_js(cdp, f"document.querySelectorAll('.v6-shop-tabs button')[{index}]?.getAttribute('aria-selected') === 'true'")
            wait_js(cdp, f"document.querySelector('.v6-treasure-showcase .avatar-renderer-skin')?.currentSrc.includes('characters/{avatar}/wardrobe/looks/outfit-racer-v1.webp')")
            look = cdp.eval("document.querySelector('.v6-treasure-showcase .avatar-renderer-skin')?.currentSrc || ''")
            learner_looks.append(look)
            if f"characters/{avatar}/wardrobe/looks/outfit-racer-v1.webp" not in look:
                all_failures.append(f"{avatar} did not render its own composed flight suit: {look}")
        result["learnerComposedLooks"] = learner_looks

        # The same centered stage must remain usable on a 390px phone without
        # horizontal overflow or character/world art escaping its card.
        cdp.call("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": True})
        mobile_shop = cdp.eval("""(() => {
          const stage = document.querySelector('.v6-treasure-showcase')?.getBoundingClientRect();
          const character = document.querySelector('.v6-showcase-character')?.getBoundingClientRect();
          return {
            overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
            stage: stage ? {left: stage.left, right: stage.right, width: stage.width} : null,
            character: character ? {left: character.left, right: character.right, width: character.width} : null,
            centerDelta: stage && character
              ? Math.abs((stage.left + stage.width / 2) - (character.left + character.width / 2))
              : 999,
          };
        })()""")
        result["mobileShop"] = mobile_shop
        if mobile_shop["overflow"] > 1 or mobile_shop["centerDelta"] > 2:
            all_failures.append(f"mobile shop preview is not centered or overflows: {mobile_shop}")
        image = cdp.call("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
        path = SCREENSHOTS / "v60-shop-younger-sister-390x844.png"
        path.write_bytes(base64.b64decode(image["data"]))
        result["screenshots"].append(str(path.relative_to(ROOT)))
        cdp.call("Emulation.setDeviceMetricsOverride", {"width": 1536, "height": 1024, "deviceScaleFactor": 1, "mobile": False})
        click(cdp, '.v4-main-navigation button', 0)
        wait_js(cdp, "!!document.querySelector('.v4-dashboard-grid')")

        # Device coverage mirrors the supported desktop, tablet and phone
        # breakpoints. Only the representative three are persisted as visual
        # baselines; every size runs the same overflow, media and a11y checks.
        viewports = [
            (1920, 1080), (1536, 1024), (1440, 900), (1366, 768), (1280, 800),
            (1024, 768), (820, 1180), (768, 1024), (430, 932), (412, 915),
            (393, 852), (390, 844), (360, 800),
        ]
        baseline_screenshots = {(1536, 1024), (820, 1180), (390, 844)}
        for width, height in viewports:
            cdp.call(
                "Emulation.setDeviceMetricsOverride",
                {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": width < 600},
            )
            # Header and weekly media intentionally keep their WebM out of the
            # first paint, then begin playback after the poster is visible.
            # Wait for that production behavior before asserting decode state.
            wait_js(cdp, "[...document.querySelectorAll('.v5-cinematic-header video, .v53-weekly-rocket')].every(v => v.readyState >= 2)", 30)
            snapshot = cdp.eval(js_snapshot())
            failures = check_snapshot(snapshot, width)
            all_failures.extend(f"{width}x{height}: {failure}" for failure in failures)
            result["checks"].append({"viewport": f"{width}x{height}", "snapshot": snapshot, "failures": failures})
            if (width, height) in baseline_screenshots:
                image = cdp.call("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True})
                path = SCREENSHOTS / f"v60-{width}x{height}.png"
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
