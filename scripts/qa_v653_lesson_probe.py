"""Isolated production-bundle lesson probe; never contacts family APIs."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
FIXTURE_DIR=ROOT/'qa/v653/20261005/lessons'
OUT=Path(os.environ.get('LESSON_QA_OUT',str(FIXTURE_DIR)))
OUT.mkdir(parents=True,exist_ok=True)
URL=os.environ.get('LESSON_QA_URL','https://kids-learning-adventure-chi.vercel.app/')
TIME={'now':'2026-09-17T06:00:00.000Z','activeDate':'2026-09-17','taipeiDate':'2026-09-17','taipeiTime':'14:00:00','timeZone':'Asia/Taipei'}
def seed():
 storage=json.loads((FIXTURE_DIR/'default-storage.json').read_text())
 settings=json.loads(storage['star-learning-v40:__local__:settings']);settings['theme']='light'
 for n,(name,avatar) in enumerate([('姐姐','sister'),('妹妹','younger-sister')],3):settings['children'].append({'id':f'child-{n}','name':name,'avatar':avatar,'role':'child','disabled':False})
 storage['star-learning-v40:__local__:settings']=json.dumps(settings,ensure_ascii=False)
 storage['star-learning-v40:__local__:progress']='{}'
 storage['little-explorers-v4-sound']='off'
 return "if(!sessionStorage.getItem('v653-seeded')){for(const [k,v] of Object.entries("+json.dumps(storage)+"))localStorage.setItem(k,v);sessionStorage.setItem('v653-seeded','1');}"
def setup(p):
 b=p.chromium.launch(headless=True);c=b.new_context(viewport={'width':1440,'height':1000},service_workers='block',reduced_motion='reduce')
 c.route('**/api/**',lambda r:r.fulfill(status=503,body='isolated QA no cloud'))
 for ep in ['time','server-time']:c.route('**/api/'+ep,lambda r:r.fulfill(status=200,json=TIME))
 c.add_init_script(seed());return b,c

def main():
 with sync_playwright() as p:
  b,c=setup(p);page=c.new_page();page.goto(URL,wait_until='domcontentloaded');page.locator('.v4-lesson-card').first.get_by_role('button').click();page.locator('.v4-quest-shell').wait_for()
  print(page.locator('body').inner_text())
  print(page.locator('button').evaluate_all('(els)=>els.map(e=>({text:e.innerText,disabled:e.disabled,cls:e.className}))'))
  page.screenshot(path=str(OUT/'lesson1-start.png'),full_page=True);b.close()
if __name__=='__main__':main()
