#!/usr/bin/env python3
"""Capture the real manifest binding for Mage and Lavender after staging.

The only supported inputs are the fixed Sol delivery inventory and a real
manifest.  This runner never injects details, intercepts assets, writes a
manifest, or contacts APIs.  ``--self-test`` is offline and deliberately uses
the proposed manifest because the live manifest is not yet staged.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlencode


ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / "qa/v652/sol/20260926-hats-integration-r1/inventory.json"
INVENTORY_SHA256 = "6f25b97b78818b87a50ddc1f8763cc92cdb0565b7c26512e387f61817f868607"
PROPOSAL = ROOT / "qa/v652/root/20260926-resume/manifest-proposed.json"
AVATARS = ("brother", "younger", "sister", "younger-sister")
SKINS = ("base", "outfit-cadet", "outfit-legend", "outfit-mage", "sister-bloom-outfit", "outfit-mecha", "outfit-ocean")
ITEMS = ("hat-mage", "sister-lavender-hat")
CANVAS = [1024, 1536]


class ContractError(ValueError):
    pass


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def inventory() -> dict:
    if sha256(INVENTORY) != INVENTORY_SHA256:
        raise ContractError("fixed Sol inventory SHA drift")
    value = load_json(INVENTORY)
    if value.get("scope", "").split(";")[0] != "56 accepted base/non-Racer pairs":
        raise ContractError("unexpected inventory scope")
    return value


def expected_pairs(source: dict) -> dict[tuple[str, str, str], dict]:
    rows = source.get("pairs")
    if not isinstance(rows, list) or len(rows) != 56:
        raise ContractError("inventory must contain exactly 56 pairs")
    expected = {(item, avatar, skin) for item in ITEMS for avatar in AVATARS for skin in SKINS}
    indexed: dict[tuple[str, str, str], dict] = {}
    for row in rows:
        key = (row.get("itemId"), row.get("avatarId"), row.get("skinId"))
        if key not in expected or key in indexed:
            raise ContractError(f"invalid or duplicate inventory key: {key}")
        for part in ("overlay", "mask"):
            asset = row.get(part)
            if not isinstance(asset, dict) or not isinstance(asset.get("path"), str) or not re.fullmatch(r"[0-9a-f]{64}", str(asset.get("sha256"))):
                raise ContractError(f"invalid inventory {part}: {key}")
        public = row.get("proposedPublic")
        if not isinstance(public, dict) or not all(isinstance(public.get(key), str) for key in ("overlay", "mask")):
            raise ContractError(f"missing proposed public pair: {key}")
        indexed[key] = row
    if set(indexed) != expected:
        raise ContractError("inventory does not cover the required 2×7×4 matrix")
    return indexed


def validate_inventory_files(source: dict) -> None:
    """Reject a source/hash pair that no longer resolves to the reviewed bytes."""
    for key, row in expected_pairs(source).items():
        for field in ("overlay", "mask"):
            delivery = ROOT / row["qaDelivery"][field]
            if not delivery.is_file() or sha256(delivery) != row[field]["sha256"]:
                raise ContractError(f"stale delivery source: {field}/{key}")
        for field in ("sourceReport", "acceptedReview"):
            evidence = row[field]
            path = ROOT / evidence["path"]
            if not path.is_file() or sha256(path) != evidence["sha256"]:
                raise ContractError(f"stale evidence source: {field}/{key}")


def manifest_index(manifest: dict) -> tuple[dict[str, dict], dict[tuple[str, str], str], dict[str, dict]]:
    accessories = {row.get("id"): row for row in manifest.get("accessories", [])}
    if not all(item in accessories for item in ITEMS):
        raise ContractError("Mage/Lavender accessory entry missing")
    skins: dict[tuple[str, str], str] = {}
    for row in manifest.get("skins", []):
        avatar, skin, path = row.get("avatarId"), row.get("skinId"), row.get("path")
        normalized_skin = "base" if skin == "default" else skin
        if avatar in AVATARS and normalized_skin in SKINS:
            if not isinstance(path, str) or (avatar, normalized_skin) in skins:
                raise ContractError(f"invalid body mapping: {avatar}/{normalized_skin}")
            skins[(avatar, normalized_skin)] = path
    if set(skins) != {(avatar, skin) for avatar in AVATARS for skin in SKINS}:
        raise ContractError("manifest body matrix is incomplete")
    displays = {row.get("avatarId"): row for row in manifest.get("baseDisplayVariants", [])}
    for avatar in AVATARS:
        display = displays.get(avatar)
        if not isinstance(display, dict) or not isinstance(display.get("path"), str) or display.get("width") != 384 or display.get("height") != 576:
            raise ContractError(f"base display contract mismatch: {avatar}")
    return accessories, skins, displays


def detail_for(entry: dict, avatar: str, skin: str) -> dict | None:
    return (entry.get("defaultSkinDetails", {}).get(avatar) if skin == "base"
            else entry.get("skinDetails", {}).get(avatar, {}).get(skin))


def validate_contract(manifest: dict, source: dict) -> dict:
    pairs = expected_pairs(source)
    accessories, bodies, displays = manifest_index(manifest)
    verified = []
    for key, row in pairs.items():
        item, avatar, skin = key
        actual = detail_for(accessories[item], avatar, skin)
        expected = {"overlay": row["proposedPublic"]["overlay"], "hairVisibilityMask": row["proposedPublic"]["mask"]}
        if actual != expected:
            raise ContractError(f"manifest binding mismatch: {item}/{avatar}/{skin}")
        base = skin == "base"
        body = displays[avatar]["path"] if base else bodies[(avatar, skin)]
        body_size = [displays[avatar]["width"], displays[avatar]["height"]] if base else CANVAS
        verified.append({"itemId": item, "avatarId": avatar, "skinId": skin, "overlay": expected["overlay"], "mask": expected["hairVisibilityMask"], "body": body, "bodySize": body_size})
    return {"matrixCount": len(verified), "bindings": verified}


def check_public_assets(contract: dict) -> None:
    from PIL import Image
    pairs = expected_pairs(inventory())
    for key, row in pairs.items():
        binding = next(value for value in contract["bindings"] if (value["itemId"], value["avatarId"], value["skinId"]) == key)
        for part, field in (("overlay", "overlay"), ("mask", "mask")):
            target = ROOT / binding[field]
            if not target.is_file() or sha256(target) != row[part]["sha256"]:
                raise ContractError(f"stale or missing staged {part}: {key}")
            with Image.open(target) as image:
                if list(image.size) != CANVAS:
                    raise ContractError(f"wrong staged dimensions: {part}/{key}")


def public_url(path: str) -> str:
    if not path.startswith("public/"):
        raise ContractError(f"unexpected manifest public path: {path}")
    return "/" + path.removeprefix("public/")


def wait_section_ready(section, item: str, skin: str, expected: dict) -> None:
    """Wait at most ten seconds for all four exact runtime bindings to appear."""
    bindings = [{**row, "overlayUrl": public_url(row["overlay"]), "maskUrl": public_url(row["mask"]), "bodyUrl": public_url(row["body"])} for row in expected.values() if row["itemId"] == item and row["skinId"] == skin]
    outcome = section.evaluate("""async (section, payload) => {
      const ids=['brother','younger','sister','younger-sister'];
      const expectedSkin=payload.skin==='base' ? 'default' : payload.skin;
      const deadline=performance.now()+10000;
      const snapshot=() => [...section.querySelectorAll('.avatar-renderer')].map(element => ({
        classes: element.className, skin: element.dataset.skin, detail: element.dataset.runtimeDetail,
        avatar: ids.find(id => element.classList.contains(`avatar-${id}`)),
        images: [...element.querySelectorAll('img')].map(image => ({src:image.getAttribute('src'), mask:image.style.maskImage}))
      }));
      while (performance.now() < deadline) {
        const rows=snapshot();
        const avatars=rows.map(row => row.avatar);
        const unique=new Set(avatars);
        const ready=rows.length===4 && unique.size===4 && ids.every(id => unique.has(id)) && rows.every(row => {
          const binding=payload.bindings.find(value => value.avatarId===row.avatar);
          if (!binding || row.skin!==expectedSkin || row.detail!==payload.item) return false;
          const body=row.images.filter(image => image.src===binding.bodyUrl);
          const overlay=row.images.filter(image => image.src===binding.overlayUrl);
          return body.length===1 && overlay.length===1 && body[0].mask===`url("${binding.maskUrl}")`;
        });
        if (ready) return {status:'ready', rows};
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      return {status:'timeout', rows:snapshot()};
    }""", {"item": item, "skin": skin, "bindings": bindings})
    if outcome.get("status") != "ready":
        raise ContractError(f"runtime readiness timeout: {item}/{skin}: {outcome}")


def inspect_section(section, item: str, skin: str, expected: dict) -> list[dict]:
    bindings = [{**row, "overlayUrl": public_url(row["overlay"]), "maskUrl": public_url(row["mask"]), "bodyUrl": public_url(row["body"])} for row in expected.values() if row["itemId"] == item and row["skinId"] == skin]
    rows = section.locator(".avatar-renderer").evaluate_all("""async (els, bindings) => {
      const visible = image => { const css=getComputedStyle(image), r=image.getBoundingClientRect(); return image.isConnected && image.complete && image.naturalWidth>0 && image.naturalHeight>0 && css.display!=='none' && css.visibility!=='hidden' && Number(css.opacity)>0 && r.width>0 && r.height>0; };
      const decode = async image => { try { await image.decode(); return 'ok'; } catch (error) { return `${error?.name ?? 'DecodeError'}: ${error?.message ?? ''}`; } };
      const output=[];
      for (const element of els) {
        const avatar=['brother','younger','sister','younger-sister'].find(id => element.classList.contains(`avatar-${id}`));
        const binding=bindings.find(row => row.avatarId===avatar);
        if (!binding) { output.push({error:'missing binding', classes:element.className}); continue; }
        const initialImages=[...element.querySelectorAll('img')];
        const body=initialImages.find(image => image.getAttribute('src')===binding.bodyUrl);
        const overlay=initialImages.find(image => image.getAttribute('src')===binding.overlayUrl);
        const maskProbe=new Image(); maskProbe.src=binding.maskUrl;
        const [, , maskDecode]=await Promise.all([body ? decode(body) : 'missing', overlay ? decode(overlay) : 'missing', decode(maskProbe)]);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const images=[...element.querySelectorAll('img')];
        const finalBody=images.find(image => image.getAttribute('src')===binding.bodyUrl);
        const finalOverlay=images.find(image => image.getAttribute('src')===binding.overlayUrl);
        const [finalBodyDecode, finalOverlayDecode]=await Promise.all([finalBody ? decode(finalBody) : 'missing', finalOverlay ? decode(finalOverlay) : 'missing']);
        output.push({avatar, classes:element.className, skin:element.dataset.skin, detail:element.dataset.runtimeDetail,
          body:finalBody && {src:finalBody.getAttribute('src'),width:finalBody.naturalWidth,height:finalBody.naturalHeight,decode:finalBodyDecode,visible:visible(finalBody),mask:finalBody.style.maskImage,maskMode:finalBody.style.maskMode,maskSize:finalBody.style.maskSize,maskPosition:finalBody.style.maskPosition,maskRepeat:finalBody.style.maskRepeat},
          overlay:finalOverlay && {src:finalOverlay.getAttribute('src'),width:finalOverlay.naturalWidth,height:finalOverlay.naturalHeight,decode:finalOverlayDecode,visible:visible(finalOverlay),mask:finalOverlay.style.maskImage},
          maskProbe:{src:maskProbe.getAttribute('src'),width:maskProbe.naturalWidth,height:maskProbe.naturalHeight,decode:maskDecode},
          allImages:images.map(image => ({src:image.getAttribute('src'),width:image.naturalWidth,height:image.naturalHeight,visible:visible(image)}))});
      }
      return output;
    }""", bindings)
    if len(rows) != 4 or {row.get("avatar") for row in rows} != set(AVATARS):
        raise ContractError(f"runtime row count {item}/{skin}: {len(rows)}")
    result=[]
    for row in rows:
        avatar = row.get("avatar")
        if avatar not in AVATARS or row["skin"] != ("default" if skin == "base" else skin) or row["detail"] != item:
            raise ContractError(f"runtime identity mismatch: {row}")
        binding = expected[(item, avatar, skin)]
        detail, body, mask = row.get("overlay"), row.get("body"), row.get("maskProbe")
        if not detail or detail["src"] != public_url(binding["overlay"]) or [detail["width"], detail["height"]] != CANVAS or detail["mask"] != "" or detail["decode"] != "ok" or not detail["visible"]:
            raise ContractError(f"runtime overlay/decode mismatch: {item}/{avatar}/{skin}")
        if not body or body["src"] != public_url(binding["body"]) or [body["width"], body["height"]] != binding["bodySize"] or body["mask"] != f'url("{public_url(binding["mask"])}")' or body["maskMode"] != "luminance" or body["maskSize"] != "contain" or body["maskPosition"] not in ("center", "center center", "50% 50%") or body["maskRepeat"] != "no-repeat" or body["decode"] != "ok" or not body["visible"]:
            raise ContractError(f"runtime body/mask/decode mismatch: {item}/{avatar}/{skin}: {body}")
        if not mask or mask["src"] != public_url(binding["mask"]) or [mask["width"], mask["height"]] != CANVAS or mask["decode"] != "ok":
            raise ContractError(f"runtime mask/decode mismatch: {item}/{avatar}/{skin}")
        result.append({"avatarId": avatar, "skinId": skin, "itemId": item, "overlay": binding["overlay"], "mask": binding["mask"], "body": binding["body"], "bodySize": binding["bodySize"], "runtime": row})
    return result


def self_test(out: Path) -> dict:
    source = inventory()
    validate_inventory_files(source)
    proposal = load_json(PROPOSAL)
    contract = validate_contract(proposal, source)
    cases = {"valid": "PASS"}
    wrong_avatar = copy.deepcopy(source); wrong_avatar["pairs"][0]["avatarId"] = "not-an-avatar"
    try: expected_pairs(wrong_avatar)
    except ContractError: cases["wrong_avatar"] = "REJECTED"
    else: raise AssertionError("wrong_avatar")
    broken = copy.deepcopy(proposal)
    mage = next(row for row in broken["accessories"] if row["id"] == "hat-mage")
    mage["defaultSkinDetails"]["brother"]["overlay"] = "public/assets/v6.5.2/runtime/younger/hat-mage--detail.png"
    for label, altered in (("swapped_overlay", broken),):
        try: validate_contract(altered, source)
        except ContractError: cases[label] = "REJECTED"
        else: raise AssertionError(label)
    broken = copy.deepcopy(proposal); mage = next(row for row in broken["accessories"] if row["id"] == "hat-mage"); del mage["defaultSkinDetails"]["brother"]["hairVisibilityMask"]
    try: validate_contract(broken, source)
    except ContractError: cases["missing_mask"] = "REJECTED"
    else: raise AssertionError("missing_mask")
    bad_source = copy.deepcopy(source); bad_source["pairs"][0]["overlay"]["sha256"] = "0" * 64
    try: validate_inventory_files(bad_source)
    except ContractError: cases["stale_source"] = "REJECTED"
    else: raise AssertionError("stale_source")
    out.mkdir(parents=True, exist_ok=False)
    try:
        out.mkdir(exist_ok=False)
    except FileExistsError:
        cases["attempt_reuse"] = "REJECTED_BY_SECOND_EXCLUSIVE_CREATE"
    else:
        raise AssertionError("attempt_reuse")
    return {"status": "SELF_TEST_PASS", "inventory": {"path": str(INVENTORY.relative_to(ROOT)), "sha256": INVENTORY_SHA256}, "proposal": {"path": str(PROPOSAL.relative_to(ROOT)), "sha256": sha256(PROPOSAL)}, "contract": {"matrixCount": contract["matrixCount"]}, "negativeCases": cases, "runtimeNotRun": True}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--attempt", required=True)
    parser.add_argument("--base-url", default="http://127.0.0.1:5178")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,80}", args.attempt):
        raise SystemExit("invalid attempt")
    out = ROOT / "qa/v652/terra/20260926-hats-runtime-runner" / args.attempt
    if args.self_test:
        if out.exists():
            raise SystemExit(f"immutable attempt already exists: {out}")
        result = self_test(out)
        (out / "report.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(result, ensure_ascii=False)); return
    if out.exists():
        raise SystemExit(f"immutable attempt already exists: {out}")
    manifest_path = ROOT / "src/data/avatarAssetManifest.json"
    manifest_before = sha256(manifest_path)
    out.mkdir(parents=True, exist_ok=False)
    errors: list[str] = []; api_aborts: list[str] = []; captures=[]
    try:
        source = inventory(); validate_inventory_files(source); manifest = load_json(manifest_path)
        contract = validate_contract(manifest, source)
        # Real capture may only start after every staged overlay/mask has the
        # pinned reviewed bytes and the fixed 1024×1536 canvas.
        check_public_assets(contract)
        expected = {(row["itemId"], row["avatarId"], row["skinId"]): row for row in contract["bindings"]}
        from playwright.sync_api import sync_playwright
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            try:
                context = browser.new_context(viewport={"width": 1512, "height": 982}, reduced_motion="reduce")
                context.route("**/api/**", lambda route, request: (api_aborts.append(request.url), route.abort()))
                page = context.new_page(); page.on("pageerror", lambda error: errors.append(str(error))); page.on("console", lambda msg: errors.append(f"console:{msg.text}") if msg.type == "error" else None)
                for item in ITEMS:
                    for skin in SKINS:
                        query = {"items": item, **({} if skin == "base" else {"skin": skin})}
                        page.goto(args.base_url.rstrip("/") + "/qa/v652/runtime-preview/index.html?" + urlencode(query), wait_until="domcontentloaded")
                        section = page.locator("[data-review-item]").first; section.wait_for()
                        wait_section_ready(section, item, skin, expected)
                        rows = inspect_section(section, item, skin, expected)
                        # Preserve verified per-avatar evidence even if this
                        # section's later screenshot operation fails.
                        captures.extend(rows)
                        shot = out / f"{item}--{skin}.png"; section.screenshot(path=str(shot), animations="disabled", caret="hide")
                        screenshot = {"path": str(shot.relative_to(ROOT)), "sha256": sha256(shot)}
                        for row in rows: row["screenshot"] = screenshot
            finally:
                browser.close()
        if errors: raise ContractError(f"page console/errors: {errors}")
        manifest_after = sha256(manifest_path)
        if manifest_after != manifest_before: raise ContractError("manifest SHA changed during capture")
    except Exception as error:
        failure = {"status": "CAPTURE_FAILED", "attempt": args.attempt, "error": f"{type(error).__name__}: {error}", "manifestBefore": manifest_before, "manifestAfter": sha256(manifest_path), "partialCaptures": captures, "apiRequestsAborted": api_aborts, "pageErrors": errors, "promotionAllowed": False}
        (out / "failure.json").write_text(json.dumps(failure, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        raise
    report = {"status": "CAPTURED_AWAITING_VISUAL_REVIEW", "attempt": args.attempt, "promotionAllowed": False, "runtime": {"realManifest": {"path": str(manifest_path.relative_to(ROOT)), "beforeSha256": manifest_before, "afterSha256": manifest_after}, "assetInterception": False, "apiRequestsAborted": api_aborts, "pageErrors": errors}, "sourcePins": {"inventory": INVENTORY_SHA256}, "matrixCount": len(captures), "captures": captures}
    (out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "pairs": len(captures), "output": str(out.relative_to(ROOT))}, ensure_ascii=False))


if __name__ == "__main__":
    main()
