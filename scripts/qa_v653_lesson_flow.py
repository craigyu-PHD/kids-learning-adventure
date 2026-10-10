"""Walk real lesson UI from empty progress; local synthetic data, blocked cloud APIs.
This checks interface sequencing, not a child learning session or live speech/video quality.
"""
import json,hashlib,sys,traceback
from pathlib import Path
from qa_v653_lesson_probe import OUT,URL,setup,sync_playwright
NAMES=['哥哥','弟弟','姐姐','妹妹']
def state(page):return page.evaluate("JSON.parse(localStorage.getItem('star-learning-v40:__local__:progress')||'{}')")
def close_reward(page):
 page.locator('.v4-reward-continue').wait_for(state='visible');page.locator('.v4-reward-continue').click();page.locator('.v4-reward-modal').wait_for(state='detached')
def main():
 report={'status':'RUNNING','url':URL,'scope':'isolated synthetic family, 4 learners, no preseeded stages','stages':[],'pageErrors':[],'cloudRequests':[]}
 with sync_playwright() as p:
  b,c=setup(p);page=c.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
  try:
   page.goto(URL,wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for();report['before']=state(page)
   for lesson in range(2):
    page.locator('.v4-lesson-card').nth(lesson).get_by_role('button').click();page.locator('.v4-quest-shell').wait_for()
    for stage in range(10):
     text=page.locator('main').inner_text();row={'lesson':lesson+1,'stage':stage+1,'text':text};report['stages'].append(row)
     print('LESSON',lesson+1,'STAGE',stage+1,flush=True)
     if stage==0:
      assert '30 分鐘' in text and '較小的孩子' in text and '較大的孩子' in text
     if stage==2:
      for card in page.locator('.v64-word-flip').all():card.click()
     if stage==5:
      page.get_by_role('button',name='播放句型',exact=True).click()
      while page.get_by_role('button',name='照顧者確認',exact=True).count():page.get_by_role('button',name='照顧者確認',exact=True).first.click()
     if stage in (6,7):
      page.locator('.v64-mission-guidance summary').click()
      page.get_by_role('button',name='播放題目',exact=True).click()
      row['answers']=[]
      for i,name in enumerate(NAMES):
       article=page.locator('[data-quick-child]').nth(i)
       # Try visible choices, retaining every actual incorrect and correct UI event.
       options=article.get_by_role('button').all_text_contents()
       for option in options:
        btn=article.get_by_role('button',name=option,exact=True)
        if btn.is_disabled():break
        btn.click();page.wait_for_timeout(80)
        row['answers'].append({'child':name,'option':option,'feedback':article.inner_text()})
        if '答對' in article.inner_text() or 'correct' in (article.get_attribute('class') or ''):break
      page.screenshot(path=str(OUT/f'lesson{lesson+1}-stage{stage+1}-feedback.png'),full_page=True)
      for name in NAMES:
       page.locator('.v4-mission-learners button').filter(has_text=name).click();close_reward(page)
     if stage==8:
      row['buttons']=page.locator('main button').all_text_contents()
      for name in NAMES:
       page.locator('main button').filter(has_text=name).click();close_reward(page)
     row['afterText']=page.locator('main').inner_text()
     row['overflow']=page.evaluate('document.documentElement.scrollWidth-innerWidth');assert row['overflow']<=1
     page.screenshot(path=str(OUT/f'lesson{lesson+1}-stage{stage+1}.png'),full_page=True)
     if stage<9:page.get_by_role('button',name='下一關',exact=True).click()
    page.get_by_role('button',name='返回課程總覽',exact=True).click();page.locator('.v4-dashboard-grid').wait_for()
   report['after']=state(page)
   for child in report['after'].values():
    assert len(child['completedBlocks'])==2 and len(child['completedMissions'])==4 and child['completedDays']==['day-14']
    ids=[t['id'] for t in child['rewardTransactions']];assert len(ids)==len(set(ids))
   page.reload(wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for();assert state(page)==report['after'];report['reloadStable']=True
   page.screenshot(path=str(OUT/'two-lessons-complete-home.png'),full_page=True)
   page.locator('.v4-lesson-card').first.get_by_role('button').click();page.locator('.v4-quest-shell').wait_for()
   for index in [6,7,8]:
    page.locator('.v4-stage-map button').nth(index).click()
    controls=page.locator('.v4-mission-learners button') if index<8 else page.locator('main button')
    assert controls.count()==4 and all(x.is_disabled() for x in controls.all())
   assert state(page)==report['after'];report['completedControlsDisabled']=True
   report['status']='PASS_UI_SEQUENCING'
  except Exception as e:
   report['status']='FAIL';report['error']=repr(e);traceback.print_exc()
   try:
    page.screenshot(path=str(OUT/'flow-failure.png'),full_page=True,timeout=3000);report['failureText']=page.locator('body').inner_text(timeout=3000)
   except Exception as capture_error:report['captureError']=repr(capture_error)
  finally:
   (OUT/'flow-result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));b.close()
 print(report['status']);return 0 if report['status'].startswith('PASS') else 1
if __name__=='__main__':sys.exit(main())
