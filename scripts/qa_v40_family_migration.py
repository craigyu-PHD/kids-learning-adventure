#!/usr/bin/env python3
import hashlib, json, os, shutil, signal, subprocess, tempfile, time, urllib.request
from qa_v40_browser import CDP, CHROME, ROOT, URL, free_port, progress, settings, wait_http, wait_js

QA_DIR=ROOT/'.qa'; QA_DIR.mkdir(exist_ok=True)
PIN='2468'
FAMILY_ID=hashlib.sha256(f'little-explorers-dev-family:{PIN}'.encode()).hexdigest()


def main():
    vite=None
    try: wait_http(URL,1)
    except RuntimeError:
        vite=subprocess.Popen(['npm','run','dev','--','--host','127.0.0.1','--port','4173'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
        wait_http(URL,20)
    profile=tempfile.mkdtemp(prefix='v40-migration-')
    seed=ROOT/'public/__qa_v40_migration_seed.html'
    sj=json.dumps(settings,ensure_ascii=False).replace('</','<\\/'); pj=json.dumps(progress,ensure_ascii=False).replace('</','<\\/')
    seed.write_text(f'''<!doctype html><meta charset="utf-8"><script>
localStorage.setItem('star-learning-active-family-pin-v22',{json.dumps(PIN)});
localStorage.setItem('star-learning-v22:{PIN}:settings',JSON.stringify({sj}));
localStorage.setItem('star-learning-v22:{PIN}:progress',JSON.stringify({pj}));
sessionStorage.setItem('star-learning-v22:{PIN}:active-user','user-father');
location.replace('/');</script>''')
    port=free_port(); proc=subprocess.Popen([CHROME,'--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-allow-origins=*',f'--remote-debugging-port={port}',f'--user-data-dir={profile}','--window-size=1440,1000',URL.rstrip('/')+'/__qa_v40_migration_seed.html'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
    try:
        wait_http(f'http://127.0.0.1:{port}/json/version'); deadline=time.time()+20; page=None
        while time.time()<deadline:
            targets=json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json'))
            page=next((x for x in targets if x.get('type')=='page' and x.get('url')==URL),None)
            if page: break
            time.sleep(.2)
        if not page: raise RuntimeError('app target not found')
        cdp=CDP(page['webSocketDebuggerUrl']); cdp.call('Page.enable'); cdp.call('Runtime.enable')
        wait_js(cdp,"!!document.querySelector('.v4-dashboard-grid')",30)
        evidence=cdp.eval(f'''(() => {{
          const raw=localStorage.getItem('star-learning-active-family-session-v40');
          const session=raw?JSON.parse(raw):null;
          const settingsRaw=localStorage.getItem('star-learning-v40:{FAMILY_ID}:settings');
          const migratedSettings=settingsRaw?JSON.parse(settingsRaw):null;
          return {{
            familyId:session?.familyId||'',
            activePinV22:localStorage.getItem('star-learning-active-family-pin-v22'),
            activePinV21:localStorage.getItem('star-learning-active-family-pin-v21'),
            legacySettings:localStorage.getItem('star-learning-v22:{PIN}:settings'),
            legacyProgress:localStorage.getItem('star-learning-v22:{PIN}:progress'),
            v40Settings:!!settingsRaw,
            v40Progress:!!localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'),
            familyCode:migratedSettings?.cloudSync?.familyCode||'',
            activeUser:sessionStorage.getItem('star-learning-v40:{FAMILY_ID}:active-user'),
            oldActiveUser:sessionStorage.getItem('star-learning-v22:{PIN}:active-user'),
            hasBrother:document.body.innerText.includes('哥哥'),
          }};
        }})()''')
        checks={
          'sessionIssued':evidence['familyId']==FAMILY_ID,
          'activePinRemoved':evidence['activePinV22'] is None and evidence['activePinV21'] is None,
          'legacyPinNamespacesRemoved':evidence['legacySettings'] is None and evidence['legacyProgress'] is None,
          'v40CachePreserved':evidence['v40Settings'] and evidence['v40Progress'] and evidence['familyCode']==FAMILY_ID,
          'activeUserMigrated':evidence['activeUser']=='user-father' and evidence['oldActiveUser'] is None,
          'learnerDataVisible':evidence['hasBrother'],
        }
        failures=[name for name,ok in checks.items() if not ok]
        out={'status':'FAIL' if failures else 'PASS',**checks,'failures':failures}
        (QA_DIR/'v40_family_migration_result.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
        print(json.dumps(out,ensure_ascii=False,indent=2)); cdp.close()
        if failures: raise SystemExit(1)
    finally:
        try: os.killpg(proc.pid,signal.SIGTERM)
        except Exception: pass
        try: proc.wait(timeout=3)
        except Exception:
            try: os.killpg(proc.pid,signal.SIGKILL)
            except Exception: pass
        shutil.rmtree(profile,ignore_errors=True)
        try: seed.unlink()
        except FileNotFoundError: pass
        if vite:
            try: os.killpg(vite.pid,signal.SIGTERM)
            except Exception: pass
            try: vite.wait(timeout=3)
            except Exception:
                try: os.killpg(vite.pid,signal.SIGKILL)
                except Exception: pass

if __name__=='__main__': main()
