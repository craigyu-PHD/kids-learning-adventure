#!/usr/bin/env python3
import base64, hashlib, json, os, queue, shutil, socket, subprocess, tempfile, threading, time, urllib.request, signal
from pathlib import Path
import websocket

ROOT = Path(__file__).resolve().parents[1]
QA_DIR = ROOT / '.qa'
QA_DIR.mkdir(exist_ok=True)
URL = 'http://127.0.0.1:4173/'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PIN = '2468'

def free_port():
    sock=socket.socket(); sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]; sock.close(); return port

def cred(pin, salt):
    digest = hashlib.pbkdf2_hmac('sha256', pin.encode(), salt, 180000, 32)
    return base64.b64encode(digest).decode(), base64.b64encode(salt).decode()

father_hash, father_salt = cred('1357', b'father-v23-salt!')
mother_hash, mother_salt = cred('9753', b'mother-v23-salt!')
settings = {
    'theme': 'system', 'visualTheme': 'hero', 'semesterStart': '2026-08-31',
    'users': [
        {'id':'user-father','name':'爸爸','role':'father','disabled':False,'userPinHash':father_hash,'userPinSalt':father_salt,'userPinIterations':180000},
        {'id':'user-mother','name':'媽媽','role':'mother','disabled':False,'userPinHash':mother_hash,'userPinSalt':mother_salt,'userPinIterations':180000},
        {'id':'user-caregiver','name':'阿姨','role':'caregiver','disabled':False,'userPinHash':'','userPinSalt':'','userPinIterations':0},
    ],
    'children': [
        {'id':'child-1','name':'哥哥','avatar':'nova','role':'child','disabled':False},
        {'id':'child-2','name':'弟弟','avatar':'rex','role':'child','disabled':False},
    ],
    'cloudSync': {'enabled':False,'familyCode':''},
}

class CDP:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=10, origin='http://localhost')
        self.i = 0
    def call(self, method, params=None):
        self.i += 1; ident=self.i
        self.ws.send(json.dumps({'id':ident,'method':method,'params':params or {}}))
        while True:
            msg=json.loads(self.ws.recv())
            if msg.get('id')==ident:
                if 'error' in msg: raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get('result',{})
    def eval(self, expr, awaitPromise=True):
        r=self.call('Runtime.evaluate', {'expression':expr,'returnByValue':True,'awaitPromise':awaitPromise})
        if r.get('exceptionDetails'): raise RuntimeError(r['exceptionDetails'])
        return r.get('result',{}).get('value')
    def close(self): self.ws.close()

def wait_http(url, timeout=15):
    end=time.time()+timeout
    while time.time()<end:
        try:
            with urllib.request.urlopen(url, timeout=1) as r:
                if r.status < 500: return
        except Exception: time.sleep(.2)
    raise RuntimeError(f'HTTP unavailable: {url}')

def wait_js(cdp, expr, timeout=15):
    end=time.time()+timeout
    while time.time()<end:
        try:
            if cdp.eval(expr): return
        except Exception: pass
        time.sleep(.15)
    raise RuntimeError('wait_js timeout: '+expr)

def set_input(cdp, selector, value):
    js=f'''(() => {{ const el=document.querySelector({json.dumps(selector)}); if(!el) return false; const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; s.call(el,{json.dumps(value)}); el.dispatchEvent(new Event('input',{{bubbles:true}})); el.dispatchEvent(new Event('change',{{bubbles:true}})); return true; }})()'''
    assert cdp.eval(js), selector

def click_text(cdp, selector, text):
    js=f'''(() => {{ const el=[...document.querySelectorAll({json.dumps(selector)})].find(e=>e.textContent.includes({json.dumps(text)})); if(!el) return false; el.click(); return true; }})()'''
    assert cdp.eval(js), (selector,text)

def snapshot(cdp, label):
    return cdp.eval(f'''(() => {{
      const root=document.documentElement, body=document.body;
      const imgs=[...document.images];
      const broken=imgs.filter(i=>i.complete && i.naturalWidth===0).map(i=>i.src);
      const bpmf=(body.innerText.match(/[\\u3100-\\u312f\\u31a0-\\u31bf]/g)||[]).length;
      const tiny=[...document.querySelectorAll('body *')].filter(e=>{{ const t=(e.textContent||'').trim(); if(!t || e.children.length) return false; const r=e.getBoundingClientRect(); if(r.width<1||r.height<1) return false; const s=getComputedStyle(e); return s.visibility!=='hidden'&&s.display!=='none'&&parseFloat(s.fontSize)<10; }}).slice(0,30).map(e=>[e.tagName,e.className,getComputedStyle(e).fontSize,(e.textContent||'').trim().slice(0,60)]);
      return {{label:{json.dumps(label)}, width:innerWidth, scrollWidth:root.scrollWidth, bodyScrollWidth:body.scrollWidth, overflow:Math.max(root.scrollWidth,body.scrollWidth)-innerWidth, broken, bpmf, tiny, theme:root.dataset.theme, adventure:root.dataset.adventureTheme, dark:root.classList.contains('dark'), title:document.title}};
    }})()''')

def main():
    vite_proc = None
    try:
        wait_http(URL, timeout=1)
    except RuntimeError:
        vite_proc = subprocess.Popen(
            ['npm', 'run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'],
            cwd=ROOT,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        wait_http(URL, timeout=20)
    profile=tempfile.mkdtemp(prefix='v23-chrome-')
    seed_path=ROOT/'public/__qa_v23_seed.html'
    settings_json=json.dumps(settings,ensure_ascii=False).replace('</','<\\/')
    seed_path.write_text(f'''<!doctype html><meta charset="utf-8"><script>
localStorage.setItem('star-learning-active-family-pin-v22',{json.dumps(PIN)});
localStorage.setItem('star-learning-v22:{PIN}:settings',JSON.stringify({settings_json}));
sessionStorage.setItem('star-learning-v22:{PIN}:active-user','user-father');
location.replace('/');
</script>''')
    port=free_port()
    seed_url=URL.rstrip('/')+'/__qa_v23_seed.html'
    proc=subprocess.Popen([CHROME,'--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-allow-origins=*',f'--remote-debugging-port={port}',f'--user-data-dir={profile}','--window-size=1440,1200',seed_url],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
    try:
        wait_http(f'http://127.0.0.1:{port}/json/version')
        page=None
        deadline=time.time()+20
        while time.time()<deadline:
            targets=json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json'))
            page=next((t for t in targets if t.get('type')=='page' and t.get('url')==URL),None)
            if page: break
            time.sleep(.25)
        if not page: raise RuntimeError('Chrome did not reach app URL after QA seed redirect')
        # Let Vite/React finish initial module evaluation before attaching CDP; attaching
        # immediately after the redirect is flaky in headless Chrome on macOS.
        time.sleep(5)
        targets=json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json'))
        page=next(t for t in targets if t.get('type')=='page' and t.get('url')==URL)
        cdp=CDP(page['webSocketDebuggerUrl'])
        cdp.call('Page.enable'); cdp.call('Runtime.enable')
        wait_js(cdp, "!!(document.querySelector('.v22-space-hero') && document.querySelector('.active-user-chip'))", timeout=30)
        time.sleep(.8)
        results=[]

        # Desktop base and caregiver separation.
        results.append(snapshot(cdp,'desktop-system-hero'))
        switch_text=cdp.eval("document.querySelector('.active-user-chip').innerText")
        assert '爸爸' in switch_text
        click_text(cdp,'.active-user-chip','爸爸')
        wait_js(cdp,"!!document.querySelector('.user-switch-modal')")
        dialog=cdp.eval("document.querySelector('.user-switch-modal').innerText")
        assert '爸爸' in dialog and '媽媽' in dialog and '阿姨' in dialog
        # Learner names may appear only in explanatory sentence, never as selectable user cards.
        cards=cdp.eval("[...document.querySelectorAll('.user-select-card strong')].map(e=>e.textContent)")
        assert cards==['爸爸','媽媽','阿姨'], cards

        # Mother wrong and correct personal PIN.
        click_text(cdp,'.user-select-card','媽媽')
        set_input(cdp,'.user-switch-modal input','0000')
        time.sleep(.35)
        click_text(cdp,'.user-switch-modal .primary-button','進入')
        wait_js(cdp,"!!document.querySelector('.user-switch-modal .pin-error')")
        assert '不正確' in cdp.eval("document.querySelector('.user-switch-modal .pin-error').innerText")
        set_input(cdp,'.user-switch-modal input','9753')
        time.sleep(.35)
        click_text(cdp,'.user-switch-modal .primary-button','進入')
        wait_js(cdp,"!document.querySelector('.user-switch-modal') && document.querySelector('.active-user-chip').innerText.includes('媽媽')")

        # Admin gate wrong/correct.
        click_text(cdp,'.game-main-nav button','家庭管理')
        wait_js(cdp,"!!document.querySelector('.admin-modal')")
        set_input(cdp,'.admin-modal input','1111')
        time.sleep(.25)
        click_text(cdp,'.admin-modal .primary-button','解鎖')
        wait_js(cdp,"!!document.querySelector('.admin-modal .pin-error')")
        assert '不正確' in cdp.eval("document.querySelector('.admin-modal .pin-error').innerText")
        set_input(cdp,'.admin-modal input',PIN)
        time.sleep(.25)
        click_text(cdp,'.admin-modal .primary-button','解鎖')
        wait_js(cdp,"!!document.querySelector('.settings-page') && !document.querySelector('.admin-modal')")
        settings_text=cdp.eval("document.querySelector('.settings-page').innerText")
        assert all(x in settings_text for x in ['爸爸','媽媽','哥哥','弟弟'])

        # Five theme behavior must have distinct computed signatures.
        theme_titles=['星能英雄','機甲出擊','迷你戰車','極速賽道','奇獸夥伴']
        signatures=[]
        for title in theme_titles:
            click_text(cdp,'.visual-theme-option',title)
            time.sleep(.18)
            sig=cdp.eval("(() => {const r=document.documentElement,p=document.querySelector('.settings-card')||document.querySelector('.v22-panel'),c=document.querySelector('.adventure-cursor'),dot=c?.querySelector('span'); const s=getComputedStyle(r),ps=getComputedStyle(p),cs=getComputedStyle(c),ds=dot?getComputedStyle(dot):null; return [r.dataset.adventureTheme,s.getPropertyValue('--brand').trim(),s.getPropertyValue('--v23-cursor-core').trim(),ps.borderRadius,cs.width,cs.rotate,ds?.clipPath||'',ds?.borderRadius||''].join('|')})()")
            signatures.append(sig)
        assert len(set(signatures))==5, signatures

        # Explicit display modes.
        for mode in ['light','dark','system']:
            click_text(cdp,'.segmented-control button', {'light':'明亮','dark':'暗黑','system':'隨系統'}[mode])
            time.sleep(.12)
            if mode=='light': assert not cdp.eval("document.documentElement.classList.contains('dark')")
            if mode=='dark': assert cdp.eval("document.documentElement.classList.contains('dark')")
        results.append(snapshot(cdp,'settings-system-creature'))

        # Return home and validate three responsive viewports.
        cdp.eval("document.querySelector('.brand').click()")
        wait_js(cdp,"!!document.querySelector('.v22-space-hero')")
        for width,height,name in [(1440,1200,'desktop'),(820,1180,'tablet'),(390,844,'mobile')]:
            cdp.call('Emulation.setDeviceMetricsOverride', {'width':width,'height':height,'deviceScaleFactor':1,'mobile':width<600})
            time.sleep(.35)
            results.append(snapshot(cdp,f'{name}-home'))

        # Desktop pointer FX exists; cursor/track are fixed and theme-driven.
        cdp.call('Emulation.setDeviceMetricsOverride', {'width':1440,'height':1200,'deviceScaleFactor':1,'mobile':False})
        cdp.eval("window.dispatchEvent(new PointerEvent('pointermove',{clientX:500,clientY:300,pointerType:'mouse',bubbles:true}))")
        time.sleep(.15)
        cursor=cdp.eval("(() => {const e=document.querySelector('.adventure-cursor'),s=getComputedStyle(e),dot=e?.querySelector('span'),ds=dot?getComputedStyle(dot):null;return {exists:!!e,opacity:s.opacity,position:s.position,core:getComputedStyle(document.documentElement).getPropertyValue('--v23-cursor-core').trim(),clip:ds?.clipPath||'',radius:ds?.borderRadius||'',trail:document.querySelectorAll('.cursor-trail-particle').length}})()")
        assert cursor['exists'] and cursor['position']=='fixed' and cursor['core'] and float(cursor['opacity']) > 0 and cursor['trail'] > 0, cursor

        # Common hard gates.
        for r in results:
            assert r['overflow'] <= 1, r
            assert r['bpmf']==0, r
            assert not r['broken'], r
        # Tiny text hard floor: no rendered leaf text below 9px; report any <10 for review.
        hard_tiny=[(r['label'],t) for r in results for t in r['tiny'] if float(t[2].replace('px','')) < 9]
        assert not hard_tiny, hard_tiny[:20]

        out={'status':'PASS','results':results,'themeSignatures':signatures,'cursor':cursor,'caregiverCards':cards}
        (QA_DIR/'v23_browser_result.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
        print(json.dumps(out,ensure_ascii=False,indent=2))
        cdp.close()
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
