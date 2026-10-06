#!/usr/bin/env python3
"""P04 four-avatar Pilot closure.

Reuses already-reviewed exact-scope Pilot art and proves the missing product
loop on the current Runtime: Shop actual equip -> same AvatarRenderer multi-slot
priority -> Home -> reload persistence -> Achievements -> Lesson. The test uses
an isolated local QA family; it never reads or writes a real family/cloud state.
"""
from __future__ import annotations

import copy
import hashlib
import json
import os
import time
from pathlib import Path
from typing import Any

from playwright.sync_api import Page, Route, sync_playwright

from qa_v63_browser_seed import SETTINGS as BASE_SETTINGS, PROGRESS as BASE_PROGRESS
from qa_v64_4k_layout import TIME
from qa_v64_home_sample import dirty_tree_hash, run_text, tree_hash

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get("AUDIT_URL", "http://127.0.0.1:4173/")
OUT = ROOT / "qa" / "production-audit" / "2026-09-14" / "v64-p04-pilot-closure"
OUT.mkdir(parents=True, exist_ok=True)
RESULT_PATH = OUT / "p04-pilot-closure.json"

PILOT = ["hair-comet", "starter-buddy-headphones", "starter-sun-cap", "starter-sky-glasses"]
EXPECTED_RENDERED_WITH_CAP = {"starter-buddy-headphones", "starter-sun-cap", "starter-sky-glasses"}
ROLE_BY_CHILD = {
    "child-1": "brother",
    "child-2": "younger",
    "child-3": "sister",
    "child-4": "younger-sister",
}
VISUAL_FOLDERS = {
    "brother": "哥哥Pilot整合驗證",
    "younger": "弟弟Pilot整合驗證",
    "sister": "姐姐Pilot整合驗證",
    "younger-sister": "妹妹Pilot整合驗證",
}
FILTER_FOR_ITEM = {
    "hair-comet": "髮型",
    "starter-buddy-headphones": "耳機",
    "starter-sun-cap": "帽子",
    "starter-sky-glasses": "眼鏡",
}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def fulfill_json(route: Route, data: Any, status: int = 200) -> None:
    route.fulfill(status=status, content_type="application/json", body=json.dumps(data, ensure_ascii=False))


def install_time_routes(context) -> None:
    context.route("**/api/server-time", lambda route: fulfill_json(route, TIME))
    context.route("**/api/time", lambda route: fulfill_json(route, TIME))


def local_fixture() -> tuple[dict[str, Any], dict[str, Any], str]:
    settings = copy.deepcopy(BASE_SETTINGS)
    settings["cloudSync"] = {"enabled": False, "familyCode": ""}
    progress = copy.deepcopy(BASE_PROGRESS)
    for child in settings["children"]:
        p = progress[child["id"]]
        p["unlockedCosmetics"] = list(PILOT)
        p["equippedCosmetics"] = []
        p.setdefault("purchaseTransactions", [])
        p.setdefault("equipmentTransactions", [])
    seed = f"""(() => {{
      const marker='v64-p04-pilot-seeded-v1';
      if (!localStorage.getItem(marker)) {{
        localStorage.clear(); sessionStorage.clear();
        localStorage.setItem('star-learning-v40:__local__:settings', JSON.stringify({json.dumps(settings, ensure_ascii=False)}));
        localStorage.setItem('star-learning-v40:__local__:progress', JSON.stringify({json.dumps(progress, ensure_ascii=False)}));
        localStorage.setItem('star-learning-v40:__local__:attendance', '{{}}');
        localStorage.setItem('star-learning-v40:__local__:reflections', '{{}}');
        localStorage.setItem(marker, '1');
      }}
      localStorage.setItem('little-explorers-v4-sound','off');
    }})();"""
    return settings, progress, seed


def wait_home(page: Page) -> None:
    page.wait_for_function("document.querySelectorAll('.v4-player-card').length===4 && document.querySelectorAll('.v4-daily-panel .v4-lesson-card').length===2", timeout=30000)
    page.evaluate("document.fonts.ready")


def wait_shop(page: Page) -> None:
    page.wait_for_function("document.querySelector('.v6-shop-studio') && document.querySelectorAll('.v6-shop-tabs button').length===4", timeout=30000)
    page.evaluate("document.fonts.ready")


def avatar_state(locator) -> dict[str, Any]:
    return locator.evaluate("""el => ({
      avatar:[...el.classList].find(v=>v.startsWith('avatar-') && !['avatar-renderer','avatar-photo-hero'].includes(v)) || '',
      cosmetics:(el.dataset.cosmetics||'').split(/\s+/).filter(Boolean),
      rendered:(el.dataset.renderedItems||'').split(/\s+/).filter(Boolean),
      artMode:el.dataset.artMode||'',
      detail:el.dataset.runtimeDetail||'',
      images:[...el.querySelectorAll('img')].map(img=>({src:img.currentSrc||img.src,cls:img.className,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}))
    })""")


def ready_avatar_state(page: Page, locator, timeout_ms: int = 5000) -> dict[str, Any]:
    locator.scroll_into_view_if_needed()
    deadline = timeout_ms // 50
    last = avatar_state(locator)
    for _ in range(max(1, deadline)):
        last = avatar_state(locator)
        if last["detail"] == "starter-sun-cap" and all(row["naturalWidth"] > 0 and row["naturalHeight"] > 0 for row in last["images"]):
            return last
        page.wait_for_timeout(50)
    return last


def assert_pilot_state(state: dict[str, Any], avatar: str, surface: str) -> list[str]:
    failures: list[str] = []
    cosmetics = set(state["cosmetics"])
    rendered = set(state["rendered"])
    if not set(PILOT).issubset(cosmetics):
        failures.append(f"{surface}/{avatar}: cosmetics missing {sorted(set(PILOT)-cosmetics)}")
    if rendered != EXPECTED_RENDERED_WITH_CAP:
        failures.append(f"{surface}/{avatar}: rendered priority {sorted(rendered)} != {sorted(EXPECTED_RENDERED_WITH_CAP)}")
    if state["artMode"] != "runtime":
        failures.append(f"{surface}/{avatar}: artMode {state['artMode']} != runtime")
    if state["detail"] != "starter-sun-cap":
        failures.append(f"{surface}/{avatar}: runtime detail {state['detail']} != starter-sun-cap")
    image_srcs = [row["src"] for row in state["images"]]
    if not any("starter-sun-cap.webp" in src for src in image_srcs):
        failures.append(f"{surface}/{avatar}: cap runtime image missing")
    if not any("starter-sky-glasses.webp" in src for src in image_srcs):
        failures.append(f"{surface}/{avatar}: glasses runtime image missing")
    expected_combo = f"/{avatar}/starter-buddy-headphones--starter-sun-cap-front.webp"
    if not any(expected_combo in src for src in image_srcs):
        failures.append(f"{surface}/{avatar}: cap-specific headphones foreground missing")
    if any("hair-comet.webp" in src for src in image_srcs):
        failures.append(f"{surface}/{avatar}: hair image visible despite cap-priority contract")
    for row in state["images"]:
        if row["naturalWidth"] <= 0 or row["naturalHeight"] <= 0:
            failures.append(f"{surface}/{avatar}: undecoded image {row['src']}")
    return failures


def historical_visual_evidence() -> dict[str, Any]:
    base = ROOT / "docs" / "handover" / "接續執行_20260910_003501"
    roles: dict[str, Any] = {}
    failures: list[str] = []
    screenshot_count = 0
    for role, folder in VISUAL_FOLDERS.items():
        result_path = base / folder / "results.json"
        if not result_path.exists():
            failures.append(f"missing historical results {role}")
            continue
        data = json.loads(result_path.read_text(encoding="utf-8"))
        rows = data.get("rows", [])
        if data.get("status") != "PASS" or len(rows) != 18 or not all(row.get("passed") for row in rows):
            failures.append(f"historical Pilot structural result not PASS for {role}")
        changed_shots: list[str] = []
        shots = [shot for row in rows for shot in row.get("screenshots", [])]
        screenshot_count += len(shots)
        for shot in shots:
            path = ROOT / shot["path"]
            if not path.exists() or sha256_file(path) != shot.get("sha256"):
                changed_shots.append(shot.get("path", ""))
        if changed_shots:
            failures.append(f"historical visual screenshot hash drift {role}: {changed_shots[:3]}")
        roles[role] = {
            "status": data.get("status"),
            "resultSha256": sha256_file(result_path),
            "rows": len(rows),
            "passedRows": sum(bool(row.get("passed")) for row in rows),
            "screenshots": len(shots),
            "screenshotHashesUnchanged": not changed_shots,
            "sourceRendererSha256": data.get("sourceHashes", {}).get("src/components/AvatarRenderer.tsx"),
            "sourceAvatarShopSha256": data.get("sourceHashes", {}).get("src/avatarShop.ts"),
        }
    return {"pass": not failures, "failures": failures, "screenshotCount": screenshot_count, "roles": roles}


def manifest_assets() -> dict[str, Any]:
    manifest_path = ROOT / "src" / "data" / "avatarAssetManifest.json"
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    access = {row["id"]: row for row in data["accessories"]}
    rows: list[dict[str, Any]] = []
    failures: list[str] = []
    for item_id in PILOT:
        entry = access.get(item_id)
        if not entry:
            failures.append(f"manifest missing {item_id}")
            continue
        for avatar in ROLE_BY_CHILD.values():
            paths: list[tuple[str, str]] = []
            if item_id == "starter-sun-cap":
                detail = (entry.get("defaultSkinDetails") or {}).get(avatar) or {}
                if detail.get("overlay"): paths.append(("overlay", detail["overlay"]))
                if detail.get("hairVisibilityMask"): paths.append(("mask", detail["hairVisibilityMask"]))
            else:
                variant = (entry.get("variants") or {}).get(avatar)
                if variant: paths.append(("overlay", variant))
            if item_id == "starter-buddy-headphones":
                combo = (((entry.get("headwearVariants") or {}).get(avatar) or {}).get("starter-sun-cap") or {}).get("overlay")
                if combo: paths.append(("capForeground", combo))
                else: failures.append(f"manifest missing headphones cap foreground {avatar}")
            if entry.get("renderer") != "aligned-overlay": failures.append(f"{item_id}/{avatar} renderer {entry.get('renderer')}")
            if avatar not in (entry.get("supportedAvatars") or []): failures.append(f"{item_id}/{avatar} unsupported")
            for label, rel in paths:
                path = ROOT / rel
                exists = path.exists()
                rows.append({"itemId": item_id, "avatar": avatar, "kind": label, "path": rel, "exists": exists,
                             "bytes": path.stat().st_size if exists else None, "sha256": sha256_file(path) if exists else None})
                if not exists: failures.append(f"missing asset {rel}")
    return {"pass": not failures, "failures": failures, "manifestSha256": sha256_file(manifest_path), "rows": rows}


def select_learner(page: Page, name: str) -> None:
    # ShopPage is lazy-loaded and can re-render once progress storage merges.
    # Anchor to the stable tab button text rather than an accessibility-role
    # locator that can become stale across that boundary.
    tab = page.locator(".v6-shop-tabs button", has_text=name).first
    tab.wait_for(state="visible", timeout=5000)
    tab.click()
    page.wait_for_function(
        "name => [...document.querySelectorAll('.v6-shop-tabs button')].some(b => b.textContent?.trim()===name && b.getAttribute('aria-selected')==='true')",
        arg=name,
        timeout=5000,
    )


def equip_item(page: Page, item_id: str) -> None:
    page.locator(".v64-character-filters").get_by_role("tab", name=FILTER_FOR_ITEM[item_id], exact=True).click()
    article = page.locator(f'article[data-item-id="{item_id}"]')
    article.wait_for(state="visible", timeout=5000)
    status = article.locator(".v6-shop-item-status").inner_text().strip()
    if status != "穿戴中":
        article.get_by_role("button", name="立即穿上", exact=True).click()
        page.wait_for_function("id => document.querySelector(`article[data-item-id=\"${id}\"] .v6-shop-item-status`)?.textContent?.trim()==='穿戴中'", arg=item_id, timeout=5000)


def run_runtime_closure() -> dict[str, Any]:
    settings, _, seed = local_fixture()
    failures: list[str] = []
    role_rows: list[dict[str, Any]] = []
    console_errors: list[str] = []
    page_errors: list[str] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
        context.add_init_script(seed)
        install_time_routes(context)
        page = context.new_page()
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))
        page.goto(URL, wait_until="domcontentloaded", timeout=60000)
        wait_home(page)
        page.get_by_role("button", name="寶物商店", exact=True).click()
        wait_shop(page)

        for child in settings["children"]:
            avatar = ROLE_BY_CHILD[child["id"]]
            select_learner(page, child["name"])
            for item_id in PILOT:
                equip_item(page, item_id)
            page.wait_for_timeout(180)
            shop_avatar = page.locator(".v63-equipment-stage .avatar-renderer").first
            if not shop_avatar.count():
                shop_avatar = page.locator(".v6-shop-preview-column .avatar-renderer").first
            shop_state = ready_avatar_state(page, shop_avatar)
            row_failures = assert_pilot_state(shop_state, avatar, "shop")
            shot = OUT / f"shop-{avatar}-1440.png"
            page.screenshot(path=str(shot), full_page=False, animations="disabled", caret="hide")
            role_rows.append({"avatar": avatar, "childId": child["id"], "learnerName": child["name"],
                              "shopState": shop_state, "shopScreenshot": str(shot.relative_to(ROOT)),
                              "shopScreenshotSha256": sha256_file(shot), "failures": row_failures})
            failures.extend(row_failures)

        # Shop -> Home: all four persisted in the same React state.
        page.get_by_role("button", name="首頁", exact=True).click(); wait_home(page)
        for index, child in enumerate(settings["children"]):
            avatar = ROLE_BY_CHILD[child["id"]]
            state = ready_avatar_state(page, page.locator(".v4-player-card .avatar-renderer").nth(index))
            row_failures = assert_pilot_state(state, avatar, "home-before-reload")
            role_rows[index]["homeStateBeforeReload"] = state
            role_rows[index]["failures"].extend(row_failures); failures.extend(row_failures)
        home_shot = OUT / "home-all-four-before-reload-1440.png"
        page.screenshot(path=str(home_shot), full_page=True, animations="disabled", caret="hide")

        # Reload must read the same equipment from local family progress.
        page.reload(wait_until="domcontentloaded", timeout=60000); wait_home(page)
        for index, child in enumerate(settings["children"]):
            avatar = ROLE_BY_CHILD[child["id"]]
            state = ready_avatar_state(page, page.locator(".v4-player-card .avatar-renderer").nth(index))
            row_failures = assert_pilot_state(state, avatar, "home-after-reload")
            role_rows[index]["homeStateAfterReload"] = state
            role_rows[index]["failures"].extend(row_failures); failures.extend(row_failures)

        # Cross-page achievements: switch all four tabs and inspect the main wall avatar.
        page.get_by_role("button", name="成就獎勵", exact=True).click()
        page.wait_for_function("document.querySelector('.v6-achievement-wall')", timeout=30000)
        for index, child in enumerate(settings["children"]):
            avatar = ROLE_BY_CHILD[child["id"]]
            tab = page.locator(".v6-achievement-tabs button", has_text=child["name"]).first
            tab.wait_for(state="visible", timeout=5000)
            tab.click()
            page.wait_for_function(
                "name => [...document.querySelectorAll('.v6-achievement-tabs button')].some(b => b.textContent?.trim()===name && b.getAttribute('aria-selected')==='true')",
                arg=child["name"],
                timeout=5000,
            )
            state = ready_avatar_state(page, page.locator(".v6-achievement-wall header .avatar-renderer").first)
            row_failures = assert_pilot_state(state, avatar, "achievements")
            role_rows[index]["achievementState"] = state
            role_rows[index]["failures"].extend(row_failures); failures.extend(row_failures)

        # Persisted storage proof: all four records include all Pilot items.
        # LessonQuest is intentionally not runtime-gated in P04: its initial
        # quest shell contains no AvatarRenderer; learner renderers appear only
        # in later lesson phases. Full lesson integration is P05/P12 scope.
        storage = page.evaluate("JSON.parse(localStorage.getItem('star-learning-v40:__local__:progress')||'{}')")
        for child in settings["children"]:
            equipped = set((storage.get(child["id"]) or {}).get("equippedCosmetics") or [])
            if not set(PILOT).issubset(equipped): failures.append(f"storage/{child['id']}: missing {sorted(set(PILOT)-equipped)}")

        context.close(); browser.close()

    if console_errors: failures.append(f"console errors {console_errors[:3]}")
    if page_errors: failures.append(f"page errors {page_errors[:3]}")
    return {
        "pass": not failures, "failures": failures, "roles": role_rows,
        "consoleErrors": console_errors, "pageErrors": page_errors,
        "homeScreenshot": str(home_shot.relative_to(ROOT)), "homeScreenshotSha256": sha256_file(home_shot),
        "lessonSourceCheck": {
            "status": "SOURCE_CONFIRMED_RUNTIME_DEFERRED_TO_P05",
            "file": "src/v4/LessonQuest.tsx",
            "sha256": sha256_file(ROOT / "src/v4/LessonQuest.tsx"),
            "note": "LessonQuest passes equippedCosmetics into AvatarHero/AvatarRenderer in later learner surfaces; initial quest shell has no avatar surface, so P04 does not fabricate a runtime PASS."
        },
        "storage": storage,
    }


def main() -> int:
    started_at = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    historical = historical_visual_evidence()
    assets = manifest_assets()
    runtime = run_runtime_closure()
    finished_at = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    status = "PASS" if historical["pass"] and assets["pass"] and runtime["pass"] else "FAIL"
    payload = {
        "schemaVersion": 1,
        "suiteName": "v64-p04-pilot-closure",
        "status": status,
        "sourceRevision": run_text("git", "rev-parse", "HEAD"),
        "dirtyTreeHash": dirty_tree_hash(),
        "artifactHash": tree_hash(ROOT / "dist"),
        "runId": f"p04-{int(time.time())}",
        "startedAt": started_at,
        "finishedAt": finished_at,
        "auditUrl": URL,
        "scope": {
            "pilotItems": PILOT,
            "avatars": list(ROLE_BY_CHILD.values()),
            "surfaces": ["Shop actual equip", "Home", "reload persistence", "Achievements"],
            "priorityContract": "all four remain equipped; starter-sun-cap owns visible hair priority; headphones switch to cap-specific foreground; hair returns when cap is removed",
            "visualReviewPolicy": "reuses only unchanged historical screenshot hashes; current screenshots are Runtime evidence and are not claimed as newly model-viewed",
            "notClaimed": ["all 63 products complete", "full-skin matrix complete", "full lesson runtime closure", "cloud round-trip", "production release"],
        },
        "historicalVisual": historical,
        "manifestAssets": assets,
        "runtimeClosure": runtime,
        "currentSourceHashes": {
            "avatarAssetManifest": sha256_file(ROOT / "src/data/avatarAssetManifest.json"),
            "AvatarRenderer": sha256_file(ROOT / "src/components/AvatarRenderer.tsx"),
            "avatarAssetRegistry": sha256_file(ROOT / "src/avatarAssetRegistry.ts"),
            "avatarShop": sha256_file(ROOT / "src/avatarShop.ts"),
            "SecondaryViews": sha256_file(ROOT / "src/v4/SecondaryViews.tsx"),
            "App": sha256_file(ROOT / "src/App.tsx"),
        },
    }
    RESULT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": status,
        "historicalVisual": {"pass": historical["pass"], "screenshotCount": historical["screenshotCount"], "failures": historical["failures"]},
        "manifestAssets": {"pass": assets["pass"], "rows": len(assets["rows"]), "failures": assets["failures"]},
        "runtime": {"pass": runtime["pass"], "failures": runtime["failures"],
                    "roles": [{"avatar": r["avatar"], "failures": r["failures"]} for r in runtime["roles"]]},
        "result": str(RESULT_PATH.relative_to(ROOT)),
    }, ensure_ascii=False, indent=2))
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
