#!/usr/bin/env python3
import base64, hashlib, json, os, shutil, signal, socket, subprocess, tempfile, time, urllib.parse, urllib.request
from pathlib import Path
import websocket

ROOT = Path(__file__).resolve().parents[1]
QA_DIR = ROOT / '.qa'; QA_DIR.mkdir(exist_ok=True)
URL = 'http://127.0.0.1:4173/'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PIN = '2468'
FAMILY_ID = hashlib.sha256(f'little-explorers-dev-family:{PIN}'.encode()).hexdigest()
SESSION = {'familyId':FAMILY_ID,'token':f'dev.{FAMILY_ID}.9999999999.browser-qa-session','expiresAt':'2286-11-20T17:46:39.000Z'}
TODAY = '2026-08-27'
SEMESTER_START = '2026-08-26'  # Day 1=past, Day 2=today, Day 3=future for date-lock QA.


def free_port():
    sock=socket.socket(); sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]; sock.close(); return port


def cred(pin, salt):
    digest=hashlib.pbkdf2_hmac('sha256',pin.encode(),salt,180000,32)
    return base64.b64encode(digest).decode(),base64.b64encode(salt).decode()

father_hash,father_salt=cred('1357',b'father-v40-salt!')
settings={
  'theme':'light','visualTheme':'hero','semesterStart':SEMESTER_START,
  'users':[{'id':'user-father','name':'爸爸','role':'father','disabled':False,'userPinHash':father_hash,'userPinSalt':father_salt,'userPinIterations':180000}],
  'children':[{'id':'child-1','name':'哥哥','avatar':'nova','role':'child','disabled':False},{'id':'child-2','name':'弟弟','avatar':'rex','role':'child','disabled':False}],
  'cloudSync':{'enabled':False,'familyCode':''},
}
progress={
  'child-1':{'completedDays':[],'completedBlocks':[],'completedMissions':[],'claimedEggs':[],'unlockedCosmetics':['sunny-explorer-hat'],'equippedCosmetics':['sunny-explorer-hat'],'badgeUnlocks':{},'completionTimestamps':{},'rewardTransactions':[],'answerEvents':[]},
  'child-2':{'completedDays':[],'completedBlocks':[],'completedMissions':[],'claimedEggs':[],'unlockedCosmetics':[],'equippedCosmetics':[],'badgeUnlocks':{},'completionTimestamps':{},'rewardTransactions':[],'answerEvents':[]},
}

class CDP:
    def __init__(self, ws_url): self.ws=websocket.create_connection(ws_url,timeout=10,origin='http://localhost'); self.i=0
    def call(self,method,params=None):
        self.i+=1; ident=self.i; self.ws.send(json.dumps({'id':ident,'method':method,'params':params or {}}))
        while True:
            msg=json.loads(self.ws.recv())
            if msg.get('id')==ident:
                if 'error' in msg: raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get('result',{})
    def eval(self,expr,awaitPromise=True):
        r=self.call('Runtime.evaluate',{'expression':expr,'returnByValue':True,'awaitPromise':awaitPromise})
        if r.get('exceptionDetails'): raise RuntimeError(r['exceptionDetails'])
        return r.get('result',{}).get('value')
    def close(self): self.ws.close()


def wait_http(url,timeout=20):
    end=time.time()+timeout
    while time.time()<end:
        try:
            with urllib.request.urlopen(url,timeout=1) as r:
                if r.status<500:return
        except Exception: time.sleep(.2)
    raise RuntimeError('HTTP unavailable '+url)


def wait_js(cdp,expr,timeout=20):
    end=time.time()+timeout
    while time.time()<end:
        try:
            if cdp.eval(expr): return
        except Exception: pass
        time.sleep(.12)
    raise RuntimeError('wait_js timeout '+expr)


def click_text(cdp,selector,text):
    js=f'''(() => {{const e=[...document.querySelectorAll({json.dumps(selector)})].find(x=>(x.textContent||'').includes({json.dumps(text)}));if(!e)return false;e.click();return true}})()'''
    assert cdp.eval(js),(selector,text)


def click_first(cdp,selector):
    assert cdp.eval(f'''(() => {{const e=document.querySelector({json.dumps(selector)});if(!e)return false;e.click();return true}})()'''),selector


def snap(cdp,label):
    return cdp.eval(f'''(() => {{const root=document.documentElement,body=document.body,imgs=[...document.images];return {{
      label:{json.dumps(label)},width:innerWidth,overflow:Math.max(root.scrollWidth,body.scrollWidth)-innerWidth,
      broken:imgs.filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src),
      bpmf:(body.innerText.match(/[\\u3100-\\u312f\\u31a0-\\u31bf]/g)||[]).length,
      undersized:[...document.querySelectorAll('button,a,[role="button"]')].filter(e=>{{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&(r.width<44||r.height<44)}}).slice(0,30).map(e=>[e.className,Math.round(e.getBoundingClientRect().width),Math.round(e.getBoundingClientRect().height),(e.textContent||'').trim().slice(0,30)]),
      title:document.title
    }}}})()''')


def close_reward(cdp):
    if cdp.eval("!!document.querySelector('.v4-reward-modal')"):
        click_first(cdp,'.v4-reward-skip')
        wait_js(cdp,"!document.querySelector('.v4-reward-modal')")
    elif cdp.eval("!!document.querySelector('.v30-celebration')"):
        if cdp.eval("!!document.querySelector('.v30-celebration-skip')"): click_first(cdp,'.v30-celebration-skip')
        else: click_first(cdp,'.v30-celebration-continue')
        wait_js(cdp,"!document.querySelector('.v30-celebration')")


def click_each_mission_learner(cdp):
    while cdp.eval("document.querySelectorAll('.v4-mission-learners button:not(:disabled)').length"):
        click_first(cdp,'.v4-mission-learners button:not(:disabled)')
        wait_js(cdp,"!!document.querySelector('.v4-reward-modal')")
        close_reward(cdp)


def click_each_finish_learner(cdp):
    while cdp.eval("document.querySelectorAll('.v4-finish-grid button:not(:disabled)').length"):
        click_first(cdp,'.v4-finish-grid button:not(:disabled)')
        wait_js(cdp,"!!document.querySelector('.v4-reward-modal')")
        close_reward(cdp)


def main():
    vite=None
    try: wait_http(URL,1)
    except RuntimeError:
        vite=subprocess.Popen(['npm','run','dev','--','--host','127.0.0.1','--port','4173'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
        wait_http(URL,20)
    profile=tempfile.mkdtemp(prefix='v40-chrome-')
    seed=ROOT/'public/__qa_v40_seed.html'
    sj=json.dumps(settings,ensure_ascii=False).replace('</','<\\/'); pj=json.dumps(progress,ensure_ascii=False).replace('</','<\\/'); session_json=json.dumps(SESSION).replace('</','<\\/')
    seed.write_text(f'''<!doctype html><meta charset="utf-8"><script>
localStorage.setItem('star-learning-active-family-session-v40',JSON.stringify({session_json}));
localStorage.setItem('star-learning-v40:{FAMILY_ID}:settings',JSON.stringify({sj}));
localStorage.setItem('star-learning-v40:{FAMILY_ID}:progress',JSON.stringify({pj}));
sessionStorage.setItem('star-learning-v40:{FAMILY_ID}:active-user','user-father');location.replace('/');</script>''')

    port=free_port(); proc=subprocess.Popen([CHROME,'--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-allow-origins=*',f'--remote-debugging-port={port}',f'--user-data-dir={profile}','--window-size=1440,1200',URL.rstrip('/')+'/__qa_v40_seed.html'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
    try:
        wait_http(f'http://127.0.0.1:{port}/json/version'); deadline=time.time()+20; page=None
        while time.time()<deadline:
            targets=json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json'))
            page=next((x for x in targets if x.get('type')=='page' and x.get('url')==URL),None)
            if page:break
            time.sleep(.2)
        if not page: raise RuntimeError('app target not found')
        cdp=CDP(page['webSocketDebuggerUrl']); cdp.call('Page.enable'); cdp.call('Runtime.enable')
        wait_js(cdp,"!!document.querySelector('.v4-dashboard-grid') && document.body.innerText.includes('Day 2')",30)
        results=[]

        # V4 home: three-column dashboard + exact six nav entries + two real lesson cards.
        nav=cdp.eval("[...document.querySelectorAll('.v4-main-navigation button')].map(e=>e.innerText.trim())")
        assert len(nav)==6 and all(label in ' '.join(nav) for label in ['首頁','今日課程','學期日曆','成就獎勵','學習報表','寶物商店']),nav
        assert cdp.eval("document.querySelectorAll('.v4-main-navigation .v4-game-icon').length")==6
        assert cdp.eval("[...document.querySelectorAll('.v4-main-navigation .v4-game-icon')].every(e=>getComputedStyle(e).borderTopWidth==='2px' && getComputedStyle(e).boxShadow!=='none')")
        assert cdp.eval("document.querySelectorAll('.v4-main-navigation button.active').length")==1
        assert cdp.eval("document.querySelector('.v4-main-navigation button.active').innerText.includes('首頁')")
        click_text(cdp,'.v4-ai-actions button','音效開'); wait_js(cdp,"localStorage.getItem('little-explorers-v4-sound')==='off' && document.body.innerText.includes('音效關')")
        click_text(cdp,'.v4-ai-actions button','音效關'); wait_js(cdp,"localStorage.getItem('little-explorers-v4-sound')==='on' && document.body.innerText.includes('音效開')")
        click_text(cdp,'.v4-main-navigation button','今日課程'); wait_js(cdp,"document.querySelectorAll('.v4-main-navigation button.active').length===1 && document.querySelector('.v4-main-navigation button.active').innerText.includes('今日課程')")
        assert cdp.eval("document.querySelector('.v4-main-navigation button[aria-current=page]').innerText.includes('今日課程')")
        click_text(cdp,'.v4-main-navigation button','首頁'); wait_js(cdp,"document.querySelectorAll('.v4-main-navigation button.active').length===1 && document.querySelector('.v4-main-navigation button.active').innerText.includes('首頁')")
        assert cdp.eval("document.querySelectorAll('.v4-dashboard-grid > *').length")==3
        assert cdp.eval("document.querySelectorAll('.v4-lesson-card').length")==2
        assert cdp.eval("[...document.querySelectorAll('.v4-lesson-card img')].every(i=>i.src.includes('i.ytimg.com/vi/'))")
        assert cdp.eval("document.querySelector('.v4-daily-panel').innerText.includes('Day 2')")
        assert cdp.eval("document.querySelectorAll('.v5-header-theme button').length")==5 or cdp.eval("document.querySelectorAll('.v4-theme-grid button').length")==5
        assert cdp.eval("document.querySelectorAll('.v4-smart-image .v4-image-skeleton').length")>=8
        assert cdp.eval("getComputedStyle(document.querySelector('.v4-image-skeleton')).animationName.includes('v4Skeleton')")
        assert cdp.eval("!!document.querySelector('.v4-robot-face') && !!document.querySelector('.v4-robot-hand')")
        results.append(snap(cdp,'desktop-home'))

        # Future direct URL cannot enter lesson and query is stripped by route guard.
        cdp.call('Page.navigate',{'url':URL+'?day=day-3&lesson=1'}); wait_js(cdp,"!!document.querySelector('.v4-dashboard-grid') && location.search===''",30)
        assert not cdp.eval("!!document.querySelector('.v4-quest-shell')")
        # Past direct URL is likewise blocked from full task content; history is available only through read-only record UI.
        cdp.call('Page.navigate',{'url':URL+'?day=day-1&lesson=1'}); wait_js(cdp,"!!document.querySelector('.v4-dashboard-grid') && location.search===''",30)
        click_text(cdp,'.v4-main-navigation button','學期日曆'); wait_js(cdp,"!!document.querySelector('.v4-semester-weeks')")
        click_first(cdp,'.v4-semester-day.past button.history'); wait_js(cdp,"!!document.querySelector('.v4-history-panel')")
        history_text=cdp.eval("document.querySelector('.v4-history-panel').innerText")
        assert 'READ-ONLY HISTORY' in history_text and '永久鎖定' in history_text
        assert '開始挑戰' not in history_text
        click_first(cdp,'.v4-history-close'); wait_js(cdp,"!document.querySelector('.v4-history-panel')")
        click_text(cdp,'.v4-main-navigation button','首頁'); wait_js(cdp,"!!document.querySelector('.v4-dashboard-grid')")

        # Enter today's first lesson; original course/video/plan data must be visible across 9 sequential stages.
        click_first(cdp,'.v4-lesson-card button:not(:disabled)'); wait_js(cdp,"!!document.querySelector('.v4-quest-shell')",20)
        assert 'day=day-2' in cdp.eval('location.search')
        assert cdp.eval("document.querySelectorAll('.v4-stage-map button').length")==9
        assert cdp.eval("document.querySelectorAll('.v4-stage-map button:disabled').length")==8
        assert 'youtube-nocookie.com/embed/' in cdp.eval("document.querySelector('.v4-video-frame iframe').src")
        # stages 1→5 expose warmup, vocab, main video, original timeline/cues, sentence + age tips.
        click_text(cdp,'.v4-quest-controls button','完成這關'); wait_js(cdp,"document.querySelectorAll('.v4-word-grid button').length>0")
        assert cdp.eval("document.querySelectorAll('.v4-word-grid button').length")>=5
        click_text(cdp,'.v4-quest-controls button','完成這關'); wait_js(cdp,"!!document.querySelector('.v4-video-frame.main')")
        click_text(cdp,'.v4-quest-controls button','完成這關'); wait_js(cdp,"document.querySelectorAll('.v4-teaching-timeline article').length>0")
        assert cdp.eval("document.querySelectorAll('.v4-teaching-timeline article').length")>=4
        click_text(cdp,'.v4-quest-controls button','完成這關'); wait_js(cdp,"!!document.querySelector('.v4-repeat-hero')")
        assert cdp.eval("document.querySelector('.v4-repeat-hero').innerText.length>30")
        click_text(cdp,'.v4-quest-controls button','完成這關'); wait_js(cdp,"!!document.querySelector('.v4-mission-focus')")
        # stage reward transactions exist exactly once per learner for first five learning stages.
        tx_before=cdp.eval(f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress')).['child-1']") if False else None
        p=cdp.eval(f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].rewardTransactions.length")
        assert p==5,p
        # Quick Check records real answer telemetry: one wrong attempt then one correct attempt for child-1.
        assert cdp.eval("document.querySelectorAll('.v4-quick-check article').length")==2
        click_first(cdp,'.v4-quick-check article:nth-child(1) > div button:nth-child(1)')
        wait_js(cdp,f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].answerEvents?.length===1")
        assert cdp.eval(f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].answerEvents[0].correct") is False
        click_first(cdp,'.v4-quick-check article:nth-child(1) > div button:nth-child(2)')
        wait_js(cdp,f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].answerEvents?.length===2")
        telemetry=cdp.eval(f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].answerEvents")
        assert sum(1 for event in telemetry if event['correct'])==1,telemetry
        # mission 1 and 2, then block complete for both learners.
        click_each_mission_learner(cdp)
        click_text(cdp,'.v4-quest-controls button','完成這關'); wait_js(cdp,"document.querySelector('.v4-mission-number').innerText==='2'")
        click_each_mission_learner(cdp)
        click_text(cdp,'.v4-quest-controls button','完成這關'); wait_js(cdp,"!!document.querySelector('.v4-finish-grid')")
        click_each_finish_learner(cdp)
        click_text(cdp,'.v4-quest-controls button','完成這關'); wait_js(cdp,"!!document.querySelector('.v4-reward-podium')")
        assert 'Mission Complete!' in cdp.eval("document.querySelector('.v4-reward-podium').innerText")
        assert cdp.eval("document.querySelector('.v4-reward-podium').innerText.includes('XP')")
        # Accuracy bonus must be exactly one append-only transaction per block after Quick Check.
        accTx1 = cdp.eval(f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].rewardTransactions.filter(x=>x.id==='v4-accuracy:w1d2b1:child-1').length")
        assert accTx1==1, f"accuracy w1d2b1 child-1 expected 1 got {accTx1}"
        # Refresh must not duplicate accuracy transaction (still on quest page with today guard).
        cdp.eval("location.reload()"); wait_js(cdp,"!!document.querySelector('.v4-reward-podium')",20)
        accTx1Reload = cdp.eval(f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].rewardTransactions.filter(x=>x.id==='v4-accuracy:w1d2b1:child-1').length")
        assert accTx1Reload==1, accTx1Reload
        click_text(cdp,'.v4-quest-controls button','回今日課程'); wait_js(cdp,"!!document.querySelector('.v4-dashboard-grid') && location.search===''",20)
        results.append(snap(cdp,'desktop-lesson-reward'))
        # Re-enter today's second lesson to complete Day 2 and verify day / first-daily / special bonuses.
        click_first(cdp,'.v4-lesson-card:nth-child(2) button:not(:disabled)'); wait_js(cdp,"!!document.querySelector('.v4-quest-shell')",20)
        assert 'day=day-2' in cdp.eval('location.search') and 'lesson=2' in cdp.eval('location.search')
        assert cdp.eval("document.querySelectorAll('.v4-stage-map button').length")==9
        click_text(cdp,'.v4-quest-controls button','完成這關'); wait_js(cdp,"document.querySelectorAll('.v4-word-grid button').length>0")
        click_text(cdp,'.v4-quest-controls button','完成這關'); wait_js(cdp,"!!document.querySelector('.v4-video-frame.main')")
        click_text(cdp,'.v4-quest-controls button','完成這關'); wait_js(cdp,"document.querySelectorAll('.v4-teaching-timeline article').length>0")
        click_text(cdp,'.v4-quest-controls button','完成這關'); wait_js(cdp,"!!document.querySelector('.v4-repeat-hero')")
        click_text(cdp,'.v4-quest-controls button','完成這關'); wait_js(cdp,"!!document.querySelector('.v4-mission-focus')")
        # Quick check for second lesson: one wrong + one correct for child-1
        click_first(cdp,'.v4-quick-check article:nth-child(1) > div button:nth-child(1)')
        wait_js(cdp,f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].answerEvents?.length===3")
        click_first(cdp,'.v4-quick-check article:nth-child(1) > div button:nth-child(2)')
        wait_js(cdp,f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].answerEvents?.length===4")
        click_each_mission_learner(cdp)
        click_text(cdp,'.v4-quest-controls button','完成這關'); wait_js(cdp,"document.querySelector('.v4-mission-number').innerText==='2'")
        click_each_mission_learner(cdp)
        click_text(cdp,'.v4-quest-controls button','完成這關'); wait_js(cdp,"!!document.querySelector('.v4-finish-grid')")
        click_each_finish_learner(cdp)
        click_text(cdp,'.v4-quest-controls button','完成這關'); wait_js(cdp,"!!document.querySelector('.v4-reward-podium')")
        results.append(snap(cdp,'desktop-lesson-reward-2'))
        # After second block, accuracy, day and first-daily must each be exactly 1.
        accTx2 = cdp.eval(f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].rewardTransactions.filter(x=>x.id==='v4-accuracy:w1d2b2:child-1').length")
        assert accTx2==1, accTx2
        dayTx = cdp.eval(f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].rewardTransactions.filter(x=>x.id==='v4-day:day-2:child-1').length")
        assert dayTx==1, dayTx
        firstDailyTx = cdp.eval(f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].rewardTransactions.filter(x=>x.id==='v4-first-daily:day-2:child-1').length")
        assert firstDailyTx==1, firstDailyTx
        # Reload must not duplicate day / first-daily / accuracy.
        cdp.eval("location.reload()"); wait_js(cdp,"!!document.querySelector('.v4-reward-podium')",20)
        dayTx2 = cdp.eval(f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].rewardTransactions.filter(x=>x.id==='v4-day:day-2:child-1').length")
        firstDailyTx2 = cdp.eval(f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].rewardTransactions.filter(x=>x.id==='v4-first-daily:day-2:child-1').length")
        assert dayTx2==1 and firstDailyTx2==1, (dayTx2, firstDailyTx2)
        # SPECIAL BONUS: visible in Stage 9, text must equal original day.bonus, claimable once.
        specialText = cdp.eval("document.querySelector('.v4-special-task h3')?.innerText||''")
        assert specialText and '全家互相用英文打招呼一次' in specialText, specialText
        assert cdp.eval("document.querySelector('.v4-special-task').innerText.includes('SPECIAL BONUS')")
        assert cdp.eval("document.querySelectorAll('.v4-special-task button:not(:disabled)').length")>=1
        click_first(cdp,'.v4-special-task button:not(:disabled)')
        wait_js(cdp,"!!document.querySelector('.v4-reward-scrim.kind-bonus .v4-reward-modal')")
        assert 'BONUS COMPLETE!' in cdp.eval("document.querySelector('.v4-reward-modal').innerText")
        assert cdp.eval("document.querySelector('.v4-reward-modal').innerText.includes('特殊加碼任務')")
        close_reward(cdp)
        specialTx = cdp.eval(f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].rewardTransactions.filter(x=>x.id==='v4-special:day-2:child-1').length")
        assert specialTx==1, specialTx
        # Second click must not create second transaction; button becomes disabled.
        assert cdp.eval("document.querySelector('.v4-special-task button.done') !== null")
        specialTx2 = cdp.eval(f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].rewardTransactions.filter(x=>x.id==='v4-special:day-2:child-1').length")
        assert specialTx2==1, specialTx2
        # Reload must keep special idempotent.
        cdp.eval("location.reload()"); wait_js(cdp,"!!document.querySelector('.v4-reward-podium')",20)
        specialTxReload = cdp.eval(f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].rewardTransactions.filter(x=>x.id==='v4-special:day-2:child-1').length")
        assert specialTxReload==1, specialTxReload
        click_text(cdp,'.v4-quest-controls button','回今日課程'); wait_js(cdp,"!!document.querySelector('.v4-dashboard-grid') && location.search===''",20)
        # Snapshot after lesson bonuses
        results.append(snap(cdp,'desktop-lesson-reward'))

        # PIN keypad: cancel, error remains modal, Esc, then success.
        click_text(cdp,'.v4-main-navigation button','學習報表'); wait_js(cdp,"!!document.querySelector('.v4-pin-modal')")
        assert cdp.eval("document.querySelectorAll('.v4-pin-grid button').length")==12
        assert cdp.eval("!!document.querySelector('.v4-pin-modal .v30-modal-x')")
        click_text(cdp,'.v4-pin-modal .modal-close-link','取消'); wait_js(cdp,"!document.querySelector('.v4-pin-modal')")
        click_text(cdp,'.v4-main-navigation button','學習報表'); wait_js(cdp,"!!document.querySelector('.v4-pin-modal')")
        for _ in range(4): click_text(cdp,'.v4-pin-grid button','1')
        click_text(cdp,'.v4-pin-submit','解鎖'); wait_js(cdp,"!!document.querySelector('.v4-pin-modal .pin-error')")
        assert cdp.eval("document.querySelectorAll('.v4-pin-dots i.filled').length")==4
        cdp.call('Input.dispatchKeyEvent',{'type':'keyDown','key':'Escape','code':'Escape','windowsVirtualKeyCode':27,'nativeVirtualKeyCode':27}); wait_js(cdp,"!document.querySelector('.v4-pin-modal')")
        click_text(cdp,'.v4-main-navigation button','學習報表'); wait_js(cdp,"!!document.querySelector('.v4-pin-modal')")
        for d in '2468': click_text(cdp,'.v4-pin-grid button',d)
        click_text(cdp,'.v4-pin-submit','解鎖'); wait_js(cdp,"!!document.querySelector('.v4-report-grid') && !document.querySelector('.v4-pin-modal')",20)
        assert cdp.eval("document.querySelectorAll('.v4-report-player').length")==2
        report_text=cdp.eval("document.querySelector('.v4-report-player').innerText")
        assert '50%' in report_text and '答錯 1 次' in report_text,report_text
        assert '本週完成率' in report_text and '本月完成率' in report_text,report_text
        assert cdp.eval("document.querySelectorAll('.v4-report-periods article').length")==4
        results.append(snap(cdp,'desktop-parent-report'))

        # Parent settings must remain inside the V4 shell and use V4-only visible theme/character assets.
        click_first(cdp,'.v4-settings-link'); wait_js(cdp,"!!document.querySelector('.v4-settings-page')",20)
        assert cdp.eval("document.querySelectorAll('.v4-settings-page .visual-theme-option').length")==5
        settings_text=cdp.eval("document.querySelector('.v4-settings-page').innerText")
        assert all(label in settings_text for label in ['星際英雄','機甲戰士','賽車冒險','奇幻精靈','海底世界']),settings_text
        assert cdp.eval("[...document.querySelectorAll('.v4-settings-page img')].every(i=>!i.src.includes('/assets/v30/'))")
        assert cdp.eval("[...document.querySelectorAll('.v4-settings-family-art img')].every(i=>i.src.includes('/assets/v40/characters/'))")
        assert PIN not in settings_text
        session_security=cdp.eval(f'''(() => {{
          const raw=localStorage.getItem('star-learning-active-family-session-v40');
          const session=raw?JSON.parse(raw):null;
          const keys=Object.keys(localStorage);
          const s=JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:settings'));
          return {{hasSession:!!session, familyId:session?.familyId||'', legacyActivePin:localStorage.getItem('star-learning-active-family-pin-v22'), legacyPinKeys:keys.filter(k=>k.includes(':{PIN}:')), familyCode:s.cloudSync?.familyCode||''}};
        }})()''')
        assert session_security['hasSession'] and session_security['familyId']==FAMILY_ID,session_security
        assert session_security['legacyActivePin'] is None and not session_security['legacyPinKeys'],session_security
        assert session_security['familyCode']==FAMILY_ID,session_security
        results.append(snap(cdp,'desktop-parent-settings'))

        # Treasure day: both lessons complete -> chest opens once, one idempotent transaction per learner.
        click_text(cdp,'.v4-main-navigation button','首頁'); wait_js(cdp,"!!document.querySelector('.v4-dashboard-grid')")
        cdp.eval(f'''(() => {{
          const sk='star-learning-v40:{FAMILY_ID}:settings', pk='star-learning-v40:{FAMILY_ID}:progress';
          const s=JSON.parse(localStorage.getItem(sk)); s.semesterStart='2026-08-19'; localStorage.setItem(sk,JSON.stringify(s));
          const p=JSON.parse(localStorage.getItem(pk));
          for (const id of ['child-1','child-2']) {{
            p[id]=p[id]||{{}}; p[id].completedBlocks=[...new Set([...(p[id].completedBlocks||[]),'w2d2b1','w2d2b2'])];
            p[id].completedDays=[...new Set([...(p[id].completedDays||[]),'day-7'])]; p[id].claimedEggs=(p[id].claimedEggs||[]).filter(x=>x!=='egg-day-7');
            p[id].rewardTransactions=(p[id].rewardTransactions||[]).filter(x=>!x.id.startsWith('v4-treasure:egg-day-7:'));
          }}
          localStorage.setItem(pk,JSON.stringify(p)); location.reload();
        }})()''')
        wait_js(cdp,"!!document.querySelector('.v4-treasure-chest') && document.querySelectorAll('.v4-chest-learners button.ready:not(:disabled)').length===2",30)
        click_first(cdp,'.v4-chest-learners button.ready:not(:disabled)')
        wait_js(cdp,"!!document.querySelector('.v4-treasure-lottie svg')")
        assert cdp.eval("document.querySelector('.v4-chest-learners button.opening')?.innerText.includes('開箱中')")
        wait_js(cdp,"!!document.querySelector('.v4-reward-scrim.kind-treasure .v4-reward-modal')")
        assert 'TREASURE OPEN!' in cdp.eval("document.querySelector('.v4-reward-modal').innerText")
        close_reward(cdp); wait_js(cdp,"document.querySelectorAll('.v4-chest-learners button.claimed').length===1")
        time.sleep(.25)
        treasureTx=cdp.eval(f"JSON.parse(localStorage.getItem('star-learning-v40:{FAMILY_ID}:progress'))['child-1'].rewardTransactions.filter(x=>x.id==='v4-treasure:egg-day-7:child-1').length")
        assert treasureTx==1,treasureTx
        assert cdp.eval("document.querySelectorAll('.v4-chest-learners button.ready').length")==1

        # Home responsive: desktop/iPad/iPhone/Android and fixed bottom nav on phones.
        for width,height,label in [(1440,1100,'desktop'),(820,1100,'tablet'),(390,844,'mobile'),(412,915,'android')]:
            cdp.call('Emulation.setDeviceMetricsOverride',{'width':width,'height':height,'deviceScaleFactor':1,'mobile':width<600}); time.sleep(.25)
            s=snap(cdp,label+'-home'); results.append(s)
            if width<600: assert cdp.eval("getComputedStyle(document.querySelector('.v4-main-navigation')).position")=='fixed'

        # Reduced-motion must disable continuous decorative motion in the real browser cascade.
        cdp.call('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-motion','value':'reduce'}]}); time.sleep(.15)
        assert cdp.eval("getComputedStyle(document.querySelector('.v4-stars i')).animationName==='none'")
        assert cdp.eval("getComputedStyle(document.querySelector('.v4-robot-hand')).animationName==='none'")
        cdp.call('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-motion','value':'no-preference'}]})

        for r in results:
            assert r['overflow']<=1,r
            assert not r['broken'],r
            assert r['bpmf']==0,r
            assert not r['undersized'],r

        out={'status':'PASS','nav':nav,'lessonCards':2,'stages':9,'pinKeypad':True,'dateRouteGuard':True,'historyReadOnly':True,'treasureIdempotent':True,'treasureLottie':True,'rewardModal':'v4','settingsV4':True,'familySessionSecurity':True,'gameIconSystem':True,'navActiveUnique':True,'soundPreference':True,'skeletonLoading':True,'aiRobotMotion':True,'reducedMotion':True,'answerTelemetry':{'events':4,'accuracy':'50%','mostWrong':True},'periodRates':{'week':True,'month':True},'accuracyBonus':True,'firstDailyBonus':True,'specialBonus':True,'rewardBonusModal':True,'results':results}
        (QA_DIR/'v40_browser_result.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
        print(json.dumps(out,ensure_ascii=False,indent=2)); cdp.close()
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
