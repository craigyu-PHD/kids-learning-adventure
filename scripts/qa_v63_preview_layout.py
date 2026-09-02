#!/usr/bin/env python3
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
from qa_v63_browser_seed import SEED_SCRIPT

ROOT=Path(__file__).resolve().parents[1]
URL=os.environ.get('AUDIT_URL','http://127.0.0.1:4174/')
OUT=ROOT/'qa/production-audit/2026-09-02/v63-preview-layout.json'; OUT.parent.mkdir(parents=True,exist_ok=True)
TIME=json.dumps({'now':'2026-09-02T02:30:00.000Z','activeDate':'2026-09-02','taipeiDate':'2026-09-02','taipeiTime':'10:30:00','timeZone':'Asia/Taipei'})
VIEWPORTS=[(390,844),(768,1024),(1440,900),(3440,1440)]
REPRESENTATIVES=[
 ('角色裝備','outfit-legend','avatar','.avatar-renderer'),
 ('飛船','ship-legend','ship','.v63-ship-art'),
 ('基地','room-legend','world','.v63-avatar-stage'),
 ('機器夥伴','robot-legend','robot','.v63-robot-art'),
 ('卡面','card-legend','card','.v63-card-tilt'),
 ('特效','effect-legend','effect','.v63-effect-stage .avatar-renderer'),
]

def route_time(route): route.fulfill(status=200,content_type='application/json',body=TIME)

def rect(page,selector):
    return page.locator(selector).first.evaluate('(el)=>{const r=el.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height}}')

def contained(outer,inner,tolerance=3):
    return inner['l']>=outer['l']-tolerance and inner['r']<=outer['r']+tolerance and inner['t']>=outer['t']-tolerance and inner['b']<=outer['b']+tolerance

def ensure_card_visible(page,item_id):
    card=page.locator(f'article[data-item-id="{item_id}"]')
    while card.count()==0:
        more=page.locator('.v64-load-more')
        if more.count()==0 or not more.is_visible(): break
        more.click(); page.wait_for_timeout(40)
    return card

def run():
  rows=[]
  with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    for w,h in VIEWPORTS:
      c=browser.new_context(viewport={'width':w,'height':h},reduced_motion='reduce'); c.add_init_script(SEED_SCRIPT); c.route('**/api/server-time',route_time); c.route('**/api/time',route_time)
      p=c.new_page(); p.goto(URL,wait_until='domcontentloaded',timeout=45000); p.wait_for_selector('.v4-dashboard-grid'); p.get_by_role('button',name='寶物商店',exact=True).click(); p.wait_for_selector('.v6-shop-studio')
      for category,item_id,mode,visual_selector in REPRESENTATIVES:
        p.get_by_role('tab',name=category,exact=True).click(); card=ensure_card_visible(p,item_id); card.locator('.v6-preview-button').click(); p.wait_for_function("id=>document.querySelector('.v63-equipment-stage')?.dataset.previewItem===id",arg=item_id)
        stage_locator=p.locator('.v63-equipment-stage'); stage_locator.scroll_into_view_if_needed(); p.wait_for_timeout(120)
        scoped_selector=f'.v63-equipment-stage {visual_selector}'
        p.wait_for_function("sel=>{const el=document.querySelector(sel);if(!el)return false;const r=el.getBoundingClientRect();const imageOK=el.tagName!=='IMG'||el.naturalWidth>0;return imageOK&&r.width>24&&r.height>24}",arg=scoped_selector,timeout=4000)
        stage=rect(p,'.v63-equipment-stage'); visual=rect(p,scoped_selector)
        page_overflow=p.evaluate('Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth')
        mode_ok=p.locator('.v63-equipment-stage').get_attribute('data-preview-mode')==mode
        visible_area=visual['w']>24 and visual['h']>24
        in_stage=contained(stage,visual,5)
        rows.append({'viewport':f'{w}x{h}','itemId':item_id,'mode':mode,'pass':mode_ok and visible_area and in_stage and page_overflow<=1,'modeOK':mode_ok,'visualInsideStage':in_stage,'visualSizeOK':visible_area,'overflow':page_overflow,'stage':stage,'visual':visual})
      shot=OUT.parent/f'v63-shop-{w}x{h}.png'; p.screenshot(path=str(shot),full_page=True)
      c.close()
    browser.close()
  failed=[x for x in rows if not x['pass']]; OUT.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
  print(json.dumps({'pass':len(rows)-len(failed),'total':len(rows),'failed':failed},ensure_ascii=False,indent=2))
  return 0 if not failed else 1
if __name__=='__main__': raise SystemExit(run())
