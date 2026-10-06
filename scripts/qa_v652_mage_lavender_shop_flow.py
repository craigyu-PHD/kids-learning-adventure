#!/usr/bin/env python3
"""Isolated local Shop -> Home -> Achievements check for the two V6.5.2 hats.

Requires an already running local preview. Never calls a family or state API.
Every invocation writes a new attempt directory, including failed cases.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import itertools
import json
import math
import re
import traceback
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

from qa_v63_browser_seed import PROGRESS as BASE_PROGRESS, SETTINGS as BASE_SETTINGS
from qa_v65_feedback_home import route_time


ROOT = Path(__file__).resolve().parents[1]
ITEMS = ("hat-mage", "sister-lavender-hat")
CHILDREN = tuple((child["id"], child["avatar"]) for child in BASE_SETTINGS["children"])
SIZES = ((390, 844), (1440, 900))
THEMES = ("light", "dark")
PROGRESS_KEY = "star-learning-v40:__local__:progress"
SEED_MARKER = "__v652_two_hats_shop_seeded__"


def expected_paths(item: str, avatar: str) -> dict[str, str]:
    if item not in ITEMS or avatar not in {a for _, a in CHILDREN}:
        raise ValueError(f"unsupported item/avatar: {item}/{avatar}")
    return {
        "catalog": f"/assets/v6.5.2/catalog/hats/{item}.webp",
        "detail": f"/assets/v6.5.2/runtime/{avatar}/{item}--detail.png",
        "mask": f"/assets/v6.5.2/runtime-masks/{avatar}/{item}--hair-visibility-mask.png",
    }


def sha_file(path: Path) -> str:
    stat = path.stat()
    if stat.st_size == 0 or getattr(stat, "st_blocks", 1) == 0 or getattr(stat, "st_flags", 0) & 0x40000000:
        raise RuntimeError(f"empty or dataless pin: {path}")
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inventory_base_targets(inventory: dict) -> dict[str, str]:
    """Admit exactly eight base pairs and two catalogs with exact public names."""
    expected_pairs = {(item, avatar) for item in ITEMS for _, avatar in CHILDREN}
    pair_rows = [row for row in inventory["pairs"] if row["skinId"] == "base" and row["itemId"] in ITEMS]
    keys = [(row["itemId"], row["avatarId"]) for row in pair_rows]
    if len(pair_rows) != 8 or len(set(keys)) != 8 or set(keys) != expected_pairs:
        raise AssertionError(f"base pair coverage/duplicate drift: {keys}")
    catalog_rows = [row for row in inventory["catalogs"] if row["itemId"] in ITEMS]
    catalog_items = [row["itemId"] for row in catalog_rows]
    if len(catalog_rows) != 2 or len(set(catalog_items)) != 2 or set(catalog_items) != set(ITEMS):
        raise AssertionError(f"catalog coverage/duplicate drift: {catalog_items}")
    targets: dict[str, str] = {}
    for row in pair_rows:
        paths = expected_paths(row["itemId"], row["avatarId"])
        for source_key, public_key, expected_key in (("overlay", "overlay", "detail"), ("mask", "mask", "mask")):
            public_path = row["proposedPublic"][public_key]
            if public_path != "public" + paths[expected_key]:
                raise AssertionError(f"case public path drift: {row['itemId']}/{row['avatarId']}/{public_key}: {public_path}")
            if public_path in targets:
                raise AssertionError(f"duplicate public target: {public_path}")
            targets[public_path] = row[source_key]["sha256"]
    for row in catalog_rows:
        public_path = row["proposedPublic"]
        if public_path != "public" + expected_paths(row["itemId"], CHILDREN[0][1])["catalog"]:
            raise AssertionError(f"catalog public path drift: {row['itemId']}: {public_path}")
        if public_path in targets:
            raise AssertionError(f"duplicate public target: {public_path}")
        targets[public_path] = row["source"]["sha256"]
    if len(targets) != 18 or any(not re.fullmatch(r"[0-9a-f]{64}", digest) for digest in targets.values()):
        raise AssertionError("expected exactly 18 unique public files with SHA256 pins")
    return targets


def pin_reviewed_source(source: dict, pins: dict[str, str]) -> None:
    path = ROOT / source["path"]
    assert path.resolve().is_relative_to(ROOT.resolve()), "source path escapes project"
    digest = sha_file(path)
    assert digest == source["sha256"], f"reviewed source/evidence drift: {source['path']}"
    pins[source["path"]] = digest


def pinned_files() -> dict[str, str]:
    inventory_path = ROOT / "qa/v652/sol/20260926-hats-integration-r1/inventory.json"
    manifest_path = ROOT / "src/data/avatarAssetManifest.json"
    proposal_path = ROOT / "qa/v652/root/20260926-resume/manifest-proposed.json"
    pins = {str(p.relative_to(ROOT)): sha_file(p) for p in (inventory_path, manifest_path, proposal_path)}
    for name in ("scripts/qa_v652_mage_lavender_shop_flow.py", "scripts/qa_v63_browser_seed.py",
                 "scripts/qa_v65_feedback_home.py", "src/components/AvatarRenderer.tsx",
                 "src/avatarAssetRegistry.ts", "src/useAvatarRigFrame.ts", "src/useAvatarDisplayPath.ts",
                 "src/equipmentPreview.ts", "src/cosmetics.ts"):
        pins[name] = sha_file(ROOT / name)
    inventory = json.loads(inventory_path.read_text())
    assert pins[str(inventory_path.relative_to(ROOT))] == "6f25b97b78818b87a50ddc1f8763cc92cdb0565b7c26512e387f61817f868607", "fixed reviewed inventory drift"
    for row in inventory["pairs"]:
        if row["skinId"] == "base" and row["itemId"] in ITEMS:
            for field in ("overlay", "mask", "sourceReport", "acceptedReview"):
                pin_reviewed_source(row[field], pins)
    for row in inventory["catalogs"]:
        if row["itemId"] in ITEMS:
            for field in ("source", "acceptedReview"):
                pin_reviewed_source(row[field], pins)
    manifest = json.loads(manifest_path.read_text())
    proposal = json.loads(proposal_path.read_text())
    actual = {entry["id"]: entry for entry in manifest["accessories"] if entry["id"] in ITEMS}
    proposed = {entry["id"]: entry for entry in proposal["accessories"] if entry["id"] in ITEMS}
    for item in ITEMS:
        if item not in actual or item not in proposed:
            raise AssertionError(f"missing manifest contract: {item}")
        for _, avatar in CHILDREN:
            if actual[item].get("defaultSkinDetails", {}).get(avatar) != proposed[item]["defaultSkinDetails"][avatar]:
                raise AssertionError(f"manifest/proposal detail drift: {item}/{avatar}")
            paths = expected_paths(item, avatar)
            detail = actual[item]["defaultSkinDetails"][avatar]
            if detail["overlay"] != "public" + paths["detail"] or detail["hairVisibilityMask"] != "public" + paths["mask"]:
                raise AssertionError(f"manifest case path drift: {item}/{avatar}")
        if actual[item].get("catalogPath") != proposed[item]["catalogPath"]:
            raise AssertionError(f"manifest/proposal catalog drift: {item}")
        if actual[item]["catalogPath"] != "public" + expected_paths(item, CHILDREN[0][1])["catalog"]:
            raise AssertionError(f"manifest catalog path drift: {item}")
    for path, expected_sha in inventory_base_targets(inventory).items():
        digest = sha_file(ROOT / path)
        if digest != expected_sha:
            raise AssertionError(f"public/source hash drift: {path}")
        pins[path] = digest
    return pins


def base_candidates(avatar: str) -> list[dict]:
    manifest = json.loads((ROOT / "src/data/avatarAssetManifest.json").read_text())
    entry = next(row for row in manifest["baseDisplayVariants"] if row["avatarId"] == avatar)
    return [{"path": "/" + row["path"].removeprefix("public/"), "width": row["width"], "height": row["height"]}
            for row in (entry["smallDisplay"], entry)]


def fixture(item: str, theme: str, child_id: str) -> tuple[dict, dict]:
    if item not in ITEMS or theme not in THEMES or child_id not in {c for c, _ in CHILDREN}:
        raise ValueError("unsupported fixture parameters")
    settings = copy.deepcopy(BASE_SETTINGS)
    settings["theme"] = theme
    settings["homeDisplayLearnerId"] = child_id
    progress = copy.deepcopy(BASE_PROGRESS)
    progress[child_id]["purchaseTransactions"] = [{
        "id": f"v652-two-hats-{item}-{child_id}-purchase", "childId": child_id,
        "itemId": item, "cost": 0, "createdAt": "2026-09-02T00:00:00.000Z",
        "source": "purchase",
    }]
    progress[child_id]["unlockedCosmetics"] = [item]
    return settings, progress


def seed_script(settings: dict, progress: dict) -> str:
    # A guard is essential: reload must retain the equipment transaction.
    return f"""(() => {{
      if (localStorage.getItem({json.dumps(SEED_MARKER)}) === '1') return;
      localStorage.removeItem('star-learning-active-family-session-v40');
      localStorage.setItem('star-learning-v40:__local__:settings', JSON.stringify({json.dumps(settings, ensure_ascii=False)}));
      localStorage.setItem({json.dumps(PROGRESS_KEY)}, JSON.stringify({json.dumps(progress, ensure_ascii=False)}));
      localStorage.setItem('star-learning-v40:__local__:attendance', '{{}}');
      localStorage.setItem('star-learning-v40:__local__:reflections', '{{}}');
      localStorage.setItem('little-explorers-v4-sound', 'off');
      sessionStorage.setItem('star-learning-v40:__local__:active-user', 'user-father');
      localStorage.setItem({json.dumps(SEED_MARKER)}, '1');
    }})();"""


def ledger(page, child_id: str) -> dict:
    return page.evaluate("""([key, id]) => {
      const all=JSON.parse(localStorage.getItem(key) || '{}');
      const p=all[id] || {};
      return {purchaseTransactions:p.purchaseTransactions || [],
        equipmentTransactions:p.equipmentTransactions || [],
        unlockedCosmetics:p.unlockedCosmetics || [],
        equippedCosmetics:p.equippedCosmetics || [],
        others:Object.fromEntries(Object.entries(all).filter(([k])=>k!==id).map(([k,v])=>
          [k,{purchaseTransactions:v.purchaseTransactions||[], equipmentTransactions:v.equipmentTransactions||[],
              unlockedCosmetics:v.unlockedCosmetics||[], equippedCosmetics:v.equippedCosmetics||[]}]))};
    }""", [PROGRESS_KEY, child_id])


def assert_mask_style(proof: dict) -> None:
    body = proof["body"]
    layer = proof["layer"]
    assert body["maskMode"] == "luminance", proof
    assert body["maskSize"] == "contain", proof
    assert body["maskPosition"] in ("center", "center center", "50% 50%"), proof
    assert body["maskRepeat"] == "no-repeat", proof
    assert layer["maskComputed"] == "none", proof


def image_proof(renderer, item: str, avatar: str, paths: dict) -> dict:
    result = renderer.evaluate(r"""async (e, expected) => {
      const deadline=performance.now()+15000;
      let layer,body;
      while(performance.now()<deadline){
        layer=e.querySelector(`[data-wearable-item="${expected.item}"]`);
        body=e.querySelector('.avatar-renderer-skin');
        if(layer?.getAttribute('src') && body?.getAttribute('src') && layer.complete && body.complete &&
           layer.naturalWidth>0 && body.naturalWidth>0)break;
        await new Promise(resolve=>setTimeout(resolve,50));
      }
      if(!layer || !body || !layer.naturalWidth || !body.naturalWidth)throw new Error('avatar image readiness timeout');
      const bounded=(promise)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('image decode timeout')),15000))]);
      await bounded(Promise.all([layer.decode(),body.decode()]));
      const maskImage=new Image();maskImage.src=expected.mask;
      await bounded(maskImage.decode());
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const rect=n=>n?.getBoundingClientRect().toJSON();
      const visible=n=>{if(!n)return false;const s=getComputedStyle(n);const r=n.getBoundingClientRect();
        return s.display!=='none' && s.visibility==='visible' && Number(s.opacity)>0 && r.width>0 && r.height>0;};
      const bodyStyle=body?getComputedStyle(body):null;
      const layerStyle=layer?getComputedStyle(layer):null;
      const cssMask=bodyStyle?.maskImage||'';
      const match=cssMask.match(/^url\(["']?(.*?)["']?\)$/);
      return {avatar:e.className, renderedItems:e.dataset.renderedItems, artMode:e.dataset.artMode,
        runtimeDetail:e.dataset.runtimeDetail, layer:{src:layer?.getAttribute('src'),
          loaded:!!layer?.complete && layer.naturalWidth>0, visible:visible(layer), rect:rect(layer),
          naturalWidth:layer?.naturalWidth,naturalHeight:layer?.naturalHeight,
          maskComputed:layerStyle?.maskImage},
        body:{src:body?.getAttribute('src'), loaded:!!body?.complete && body.naturalWidth>0,
          visible:visible(body), maskInline:body?.style.maskImage,
          maskComputed:cssMask,maskResolved:match?new URL(match[1],location.href).href:null,
          maskMatches:!!match && new URL(match[1],location.href).href===new URL(expected.mask,location.href).href,
          maskMode:bodyStyle?.maskMode,maskSize:bodyStyle?.maskSize,
          maskPosition:bodyStyle?.maskPosition,maskRepeat:bodyStyle?.maskRepeat,
          naturalWidth:body?.naturalWidth,naturalHeight:body?.naturalHeight,rect:rect(body)},
        maskImage:{src:maskImage.src,naturalWidth:maskImage.naturalWidth,naturalHeight:maskImage.naturalHeight},
        clientWidth:e.clientWidth,clientHeight:e.clientHeight,dpr:devicePixelRatio};
    }""", {"item": item, "mask": paths["mask"]})
    assert f"avatar-{avatar}" in result["avatar"].split(), result
    assert result["runtimeDetail"] == item, result
    assert item in (result["renderedItems"] or "").split(), result
    assert result["artMode"] == "runtime", result
    assert result["layer"]["src"] == paths["detail"], result
    assert result["layer"]["loaded"] and result["layer"]["visible"], result
    assert result["body"]["loaded"] and result["body"]["visible"], result
    assert (result["layer"]["naturalWidth"], result["layer"]["naturalHeight"]) == (1024, 1536), result
    assert (result["maskImage"]["naturalWidth"], result["maskImage"]["naturalHeight"]) == (1024, 1536), result
    assert result["body"]["maskMatches"], result
    assert_mask_style(result)
    candidates = base_candidates(avatar)
    painted_width = min(result["clientWidth"], result["clientHeight"] * candidates[0]["width"] / candidates[0]["height"])
    required = math.ceil(painted_width * result["dpr"] * 1.05)
    selected = next((c for c in candidates if required <= c["width"]),
                    {"path": f"/assets/v5/characters/{avatar}/wardrobe/base-body.webp", "width": 1024, "height": 1536})
    assert result["body"]["src"] == selected["path"], {"expectedBody": selected, "actual": result}
    assert (result["body"]["naturalWidth"], result["body"]["naturalHeight"]) == (selected["width"], selected["height"]), result
    return result


def assert_page_health(proof: dict) -> None:
    assert proof["overflow"] == 0, proof
    assert not proof["brokenImages"], proof


def page_health(page) -> dict:
    proof = page.evaluate("""() => ({
      overflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),
      brokenImages:[...document.images].filter(i=>i.currentSrc && i.complete && i.naturalWidth===0)
        .map(i=>({src:i.currentSrc,alt:i.alt}))
    })""")
    assert_page_health(proof)
    return proof


def assert_runtime_errors(console_errors: list[dict], blocked_external: list[str],
                          blocked_api: list[str], local_failures: list[dict]) -> None:
    # Only the browser's exact abort diagnostic for deliberately isolated external
    # resources is expected. An application error at that URL is still a failure.
    unexpected = [row for row in console_errors if not (
        row["url"] in blocked_external and row["text"] == "Failed to load resource: net::ERR_FAILED")]
    assert not unexpected, {"unexpectedConsoleErrors": unexpected}
    assert not blocked_api, {"unexpectedApiRequests": blocked_api}
    assert not local_failures, {"localRequestFailures": local_failures}


def verify_served_assets(context, base_url: str, pins: dict[str, str]) -> list[dict]:
    """A local file hash alone does not prove the preview serves those bytes."""
    from urllib.parse import urljoin
    evidence = []
    for path, digest in pins.items():
        if not path.startswith("public/"):
            continue
        url = urljoin(base_url, "/" + path.removeprefix("public/"))
        response = context.request.get(url, timeout=15000, max_redirects=0)
        try:
            actual = hashlib.sha256(response.body()).hexdigest()
            assert response.status == 200 and actual == digest, {
                "url": url, "status": response.status, "expectedSha256": digest, "actualSha256": actual}
            evidence.append({"url": url, "status": response.status, "sha256": actual})
        finally:
            response.dispose()
    assert len(evidence) == 18, f"expected 18 served base/catalog files, got {len(evidence)}"
    return evidence


def screenshot(page_or_locator, path: Path, *, check_health: bool = True) -> dict:
    page = getattr(page_or_locator, "page", page_or_locator)
    health = page_health(page) if check_health else None
    page_or_locator.screenshot(path=str(path), animations="disabled")
    return {"path": str(path.relative_to(ROOT)), "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "pageHealth": health}


def verify_no_equipment_change(before: dict, after: dict) -> None:
    assert before == after, {"before": before, "after": after}


def self_test() -> None:
    cases = list(itertools.product(ITEMS, CHILDREN, SIZES, THEMES))
    assert len(CHILDREN) == 4 and len(cases) == 32
    for item, (child_id, avatar), (width, height), theme in cases:
        assert (width, height) in SIZES
        settings, progress = fixture(item, theme, child_id)
        assert settings["homeDisplayLearnerId"] == child_id
        assert progress[child_id]["unlockedCosmetics"] == [item]
        assert progress[child_id]["equippedCosmetics"] == []
        assert all(progress[other]["unlockedCosmetics"] == [] for other in progress if other != child_id)
        assert SEED_MARKER in seed_script(settings, progress)
        paths = expected_paths(item, avatar)
        assert paths["detail"].endswith(f"/{avatar}/{item}--detail.png")
        assert paths["mask"].endswith(f"/{avatar}/{item}--hair-visibility-mask.png")
    synthetic = {"pairs": [], "catalogs": []}
    for item, (_, avatar) in itertools.product(ITEMS, CHILDREN):
        paths = expected_paths(item, avatar)
        synthetic["pairs"].append({"skinId": "base", "itemId": item, "avatarId": avatar,
            "proposedPublic": {"overlay": "public" + paths["detail"], "mask": "public" + paths["mask"]},
            "overlay": {"sha256": "a" * 64}, "mask": {"sha256": "b" * 64}})
    for item in ITEMS:
        synthetic["catalogs"].append({"itemId": item,
            "proposedPublic": "public" + expected_paths(item, CHILDREN[0][1])["catalog"],
            "source": {"sha256": "c" * 64}})
    assert len(inventory_base_targets(synthetic)) == 18
    corruptions = []
    missing = copy.deepcopy(synthetic); missing["pairs"].pop(); corruptions.append(missing)
    duplicate = copy.deepcopy(synthetic); duplicate["pairs"][0] = copy.deepcopy(duplicate["pairs"][1]); corruptions.append(duplicate)
    wrong_path = copy.deepcopy(synthetic); wrong_path["pairs"][0]["proposedPublic"]["overlay"] = "public/assets/v6.5.2/runtime/brother/wrong.png"; corruptions.append(wrong_path)
    wrong_catalog = copy.deepcopy(synthetic); wrong_catalog["catalogs"][0]["proposedPublic"] = "public/assets/v6.5.2/catalog/hats/wrong.webp"; corruptions.append(wrong_catalog)
    for bad in corruptions:
        try:
            inventory_base_targets(bad)
        except AssertionError:
            pass
        else:
            raise AssertionError("invalid inventory admitted")
    good_style = {"body": {"maskMode": "luminance", "maskSize": "contain", "maskPosition": "50% 50%", "maskRepeat": "no-repeat"},
                  "layer": {"maskComputed": "none"}}
    assert_mask_style(good_style)
    for section, key, bad_value in (("body", "maskMode", "alpha"), ("body", "maskSize", "cover"),
                                    ("body", "maskPosition", "left top"), ("body", "maskRepeat", "repeat"),
                                    ("layer", "maskComputed", "url(wrong.png)")):
        bad = copy.deepcopy(good_style); bad[section][key] = bad_value
        try:
            assert_mask_style(bad)
        except AssertionError:
            pass
        else:
            raise AssertionError(f"invalid mask style admitted: {key}")
    for item, avatar in (("hat-ocean", "brother"), ("hat-mage", "unknown")):
        try:
            expected_paths(item, avatar)
        except ValueError:
            pass
        else:
            raise AssertionError("unsupported source accepted")
    try:
        verify_no_equipment_change({"equipmentTransactions": []}, {"equipmentTransactions": [{"id": "drift"}]})
    except AssertionError:
        pass
    else:
        raise AssertionError("cancel ledger drift accepted")


def run_case(browser, url: str, out: Path, item: str, child_id: str, avatar: str, width: int, height: int, theme: str) -> dict:
    settings, progress = fixture(item, theme, child_id)
    paths = expected_paths(item, avatar)
    context = browser.new_context(viewport={"width": width, "height": height},
                                  color_scheme="dark" if theme == "dark" else "light", reduced_motion="reduce")
    context.add_init_script(seed_script(settings, progress))
    blocked = []
    blocked_external = []
    local_failures = []
    local_origin = urlsplit(url).netloc
    def local_only(route):
        if urlsplit(route.request.url).netloc == local_origin:
            route.continue_()
        else:
            blocked_external.append(route.request.url)
            route.abort()
    context.route(re.compile(r"^https?://"), local_only)
    def abort_api(route):
        blocked.append(route.request.url)
        route.abort()
    context.route("**/api/**", abort_api)
    context.route("**/api/time", route_time)
    context.route("**/api/server-time", route_time)
    page = context.new_page()
    console_errors: list[dict] = []
    page_errors: list[str] = []
    page.on("console", lambda msg: console_errors.append({"text": msg.text, "url": msg.location.get("url", "")}) if msg.type == "error" else None)
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("requestfailed", lambda request: local_failures.append({"url": request.url, "failure": request.failure})
            if urlsplit(request.url).netloc == local_origin else None)
    page.on("response", lambda response: local_failures.append({"url": response.url, "status": response.status})
            if urlsplit(response.url).netloc == local_origin and response.status >= 400 else None)
    evidence = {"item": item, "childId": child_id, "avatar": avatar, "width": width,
                "height": height, "theme": theme, "expected": paths, "screenshots": []}
    case_dir = out / f"{item}-{avatar}-{width}-{theme}"
    case_dir.mkdir()
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        page.get_by_role("button", name="寶物商店", exact=True).first.click()
        page.locator(f"#shop-learner-tab-{child_id}").click()
        page.locator("#shop-filter-tab-hat").click()
        card = page.locator(f'article[data-item-id="{item}"]')
        for _ in range(63):
            if card.count():
                break
            more = page.locator(".v64-load-more")
            if not more.count():
                raise AssertionError(f"hat card unavailable: {item}")
            more.first.click()
        else:
            raise AssertionError(f"load-more made no bounded progress: {item}")
        catalog = card.locator(".v4-item-art img")
        catalog.evaluate("i=>i.decode()")
        assert catalog.get_attribute("src") == paths["catalog"]
        evidence["catalog"] = {"src": catalog.get_attribute("src"), "loaded": catalog.evaluate("i=>i.complete&&i.naturalWidth>0")}
        assert evidence["catalog"]["loaded"]
        evidence["mode"] = page.evaluate("""() => ({theme:document.documentElement.dataset.theme,
          dark:document.documentElement.classList.contains('dark'),
          overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth})""")
        assert evidence["mode"]["theme"] == theme and evidence["mode"]["dark"] == (theme == "dark")
        assert evidence["mode"]["overflow"] == 0
        before = ledger(page, child_id)
        assert before["unlockedCosmetics"] == [item] and item not in before["equippedCosmetics"]
        card.locator(".v6-preview-button").click()
        stage = page.locator("#shop-preview-stage")
        page.wait_for_function("id=>document.querySelector('#shop-preview-stage .avatar-renderer')?.dataset.runtimeDetail===id", arg=item)
        stage.scroll_into_view_if_needed()
        evidence["trial"] = image_proof(stage.locator(".avatar-renderer"), item, avatar, paths)
        evidence["screenshots"].append(screenshot(stage, case_dir / "trial.png"))
        verify_no_equipment_change(before, ledger(page, child_id))
        card.locator(".v6-preview-button").click()
        page.wait_for_function("id=>document.querySelector('#shop-preview-stage .avatar-renderer')?.dataset.runtimeDetail!==id", arg=item)
        after_cancel = ledger(page, child_id)
        verify_no_equipment_change(before, after_cancel)
        cancel_dom = stage.locator(".avatar-renderer").evaluate("""(e,item)=>({rendered:e.dataset.renderedItems,
          layers:e.querySelectorAll(`[data-wearable-item="${item}"]`).length})""", item)
        assert item not in (cancel_dom["rendered"] or "").split() and cancel_dom["layers"] == 0, cancel_dom
        evidence["cancel"] = {"ledgerUnchanged": True, "dom": cancel_dom,
                              "previewButton": card.locator(".v6-preview-button").inner_text()}
        evidence["screenshots"].append(screenshot(stage, case_dir / "cancel.png"))
        card.get_by_role("button", name="立即穿上").click()
        page.wait_for_function("""([key,id,item])=>{
          const p=JSON.parse(localStorage.getItem(key)||'{}')[id];
          return p?.equippedCosmetics?.includes(item) && p?.equipmentTransactions?.some(t=>t.itemId===item&&t.action==='equip');
        }""", arg=[PROGRESS_KEY, child_id, item])
        equipped = ledger(page, child_id)
        assert equipped["purchaseTransactions"] == before["purchaseTransactions"]
        assert equipped["others"] == before["others"]
        assert len(equipped["equipmentTransactions"]) == len(before["equipmentTransactions"]) + 1
        evidence["equippedLedger"] = equipped
        page.wait_for_function("id=>document.querySelector('#shop-preview-stage .avatar-renderer')?.dataset.runtimeDetail===id", arg=item)
        evidence["equippedShop"] = image_proof(stage.locator(".avatar-renderer"), item, avatar, paths)
        evidence["screenshots"].append(screenshot(stage, case_dir / "equipped-shop.png"))
        page.get_by_role("button", name="首頁", exact=True).first.click()
        page.wait_for_selector(".v4-dashboard-grid")
        home = page.locator(".v65-home-display-selector")
        home.get_by_role("button", name=re.compile(next(c["name"] for c in settings["children"] if c["id"] == child_id))).click()
        home_renderer = home.locator(f".avatar-renderer.avatar-{avatar}").first
        home_renderer.wait_for(timeout=15000)
        page.wait_for_function("([id,avatar])=>document.querySelector(`.v65-home-display-selector .avatar-renderer.avatar-${avatar}`)?.dataset.runtimeDetail===id", arg=[item, avatar], timeout=15000)
        evidence["home"] = image_proof(home_renderer, item, avatar, paths)
        evidence["screenshots"].append(screenshot(page, case_dir / "home.png"))
        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector(".v4-dashboard-grid")
        after_reload = ledger(page, child_id)
        verify_no_equipment_change(equipped, after_reload)
        evidence["reload"] = {"ledgerUnchanged": True, "homeDisplayLearnerId": page.evaluate("""() =>
          JSON.parse(localStorage.getItem('star-learning-v40:__local__:settings')||'{}').homeDisplayLearnerId""")}
        assert evidence["reload"]["homeDisplayLearnerId"] == child_id
        home_renderer = page.locator(f".v65-home-display-selector .avatar-renderer.avatar-{avatar}").first
        home_renderer.wait_for(timeout=15000)
        page.wait_for_function("([id,avatar])=>document.querySelector(`.v65-home-display-selector .avatar-renderer.avatar-${avatar}`)?.dataset.runtimeDetail===id", arg=[item, avatar], timeout=15000)
        evidence["reload"]["image"] = image_proof(home_renderer, item, avatar, paths)
        evidence["screenshots"].append(screenshot(page, case_dir / "reload-home.png"))
        page.get_by_role("button", name="成就獎勵", exact=True).first.click()
        page.locator(f"#achievement-tab-{child_id}").click()
        achievement = page.locator("#achievement-panel header .avatar-renderer")
        achievement.wait_for(timeout=15000)
        page.wait_for_function("id=>document.querySelector('#achievement-panel header .avatar-renderer')?.dataset.runtimeDetail===id", arg=item, timeout=15000)
        evidence["achievements"] = image_proof(achievement, item, avatar, paths)
        evidence["screenshots"].append(screenshot(page, case_dir / "achievements.png"))
        verify_no_equipment_change(equipped, ledger(page, child_id))
        assert not page_errors, page_errors
        assert_runtime_errors(console_errors, blocked_external, blocked, local_failures)
        evidence["consoleErrors"] = console_errors
        evidence["pageErrors"] = page_errors
        evidence["blockedApi"] = blocked
        evidence["blockedExternal"] = blocked_external
        evidence["localRequestFailures"] = local_failures
        evidence["status"] = "PASS_TECHNICAL_AWAITING_VISUAL_REVIEW"
        return evidence
    except Exception as exc:
        evidence["status"] = "FAIL"
        evidence["error"] = str(exc)
        evidence["traceback"] = traceback.format_exc()
        try:
            evidence["ledgerAtFailure"] = ledger(page, child_id)
            evidence["screenshots"].append(screenshot(page, case_dir / "failure.png", check_health=False))
        except Exception as screenshot_error:
            evidence["screenshotError"] = str(screenshot_error)
        evidence["blockedApi"] = blocked
        evidence["blockedExternal"] = blocked_external
        evidence["localRequestFailures"] = local_failures
        evidence["consoleErrors"] = console_errors
        evidence["pageErrors"] = page_errors
        return evidence
    finally:
        context.close()
        (case_dir / "evidence.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--attempt")
    parser.add_argument("--base-url", default="http://127.0.0.1:5178/")
    args = parser.parse_args()
    self_test()
    if args.self_test:
        print("PASS: 32 matrix fixture/route combinations and negative controls")
        return 0
    if not args.attempt or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{2,80}", args.attempt):
        parser.error("--attempt must be a unique 3-81 character safe identifier")
    parsed = urlsplit(args.base_url)
    if parsed.scheme != "http" or parsed.hostname not in ("127.0.0.1", "localhost") or parsed.username or parsed.password:
        parser.error("--base-url must be http://127.0.0.1 or http://localhost")
    from playwright.sync_api import sync_playwright
    out = ROOT / "qa/v652/mage-lavender-shop-flow" / args.attempt
    out.mkdir(parents=True, exist_ok=False)
    rows = []
    failure = None
    before_pins = None
    after_pins = None
    served_assets = None
    try:
        before_pins = pinned_files()
        (out / "pins-before.json").write_text(json.dumps(before_pins, indent=2) + "\n")
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            try:
                preflight = browser.new_context()
                try:
                    served_assets = verify_served_assets(preflight, args.base_url, before_pins)
                finally:
                    preflight.close()
                for item, (child_id, avatar), (width, height), theme in itertools.product(ITEMS, CHILDREN, SIZES, THEMES):
                    row = run_case(browser, args.base_url, out, item, child_id, avatar, width, height, theme)
                    rows.append(row)
                    if row["status"] == "FAIL":
                        break
            finally:
                browser.close()
        after_pins = pinned_files()
        (out / "pins-after.json").write_text(json.dumps(after_pins, indent=2) + "\n")
        if before_pins != after_pins:
            raise AssertionError("manifest/inventory/public pins drifted during run")
    except Exception as exc:
        failure = {"error": str(exc), "traceback": traceback.format_exc()}
    report = {"status": "PASS_TECHNICAL_AWAITING_VISUAL_REVIEW" if not failure and len(rows) == 32 and all(r["status"].startswith("PASS") for r in rows) else "FAIL",
              "createdAtTaipei": datetime.now(ZoneInfo("Asia/Taipei")).isoformat(),
              "scope": "two hats x four avatars x 390/1440 x light/dark; isolated local fixture only",
              "attempt": args.attempt, "baseUrl": args.base_url, "count": len(rows),
              "passed": sum(r["status"].startswith("PASS") for r in rows), "failure": failure,
              "pinsBefore": before_pins, "pinsAfter": after_pins, "servedAssets": served_assets, "rows": rows}
    (out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"status": report["status"], "passed": report["passed"], "count": len(rows), "output": str(out)}))
    return 0 if report["status"].startswith("PASS") else 1


if __name__ == "__main__":
    raise SystemExit(main())
