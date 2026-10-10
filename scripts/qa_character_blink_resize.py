#!/usr/bin/env python3
"""Isolated real-hook regression: responsive keyed image replacement must update blink resolution.

Run against a Vite dev server, e.g.
AUDIT_URL=http://127.0.0.1:4197 python3 scripts/qa_character_blink_resize.py --label after
No application state, family data, or production services are used.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get("AUDIT_URL", "http://127.0.0.1:4197").rstrip("/")
parser = argparse.ArgumentParser()
parser.add_argument("--label", default="after")
args = parser.parse_args()
if not re.fullmatch(r"[a-zA-Z0-9_-]+", args.label):
    parser.error("label must contain only letters, numbers, underscores or hyphens")
transformed = urllib.request.urlopen(URL + "/src/useCharacterBlink.ts").read().decode()
react_path = re.search(r'from "([^"]+/react\.js\?[^"]+)"', transformed).group(1)
main_module = urllib.request.urlopen(URL + "/src/main.tsx").read().decode()
client_path = re.search(r'from "([^"]+/react-dom_client\.js\?[^"]+)"', main_module).group(1)
html = """<!doctype html><html><head><style>
body { margin:0; }
#avatar { position:relative; width:60vw; height:90vw; }
#avatar img { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
</style></head><body><div id="root"></div><script type="module">
import React from "__REACT__";
import ReactDOM from "__CLIENT__";
import { useAvatarDisplayPath } from "/src/useAvatarDisplayPath.ts";
import { useCharacterBlink } from "/src/useCharacterBlink.ts";
function Harness() {
  const container = React.useRef(null);
  const image = React.useRef(null);
  const full = "/assets/v5/characters/brother/wardrobe/base-body.webp";
  const display = useAvatarDisplayPath("brother", container, true, full);
  const blink = useCharacterBlink(image, display.path, "brother", "default", true);
  return React.createElement("div", {id:"avatar", ref:container, "data-frame":blink.frame || "",
      "data-base":display.path || ""},
    display.path ? React.createElement("img", {key:display.path, ref:image, src:display.path, alt:"test avatar"}) : null);
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(Harness));
</script></body></html>""".replace("__REACT__", react_path).replace("__CLIENT__", client_path)

result = {
    "scope": "Real useAvatarDisplayPath + useCharacterBlink hooks; responsive keyed img replacement",
    "hookSha256": hashlib.sha256((ROOT / "src/useCharacterBlink.ts").read_bytes()).hexdigest(),
    "cases": [], "errors": [],
}
with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={"width":200, "height":1000}, device_scale_factor=1,
                                  reduced_motion="no-preference")
    page = context.new_page()
    page.on("pageerror", lambda error: result["errors"].append(str(error)))
    page.on("console", lambda message: result["errors"].append(message.text) if message.type == "error" else None)
    page.on("requestfailed", lambda request: result["errors"].append(request.url + ": " + str(request.failure)))
    page.route(URL + "/__blink_resize_test__", lambda route: route.fulfill(
        status=200, content_type="text/html", body=html))
    page.goto(URL + "/__blink_resize_test__", wait_until="networkidle")
    if not page.locator("#avatar").count():
        raise RuntimeError("Harness failed to mount: " + json.dumps(result["errors"]))
    for width, expected in [(200,192), (500,384), (1000,1024), (200,192)]:
        page.set_viewport_size({"width":width,"height":1200})
        matched = True
        try:
            page.wait_for_function("""expected => {
                const node=document.querySelector("#avatar");
                const image=node?.querySelector("img");
                return image?.complete && image.naturalWidth > 0
                  && node.dataset.frame.endsWith("-"+expected+".webp");
            }""", arg=expected, timeout=2500)
        except Exception:
            matched = False
        observed = page.locator("#avatar").evaluate("""node => ({
            base:node.dataset.base, frame:node.dataset.frame,
            width:node.clientWidth, height:node.clientHeight,
            loaded:!!node.querySelector("img")?.naturalWidth
        })""")
        result["cases"].append({"viewportWidth":width,"expectedBlinkWidth":expected,
                                "pass":matched,"observed":observed})
    context.close()
    browser.close()
result["pass"] = not result["errors"] and all(case["pass"] for case in result["cases"])
out = ROOT / "qa" / "v65" / "character-blink-resize" / args.label
out.mkdir(parents=True, exist_ok=True)
(out / "result.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
print(json.dumps(result,ensure_ascii=False,indent=2))
raise SystemExit(0 if result["pass"] else 1)
