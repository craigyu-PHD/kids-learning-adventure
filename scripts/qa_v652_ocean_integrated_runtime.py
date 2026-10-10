"""Fresh, real-manifest Ocean runtime capture.  It never injects or intercepts assets."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "src/data/avatarAssetManifest.json"
PLAN = ROOT / "qa/v652/sol/ocean-integration-plan-r1.json"
DELIVERY = ROOT / "qa/v652/ocean-delivery-candidate-r1/report.json"
INVENTORY = ROOT / "qa/v652/terra/ocean-accepted-integration-inventory-r1.json"
ITEM = "hat-ocean"
AVATARS = ("brother", "younger", "sister", "younger-sister")
SKINS = ("base", "outfit-cadet", "outfit-legend", "outfit-mage", "outfit-mecha", "outfit-ocean", "sister-bloom-outfit")
FULLSKINS = SKINS[1:]
PLAN_SHA256 = "84aa8a59cb603405923209a8969482902cf57b323ac81b1894319f645ce030ba"
INVENTORY_SHA256 = "e0e4dac9027d61c825a481458bb4ab1f36e291d7a45499ef982557dceda46be2"
DELIVERY_SHA256 = "e4a96d7c300a0f4e4575217e1429298ca31d6c9598fe6912ada809aa6517bc9b"
CSS_EPSILON = 0.2


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def asset(path_text: str) -> Path:
    path = (ROOT / path_text).resolve()
    assert path.is_relative_to(ROOT) and path.is_file(), f"missing/outside asset: {path_text}"
    return path


def source_path(src: str) -> str:
    """Turn a runtime /assets URL back into its manifest public path."""
    assert src.startswith("/assets/"), f"unexpected runtime source: {src}"
    return "public" + src


def exact(link: dict, label: str) -> Path:
    assert isinstance(link, dict) and isinstance(link.get("path"), str) and isinstance(link.get("sha256"), str), label
    path = asset(link["path"])
    assert digest(path) == link["sha256"], f"hash drift {label}: {link['path']}"
    if "size" in link:
        from PIL import Image
        with Image.open(path) as image:
            assert list(image.size) == link["size"], f"size drift {label}: {link['path']}"
    return path


def plan_and_delivery() -> tuple[dict, dict, dict]:
    assert digest(PLAN) == PLAN_SHA256, "fixed plan SHA drift"
    assert digest(INVENTORY) == INVENTORY_SHA256, "fixed inventory SHA drift"
    assert digest(DELIVERY) == DELIVERY_SHA256, "fixed delivery SHA drift"
    inventory = json.loads(INVENTORY.read_text())
    delivery = json.loads(DELIVERY.read_text())
    plan = json.loads(PLAN.read_text())
    assert inventory["acceptedPairs"] and len(inventory["acceptedPairs"]) == 28
    assert delivery["status"] == "QA_DELIVERY_ONLY_PENDING_INTEGRATION_AUDIT" and len(delivery["deliveries"]) == 28
    assert plan["itemId"] == ITEM and plan["canvasTopPadding"] == 256 and len(plan["operations"]) == 29
    exact(plan["sourceBindings"]["acceptedInventory"], "plan inventory")
    exact(plan["sourceBindings"]["losslessDeliveryReport"], "plan delivery report")
    for row in inventory["acceptedPairs"]:
        exact(row["source"], f"inventory source {row['avatar']}/{row['skinId']}")
        exact(row["overlay"], f"inventory overlay {row['avatar']}/{row['skinId']}")
        exact(row["independentReview"], f"inventory review {row['avatar']}/{row['skinId']}")
        exact(row["reportEvidence"], f"inventory report {row['avatar']}/{row['skinId']}")
    for row in delivery["deliveries"]:
        exact(row["source"], f"delivery source {row['avatar']}/{row['skinId']}")
        assert row["rgbaExact"] is True and row["mask"] is None and row["canvasTopPadding"] == 256
        path = asset(row["path"])
        assert digest(path) == row["sha256"], f"delivery drift {row['path']}"
    return inventory, delivery, plan


def expected_contract(manifest: dict, inventory: dict, plan: dict, delivery: dict) -> dict:
    entry = next(item for item in manifest["accessories"] if item["id"] == ITEM)
    operations = {(row.get("avatarId"), row.get("skinId", "base")): row for row in plan["operations"] if row["kind"] != "catalog"}
    deliveries = {(row["avatar"], row["skinId"]): row for row in delivery["deliveries"]}
    reviewed_sources = {(row["avatar"], row["skinId"]): row["source"] for row in inventory["acceptedPairs"]}
    expected = {}
    for avatar in AVATARS:
        for skin in SKINS:
            op = operations[(avatar, skin)]
            delivery_row = deliveries[(avatar, skin)]
            detail = entry["defaultSkinDetails"][avatar] if skin == "base" else entry["skinDetails"][avatar][skin]
            assert detail == {"overlay": op["target"], "canvasTopPadding": 256}, f"manifest detail drift {avatar}/{skin}"
            target = asset(op["target"])
            assert digest(target) == op["sha256"] == delivery_row["sha256"], f"target lineage drift {avatar}/{skin}"
            if skin != "base":
                live_body = next(row["path"] for row in manifest["skins"] if row["avatarId"] == avatar and row["skinId"] == skin)
                reviewed = reviewed_sources[(avatar, skin)]
                assert live_body == reviewed["path"], f"fullskin manifest path drift {avatar}/{skin}"
                assert digest(asset(live_body)) == reviewed["sha256"], f"fullskin source hash drift {avatar}/{skin}"
            expected[(avatar, skin)] = {"overlay": op["target"], "sha256": op["sha256"]}
    assert entry["catalogPath"] == next(row for row in plan["operations"] if row["kind"] == "catalog")["target"]
    return expected


def inspect_section(section, skin: str, expected: dict) -> list[dict]:
    rows = section.locator(".avatar-renderer").evaluate_all("""els => els.map(e => {
      const body=e.querySelector('.avatar-renderer-skin'), imgs=[...e.querySelectorAll('img')];
      const detail=imgs.find(i => i.naturalWidth===1024 && i.naturalHeight===1792);
      const rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
      return {avatar:e.className, skin:e.dataset.skin, detail:e.dataset.runtimeDetail,
        padding:e.dataset.canvasTopPadding, scene:e.dataset.rigScene,
        outer:rect(e),
        body:{src:body?.getAttribute('src'),mask:body?.style.maskImage,rect:body&&rect(body),width:body?.naturalWidth,height:body?.naturalHeight},
        detailImage:detail&&{src:detail.getAttribute('src'),mask:detail.style.maskImage,rect:rect(detail),width:detail.naturalWidth,height:detail.naturalHeight},
      };
    })""")
    assert len(rows) == 4, rows
    for row in rows:
        avatar = next(a for a in AVATARS if f"avatar-{a}" in row["avatar"].split())
        assert row["skin"] == ("default" if skin == "base" else skin)
        assert row["detail"] == ITEM and row["padding"] == "256" and row["scene"] == "extended-detail", row
        detail = row["detailImage"]
        assert detail and detail["width"] == 1024 and detail["height"] == 1792 and detail["mask"] == "", row
        assert source_path(detail["src"]) == expected[(avatar, skin)]["overlay"], row
        body = row["body"]
        assert body and body["mask"] == "", row
        if skin != "base":
            expected_body = next(x["path"] for x in json.loads(MANIFEST.read_text())["skins"] if x["avatarId"] == avatar and x["skinId"] == skin)
            assert source_path(body["src"]) == expected_body, row
            assert digest(asset(expected_body)), "fullskin source absent"
        outer, b, d = row["outer"], body["rect"], detail["rect"]
        scale = d["width"] / 1024
        assert scale > 0
        assert abs(d["height"] - 1792 * scale) <= CSS_EPSILON, row
        assert abs(b["width"] - 1024 * scale) <= CSS_EPSILON, row
        assert abs(b["height"] - 1536 * scale) <= CSS_EPSILON, row
        assert abs(b["left"] - d["left"]) <= CSS_EPSILON, row
        assert abs(b["top"] - d["top"] - 256 * scale) <= CSS_EPSILON, row
        assert d["left"] >= outer["left"] - CSS_EPSILON and d["top"] >= outer["top"] - CSS_EPSILON, row
        assert d["right"] <= outer["right"] + CSS_EPSILON and d["bottom"] <= outer["bottom"] + CSS_EPSILON, row
        assert b["left"] >= d["left"] - CSS_EPSILON and b["top"] >= d["top"] - CSS_EPSILON, row
        assert b["right"] <= d["right"] + CSS_EPSILON and b["bottom"] <= d["bottom"] + CSS_EPSILON, row
    return rows


def await_decoded_visible_images(section) -> list[dict]:
    """Require real image decode and CSS visibility before a diagnostic capture.

    ``complete`` / ``naturalWidth`` merely says that an image request finished;
    it is not a paint-readiness signal for the async-decoded wearable layers.
    This deliberately does not use a timer: every renderer image must decode,
    remain connected, have a non-zero rect, and be CSS-visible, then two RAFs
    give the browser a paint boundary before screenshot capture.
    """
    rows = section.locator(".avatar-renderer").evaluate_all("""async els => {
      const rect = node => {
        const r = node.getBoundingClientRect();
        return { width: r.width, height: r.height };
      };
      const all = [];
      for (const renderer of els) {
        const images = [];
        for (const image of renderer.querySelectorAll('img')) {
          let decode = 'ok';
          try { await image.decode(); } catch (error) { decode = `${error?.name ?? 'DecodeError'}: ${error?.message ?? ''}`; }
          const css = getComputedStyle(image);
          const box = rect(image);
          const visible = image.isConnected
            && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
            && css.display !== 'none' && css.visibility === 'visible'
            && Number(css.opacity) > 0 && box.width > 0 && box.height > 0
            && (!image.checkVisibility || image.checkVisibility({ opacityProperty: true, visibilityProperty: true }));
          images.push({
            className: image.className, src: image.getAttribute('src'), decode,
            complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
            display: css.display, visibility: css.visibility, opacity: css.opacity,
            animationName: css.animationName, animationPlayState: css.animationPlayState,
            connected: image.isConnected, rect: box, visible,
          });
        }
        all.push({ avatar: renderer.className, images });
      }
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return all;
    }""")
    assert len(rows) == 4, rows
    for row in rows:
        assert row["images"], row
        for image in row["images"]:
            assert image["decode"] == "ok" and image["visible"], {"avatar": row["avatar"], "image": image}
    return rows


def inspect_racer(section) -> list[dict]:
    rows = section.locator(".avatar-renderer").evaluate_all("""els => els.map(e => ({
      avatar:e.className, detail:e.dataset.runtimeDetail, padding:e.dataset.canvasTopPadding,
      images:[...e.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),width:i.naturalWidth,height:i.naturalHeight,mask:i.style.maskImage}))
    }))""")
    assert len(rows) == 4
    for row in rows:
        assert row["detail"] != ITEM and row["padding"] is None, row
        assert all(not (image["width"] == 1024 and image["height"] == 1792) for image in row["images"]), row
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--attempt", required=True, help="exclusive directory name under qa/v652/ocean-integration")
    parser.add_argument("--base-url", default="http://127.0.0.1:5178", help="already-running local preview only")
    parser.add_argument("--capture-racer", action="store_true", help="capture explicit no-detail negative; never a visual acceptance")
    args = parser.parse_args()
    assert re.fullmatch(r"[a-z0-9][a-z0-9-]{0,80}", args.attempt), "invalid attempt"
    out = ROOT / "qa/v652/ocean-integration" / args.attempt
    assert not out.exists(), f"immutable attempt exists: {out}"
    inventory, delivery, plan = plan_and_delivery()
    manifest = json.loads(MANIFEST.read_text())
    expected = expected_contract(manifest, inventory, plan, delivery)
    out.mkdir(parents=True, exist_ok=False)
    errors, api_aborts, captures = [], [], []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        context = browser.new_context(viewport={"width": 1512, "height": 982}, reduced_motion="reduce")
        context.route("**/api/**", lambda route, request: (api_aborts.append(request.url), route.abort()))
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        for skin in SKINS:
            page.goto(args.base_url.rstrip("/") + "/qa/v652/runtime-preview/index.html?" + urlencode({"items": ITEM, **({} if skin == "base" else {"skin": skin})}), wait_until="domcontentloaded")
            section = page.locator("[data-review-item]").first; section.wait_for()
            page.wait_for_function("() => [...document.images].length > 0 && [...document.images].every(i => i.complete && i.naturalWidth > 0)")
            page.wait_for_function("() => [...document.querySelectorAll('.avatar-renderer')].every(e => e.dataset.runtimeDetail === 'hat-ocean' && e.dataset.canvasTopPadding === '256')")
            image_readiness = await_decoded_visible_images(section)
            rows = inspect_section(section, skin, expected)
            shot = out / f"{skin}.png"; section.screenshot(path=str(shot), animations="disabled", caret="hide")
            captures.append({"skin": skin, "rows": rows, "imageReadiness": image_readiness, "screenshot": {"path": str(shot.relative_to(ROOT)), "sha256": digest(shot)}})
        racer = None
        if args.capture_racer:
            page.goto(args.base_url.rstrip("/") + "/qa/v652/runtime-preview/index.html?" + urlencode({"items": ITEM, "skin": "outfit-racer"}), wait_until="domcontentloaded")
            section = page.locator("[data-review-item]").first; section.wait_for()
            page.wait_for_function("() => [...document.images].length > 0 && [...document.images].every(i => i.complete && i.naturalWidth > 0)")
            image_readiness = await_decoded_visible_images(section)
            rows = inspect_racer(section)
            shot = out / "outfit-racer-negative.png"; section.screenshot(path=str(shot), animations="disabled", caret="hide")
            racer = {"status": "NEGATIVE_NO_DETAIL_EXPECTED_NOT_VISUAL_ACCEPTANCE", "rows": rows, "imageReadiness": image_readiness, "screenshot": {"path": str(shot.relative_to(ROOT)), "sha256": digest(shot)}}
        browser.close()
    assert not errors, errors
    report = {"status": "CAPTURED_AWAITING_VISUAL_REVIEW", "scope": "real current manifest only; no detail override or asset interception", "promotionAllowed": False, "attempt": args.attempt, "sourcePins": {"inventory": digest(INVENTORY), "delivery": digest(DELIVERY), "plan": digest(PLAN)}, "constraints": {"apiRequestsAborted": api_aborts, "assetInterception": False, "canvasTopPadding": 256, "mask": None, "acceptedStateCount": len(captures), "racerVisualAcceptance": False}, "captures": captures, "racerNegative": racer, "pageErrors": errors}
    (out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"status": report["status"], "output": str(out), "states": len(captures), "racer": bool(racer)}))


if __name__ == "__main__":
    main()
