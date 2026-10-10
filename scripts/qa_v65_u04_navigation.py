#!/usr/bin/env python3
from __future__ import annotations
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
from qa_v63_browser_seed import SEED_SCRIPT

ROOT=Path(__file__).resolve().parents[1]
URL=os.environ.get('AUDIT_URL','http://127.0.0.1:4185/')
OUT=ROOT/'qa'/'v65'/'phase4'/'u04-navigation.json'; OUT.parent.mkdir(parents=True,exist_ok=True)
TIME=json.dumps({'now':'2026-09-17T04:00:00.000Z','activeDate':'2026-09-17','taipeiDate':'2026-09-17','taipeiTime':'12:00:00','timeZone':'Asia/Taipei'})

def route_time(route): route.fulfill(status=200,content_type='application/json',body=TIME)

def nav_state(page):
    return page.evaluate("""() => ({
      hash: location.hash,
      active: [...document.querySelectorAll('.v4-main-navigation button.active')].map(b=>({text:b.textContent?.trim(),current:b.getAttribute('aria-current')})),
      focusId: document.activeElement?.id || '',
      family: document.querySelector('.v53-family-level')?.textContent?.replace(/\s+/g,' ').trim() || '',
      learnerCards: [...document.querySelectorAll('.v4-player-card')].map(x=>x.textContent?.replace(/\s+/g,' ').trim()||''),
      display: document.querySelector('.v65-home-display-selector')?.textContent?.replace(/\s+/g,' ').trim() || '',
      parentUser: sessionStorage.getItem('star-learning-v40:__local__:active-user') || ''
    })""")

def main():
    failures=[]; console=[]; errors=[]
    with sync_playwright() as pw:
        b=pw.chromium.launch(headless=True); c=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
        c.add_init_script(SEED_SCRIPT); c.route('**/api/server-time',route_time); c.route('**/api/time',route_time)
        p=c.new_page(); p.on('console',lambda m: console.append(m.text) if m.type=='error' else None); p.on('pageerror',lambda e:errors.append(str(e)))
        p.goto(URL,wait_until='domcontentloaded',timeout=60000); p.wait_for_selector('.v4-dashboard-grid',timeout=30000)
        initial=nav_state(p)
        if initial['active'] != [{'text':'首頁','current':'page'}] or initial['hash']:
            failures.append(f'initial navigation mismatch: {initial}')
        p.get_by_role('button',name='今日課程',exact=True).click()
        p.wait_for_function("location.hash==='#today-course' && document.querySelector('.v4-main-navigation button.active')?.textContent?.trim()==='今日課程' && document.activeElement?.id==='today-course'",timeout=8000)
        today=nav_state(p)
        if today['active'] != [{'text':'今日課程','current':'location'}] or today['hash']!='#today-course' or today['focusId']!='today-course':
            failures.append(f'today active/hash/focus mismatch: {today}')
        p.get_by_role('button',name='首頁',exact=True).click(); p.wait_for_function("location.hash==='' && document.querySelector('.v4-main-navigation button.active')?.textContent?.trim()==='首頁'",timeout=8000)
        home=nav_state(p)
        if home['active'] != [{'text':'首頁','current':'page'}] or home['hash']:
            failures.append(f'home return mismatch: {home}')
        if '全家共同冒險進度' not in home['family'] or '家庭 Lv.' not in home['family'] or '全家合計' not in home['family']:
            failures.append(f'family/individual level semantics unclear: {home["family"]}')
        if not home['learnerCards'] or not all('Lv.' in x for x in home['learnerCards']):
            failures.append(f'individual learner levels missing: {home["learnerCards"]}')
        if '目前展示：' not in home['display'] or '不會更改登入家長' not in home['display'] or '參與上課的孩子' not in home['display']:
            failures.append(f'identity separation copy missing: {home["display"]}')
        result={'status':'PASS' if not failures and not console and not errors else 'FAIL','initial':initial,'today':today,'home':home,'failures':failures,'consoleErrors':console,'pageErrors':errors,'environment':'isolated-local-fixture','auditUrl':URL}
        OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        c.close(); b.close()
    print(json.dumps({'status':result['status'],'failures':failures,'consoleErrors':console,'pageErrors':errors,'result':str(OUT.relative_to(ROOT))},ensure_ascii=False,indent=2))
    return 0 if result['status']=='PASS' else 1

if __name__=='__main__': raise SystemExit(main())
