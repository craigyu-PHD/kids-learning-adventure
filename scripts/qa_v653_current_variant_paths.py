"""Current-source component path coverage; not Store lifecycle or automatic visual PASS.

One Chromium browser. Formal manifests without overrides, source106 before/after,
DOM usage plus exact HTTP bytes and original screenshot SHA per observed path.
Only negative fallback cases intercept selected display URLs with a deliberate404.
"""
import argparse
import hashlib
import json
import re
import traceback
from pathlib import Path
from urllib.parse import urlencode, urlsplit

from qa_v653_release_art import assets

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT/'qa/v653/20261005/build/current-variant-path'
FREEZE = ROOT/'qa/v653/20261005/release-art/final/source-pins.json'
ROLES = ['brother','younger','sister','younger-sister']

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def read(path):
    return json.loads(Path(path).read_bytes())

def write(path, value):
    Path(path).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')

def pin_check(pins):
    assert all(sha(ROOT/p)==v for p,v in pins.items()), 'source106 drift'

DOM = r'''root => [...root.querySelectorAll('*')].flatMap(e => {
  const style=getComputedStyle(e), rect=e.getBoundingClientRect();
  if(!rect.width||!rect.height||style.display==='none'||style.visibility==='hidden'||style.opacity==='0')return [];
  const role=e.closest('[data-role]')?.getAttribute('data-role')||null;
  const skin=e.closest('[data-skin]')?.getAttribute('data-skin')||null;
  const urls=[];
  if(e instanceof HTMLImageElement && e.currentSrc) urls.push({url:e.currentSrc,usage:'img',natural:[e.naturalWidth,e.naturalHeight],complete:e.complete});
  for(const prop of ['maskImage','backgroundImage','borderImageSource']) {
    for(const match of style[prop].matchAll(/url\(["']?([^"')]+)["']?\)/g)) urls.push({url:match[1],usage:prop});
  }
  return urls.map(u=>({...u,role,skin,tag:e.tagName,cls:e.className,rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}}));
})'''

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--attempt',required=True)
    ap.add_argument('--url',default='http://127.0.0.1:5178')
    ap.add_argument('--limit',type=int)
    ap.add_argument('--plan-only',action='store_true')
    args=ap.parse_args()
    assert re.fullmatch(r'[A-Za-z0-9_-]+',args.attempt)
    out=BASE/args.attempt;out.mkdir(parents=True,exist_ok=False)
    pins=read(FREEZE);pin_check(pins)
    avatar=read(ROOT/'src/data/avatarAssetManifest.json');world=read(ROOT/'src/data/worldArtManifest.json')
    lineage=read(ROOT/'qa/v653/20261005/release-art/lineage/candidate-r6b/index.json')
    before_a=read(ROOT/'qa/v653/20261005/recovery/avatarAssetManifest.frozen-production.json')
    before_w=read(ROOT/'qa/v653/20261005/blender/cards/native-r5-candidate/worldArtManifest.before-local-card.json')
    refs={**{'avatar'+k:v for k,v in assets(avatar).items()},**{'world'+k:v for k,v in assets(world).items()}}
    prior={**{'avatar'+k:v for k,v in assets(before_a).items()},**{'world'+k:v for k,v in assets(before_w).items()}}
    covered=set(lineage['newAssets'])|{v for k,v in refs.items() if prior.get(k)!=v}
    assert len(covered)==213
    changed=[r for r in avatar['accessories'] if set(assets(r).values())&set(lineage['newAssets'])]
    assert len(changed)==13
    skins=['',*sorted({r['skinId'] for r in avatar['skins']}-{'default'})]
    assert len(skins)==8
    cases=[]
    for record in changed:
        for skin in skins:
            cases.append({'id':record['id']+'--'+(skin or 'default'),'kind':'avatar','item':record['id'],'skin':skin,'dpr':1,'theme':'light','roles':ROLES})
    for skin in skins:
        cases.append({'id':'hair-headwear--'+(skin or 'default'),'kind':'avatar','item':'hair-legend','skin':skin,'hat':'hat-crown','dpr':1,'theme':'light','roles':ROLES})
    for dpr in [1,2]:
        for item in ['card-sky','pet-space-fox']:
            record=next(r for r in world['records'] if r['itemId']==item)
            for width in [100,320,900]:
                cases.append({'id':f'{item}--dpr{dpr}--w{width}','kind':'world','item':item,'width':width,'dpr':dpr,'theme':'dark' if dpr==2 else 'light'})
            cases.append({'id':f'{item}--dpr{dpr}--fallback','kind':'world','item':item,'width':320,'dpr':dpr,'theme':'light','failPaths':[v['path'] for v in record['displayVariants']]})
        for preview in [0,1]:
            cases.append({'id':f'pet-component--dpr{dpr}--preview{preview}','kind':'pet','item':'pet-space-fox','preview':preview,'dpr':dpr,'theme':'light'})
    selected=cases[:args.limit] if args.limit else cases
    report={'status':'PLANNED','scope':'Current AvatarRenderer/registry, WorldDisplayImage and PetCompanion API path use; component fits and failure fallback, not Store lifecycle or independent aesthetic acceptance',
      'formalManifests':True,'manifestOverrides':False,'productCssOverrides':False,'fixtureLayout':'QA grid and explicit WorldDisplayImage box dimensions only; product component styles imported unchanged',
      'source106Path':str(FREEZE.relative_to(ROOT)),'source106SHA256':sha(FREEZE),'source106Before':pins,'source106BeforeMatch':True,
      'runnerSHA256':sha(__file__),'fixturePins':{str(p.relative_to(ROOT)):sha(p) for p in [BASE/'fixture.tsx',BASE/'index.html']},
      'candidate':{'avatarManifestSha256':sha(ROOT/'src/data/avatarAssetManifest.json'),'worldManifestSha256':sha(ROOT/'src/data/worldArtManifest.json')},
      'coveredGatePaths':sorted(covered),'plannedCases':len(cases),'selectedCases':len(selected),'plannedAvatarFits':448,'cases':[],
      'familyApisBlocked':True,'blockedRequests':[],'visualReview':'NOT_AWARDED_BY_RUNNER','pathEvidence':{},'failures':[]}
    write(out/'plan.json',{'report':report,'cases':selected})
    print(json.dumps({'out':str(out),'selected':len(selected),'runnerSHA256':report['runnerSHA256']}),flush=True)
    if args.plan_only:return 0
    from playwright.sync_api import sync_playwright
    report['status']='RUNNING';write(out/'report.json',report)
    asset_proofs={}
    with sync_playwright() as pw:
      browser=pw.chromium.launch()
      try:
       for dpr in [1,2]:
        context=browser.new_context(viewport={'width':1440,'height':1250},device_scale_factor=dpr,reduced_motion='reduce',service_workers='block')
        context.route_web_socket('**',lambda ws:None)
        active_fail=set();expected_failure_hits=[]
        def route(req):
            url=req.request.url;parsed=urlsplit(url)
            if parsed.path.startswith('/api/') or parsed.netloc!=urlsplit(args.url).netloc:
                report['blockedRequests'].append(url);req.abort();return
            if 'public'+parsed.path in active_fail:
                expected_failure_hits.append('public'+parsed.path);req.fulfill(status=404,body='intentional isolated display failure');return
            req.continue_()
        context.route('**/*',route)
        page=context.new_page();page.set_default_timeout(20000)
        for case in [c for c in selected if c['dpr']==dpr]:
            errors=[];handler=lambda e:errors.append(str(e));page.on('pageerror',handler)
            row=dict(case,status='RUNNING');active_fail.clear();active_fail.update(case.get('failPaths',[]));expected_failure_hits.clear()
            try:
                query={k:v for k,v in case.items() if k in ['kind','item','skin','hat','width','preview','theme']}
                page.goto(args.url+'/qa/v653/20261005/build/current-variant-path/index.html?'+urlencode(query),wait_until='domcontentloaded')
                page.locator('[data-fixture-ready]').wait_for()
                if case['kind']=='avatar':
                    page.wait_for_function('''items=>[...document.querySelectorAll('.avatar-renderer')].length===4&&[...document.querySelectorAll('.avatar-renderer')].every(e=>items.every(i=>(e.dataset.renderedItems||'').split(' ').includes(i)))''',arg=[case['item']]+([case['hat']] if case.get('hat') else []))
                    assert page.locator('main').get_attribute('data-failures')=='', 'Renderer error callback'
                else:
                    page.wait_for_function('''()=>[...document.querySelectorAll('main img')].length>0&&[...document.querySelectorAll('main img')].every(i=>i.complete&&i.naturalWidth>0)''')
                page.locator('main').evaluate('''async e=>{await Promise.all([...e.querySelectorAll('img')].map(i=>i.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}''')
                uses=page.locator('main').evaluate(DOM)
                assert uses and not errors, errors
                if case['kind']=='avatar':
                    row['renderers']=page.locator('.avatar-renderer').evaluate_all('es=>es.map(e=>({role:e.closest("[data-role]").dataset.role,skin:e.dataset.skin,rendered:e.dataset.renderedItems,details:e.dataset.runtimeDetails,rig:e.dataset.rigScene}))')
                    assert all(r['skin']==(case['skin'] or 'default') for r in row['renderers'])
                shot=out/(case['id']+'.png');page.locator('main').screenshot(path=str(shot),animations='disabled')
                row['screenshot']=str(shot.relative_to(ROOT));row['screenshotSHA256']=sha(shot)
                row['uses']=[]
                for use in uses:
                    parsed=urlsplit(use.pop('url'));path='public'+parsed.path
                    if not path.startswith('public/assets/'):continue
                    assert not (use.get('usage')=='img' and (not use['complete'] or min(use['natural'])<=0)),use
                    if path not in asset_proofs:
                        response=context.request.get(args.url+parsed.path,timeout=20000)
                        assert response.status==200,(path,response.status)
                        digest=hashlib.sha256(response.body()).hexdigest();assert digest==sha(ROOT/path),('HTTP byte drift',path)
                        asset_proofs[path]={'status':response.status,'sha256':digest,'bytes':len(response.body()),'contentType':response.headers.get('content-type')}
                    use['path']=path;use['http']=asset_proofs[path];row['uses'].append(use)
                    if path in covered:
                        report['pathEvidence'].setdefault(path,[]).append({'caseId':case['id'],'kind':case['kind'],'role':use['role'],'skin':use['skin'],'dpr':dpr,'usage':use['usage'],'http':asset_proofs[path],'screenshot':row['screenshot'],'screenshotSHA256':row['screenshotSHA256'],'fallback':bool(case.get('failPaths'))})
                if active_fail:
                    full=next(r['delivery']['path'] for r in world['records'] if r['itemId']==case['item'])
                    assert expected_failure_hits and full in {u['path'] for u in row['uses']},('native fallback not observed',case['id'])
                row.update(status='PASS_CURRENT_COMPONENT_PATHS',expectedFailedDisplayRequests=expected_failure_hits[:],pageErrors=errors)
            except Exception as exc:
                row.update(status='FAIL',error=str(exc),traceback=traceback.format_exc(),pageErrors=errors)
                page.screenshot(path=str(out/(case['id']+'--failure.png')),full_page=True)
                report['failures'].append({'id':case['id'],'error':str(exc)})
            finally:
                page.remove_listener('pageerror',handler);report['cases'].append(row)
                write(out/'report.json',report)
                print(json.dumps({'case':case['id'],'status':row['status'],'completed':len(report['cases']),'observedGatePaths':len(report['pathEvidence'])}),flush=True)
            if row['status']=='FAIL':break
        context.close()
        if report['failures']:break
      finally:browser.close()
    pin_check(pins)
    report['source106After']={p:sha(ROOT/p) for p in pins};report['source106AfterMatch']=True
    report['observedGatePaths']=sorted(report['pathEvidence']);missing=covered-set(report['pathEvidence'])
    report['unobservedPaths']=[{'path':p,'scope':'SOURCE_CODEC_ONLY_NOT_RUNTIME' if '/world-source/' in p else 'NOT_OBSERVED_IN_THIS_COMPONENT_RUN','sha256':sha(ROOT/p)} for p in sorted(missing)]
    report['status']='PASS_SCOPED_CURRENT_COMPONENT_PATHS' if not report['failures'] and len(report['cases'])==len(selected) else 'FAIL'
    report['limitations']=['Not full Store lifecycle or all permutations.','World explicit sizes exercise current display component API; oversized boxes are selection boundaries, not asserted current Home geometry.','Only DOM-used URLs count as runtime; world-source PNGs remain source-codec-only.','HTTP body hashes are fetched from same serving origin after DOM use; repeated exact assets share the first HTTP proof within this one browser run.','Original reviewed native RGBA sources provide prior aesthetic evidence; this runner does not award visual PASS.']
    write(out/'report.json',report)
    print(json.dumps({'status':report['status'],'observed':len(report['pathEvidence']),'unobserved':len(missing),'cases':len(report['cases'])}),flush=True)
    return 0 if report['status'].startswith('PASS') else 1

if __name__=='__main__':raise SystemExit(main())
