#!/usr/bin/env python3
"""QA-only Cloud Shop candidate: in-memory manifest, isolated local learner state.

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
from pathlib import Path
from urllib.parse import urlsplit

from qa_v63_browser_seed import PROGRESS as BASE_PROGRESS, SETTINGS as BASE_SETTINGS
from qa_v65_feedback_home import route_time
from qa_v652_mage_lavender_shop_flow import (
    assert_runtime_errors, ledger, page_health, sha_file, verify_no_equipment_change,
)

ROOT = Path(__file__).resolve().parents[1]
ITEM = "hair-cloud"
MAP_PATH = ROOT / "qa/v652/root/cloud-activation-20260926/integration-map.json"
MANIFEST_PATH = ROOT / "src/data/avatarAssetManifest.json"
CHILDREN = tuple((row["id"], row["avatar"]) for row in BASE_SETTINGS["children"])
SIZES = ((390, 844), (1440, 900))
THEMES = ("light", "dark")
SKINS = {"base", "outfit-cadet", "outfit-mecha", "outfit-ocean", "outfit-mage", "outfit-legend", "sister-bloom-outfit"}
PROGRESS_KEY = "star-learning-v40:__local__:progress"
SEED_MARKER = "__v652_cloud_shop_candidate_seeded__"
REVIEWED_MAP_SHA256 = "0f10a7fdee5fb9ca6be97ccf58d8932f089d4c596be9300be2635bcb5dfdb44f"
LEGACY_ENTRY_SHA256 = "ccae88f40efa94a063b49456998dbd395d64d3aa33a44cd3f832c2f5de429fa4"
SOURCE_PINS = (
    "scripts/qa_v63_browser_seed.py", "scripts/qa_v65_feedback_home.py",
    "scripts/qa_v652_mage_lavender_shop_flow.py", "src/components/AvatarRenderer.tsx",
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
    assert_digest("reviewed Cloud integration map", REVIEWED_MAP_SHA256, canonical_sha(mapping))
    if mapping.get("itemId") != ITEM or len(mapping.get("pairs", [])) != 28:
        raise AssertionError("Cloud mapping identity/count drift")
    expected = {(avatar, skin) for _, avatar in CHILDREN for skin in SKINS}
    keys = [(row["avatarId"], row["skinId"]) for row in mapping["pairs"]]
    if len(set(keys)) != 28 or set(keys) != expected:
        raise AssertionError("missing or duplicate avatar/skin pair")
    admitted = {}
    for row in mapping["pairs"]:
        avatar, skin = row["avatarId"], row["skinId"]
        if row.get("acceptanceStatus") != "ACCEPTED":
            raise AssertionError(f"pending acceptance: {avatar}/{skin}")
        detail = row["detail"]
        mask = detail["hairVisibilityMask"]
        padding = 0
        if detail["canvasTopPadding"] != padding:
            raise AssertionError(f"padding drift: {avatar}/{skin}")
        if row["proposedPublic"] != expected_public(avatar, skin, mask is not None, detail["overlay"]["path"]):
            raise AssertionError(f"public target drift: {avatar}/{skin}")
        if mask is None and avatar != "brother" or mask is not None and avatar == "brother":
            raise AssertionError(f"wrong nullable mask: {avatar}/{skin}")
        if detail["overlay"]["size"] != [1024, 1536]:
            raise AssertionError(f"overlay dimensions: {avatar}/{skin}")
        if mask and mask["size"] != [1024, 1536]:
            raise AssertionError(f"mask dimensions: {avatar}/{skin}")
        for source in (detail["overlay"], mask):
            if source:
                qa_url(source["path"])
                if not re.fullmatch(r"[0-9a-f]{64}", source["sha256"]):
                    raise AssertionError("invalid source SHA")
        admitted[(avatar, skin)] = detail
    cat = mapping["catalog"]
    if cat["proposedPublic"] != f"public/assets/v6.5.2/catalog/hairstyles/{ITEM}.webp":
        raise AssertionError("catalog target drift")
    if cat["source"]["size"] != [512, 512]:
        raise AssertionError("catalog dimensions")
    qa_url(cat["source"]["path"])
    return admitted


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
    assert len(targets) == 50, f"expected 28 overlays + 21 masks + catalog; got {len(targets)}"
    return targets


def pin_sources(mapping: dict, manifest_path: Path, integrated: bool = False) -> dict[str, str]:
    pins = {str(MAP_PATH.relative_to(ROOT)): sha_file(MAP_PATH),
            str(manifest_path.relative_to(ROOT)): sha_file(manifest_path),
            "scripts/qa_v652_cloud_shop_candidate.py": sha_file(ROOT / "scripts/qa_v652_cloud_shop_candidate.py")}
    checked_mapping(mapping)
    for path in SOURCE_PINS:
        pins[path] = sha_file(ROOT / path)
    sources = [mapping["nativeMaster"], mapping["catalog"]["source"]]
    for row in mapping["pairs"]:
        sources.append(row["source"])
        sources.append(row["detail"]["overlay"])
        if row["detail"]["hairVisibilityMask"]:
            sources.append(row["detail"]["hairVisibilityMask"])
    for source in sources:
        path = source["path"]
        if path in pins:
            assert_digest(path, source["sha256"], pins[path])
            continue
        digest = sha_file(ROOT / path)
        assert_digest(path, source["sha256"], digest)
        pins[path] = digest
    if integrated:
        for path, expected in public_targets(mapping).items():
            actual = sha_file(ROOT / path)
            assert_digest(path, expected, actual)
            pins[path] = actual
    return pins


def candidate_manifest(raw: dict, mapping: dict) -> dict:
    rows = checked_mapping(mapping)
    candidate = copy.deepcopy(raw)
    matches = [row for row in candidate["accessories"] if row["id"] == ITEM]
    if len(matches) != 1:
        raise AssertionError("missing or duplicate Cloud item")
    entry = matches[0]
    assert_digest("legacy Cloud manifest entry", LEGACY_ENTRY_SHA256, canonical_sha(entry))
    entry["catalogPath"] = mapping["catalog"]["source"]["path"]
    entry["defaultSkinDetails"] = {}
    entry["skinDetails"] = {}
    for (avatar, skin), record in rows.items():
        detail = {"overlay": record["overlay"]["path"], "canvasTopPadding": record["canvasTopPadding"]}
        if record["hairVisibilityMask"]:
            detail["hairVisibilityMask"] = record["hairVisibilityMask"]["path"]
        if skin == "base":
            entry["defaultSkinDetails"][avatar] = detail
        else:
            entry["skinDetails"].setdefault(avatar, {})[skin] = detail
    return candidate


def integrated_manifest(raw: dict, mapping: dict) -> dict:
    rows = checked_mapping(mapping)
    matches = [row for row in raw["accessories"] if row["id"] == ITEM]
    assert len(matches) == 1, "missing or duplicate integrated Cloud item"
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
    baseline = copy.deepcopy(raw)
    entry = next(row for row in baseline["accessories"] if row["id"] == ITEM)
    if canonical_sha(entry) != LEGACY_ENTRY_SHA256:
        return integrated_manifest(raw, mapping)
    proposed = candidate_manifest(baseline, mapping)
    entry = next(row for row in proposed["accessories"] if row["id"] == ITEM)
    entry["catalogPath"] = mapping["catalog"]["proposedPublic"]
    for avatar, detail in entry["defaultSkinDetails"].items():
        targets = expected_public(avatar, "base", avatar != "brother", detail["overlay"])
        detail["overlay"] = targets["overlay"]
        if targets["hairVisibilityMask"]: detail["hairVisibilityMask"] = targets["hairVisibilityMask"]
    for avatar, skins in entry["skinDetails"].items():
        for skin, detail in skins.items():
            targets = expected_public(avatar, skin, avatar != "brother", detail["overlay"])
            detail["overlay"] = targets["overlay"]
            if targets["hairVisibilityMask"]: detail["hairVisibilityMask"] = targets["hairVisibilityMask"]
    return integrated_manifest(proposed, mapping)


def fixture(theme: str, child_id: str) -> tuple[dict, dict]:
    if theme not in THEMES or child_id not in {c for c, _ in CHILDREN}:
        raise ValueError("invalid fixture")
    settings, progress = copy.deepcopy(BASE_SETTINGS), copy.deepcopy(BASE_PROGRESS)
    settings["theme"] = theme
    settings["homeDisplayLearnerId"] = child_id
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


def self_test(raw: dict, mapping: dict) -> None:
    cases = list(itertools.product(CHILDREN, SIZES, THEMES))
    assert len(cases) == 16
    pending = [row for row in mapping["pairs"] if row.get("acceptanceStatus") != "ACCEPTED"]
    if pending:
        assert_digest("pinned pending Cloud map", REVIEWED_MAP_SHA256, canonical_sha(mapping))
        for gate in (lambda: checked_mapping(mapping), lambda: candidate_manifest(raw, mapping),
                     lambda: integrated_manifest(raw, mapping), lambda: public_targets(mapping),
                     lambda: pin_sources(mapping, MANIFEST_PATH)):
            try: gate()
            except AssertionError as error:
                assert "pending acceptance:" in str(error), str(error)
            else: raise AssertionError("pending map admitted")
        for mutation in ("wrong_avatar", "missing_layer", "swapped_item", "stale_sha", "wrong_mask", "overlay_swap", "forged_acceptance"):
            bad = copy.deepcopy(mapping)
            if mutation == "wrong_avatar": bad["pairs"][0]["avatarId"] = "unknown"
            if mutation == "missing_layer": bad["pairs"].pop()
            if mutation == "swapped_item": bad["itemId"] = "hat-mage"
            if mutation == "stale_sha":
                source = bad["pairs"][0]["detail"]["overlay"]
                try: assert_digest(source["path"], "0" * 64, sha_file(ROOT/source["path"]))
                except AssertionError: pass
                else: raise AssertionError("stale source SHA admitted")
                source["sha256"] = "0" * 64
            if mutation == "wrong_mask": bad["pairs"][0]["detail"]["hairVisibilityMask"] = {"path":"qa/v652/wrong.png","size":[1024,1536],"sha256":"0"*64}
            if mutation == "overlay_swap": bad["pairs"][0]["detail"]["overlay"] = copy.deepcopy(bad["pairs"][1]["detail"]["overlay"])
            if mutation == "forged_acceptance":
                for row in bad["pairs"]: row["acceptanceStatus"] = "ACCEPTED"
            try: checked_mapping(bad)
            except AssertionError as error: assert "stale source SHA" in str(error)
            else: raise AssertionError(f"negative admitted: {mutation}")
        for (child_id, _), _, theme in cases:
            settings, progress = fixture(theme, child_id)
            assert settings["homeDisplayLearnerId"] == child_id
            assert all(ITEM not in row["unlockedCosmetics"] for row in progress.values())
        print(f"PASS: {len(pending)} pending rows rejected by five admission gates; seven mutation negatives; 16 isolated fixture configurations. No browser run.")
        return
    assert len(checked_mapping(mapping)) == 28
    candidate = proposed_integrated_manifest(raw, mapping)
    entry = next(row for row in candidate["accessories"] if row["id"] == ITEM)
    assert len(entry["defaultSkinDetails"]) == 4 and sum(map(len, entry["skinDetails"].values())) == 24
    assert len(public_targets(mapping)) == 50
    for (child_id, avatar), (width, height), theme in cases:
        assert (width, height) in SIZES
        settings, progress = fixture(theme, child_id)
        assert settings["homeDisplayLearnerId"] == child_id
        assert all(ITEM not in row["unlockedCosmetics"] for row in progress.values())
        assert SEED_MARKER in seed_script(settings, progress)
        assert entry["defaultSkinDetails"][avatar]["canvasTopPadding"] == 0
    for mutation in ("catalog", "base_overlay", "base_padding", "base_mask", "skin_overlay", "skin_mask", "missing_skin"):
        bad = copy.deepcopy(candidate)
        item = next(row for row in bad["accessories"] if row["id"] == ITEM)
        if mutation == "catalog": item["catalogPath"] = "public/assets/v6.5.2/catalog/hats/hat-mage.webp"
        if mutation == "base_overlay": item["defaultSkinDetails"]["brother"]["overlay"] = "public/assets/v6.5.2/runtime/sister/hair-cloud--detail.png"
        if mutation == "base_padding": item["defaultSkinDetails"]["younger"]["canvasTopPadding"] = 256
        if mutation == "base_mask": item["defaultSkinDetails"]["brother"]["hairVisibilityMask"] = "public/assets/v6.5.2/runtime-masks/brother/hair-cloud--hair-visibility-mask.png"
        if mutation == "skin_overlay": item["skinDetails"]["sister"]["outfit-mage"]["overlay"] = item["skinDetails"]["brother"]["outfit-mage"]["overlay"]
        if mutation == "skin_mask": item["skinDetails"]["younger"]["outfit-ocean"].pop("hairVisibilityMask")
        if mutation == "missing_skin": item["skinDetails"]["younger-sister"].pop("outfit-legend")
        try: integrated_manifest(bad, mapping)
        except AssertionError: pass
        else: raise AssertionError(f"integrated negative admitted: {mutation}")
    for mutation in ("wrong_avatar", "missing_layer", "swapped_item", "stale_sha", "wrong_mask", "valid_avatar_swap", "overlay_swap"):
        bad = copy.deepcopy(mapping)
        if mutation == "wrong_avatar": bad["pairs"][0]["avatarId"] = "unknown"
        if mutation == "missing_layer": bad["pairs"].pop()
        if mutation == "swapped_item": bad["itemId"] = "hat-mage"
        if mutation == "stale_sha":
            source = bad["pairs"][0]["detail"]["overlay"]
            bad_digest = "0" * 64 if source["sha256"] != "0" * 64 else "1" * 64
            assert re.fullmatch(r"[0-9a-f]{64}", bad_digest)
            try: assert_digest(source["path"], bad_digest, sha_file(ROOT / source["path"]))
            except AssertionError: pass
            else: raise AssertionError("valid-format stale source SHA admitted")
            source["sha256"] = bad_digest
        if mutation == "wrong_mask": bad["pairs"][0]["detail"]["hairVisibilityMask"] = {"path":"qa/v652/wrong.png","size":[1024,1536],"sha256":"0"*64}
        if mutation == "valid_avatar_swap":
            bad["pairs"][0]["avatarId"], bad["pairs"][1]["avatarId"] = bad["pairs"][1]["avatarId"], bad["pairs"][0]["avatarId"]
        if mutation == "overlay_swap":
            bad["pairs"][0]["detail"]["overlay"] = copy.deepcopy(bad["pairs"][1]["detail"]["overlay"])
        try:
            checked_mapping(bad)
        except (AssertionError, ValueError):
            pass
        else:
            raise AssertionError(f"negative admitted: {mutation}")


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
        body=e.querySelector('.avatar-renderer-skin');layer=e.querySelector('[data-wearable-item="hair-cloud"]');
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
        artMode:e.dataset.artMode,bodySrc:body.getAttribute('src'),bodySize:[body.naturalWidth,body.naturalHeight],
        bodyVisible:visible(body,bs),overlayVisible:visible(layer,ls),
        clientWidth:e.clientWidth,clientHeight:e.clientHeight,dpr:devicePixelRatio,
        overlaySrc:layer.getAttribute('src'),overlaySize:[layer.naturalWidth,layer.naturalHeight],
        overlayMask:ls.maskImage,
        mask:bs.maskImage,maskMode:bs.maskMode,maskSizeCss:bs.maskSize,
        maskPosition:bs.maskPosition,maskRepeat:bs.maskRepeat,maskSize,
        overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
    }""", {"mask": expected_mask})
    assert f"avatar-{avatar}" in proof["className"].split() and proof["skin"] == "default", proof
    assert proof["detail"] == ITEM and ITEM in proof["rendered"].split() and proof["artMode"] == "runtime", proof
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
              layers:e.querySelectorAll('[data-wearable-item="hair-cloud"]').length,
              bodySrc:body.getAttribute('src'),bodySize:[body.naturalWidth,body.naturalHeight],
              bodyComplete:body.complete,bodyVisible:visible,bodyMask:style.maskImage,
              clientWidth:e.clientWidth,clientHeight:e.clientHeight,dpr:devicePixelRatio,
              decoded:true,twoAnimationFrames:true};
          }
        }
        await new Promise(r=>setTimeout(r,50));
      }
      throw Error('cancel default body readiness timeout');
    }""", {"candidates": candidates, "fallback": fallback})
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
                            integrated: bool) -> list[dict]:
    from urllib.parse import urljoin
    catalog = dict(mapping["catalog"]["source"])
    if integrated: catalog["path"] = mapping["catalog"]["proposedPublic"]
    sources = [catalog, detail["overlay"]]
    if detail["hairVisibilityMask"]:
        sources.append(detail["hairVisibilityMask"])
    evidence = []
    for source in sources:
        path = source["path"]
        expected = pins[path]
        url = urljoin(base_url, asset_url(path, integrated))
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
    row = {"childId":child_id,"avatar":avatar,"width":width,"theme":theme,"screenshots":[]}
    try:
        row["servedCandidate"] = verify_served_candidate(context, base_url, mapping, detail, pins, integrated)
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
            if not more.count(): raise AssertionError("Cloud catalog card unavailable")
            more.first.click()
        assert card.count(), "Cloud catalog card unavailable after 63 load-more actions"
        catalog = card.locator(".v4-item-art img")
        catalog.evaluate("i=>i.decode()")
        expected_catalog = asset_url(mapping["catalog"]["proposedPublic"] if integrated else mapping["catalog"]["source"]["path"], integrated)
        assert catalog.get_attribute("src") == expected_catalog and catalog.evaluate("i=>i.naturalWidth===512&&i.naturalHeight===512")
        before = ledger(page,child_id)
        assert not before["purchaseTransactions"] and not before["equipmentTransactions"] and ITEM not in before["unlockedCosmetics"]
        card.locator(".v6-preview-button").click()
        stage = page.locator("#shop-preview-stage")
        page.wait_for_function("()=>document.querySelector('#shop-preview-stage .avatar-renderer')?.dataset.runtimeDetail==='hair-cloud'",timeout=15000)
        row["trial"] = image_proof(stage.locator(".avatar-renderer"),avatar,detail,manifest,integrated)
        row["screenshots"].append(shot(stage,case_dir/"trial.png"))
        verify_no_equipment_change(before,ledger(page,child_id))
        card.locator(".v6-preview-button").click()
        page.wait_for_function("()=>!document.querySelector('#shop-preview-stage .avatar-renderer')?.dataset.renderedItems?.split(' ').includes('hair-cloud')")
        verify_no_equipment_change(before,ledger(page,child_id))
        row["cancelDom"] = stage.locator(".avatar-renderer").evaluate('''e=>({rendered:e.dataset.renderedItems,
          layers:e.querySelectorAll('[data-wearable-item="hair-cloud"]').length})''')
        assert row["cancelDom"]["layers"] == 0
        row["cancelBody"] = cancel_body_proof(stage.locator(".avatar-renderer"),avatar,manifest)
        verify_no_equipment_change(before,ledger(page,child_id))
        row["screenshots"].append(shot(stage,case_dir/"cancel.png"))
        card.get_by_role("button",name=re.compile("用 150 金幣收藏")).click()
        page.wait_for_function("([key,id])=>JSON.parse(localStorage.getItem(key)||'{}')[id]?.purchaseTransactions?.some(t=>t.itemId==='hair-cloud')",arg=[PROGRESS_KEY,child_id])
        bought = ledger(page,child_id)
        assert bought["others"] == before["others"] and bought["equipmentTransactions"] == before["equipmentTransactions"]
        assert len(bought["purchaseTransactions"]) == 1 and bought["purchaseTransactions"][0]["id"] == f"shop-purchase:{child_id}:{ITEM}"
        assert bought["purchaseTransactions"][0]["cost"] == 150 and bought["purchaseTransactions"][0]["source"] == "purchase"
        assert ITEM in bought["unlockedCosmetics"] and ITEM not in bought["equippedCosmetics"]
        row["purchaseLedger"] = bought
        card.get_by_role("button",name="立即穿上").click()
        page.wait_for_function("([key,id])=>JSON.parse(localStorage.getItem(key)||'{}')[id]?.equippedCosmetics?.includes('hair-cloud')",arg=[PROGRESS_KEY,child_id])
        equipped = ledger(page,child_id)
        assert equipped["others"] == before["others"] and equipped["purchaseTransactions"] == bought["purchaseTransactions"]
        assert len(equipped["equipmentTransactions"]) == 1 and equipped["equipmentTransactions"][0]["action"] == "equip"
        assert equipped["equipmentTransactions"][0]["itemId"] == ITEM and equipped["equipmentTransactions"][0]["childId"] == child_id
        assert equipped["equipmentTransactions"][0]["slot"] == "hair"
        row["equipLedger"] = equipped
        page.wait_for_function("()=>document.querySelector('#shop-preview-stage .avatar-renderer')?.dataset.runtimeDetail==='hair-cloud'")
        row["shopEquipped"] = image_proof(stage.locator(".avatar-renderer"),avatar,detail,manifest,integrated)
        row["screenshots"].append(shot(stage,case_dir/"equipped-shop.png"))
        page.get_by_role("button",name="首頁",exact=True).first.click()
        page.wait_for_selector(".v4-dashboard-grid")
        home = page.locator(f".v65-home-display-selector .avatar-renderer.avatar-{avatar}").first
        home.wait_for(timeout=15000)
        page.wait_for_function("avatar=>document.querySelector(`.v65-home-display-selector .avatar-renderer.avatar-${avatar}`)?.dataset.runtimeDetail==='hair-cloud'",arg=avatar,timeout=15000)
        row["home"] = image_proof(home,avatar,detail,manifest,integrated)
        row["screenshots"].append(shot(page,case_dir/"home.png"))
        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector(".v4-dashboard-grid")
        row["reloadMode"] = assert_theme(page,theme)
        verify_no_equipment_change(equipped,ledger(page,child_id))
        home = page.locator(f".v65-home-display-selector .avatar-renderer.avatar-{avatar}").first
        home.wait_for(timeout=15000)
        page.wait_for_function("avatar=>document.querySelector(`.v65-home-display-selector .avatar-renderer.avatar-${avatar}`)?.dataset.runtimeDetail==='hair-cloud'",arg=avatar,timeout=15000)
        row["reloadHome"] = image_proof(home,avatar,detail,manifest,integrated)
        row["screenshots"].append(shot(page,case_dir/"reload-home.png"))
        page.get_by_role("button",name="成就獎勵",exact=True).first.click()
        page.locator(f"#achievement-tab-{child_id}").click()
        achievement = page.locator("#achievement-panel header .avatar-renderer")
        page.wait_for_function("()=>document.querySelector('#achievement-panel header .avatar-renderer')?.dataset.runtimeDetail==='hair-cloud'",timeout=15000)
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test",action="store_true")
    parser.add_argument("--integrated",action="store_true",help="verify promoted public/manifest without interception")
    parser.add_argument("--attempt")
    parser.add_argument("--base-url",default="http://127.0.0.1:5178/")
    args = parser.parse_args()
    mapping = json.loads(MAP_PATH.read_text())
    manifest = json.loads(MANIFEST_PATH.read_text())
    self_test(manifest,mapping)
    if args.self_test:
        if all(row.get("acceptanceStatus") == "ACCEPTED" for row in mapping["pairs"]):
            print("PASS: 16 matrix fixtures + seven candidate negatives + seven integrated admission negatives")
        return 0
    checked_mapping(mapping)  # Refuse pending before importing Playwright or creating an output directory.
    if not args.attempt or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{2,80}",args.attempt):
        parser.error("unique safe --attempt required")
    parsed = urlsplit(args.base_url)
    if parsed.scheme!="http" or parsed.hostname not in ("127.0.0.1","localhost") or parsed.username or parsed.password:
        parser.error("local HTTP base URL required")
    from playwright.sync_api import sync_playwright
    out = ROOT/("qa/v652/cloud-shop-integrated" if args.integrated else "qa/v652/cloud-shop-candidate")/args.attempt
    out.mkdir(parents=True,exist_ok=False)
    report = {"status":"RUNNING","attempt":args.attempt,"mode":"integrated" if args.integrated else "candidate",
              "scope":"Cloud local Shop 16 cases with purchase/equip/reload; integrated public admission" if args.integrated else
                      "Cloud QA-only in-memory manifest, 16 local Shop cases; purchase included","rows":[]}
    try:
        candidate = None if args.integrated else candidate_manifest(manifest,mapping)
        if args.integrated: integrated_manifest(manifest,mapping)
        report["pinsBefore"] = pin_sources(mapping,MANIFEST_PATH,args.integrated)
        if candidate is not None:
            (out/"candidate-manifest.sha256").write_text(hashlib.sha256(json.dumps(candidate,sort_keys=True).encode()).hexdigest()+"\n")
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            try:
                for (child_id,avatar),(width,height),theme in itertools.product(CHILDREN,SIZES,THEMES):
                    row = run_case(browser,args.base_url,out,candidate,mapping,manifest,report["pinsBefore"],args.integrated,
                                   child_id,avatar,width,height,theme)
                    report["rows"].append(row)
                    if row["status"] == "FAIL": break
            finally:
                browser.close()
        report["pinsAfter"] = pin_sources(mapping,MANIFEST_PATH,args.integrated)
        assert report["pinsBefore"] == report["pinsAfter"], "source/runtime drift"
        assert len(report["rows"]) == 16 and all(row["status"].startswith("PASS") for row in report["rows"])
        report["status"] = "PASS_TECHNICAL_AWAITING_VISUAL_REVIEW"
    except Exception as exc:
        report.update(status="FAIL",error=str(exc),traceback=traceback.format_exc())
    (out/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({"status":report["status"],"cases":len(report["rows"]),"output":str(out)}))
    return 0 if report["status"].startswith("PASS") else 1


if __name__ == "__main__":
    raise SystemExit(main())
