#!/usr/bin/env python3
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
from qa_v63_browser_seed import SETTINGS, PROGRESS

ROOT=Path(__file__).resolve().parents[1]
URL=os.environ.get('AUDIT_URL','http://127.0.0.1:4173/')
OUT=ROOT/'qa'/'production-audit'/'2026-09-02'/'all-shop-items-preview.json'; OUT.parent.mkdir(parents=True,exist_ok=True)
TIME=json.dumps({'now':'2026-09-02T02:30:00.000Z','activeDate':'2026-09-02','taipeiDate':'2026-09-02','taipeiTime':'10:30:00','timeZone':'Asia/Taipei'})
AVATARS=[('brother',1440,900),('younger',1024,768),('sister',390,844),('younger-sister',1920,1080)]
CATEGORIES=['角色裝備','飛船','基地','機器夥伴','卡面','特效']

def seed(avatar):
    settings=json.loads(json.dumps(SETTINGS,ensure_ascii=False)); settings['children'][0]['avatar']=avatar
    progress=json.loads(json.dumps(PROGRESS,ensure_ascii=False))
    return f"""(() => {{
      const settings={json.dumps(settings,ensure_ascii=False)}; const progress={json.dumps(progress,ensure_ascii=False)};
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem('star-learning-v40:__local__:settings',JSON.stringify(settings));
      localStorage.setItem('star-learning-v40:__local__:progress',JSON.stringify(progress));
      localStorage.setItem('star-learning-v40:__local__:attendance','{{}}');
      localStorage.setItem('star-learning-v40:__local__:reflections','{{}}');
      localStorage.setItem('little-explorers-v4-sound','off');
      sessionStorage.setItem('star-learning-v40:__local__:active-user','user-father');
    }})();"""

def route_time(route): route.fulfill(status=200,content_type='application/json',body=TIME)

def validate_stage(page,item_id,mode):
    stage=page.locator('.v63-equipment-stage')
    page.wait_for_function("id => document.querySelector('.v63-equipment-stage')?.dataset.previewItem === id",arg=item_id,timeout=4000)
    actual=stage.get_attribute('data-preview-mode')
    if actual!=mode: return False,f'mode expected {mode}, got {actual}'
    if mode in ('avatar','effect'):
      avatar=stage.locator('.avatar-renderer').first
      if not avatar.is_visible(): return False,'avatar renderer missing'
      rendered=(avatar.get_attribute('data-rendered-items') or '').split()
      skin=avatar.get_attribute('data-skin') or ''
      if item_id not in rendered and skin!=item_id: return False,f'item not rendered: rendered={rendered}, skin={skin}'
    elif mode=='ship':
      img=stage.locator('.v63-ship-art');
      if not img.is_visible() or img.evaluate('(i)=>i.naturalWidth')<=0: return False,'ship preview image missing/broken'
    elif mode=='robot':
      img=stage.locator('.v63-robot-art');
      if not img.is_visible() or img.evaluate('(i)=>i.naturalWidth')<=0: return False,'robot preview image missing/broken'
    elif mode=='card':
      img=stage.locator('.v63-card-art');
      if not img.is_visible() or img.evaluate('(i)=>i.naturalWidth')<=0: return False,'card preview image missing/broken'
    elif mode=='world':
      if stage.get_attribute('data-room')!=item_id: return False,'room preview did not apply'
    return True,''

def run():
  results=[]; console_errors=[]; page_errors=[]
  with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    for avatar,w,h in AVATARS:
      context=browser.new_context(viewport={'width':w,'height':h},reduced_motion='reduce')
      context.add_init_script(seed(avatar)); context.route('**/api/server-time',route_time); context.route('**/api/time',route_time)
      page=context.new_page(); page.on('console',lambda msg,a=console_errors: a.append({'avatar':avatar,'text':msg.text}) if msg.type=='error' else None); page.on('pageerror',lambda exc,a=page_errors:a.append({'avatar':avatar,'text':str(exc)}))
      page.goto(URL,wait_until='domcontentloaded',timeout=45000); page.wait_for_selector('.v4-dashboard-grid',timeout=30000); page.get_by_role('button',name='寶物商店',exact=True).click(); page.wait_for_selector('.v6-shop-studio',timeout=10000)
      seen=set()
      for category in CATEGORIES:
        page.get_by_role('tab',name=category,exact=True).click(); page.wait_for_timeout(50)
        cards=page.locator('.v4-shop-grid article[data-item-id]')
        for idx in range(cards.count()):
          card=cards.nth(idx); item_id=card.get_attribute('data-item-id'); mode=card.get_attribute('data-preview-mode')
          if not item_id or not mode: continue
          seen.add(item_id)
          button=card.locator('.v6-preview-button')
          disabled=button.is_disabled()
          ok=False; detail='preview disabled' if disabled else ''
          if not disabled:
            button.click(); page.wait_for_timeout(35)
            try: ok,detail=validate_stage(page,item_id,mode)
            except Exception as exc: detail=str(exc)
          results.append({'avatar':avatar,'viewport':f'{w}x{h}','itemId':item_id,'previewMode':mode,'pass':bool(ok),'detail':detail})
      if len(seen)!=63:
        results.append({'avatar':avatar,'viewport':f'{w}x{h}','itemId':'__catalog_count__','previewMode':'audit','pass':False,'detail':f'seen {len(seen)} / 63'})
      broken=page.evaluate("[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&!i.hidden).map(i=>i.currentSrc||i.src)")
      if broken: results.append({'avatar':avatar,'viewport':f'{w}x{h}','itemId':'__broken_images__','previewMode':'audit','pass':False,'detail':broken})
      context.close()
    browser.close()
  failed=[r for r in results if not r['pass']]
  summary={'pass':sum(r['pass'] for r in results),'total':len(results),'expectedItemPreviews':63*4,'failed':failed,'consoleErrors':console_errors,'pageErrors':page_errors}
  OUT.write_text(json.dumps({'summary':summary,'results':results},ensure_ascii=False,indent=2),encoding='utf-8')
  print(json.dumps({'pass':summary['pass'],'total':summary['total'],'expectedItemPreviews':summary['expectedItemPreviews'],'failed':failed[:20],'consoleErrors':len(console_errors),'pageErrors':len(page_errors)},ensure_ascii=False,indent=2))
  return 0 if len(results)==63*4 and not failed and not console_errors and not page_errors else 1

if __name__=='__main__': raise SystemExit(run())
