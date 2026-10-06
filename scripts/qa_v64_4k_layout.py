#!/usr/bin/env python3
"""V6.4 P02 shared layout contract.

The filename and package alias are retained for compatibility, but this no
longer encodes the superseded "stretch the workspace on 4K/5K" rule. It tests
the adopted D02 contract across 320–5120 CSS px: natural-height page frames,
mission-first DOM order, max 1920px shared canvas, no horizontal overflow,
major-surface overlap or obstructed controls, plus representative six-page and
family-scale coverage. API calls are controlled; no real family data is read or
written.
"""
from __future__ import annotations

import copy
import json
import os
from pathlib import Path
from typing import Any

from playwright.sync_api import Page, Route, sync_playwright

from qa_v63_browser_seed import SETTINGS as BASE_SETTINGS, PROGRESS as BASE_PROGRESS

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get("AUDIT_URL", "http://127.0.0.1:4173/")
OUT = ROOT / "qa" / "production-audit" / "2026-09-14" / "v64-p02-layout"
OUT.mkdir(parents=True, exist_ok=True)
RESULT_PATH = OUT / "p02-layout-contract.json"

# Fixed design widths from the adopted plan. Each tuple is CSS viewport width,
# height; the app is tested in CSS pixels rather than physical display pixels.
VIEWPORTS = [
    (320, 568), (360, 800), (390, 844), (412, 915), (600, 900),
    (768, 1024), (820, 1180), (1024, 768), (1280, 800), (1366, 768), (1440, 900),
    (1920, 1080), (2560, 1440), (3440, 1440), (3840, 2160), (5120, 2160),
]
# Boundary scan is home-only because all six pages already run at the fixed
# representative widths above. These cases detect one-pixel breakpoint holes.
BREAKPOINT_WIDTHS = [599, 600, 601, 899, 900, 901, 1199, 1200, 1201, 1919, 1920, 1921]
PAGES = ["home", "today", "semester", "achievements", "shop", "report"]
SCREENSHOT_VIEWPORTS = {(320, 568), (390, 844), (820, 1180), (1440, 900), (3440, 1440), (3840, 2160)}

FAMILY_ID = "b" * 64
PIN = "2468"
TOKEN = "v64-p02-layout-token-" + ("x" * 48)
SESSION = {"familyId": FAMILY_ID, "token": TOKEN, "expiresAt": "2099-09-14T12:00:00.000Z"}
TIME = {
    "now": "2026-09-14T10:30:00.000Z",
    "activeDate": "2026-09-14",
    "taipeiDate": "2026-09-14",
    "taipeiTime": "18:30:00",
    "timeZone": "Asia/Taipei",
}


def clone_fixture(learner_count: int = 4, long_names: bool = False) -> tuple[dict[str, Any], dict[str, Any]]:
    settings = copy.deepcopy(BASE_SETTINGS)
    base_children = copy.deepcopy(BASE_SETTINGS["children"])
    avatars = ["brother", "younger", "sister", "younger-sister"]
    default_names = ["哥哥", "弟弟", "姐姐", "妹妹", "表哥", "表妹"]
    children: list[dict[str, Any]] = []
    progress: dict[str, Any] = {}
    progress_template = copy.deepcopy(next(iter(BASE_PROGRESS.values())))

    for index in range(learner_count):
        if index < len(base_children):
            child = copy.deepcopy(base_children[index])
        else:
            child = {
                "id": f"p02-child-{index + 1}",
                "name": default_names[index] if index < len(default_names) else f"學習者{index + 1}",
                "avatar": avatars[index % len(avatars)],
                "role": "child",
                "disabled": False,
            }
        if long_names:
            child["name"] = f"超級宇宙探險學習隊的{default_names[index] if index < len(default_names) else index + 1}"
        children.append(child)

        source_progress = copy.deepcopy(BASE_PROGRESS.get(child["id"], progress_template))
        # Layout QA must not fail only because cloned ledger objects still carry
        # another learner's childId. Preserve content while rebinding identity.
        for key in ("rewardTransactions", "purchaseTransactions", "equipmentTransactions", "answerEvents"):
            values = source_progress.get(key)
            if isinstance(values, list):
                for value in values:
                    if isinstance(value, dict) and "childId" in value:
                        value["childId"] = child["id"]
        progress[child["id"]] = source_progress

    settings["children"] = children
    settings["cloudSync"] = {"enabled": True, "familyCode": FAMILY_ID}
    return settings, progress


def make_snapshot(learner_count: int = 4, long_names: bool = False) -> tuple[dict[str, Any], str]:
    settings, progress = clone_fixture(learner_count, long_names)
    snapshot = {
        "version": 2,
        "updatedAt": "2026-09-14T10:00:00.000Z",
        "settings": settings,
        "progress": progress,
        "attendance": {},
        "reflections": {},
    }
    seed = f"""(() => {{
      const familyId={json.dumps(FAMILY_ID)};
      const session={json.dumps(SESSION, ensure_ascii=False)};
      const settings={json.dumps(settings, ensure_ascii=False)};
      const progress={json.dumps(progress, ensure_ascii=False)};
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem('star-learning-active-family-session-v40', JSON.stringify(session));
      localStorage.setItem(`star-learning-v40:${{familyId}}:settings`, JSON.stringify(settings));
      localStorage.setItem(`star-learning-v40:${{familyId}}:progress`, JSON.stringify(progress));
      localStorage.setItem(`star-learning-v40:${{familyId}}:attendance`, '{{}}');
      localStorage.setItem(`star-learning-v40:${{familyId}}:reflections`, '{{}}');
      sessionStorage.setItem(`star-learning-v40:${{familyId}}:active-user`, 'user-father');
      localStorage.setItem('little-explorers-v4-sound','off');
    }})();"""
    return snapshot, seed


def fulfill_json(route: Route, data: Any, status: int = 200) -> None:
    route.fulfill(status=status, content_type="application/json", body=json.dumps(data, ensure_ascii=False))


def install_routes(context, snapshot: dict[str, Any]) -> None:
    context.route("**/api/server-time", lambda route: fulfill_json(route, TIME))
    context.route("**/api/time", lambda route: fulfill_json(route, TIME))

    def family(route: Route) -> None:
        try:
            payload = route.request.post_data_json or {}
        except Exception:
            payload = {}
        fulfill_json(route, SESSION if payload.get("pin") == PIN else {"error": "invalid controlled PIN"}, 200 if payload.get("pin") == PIN else 400)

    def state(route: Route) -> None:
        if route.request.method == "GET":
            fulfill_json(route, snapshot)
        elif route.request.method == "PUT":
            fulfill_json(route, {"ok": True, "updatedAt": "2026-09-14T10:00:01.000Z"})
        else:
            fulfill_json(route, {"error": "not allowed in controlled P02 QA"}, 405)

    context.route("**/api/family-session", family)
    context.route("**/api/state**", state)


PAGE_READY = r"""name => {
  const visible = selector => { const el=document.querySelector(selector); if(!el)return false; const r=el.getBoundingClientRect(); return r.width>0 && r.height>0; };
  if (document.querySelector('[aria-label="內容載入失敗"]') || [...document.querySelectorAll('[role="status"] h2')].some(el=>el.textContent.includes('正在開啟內容'))) return false;
  switch(name) {
    case 'home': case 'today': return visible('.v4-dashboard-grid') && document.querySelectorAll('.v4-player-card').length>=1 && document.querySelectorAll('.v4-daily-panel .v4-lesson-card').length===2;
    case 'semester': {
      const weeks=document.querySelectorAll('.v4-week-strip').length;
      const days=document.querySelectorAll('.v4-semester-day').length;
      const compactToggle=document.querySelector('.v65-mobile-section-summary button[aria-expanded="false"]');
      return visible('.v4-semester-weeks') && ((weeks===18 && days===90) || (!!compactToggle && weeks===1 && days===5));
    }
    case 'achievements': return visible('.v6-achievement-wall') && document.querySelectorAll('.v4-full-badge-grid > *').length===24;
    case 'shop': return visible('.v6-shop-studio') && visible('.v63-equipment-stage') && document.querySelectorAll('.v4-shop-grid article').length>0;
    case 'report': return visible('.v4-report-grid') && document.querySelectorAll('.v4-report-player').length>=1;
    default: return false;
  }
}"""


def wait_page_ready(page: Page, name: str) -> None:
    page.wait_for_function(PAGE_READY, arg=name, timeout=30000)
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(80)


def click_nav(page: Page, label: str) -> None:
    page.get_by_role("button", name=label, exact=True).click()
    page.wait_for_timeout(100)


def unlock_report(page: Page) -> None:
    click_nav(page, "學習報表")
    dialog = page.get_by_role("dialog", name="管理者驗證")
    dialog.wait_for(timeout=10000)
    for digit in PIN:
        dialog.get_by_role("button", name=digit, exact=True).click()
    dialog.get_by_role("button", name="解鎖家長專區", exact=True).click()
    wait_page_ready(page, "report")


def goto_page(page: Page, name: str) -> None:
    if name == "home": click_nav(page, "首頁")
    elif name == "today": click_nav(page, "今日課程")
    elif name == "semester": click_nav(page, "學期日曆")
    elif name == "achievements": click_nav(page, "成就獎勵")
    elif name == "shop": click_nav(page, "寶物商店")
    elif name == "report": unlock_report(page); return
    else: raise ValueError(name)
    wait_page_ready(page, name)


METRICS_JS = r"""name => {
  const rect = el => { const r=el.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}; };
  const visible = el => { const s=getComputedStyle(el),r=el.getBoundingClientRect(); return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0; };
  const overlaps = (nodes) => {
    const rows=nodes.filter(visible).map(node=>({node,className:String(node.className||''),r:rect(node)})); const out=[];
    for(let i=0;i<rows.length;i++) for(let j=i+1;j<rows.length;j++) {
      const a=rows[i].r,b=rows[j].r,x=Math.min(a.right,b.right)-Math.max(a.left,b.left),y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
      if(x>1 && y>1) out.push({a:rows[i].className,b:rows[j].className,x:Math.round(x),y:Math.round(y)});
    }
    return out;
  };
  const hitCandidates=[...document.querySelectorAll('.v4-main-navigation button:not(:disabled),.v4-right-column .v4-lesson-content button:not(:disabled),.v4-semester-day button:not(:disabled),.v6-achievement-tabs button:not(:disabled),.v6-shop-category-tabs button:not(:disabled),.v64-character-filters button:not(:disabled),.v4-page-heading button:not(:disabled)')].filter(visible).slice(0,40);
  const startScrollY=scrollY,hitMisses=[];
  for(const el of hitCandidates){
    el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
    const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
    const top=document.elementFromPoint(x,y);
    if(!(top && (top===el || el.contains(top) || top.contains(el)))) hitMisses.push({tag:el.tagName,className:String(el.className||''),text:String(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,40),coveredBy:top?`${top.tagName}.${String(top.className||'')}`:'none'});
  }
  scrollTo({top:startScrollY,behavior:'instant'});
  const broken=[...document.images].filter(img=>{ const r=img.getBoundingClientRect(); return r.bottom>=-200&&r.top<=innerHeight+200&&img.complete&&img.naturalWidth===0&&!img.hidden; }).map(img=>img.currentSrc||img.src);
  const essentialSelectors='button,h1,h2,h3,.v4-page-heading p,.v4-daily-head p,.v4-lesson-content h3';
  const clippedText=[...document.querySelectorAll(essentialSelectors)].filter(visible).flatMap(el=>{
    const text=String(el.textContent||'').replace(/\s+/g,' ').trim();
    if(!text)return [];
    const s=getComputedStyle(el); const clipped=(el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1) && ['hidden','clip'].includes(s.overflow);
    return clipped?[{tag:el.tagName,className:String(el.className||''),text:text.slice(0,60)}]:[];
  });
  const frame=name==='home'||name==='today'?document.querySelector('.v4-dashboard-grid'):document.querySelector('.v4-secondary-main');
  const frameRect=frame?rect(frame):null;
  const header=document.querySelector('.v4-adventure-header'),nav=document.querySelector('.v4-main-navigation');
  const columns=[...document.querySelectorAll('.v4-dashboard-grid > .v4-right-column,.v4-dashboard-grid > .v4-left-column,.v4-dashboard-grid > .v4-center-column')];
  const directSurfaceOverlaps=(name==='home'||name==='today')?[
    ...overlaps(columns),
    ...columns.flatMap(col=>overlaps([...col.children])),
    ...overlaps([...document.querySelectorAll('.v4-right-column .v4-lesson-list > .v4-lesson-card')])
  ]:overlaps([...document.querySelectorAll('.v4-secondary-main > *')]);
  const domOrder=[...document.querySelectorAll('.v4-dashboard-grid > *')].map(el=>String(el.className||''));
  const mission=document.querySelector('.v4-right-column'),team=document.querySelector('.v4-left-column'),overview=document.querySelector('.v4-center-column');
  const missionR=mission?rect(mission):null,teamR=team?rect(team):null,overviewR=overview?rect(overview):null;
  const cta=document.querySelector('.v4-right-column .v4-lesson-content button'); const ctaR=cta?rect(cta):null;
  const primaryHomeCta=document.querySelector('.v64-home-primary-cta'); const primaryHomeCtaR=primaryHomeCta?rect(primaryHomeCta):null;
  return {
    viewport:{width:innerWidth,height:innerHeight},
    page:name,
    overflow:Math.max(0,Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth),
    documentHeight:document.documentElement.scrollHeight,
    frame:frameRect,
    headerWidth:header?rect(header).width:null,
    navWidth:nav?rect(nav).width:null,
    brokenImages:broken,
    hitMisses,
    clippedText,
    majorOverlaps:directSurfaceOverlaps,
    domOrder,
    compactVisualOrder:missionR&&teamR&&overviewR?missionR.top<=teamR.top+1&&teamR.top<=overviewR.top+1:null,
    homeContract:(name==='home'||name==='today')?{
      gridMinHeight:getComputedStyle(document.querySelector('.v4-dashboard-grid')).minHeight,
      rightMaxHeight:getComputedStyle(mission).maxHeight,
      rightOverflowY:getComputedStyle(mission).overflowY,
      firstChildIsMission:domOrder[0]?.includes('v4-right-column')||false,
      ctaExists:!!cta,
      ctaTop:ctaR?.top??null,
      primaryHomeCtaExists:!!primaryHomeCta,
      primaryHomeCtaTop:primaryHomeCtaR?.top??null,
      primaryHomeCtaBottom:primaryHomeCtaR?.bottom??null,
    }:null,
  };
}"""


def failures_for(metrics: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    width = metrics["viewport"]["width"]
    if metrics["overflow"] > 1: failures.append(f"horizontal overflow {metrics['overflow']}px")
    if metrics["brokenImages"]: failures.append(f"broken images {metrics['brokenImages'][:3]}")
    if metrics["hitMisses"]: failures.append(f"obstructed controls {metrics['hitMisses'][:3]}")
    if metrics["clippedText"]: failures.append(f"essential text clipped {metrics['clippedText'][:3]}")
    if metrics["majorOverlaps"]: failures.append(f"major surfaces overlap {metrics['majorOverlaps'][:3]}")
    frame = metrics.get("frame")
    if not frame or frame["width"] <= 0: failures.append("shared page frame missing")
    if frame and frame["right"] > width + 1: failures.append(f"frame escapes viewport right {frame['right']:.1f}>{width}")
    if frame and frame["left"] < -1: failures.append(f"frame escapes viewport left {frame['left']:.1f}")
    # Reading pages retain the 1920px shared frame. The Shop is the one explicit
    # ultra-wide workbench exception: T03 requires a substantial 4K preview and
    # catalogue, so it may widen from 2560px upward while staying bounded.
    is_shop_workbench = metrics.get("page") == "shop" and width >= 2560
    if width >= 1920 and frame and not is_shop_workbench and frame["width"] > 1921:
        failures.append(f"shared frame exceeds 1920px: {frame['width']:.1f}")
    if is_shop_workbench and frame:
        if frame["width"] > 3201: failures.append(f"shop workbench exceeds 3200px: {frame['width']:.1f}")
        if width >= 3200 and frame["width"] < 2800: failures.append(f"shop workbench too narrow for 4K: {frame['width']:.1f}")
    for label in ("headerWidth", "navWidth"):
        value = metrics.get(label)
        if width >= 1920 and value and value > 1921: failures.append(f"{label} exceeds 1920px: {value:.1f}")
    home = metrics.get("homeContract")
    if home:
        if not home["firstChildIsMission"]: failures.append("dashboard DOM is not mission-first")
        if home["gridMinHeight"] not in ("0px", "auto"): failures.append(f"dashboard has forced min-height {home['gridMinHeight']}")
        if home["rightMaxHeight"] not in ("none", "max-content"): failures.append(f"mission column has forced max-height {home['rightMaxHeight']}")
        if home["rightOverflowY"] in ("auto", "scroll"): failures.append(f"mission column is internally scrolling ({home['rightOverflowY']})")
        if not home["ctaExists"]: failures.append("primary lesson CTA missing")
        if metrics.get("page") == "home" and not home["primaryHomeCtaExists"]: failures.append("home primary CTA missing")
        if metrics.get("page") == "home" and width == 320 and metrics["viewport"]["height"] == 568 and home.get("primaryHomeCtaBottom") is not None and home["primaryHomeCtaBottom"] > 568:
            failures.append(f"320x568 home primary CTA falls below first viewport: {home['primaryHomeCtaBottom']:.1f}")
        if metrics.get("page") == "home" and width == 390 and metrics["viewport"]["height"] == 844 and metrics.get("documentHeight", 0) > 2110:
            failures.append(f"390x844 home exceeds 2110px compact-height target: {metrics['documentHeight']}")
        if width < 900 and metrics.get("compactVisualOrder") is not True: failures.append("compact visual order disagrees with mission-first DOM")
    return failures


def screenshot_page(page: Page, width: int, height: int, name: str) -> str:
    # Scroll once through the selected representative page so lazy images have
    # a chance to decode; only these 24 representative captures incur the cost.
    total = page.evaluate("document.documentElement.scrollHeight")
    step = max(300, height - 100)
    for top in range(0, total, step):
        page.evaluate("y=>scrollTo({top:y,behavior:'instant'})", top)
        page.wait_for_timeout(35)
    page.evaluate("scrollTo({top:0,behavior:'instant'})")
    page.wait_for_timeout(50)
    path = OUT / f"{width}x{height}-{name}.jpg"
    page.screenshot(path=str(path), full_page=True, type="jpeg", quality=86, animations="disabled", caret="hide", timeout=30000)
    return str(path.relative_to(ROOT))


def run_page_matrix(browser) -> tuple[list[dict[str, Any]], list[dict[str, str]], list[dict[str, str]], list[str]]:
    rows: list[dict[str, Any]] = []
    console_errors: list[dict[str, str]] = []
    page_errors: list[dict[str, str]] = []
    screenshots: list[str] = []
    snapshot, seed = make_snapshot(4, False)

    for width, height in VIEWPORTS:
        context = browser.new_context(viewport={"width": width, "height": height}, reduced_motion="reduce")
        context.add_init_script(seed)
        install_routes(context, snapshot)
        page = context.new_page()
        tag = f"{width}x{height}"
        page.on("console", lambda msg, wh=tag: console_errors.append({"case": wh, "text": msg.text}) if msg.type == "error" else None)
        page.on("pageerror", lambda exc, wh=tag: page_errors.append({"case": wh, "text": str(exc)}))
        page.goto(URL, wait_until="domcontentloaded", timeout=60000)
        wait_page_ready(page, "home")

        for name in PAGES:
            if name != "home": goto_page(page, name)
            else: wait_page_ready(page, name)
            metrics = page.evaluate(METRICS_JS, name)
            failures = failures_for(metrics)
            row = {"viewport": tag, "page": name, "pass": not failures, "failures": failures, "metrics": metrics}
            if (width, height) in SCREENSHOT_VIEWPORTS:
                row["screenshot"] = screenshot_page(page, width, height, name)
                screenshots.append(row["screenshot"])
            rows.append(row)
        context.close()
    return rows, console_errors, page_errors, screenshots


def run_breakpoint_scan(browser) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    snapshot, seed = make_snapshot(4, False)
    for width in BREAKPOINT_WIDTHS:
        height = 900 if width < 1600 else 1080
        context = browser.new_context(viewport={"width": width, "height": height}, reduced_motion="reduce")
        context.add_init_script(seed); install_routes(context, snapshot)
        page = context.new_page(); page.goto(URL, wait_until="domcontentloaded", timeout=60000); wait_page_ready(page, "home")
        metrics = page.evaluate(METRICS_JS, "home")
        failures = failures_for(metrics)
        rows.append({"viewport": f"{width}x{height}", "pass": not failures, "failures": failures, "metrics": metrics})
        context.close()
    return rows


def run_family_scale(browser) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    cases = [(1, False), (2, False), (4, False), (4, True), (6, False)]
    for width, height in ((390, 844), (1440, 900)):
        for learner_count, long_names in cases:
            snapshot, seed = make_snapshot(learner_count, long_names)
            context = browser.new_context(viewport={"width": width, "height": height}, reduced_motion="reduce")
            context.add_init_script(seed); install_routes(context, snapshot)
            page = context.new_page(); page.goto(URL, wait_until="domcontentloaded", timeout=60000); wait_page_ready(page, "home")
            metrics = page.evaluate(METRICS_JS, "home")
            failures = failures_for(metrics)
            actual_cards = page.locator('.v4-player-card').count()
            if actual_cards != learner_count: failures.append(f"learner cards {actual_cards}/{learner_count}")
            rows.append({
                "viewport": f"{width}x{height}", "learnerCount": learner_count, "longNames": long_names,
                "pass": not failures, "failures": failures, "metrics": metrics,
            })
            context.close()
    return rows


def run() -> int:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        rows, console_errors, page_errors, screenshots = run_page_matrix(browser)
        breakpoints = run_breakpoint_scan(browser)
        family_scale = run_family_scale(browser)
        browser.close()

    failures = [row for row in rows if not row["pass"]]
    breakpoint_failures = [row for row in breakpoints if not row["pass"]]
    family_failures = [row for row in family_scale if not row["pass"]]
    status = "PASS" if not failures and not breakpoint_failures and not family_failures and not console_errors and not page_errors else "FAIL"
    payload = {
        "schemaVersion": 2,
        "suiteName": "v64-p02-shared-layout-contract",
        "status": status,
        "auditUrl": URL,
        "scope": {
            "fixedViewports": [f"{w}x{h}" for w, h in VIEWPORTS],
            "pages": PAGES,
            "breakpointWidths": BREAKPOINT_WIDTHS,
            "familyScale": "1/2/4/6 learners + long-name case at 390 and 1440",
            "text200Percent": "NOT_FULLY_AUTOMATED: CSS viewport range covers zoom-reflow equivalents down to 320px; true browser text-only 200% remains a P12/manual-browser gate.",
        },
        "summary": {
            "pageCases": len(rows), "pagePass": len(rows) - len(failures),
            "breakpointCases": len(breakpoints), "breakpointPass": len(breakpoints) - len(breakpoint_failures),
            "familyCases": len(family_scale), "familyPass": len(family_scale) - len(family_failures),
        },
        "failures": failures,
        "breakpointFailures": breakpoint_failures,
        "familyFailures": family_failures,
        "consoleErrors": console_errors,
        "pageErrors": page_errors,
        "screenshots": screenshots,
        "rows": rows,
        "breakpoints": breakpoints,
        "familyScale": family_scale,
    }
    RESULT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": status,
        "summary": payload["summary"],
        "pageFailures": [{"viewport": r["viewport"], "page": r["page"], "failures": r["failures"]} for r in failures],
        "breakpointFailures": [{"viewport": r["viewport"], "failures": r["failures"]} for r in breakpoint_failures],
        "familyFailures": [{"viewport": r["viewport"], "learners": r["learnerCount"], "longNames": r["longNames"], "failures": r["failures"]} for r in family_failures],
        "consoleErrors": console_errors,
        "pageErrors": page_errors,
        "result": str(RESULT_PATH.relative_to(ROOT)),
    }, ensure_ascii=False, indent=2))
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(run())
