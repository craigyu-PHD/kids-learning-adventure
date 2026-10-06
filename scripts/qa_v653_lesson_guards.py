"""Date access and real UI completion guards using only isolated data."""
import json
from qa_v653_lesson_probe import *
def main():
 rows=[]
 with sync_playwright() as p:
  for case,route in [('past','?day=day-13&lesson=1'),('future','?day=day-15&lesson=1'),('unverified','?day=day-14&lesson=1'),('skip-prerequisites','?day=day-14&lesson=1')]:
   b,c=setup(p)
   if case=='unverified':
    for ep in ['time','server-time']:c.route('**/api/'+ep,lambda r:r.fulfill(status=503,body='synthetic unavailable time'))
   page=c.new_page();page.goto(URL+route,wait_until='domcontentloaded');page.wait_for_timeout(600)
   if case=='skip-prerequisites':
    page.locator('.v4-stage-map button').nth(6).click()
    assert page.locator('.v4-mission-learners button').count()==4
    assert page.locator('.v4-mission-learners button:disabled').count()==4
   elif case in ('past','future'):assert page.locator('.v4-quest-shell').count()==0
   else:
    assert '安全預覽' in page.locator('body').inner_text()
    if page.locator('.v4-quest-shell').count():
     page.locator('.v4-stage-map button').nth(6).click()
     assert page.locator('.v4-mission-learners button:disabled').count()==4
   progress=page.evaluate("JSON.parse(localStorage.getItem('star-learning-v40:__local__:progress'))")
   assert all(not x['completedMissions'] and not x['completedBlocks'] and not x['answerEvents'] and not x['rewardTransactions'] for x in progress.values())
   row={'case':case,'status':'PASS','url':page.url,'completionCount':0,'answerCount':0,'rewardCount':0}
   page.screenshot(path=str(OUT/f'guard-{case}.png'),full_page=True);rows.append(row);b.close()
 (OUT/'guards-result.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print(rows)
if __name__=='__main__':main()
