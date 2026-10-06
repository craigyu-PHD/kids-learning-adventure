#!/usr/bin/env python3
"""QA-only hair-nebula / hair-legend Shop candidate with isolated learner state.

This never edits src/public/manifest. A Vite JSON-module response is replaced
inside each browser context with exact reviewed QA paths. The local Shop then
runs trial/cancel, real purchase/equip, Home, reload, and Achievements.
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
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlsplit

from qa_v63_browser_seed import PROGRESS as BASE_PROGRESS, SETTINGS as BASE_SETTINGS
from qa_v65_feedback_home import route_time
from qa_v652_mage_lavender_shop_flow import (
    assert_runtime_errors, ledger, page_health, sha_file, verify_no_equipment_change,
)

ROOT = Path(__file__).resolve().parents[1]
ALLOWED_ITEMS = ("hair-nebula", "hair-legend")
ITEM = None
MAP_PATH = None
REVIEWED_MAP_SHA256 = None
MAPPING_CANONICAL_SHA256 = None
PRODUCT = None
MANIFEST_PATH = ROOT / "src/data/avatarAssetManifest.json"
CHILDREN = tuple((row["id"], row["avatar"]) for row in BASE_SETTINGS["children"])
SIZES = ((390, 844), (1440, 900))
THEMES = ("light", "dark")
SKINS = {"base", "outfit-cadet", "outfit-mecha", "outfit-ocean", "outfit-mage", "outfit-legend", "sister-bloom-outfit"}
PROGRESS_KEY = "star-learning-v40:__local__:progress"
SEED_MARKER = "__v652_hair_shop_candidate_seeded__"
SOURCE_PINS = (
    "scripts/qa_v63_browser_seed.py", "scripts/qa_v65_feedback_home.py",
    "scripts/qa_v652_mage_lavender_shop_flow.py", "scripts/test_v652_mage_lavender_shop_flow.py", "src/components/AvatarRenderer.tsx",
    "src/avatarAssetRegistry.ts", "src/useAvatarRigFrame.ts", "src/useAvatarDisplayPath.ts",
    "src/equipmentPreview.ts", "src/cosmetics.ts", "src/shopService.ts",
    "src/rewards.ts", "src/avatarShop.ts",
    "src/v4/SecondaryViews.tsx", "src/App.tsx",
)


def assert_digest(source: str, expected: str, actual: str) -> None:
    if actual != expected:
        raise AssertionError(f"stale source SHA: {source}; expected {expected}, got {actual}")


def canonical_sha(value: dict) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"),
                                      ensure_ascii=False).encode()).hexdigest()


def qa_url(path: str) -> str:
    if not re.fullmatch(r"qa/v652/[A-Za-z0-9_./-]+\.(png|webp)", path) or ".." in Path(path).parts:
        raise AssertionError(f"invalid QA source path: {path}")
    return "/" + path


def asset_url(path: str, integrated: bool) -> str:
    if integrated:
        if not path.startswith("public/assets/v6.5.2/"):
            raise AssertionError(f"invalid integrated path: {path}")
        return "/" + path.removeprefix("public/")
    return qa_url(path)


def expected_public(avatar: str, skin: str, mask: bool, overlay_path: str) -> dict:
    ext = Path(overlay_path).suffix
    if ext not in (".png", ".webp"):
        raise AssertionError("unsupported overlay source format")
    suffix = f"--detail{ext}" if skin == "base" else f"--{skin}--detail{ext}"
    mask_suffix = "--hair-visibility-mask.png" if skin == "base" else f"--{skin}--hair-visibility-mask.png"
    return {"overlay": f"public/assets/v6.5.2/runtime/{avatar}/{ITEM}{suffix}",
            "hairVisibilityMask": f"public/assets/v6.5.2/runtime-masks/{avatar}/{ITEM}{mask_suffix}" if mask else None}


def checked_mapping(mapping: dict) -> dict[tuple[str, str], dict]:
    assert MAPPING_CANONICAL_SHA256, "reviewed mapping was not loaded"
    assert_digest("in-memory reviewed mapping", MAPPING_CANONICAL_SHA256, canonical_sha(mapping))
    return validate_contract(mapping, ITEM)




def public_targets(mapping: dict) -> dict[str, str]:
    checked_mapping(mapping)
    targets = {mapping["catalog"]["proposedPublic"]: mapping["catalog"]["source"]["sha256"]}
    for row in mapping["pairs"]:
        for key in ("overlay", "hairVisibilityMask"):
            source, target = row["detail"][key], row["proposedPublic"][key]
            if source is None:
                assert target is None
                continue
            assert target and target not in targets, f"duplicate public target: {target}"
            targets[target] = source["sha256"]
    mask_count = sum(row["detail"]["hairVisibilityMask"] is not None for row in mapping["pairs"])
    assert len(targets) == 29 + mask_count
    return targets




def pin_sources(mapping: dict, manifest_path: Path, integrated: bool = False) -> dict[str, str]:
    assert MAP_PATH is not None and REVIEWED_MAP_SHA256 is not None
    assert_digest("reviewed map bytes", REVIEWED_MAP_SHA256, sha_file(MAP_PATH))
    checked_mapping(mapping)
    pins = {str(MAP_PATH.relative_to(ROOT)): REVIEWED_MAP_SHA256,
            str(manifest_path.relative_to(ROOT)): sha_file(manifest_path),
            "scripts/qa_v652_hair_shop_candidate.py": sha_file(ROOT / "scripts/qa_v652_hair_shop_candidate.py")}
    for path in SOURCE_PINS:
        pins[path] = sha_file(ROOT / path)
    for path in [*(ROOT / "src").glob("*.css"), ROOT / "package.json", ROOT / "package-lock.json", ROOT / "vite.config.ts", ROOT / "index.html"]:
        pins[str(path.relative_to(ROOT))] = sha_file(path)
    manifest = json.loads(manifest_path.read_text())
    # Pin every base delivery the renderer can select, including its fallback.
    for _, avatar in CHILDREN:
        variants = [row for row in manifest["baseDisplayVariants"] if row["avatarId"] == avatar]
        assert len(variants) == 1, "ambiguous base display binding"
        for variant in (variants[0], variants[0]["smallDisplay"]):
            digest = sha_file(ROOT / variant["path"])
            assert_digest(variant["path"], variant["sha256"], digest)
            pins[variant["path"]] = digest
        fallback = f"public/assets/v5/characters/{avatar}/wardrobe/base-body.webp"
        pins[fallback] = sha_file(ROOT / fallback)
    sources = [*mapping["nativeMasters"], mapping["catalog"]["source"],
               *mapping.get("reviewEvidence", []), *mapping["catalog"].get("reviewEvidence", [])]
    for row in mapping["pairs"]:
        sources.extend([row["source"], row["sourceMap"], *row["reviewEvidence"], row["detail"]["overlay"]])
        if row["detail"]["hairVisibilityMask"] is not None:
            sources.append(row["detail"]["hairVisibilityMask"])
    for record in sources:
        path = record["path"]
        digest = pins.get(path) or sha_file(ROOT / path)
        assert_digest(path, record["sha256"], digest)
        pins[path] = digest
        if "size" in record:
            verify_image_record(record)
    if integrated:
        for path, expected in public_targets(mapping).items():
            digest = sha_file(ROOT / path)
            assert_digest(path, expected, digest)
            pins[path] = digest
    return pins




def candidate_manifest(raw: dict, mapping: dict) -> dict:
    rows = checked_mapping(mapping)
    candidate = copy.deepcopy(raw)
    matches = [entry for entry in candidate["accessories"] if entry["id"] == ITEM]
    assert len(matches) == 1, "missing or duplicate item"
    entry = matches[0]
    assert entry.get("slot") == "hair", "manifest item is not hairstyle"
    entry["catalogPath"] = mapping["catalog"]["source"]["path"]
    entry["defaultSkinDetails"], entry["skinDetails"] = {}, {}
    for (avatar, skin), record in rows.items():
        detail = {"overlay": record["overlay"]["path"], "canvasTopPadding": record["canvasTopPadding"]}
        if record["hairVisibilityMask"] is not None:
            detail["hairVisibilityMask"] = record["hairVisibilityMask"]["path"]
        if skin == "base":
            entry["defaultSkinDetails"][avatar] = detail
        else:
            entry["skinDetails"].setdefault(avatar, {})[skin] = detail
    return candidate




def integrated_manifest(raw: dict, mapping: dict) -> dict:
    rows = checked_mapping(mapping)
    matches = [row for row in raw["accessories"] if row["id"] == ITEM]
    assert len(matches) == 1, "missing or duplicate integrated Hair item"
    entry = matches[0]
    assert entry.get("catalogPath") == mapping["catalog"]["proposedPublic"], "catalog admission drift"
    expected_base, expected_skins = {}, {}
    for (avatar, skin), detail in rows.items():
        targets = expected_public(avatar, skin, detail["hairVisibilityMask"] is not None, detail["overlay"]["path"])
        expected_detail = {"overlay": targets["overlay"], "canvasTopPadding": detail["canvasTopPadding"]}
        if targets["hairVisibilityMask"]:
            expected_detail["hairVisibilityMask"] = targets["hairVisibilityMask"]
        if skin == "base": expected_base[avatar] = expected_detail
        else: expected_skins.setdefault(avatar, {})[skin] = expected_detail
    assert entry.get("defaultSkinDetails") == expected_base, "base admission drift"
    assert entry.get("skinDetails") == expected_skins, "fullskin admission drift"
    return raw


def proposed_integrated_manifest(raw: dict, mapping: dict) -> dict:
    proposed = candidate_manifest(raw, mapping)
    entry = next(row for row in proposed["accessories"] if row["id"] == ITEM)
    entry["catalogPath"] = mapping["catalog"]["proposedPublic"]
    for row in mapping["pairs"]:
        avatar, skin = row["avatarId"], row["skinId"]
        detail = entry["defaultSkinDetails"][avatar] if skin == "base" else entry["skinDetails"][avatar][skin]
        detail["overlay"] = row["proposedPublic"]["overlay"]
        if row["proposedPublic"]["hairVisibilityMask"] is not None:
            detail["hairVisibilityMask"] = row["proposedPublic"]["hairVisibilityMask"]
    return integrated_manifest(proposed, mapping)




def fixture(theme: str, child_id: str) -> tuple[dict, dict]:
    assert PRODUCT and PRODUCT["id"] == ITEM
    if theme not in THEMES or child_id not in {child for child, _ in CHILDREN}:
        raise ValueError("invalid fixture")
    settings, progress = copy.deepcopy(BASE_SETTINGS), copy.deepcopy(BASE_PROGRESS)
    settings["theme"], settings["homeDisplayLearnerId"] = theme, child_id
    for child in progress.values():
        reward = child["rewardTransactions"][0]
        reward["xp"] = PRODUCT["fixtureXp"]
        reward["coins"] = max(reward["coins"], PRODUCT["cost"])
    return settings, progress




def seed_script(settings: dict, progress: dict) -> str:
    return f"""(() => {{
      if (localStorage.getItem({json.dumps(SEED_MARKER)}) === '1') return;
      localStorage.removeItem('star-learning-active-family-session-v40');
      localStorage.setItem('star-learning-v40:__local__:settings', JSON.stringify({json.dumps(settings, ensure_ascii=False)}));
      localStorage.setItem({json.dumps(PROGRESS_KEY)}, JSON.stringify({json.dumps(progress, ensure_ascii=False)}));
      localStorage.setItem('star-learning-v40:__local__:attendance', '{{}}');
      localStorage.setItem('star-learning-v40:__local__:reflections', '{{}}');
      sessionStorage.setItem('star-learning-v40:__local__:active-user', 'user-father');
      localStorage.setItem('little-explorers-v4-sound', 'off');
      localStorage.setItem({json.dumps(SEED_MARKER)}, '1');
    }})();"""


def self_test() -> dict:
    global ITEM, MAPPING_CANONICAL_SHA256, PRODUCT
    saved = ITEM, MAPPING_CANONICAL_SHA256, PRODUCT
    counts = {"items": 0, "mappingMutationNegatives": 0, "integratedMutationNegatives": 0,
              "structuralNegatives": 0, "isolatedFixtureConfigurations": 0}
    try:
        for item in ALLOWED_ITEMS:
            ITEM = item
            PRODUCT = load_product(item)
            mapping = engineering_mapping(item)
            MAPPING_CANONICAL_SHA256 = canonical_sha(mapping)
            assert len(checked_mapping(mapping)) == 28
            raw = {"accessories": [{"id": item, "slot": "hair", "renderer": "aligned-overlay"}]}
            candidate = candidate_manifest(raw, mapping)
            proposed = proposed_integrated_manifest(raw, mapping)
            assert "defaultSkinDetails" not in raw["accessories"][0], "candidate mutated input"
            assert len(candidate["accessories"][0]["defaultSkinDetails"]) == 4
            for child, size, theme in itertools.product(CHILDREN, SIZES, THEMES):
                settings, progress = fixture(theme, child[0])
                assert settings["homeDisplayLearnerId"] == child[0]
                assert all(not r["unlockedCosmetics"] and not r["equippedCosmetics"] for r in progress.values())
                assert all(r["rewardTransactions"][0]["xp"] >= PRODUCT["fixtureXp"] for r in progress.values())
                assert ITEM not in seed_script(settings, progress), "fixture pre-equipped selected item"
                counts["isolatedFixtureConfigurations"] += 1
            for mutation in ("wrong_avatar", "missing_layer", "swapped_item", "stale_sha", "wrong_mask", "valid_avatar_swap", "overlay_swap"):
                bad = copy.deepcopy(mapping)
                if mutation == "wrong_avatar": bad["pairs"][0]["avatarId"] = "unknown"
                if mutation == "missing_layer": bad["pairs"].pop()
                if mutation == "swapped_item": bad["itemId"] = next(i for i in ALLOWED_ITEMS if i != item)
                if mutation == "stale_sha": bad["pairs"][0]["detail"]["overlay"]["sha256"] = "0" * 64
                if mutation == "wrong_mask": bad["pairs"][0]["detail"]["hairVisibilityMask"] = copy.deepcopy(bad["pairs"][1]["detail"]["hairVisibilityMask"])
                if mutation == "valid_avatar_swap": bad["pairs"][0]["avatarId"] = CHILDREN[1][1]
                if mutation == "overlay_swap": bad["pairs"][0]["detail"]["overlay"] = copy.deepcopy(bad["pairs"][1]["detail"]["overlay"])
                try: checked_mapping(bad)
                except AssertionError: counts["mappingMutationNegatives"] += 1
                else: raise AssertionError(f"pinned map mutation admitted: {mutation}")
            for mutation in ("catalog", "base_overlay", "base_padding", "base_mask", "skin_overlay", "skin_mask", "missing_skin"):
                bad = copy.deepcopy(proposed)
                entry = bad["accessories"][0]
                if mutation == "catalog": entry["catalogPath"] += ".wrong"
                if mutation == "base_overlay": entry["defaultSkinDetails"]["brother"]["overlay"] += ".wrong"
                if mutation == "base_padding": entry["defaultSkinDetails"]["younger"]["canvasTopPadding"] ^= 256
                if mutation == "base_mask": entry["defaultSkinDetails"]["brother"]["hairVisibilityMask"] = "wrong-mask.png"
                if mutation == "skin_overlay": entry["skinDetails"]["sister"]["outfit-mage"]["overlay"] += ".wrong"
                if mutation == "skin_mask": entry["skinDetails"]["younger"]["outfit-ocean"]["hairVisibilityMask"] = "wrong-mask.png"
                if mutation == "missing_skin": entry["skinDetails"]["younger-sister"].pop("outfit-legend")
                try: integrated_manifest(bad, mapping)
                except AssertionError: counts["integratedMutationNegatives"] += 1
                else: raise AssertionError(f"integrated mutation admitted: {mutation}")
            for mutation in ("native", "padding", "review", "pending", "overlay_size", "duplicate_pair"):
                bad = copy.deepcopy(mapping)
                if mutation == "native": bad["pairs"][0]["nativeMaster"]["sha256"] = "0" * 64
                if mutation == "padding": bad["pairs"][0]["detail"]["canvasTopPadding"] = 128
                if mutation == "review": bad["pairs"][0]["reviewEvidence"] = []
                if mutation == "pending": bad["pairs"][0]["acceptanceStatus"] = "PENDING"
                if mutation == "overlay_size": bad["pairs"][0]["detail"]["overlay"]["size"] = [1024, 1]
                if mutation == "duplicate_pair": bad["pairs"][1] = copy.deepcopy(bad["pairs"][0])
                try: validate_contract(bad, item)
                except AssertionError: counts["structuralNegatives"] += 1
                else: raise AssertionError(f"structural negative admitted: {mutation}")
            counts["items"] += 1
    finally:
        ITEM, MAPPING_CANONICAL_SHA256, PRODUCT = saved
    return {"status": "PASS_ENGINEERING_SELF_TEST_ONLY", **counts,
            "artAcceptance": "NOT_TESTED", "actualProductBrowser": "NOT_RUN",
            "note": "Synthetic in-memory structural fixtures are not review evidence or admitted artwork."}




def base_candidates(manifest: dict, avatar: str) -> list[dict]:
    matches = [row for row in manifest["baseDisplayVariants"] if row["avatarId"] == avatar]
    assert len(matches) == 1, avatar
    entry = matches[0]
    return [{"path": "/" + row["path"].removeprefix("public/"),
             "width": row["width"], "height": row["height"]}
            for row in (entry["smallDisplay"], entry)]


def image_proof(renderer, avatar: str, detail: dict, manifest: dict, integrated: bool) -> dict:
    if f"avatar-{avatar}" not in renderer.get_attribute("class").split():
        raise AssertionError("wrong avatar before image proof")
    expected_overlay = asset_url(detail["overlay"]["path"], integrated)
    expected_mask = asset_url(detail["hairVisibilityMask"]["path"], integrated) if detail["hairVisibilityMask"] else None
    proof = renderer.evaluate("""async (e, expected) => {
      const deadline=performance.now()+15000;let body,layer;
      while(performance.now()<deadline){
        body=e.querySelector('.avatar-renderer-skin');layer=e.querySelector('[data-wearable-item="'+expected.item+'"]');
        if(body?.complete&&body.naturalWidth>0&&layer?.complete&&layer.naturalWidth>0)break;
        await new Promise(r=>setTimeout(r,50));
      }
      if(!body||!layer||!body.naturalWidth||!layer.naturalWidth)throw Error('image readiness timeout');
      await Promise.all([body.decode(),layer.decode()]);
      let maskSize=null;
      if(expected.mask){const mask=new Image();mask.src=expected.mask;await mask.decode();maskSize=[mask.naturalWidth,mask.naturalHeight];}
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const bs=getComputedStyle(body),ls=getComputedStyle(layer);
      const visible=(n,s)=>{const r=n.getBoundingClientRect();return s.display!=='none'&&
        s.visibility==='visible'&&Number(s.opacity)>0&&r.width>0&&r.height>0};
      return {className:e.className,skin:e.dataset.skin,detail:e.dataset.runtimeDetail,
        padding:Number(e.dataset.canvasTopPadding||0),rendered:e.dataset.renderedItems,
        itemLayerCount:e.querySelectorAll('[data-wearable-item="'+expected.item+'"]').length,
        artMode:e.dataset.artMode,bodySrc:body.getAttribute('src'),bodySize:[body.naturalWidth,body.naturalHeight],
        bodyVisible:visible(body,bs),overlayVisible:visible(layer,ls),
        clientWidth:e.clientWidth,clientHeight:e.clientHeight,dpr:devicePixelRatio,
        overlaySrc:layer.getAttribute('src'),overlaySize:[layer.naturalWidth,layer.naturalHeight],
        overlayMask:ls.maskImage,
        mask:bs.maskImage,maskMode:bs.maskMode,maskSizeCss:bs.maskSize,
        maskPosition:bs.maskPosition,maskRepeat:bs.maskRepeat,maskSize,
        overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
    }""", {"mask": expected_mask, "item": ITEM})
    assert f"avatar-{avatar}" in proof["className"].split() and proof["skin"] == "default", proof
    assert proof["detail"] == ITEM and proof["rendered"].split().count(ITEM) == 1 and proof["itemLayerCount"] == 1 and proof["artMode"] == "runtime", proof
    assert proof["padding"] == detail["canvasTopPadding"] and proof["overlaySrc"] == expected_overlay, proof
    assert proof["overlaySize"] == detail["overlay"]["size"] and proof["overlayVisible"] and proof["overlayMask"] == "none", proof
    assert proof["bodyVisible"] and proof["overflow"] <= 1, proof
    candidates = base_candidates(manifest, avatar)
    painted_width = min(proof["clientWidth"], proof["clientHeight"] * candidates[0]["width"] / candidates[0]["height"])
    required = math.ceil(painted_width * proof["dpr"] * 1.05)
    selected = next((row for row in candidates if required <= row["width"]),
                    {"path": f"/assets/v5/characters/{avatar}/wardrobe/base-body.webp", "width": 1024, "height": 1536})
    assert proof["bodySrc"] == selected["path"] and proof["bodySize"] == [selected["width"], selected["height"]], {
        "expectedBody": selected, "actual": proof}
    if expected_mask:
        assert expected_mask in proof["mask"] and proof["maskSize"] == [1024,1536], proof
        assert proof["maskMode"] == "luminance" and proof["maskSizeCss"] == "contain", proof
        assert proof["maskPosition"] in ("50% 50%","center","center center") and proof["maskRepeat"] == "no-repeat", proof
    else:
        assert proof["mask"] == "none" and proof["maskSize"] is None, proof
    return proof


def cancel_body_proof(renderer, avatar: str, manifest: dict) -> dict:
    candidates = base_candidates(manifest, avatar)
    fallback = {"path": f"/assets/v5/characters/{avatar}/wardrobe/base-body.webp", "width": 1024, "height": 1536}
    proof = renderer.evaluate("""async (e, expected) => {
      const deadline=performance.now()+15000;
      while(performance.now()<deadline){
        const body=e.querySelector('.avatar-renderer-skin');
        const painted=Math.min(e.clientWidth,e.clientHeight*expected.candidates[0].width/expected.candidates[0].height);
        const required=Math.ceil(painted*devicePixelRatio*1.05);
        const selected=expected.candidates.find(row=>required<=row.width)||expected.fallback;
        if(body?.complete&&body.naturalWidth>0&&body.getAttribute('src')===selected.path){
          await body.decode();
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          const style=getComputedStyle(body),rect=body.getBoundingClientRect();
          const visible=body.isConnected&&style.display!=='none'&&style.visibility==='visible'&&
            Number(style.opacity)>0&&rect.width>0&&rect.height>0;
          if(body===e.querySelector('.avatar-renderer-skin')&&body.complete&&body.naturalWidth>0&&visible){
            return {className:e.className,skin:e.dataset.skin,artMode:e.dataset.artMode,
              rendered:e.dataset.renderedItems,detail:e.dataset.runtimeDetail||null,
              layers:e.querySelectorAll('[data-wearable-item="'+expected.item+'"]').length,
              bodySrc:body.getAttribute('src'),bodySize:[body.naturalWidth,body.naturalHeight],
              bodyComplete:body.complete,bodyVisible:visible,bodyMask:style.maskImage,
              clientWidth:e.clientWidth,clientHeight:e.clientHeight,dpr:devicePixelRatio,
              decoded:true,twoAnimationFrames:true};
          }
        }
        await new Promise(r=>setTimeout(r,50));
      }
      throw Error('cancel default body readiness timeout');
    }""", {"candidates": candidates, "fallback": fallback, "item": ITEM})
    assert f"avatar-{avatar}" in proof["className"].split() and proof["skin"] == "default", proof
    assert proof["artMode"] == "runtime" and proof["detail"] is None, proof
    assert ITEM not in proof["rendered"].split() and proof["layers"] == 0, proof
    assert proof["bodyComplete"] and proof["bodyVisible"] and proof["bodyMask"] == "none", proof
    painted_width = min(proof["clientWidth"], proof["clientHeight"] * candidates[0]["width"] / candidates[0]["height"])
    required = math.ceil(painted_width * proof["dpr"] * 1.05)
    selected = next((row for row in candidates if required <= row["width"]), fallback)
    assert proof["bodySrc"] == selected["path"] and proof["bodySize"] == [selected["width"], selected["height"]], {
        "expectedBody": selected, "actual": proof}
    return proof


def shot(page_or_locator, path: Path) -> dict:
    page_health(getattr(page_or_locator, "page", page_or_locator))
    page_or_locator.screenshot(path=str(path), animations="disabled")
    return {"path": str(path.relative_to(ROOT)), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def runtime_detail(row: dict, integrated: bool) -> dict:
    detail = copy.deepcopy(row["detail"])
    if integrated:
        detail["overlay"]["path"] = row["proposedPublic"]["overlay"]
        if detail["hairVisibilityMask"]:
            detail["hairVisibilityMask"]["path"] = row["proposedPublic"]["hairVisibilityMask"]
    return detail


def verify_served_candidate(context, base_url: str, mapping: dict, detail: dict, pins: dict,
                            integrated: bool, avatar: str) -> list[dict]:
    from urllib.parse import urljoin
    catalog = dict(mapping["catalog"]["source"])
    if integrated: catalog["path"] = mapping["catalog"]["proposedPublic"]
    sources = [catalog, detail["overlay"]]
    if detail["hairVisibilityMask"]:
        sources.append(detail["hairVisibilityMask"])
    body_paths = [path for path in pins if path.startswith(f"public/assets/v6.4/avatar-display/{avatar}/base-body-")]
    body_paths.append(f"public/assets/v5/characters/{avatar}/wardrobe/base-body.webp")
    sources.extend({"path": path} for path in body_paths)
    evidence = []
    for source in sources:
        path = source["path"]
        expected = pins[path]
        url = urljoin(base_url, "/" + path.removeprefix("public/") if path.startswith("public/") else asset_url(path, integrated))
        response = context.request.get(url, timeout=15000, max_redirects=0)
        try:
            actual = hashlib.sha256(response.body()).hexdigest()
            assert response.status == 200, {"url": url, "status": response.status}
            assert_digest("served " + url, expected, actual)
            evidence.append({"url": url, "status": response.status, "sha256": actual})
        finally:
            response.dispose()
    return evidence


def assert_theme(page, expected: str) -> dict:
    state = page.evaluate("""() => ({theme:document.documentElement.dataset.theme,
      dark:document.documentElement.classList.contains('dark')})""")
    assert state == {"theme": expected, "dark": expected == "dark"}, state
    return state


def run_case(browser, base_url: str, out: Path, candidate: dict | None, mapping: dict, manifest: dict,
             pins: dict, integrated: bool,
             child_id: str, avatar: str, width: int, height: int, theme: str) -> dict:
    row_map = next(row for row in mapping["pairs"] if row["avatarId"] == avatar and row["skinId"] == "base")
    detail = runtime_detail(row_map, integrated)
    settings, progress = fixture(theme, child_id)
    context = browser.new_context(viewport={"width":width,"height":height},color_scheme=theme,reduced_motion="reduce")
    context.add_init_script(seed_script(settings, progress))
    module_hits, blocked_external, blocked_api, local_failures, console_errors, page_errors = [], [], [], [], [], []
    origin = urlsplit(base_url).netloc
    context.route(re.compile(r"^https?://"), lambda route: route.continue_() if urlsplit(route.request.url).netloc == origin else (blocked_external.append(route.request.url),route.abort()))
    context.route("**/api/**", lambda route: (blocked_api.append(route.request.url),route.abort()))
    context.route("**/api/time", route_time)
    context.route("**/api/server-time", route_time)
    def manifest_module(route):
        module_hits.append(route.request.url)
        route.fulfill(status=200, content_type="application/javascript", body="export default " + json.dumps(candidate, ensure_ascii=False, separators=(",",":")) + ";")
    if not integrated:
        context.route(re.compile(r"/src/data/avatarAssetManifest\.json(?:\?.*)?$"), manifest_module)
    page = context.new_page()
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("console", lambda msg: console_errors.append({"text": msg.text, "url": msg.location.get("url", "")}) if msg.type == "error" else None)
    page.on("requestfailed", lambda req: local_failures.append({"url": req.url, "failure": req.failure}) if urlsplit(req.url).netloc == origin else None)
    page.on("response", lambda resp: local_failures.append({"url": resp.url, "status": resp.status}) if urlsplit(resp.url).netloc == origin and resp.status >= 400 else None)
    case_dir = out / f"{avatar}-{width}-{theme}"
    case_dir.mkdir()
    row = {"itemId":ITEM,"product":PRODUCT,"childId":child_id,"avatar":avatar,"width":width,"theme":theme,"screenshots":[]}
    try:
        row["servedCandidate"] = verify_served_candidate(context, base_url, mapping, detail, pins, integrated, avatar)
        page.goto(base_url,wait_until="domcontentloaded",timeout=60000)
        if not integrated: assert module_hits, "candidate JSON module not intercepted"
        else: assert not module_hits, "integrated mode intercepted manifest"
        row["mode"] = assert_theme(page,theme)
        page.get_by_role("button",name="寶物商店",exact=True).first.click()
        page.locator(f"#shop-learner-tab-{child_id}").click()
        page.locator("#shop-filter-tab-hairstyle").click()
        card = page.locator(f'article[data-item-id="{ITEM}"]')
        for _ in range(63):
            if card.count(): break
            more = page.locator(".v64-load-more")
            if not more.count(): raise AssertionError("Hair catalog card unavailable")
            more.first.click()
        assert card.count(), "Hair catalog card unavailable after 63 load-more actions"
        catalog = card.locator(".v4-item-art img")
        catalog.evaluate("i=>i.decode()")
        expected_catalog = asset_url(mapping["catalog"]["proposedPublic"] if integrated else mapping["catalog"]["source"]["path"], integrated)
        assert catalog.get_attribute("src") == expected_catalog and catalog.evaluate("i=>i.naturalWidth===512&&i.naturalHeight===512")
        before = ledger(page,child_id)
        assert not before["purchaseTransactions"] and not before["equipmentTransactions"] and ITEM not in before["unlockedCosmetics"]
        card.locator(".v6-preview-button").click()
        stage = page.locator("#shop-preview-stage")
        page.wait_for_function("item=>document.querySelector('#shop-preview-stage .avatar-renderer')?.dataset.runtimeDetail===item",arg=ITEM,timeout=15000)
        row["trial"] = image_proof(stage.locator(".avatar-renderer"),avatar,detail,manifest,integrated)
        row["screenshots"].append(shot(stage,case_dir/"trial.png"))
        verify_no_equipment_change(before,ledger(page,child_id))
        card.locator(".v6-preview-button").click()
        page.wait_for_function("item=>!document.querySelector('#shop-preview-stage .avatar-renderer')?.dataset.renderedItems?.split(' ').includes(item)",arg=ITEM)
        verify_no_equipment_change(before,ledger(page,child_id))
        row["cancelDom"] = stage.locator(".avatar-renderer").evaluate('''(e,item)=>({rendered:e.dataset.renderedItems,
          layers:e.querySelectorAll('[data-wearable-item="'+item+'"]').length})''',ITEM)
        assert row["cancelDom"]["layers"] == 0
        row["cancelBody"] = cancel_body_proof(stage.locator(".avatar-renderer"),avatar,manifest)
        verify_no_equipment_change(before,ledger(page,child_id))
        row["screenshots"].append(shot(stage,case_dir/"cancel.png"))
        card.get_by_role("button",name=re.compile(fr"用 {PRODUCT['cost']} 金幣收藏")).click()
        page.wait_for_function("([key,id,item])=>JSON.parse(localStorage.getItem(key)||'{}')[id]?.purchaseTransactions?.some(t=>t.itemId===item)",arg=[PROGRESS_KEY,child_id,ITEM])
        bought = ledger(page,child_id)
        assert bought["others"] == before["others"] and bought["equipmentTransactions"] == before["equipmentTransactions"]
        assert len(bought["purchaseTransactions"]) == 1 and bought["purchaseTransactions"][0]["id"] == f"shop-purchase:{child_id}:{ITEM}"
        assert bought["purchaseTransactions"][0]["cost"] == PRODUCT["cost"] and bought["purchaseTransactions"][0]["source"] == "purchase"
        assert ITEM in bought["unlockedCosmetics"] and ITEM not in bought["equippedCosmetics"]
        row["purchaseLedger"] = bought
        card.get_by_role("button",name="立即穿上").click()
        page.wait_for_function("([key,id,item])=>JSON.parse(localStorage.getItem(key)||'{}')[id]?.equippedCosmetics?.includes(item)",arg=[PROGRESS_KEY,child_id,ITEM])
        equipped = ledger(page,child_id)
        assert equipped["others"] == before["others"] and equipped["purchaseTransactions"] == bought["purchaseTransactions"]
        assert len(equipped["equipmentTransactions"]) == 1 and equipped["equipmentTransactions"][0]["action"] == "equip"
        assert equipped["equipmentTransactions"][0]["itemId"] == ITEM and equipped["equipmentTransactions"][0]["childId"] == child_id
        assert equipped["equipmentTransactions"][0]["slot"] == "hair"
        row["equipLedger"] = equipped
        page.wait_for_function("item=>document.querySelector('#shop-preview-stage .avatar-renderer')?.dataset.runtimeDetail===item",arg=ITEM)
        row["shopEquipped"] = image_proof(stage.locator(".avatar-renderer"),avatar,detail,manifest,integrated)
        row["screenshots"].append(shot(stage,case_dir/"equipped-shop.png"))
        page.get_by_role("button",name="首頁",exact=True).first.click()
        page.wait_for_selector(".v4-dashboard-grid")
        home = page.locator(f".v65-home-display-selector .avatar-renderer.avatar-{avatar}").first
        home.wait_for(timeout=15000)
        page.wait_for_function("([avatar,item])=>document.querySelector(`.v65-home-display-selector .avatar-renderer.avatar-${avatar}`)?.dataset.runtimeDetail===item",arg=[avatar,ITEM],timeout=15000)
        row["home"] = image_proof(home,avatar,detail,manifest,integrated)
        row["screenshots"].append(shot(page,case_dir/"home.png"))
        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector(".v4-dashboard-grid")
        row["reloadMode"] = assert_theme(page,theme)
        verify_no_equipment_change(equipped,ledger(page,child_id))
        home = page.locator(f".v65-home-display-selector .avatar-renderer.avatar-{avatar}").first
        home.wait_for(timeout=15000)
        page.wait_for_function("([avatar,item])=>document.querySelector(`.v65-home-display-selector .avatar-renderer.avatar-${avatar}`)?.dataset.runtimeDetail===item",arg=[avatar,ITEM],timeout=15000)
        row["reloadHome"] = image_proof(home,avatar,detail,manifest,integrated)
        row["screenshots"].append(shot(page,case_dir/"reload-home.png"))
        page.get_by_role("button",name="成就獎勵",exact=True).first.click()
        page.locator(f"#achievement-tab-{child_id}").click()
        achievement = page.locator("#achievement-panel header .avatar-renderer")
        page.wait_for_function("item=>document.querySelector('#achievement-panel header .avatar-renderer')?.dataset.runtimeDetail===item",arg=ITEM,timeout=15000)
        row["achievements"] = image_proof(achievement,avatar,detail,manifest,integrated)
        row["screenshots"].append(shot(page,case_dir/"achievements.png"))
        verify_no_equipment_change(equipped,ledger(page,child_id))
        assert not page_errors, page_errors
        assert_runtime_errors(console_errors,blocked_external,blocked_api,local_failures)
        row.update(status="PASS_TECHNICAL_AWAITING_VISUAL_REVIEW",moduleHits=module_hits,
                   blockedExternal=blocked_external,blockedApi=blocked_api,localFailures=local_failures,
                   consoleErrors=console_errors,pageErrors=page_errors)
    except Exception as exc:
        row.update(status="FAIL",error=str(exc),traceback=traceback.format_exc(),moduleHits=module_hits,
                   blockedExternal=blocked_external,blockedApi=blocked_api,localFailures=local_failures,
                   consoleErrors=console_errors,pageErrors=page_errors)
        try: row["screenshots"].append(shot(page,case_dir/"failure.png"))
        except Exception: pass
    finally:
        context.close()
        (case_dir/"evidence.json").write_text(json.dumps(row,ensure_ascii=False,indent=2)+"\n")
    return row


def main() -> int:
    global ITEM, MAP_PATH, REVIEWED_MAP_SHA256, MAPPING_CANONICAL_SHA256, PRODUCT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--item", choices=ALLOWED_ITEMS)
    parser.add_argument("--mapping", help="reviewed repository-relative integration map")
    parser.add_argument("--expected-map-sha", help="SHA-256 of the exact mapping file bytes")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--controls", action="store_true", help="run existing real-browser overflow/decode/stale-byte/redirect controls only")
    parser.add_argument("--integrated", action="store_true")
    parser.add_argument("--attempt")
    parser.add_argument("--base-url", default="http://127.0.0.1:5178/")
    args = parser.parse_args()
    if args.self_test:
        print(json.dumps(self_test(), ensure_ascii=False))
        return 0
    if args.controls:
        return subprocess.run([sys.executable, "scripts/test_v652_mage_lavender_shop_flow.py", "BrowserAndHTTPControls"], cwd=ROOT).returncode
    if not args.item or not args.mapping or not re.fullmatch(r"[0-9a-f]{64}", args.expected_map_sha or ""):
        parser.error("--item, --mapping and exact --expected-map-sha required")
    ITEM = args.item
    MAP_PATH = (ROOT / args.mapping).resolve()
    if not MAP_PATH.is_relative_to(ROOT / "qa/v652") or MAP_PATH.suffix != ".json":
        parser.error("mapping must be a JSON file under qa/v652")
    REVIEWED_MAP_SHA256 = args.expected_map_sha
    assert_digest("mapping file", REVIEWED_MAP_SHA256, sha_file(MAP_PATH))
    mapping = json.loads(MAP_PATH.read_text())
    MAPPING_CANONICAL_SHA256 = canonical_sha(mapping)
    checked_mapping(mapping)
    PRODUCT = load_product(ITEM)
    manifest = json.loads(MANIFEST_PATH.read_text())
    candidate = None if args.integrated else candidate_manifest(manifest, mapping)
    if args.integrated: integrated_manifest(manifest, mapping)
    # Decode and SHA every image/review before creating a browser or output attempt.
    pins_before = pin_sources(mapping, MANIFEST_PATH, args.integrated)
    if not args.attempt or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{2,80}", args.attempt):
        parser.error("unique safe --attempt required")
    parsed = urlsplit(args.base_url)
    if parsed.scheme != "http" or parsed.hostname not in ("127.0.0.1", "localhost") or parsed.username or parsed.password:
        parser.error("local HTTP base URL required")
    from playwright.sync_api import sync_playwright
    out = ROOT / ("qa/v652/hair-shop-integrated" if args.integrated else "qa/v652/hair-shop-candidate") / ITEM / args.attempt
    out.mkdir(parents=True, exist_ok=False)
    report = {"status": "RUNNING", "itemId": ITEM, "product": PRODUCT, "attempt": args.attempt,
              "mode": "integrated" if args.integrated else "candidate", "rows": [], "pinsBefore": pins_before,
              "mappingFileSha256": REVIEWED_MAP_SHA256, "mappingCanonicalSha256": MAPPING_CANONICAL_SHA256,
              "scope": "28 admitted role/skin bindings; 16 base-body Shop ledger/Home/reload/Achievements cases. Fullskin browser visual QA remains separate."}
    try:
        if candidate is not None:
            (out / "candidate-manifest.sha256").write_text(canonical_sha(candidate) + "\n")
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            try:
                for (child_id, avatar), (width, height), theme in itertools.product(CHILDREN, SIZES, THEMES):
                    row = run_case(browser, args.base_url, out, candidate, mapping, manifest, pins_before,
                                   args.integrated, child_id, avatar, width, height, theme)
                    report["rows"].append(row)
                    if row["status"] == "FAIL": break
            finally:
                browser.close()
        assert len(report["rows"]) == 16 and all(row["status"].startswith("PASS") for row in report["rows"])
        report["status"] = "PASS_TECHNICAL_AWAITING_VISUAL_REVIEW"
    except Exception as exc:
        report.update(status="FAIL", error=str(exc), traceback=traceback.format_exc())
    finally:
        try:
            report["pinsAfter"] = pin_sources(mapping, MANIFEST_PATH, args.integrated)
            assert pins_before == report["pinsAfter"], "source/runtime/review drift"
        except Exception as exc:
            report.update(status="FAIL", pinError=str(exc))
        (out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"status": report["status"], "itemId": ITEM, "cases": len(report["rows"]), "output": str(out)}))
    return 0 if report["status"].startswith("PASS") else 1




def safe_record(record: dict, *, image: bool = False, qa_only: bool = False) -> None:
    if not isinstance(record, dict):
        raise AssertionError("file record required")
    path = record.get("path", "")
    allowed = ("qa/v652/",) if qa_only else ("qa/v652/", "public/assets/")
    assert isinstance(path, str) and path.startswith(allowed), f"out-of-scope source: {path}"
    assert not Path(path).is_absolute() and ".." not in Path(path).parts
    assert (ROOT / path).resolve().is_relative_to(ROOT.resolve()), "source escapes repository"
    assert re.fullmatch(r"[0-9a-f]{64}", record.get("sha256", "")), "invalid source SHA"
    if image:
        assert Path(path).suffix in (".png", ".webp"), "unsupported source image"
        assert record.get("format") in ("PNG", "WEBP"), "image format required"
        size = record.get("size")
        assert isinstance(size, list) and len(size) == 2 and all(type(n) is int and n > 0 for n in size)



def verify_image_record(record: dict) -> None:
    from PIL import Image
    assert_digest(record["path"], record["sha256"], sha_file(ROOT / record["path"]))
    with Image.open(ROOT / record["path"]) as image:
        image.load()
        assert list(image.size) == record["size"] and image.format == record["format"], f"decode mismatch: {record['path']}"


def validate_contract(mapping: dict, item: str) -> dict[tuple[str, str], dict]:
    """Structural admission; the caller separately enforces the reviewed file pin."""
    assert item in ALLOWED_ITEMS and mapping.get("itemId") == item, "item identity drift"
    assert ITEM == item, "configured item mismatch"
    pairs = mapping.get("pairs", [])
    expected = {(avatar, skin) for _, avatar in CHILDREN for skin in SKINS}
    keys = [(r["avatarId"], r["skinId"]) for r in pairs]
    assert len(keys) == 28 and len(set(keys)) == 28 and set(keys) == expected, "exact 4 x 7 coverage required"
    masters = mapping.get("nativeMasters")
    assert isinstance(masters, list) and masters, "nativeMasters required"
    master_bindings = set()
    for master in masters:
        safe_record(master, image=True, qa_only=True)
        binding = (master["path"], master["sha256"])
        assert binding not in master_bindings, "duplicate native master"
        master_bindings.add(binding)
    admitted = {}
    for row in pairs:
        avatar, skin = row["avatarId"], row["skinId"]
        assert row.get("itemId", item) == item, "mixed item row"
        assert row.get("acceptanceStatus") == "ACCEPTED", f"pending acceptance: {avatar}/{skin}"
        native = row.get("nativeMaster")
        safe_record(native, qa_only=True)
        assert (native["path"], native["sha256"]) in master_bindings, "unbound native master"
        safe_record(row["source"], image=True)
        safe_record(row["sourceMap"], qa_only=True)
        reviews = row.get("reviewEvidence")
        assert isinstance(reviews, list) and reviews, "review evidence required"
        for review in reviews:
            safe_record(review, qa_only=True)
        detail = row["detail"]
        assert set(detail) == {"overlay", "hairVisibilityMask", "canvasTopPadding"}, "unexpected detail fields"
        padding = detail["canvasTopPadding"]
        assert type(padding) is int and padding in (0, 256), "invalid row padding"
        safe_record(detail["overlay"], image=True, qa_only=True)
        assert detail["overlay"]["size"] == [1024, 1536 + padding], "overlay/padding dimensions disagree"
        mask = detail["hairVisibilityMask"]
        if mask is not None:
            safe_record(mask, image=True, qa_only=True)
            assert mask["size"] == [1024, 1536] and mask["format"] == "PNG", "mask dimensions/format"
        assert row["proposedPublic"] == expected_public(avatar, skin, mask is not None, detail["overlay"]["path"]), "public target drift"
        admitted[(avatar, skin)] = detail
    catalog = mapping["catalog"]
    safe_record(catalog["source"], image=True, qa_only=True)
    for container in (mapping, catalog):
        reviews = container.get("reviewEvidence", [])
        assert isinstance(reviews, list), "reviewEvidence must be a list"
        for review in reviews:
            safe_record(review, qa_only=True)
    assert catalog["source"]["size"] == [512, 512] and catalog["source"]["format"] == "WEBP", "catalog must be 512 WebP"
    assert catalog["proposedPublic"] == f"public/assets/v6.5.2/catalog/hairstyles/{item}.webp", "catalog item drift"
    return admitted



def load_product(item: str) -> dict:
    assert item in ALLOWED_ITEMS
    code = """import {cosmetics} from './src/cosmetics.ts';
      import {levelFromXp} from './src/rewards.ts';
      const matches=cosmetics.filter(x=>x.id===process.argv[1]);
      if(matches.length!==1)throw Error('ambiguous cosmetic');
      const product=matches[0];let fixtureXp=1500;
      while(levelFromXp(fixtureXp)<product.unlockLevel&&fixtureXp<100000)fixtureXp++;
      if(levelFromXp(fixtureXp)<product.unlockLevel)throw Error('unreachable level');
      console.log(JSON.stringify({...product,fixtureXp,fixtureLevel:levelFromXp(fixtureXp)}));"""
    result = subprocess.run(["node", "--import", "tsx", "--input-type=module", "-e", code, item],
                            cwd=ROOT, text=True, capture_output=True, timeout=20, check=True)
    product = json.loads(result.stdout)
    assert product["id"] == item and product["slot"] == "hairstyle"
    assert type(product["cost"]) is int and product["cost"] > 0
    return product



def engineering_mapping(item: str) -> dict:
    """In-memory structural fixture only; never an accepted art artifact."""
    def image_record(name, size, fmt="PNG"):
        return {"path": f"qa/v652/__engineering_fixture__/{name}",
                "sha256": hashlib.sha256(name.encode()).hexdigest(), "size": size, "format": fmt}
    masters = [image_record(f"{item}-native-{i}.png", [1600, 900]) for i in (0, 1)]
    pairs = []
    for index, (avatar, skin) in enumerate(itertools.product([a for _, a in CHILDREN], sorted(SKINS))):
        padding = (index % 2) * 256
        overlay = image_record(f"{item}-{avatar}-{skin}-overlay.png", [1024, 1536 + padding])
        mask = image_record(f"{item}-{avatar}-{skin}-mask.png", [1024, 1536]) if index % 3 else None
        source = image_record(f"{avatar}-{skin}-body.webp", [1024, 1536], "WEBP")
        source_map = {"path": f"qa/v652/__engineering_fixture__/{item}-{avatar}-{skin}-map.json", "sha256": "a" * 64}
        pairs.append({"avatarId": avatar, "skinId": skin, "itemId": item, "acceptanceStatus": "ACCEPTED",
                      "nativeMaster": {key: masters[index % 2][key] for key in ("path", "sha256")},
                      "source": source, "sourceMap": source_map,
                      "reviewEvidence": [{"path": "qa/v652/__engineering_fixture__/review.md", "sha256": "b" * 64}],
                      "detail": {"overlay": overlay, "hairVisibilityMask": mask, "canvasTopPadding": padding},
                      "proposedPublic": expected_public(avatar, skin, mask is not None, overlay["path"])})
    return {"itemId": item, "nativeMasters": masters, "pairs": pairs,
            "catalog": {"source": image_record(f"{item}-catalog.webp", [512, 512], "WEBP"),
                        "proposedPublic": f"public/assets/v6.5.2/catalog/hairstyles/{item}.webp"}}



if __name__ == "__main__":
    raise SystemExit(main())
