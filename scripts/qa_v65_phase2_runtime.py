#!/usr/bin/env python3
"""V6.5 Phase 2 isolated-browser acceptance for A01/U01/U02/U03.

Uses a synthetic local family only. It never reads or writes a real cloud family.
"""
from __future__ import annotations

import copy
import hashlib
import json
import os
import time
from pathlib import Path

from playwright.sync_api import Page, Route, sync_playwright

from qa_v63_browser_seed import SETTINGS as BASE_SETTINGS, PROGRESS as BASE_PROGRESS

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get("AUDIT_URL", "http://127.0.0.1:4185/")
OUT = ROOT / "qa" / "v65" / "phase2" / "runtime"
OUT.mkdir(parents=True, exist_ok=True)

TIME = {
    "now": "2026-09-17T04:00:00.000Z",
    "activeDate": "2026-09-17",
    "taipeiDate": "2026-09-17",
    "taipeiTime": "12:00:00",
    "timeZone": "Asia/Taipei",
}

REPRESENTATIVES = [
    ("角色裝備", "starter-sun-cap", "avatar"),
    ("飛船", "ship-comet", "ship"),
    ("機器夥伴", "robot-mecha", "robot"),
    ("基地", "room-legend", "world"),
    ("卡面", "card-nebula", "card"),
    ("特效", "effect-bubbles", "effect"),
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def route_time(route: Route) -> None:
    route.fulfill(status=200, content_type="application/json", body=json.dumps(TIME))


def fixture() -> tuple[dict, dict, dict]:
    settings = copy.deepcopy(BASE_SETTINGS)
    progress = copy.deepcopy(BASE_PROGRESS)
    settings["homeDisplayLearnerId"] = "child-1"
    settings["theme"] = "light"
    settings["motionEffects"] = False

    # Child 1 starts with reviewed World items already equipped in independent slots.
    p1 = progress["child-1"]
    equipped = ["room-starlab", "robot-sky", "card-sky", "effect-stars"]
    owned = [*equipped, "ship-scout"]
    p1["unlockedCosmetics"] = owned
    p1["equippedCosmetics"] = equipped
    p1["purchaseTransactions"] = [
        {"id": f"v65-purchase-{item}", "childId": "child-1", "itemId": item, "cost": 0,
         "createdAt": f"2026-09-17T03:0{index}:00.000Z", "source": "legacy-migration"}
        for index, item in enumerate(owned)
    ]
    p1["equipmentTransactions"] = [
        {"id": f"v65-equip-{item}", "childId": "child-1", "itemId": item,
         "slot": {"room-starlab": "room", "robot-sky": "robot", "card-sky": "card", "effect-stars": "effect"}[item],
         "action": "equip", "createdAt": f"2026-09-17T03:1{index}:00.000Z"}
        for index, item in enumerate(equipped)
    ]

    # Child 2 has a visibly different home world so U03 can prove identity switching.
    p2 = progress["child-2"]
    p2["unlockedCosmetics"] = ["room-ocean"]
    p2["equippedCosmetics"] = ["room-ocean"]
    p2["purchaseTransactions"] = [{
        "id": "v65-purchase-room-ocean", "childId": "child-2", "itemId": "room-ocean", "cost": 0,
        "createdAt": "2026-09-17T03:20:00.000Z", "source": "legacy-migration",
    }]
    p2["equipmentTransactions"] = [{
        "id": "v65-equip-room-ocean", "childId": "child-2", "itemId": "room-ocean", "slot": "room",
        "action": "equip", "createdAt": "2026-09-17T03:21:00.000Z",
    }]
    attendance = {"day-14": ["child-1"]}
    return settings, progress, attendance


def seed_script(settings: dict, progress: dict, attendance: dict) -> str:
    return f"""
(() => {{
  if (localStorage.getItem('__v65_phase2_fixture_seeded__') === '1') return;
  localStorage.clear(); sessionStorage.clear();
  const settings={json.dumps(settings, ensure_ascii=False)};
  const progress={json.dumps(progress, ensure_ascii=False)};
  const attendance={json.dumps(attendance, ensure_ascii=False)};
  localStorage.setItem('star-learning-v40:__local__:settings', JSON.stringify(settings));
  localStorage.setItem('star-learning-v40:__local__:progress', JSON.stringify(progress));
  localStorage.setItem('star-learning-v40:__local__:attendance', JSON.stringify(attendance));
  localStorage.setItem('star-learning-v40:__local__:reflections', JSON.stringify({{}}));
  sessionStorage.setItem('star-learning-v40:__local__:active-user', 'user-father');
  localStorage.setItem('little-explorers-v4-sound', 'off');
  localStorage.setItem('__v65_phase2_fixture_seeded__', '1');
}})();
"""


def open_home(page: Page) -> None:
    page.goto(URL, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_selector(".v4-dashboard-grid", timeout=30000)
    page.wait_for_selector(".v65-home-display-selector", timeout=10000)
    page.evaluate("document.fonts.ready")


def open_shop(page: Page) -> None:
    page.get_by_role("button", name="寶物商店", exact=True).click()
    page.wait_for_selector(".v6-shop-studio", timeout=15000)
    page.wait_for_selector(".v64-mobile-mini-preview", timeout=10000)


def category(page: Page, label: str) -> None:
    page.locator(".v6-shop-category-tabs").get_by_role("tab", name=label, exact=True).click()
    page.wait_for_function(
        "label => [...document.querySelectorAll('.v6-shop-category-tabs button')].some(b => b.textContent?.trim()===label && b.getAttribute('aria-selected')==='true')",
        arg=label, timeout=5000,
    )


def ensure_card(page: Page, item_id: str):
    card = page.locator(f'article[data-item-id="{item_id}"]')
    for _ in range(5):
        if card.count() and card.is_visible(): return card
        more = page.locator(".v64-load-more")
        if more.count() and more.is_visible():
            more.click(); page.wait_for_timeout(80)
        else: break
    if not card.count(): raise AssertionError(f"missing card {item_id}")
    return card


def mini_state(page: Page) -> dict:
    return page.locator(".v64-mobile-mini-preview").evaluate("""node => {
      const content=node.querySelector('.v65-mini-preview-content');
      const images=[...node.querySelectorAll('img')].map(img=>({src:img.currentSrc||img.src,complete:img.complete,naturalWidth:img.naturalWidth}));
      const effect=node.querySelector('[data-effect-item]');
      return {
        visible:getComputedStyle(node).display!=='none',
        mode:content?.dataset.previewMode||'', item:content?.dataset.previewItem||'',
        images, effectItem:effect?.getAttribute('data-effect-item')||'',
        avatarCount:node.querySelectorAll('.avatar-renderer').length,
        text:node.textContent?.replace(/\\s+/g,' ').trim()||'',
        rect:(()=>{const r=node.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,width:r.width,height:r.height};})(),
      };
    }""")


def phase2_case(page: Page) -> dict:
    failures: list[str] = []
    evidence: dict = {"u01": [], "u02": {}, "u03": {}, "a01": {}}
    open_home(page)

    # U03: parent identity and today's participant are independent of home display learner.
    before = page.evaluate("""() => ({
      activeUser: sessionStorage.getItem('star-learning-v40:__local__:active-user'),
      attendance: JSON.parse(localStorage.getItem('star-learning-v40:__local__:attendance')||'{}'),
      label: document.querySelector('.v65-home-display-selector strong')?.textContent?.trim()||'',
      world: document.querySelector('.v4-shell')?.getAttribute('data-world-items')||'',
    })""")
    if "哥哥" not in before["label"] or "room-starlab" not in before["world"]:
        failures.append(f"U03 initial display wrong: {before}")
    page.locator('.v65-home-display-selector button', has_text='弟弟').click()
    page.wait_for_function("document.querySelector('.v65-home-display-selector strong')?.textContent?.includes('弟弟')", timeout=5000)
    switched = page.evaluate("""() => ({
      activeUser: sessionStorage.getItem('star-learning-v40:__local__:active-user'),
      attendance: JSON.parse(localStorage.getItem('star-learning-v40:__local__:attendance')||'{}'),
      label: document.querySelector('.v65-home-display-selector strong')?.textContent?.trim()||'',
      world: document.querySelector('.v4-shell')?.getAttribute('data-world-items')||'',
      stored: JSON.parse(localStorage.getItem('star-learning-v40:__local__:settings')||'{}').homeDisplayLearnerId||'',
    })""")
    if switched["activeUser"] != before["activeUser"] or switched["attendance"] != before["attendance"]:
        failures.append(f"U03 display selector mutated parent/attendance state: {switched}")
    if switched["stored"] != "child-2" or "room-ocean" not in switched["world"]:
        failures.append(f"U03 child-2 world/persistence wrong: {switched}")
    page.reload(wait_until="domcontentloaded", timeout=60000)
    page.wait_for_selector('.v65-home-display-selector', timeout=15000)
    after_reload = page.evaluate("""() => ({
      label: document.querySelector('.v65-home-display-selector strong')?.textContent?.trim()||'',
      world: document.querySelector('.v4-shell')?.getAttribute('data-world-items')||'',
      stored: JSON.parse(localStorage.getItem('star-learning-v40:__local__:settings')||'{}').homeDisplayLearnerId||'',
    })""")
    if "弟弟" not in after_reload["label"] or "room-ocean" not in after_reload["world"] or after_reload["stored"] != "child-2":
        failures.append(f"U03 reload lost display learner: {after_reload}")
    evidence["u03"] = {"before": before, "switched": switched, "afterReload": after_reload}

    # Return display world to child 1 before Shop assertions.
    page.locator('.v65-home-display-selector button', has_text='哥哥').click()
    page.wait_for_function("document.querySelector('.v65-home-display-selector strong')?.textContent?.includes('哥哥')", timeout=5000)
    open_shop(page)

    # U01: representative real item in all six preview modes must own the sticky mini preview.
    for label, item_id, expected_mode in REPRESENTATIVES:
        category(page, label)
        card = ensure_card(page, item_id)
        button = card.locator('.v6-preview-button')
        if button.inner_text().strip() == '取消試穿': button.click(); page.wait_for_timeout(60)
        button.click()
        page.wait_for_function("id => document.querySelector('.v65-mini-preview-content')?.dataset.previewItem===id", arg=item_id, timeout=8000)
        page.wait_for_timeout(120)
        state = mini_state(page)
        row_failures = []
        if state["mode"] != expected_mode or state["item"] != item_id:
            row_failures.append(f"mode/item {state['mode']}:{state['item']}")
        if expected_mode in ("ship", "world", "card") and not any(x["complete"] and x["naturalWidth"] > 0 and item_id in x["src"] for x in state["images"]):
            row_failures.append("actual world item image missing")
        if expected_mode == "robot" and (state["avatarCount"] < 1 or not any(x["complete"] and x["naturalWidth"] > 0 and item_id in x["src"] for x in state["images"])):
            row_failures.append("robot mini must show avatar + robot")
        if expected_mode == "effect" and (state["avatarCount"] < 1 or state["effectItem"] != item_id):
            row_failures.append("effect mini must show avatar + actual effect")
        if expected_mode == "avatar" and state["avatarCount"] < 1:
            row_failures.append("avatar mini missing")
        evidence["u01"].append({"category": label, "itemId": item_id, "expectedMode": expected_mode, "state": state, "failures": row_failures})
        failures.extend(f"U01 {item_id}: {message}" for message in row_failures)
        # Cancel so trial focus cannot masquerade as current equipped state.
        card.locator('.v6-preview-button').click(); page.wait_for_timeout(80)

    # U02: current equipped World item remains visible with no trial focus, then survives an actual equip + reload.
    category(page, "基地")
    page.wait_for_function("document.querySelector('.v63-equipment-stage')?.dataset.previewItem==='room-starlab'", timeout=8000)
    current_room = {
        "stageItem": page.locator('.v63-equipment-stage').get_attribute('data-preview-item'),
        "mini": mini_state(page),
    }
    if current_room["stageItem"] != "room-starlab" or current_room["mini"]["item"] != "room-starlab":
        failures.append(f"U02 equipped room not shown without trial: {current_room}")

    category(page, "飛船")
    ship = ensure_card(page, "ship-scout")
    action = ship.locator('button:not(.v6-preview-button)').first
    if action.inner_text().strip() not in ("立即使用", "先收起來"):
        failures.append(f"U02 unexpected ship action: {action.inner_text().strip()}")
    if action.inner_text().strip() == "立即使用": action.click()
    page.wait_for_function("document.querySelector('article[data-item-id=\"ship-scout\"]')?.classList.contains('equipped')", timeout=8000)
    page.wait_for_timeout(500)
    after_equip = {
        "category": page.locator('.v6-shop-category-tabs button[aria-selected=\"true\"]').inner_text(),
        "compare": page.locator('.v64-preview-compare').inner_text() if page.locator('.v64-preview-compare').count() else '',
        "stageItem": page.locator('.v63-equipment-stage').get_attribute('data-preview-item'),
        "mini": mini_state(page),
        "progress": page.evaluate("JSON.parse(localStorage.getItem('star-learning-v40:__local__:progress')||'{}')['child-1']?.equippedCosmetics||[]"),
    }
    page.reload(wait_until="domcontentloaded", timeout=60000)
    page.wait_for_selector('.v4-dashboard-grid', timeout=20000)
    page.get_by_role("button", name="寶物商店", exact=True).click(); page.wait_for_selector('.v6-shop-studio', timeout=15000)
    category(page, "飛船")
    page.wait_for_timeout(500)
    after_ship_reload = {"stageItem": page.locator('.v63-equipment-stage').get_attribute('data-preview-item'), "mini": mini_state(page), "category": page.locator('.v6-shop-category-tabs button[aria-selected=\"true\"]').inner_text()}
    if "ship-scout" not in after_equip["progress"] or after_equip["stageItem"] != "ship-scout" or after_ship_reload["stageItem"] != "ship-scout":
        failures.append(f"U02 ship equip/reload failed: {after_equip} reload={after_ship_reload}")
    evidence["u02"] = {"currentRoom": current_room, "afterShipEquip": after_equip, "afterShipReload": after_ship_reload}

    # A01: full-skin + starter cap must request the V6.4 reviewed overlay, never V5.
    # Seed an outfit directly into the isolated fixture to observe actual Runtime DOM after reload.
    page.evaluate("""() => {
      const key='star-learning-v40:__local__:progress'; const all=JSON.parse(localStorage.getItem(key)||'{}');
      const p=all['child-1']; p.unlockedCosmetics=[...new Set([...(p.unlockedCosmetics||[]),'outfit-racer','starter-sun-cap'])];
      p.equippedCosmetics=[...(p.equippedCosmetics||[]).filter(id=>!id.startsWith('outfit-')&&id!=='starter-sun-cap'),'outfit-racer','starter-sun-cap'];
      delete p.purchaseTransactions; delete p.equipmentTransactions; localStorage.setItem(key,JSON.stringify(all));
    }""")
    page.reload(wait_until="domcontentloaded", timeout=60000); page.wait_for_selector('.v4-dashboard-grid', timeout=20000)
    page.get_by_role("button", name="寶物商店", exact=True).click(); page.wait_for_selector('.v6-shop-studio', timeout=15000)
    a01 = page.evaluate("""() => {
      const layer=[...document.querySelectorAll('.v63-equipment-stage img[data-wearable-item="starter-sun-cap"]')].find(i=>getComputedStyle(i).display!=='none');
      const renderer=document.querySelector('.v63-equipment-stage .avatar-renderer');
      return {src:layer?.currentSrc||layer?.src||'',skin:renderer?.dataset.skin||'',rendered:renderer?.dataset.renderedItems||''};
    }""")
    if "/assets/v6.4/runtime/brother/starter-sun-cap.webp" not in a01["src"] or "/assets/v5/" in a01["src"] or a01["skin"] != "outfit-racer":
        failures.append(f"A01 full-skin cap binding wrong: {a01}")
    evidence["a01"] = a01

    return {"status": "PASS" if not failures else "FAIL", "failures": failures, "evidence": evidence}


def main() -> int:
    started = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    settings, progress, attendance = fixture()
    console_errors: list[str] = []
    page_errors: list[str] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
        context.add_init_script(seed_script(settings, progress, attendance))
        context.route("**/api/server-time", route_time); context.route("**/api/time", route_time)
        page = context.new_page()
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))
        result = phase2_case(page)
        shot = OUT / "mobile-final-390x844.png"
        page.screenshot(path=str(shot), full_page=False, animations="disabled", caret="hide")
        result["screenshot"] = str(shot.relative_to(ROOT)); result["screenshotSha256"] = sha256(shot)
        context.close(); browser.close()
    result.update({
        "suiteName": "v65-phase2-runtime", "environment": "isolated-local-fixture",
        "auditUrl": URL, "startedAt": started, "finishedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "consoleErrors": console_errors, "pageErrors": page_errors,
        "notClaimed": ["production verification", "127-row art completion", "physical iPhone/Android"],
    })
    if console_errors: result["failures"].extend(f"console: {x}" for x in console_errors); result["status"] = "FAIL"
    if page_errors: result["failures"].extend(f"pageerror: {x}" for x in page_errors); result["status"] = "FAIL"
    target = OUT / "result.json"; target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": result["status"], "failureCount": len(result["failures"]), "failures": result["failures"][:20], "result": str(target.relative_to(ROOT))}, ensure_ascii=False, indent=2))
    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__": raise SystemExit(main())
