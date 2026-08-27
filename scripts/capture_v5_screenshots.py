#!/usr/bin/env python3
import json, os, shutil, socket, subprocess, tempfile, time, urllib.request, base64
from pathlib import Path
import websocket

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa' / 'screenshots' / 'v5'
OUT.mkdir(parents=True, exist_ok=True)
URL = 'http://127.0.0.1:4173/'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
import hashlib, json as js
PIN='2468'
FAMILY_ID = hashlib.sha256(f'little-explorers-dev-family:{PIN}'.encode()).hexdigest()
SESSION = {'familyId':FAMILY_ID,'token':f'dev.{FAMILY_ID}.9999999999.browser-qa-session','expiresAt':'2286-11-20T17:46:39.000Z'}
import base64 as b64
def cred(pin, salt):
    d=hashlib.pbkdf2_hmac('sha256',pin.encode(),salt,180000,32)
    return b64.b64encode(d).decode(), b64.b64encode(salt).decode()
father_hash,father_salt=cred('1357',b'father-v40-salt!')
settings={'theme':'light','visualTheme':'hero','semesterStart':'2026-08-26','users':[{'id':'user-father','name':'爸爸','role':'father','disabled':False,'userPinHash':father_hash,'userPinSalt':father_salt,'userPinIterations':180000}],'children':[{'id':'child-1','name':'哥哥','avatar':'nova','role':'child','disabled':False},{'id':'child-2','name':'弟弟','avatar':'rex','role':'child','disabled':False}],'cloudSync':{'enabled':False,'familyCode':''}}
progress={'child-1':{'completedDays':[],'completedBlocks':[],'completedMissions':[],'claimedEggs':[],'unlockedCosmetics':['sunny-explorer-hat'],'equippedCosmetics':['sunny-explorer-hat'],'badgeUnlocks':{},'completionTimestamps':{},'rewardTransactions':[],'answerEvents':[]},'child-2':{'completedDays':[],'completedBlocks':[],'completedMissions':[],'claimedEggs':[],'unlockedCosmetics':[],'equippedCosmetics':[],'badgeUnlocks':{},'completionTimestamps':{},'rewardTransactions':[],'answerEvents':[]}}

def free_port():
    s=socket.socket(); s.bind(('127.0.0.1',0)); p=s.getsockname()[1]; s.close(); return p
class CDP:
    def __init__(self, ws_url): self.ws=websocket.create_connection(ws_url,timeout=10,origin='http://localhost'); self.i=0
    def call(self, m, p=None):
        self.i+=1; self.ws.send(json.dumps({'id':self.i,'method':m,'params':p or {}}))
        while True:
            msg=json.loads(self.ws.recv())
            if msg.get('id')==self.i:
                if 'error' in msg: raise RuntimeError(f"{m}: {msg['error']}")
                return msg.get('result',{})
    def eval(self, expr, awaitPromise=True):
        r=self.call('Runtime.evaluate',{'expression':expr,'returnByValue':True,'awaitPromise':awaitPromise})
        if r.get('exceptionDetails'): raise RuntimeError(r['exceptionDetails'])
        return r.get('result',{}).get('value')
    def close(self): self.ws.close()
def wait_http(url, timeout=20):
    end=time.time()+timeout
    while time.time()<end:
        try:
            with urllib.request.urlopen(url,timeout=1) as r:
                if r.status<500:return
        except: time.sleep(.2)
    raise RuntimeError('HTTP unavailable '+url)
def wait_js(cdp, expr, timeout=20):
    end=time.time()+timeout
    while time.time()<end:
        try:
            if cdp.eval(expr): return
        except: pass
        time.sleep(.12)
    raise RuntimeError('wait_js '+expr)

vite=None
try: wait_http(URL,1)
except:
    vite=subprocess.Popen(['npm','run','dev','--','--host','127.0.0.1','--port','4173'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
    wait_http(URL,20)
profile=tempfile.mkdtemp(prefix='v5-cap-')
seed=ROOT/'public/__qa_v5_seed.html'
sj=js.dumps(settings,ensure_ascii=False).replace('</','<\\/'); pj=js.dumps(progress,ensure_ascii=False).replace('</','<\\/'); session_json=js.dumps(SESSION).replace('</','<\\/')
seed.write_text(f'<!doctype html><meta charset="utf-8"><script>localStorage.setItem(\"star-learning-active-family-session-v40\",JSON.stringify({session_json}));localStorage.setItem(\"star-learning-v40:{FAMILY_ID}:settings\",JSON.stringify({sj}));localStorage.setItem(\"star-learning-v40:{FAMILY_ID}:progress\",JSON.stringify({pj}));sessionStorage.setItem(\"star-learning-v40:{FAMILY_ID}:active-user\",\"user-father\");location.replace(\"/\");</script>')
port=free_port(); proc=subprocess.Popen([CHROME,'--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-allow-origins=*',f'--remote-debugging-port={port}',f'--user-data-dir={profile}','--window-size=1536,1024',URL.rstrip('/')+'/__qa_v5_seed.html'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
try:
    wait_http(f'http://127.0.0.1:{port}/json/version')
    deadline=time.time()+20; page=None
    while time.time()<deadline:
        import urllib.request as req; targets=json.load(req.urlopen(f'http://127.0.0.1:{port}/json'))
        page=next((x for x in targets if x.get('type')=='page' and x.get('url')==URL),None)
        if page: break
        time.sleep(.2)
    if not page: raise RuntimeError('page not found')
    cdp=CDP(page['webSocketDebuggerUrl']); cdp.call('Page.enable'); cdp.call('Runtime.enable')
    wait_js(cdp,"!!document.querySelector('.v4-dashboard-grid')",30)
    for w,h,label in [(1536,1024,'1536x1024'),(1440,900,'1440x900'),(1280,800,'1280x800'),(1024,768,'1024x768'),(390,844,'390x844')]:
        cdp.call('Emulation.setDeviceMetricsOverride',{'width':w,'height':h,'deviceScaleFactor':1,'mobile':w<600})
        time.sleep(.6)
        res=cdp.call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':True})
        data=base64.b64decode(res['data'])
        (OUT/f'v5-{label}.png').write_bytes(data)
        print(f'saved v5-{label}.png {len(data)}')
    cdp.close()
    print('DONE', list(OUT.glob('*.png')))
finally:
    import signal
    try: os.killpg(proc.pid,signal.SIGTERM)
    except: pass
    try: proc.wait(timeout=3)
    except:
        try: os.killpg(proc.pid,signal.SIGKILL)
        except: pass
    shutil.rmtree(profile,ignore_errors=True)
    try: seed.unlink()
    except: pass
    if vite:
        try: os.killpg(vite.pid,signal.SIGTERM)
        except: pass
        try: vite.wait(timeout=3)
        except:
            try: os.killpg(vite.pid,signal.SIGKILL)
            except: pass
