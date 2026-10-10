#!/usr/bin/env python3
import datetime, hashlib, json, os
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
from playwright.sync_api import sync_playwright
from qa_v63_browser_seed import SETTINGS, PROGRESS
from generate_v65_delivery_evidence import manifest_contracts

ROOT=Path(__file__).resolve().parents[1]
URL=os.environ.get('AUDIT_URL','http://127.0.0.1:4173/')
_report_arg=Path(os.environ['V65_PREVIEW_REPORT']) if os.environ.get('V65_PREVIEW_REPORT') else None
OUT=(_report_arg if _report_arg and _report_arg.is_absolute() else ROOT/_report_arg).resolve() if _report_arg else ROOT/'qa'/'production-audit'/'2026-09-02'/'all-shop-items-preview.json'; OUT.parent.mkdir(parents=True,exist_ok=True)
TIME=json.dumps({'now':'2026-09-02T02:30:00.000Z','activeDate':'2026-09-02','taipeiDate':'2026-09-02','taipeiTime':'10:30:00','timeZone':'Asia/Taipei'})
AVATARS=[('brother',1440,900),('younger',1024,768),('sister',390,844),('younger-sister',1920,1080)]
CATEGORIES=['角色裝備','飛船','基地','機器夥伴','卡面','特效']
_capture_arg=Path(os.environ['V65_DELIVERY_VISUAL_DIR']) if os.environ.get('V65_DELIVERY_VISUAL_DIR') else None
CAPTURE_ROOT=(_capture_arg if _capture_arg and _capture_arg.is_absolute() else ROOT/_capture_arg).resolve() if _capture_arg else None
CANDIDATE_FINGERPRINT=os.environ.get('V65_CANDIDATE_FINGERPRINT','')
DIAGNOSTIC_AVATAR=os.environ.get('V65_DIAGNOSTIC_AVATAR','')
DIAGNOSTIC_ITEM=os.environ.get('V65_DIAGNOSTIC_ITEM','')

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def required_runtime_paths():
  wearable,world=manifest_contracts(); out={}
  for (item,avatar),contract in wearable.items(): out[(item,avatar)]=contract['requiredRuntimePaths']
  for item,record in world.items(): out[(item,'world')]=[record['delivery']['path']]
  return out

def build_boards(rows):
  boards=[]
  for start in range(0,len(rows),16):
    group=rows[start:start+16]; board=Image.new('RGB',(1280,1120),'#11182d'); draw=ImageDraw.Draw(board)
    for index,row in enumerate(group):
      col=index%4; line=index//4; x=col*320; y=line*280
      with Image.open(ROOT/row['screenshot']['path']) as source:
        thumb=ImageOps.contain(source.convert('RGB'),(300,230)); board.paste(thumb,(x+(300-thumb.width)//2+10,y+8))
      draw.text((x+10,y+242),row['deliveryId'],fill='white')
      draw.text((x+10,y+258),row['previewMode'],fill='#9dd9ff')
    path=CAPTURE_ROOT/'boards'/f'board-{start//16+1:02d}.jpg'; path.parent.mkdir(parents=True,exist_ok=True); board.save(path,quality=92)
    boards.append({'path':path.relative_to(ROOT).as_posix(),'sha256':sha(path),'deliveries':[r['deliveryId'] for r in group]})
  by_id={delivery:board for board in boards for delivery in board['deliveries']}
  for row in rows: row['reviewBoard']={k:v for k,v in by_id[row['deliveryId']].items() if k!='deliveries'}
  return boards

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
    # The preview column can sit above a long mobile catalog. Bring the real
    # stage into view so lazy split layers and world effects receive the same
    # visibility signal they get when a learner looks at the result.
    stage.evaluate("e=>e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'})")
    page.wait_for_function("id => document.querySelector('.v63-equipment-stage')?.dataset.previewItem === id",arg=item_id,timeout=4000)
    actual=stage.get_attribute('data-preview-mode')
    if actual!=mode: return False,f'mode expected {mode}, got {actual}'
    if mode in ('avatar','effect'):
      avatar=stage.locator('.avatar-renderer').first
      if not avatar.is_visible(): return False,'avatar renderer missing'
      # V6.4 keeps the previous complete look visible while paired detail or
      # split layers decode. Judge the requested trial only after its complete
      # runtime object is mounted, rather than racing that deliberate handoff.
      page.wait_for_function("""id => {
        const avatar=document.querySelector('.v63-equipment-stage .avatar-renderer');
        if(!avatar) return false;
        const rendered=(avatar.dataset.renderedItems||'').split(/\s+/).filter(Boolean);
        return rendered.includes(id)||avatar.dataset.skin===id;
      }""",arg=item_id,timeout=10000)
      rendered=(avatar.get_attribute('data-rendered-items') or '').split()
      skin=avatar.get_attribute('data-skin') or ''
      if item_id not in rendered and skin!=item_id: return False,f'item not rendered: rendered={rendered}, skin={skin}'
      if mode=='effect':
        page.wait_for_function("""id=>{const i=document.querySelector(`.v63-equipment-stage img.v64-effect-art[data-effect-item=\"${id}\"]`);return !!i&&i.complete&&i.naturalWidth>0}""",arg=item_id,timeout=10000)
    elif mode=='ship':
      page.wait_for_function("()=>{const i=document.querySelector('.v63-equipment-stage .v63-ship-art');return !!i&&i.complete&&i.naturalWidth>0}",timeout=4000)
      img=stage.locator('.v63-ship-art');
      if not img.is_visible() or img.evaluate('(i)=>i.naturalWidth')<=0: return False,'ship preview image missing/broken'
    elif mode=='robot':
      page.wait_for_function("()=>{const i=document.querySelector('.v63-equipment-stage .v63-robot-art');return !!i&&i.complete&&i.naturalWidth>0}",timeout=4000)
      img=stage.locator('.v63-robot-art');
      if not img.is_visible() or img.evaluate('(i)=>i.naturalWidth')<=0: return False,'robot preview image missing/broken'
    elif mode=='card':
      page.wait_for_function("()=>{const i=document.querySelector('.v63-equipment-stage .v63-card-art');return !!i&&i.complete&&i.naturalWidth>0}",timeout=4000)
      img=stage.locator('.v63-card-art');
      if not img.is_visible() or img.evaluate('(i)=>i.naturalWidth')<=0: return False,'card preview image missing/broken'
    elif mode=='world':
      if stage.get_attribute('data-room')!=item_id: return False,'room preview did not apply'
    return True,''

def run():
  results=[]; console_errors=[]; page_errors=[]; visual_rows=[]; required=required_runtime_paths()
  if CAPTURE_ROOT:
    CAPTURE_ROOT.mkdir(parents=True,exist_ok=False); (CAPTURE_ROOT/'screenshots').mkdir()
  with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    for avatar,w,h in AVATARS:
      if DIAGNOSTIC_AVATAR and avatar != DIAGNOSTIC_AVATAR: continue
      context=browser.new_context(viewport={'width':w,'height':h},reduced_motion='reduce')
      context.add_init_script(seed(avatar)); context.route('**/api/server-time',route_time); context.route('**/api/time',route_time)
      page=context.new_page(); page.on('console',lambda msg,a=console_errors: a.append({'avatar':avatar,'text':msg.text}) if msg.type=='error' else None); page.on('pageerror',lambda exc,a=page_errors:a.append({'avatar':avatar,'text':str(exc)}))
      page.goto(URL,wait_until='domcontentloaded',timeout=45000); page.wait_for_selector('.v4-dashboard-grid',timeout=30000); page.get_by_role('button',name='寶物商店',exact=True).click(); page.wait_for_selector('.v6-shop-studio',timeout=10000)
      seen=set()
      for category in CATEGORIES:
        page.get_by_role('tab',name=category,exact=True).click(); page.wait_for_timeout(50)
        # V6.4 progressively discloses large character catalogs. Expand the
        # current category completely so this legacy all-item gate still
        # proves every historical item can be previewed.
        while True:
          more=page.locator('.v64-load-more')
          if more.count()==0 or not more.is_visible(): break
          more.click(); page.wait_for_timeout(35)
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
          if DIAGNOSTIC_ITEM and item_id == DIAGNOSTIC_ITEM:
            page.evaluate("""async () => {
              const images=[...document.querySelectorAll('.v63-equipment-stage img')].filter(image => {
                const style=getComputedStyle(image), rect=image.getBoundingClientRect();
                return style.display!=='none' && style.visibility!=='hidden' && rect.width>0 && rect.height>0;
              });
              await Promise.all(images.map(image => image.decode()));
              await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            }""")
            page.locator('.v63-equipment-stage').screenshot(path=f'/tmp/v65-{avatar}-{item_id}.png',animations='disabled')
            diagnostic=page.evaluate("""() => {
              const renderer=document.querySelector('.v63-equipment-stage .avatar-renderer');
              const skin=renderer?.querySelector('.avatar-renderer-skin');
              const blink=renderer?.querySelector('.avatar-renderer-blink-frame');
              const layerState=[...document.querySelectorAll('.v63-equipment-stage .avatar-wearable-layer')].map(image => ({
                itemId:image.dataset.wearableItem, src:image.currentSrc || image.src,
                visible:getComputedStyle(image).visibility, display:getComputedStyle(image).display,
                naturalWidth:image.naturalWidth, naturalHeight:image.naturalHeight,
              }));
              const state=image => image ? ({src:image.currentSrc || image.src, complete:image.complete,
                naturalWidth:image.naturalWidth, naturalHeight:image.naturalHeight,
                visibility:getComputedStyle(image).visibility, display:getComputedStyle(image).display,
                opacity:getComputedStyle(image).opacity, maskImage:getComputedStyle(image).maskImage,
                maskMode:getComputedStyle(image).maskMode}) : null;
              return {cosmetics:renderer?.dataset.cosmetics, renderedItems:renderer?.dataset.renderedItems,
                skinId:renderer?.dataset.skin, runtimeDetail:renderer?.dataset.runtimeDetail,
                skin:state(skin), blink:state(blink), layers:layerState};
            }""")
            print(json.dumps({'diagnosticAvatar':avatar,'diagnosticItem':item_id,'state':diagnostic},ensure_ascii=False,indent=2))
          results.append({'avatar':avatar,'viewport':f'{w}x{h}','itemId':item_id,'previewMode':mode,'pass':bool(ok),'detail':detail})
          delivery_avatar='world' if (item_id,'world') in required else avatar
          delivery_id=f'{item_id}:{delivery_avatar}'
          should_capture=bool(CAPTURE_ROOT and ok and (delivery_avatar!='world' or avatar=='brother'))
          if should_capture and (item_id,delivery_avatar) in required:
            shot=CAPTURE_ROOT/'screenshots'/f'{item_id}__{delivery_avatar}.png'
            stage=page.locator('.v63-equipment-stage')
            page.wait_for_function("""() => {
              const stage=document.querySelector('.v63-equipment-stage'); if(!stage) return false;
              const visible=[...stage.querySelectorAll('img')].filter(image => {
                const style=getComputedStyle(image), rect=image.getBoundingClientRect();
                return style.display!=='none' && style.visibility!=='hidden' && rect.width>0 && rect.height>0;
              });
              return visible.length>0 && visible.every(image => image.complete && image.naturalWidth>0);
            }""",timeout=10000)
            if mode in ('avatar','effect'):
              page.wait_for_function("""() => {
                const image=document.querySelector('.v63-equipment-stage .avatar-renderer-skin');
                if(!image || !image.complete || image.naturalWidth<=0) return false;
                const style=getComputedStyle(image), rect=image.getBoundingClientRect();
                return style.display!=='none' && style.visibility!=='hidden' && style.opacity!=='0' && rect.width>0 && rect.height>0;
              }""",timeout=10000)
            # complete/naturalWidth only proves bytes arrived. Chromium can still
            # expose that state before the decoded pixels reach the compositor,
            # which produced intermittent accessory-only evidence. Require every
            # visible stage image to decode, then cross two paint frames.
            page.evaluate("""async () => {
              const images=[...document.querySelectorAll('.v63-equipment-stage img')].filter(image => {
                const style=getComputedStyle(image), rect=image.getBoundingClientRect();
                return style.display!=='none' && style.visibility!=='hidden' && rect.width>0 && rect.height>0;
              });
              await Promise.all(images.map(image => image.decode()));
              await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            }""")
            stage.screenshot(path=str(shot),animations='disabled')
            observed=page.evaluate("""() => [...new Set([
              ...performance.getEntriesByType('resource').map(entry => new URL(entry.name, location.href).pathname),
              ...[...document.querySelectorAll('.v63-equipment-stage img')].map(img => new URL(img.currentSrc || img.src, location.href).pathname),
              ...[document.querySelector('.v63-equipment-stage'), document.querySelector('.v63-stage-backdrop')]
                .filter(Boolean)
                .flatMap(element => [getComputedStyle(element).backgroundImage, getComputedStyle(element).getPropertyValue('--showcase-scene')])
                .flatMap(value => [...value.matchAll(/url\\(["']?([^"')]+)["']?\\)/g)].map(match => new URL(match[1], location.href).pathname))
            ])]""")
            expected=required[(item_id,delivery_avatar)]
            missing=[path for path in expected if '/'+path.removeprefix('public/') not in observed]
            if missing:
              results.append({'avatar':avatar,'viewport':f'{w}x{h}','itemId':item_id,'previewMode':mode,'pass':False,'detail':f'required runtime not browser-observed: {missing}'})
            visual_rows.append({'deliveryId':delivery_id,'itemId':item_id,'avatarId':delivery_avatar,'previewMode':mode,'viewport':f'{w}x{h}','requiredRuntimePaths':expected,'observedResourcePaths':observed,'runtimeObservationPass':not missing,'screenshot':{'path':shot.relative_to(ROOT).as_posix(),'sha256':sha(shot)}})
      if len(seen)!=63:
        results.append({'avatar':avatar,'viewport':f'{w}x{h}','itemId':'__catalog_count__','previewMode':'audit','pass':False,'detail':f'seen {len(seen)} / 63'})
      page.wait_for_timeout(250)
      broken=page.evaluate("[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&!i.hidden).map(i=>({src:i.currentSrc||i.getAttribute('src')||'',html:i.outerHTML}))")
      if broken: results.append({'avatar':avatar,'viewport':f'{w}x{h}','itemId':'__broken_images__','previewMode':'audit','pass':False,'detail':broken})
      context.close()
    browser.close()
  failed=[r for r in results if not r['pass']]
  summary={'pass':sum(r['pass'] for r in results),'total':len(results),'expectedItemPreviews':63*4,'failed':failed,'consoleErrors':console_errors,'pageErrors':page_errors}
  OUT.write_text(json.dumps({'summary':summary,'results':results},ensure_ascii=False,indent=2),encoding='utf-8')
  if CAPTURE_ROOT:
    visual_rows.sort(key=lambda row:row['deliveryId']); boards=build_boards(visual_rows)
    report={'schemaVersion':1,'suite':'v65-current-delivery-visual-runtime','createdAt':datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(),'status':'PASS_PENDING_ROOT_VISUAL' if len(visual_rows)==207 and all(r['runtimeObservationPass'] for r in visual_rows) and not failed and not console_errors and not page_errors else 'FAIL','candidateFingerprint':CANDIDATE_FINGERPRINT,'sourceUrl':URL,'isolatedFixture':True,'counts':{'deliveryRows':len(visual_rows),'screenshots':len(visual_rows),'boards':len(boards)},'rows':visual_rows,'boards':boards,'errors':[r for r in results if not r['pass']]}
    (CAPTURE_ROOT/'runtime-visual-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    summary['v65DeliveryVisual']={'status':report['status'],'rows':len(visual_rows),'boards':len(boards),'path':(CAPTURE_ROOT/'runtime-visual-report.json').relative_to(ROOT).as_posix()}
  print(json.dumps({'pass':summary['pass'],'total':summary['total'],'expectedItemPreviews':summary['expectedItemPreviews'],'failed':failed[:20],'consoleErrors':len(console_errors),'pageErrors':len(page_errors)},ensure_ascii=False,indent=2))
  capture_ok=not CAPTURE_ROOT or (len(visual_rows)==207 and all(r['runtimeObservationPass'] for r in visual_rows))
  return 0 if len([r for r in results if r['itemId'] not in ('__catalog_count__','__broken_images__')])==63*4 and not failed and not console_errors and not page_errors and capture_ok else 1

if __name__=='__main__': raise SystemExit(run())
