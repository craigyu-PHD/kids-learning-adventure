#!/usr/bin/env python3
"""Compiled V6.5.3 smoke, isolated local fixtures. Default: PLAN ONLY, no browser.

Reuses the accepted Shop lifecycle and lesson UI sequencing. Never sends family
API traffic or any network mutation. A fresh compiled build directory is required
for execution so HTTP JS/CSS bytes are compared with the intended artifact.
"""
import argparse
import copy
import hashlib
import json
import re
import sys
import traceback
from pathlib import Path
from urllib.parse import unquote, urlsplit

from qa_v653_full_shop_acceptance import (Runner, ROOT, KEY, SETTINGS, FIXTURE,
    AVATARS, DECODE, HEALTH, inventory, read_bytes, sha, public_refs)

BASE = ROOT/'qa/v653/20261005/release-smoke'
SOURCE_PINS = ROOT/'qa/v653/20261005/release-art/final/source-pins.json'
SOURCE_PINS_SHA = '156bf02b0153d96bbf7feadd8b1ca2e982394acb0f8ef136e901a58f4beb6c8d'
MANIFESTS = {
    'avatar':('src/data/avatarAssetManifest.json','8a508d93e6d2ea29530f1b9a4012b2c63cb729c9758976f6adc921dabce3002a'),
    'world':('src/data/worldArtManifest.json','50579bb6ee962d5456345cd0f7a4d8868398545ca492afb430acd5e72b945e6d'),
}
CHANGED = ['starter-buddy-headphones','phones-sky','phones-racer','phones-ai',
    'story-headphones','sister-cat-headphones','phones-legend','hair-legend',
    'pack-rocket','pack-ocean','pack-treasure','pack-legend','sister-comet-pack',
    'card-sky','pet-space-fox']
NAMES = ['哥哥','弟弟','姐姐','妹妹']
# Same trusted fixture date as the verified two-lesson harness; no device clock override.
TIME = {'now':'2026-09-17T06:00:00.000Z','activeDate':'2026-09-17',
    'taipeiDate':'2026-09-17','taipeiTime':'14:00:00','timeZone':'Asia/Taipei'}


def save(path, value):
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def forbidden_source(path):
    return path.startswith(('/src/','/@vite/','/@react-refresh','/@fs/','/node_modules/')) or path.endswith(('.tsx','.ts'))


def local_build_file(build, pathname):
    file = (build/unquote(pathname.lstrip('/'))).resolve()
    assert file.is_relative_to(build.resolve()), 'build path escapes artifact'
    return file


def fixture(theme='light', four=False):
    store = json.loads(read_bytes(FIXTURE))
    assert all(k.startswith('star-learning-v40:__local__:') for k in store)
    settings = json.loads(store[SETTINGS]); settings.update(theme=theme,motionEffects=True)
    if four:
        for index,(name,avatar) in enumerate(zip(NAMES[2:],AVATARS[2:]),3):
            settings['children'].append({'id':f'child-{index}','name':name,'avatar':avatar,'role':'child','disabled':False})
        store[KEY] = '{}'
    store[SETTINGS] = json.dumps(settings,ensure_ascii=False)
    store['little-explorers-v4-sound'] = 'off'
    return store


class Smoke(Runner):
    def __init__(self, args, out, manifests, frozen, report):
        super().__init__(args,out,manifests,frozen,{},report)
        self.documents = {}; self.compiled = {}; self.network_errors = []; self.source_requests = []
        self.api_blocks = []; self.family_mocks = []; self.snapshots = []
        self.origin = urlsplit(args.url).netloc
        self.build = args.build_dir.resolve() if args.build_dir else None

    def route(self, route):
        request = route.request; url = urlsplit(request.url); path = url.path
        if path in ['/api/time','/api/server-time'] and url.netloc == self.origin:
            route.fulfill(status=200,json=TIME)
        elif '/api/' in path or request.method not in ['GET','HEAD','OPTIONS']:
            self.api_blocks.append({'path':path,'method':request.method})
            route.fulfill(status=503,body='synthetic release QA: cloud and network mutations blocked')
        elif forbidden_source(path):
            self.source_requests.append(path); route.abort('blockedbyclient')
        elif request.resource_type == 'document' and request.frame.parent_frame:
            # Do not play external YouTube content. The actual lesson prompts and
            # parent controls are tested; video availability has its own gate.
            route.fulfill(status=200,content_type='text/html',body='<!doctype html><title>QA video network isolated</title>')
        else:
            route.continue_()

    def response(self, response):
        request = response.request; parsed = urlsplit(response.url)
        if request.resource_type == 'document' and parsed.netloc == self.origin and parsed.path == '/':
            try:
                body=response.body(); expected=sha(self.build/'index.html')
                assert response.status==200 and digest(body)==expected, 'compiled entry HTML mismatch'
                self.documents[parsed.path]={'sha256':expected,'bytes':len(body),'status':response.status}
            except Exception as error:self.network_errors.append(str(error))
        if request.resource_type not in ['script','stylesheet']:
            return
        try:
            assert parsed.netloc == self.origin, ('unbound external executable/style',parsed.netloc,parsed.path)
            assert not forbidden_source(parsed.path), ('source module',parsed.path)
            assert response.status == 200, ('compiled asset HTTP',parsed.path,response.status)
            expected = local_build_file(self.build,parsed.path)
            body = response.body(); expected_sha = sha(expected)
            assert digest(body) == expected_sha, ('compiled artifact mismatch',parsed.path)
            previous = self.compiled.get(parsed.path)
            assert not previous or previous['sha256'] == expected_sha, 'HTTP artifact drift'
            self.compiled[parsed.path] = {'sha256':expected_sha,'bytes':len(body),'status':response.status,
                'resourceType':request.resource_type,'localArtifact':str(expected)}
        except Exception as error:
            self.network_errors.append(str(error))

    def context(self, browser, store=None, width=1440, theme='light', motion='reduce'):
        context = browser.new_context(viewport={'width':width,'height':1050 if width>600 else 844},
            service_workers='block',color_scheme=theme,reduced_motion=motion)
        context.route('**/*',self.route)
        context.route_web_socket('**',lambda ws:ws.close())
        context.on('response',self.response)
        if store is not None:
            context.add_init_script("if(!sessionStorage.getItem('release-smoke-seeded')){for(const[k,v]of Object.entries("+
                json.dumps(store)+"))localStorage.setItem(k,v);sessionStorage.setItem('release-smoke-seeded','1');}")
        return context

    def assert_compiled(self, page):
        assert not self.source_requests and not self.network_errors, (self.source_requests,self.network_errors)
        scripts = page.locator('script[src]').evaluate_all('(es)=>es.map(e=>e.src)')
        assert self.documents, 'missing HTTP compiled index proof'
        assert scripts and all(urlsplit(u).path in self.compiled for u in scripts), ('missing entry HTTP byte proof',scripts)
        assert any(r['resourceType']=='script' for r in self.compiled.values()), 'no compiled JS loaded'
        text = page.locator('.v4-status-bar').inner_text()
        assert 'Version V6.5.3' in text, ('wrong visible runtime version',text)
        return {'footer':text,'scriptURLs':scripts,'manifestOverrides':False,'cssOverrides':False}

    def shot(self, page, name, locator=None):
        locator = locator or page.locator('body')
        locator.scroll_into_view_if_needed(); proof = locator.evaluate(DECODE)
        file = self.out/(name+'.png'); file.parent.mkdir(parents=True,exist_ok=True)
        locator.screenshot(path=str(file),animations='disabled')
        health = page.evaluate(HEALTH)
        assert health['overflow']<=1 and not health['broken'] and not health['errors'], health
        row = {'path':str(file.relative_to(ROOT)),'sha256':sha(file),'proof':proof,'health':health}
        self.snapshots.append(row); return row

    def capture(self, page, locator, folder, name):
        result = super().capture(page,locator,folder,name)
        # Actual world context is broader than a pet/image crop.
        if name == 'home-world-inline':
            context = locator.locator('xpath=ancestor-or-self::section[1]')
            if context.count():
                result['actualHomeContext'] = super().capture(page,context,folder,'home-world-context')
        return result

    def parent_cancel(self, browser, action):
        context = self.context(browser,fixture()); pending=[]; state_requests=[]
        context.route('**/api/family-session',lambda route:pending.append(route))
        context.route('**/api/state',lambda route:(state_requests.append(route.request.method),
            route.fulfill(status=503,body='synthetic no cloud')))
        page=context.new_page(); errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
        try:
            page.goto(self.args.url,wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for()
            compiled=self.assert_compiled(page)
            page.get_by_role('button',name='家長登入',exact=True).last.click()
            page.get_by_role('button',name='使用此帳號',exact=True).click()
            dialog=page.get_by_role('dialog',name='設定家庭 PIN',exact=True)
            dialog.locator('input').fill('4819');dialog.get_by_role('button',name='設定 PIN',exact=True).click()
            page.wait_for_timeout(150); assert len(pending)==1, 'synthetic request not intercepted'
            if action=='Escape':page.keyboard.press('Escape')
            else:dialog.get_by_role('button',name='取消',exact=True).click()
            assert dialog.count()==0
            pending[0].fulfill(status=200,json={'familyId':'a'*64,'token':'fixture-only-token-'*4,'expiresAt':'2036-01-01T00:00:00Z'})
            page.wait_for_timeout(700)
            assert not page.evaluate("Object.entries(localStorage).some(([k,v])=>k.includes('"+'a'*64+"')||v.includes('fixture-only-token-'))")
            assert not state_requests and not errors
            shot=self.shot(page,'parent/'+action)
            self.family_mocks.append({'action':action,'syntheticSessionResponses':1,'networkFamilyRequests':0})
            return {'action':action,'passed':True,'lateResponseIgnored':True,'stateRequests':state_requests,'pageErrors':errors,'compiled':compiled,'screenshot':shot}
        finally:context.close()

    def navigation_motion(self,browser,theme,width):
        context=self.context(browser,fixture(theme),width,theme,'no-preference')
        page=context.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        try:
            page.goto(self.args.url,wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for()
            compiled=self.assert_compiled(page); visited=[]
            for name in ['學習日曆','成就獎勵','寶物商店','首頁']:
                page.get_by_role('button',name=name,exact=True).first.click();page.wait_for_timeout(120)
                self.shot(page,f'navigation/{theme}-{width}-{name}');visited.append(name)
            assert page.evaluate("document.documentElement.classList.contains('dark')") == (theme=='dark')
            # Trigger the real companion reaction and read CSS before screenshots
            # (screenshot animations='disabled' must never act as motion proof).
            bot=page.locator('.v4-ai-bot').first;bot.click()
            normal=bot.evaluate('e=>({animation:getComputedStyle(e).animationName,reduced:matchMedia("(prefers-reduced-motion: reduce)").matches})')
            assert not normal['reduced']
            page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(900);bot.click()
            reduced=bot.evaluate('e=>({animation:getComputedStyle(e).animationName,reduced:matchMedia("(prefers-reduced-motion: reduce)").matches})')
            assert reduced['reduced'] and reduced['animation']=='none', reduced
            self.shot(page,f'navigation/{theme}-{width}-reduced-motion')
            assert not errors;return {'theme':theme,'width':width,'visited':visited,'normal':normal,'reduced':reduced,'compiled':compiled,'pageErrors':errors}
        finally:context.close()

    def lesson(self,browser):
        context=self.context(browser,fixture(four=True));page=context.new_page();errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
        state=lambda:page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)||"{}")',KEY)
        def close_reward():
            page.locator('.v4-reward-continue').wait_for(state='visible')
            page.locator('.v4-reward-continue').click();page.locator('.v4-reward-modal').wait_for(state='detached')
        row={'fixture':'four learners; empty progress; no seeded prerequisites','stages':[]}
        try:
            page.goto(self.args.url,wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for()
            row['compiled']=self.assert_compiled(page);row['before']=state()
            page.locator('.v4-lesson-card').first.get_by_role('button').click();page.locator('.v4-quest-shell').wait_for()
            for stage in range(10):
                text=page.locator('main').inner_text();step={'stage':stage,'kind':'preparation' if stage==0 else 'lesson-stage','text':text}
                if stage==0:assert all(s in text for s in ['30 分鐘','較小的孩子','較大的孩子'])
                if stage==2:
                    for card in page.locator('.v64-word-flip').all():card.click()
                if stage==5:
                    page.get_by_role('button',name='播放句型',exact=True).click()
                    for _ in range(8):
                        confirm=page.get_by_role('button',name='照顧者確認',exact=True)
                        if not confirm.count():break
                        confirm.first.click()
                    assert not page.get_by_role('button',name='照顧者確認',exact=True).count()
                if stage in (6,7):
                    page.locator('.v64-mission-guidance summary').click();page.get_by_role('button',name='播放題目',exact=True).click();step['answers']=[]
                    for i,name in enumerate(NAMES):
                        article=page.locator('[data-quick-child]').nth(i)
                        for option in article.get_by_role('button').all_text_contents():
                            button=article.get_by_role('button',name=option,exact=True)
                            if button.is_disabled():break
                            button.click();page.wait_for_timeout(80)
                            step['answers'].append({'child':name,'option':option,'feedback':article.inner_text()})
                            if '答對' in article.inner_text() or 'correct' in (article.get_attribute('class') or ''):break
                    self.shot(page,f'lesson/stage-{stage}-feedback')
                    for name in NAMES:
                        page.locator('.v4-mission-learners button').filter(has_text=name).click();close_reward()
                if stage==8:
                    for name in NAMES:
                        page.locator('main button').filter(has_text=name).click();close_reward()
                step['screenshot']=self.shot(page,f'lesson/stage-{stage}');row['stages'].append(step)
                if stage<9:page.get_by_role('button',name='下一關',exact=True).click()
            page.get_by_role('button',name='返回課程總覽',exact=True).click();page.locator('.v4-dashboard-grid').wait_for()
            after=state();assert len(after)==4
            for child in after.values():
                assert len(child['completedBlocks'])==1 and len(child['completedMissions'])==2 and not child['completedDays']
                ids=[t['id'] for t in child['rewardTransactions']];assert ids and len(ids)==len(set(ids))
                assert child['answerEvents'], 'missing actual answer ledger'
            page.reload(wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for();assert state()==after
            page.locator('.v4-lesson-card').first.get_by_role('button').click();page.locator('.v4-quest-shell').wait_for()
            for index in [6,7,8]:
                page.locator('.v4-stage-map button').nth(index).click()
                controls=page.locator('.v4-mission-learners button') if index<8 else page.locator('main button')
                assert controls.count()==4 and all(x.is_disabled() for x in controls.all())
            assert state()==after and not errors
            row.update(passed=True,after=after,reloadStable=True,completedControlsDisabled=True,pageErrors=errors)
            self.shot(page,'lesson/reenter-no-duplicate-reward');return row
        finally:context.close()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url',help='Root URL of the intended compiled preview/deployment; no default target')
    parser.add_argument('--attempt',required=True)
    parser.add_argument('--build-dir',type=Path,help='Exact compiled static artifact served by target (dist or Vercel static output)')
    parser.add_argument('--scope',choices=['PRELIMINARY_COMPILED_PREVIEW_NOT_FINAL_RELEASE','FINAL_COMPILED_PREVIEW','POST_DEPLOY_SYNTHETIC_SMOKE'],default='PRELIMINARY_COMPILED_PREVIEW_NOT_FINAL_RELEASE')
    parser.add_argument('--run',action='store_true',help='Actually launch ONE Chromium after target URL is authorized')
    args=parser.parse_args()
    assert re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]*',args.attempt)
    if args.run:
        assert args.url and args.build_dir, '--run requires explicit URL and exact compiled build directory'
        url=urlsplit(args.url);assert url.scheme in ['http','https'] and url.path in ['','/'] and not url.query and not url.fragment and not url.username
        assert (args.build_dir/'index.html').is_file(), 'missing compiled index.html'
        assert b'/src/main.tsx' not in read_bytes(args.build_dir/'index.html'), 'build directory contains Vite source entry'
    args.formal=True;args.body_tolerance_px=1.0
    out=BASE/args.attempt;out.mkdir(parents=True,exist_ok=False)
    assert sha(SOURCE_PINS)==SOURCE_PINS_SHA, 'source pin index changed'
    frozen=json.loads(read_bytes(SOURCE_PINS));assert len(frozen)==106
    manifests={}
    for name,(path,expected) in MANIFESTS.items():
        raw=read_bytes(ROOT/path);assert digest(raw)==expected
        manifests[name]={'file':str(ROOT/path),'sha256':expected,'text':raw.decode(),'value':json.loads(raw)}
    rows={r['id']:r for r in inventory()};assert len(rows)==64 and set(CHANGED)<=set(rows)
    cases=[]
    for i,ident in enumerate(CHANGED):
        profile={'id':'desktop-light' if i%2==0 else 'mobile-dark','width':1440 if i%2==0 else 390,'height':1050 if i%2==0 else 844,'theme':'light' if i%2==0 else 'dark'}
        cases.append({'item':rows[ident],'avatar':AVATARS[i%4],'profile':profile})
    report={'schemaVersion':1,'status':'PLAN_ONLY','url':args.url,'version':'6.5.3','releaseScope':args.scope,'cases':[],
        'plannedCases':cases,'sourcePinsSHA256':SOURCE_PINS_SHA,'sourcePins':frozen,
        'manifestPins':{k:v['sha256'] for k,v in manifests.items()},'browserCount':0,
        'scope':'Compiled Chromium UI smoke. 15 changed items, one representative role/profile each, preparation plus 9 lesson stages with four learners, parent cancel/Escape, navigation, reduced motion.',
        'security':'Fresh browser contexts; local synthetic storage only. All family APIs and network mutations intercepted; synthetic time/session responses only. No true family cloud read/write.',
        'fixtureScope':'Shop is synthetic preowned cost-zero per-item inventory; no purchase-price/earning claim. Lesson starts empty and uses actual UI answer/completion events.',
        'limitations':['NOT a full 64 x 4 matrix','NOT physical Safari/iPhone/Android','NOT real family authentication/cloud acceptance','NOT live video playback/speech recognition evaluation','Saved screenshots require actual visual review; functional PASS alone is not visual acceptance'],
        'harnessPins':{str(p.relative_to(ROOT)):sha(p) for p in [Path(__file__).resolve(),ROOT/'scripts/qa_v653_full_shop_acceptance.py',ROOT/'scripts/qa_v653_shop_coverage.py',FIXTURE]}}
    runner=Smoke(args,out,manifests,frozen,report);runner.stable();runner.save()
    if not args.run:
        print('PLAN_ONLY: no browser/network started; 15 Shop cases + 1 full lesson + 2 parent cancellations + 4 navigation/motion profiles.');return 0
    from playwright.sync_api import sync_playwright
    try:
        report['status']='RUNNING';report['browserCount']=1
        report['buildIndex']={'path':str(args.build_dir/'index.html'),'sha256':sha(args.build_dir/'index.html')}
        with sync_playwright() as playwright:
            browser=playwright.chromium.launch()
            try:
                report['parent']=[runner.parent_cancel(browser,a) for a in ['取消','Escape']];runner.save()
                report['navigation']=[runner.navigation_motion(browser,t,w) for t in ['light','dark'] for w in [1440,390]];runner.save()
                report['lesson']=runner.lesson(browser);runner.save()
                for planned in cases:
                    row=copy.deepcopy(planned);context=runner.context(browser);page=context.new_page();errors=[]
                    page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)))
                    try:
                        runner.case(page,row,errors)
                        # The reused case ends on Home after unequip/reload.
                        row['compiled']=runner.assert_compiled(page)
                    except Exception:
                        failure=out/('failure-'+row['item']['id']+'.png')
                        try:
                            page.screenshot(path=str(failure),full_page=True)
                            row['failureScreenshot']={'path':str(failure.relative_to(ROOT)),'sha256':sha(failure)}
                        except Exception:pass
                        row.update(status='FAIL',pageErrors=errors);report['cases'].append(row);raise
                    finally:context.close()
                    report['cases'].append(row);runner.save();print(row['item']['id'],row['status'],flush=True)
            finally:browser.close()
        runner.stable();assert not runner.source_requests and not runner.network_errors
        assert len(report['cases'])==15
        report['status']='PASS_FUNCTIONAL_PENDING_ACTUAL_VISUAL_REVIEW'
    except Exception as error:
        report.update(status='FAIL',error=repr(error),traceback=traceback.format_exc())
    finally:
        report.update(compiledDocuments=runner.documents,compiledAssets=runner.compiled,networkErrors=runner.network_errors,sourceModuleRequests=runner.source_requests,
            apiBlocks=runner.api_blocks,syntheticSessionMocks=runner.family_mocks,screenshots=runner.snapshots,
            servedAssets=runner.assets,manifestOverrides=False,cssOverrides=False,fixtureDocumentOnlyOverride=True,visualReview='NOT_PERFORMED')
        report['sourceDrift']=[p for p,s in frozen.items() if sha(ROOT/p)!=s]
        if report['sourceDrift']:report['status']='FAIL'
        runner.save()
    print(report['status']);return 0 if report['status'].startswith('PASS') else 1


if __name__=='__main__':sys.exit(main())
