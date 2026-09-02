#!/usr/bin/env python3
"""V6.4 large-display hard gate + screenshot evidence.

Runs against a controlled family snapshot/session so Report can be exercised
without touching real Production family data. Product auth still executes the
real client flow; only the API responses are stubbed inside this browser QA.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from playwright.sync_api import Page, Route, sync_playwright

from qa_v63_browser_seed import SETTINGS, PROGRESS

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get("AUDIT_URL", "http://127.0.0.1:4174/")
OUT = ROOT / "qa" / "production-audit" / "2026-09-02" / "v64-4k"
OUT.mkdir(parents=True, exist_ok=True)
RESULT_PATH = OUT / "v64-4k-layout.json"

VIEWPORTS = [(2560, 1440), (3440, 1440), (3840, 2160), (5120, 2160)]
PAGES = ["home", "today", "semester", "achievements", "shop", "report"]
FAMILY_ID = "a" * 64
TOKEN = "v64-controlled-browser-token-" + ("x" * 40)
SESSION = {
    "familyId": FAMILY_ID,
    "token": TOKEN,
    "expiresAt": "2099-09-02T00:00:00.000Z",
}
TIME = {
    "now": "2026-09-02T02:30:00.000Z",
    "activeDate": "2026-09-02",
    "taipeiDate": "2026-09-02",
    "taipeiTime": "10:30:00",
    "timeZone": "Asia/Taipei",
}
SNAPSHOT = {
    "version": 2,
    "updatedAt": "2026-09-02T02:00:00.000Z",
    "settings": {**SETTINGS, "cloudSync": {"enabled": True, "familyCode": FAMILY_ID}},
    "progress": PROGRESS,
    "attendance": {},
    "reflections": {},
}

SEED = f"""
(() => {{
  const familyId = {json.dumps(FAMILY_ID)};
  const session = {json.dumps(SESSION, ensure_ascii=False)};
  const settings = {json.dumps(SNAPSHOT['settings'], ensure_ascii=False)};
  const progress = {json.dumps(PROGRESS, ensure_ascii=False)};
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('star-learning-active-family-session-v40', JSON.stringify(session));
  localStorage.setItem(`star-learning-v40:${{familyId}}:settings`, JSON.stringify(settings));
  localStorage.setItem(`star-learning-v40:${{familyId}}:progress`, JSON.stringify(progress));
  localStorage.setItem(`star-learning-v40:${{familyId}}:attendance`, '{{}}');
  localStorage.setItem(`star-learning-v40:${{familyId}}:reflections`, '{{}}');
  sessionStorage.setItem(`star-learning-v40:${{familyId}}:active-user`, 'user-father');
  localStorage.setItem('little-explorers-v4-sound', 'off');
}})();
"""


def fulfill_json(route: Route, data: Any, status: int = 200) -> None:
    route.fulfill(status=status, content_type="application/json", body=json.dumps(data, ensure_ascii=False))


def install_routes(context) -> None:
    context.route("**/api/server-time", lambda r: fulfill_json(r, TIME))
    context.route("**/api/time", lambda r: fulfill_json(r, TIME))

    def family_session(route: Route) -> None:
        fulfill_json(route, SESSION)

    def state(route: Route) -> None:
        if route.request.method == "GET":
            fulfill_json(route, SNAPSHOT)
        elif route.request.method == "PUT":
            fulfill_json(route, {"ok": True, "updatedAt": "2026-09-02T02:00:01.000Z"})
        else:
            fulfill_json(route, {"error": "not allowed in controlled QA"}, 405)

    context.route("**/api/family-session", family_session)
    context.route("**/api/state**", state)


def wait_app(page: Page) -> None:
    page.goto(URL, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_selector(".v4-main-navigation", timeout=30000)
    page.wait_for_timeout(250)


def page_health(page: Page) -> dict[str, Any]:
    return page.evaluate(
        """() => ({
          overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
          brokenImages: [...document.images]
            .filter(img => img.complete && img.naturalWidth === 0 && !img.hidden)
            .map(img => img.currentSrc || img.src),
          viewport: { width: innerWidth, height: innerHeight },
        })"""
    )


def dashboard_geometry(page: Page) -> dict[str, Any]:
    return page.evaluate(
        """() => {
          const rect = (el) => { const r=el.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}; };
          const contentWidth = (el) => {
            const cs=getComputedStyle(el);
            return el.clientWidth - parseFloat(cs.paddingLeft||0) - parseFloat(cs.paddingRight||0);
          };
          const grid=document.querySelector('.v4-dashboard-grid');
          const columns=['.v4-left-column','.v4-center-column','.v4-right-column'].map(s=>document.querySelector(s));
          const major=[
            ['left-player','.v4-left-column .v4-player-profile','.v4-left-column'],
            ['left-ai','.v4-left-column .v4-ai-companion','.v4-left-column'],
            ['semester','.v5-semester-overview','.v4-center-column'],
            ['evolution','.v4-evolution-panel','.v4-center-column'],
            ['badges','.v4-badge-panel','.v4-center-column'],
            ['daily','.v4-right-column .v4-daily-panel','.v4-right-column'],
          ];
          const panelWidths=major.flatMap(([name,childSel,parentSel])=>{
            const child=document.querySelector(childSel); const parent=document.querySelector(parentSel);
            if(!child||!parent) return [];
            const childRect=rect(child); const expected=contentWidth(parent);
            return [{name,width:childRect.width,parentContentWidth:expected,delta:Math.abs(childRect.width-expected),pass:Math.abs(childRect.width-expected)<=2.1}];
          });
          const colRects=columns.filter(Boolean).map(rect);
          const overlaps=[];
          for(let i=0;i<colRects.length;i++) for(let j=i+1;j<colRects.length;j++) {
            const a=colRects[i],b=colRects[j];
            const x=Math.min(a.right,b.right)-Math.max(a.left,b.left);
            const y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
            if(x>1 && y>1) overlaps.push({i,j,x,y});
          }
          const legacyTargets=[
            ['left','.v4-left-column',260],['center','.v4-center-column',880],['right','.v4-right-column',344],
            ['lesson','.v4-right-column .v4-lesson-card',324]
          ].flatMap(([name,sel,legacy])=>{
            const el=document.querySelector(sel); if(!el)return [];
            const width=rect(el).width;
            return [{name,width,legacy,stillLegacy:Math.abs(width-legacy)<=2}];
          });
          const outside=[];
          document.querySelectorAll('.v4-left-column > *, .v4-center-column > *, .v4-right-column > *').forEach(el=>{
            const p=el.parentElement;if(!p)return; const a=rect(el),b=rect(p);
            if(a.left < b.left-3 || a.right > b.right+3) outside.push({className:el.className,child:a,parent:b});
          });
          return {
            grid:grid?rect(grid):null,
            columns:colRects,
            overlaps,
            panelWidths,
            legacyTargets,
            outside,
          };
        }"""
    )


def click_nav(page: Page, label: str) -> None:
    page.get_by_role("button", name=label, exact=True).click()
    page.wait_for_timeout(220)


def unlock_report(page: Page) -> None:
    click_nav(page, "學習報表")
    dlg = page.get_by_role("dialog", name="管理者驗證")
    dlg.wait_for(timeout=10000)
    for digit in ["1", "2", "3", "4"]:
        dlg.get_by_role("button", name=digit, exact=True).click()
    dlg.get_by_role("button", name="解鎖家長專區", exact=True).click()
    page.wait_for_selector(".v4-report-page, .v4-page-heading", timeout=10000)
    page.wait_for_timeout(300)


def goto_named_page(page: Page, name: str) -> None:
    if name == "home":
        click_nav(page, "首頁")
    elif name == "today":
        click_nav(page, "今日課程")
    elif name == "semester":
        click_nav(page, "學期日曆")
    elif name == "achievements":
        click_nav(page, "成就獎勵")
    elif name == "shop":
        click_nav(page, "寶物商店")
        page.wait_for_selector(".v6-shop-studio", timeout=10000)
    elif name == "report":
        unlock_report(page)
    else:
        raise ValueError(name)


def run() -> int:
    rows: list[dict[str, Any]] = []
    console_errors: list[dict[str, str]] = []
    page_errors: list[dict[str, str]] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        for width, height in VIEWPORTS:
            context = browser.new_context(viewport={"width": width, "height": height}, reduced_motion="reduce")
            context.add_init_script(SEED)
            install_routes(context)
            page = context.new_page()
            page.on("console", lambda msg, wh=f"{width}x{height}": console_errors.append({"viewport": wh, "text": msg.text}) if msg.type == "error" else None)
            page.on("pageerror", lambda exc, wh=f"{width}x{height}": page_errors.append({"viewport": wh, "text": str(exc)}))
            wait_app(page)

            # Home geometry is the structural 3-column hard gate.
            geometry = dashboard_geometry(page)
            health = page_health(page)
            if width < 3200:
                min_workspace_width = min(width * 0.88, 2700)
            elif width < 4600:
                min_workspace_width = 3000
            else:
                min_workspace_width = 3400
            workspace_expands = bool(geometry["grid"] and geometry["grid"]["width"] >= min_workspace_width)
            structural_pass = (
                health["overflow"] <= 1
                and not health["brokenImages"]
                and not geometry["overlaps"]
                and not geometry["outside"]
                and all(item["pass"] for item in geometry["panelWidths"])
                and not any(item["stillLegacy"] for item in geometry["legacyTargets"])
                and workspace_expands
            )
            rows.append({
                "viewport": f"{width}x{height}",
                "page": "home-structure",
                "pass": structural_pass,
                "health": health,
                "geometry": geometry,
                "minWorkspaceWidth": round(min_workspace_width, 1),
                "workspaceExpands": workspace_expands,
            })

            for name in PAGES:
                # Report remains unlocked after first controlled PIN validation.
                goto_named_page(page, name)
                health = page_health(page)
                shot = OUT / f"{width}x{height}-{name}.jpg"
                print(f"CAPTURE_START {width}x{height} {name}", flush=True)
                page.screenshot(
                    path=str(shot),
                    full_page=True,
                    type="jpeg",
                    quality=88,
                    animations="disabled",
                    caret="hide",
                    timeout=30000,
                )
                print(f"CAPTURE_DONE {width}x{height} {name}", flush=True)
                rows.append({
                    "viewport": f"{width}x{height}",
                    "page": name,
                    "pass": health["overflow"] <= 1 and not health["brokenImages"],
                    "health": health,
                    "screenshot": str(shot.relative_to(ROOT)),
                })
            context.close()
        browser.close()

    failures = [row for row in rows if not row["pass"]]
    payload = {
        "status": "PASS" if not failures and not console_errors and not page_errors else "FAIL",
        "structuralCases": len(VIEWPORTS),
        "screenshotCases": len(VIEWPORTS) * len(PAGES),
        "pass": len(rows) - len(failures),
        "total": len(rows),
        "failures": failures,
        "consoleErrors": console_errors,
        "pageErrors": page_errors,
        "rows": rows,
    }
    RESULT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: payload[k] for k in ["status", "structuralCases", "screenshotCases", "pass", "total", "failures", "consoleErrors", "pageErrors"]}, ensure_ascii=False, indent=2))
    return 0 if payload["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(run())
