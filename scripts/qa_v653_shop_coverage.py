"""Current local 63 x 4 Shop lifecycle and per-item screenshots; synthetic local data only."""
import argparse,copy,hashlib,json,re,sys,traceback
from pathlib import Path
from urllib.parse import urlsplit,unquote
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'qa/v653/20261005/shop-coverage'
URL='http://127.0.0.1:5178/'
AVATARS=['brother','younger','sister','younger-sister']
SLOTS=['hairstyle','outfit','hat','glasses','backpack','cape','headphones','spaceship','room','robot','card','effect']
LABELS=dict(zip(SLOTS,['髮型','服裝','帽子','眼鏡','背包','披風','耳機','飛船','基地','機器夥伴','卡面','特效']))
KEY='star-learning-v40:__local__:progress'
TIME={'now':'2026-10-06T02:00:00.000Z','activeDate':'2026-10-06','taipeiDate':'2026-10-06','taipeiTime':'10:00:00','timeZone':'Asia/Taipei'}
SOURCES=['src/App.tsx','src/cosmetics.ts','src/components/AvatarRenderer.tsx','src/avatarAssetRegistry.ts','src/data/avatarAssetManifest.json','src/data/worldArtManifest.json','src/components/TreasureShowcase.tsx','src/v4/SecondaryViews.tsx','src/v4/Dashboard.tsx','src/equipmentPreview.ts']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def pins():return {f:sha(ROOT/f) for f in SOURCES}
def inventory():
 text=(ROOT/'src/cosmetics.ts').read_text().split('export const cosmetics:')[1].split('];')[0]
 rows=[dict(zip(['id','slot','name'],m.groups())) for m in re.finditer(r"id:'([^']+)',slot:'([^']+)',name:'([^']+)'",text)]
 assert len(rows)==63 and len({x['id'] for x in rows})==63
 return rows
DECODE=r'''async e=>{const visible=n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return r.width>0&&r.height>0&&s.visibility==='visible'&&s.display!=='none'&&Number(s.opacity)>0};const imgs=[...(e.tagName==='IMG'?[e]:[]),...e.querySelectorAll('img')].filter(visible);const urls=new Set();const rows=[];for(const i of imgs){await Promise.race([i.decode(),new Promise((_,r)=>setTimeout(()=>r(Error('decode timeout '+i.src)),12000))]);if(!i.naturalWidth)throw Error('empty image '+i.src);urls.add(i.currentSrc);rows.push({src:new URL(i.currentSrc).pathname,width:i.naturalWidth,height:i.naturalHeight,cls:i.className,mask:getComputedStyle(i).maskImage,rect:i.getBoundingClientRect().toJSON()});}for(const n of [e,...e.querySelectorAll('*')]){if(!visible(n))continue;for(const v of [getComputedStyle(n).backgroundImage,getComputedStyle(n).maskImage,getComputedStyle(n).borderImageSource,getComputedStyle(n,'::before').backgroundImage,getComputedStyle(n,'::after').backgroundImage,getComputedStyle(n,'::after').borderImageSource])for(const m of v.matchAll(/url\(["']?([^"')]+)["']?\)/g))urls.add(new URL(m[1],location.href).href);}for(const u of urls){const i=new Image();i.crossOrigin='anonymous';i.src=u;await Promise.race([i.decode(),new Promise((_,r)=>setTimeout(()=>r(Error('css image timeout '+u)),12000))]);}await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return {images:rows,urls:[...urls].map(u=>new URL(u).pathname),text:e.innerText,style:{background:getComputedStyle(e).backgroundImage,roomVar:getComputedStyle(e).getPropertyValue('--equipped-room-scene'),room:e.dataset.room,visibility:getComputedStyle(e).visibility,opacity:getComputedStyle(e).opacity},mode:e.dataset.previewMode,item:e.dataset.previewItem,renderers:[...(e.matches('.avatar-renderer')?[e]:[]),...e.querySelectorAll('.avatar-renderer')].map(n=>({avatar:n.className,skin:n.dataset.skin,rendered:n.dataset.renderedItems,details:n.dataset.runtimeDetails}))};}'''
def snapshot(page):return page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--avatar',choices=AVATARS,required=True);ap.add_argument('--attempt',required=True);ap.add_argument('--items',default='');args=ap.parse_args()
 items=inventory();BASE.mkdir(parents=True,exist_ok=True)
 inv={'count':len(items),'wearableCount':sum(i['slot'] in SLOTS[:7] for i in items),'worldCount':sum(i['slot'] in SLOTS[7:] for i in items),'slots':{s:sum(i['slot']==s for i in items) for s in SLOTS},'items':items,'petStatus':'NO_PET_SLOT_OR_PRODUCT; robot is existing companion renderer'}
 (BASE/'inventory.json').write_text(json.dumps(inv,ensure_ascii=False,indent=2))
 if args.items:items=[x for x in items if x['id'] in args.items.split(',')]
 out=BASE/args.attempt/args.avatar;out.mkdir(parents=True,exist_ok=False)
 frozen=pins();report={'status':'RUNNING','avatar':args.avatar,'sourcePins':frozen,'cases':[],'visualReview':'NOT_PERFORMED','fixture':'empty local progress with one synthetic owned item per case; no actual purchase or cloud','url':URL};save=lambda:(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 store=json.loads((ROOT/'qa/v653/20261005/lessons/default-storage.json').read_text());settings=json.loads(store['star-learning-v40:__local__:settings']);settings.update(theme='light',homeDisplayLearnerId='child-1');settings['children'][0].update(avatar=args.avatar,name={'brother':'哥哥','younger':'弟弟','sister':'姐姐','younger-sister':'妹妹'}[args.avatar]);store['star-learning-v40:__local__:settings']=json.dumps(settings);store['little-explorers-v4-sound']='off';blank=json.loads(store[KEY]);served={};world_records=json.loads((ROOT/'src/data/worldArtManifest.json').read_text())['records']
 with sync_playwright() as p:
  browser=p.chromium.launch();context=browser.new_context(viewport={'width':1440,'height':1050},reduced_motion='reduce',service_workers='block');context.route_web_socket('**',lambda ws:None)
  context.route('**/api/**',lambda r:r.fulfill(status=200,json=TIME) if urlsplit(r.request.url).path in ['/api/time','/api/server-time'] else r.fulfill(status=503,body='isolated synthetic shop QA'))
  page=context.new_page();page.set_default_timeout(15000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(URL,wait_until='domcontentloaded')
  def proof_assets(proof):
   refs=[]
   for path in set(proof['urls']):
    if not path.startswith('/assets/'):continue
    if path not in served:
     local=ROOT/'public'/unquote(path.removeprefix('/'));digest=sha(local);response=context.request.get(URL.rstrip('/')+path,timeout=15000);assert response.status==200;actual=hashlib.sha256(response.body()).hexdigest();assert actual==digest,(path,'HTTP/local sha mismatch');served[path]={'sha256':actual,'status':200};response.dispose()
    refs.append({'path':path,**served[path]})
   return refs
  for item in items:
   ident=item['id'];row={**item,'status':'RUNNING'};start_errors=len(errors)
   try:
    assert pins()==frozen,'source drift before case; stop and start fresh candidate'
    progress=copy.deepcopy(blank);progress['child-1'].update(unlockedCosmetics=[ident],equippedCosmetics=[],purchaseTransactions=[{'id':'fixture-owned-'+ident,'childId':'child-1','itemId':ident,'cost':0,'createdAt':'2026-09-02T00:00:00.000Z','source':'purchase'}]);store[KEY]=json.dumps(progress)
    page.evaluate('(s)=>{localStorage.clear();sessionStorage.clear();for(const[k,v]of Object.entries(s))localStorage.setItem(k,v)}',store);page.reload(wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for();page.get_by_role('button',name='寶物商店',exact=True).first.click();page.locator('#shop-learner-tab-child-1').click();page.get_by_role('tab',name=LABELS[item['slot']],exact=True).click()
    card=page.locator(f'article[data-item-id="{ident}"]')
    for _ in range(10):
     if card.count():break
     page.locator('.v64-load-more').click()
    assert card.count()==1;card.scroll_into_view_if_needed();cat=card.locator('.v4-item-art');catalog=cat.evaluate(DECODE);row['catalog']=catalog;row['catalogAssets']=proof_assets(catalog)
    card.locator('.v6-preview-button').click();stage=page.locator('.v63-equipment-stage');page.wait_for_function('id=>document.querySelector(".v63-equipment-stage")?.dataset.previewItem===id',arg=ident);stage.scroll_into_view_if_needed();trial=stage.evaluate(DECODE);row['trial']=trial;row['trialAssets']=proof_assets(trial)
    stage.screenshot(path=str(out/(ident+'--trial.png')),animations='disabled');row['screenshot']=str(out/(ident+'--trial.png'));row['screenshotSHA256']=sha(out/(ident+'--trial.png'))
    before=snapshot(page);card.locator('.v6-preview-button').click();page.wait_for_function('id=>document.querySelector(".v63-equipment-stage")?.dataset.previewItem!==id',arg=ident);assert snapshot(page)==before;row['cancelPreservesProgress']=True
    card.get_by_role('button',name='立即穿上' if trial['mode']=='avatar' else '立即使用',exact=True).click();page.wait_for_function('([k,i])=>JSON.parse(localStorage.getItem(k))["child-1"].equippedCosmetics.includes(i)',arg=[KEY,ident]);equipped=snapshot(page);assert equipped['child-2']==before['child-2'];assert len(equipped['child-1']['equipmentTransactions'])==1;assert equipped['child-1']['equipmentTransactions'][0]['itemId']==ident
    page.get_by_role('button',name='首頁',exact=True).first.click();page.locator('.v4-dashboard-grid').wait_for();home=page.locator('.v65-home-display-selector .avatar-renderer').first;home.scroll_into_view_if_needed();row['homeAvatar']=home.evaluate(DECODE)
    if item['slot'] in SLOTS[:7]+['effect']:
     assert ident in row['homeAvatar']['renderers'][0]['rendered'].split() if row['homeAvatar']['renderers'] else ident in (home.get_attribute('data-rendered-items') or '').split()
    else:
     world=page.locator('.v6-equipped-header-ship' if item['slot']=='spaceship' else '.v6-ai-robot-art' if item['slot']=='robot' else '.v4-dashboard-grid' if item['slot']=='room' else '.v4-lesson-card').first;world.scroll_into_view_if_needed();row['homeWorld']=world.evaluate(DECODE if item['slot'] in ['spaceship','robot'] else DECODE.replace("const imgs=[...(e.tagName==='IMG'?[e]:[]),...e.querySelectorAll('img')].filter(visible)","const imgs=[]").replace("[e,...e.querySelectorAll('*')]","[e]"));row['homeWorldAssets']=proof_assets(row['homeWorld'])
     record=next(r for r in world_records if r['itemId']==ident);expected_world=[]
     def paths(value):
      if isinstance(value,dict):
       if isinstance(value.get('path'),str):expected_world.append('/'+value['path'].removeprefix('public/'))
       for v in value.values():paths(v)
      elif isinstance(value,list):
       for v in value:paths(v)
     paths(record);assert set(row['homeWorld']['urls'])&set(expected_world),('home missing exact equipped world art',ident,row['homeWorld']['urls']);world.screenshot(path=str(out/(ident+'--home.png')),animations='disabled')
    assert snapshot(page)==equipped;page.reload(wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for();assert snapshot(page)==equipped;row['reloadPreservesLedger']=True
    page.get_by_role('button',name='成就獎勵',exact=True).first.click();page.locator('#achievement-tab-child-1').click();achievement=page.locator('#achievement-panel header .avatar-renderer');achievement.scroll_into_view_if_needed();row['achievementAvatar']=achievement.evaluate(DECODE)
    if item['slot'] in SLOTS[:7]+['effect']:assert ident in (achievement.get_attribute('data-rendered-items') or '').split()
    assert snapshot(page)==equipped;assert not errors[start_errors:];assert pins()==frozen,'source drift during case';row['status']='PASS_FUNCTIONAL_AWAITING_VISUAL'
   except Exception as e:
    row.update(status='FAIL',error=str(e),traceback=traceback.format_exc())
    try:page.screenshot(path=str(out/(ident+'--failure.png')),full_page=True,timeout=5000)
    except Exception:pass
   row['pageErrors']=errors[start_errors:];report['cases'].append(row);save();print(args.avatar,ident,row['status'],row.get('error','')[:200],flush=True)
   if row['status']=='FAIL':break
  browser.close()
 report['servedAssets']=served;report['status']='PASS_FUNCTIONAL_AWAITING_VISUAL' if len(report['cases'])==len(items) and all(r['status'].startswith('PASS') for r in report['cases']) else 'FAIL';save();return 0 if report['status'].startswith('PASS') else 1
if __name__=='__main__':sys.exit(main())
