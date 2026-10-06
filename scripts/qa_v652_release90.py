#!/usr/bin/env python3
"""Bounded release candidate checks. Historical evidence gates are recorded, never relabelled PASS."""
import argparse, copy, hashlib, json, os, signal, socket, subprocess, sys, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PURE = ['validate', 'qa:state', 'qa:auth', 'qa:date', 'qa:learning']
CORE = ['validate', 'qa:state', 'qa:auth', 'qa:date', 'qa:learning', 'qa:architecture', 'qa:shop', 'qa:v63:shop-transactions']


def stop_owned(p):
    if p.poll() is None:
        os.killpg(p.pid, signal.SIGTERM)
        try: p.wait(timeout=4)
        except subprocess.TimeoutExpired:
            os.killpg(p.pid, signal.SIGKILL); p.wait(timeout=4)


def snapshot():
    """Content pins for compile inputs; metadata pins for the complete public copy tree."""
    source = {}
    for folder in ['src', 'api']:
        for p in sorted((ROOT / folder).rglob('*')):
            if p.is_file():
                s = p.stat()
                if s.st_size and not s.st_blocks: raise RuntimeError(f'dataless compile input: {p}')
                source[str(p.relative_to(ROOT))] = hashlib.sha256(p.read_bytes()).hexdigest()
    for name in ['index.html', 'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json']:
        source[name] = hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
    public = {str(p.relative_to(ROOT)): [p.stat().st_size, p.stat().st_mtime_ns]
              for p in sorted((ROOT / 'public').rglob('*')) if p.is_file()}
    return {'compileInputSHA256': source, 'publicSizeMtimeNs': public,
            'publicContentHashCoverage': 'not exhaustive; Vite copies actual public bytes and smoke decodes visible images'}


def smoke(url, out):
    from playwright.sync_api import sync_playwright
    from qa_v63_browser_seed import SETTINGS, PROGRESS
    rows = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        try:
            for width, theme in [(390, 'light'), (390, 'dark'), (1440, 'light'), (1440, 'dark')]:
                settings = copy.deepcopy(SETTINGS); settings['theme'] = theme
                settings['homeDisplayLearnerId'] = 'child-1'
                context = browser.new_context(viewport={'width': width, 'height': 1000}, reduced_motion='reduce')
                context.add_init_script("""(() => {
                  localStorage.setItem('star-learning-v40:__local__:settings', JSON.stringify(%s));
                  localStorage.setItem('star-learning-v40:__local__:progress', JSON.stringify(%s));
                  localStorage.setItem('star-learning-v40:__local__:attendance', '{}');
                  localStorage.setItem('star-learning-v40:__local__:reflections', '{}');
                  localStorage.setItem('little-explorers-v4-sound','off');
                  sessionStorage.setItem('star-learning-v40:__local__:active-user','user-father');
                })();""" % (json.dumps(settings, ensure_ascii=False), json.dumps(PROGRESS)))
                context.route('**/api/**', lambda route: route.fulfill(status=503, body='isolated QA: no cloud writes'))
                body = json.dumps({'now':'2026-09-02T01:00:00.000Z','activeDate':'2026-09-02',
                                   'taipeiDate':'2026-09-02','taipeiTime':'09:00:00','timeZone':'Asia/Taipei'})
                for endpoint in ['time', 'server-time']:
                    context.route('**/api/' + endpoint, lambda route: route.fulfill(status=200, content_type='application/json', body=body))
                page = context.new_page(); errors = []; asset_http = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('response', lambda resp: asset_http.append({'url':resp.url,'status':resp.status})
                        if '/assets/' in resp.url and resp.url.startswith(url) and resp.status >= 400 else None)
                page.goto(url, wait_until='domcontentloaded', timeout=30000)
                page.wait_for_selector('.v4-dashboard-grid', timeout=20000)
                case = {'width':width,'theme':theme,'pages':[]}
                for view in ['Home', 'Shop']:
                    if view == 'Shop': page.get_by_role('button', name='寶物商店', exact=True).first.click()
                    page.wait_for_timeout(350)
                    health = page.evaluate("""async () => {
                      const visible = e => {const r=e.getBoundingClientRect();const s=getComputedStyle(e);
                        return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
                      const images=[...document.images].filter(i=>visible(i)&&i.currentSrc.startsWith(location.origin));
                      const broken=[];for(const i of images){try{await i.decode();if(!i.naturalWidth)throw Error('empty');}
                        catch{broken.push(i.currentSrc);}}
                      const motion=[...document.querySelectorAll('.v4-stars i,.v4-robot-hand')].filter(visible)
                        .map(e=>getComputedStyle(e).animationName);
                      return {visibleLocalImages:images.length,broken,overflow:document.documentElement.scrollWidth-innerWidth,
                        bopomofo:(document.body.innerText.match(/[\\u3100-\\u312f\\u31a0-\\u31bf]/g)||[]).length,
                        reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,motion};
                    }""")
                    assert health['visibleLocalImages'] > 0, 'no visible local art'
                    assert not health['broken'], health
                    assert health['overflow'] <= 1 and health['bopomofo'] == 0, health
                    assert health['reducedMotion'] and all(x == 'none' for x in health['motion']), health
                    page.screenshot(path=str(out / f'{width}-{theme}-{view}.png'), full_page=True)
                    case['pages'].append({'view':view, **health})
                assert not errors and not asset_http, {'pageErrors':errors,'assetHTTPFailures':asset_http}
                case.update(status='PASS', pageErrors=errors, assetHTTPFailures=asset_http)
                rows.append(case); context.close()
        finally: browser.close()
    return {'status':'PASS_PRODUCTION_PREVIEW_SMOKE','cases':rows,
            'boundary':'4 isolated Chromium Home/Shop cases; API time fixture; no real family/cloud writes; not physical-device or exhaustive art acceptance'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--attempt', required=True)
    parser.add_argument('--phase', choices=['pure', 'release'], default='release')
    parser.add_argument('--resume-from', help='Reuse passed stages only when exact frozen input snapshot is unchanged')
    args = parser.parse_args()
    assert args.attempt and all(c.isalnum() or c in '-_' for c in args.attempt)
    out = ROOT / 'qa/v652/release90' / args.attempt; out.mkdir(parents=True, exist_ok=False)
    report = {'status':'RUNNING','phase':args.phase,'steps':[], 'deployment':'NOT_RUN',
              'oldHistoricalGateStatus':'NOT_PASSED_BY_THIS_PIPELINE',
              'skippedPrebuild':json.loads((ROOT/'package.json').read_text())['scripts']['prebuild'],
              'reason':'User prioritised a complete usable release; historical artifact reproduction is not required by TypeScript/Vite compilation. Existing gates and failures are preserved.',
              'acceptance':'bounded core/build/smoke scope only; no numeric score or full historical-art acceptance claimed'}
    preview = None
    prior = None
    if args.resume_from:
        assert all(c.isalnum() or c in '-_' for c in args.resume_from)
        prior_dir = ROOT/'qa/v652/release90'/args.resume_from
        assert snapshot() == json.loads((prior_dir/'inputs-before.json').read_text()), 'frozen candidate changed; cannot reuse stages'
        prior = json.loads((prior_dir/'report.json').read_text())
        report['resumedFrom'] = str(prior_dir/'report.json')
    def save(): (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    def run(name, command, timeout=90):
        passed = next((r for r in prior['steps'] if r['name']==name and r['status']=='PASS'),None) if prior else None
        if passed:
            report['steps'].append({**passed,'reusedFrom':report['resumedFrom']});save();print(name,'prior PASS reused for identical candidate',flush=True);return
        start = time.monotonic()
        with (out/(name+'.log')).open('x') as log:
            p = subprocess.Popen(command,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
            row={'name':name,'command':command,'pid':p.pid,'status':'RUNNING','timeoutSeconds':timeout};report['steps'].append(row);save();print(name,'PID',p.pid,flush=True)
            try: code=p.wait(timeout=timeout); state='PASS' if code==0 else 'FAIL'
            except subprocess.TimeoutExpired: stop_owned(p);code=p.returncode;state='TIMEOUT'
            row.update(status=state,exitCode=code,durationSeconds=round(time.monotonic()-start,3));save()
            if code: raise RuntimeError(f'{name}: {state}, exit {code}; see {out/(name+".log")}')
    try:
        if args.phase == 'pure':
            for step in PURE: run(step.replace(':','-'),['npm','run',step])
            report['status']='PASS_PURE_CORE_ONLY';save();return
        before=snapshot();(out/'inputs-before.json').write_text(json.dumps(before,indent=2))
        run('strict',['npm','run','qa:strict'])
        # package build is exactly vite build; call it directly to bypass only the documented prebuild chain.
        assert json.loads((ROOT/'package.json').read_text())['scripts']['build']=='vite build'
        run('vite-build',['node','node_modules/vite/bin/vite.js','build'],180)
        assert (ROOT/'dist/index.html').is_file()
        for step in CORE: run(step.replace(':','-'),['npm','run',step])
        sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close();url=f'http://127.0.0.1:{port}/'
        preview=subprocess.Popen(['node','node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',str(port),'--strictPort'],cwd=ROOT,stdout=(out/'preview.log').open('x'),stderr=subprocess.STDOUT,start_new_session=True)
        report['ownedPreview']={'pid':preview.pid,'url':url};save()
        for _ in range(50):
            try:
                with urllib.request.urlopen(url,timeout=1) as response:
                    if response.status==200:break
            except OSError: time.sleep(.1)
        else: raise RuntimeError('production preview did not become ready')
        run('current-252-shop-previews',[sys.executable,'scripts/qa_v652_current_shop_previews.py',
            '--base-url',url,'--output',str(out/'current-shop-previews.json')],300)
        report['currentShopPreviews']='current-shop-previews.json'
        # Existing migration assertions against this production build, in an isolated browser context.
        migration="import sys;sys.path.insert(0,'scripts');import qa_v40_browser as b;b.URL="+repr(url)+";import qa_v40_family_migration as m;m.main()"
        run('migration-production-preview',[sys.executable,'-c',migration],90)
        lesson_dir=out/'lesson-integration'
        lesson="import sys;from pathlib import Path;sys.path.insert(0,'scripts');import qa_v65_lesson_integration as q;q.URL="+repr(url)+";q.OUT=Path("+repr(str(lesson_dir))+");q.OUT.mkdir();q.RESULT=q.OUT/'result.json';raise SystemExit(q.main())"
        run('lesson-integration-production-preview',[sys.executable,'-c',lesson],150)
        report['lessonBoundary']='Existing isolated local-family fixture: 2 lessons x 4 learners settlement/reload/no duplicate rewards. Earlier warmup/vocabulary/practice prerequisite stage keys are pre-seeded; not a full observed lesson sequence.'
        smoke_code="import sys,json;from pathlib import Path;sys.path.insert(0,'scripts');from qa_v652_release90 import smoke;r=smoke("+repr(url)+",Path("+repr(str(out))+"));Path("+repr(str(out/'smoke.json'))+").write_text(json.dumps(r,ensure_ascii=False,indent=2))"
        run('art-loaded-motion-smoke',[sys.executable,'-c',smoke_code],90)
        after=snapshot();(out/'inputs-after.json').write_text(json.dumps(after,indent=2));assert before==after,'compile inputs or public metadata changed during run'
        report.update(status='PASS_RELEASE90_CORE_BUILD_SMOKE',compileInputsStable=True,publicMetadataStable=True,
                      smoke='smoke.json',vercelFunctionsBuild='NOT_RUN_ROOT_OWNS_VERCEL_BUILD',releaseAcceptance='SCOPED_90_PRIORITY_ONLY')
    except Exception as error:
        report.update(status='FAIL',error=str(error));raise
    finally:
        if preview: stop_owned(preview)
        save();print(json.dumps({'status':report['status'],'report':str(out/'report.json')},ensure_ascii=False),flush=True)

if __name__=='__main__':main()
