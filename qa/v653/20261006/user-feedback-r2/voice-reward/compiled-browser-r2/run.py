#!/usr/bin/env python3
"""Fresh compiled voice UI/HTTP QA. Run only after the browser lock is granted.
No source-module imports, real family API writes, or audible-quality claims.
"""
import argparse
import copy
import hashlib
import json
import re
import time
import traceback
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[6]
PHRASE = 'I can take three steps.'
CASE_IDS = ['no-preload','lesson-slow-ended','rapid-replay','stage-cancel','route-cancel','404-fallback','rejected-play-fallback','delayed-fallback','pagehide-cancel','settings-slow','settings-normal']
TIME = {'now':'2026-10-06T06:00:00.000Z','activeDate':'2026-10-06','taipeiDate':'2026-10-06','taipeiTime':'14:00:00','timeZone':'Asia/Taipei'}
TRACE = r'''(()=>{window.__voiceTrace=[];window.__audioInstances=[];window.__rejectNext=false;window.__captureFallback=false;const log=(type,a,extra={})=>window.__voiceTrace.push({type,time:performance.now(),src:a?.src||'',currentTime:a?.currentTime,paused:a?.paused,...extra});const Native=window.Audio;window.Audio=function(src){const a=new Native(src);window.__audioInstances.push(a);log('construct',a);for(const e of ['playing','pause','ended','error','loadedmetadata'])a.addEventListener(e,()=>log(e,a,{duration:Number.isFinite(a.duration)?a.duration:null}));return a};window.Audio.prototype=Native.prototype;Object.setPrototypeOf(window.Audio,Native);const pause=HTMLMediaElement.prototype.pause;HTMLMediaElement.prototype.pause=function(){const before={paused:this.paused,currentTime:this.currentTime,src:this.src};const result=pause.call(this);if(before.src.includes('/assets/v6.5/audio/'))log('native-pause',this,{before,afterPaused:this.paused});return result};const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(window.__rejectNext&&this.src.includes('/assets/v6.5/audio/')){window.__rejectNext=false;log('injected-rejection',this);return Promise.reject(new DOMException('QA playback denied','NotAllowedError'))}return play.call(this)};const speak=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=function(u){log('speech-fallback',null,{text:u.text,lang:u.lang,rate:u.rate,pitch:u.pitch});if(!window.__captureFallback)return speak(u)};})();'''


def now(): return datetime.now(timezone.utc).isoformat()
def sha(data): return hashlib.sha256(data).hexdigest()
def read(path): return json.loads(Path(path).read_bytes())
def ref(path):
    p=Path(path).resolve()
    if not p.is_relative_to(ROOT): raise ValueError('Gate evidence ref must be inside repository: '+str(p))
    return {'path':str(p.relative_to(ROOT)),'sha256':sha(p.read_bytes())}
def write(path,value):
    Path(path).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def check_ref(reference):
    p=ROOT/reference['path']
    if sha(p.read_bytes())!=reference['sha256']: raise ValueError('Evidence changed: '+reference['path'])
    return read(p)


def make_gate_adapter(result_path, output_path):
    """Only completed genuine raw PASS rows can produce a voiceBrowser adapter."""
    result=read(result_path)
    if result.get('status')!='PASS' or result.get('errors') or result.get('sourceDrift') or not result.get('browserClosed'):
        raise ValueError('Voice browser result is incomplete or failed; no adapter PASS created')
    rows=result['checks']
    if [r.get('id') for r in rows]!=CASE_IDS or not all(r.get('passed') is True for r in rows):
        raise ValueError('Expected exact 11 successful actual browser observations')
    served=check_ref(result['servedArtifacts'])
    if served['status']!='PASS' or served['before']!=served['after'] or served['files']!=served['after']: raise ValueError('Compiled served bytes failed or after-check absent')
    check_ref(result['sourcePins']);check_ref(result['artifactPins'])
    if ref(ROOT/result['runner']['path'])!=result['runner']:raise ValueError('Runner changed after browser observation')
    raw=ref(result_path)
    adapter={'group':'voiceBrowser','mode':'fresh','status':'PASS','observedAt':result['completedAt'],
             'sourcePins':result['sourcePins'],'artifactPins':result['artifactPins'],'servedArtifacts':result['servedArtifacts'],
             'runner':result['runner'],'runtimeOperator':'compiled-voice-browser-runner','cases':[]}
    for i,row in enumerate(rows):
        adapter['cases'].append({'values':{'case':row['id']},'raw':raw,'bindings':{'case':f'/checks/{i}/id'},
            'checks':{'passed':{'ref':raw,'pointer':f'/checks/{i}/passed','equals':True}}})
    p=Path(output_path)
    if p.exists(): raise FileExistsError(p)
    write(p,adapter)
    return adapter


def make_audio_adapter(http_path, output_path):
    """Carry unchanged native generation/decoding and bind a fresh HTTP receipt."""
    http=read(http_path)
    if http.get('status')!='PASS' or http.get('files')!=514 or len(http.get('results',[]))!=514:
        raise ValueError('Fresh complete 514-clip HTTP receipt required')
    if not http.get('observedAt') or not http.get('baseURL'):raise ValueError('Fresh compiled HTTP timestamp/base required')
    check_ref(http['sourcePins']);artifact_map=check_ref(http['artifactPins'])
    if any(artifact_map.get('assets/v6.5/audio/'+r['file'])!=r['sha256'] for r in http['results']):raise ValueError('HTTP differs from compiled artifact map')
    canonical=ROOT/'qa/v653/20261006/user-feedback-r2/voice-reward'
    rows=read(canonical/'rendered-corpus.json');expected={r['file']:r['audioSha256'] for r in rows}
    if {r['file']:r['sha256'] for r in http['results']}!=expected or not all(r['status']==200 and r['mime']=='audio/mp4' for r in http['results']):
        raise ValueError('HTTP rows are not the canonical source-bound audio set')
    result={k:ref(canonical/f) for k,f in [('renderedCorpus','rendered-corpus.json'),('corpus','corpus.json'),('decoded','corpus-verification.json'),('selectedSample','selected-sample-preservation.json')]}
    result.update(http=ref(http_path),humanAuditoryAcceptance='selected-slow-sample-only')
    p=Path(output_path)
    if p.exists(): raise FileExistsError(p)
    write(p,result)
    return result


class Run:
    def __init__(self,args):
        self.args=args;self.base=args.base.rstrip('/')+'/';self.out=Path(args.out).resolve();self.stage=Path(args.build_dir).resolve()
        if urlsplit(self.base).hostname not in ('127.0.0.1','localhost'): raise ValueError('Only isolated loopback preview allowed')
        if self.out.exists() and any(self.out.iterdir()): raise ValueError('Use a fresh empty output directory')
        self.out.mkdir(parents=True,exist_ok=True)
        self.pins=read(args.source_pins);self.artifacts=read(args.artifact_pins)
        self.manifest=read(self.stage/'src/data/lessonSpeechManifest.json')['clips']
        selected='assets/v6.5/audio/'+self.manifest[PHRASE]['slow']
        if self.artifacts.get(selected)!='8f85105b31677beeb67331bcbf1827d96c74bfd86d021e0595331c9d24e4d128':raise ValueError('Selected slow sample differs from human-selected source lineage')
        self.started=now();self.generated={p:h for p,h in self.artifacts.items() if not (self.stage/'public'/p).is_file()}
        if not self.generated or 'index.html' not in self.generated: raise ValueError('Compiled generated artifact map required')
        self.report={'status':'RUNNING','scope':'Actual compiled Chromium UI media playback, isolated synthetic family/API and injected playback negatives. No audible naturalness assessment.',
            'startedAt':self.started,'baseURL':self.base,'sourcePins':ref(args.source_pins),'artifactPins':ref(args.artifact_pins),'runner':ref(__file__),
            'fixture':ref(ROOT/'qa/v653/20261005/lessons/default-storage.json'),'checks':[],'errors':[],'traffic':[],'compiledResponses':[],'audioResponses':[],'sourceDrift':[],'browserClosed':False}
        self.served={'status':'RUNNING','baseURL':self.base,'files':{},'before':{},'after':{},'observedAt':self.started,'errors':[]}
        self.active=None;self.negative=None
    def sources_unchanged(self):
        drift=[]
        for p,h in self.pins.items():
            for root in (ROOT,self.stage):
                f=root/p
                if not f.is_file() or sha(f.read_bytes())!=h: drift.append(str(f))
        return drift
    def fetch(self,path):
        with urlopen(Request(self.base+quote(path,safe='/'),headers={'Cache-Control':'no-cache'}),timeout=20) as r:
            body=r.read();return {'path':path,'status':r.status,'mime':r.headers.get_content_type(),'sha256':sha(body),'bytes':len(body)}
    def verify_served(self,phase):
        rows=[]
        for p,h in sorted(self.generated.items()):
            row=self.fetch(p);rows.append(row)
            if row['status']!=200 or row['sha256']!=h: self.served['errors'].append({'phase':phase,'expected':h,**row})
        self.served[phase]={r['path']:r['sha256'] for r in rows}
        self.served['files']=dict(self.served[phase])
        self.served['status']='FAIL' if self.served['errors'] else 'PASS'
        self.served['observedAt']=now();write(self.out/'served-artifacts.json',self.served)
        if self.served['errors']: raise AssertionError('Served compiled bytes differ from immutable artifact map')
    def http(self):
        files=sorted({f for modes in self.manifest.values() for f in modes.values()})
        if len(files)!=514: raise AssertionError('Expected 514 manifest AACs')
        def one(file):
            row=self.fetch('assets/v6.5/audio/'+file);row['file']=file
            expected=self.artifacts.get(row['path']);row['expectedSHA256']=expected
            row['passed']=row['status']==200 and row['mime']=='audio/mp4' and row['sha256']==expected
            return row
        with ThreadPoolExecutor(max_workers=6) as pool: rows=list(pool.map(one,files))
        r={'status':'PASS' if all(x['passed'] for x in rows) else 'FAIL','files':len(rows),'results':rows,'observedAt':now(),
           'sourcePins':self.report['sourcePins'],'artifactPins':self.report['artifactPins'],'baseURL':self.base,
           'scope':'Fresh separate HTTP scanner; these requests are not browser preload traffic.'}
        write(self.out/'http-result.json',r)
        if r['status']!='PASS': raise AssertionError('514 HTTP/MIME/hash check failed')
    def save(self):
        write(self.out/'browser-result.json',self.report)
    def check(self,case,label,data,passed):
        self.report['checks'].append({'id':case,'name':label,'passed':bool(passed),'data':copy.deepcopy(data),'observedAt':now()});self.save()
        if not passed: raise AssertionError(case+': '+label)
    def response(self,response):
        u=urlsplit(response.url);path=unquote(u.path)
        prefix=urlsplit(self.base).path
        relative=path[len(prefix):] if path.startswith(prefix) else path.lstrip('/')
        if relative.startswith(('src/','@vite/','@fs/')):
            self.report['errors'].append('Development resource rejected: '+response.url);return
        if relative=='__qa_voice_seed__' or relative.startswith('api/'): return
        if u.netloc!=urlsplit(self.base).netloc:return
        target='index.html' if relative in ('','index.html') or response.request.resource_type=='document' else relative
        if target in self.generated and (target.endswith(('.html','.js','.css'))):
            try:
                actual=sha(response.body());ok=response.status==200 and actual==self.generated[target]
                self.report['compiledResponses'].append({'url':response.url,'path':target,'status':response.status,'sha256':actual,'passed':ok})
                if not ok:self.report['errors'].append('Browser loaded stale compiled asset: '+target)
            except Exception as e:self.report['errors'].append('Cannot read browser compiled response: '+str(e))
        if relative.startswith('assets/v6.5/audio/'):
            row={'url':response.url,'path':relative,'status':response.status,'negativeControl':self.negative}
            if response.status in (200,206):
                try:
                    body=response.body();row['sha256']=sha(body);row['expectedArtifactSHA256']=self.artifacts.get(relative)
                    source=(self.stage/'dist'/relative).read_bytes()
                    expected=source
                    if response.status==206:
                        value=response.headers.get('content-range','');match=re.fullmatch(r'bytes (\d+)-(\d+)/(\d+)',value)
                        if not match:raise AssertionError('Malformed audio Content-Range')
                        start,end,total=map(int,match.groups())
                        if total!=len(source):raise AssertionError('Audio range total mismatch')
                        expected=source[start:end+1];row['contentRange']=value
                    row['passed']=body==expected and sha(source)==self.artifacts.get(relative)
                    if not row['passed']:self.report['errors'].append('Browser audio bytes differ: '+relative)
                except Exception as e:
                    # A deliberately cancelled delayed request may have no readable body.
                    row['bodyUnavailable']=str(e)
                    if self.negative!='delay':self.report['errors'].append('Audio body unavailable: '+relative)
            self.report['audioResponses'].append(row)
    def context(self,browser,secure=False):
        c=browser.new_context(viewport={'width':1440,'height':900},service_workers='block',reduced_motion='reduce')
        fid='e'*64;session={'familyId':fid,'token':'synthetic-compiled-voice-qa-only','expiresAt':'2030-01-01T00:00:00.000Z'}
        def route(r):
            u=urlsplit(r.request.url)
            if u.path.startswith(('/src/','/@vite/','/@fs/')):
                self.report['errors'].append('Development request rejected: '+r.request.url);return r.abort()
            if u.path in ('/api/time','/api/server-time'):return r.fulfill(json=TIME)
            if u.path=='/api/family-session' and secure:
                self.report['traffic'].append({'path':u.path,'method':r.request.method,'action':'synthetic session response'});return r.fulfill(json=session)
            if u.netloc!=urlsplit(self.base).netloc or u.path.startswith('/api/'):
                self.report['traffic'].append({'host':u.hostname,'path':u.path,'method':r.request.method,'action':'blocked'});return r.fulfill(status=503,body='isolated compiled voice QA')
            return r.continue_()
        c.route('**/*',route);c.route_web_socket('**',lambda ws:ws.close());c.add_init_script(TRACE)
        p=c.new_page();p.on('pageerror',lambda e:self.report['errors'].append(str(e)));p.on('response',self.response);p.set_default_timeout(15000)
        storage=read(ROOT/'qa/v653/20261005/lessons/default-storage.json');settings=json.loads(storage['star-learning-v40:__local__:settings'])
        settings.update(theme='light',voiceRate=.78,voicePreference='female',voiceId=None,motionEffects=False)
        storage['star-learning-v40:__local__:settings']=json.dumps(settings);storage['star-learning-v40:__local__:progress']='{}';storage['little-explorers-v4-sound']='off'
        if secure:
            storage={k.replace('__local__',fid):v for k,v in storage.items()};storage['star-learning-active-family-session-v40']=json.dumps(session)
        seed=self.base+'__qa_voice_seed__';p.route(seed,lambda r:r.fulfill(content_type='text/html',body='<!doctype html><title>isolated seed</title>'))
        p.goto(seed);p.evaluate('(s)=>{localStorage.clear();for(const[k,v]of Object.entries(s))localStorage.setItem(k,v)}',storage)
        if secure:p.evaluate('(fid)=>sessionStorage.setItem(`star-learning-v40:${fid}:active-user`,"user-father")',fid)
        p.unroute(seed);return c,p
    def lesson(self,p):
        p.goto(self.base+'?day=day-27&lesson=1',wait_until='domcontentloaded');p.locator('.v4-quest-shell').wait_for();p.locator('.v4-stage-map button').nth(0).click()
        for cb in p.locator('.v64-daily-participants input').all():
            if not cb.is_checked():cb.check()
        p.locator('.v4-stage-map button').nth(5).click();p.get_by_role('button',name='播放句型',exact=True).wait_for()
        if PHRASE not in p.locator('main').inner_text():raise AssertionError('Wrong lesson sentence')
    def browser(self):
        from playwright.sync_api import sync_playwright
        def reset(p):p.evaluate('()=>window.__voiceTrace=[]')
        def trace(p):return p.evaluate('()=>window.__voiceTrace')
        def wait(p,name,count=1):p.wait_for_function('([n,c])=>__voiceTrace.filter(x=>x.type===n).length>=c',arg=[name,count])
        def paused(p):return p.evaluate('__audioInstances.every(a=>a.paused||a.ended)')
        with sync_playwright() as pw:
            b=pw.chromium.launch(headless=True)
            try:
                c,p=self.context(b);self.active=c;requests=[]
                p.on('request',lambda r:requests.append(r.url) if '/assets/v6.5/audio/' in r.url else None)
                p.goto(self.base,wait_until='domcontentloaded');p.locator('.v4-dashboard-grid').wait_for();p.wait_for_timeout(500)
                self.check('no-preload','Initial home makes zero audio requests',requests,len(requests)==0)
                self.lesson(p);button=p.get_by_role('button',name='播放句型',exact=True);reset(p);button.click();wait(p,'playing');p.screenshot(path=str(self.out/'lesson-slow-playing.png'));wait(p,'ended');t=trace(p)
                self.check('lesson-slow-ended','Real selected slow clip plays and ends',t,any(x['type']=='playing' and x['src'].endswith(self.manifest[PHRASE]['slow']) for x in t) and any(x['type']=='ended' for x in t) and not any(x['type']=='speech-fallback' for x in t))
                reset(p)
                for _ in range(3):button.click();p.wait_for_timeout(90)
                wait(p,'playing');t=trace(p);states=p.evaluate('__audioInstances.map(a=>({paused:a.paused,ended:a.ended,src:a.getAttribute("src"),currentTime:a.currentTime}))')
                self.check('rapid-replay','Three clicks invoke native pause, clear both prior media, and leave only final clip playing',{'trace':t,'mediaStates':states},len([x for x in t if x['type']=='construct'])==3 and len([x for x in t if x['type']=='native-pause' and x['afterPaused']])>=2 and len(states[-3:])==3 and all(x['paused'] and x['src'] is None for x in states[-3:-1]) and not states[-1]['paused'] and p.evaluate('__audioInstances.filter(a=>!a.paused&&!a.ended).length')==1)
                p.locator('.v4-stage-map button').nth(4).click();p.wait_for_timeout(100);t=trace(p)
                self.check('stage-cancel','Changing stage pauses live media',t,paused(p) and any(x['type']=='native-pause' and x['afterPaused'] for x in t))
                p.locator('.v4-stage-map button').nth(5).click();reset(p);button.click();wait(p,'playing');p.locator('.v4-quest-back').click();p.locator('.v4-dashboard-grid').wait_for();t=trace(p)
                self.check('route-cancel','SPA return pauses live lesson media',t,paused(p) and any(x['type']=='native-pause' and x['afterPaused'] for x in t))
                self.lesson(p);button=p.get_by_role('button',name='播放句型',exact=True);p.evaluate('()=>window.__captureFallback=true')
                self.negative='404';p.route('**/assets/v6.5/audio/*.m4a',lambda r:r.fulfill(status=404,content_type='audio/mp4',body='not found'))
                reset(p);button.click();wait(p,'speech-fallback');p.wait_for_timeout(300);t=trace(p)
                self.check('404-fallback','404 invokes one correct fallback',t,len([x for x in t if x['type']=='speech-fallback' and x['text']==PHRASE])==1 and not any(x['type']=='playing' for x in t));p.unroute('**/assets/v6.5/audio/*.m4a')
                self.negative='reject';p.evaluate('()=>window.__rejectNext=true');reset(p);button.click();wait(p,'speech-fallback');t=trace(p)
                self.check('rejected-play-fallback','Rejected native play promise falls back once',t,len([x for x in t if x['type']=='speech-fallback' and x['text']==PHRASE])==1 and any(x['type']=='injected-rejection' for x in t))
                self.negative='delay'
                def delay(r):
                    time.sleep(4.6)
                    try:r.fulfill(status=200,content_type='audio/mp4',body=(self.stage/'public/assets/v6.5/audio'/self.manifest[PHRASE]['slow']).read_bytes())
                    except Exception:pass
                p.route('**/assets/v6.5/audio/*.m4a',delay);reset(p);button.click();wait(p,'speech-fallback');p.wait_for_timeout(500);t=trace(p)
                construct=next(x for x in t if x['type']=='construct');fallback=next(x for x in t if x['type']=='speech-fallback')
                self.check('delayed-fallback','Four-second timeout has no late playback after response',t,3800<=fallback['time']-construct['time']<4600 and len([x for x in t if x['type']=='speech-fallback'])==1 and not any(x['type']=='playing' for x in t));p.unroute('**/assets/v6.5/audio/*.m4a')
                self.negative=None;p.evaluate('()=>window.__captureFallback=false');reset(p);button.click();wait(p,'playing');p.evaluate('()=>window.dispatchEvent(new Event("pagehide"))');p.wait_for_timeout(100);t=trace(p)
                self.check('pagehide-cancel','Pagehide pauses active media',t,paused(p) and any(x['type']=='native-pause' and x['afterPaused'] for x in t));c.close();self.active=None
                c,p=self.context(b,secure=True);self.active=c;p.goto(self.base,wait_until='domcontentloaded');p.locator('.v4-dashboard-grid').wait_for();p.locator('[data-navigation="parent-login"]').click()
                dialog=p.get_by_role('dialog',name='管理者驗證');dialog.wait_for()
                for n in '1234':dialog.get_by_role('button',name=n,exact=True).click()
                dialog.get_by_role('button',name='解鎖家長專區',exact=True).click();p.locator('.voice-preview-button').wait_for();reset(p);p.locator('.voice-preview-button').click();wait(p,'playing');wait(p,'ended');t=trace(p);sample='Hello! Let us learn English together.'
                self.check('settings-slow','Actual parent setting plays slow clip to ended',t,any(x['type']=='playing' and x['src'].endswith(self.manifest[sample]['slow']) for x in t) and any(x['type']=='ended' for x in t));p.screenshot(path=str(self.out/'settings-slow.png'),full_page=True)
                p.locator('.voice-speed-choice button').nth(1).click();reset(p);p.locator('.voice-preview-button').click();wait(p,'playing');wait(p,'ended');t=trace(p)
                self.check('settings-normal','Actual normal setting plays separate normal clip to ended',t,any(x['type']=='playing' and x['src'].endswith(self.manifest[sample]['standard']) for x in t) and any(x['type']=='ended' for x in t));c.close();self.active=None
            except Exception:
                try:p.screenshot(path=str(self.out/'failure.png'),full_page=True);self.report['failureText']=p.locator('body').inner_text()
                except Exception:pass
                raise
            finally:
                if self.active:self.active.close()
                b.close();self.report['browserClosed']=True;self.save()
    def run(self):
        try:
            drift=self.sources_unchanged()
            if drift:raise AssertionError('Source/stage mismatch before capture: '+str(drift))
            self.verify_served('before');self.http()
            if not self.args.http_only:self.browser()
            self.verify_served('after');self.report['sourceDrift']=self.sources_unchanged()
            if self.report['sourceDrift'] or self.report['errors']:raise AssertionError('Source drift or browser errors')
            if not self.args.http_only and [x['id'] for x in self.report['checks']]!=CASE_IDS:raise AssertionError('Incomplete 11-case coverage')
            self.report['status']='PASS_HTTP_ONLY_NOT_BROWSER' if self.args.http_only else 'PASS'
        except Exception as e:
            self.report.update(status='FAIL',error=repr(e),traceback=traceback.format_exc())
        finally:
            self.report['completedAt']=now()
            if (self.out/'served-artifacts.json').exists():self.report['servedArtifacts']=ref(self.out/'served-artifacts.json')
            self.save()
        if self.report['status']=='PASS':
            try:
                make_gate_adapter(self.out/'browser-result.json',self.out/'gate-voice-browser-adapter.json')
                make_audio_adapter(self.out/'http-result.json',self.out/'gate-audio-adapter.json')
            except Exception as e:
                self.report.update(status='FAIL_ADAPTER',adapterError=repr(e));self.save()
        return self.report


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for name in ('base','out','artifact-pins','source-pins','build-dir'):p.add_argument('--'+name,required=True)
    p.add_argument('--http-only',action='store_true',help='No browser: fresh HTTP and served compiled hashes only')
    args=p.parse_args();r=Run(args).run();print(json.dumps({'status':r['status'],'cases':len(r['checks']),'error':r.get('error'),'out':args.out}))
    return 0 if r['status'] in ('PASS','PASS_HTTP_ONLY_NOT_BROWSER') else 1


if __name__=='__main__':raise SystemExit(main())
