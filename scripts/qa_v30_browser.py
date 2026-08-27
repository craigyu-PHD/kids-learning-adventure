#!/usr/bin/env python3
import base64, hashlib, json, os, shutil, signal, socket, subprocess, tempfile, time, urllib.request
from pathlib import Path
import websocket

ROOT = Path(__file__).resolve().parents[1]
QA_DIR = ROOT / '.qa'
QA_DIR.mkdir(exist_ok=True)
URL = 'http://127.0.0.1:4173/'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PIN = '2468'


def free_port():
    sock = socket.socket(); sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]; sock.close(); return port


def cred(pin, salt):
    digest = hashlib.pbkdf2_hmac('sha256', pin.encode(), salt, 180000, 32)
    return base64.b64encode(digest).decode(), base64.b64encode(salt).decode()


father_hash, father_salt = cred('1357', b'father-v30-salt!')
mother_hash, mother_salt = cred('9753', b'mother-v30-salt!')
settings = {
    'theme': 'light', 'visualTheme': 'hero', 'semesterStart': '2026-08-27',
    'users': [
        {'id': 'user-father', 'name': '爸爸', 'role': 'father', 'disabled': False, 'userPinHash': father_hash, 'userPinSalt': father_salt, 'userPinIterations': 180000},
        {'id': 'user-mother', 'name': '媽媽', 'role': 'mother', 'disabled': False, 'userPinHash': mother_hash, 'userPinSalt': mother_salt, 'userPinIterations': 180000},
        {'id': 'user-caregiver', 'name': '阿姨', 'role': 'caregiver', 'disabled': False, 'userPinHash': '', 'userPinSalt': '', 'userPinIterations': 0},
    ],
    'children': [
        {'id': 'child-1', 'name': '哥哥', 'avatar': 'nova', 'role': 'child', 'disabled': False},
        {'id': 'child-2', 'name': '弟弟', 'avatar': 'rex', 'role': 'child', 'disabled': False},
    ],
    'cloudSync': {'enabled': False, 'familyCode': ''},
}
progress_seed = {
    'child-1': {
        'completedDays': [], 'completedBlocks': [], 'completedMissions': [], 'claimedEggs': [],
        'unlockedCosmetics': ['sunny-explorer-hat'], 'equippedCosmetics': ['sunny-explorer-hat'],
        'badgeUnlocks': {}, 'completionTimestamps': {},
    },
}


class CDP:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=10, origin='http://localhost')
        self.i = 0
    def call(self, method, params=None):
        self.i += 1; ident = self.i
        self.ws.send(json.dumps({'id': ident, 'method': method, 'params': params or {}}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get('id') == ident:
                if 'error' in msg: raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get('result', {})
    def eval(self, expr, awaitPromise=True):
        r = self.call('Runtime.evaluate', {'expression': expr, 'returnByValue': True, 'awaitPromise': awaitPromise})
        if r.get('exceptionDetails'): raise RuntimeError(r['exceptionDetails'])
        return r.get('result', {}).get('value')
    def close(self): self.ws.close()


def wait_http(url, timeout=15):
    end = time.time() + timeout
    while time.time() < end:
        try:
            with urllib.request.urlopen(url, timeout=1) as r:
                if r.status < 500: return
        except Exception: time.sleep(.2)
    raise RuntimeError(f'HTTP unavailable: {url}')


def wait_js(cdp, expr, timeout=15):
    end = time.time() + timeout
    while time.time() < end:
        try:
            if cdp.eval(expr): return
        except Exception: pass
        time.sleep(.15)
    raise RuntimeError('wait_js timeout: ' + expr)


def set_input(cdp, selector, value):
    js = f'''(() => {{ const el=document.querySelector({json.dumps(selector)}); if(!el) return false; const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; s.call(el,{json.dumps(value)}); el.dispatchEvent(new Event('input',{{bubbles:true}})); el.dispatchEvent(new Event('change',{{bubbles:true}})); return true; }})()'''
    assert cdp.eval(js), selector


def click_text(cdp, selector, text):
    js = f'''(() => {{ const el=[...document.querySelectorAll({json.dumps(selector)})].find(e=>e.textContent.includes({json.dumps(text)})); if(!el) return false; el.click(); return true; }})()'''
    assert cdp.eval(js), (selector, text)


def snapshot(cdp, label, child_mode=True):
    return cdp.eval(f'''(() => {{
      const root=document.documentElement, body=document.body;
      const imgs=[...document.images];
      const broken=imgs.filter(i=>i.complete && i.naturalWidth===0).map(i=>i.src);
      const bpmf=(body.innerText.match(/[\\u3100-\\u312f\\u31a0-\\u31bf]/g)||[]).length;
      const leaf=[...document.querySelectorAll('body *')].filter(e=>{{
        const t=(e.textContent||'').trim(); if(!t || e.children.length) return false;
        const r=e.getBoundingClientRect(); if(r.width<1||r.height<1) return false;
        const s=getComputedStyle(e); return s.visibility!=='hidden'&&s.display!=='none';
      }});
      const tiny=leaf.filter(e=>parseFloat(getComputedStyle(e).fontSize)<{14 if child_mode else 12}).slice(0,40).map(e=>[e.tagName,e.className,getComputedStyle(e).fontSize,(e.textContent||'').trim().slice(0,60)]);
      const undersized=[...document.querySelectorAll('button,a,[role="button"]')].filter(e=>{{const r=e.getBoundingClientRect(),s=getComputedStyle(e); return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&(r.width<44||r.height<44);}}).slice(0,30).map(e=>[e.tagName,e.className,Math.round(e.getBoundingClientRect().width),Math.round(e.getBoundingClientRect().height),(e.textContent||'').trim().slice(0,40)]);
      return {{label:{json.dumps(label)},width:innerWidth,scrollWidth:root.scrollWidth,bodyScrollWidth:body.scrollWidth,overflow:Math.max(root.scrollWidth,body.scrollWidth)-innerWidth,broken,bpmf,tiny,undersized,theme:root.dataset.theme,world:root.dataset.adventureTheme,dark:root.classList.contains('dark'),title:document.title}};
    }})()''')


def main():
    vite_proc = None
    try:
        wait_http(URL, timeout=1)
    except RuntimeError:
        vite_proc = subprocess.Popen(['npm','run','dev','--','--host','127.0.0.1','--port','4173'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        wait_http(URL, timeout=20)

    profile = tempfile.mkdtemp(prefix='v30-chrome-')
    seed_path = ROOT / 'public/__qa_v30_seed.html'
    settings_json = json.dumps(settings, ensure_ascii=False).replace('</', '<\\/')
    progress_json = json.dumps(progress_seed, ensure_ascii=False).replace('</', '<\\/')
    seed_path.write_text(f'''<!doctype html><meta charset="utf-8"><script>
localStorage.setItem('star-learning-active-family-pin-v22',{json.dumps(PIN)});
localStorage.setItem('star-learning-v22:{PIN}:settings',JSON.stringify({settings_json}));
localStorage.setItem('star-learning-v22:{PIN}:progress',JSON.stringify({progress_json}));
sessionStorage.setItem('star-learning-v22:{PIN}:active-user','user-father');
location.replace('/');
</script>''')
    port = free_port(); seed_url = URL.rstrip('/') + '/__qa_v30_seed.html'
    proc = subprocess.Popen([CHROME,'--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-allow-origins=*',f'--remote-debugging-port={port}',f'--user-data-dir={profile}','--window-size=1440,1200',seed_url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    try:
        wait_http(f'http://127.0.0.1:{port}/json/version')
        page=None; deadline=time.time()+20
        while time.time()<deadline:
            targets=json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json'))
            page=next((t for t in targets if t.get('type')=='page' and t.get('url')==URL),None)
            if page: break
            time.sleep(.25)
        if not page: raise RuntimeError('Chrome did not reach app URL')
        time.sleep(4)
        targets=json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json'))
        page=next(t for t in targets if t.get('type')=='page' and t.get('url')==URL)
        cdp=CDP(page['webSocketDebuggerUrl']); cdp.call('Page.enable'); cdp.call('Runtime.enable')
        wait_js(cdp, "!!(document.querySelector('.v30-story-hero') && document.querySelector('.active-user-chip'))", timeout=30)
        time.sleep(.5)
        results=[]

        # V3 brand/child home hard gates.
        brand=cdp.eval("(() => {const s=getComputedStyle(document.documentElement); return {brand:s.getPropertyValue('--brand').trim(),purple:s.getPropertyValue('--brand-2').trim(),reward:s.getPropertyValue('--reward').trim(),success:s.getPropertyValue('--success').trim(),speaking:s.getPropertyValue('--speaking').trim(),listening:s.getPropertyValue('--listening').trim()}})()")
        assert brand == {'brand':'#6C63E8','purple':'#63C7F5','reward':'#FFD35A','success':'#58D2A0','speaking':'#FF7E72','listening':'#63C7F5'}, brand
        assert cdp.eval("document.querySelectorAll('.v30-child-nav button').length") == 4
        assert cdp.eval("document.querySelectorAll('.v30-story-hero .v30-primary-cta').length") == 1
        assert cdp.eval("document.querySelectorAll('.v30-home .avatar-equipped-cosmetic').length") >= 1
        assert not cdp.eval("!!document.querySelector('.adventure-cursor,.cursor-trail-layer,.click-effects,.click-burst')")
        assert 'V3.0' in cdp.eval('document.title')
        hero_assets=cdp.eval("[...document.querySelectorAll('.v30-story-hero img,.v30-world-card img')].map(i=>i.getAttribute('src'))")
        assert hero_assets and all('/assets/v30/' in x for x in hero_assets), hero_assets
        results.append(snapshot(cdp,'desktop-home',True))

        # Caregiver/learner separation and personal PIN.
        click_text(cdp,'.active-user-chip','爸爸'); wait_js(cdp,"!!document.querySelector('.user-switch-modal')")
        cards=cdp.eval("[...document.querySelectorAll('.user-select-card strong')].map(e=>e.textContent)")
        assert cards==['爸爸','媽媽','阿姨'], cards
        click_text(cdp,'.user-select-card','媽媽'); set_input(cdp,'.user-switch-modal input','0000'); click_text(cdp,'.user-switch-modal .primary-button','進入')
        wait_js(cdp,"!!document.querySelector('.user-switch-modal .pin-error')"); assert '不正確' in cdp.eval("document.querySelector('.user-switch-modal .pin-error').innerText")
        set_input(cdp,'.user-switch-modal input','9753'); click_text(cdp,'.user-switch-modal .primary-button','進入')
        wait_js(cdp,"!document.querySelector('.user-switch-modal') && document.querySelector('.active-user-chip').innerText.includes('媽媽')")

        # Child lesson presentation: Warm-up → Learn → Challenge.
        click_text(cdp,'.v30-primary-cta','開始今天的冒險'); wait_js(cdp,"!!document.querySelector('.v30-stage-nav')")
        stages=cdp.eval("[...document.querySelector('.v30-stage-nav').querySelectorAll('button strong')].map(e=>e.textContent)")
        assert stages==['Warm-up','Learn','Challenge'], stages
        lesson_assets=cdp.eval("[...document.querySelectorAll('.v30-lesson-page img')].map(i=>i.getAttribute('src')).filter(Boolean)")
        assert lesson_assets and all('/assets/v30/' in x for x in lesson_assets), lesson_assets[:10]
        click_text(cdp,'.v30-next-stage','Warm-up 完成'); wait_js(cdp,"document.querySelectorAll('.v30-vocab-card').length>0")
        assert cdp.eval("[...document.querySelectorAll('.v30-vocab-card')].every(b=>b.getBoundingClientRect().height>=44)")
        results.append(snapshot(cdp,'desktop-lesson-learn',True))
        click_text(cdp,'.v30-stage-actions .v30-primary-cta','Learn 完成'); wait_js(cdp,"!!document.querySelector('.v30-challenge-stage')")
        assert cdp.eval("document.querySelectorAll('.v30-mission-card').length") == 4
        assert cdp.eval("(() => {const b=document.querySelector('.v30-mission-players button:not(:disabled)'); if(!b)return false; b.click(); return true})()")
        wait_js(cdp,"!!document.querySelector('.v30-celebration')")
        rewardMoment=bool(cdp.eval("document.querySelector('.v30-celebration').innerText.includes('XP') && !!document.querySelector('.v30-celebration-skip')"))
        assert rewardMoment
        reward_assets=cdp.eval("[...document.querySelectorAll('.v30-celebration img')].map(i=>i.getAttribute('src')).filter(Boolean)")
        assert reward_assets and all('/assets/v30/' in x for x in reward_assets), reward_assets
        click_text(cdp,'.v30-celebration-skip','Skip'); wait_js(cdp,"!document.querySelector('.v30-celebration')")
        cdp.eval("document.querySelector('.v30-lesson-header .icon-button').click()")
        wait_js(cdp,"!!document.querySelector('.v30-story-hero')")

        # Child exploration surfaces: 9 worlds, 24 badges per learner, five growth stages.
        click_text(cdp,'.v30-child-nav button','冒險世界'); wait_js(cdp,"!!document.querySelector('.v30-adventure-map')")
        mapWorldCount=cdp.eval("document.querySelectorAll('.v30-map-world-strip article').length")
        assert mapWorldCount == 9, mapWorldCount
        assert cdp.eval("document.querySelectorAll('.v30-map-node').length") == 90
        results.append(snapshot(cdp,'desktop-adventure-map',True))
        click_text(cdp,'.v30-child-nav button','獎勵'); wait_js(cdp,"!!document.querySelector('.v30-rewards-page')")
        badgeCount=cdp.eval("document.querySelector('.v30-badge-learner')?.querySelectorAll('.v30-game-badge').length || 0")
        assert badgeCount == 24, badgeCount
        assert cdp.eval("[...document.querySelectorAll('.v30-game-badge-art')].every(i=>i.getAttribute('src').includes('/assets/v30/badges/'))")
        results.append(snapshot(cdp,'desktop-badges',True))
        click_text(cdp,'.v30-child-nav button','我的角色'); wait_js(cdp,"!!document.querySelector('.v30-character-page')")
        characterStageCount=cdp.eval("document.querySelector('.v30-stage-road')?.querySelectorAll('span').length || 0")
        assert characterStageCount == 5, characterStageCount
        assert cdp.eval("document.querySelectorAll('.v30-cosmetic-grid button').length") >= 5
        assert cdp.eval("document.querySelectorAll('.v30-character-page .avatar-equipped-cosmetic').length") >= 1
        results.append(snapshot(cdp,'desktop-character',True))
        cdp.eval("document.querySelector('.v30-brand').click()"); wait_js(cdp,"!!document.querySelector('.v30-story-hero')")

        # Parent Mode is protected, but the PIN modal must always be escapable.
        click_text(cdp,'.v30-parent-entry','家長專區'); wait_js(cdp,"!!document.querySelector('.admin-modal')")
        assert cdp.eval("!!document.querySelector('.admin-modal .v30-modal-x')")
        click_text(cdp,'.admin-modal .modal-close-link','取消'); wait_js(cdp,"!document.querySelector('.admin-modal') && !!document.querySelector('.v30-story-hero')")
        click_text(cdp,'.v30-parent-entry','家長專區'); wait_js(cdp,"!!document.querySelector('.admin-modal')")
        set_input(cdp,'.admin-modal input','1111'); click_text(cdp,'.admin-modal .primary-button','解鎖'); wait_js(cdp,"!!document.querySelector('.admin-modal .pin-error')")
        assert cdp.eval("document.querySelector('.admin-modal input').value") == '1111'
        cdp.call('Input.dispatchKeyEvent', {'type':'keyDown','key':'Escape','code':'Escape','windowsVirtualKeyCode':27,'nativeVirtualKeyCode':27}); wait_js(cdp,"!document.querySelector('.admin-modal')")
        click_text(cdp,'.v30-parent-entry','家長專區'); wait_js(cdp,"!!document.querySelector('.admin-modal')")
        set_input(cdp,'.admin-modal input',PIN); click_text(cdp,'.admin-modal .primary-button','解鎖'); wait_js(cdp,"!!document.querySelector('.v30-parent-page') && !document.querySelector('.admin-modal')")
        assert cdp.eval("document.querySelector('.app-shell').classList.contains('parent-presentation')")
        click_text(cdp,'.v30-parent-page .v30-secondary-cta','家庭設定'); wait_js(cdp,"!!document.querySelector('.settings-page')")
        settings_text=cdp.eval("document.querySelector('.settings-page').innerText")
        assert all(x in settings_text for x in ['爸爸','媽媽','哥哥','弟弟','Adventure World'])

        # Adventure World can change content ID/art, never the Design System signature.
        world_titles=['Hello Town','Color Garden','Animal Forest','Food Market','Ocean Adventure']
        signatures=[]; ids=[]
        for title in world_titles:
            click_text(cdp,'.visual-theme-option',title); time.sleep(.12)
            ids.append(cdp.eval("document.documentElement.dataset.adventureTheme"))
            signatures.append(cdp.eval("(() => {const r=document.documentElement,p=document.querySelector('.settings-card'),b=document.querySelector('.secondary-button');const s=getComputedStyle(r),ps=getComputedStyle(p),bs=getComputedStyle(b);return [s.getPropertyValue('--brand').trim(),s.getPropertyValue('--bg').trim(),ps.borderRadius,bs.borderRadius,bs.minHeight].join('|')})()"))
        assert len(set(ids))==5, ids
        assert len(set(signatures))==1, signatures

        # Light / dark / system still work.
        for mode in ['light','dark','system']:
            click_text(cdp,'.segmented-control button', {'light':'明亮','dark':'夜間冒險','system':'隨系統'}[mode]); time.sleep(.12)
            if mode=='light': assert not cdp.eval("document.documentElement.classList.contains('dark')")
            if mode=='dark': assert cdp.eval("document.documentElement.classList.contains('dark')")
        results.append(snapshot(cdp,'desktop-parent-settings',False))

        # Responsive Child Mode: desktop/tablet/mobile, no dashboard squeeze or overflow.
        cdp.eval("document.querySelector('.v30-brand').click()"); wait_js(cdp,"!!document.querySelector('.v30-story-hero')")
        for width,height,name in [(1440,1200,'desktop'),(820,1180,'tablet'),(390,844,'mobile')]:
            cdp.call('Emulation.setDeviceMetricsOverride', {'width':width,'height':height,'deviceScaleFactor':1,'mobile':width<600}); time.sleep(.25)
            results.append(snapshot(cdp,f'{name}-home',True))
            if width<=820:
                assert cdp.eval("getComputedStyle(document.querySelector('.v30-child-nav')).position")=='fixed'
        # Mobile modal becomes bottom sheet.
        cdp.call('Emulation.setDeviceMetricsOverride', {'width':390,'height':844,'deviceScaleFactor':1,'mobile':True})
        cdp.eval("document.querySelector('.active-user-chip').click()"); wait_js(cdp,"!!document.querySelector('.user-switch-modal')"); time.sleep(.32)
        modal=cdp.eval("(() => {const e=document.querySelector('.user-switch-modal'),s=getComputedStyle(e),r=e.getBoundingClientRect();return {position:s.position,bottom:Math.round(innerHeight-r.bottom),width:Math.round(r.width),vw:innerWidth}})()")
        assert modal['position']=='fixed' and abs(modal['bottom'])<=2 and modal['width']>=modal['vw']-2, modal
        cdp.eval("document.querySelector('.modal-close-link').click()")

        for r in results:
            assert r['overflow'] <= 1, r
            assert r['bpmf'] == 0, r
            assert not r['broken'], r
            assert not r['tiny'], r
            assert not r['undersized'], r

        out={'status':'PASS','brand':brand,'worldIds':ids,'worldUiSignatures':signatures,'caregiverCards':cards,'mapWorldCount':mapWorldCount,'badgeCount':badgeCount,'characterStageCount':characterStageCount,'rewardMoment':rewardMoment,'mobileModal':modal,'results':results}
        (QA_DIR/'v30_browser_result.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
        print(json.dumps(out,ensure_ascii=False,indent=2)); cdp.close()
    finally:
        try: os.killpg(proc.pid, signal.SIGTERM)
        except Exception: pass
        try: proc.wait(timeout=3)
        except Exception:
            try: os.killpg(proc.pid, signal.SIGKILL)
            except Exception: pass
        shutil.rmtree(profile,ignore_errors=True)
        try: seed_path.unlink()
        except FileNotFoundError: pass
        if vite_proc is not None:
            try: os.killpg(vite_proc.pid, signal.SIGTERM)
            except Exception: pass
            try: vite_proc.wait(timeout=3)
            except Exception:
                try: os.killpg(vite_proc.pid, signal.SIGKILL)
                except Exception: pass


if __name__=='__main__': main()
