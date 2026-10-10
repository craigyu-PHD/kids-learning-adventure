"""Synthetic family PIN/navigation regression; server is fully mocked."""
import json
from qa_v653_lesson_probe import *
def main():
 with sync_playwright() as p:
  b,c=setup(p);c.route('**/api/family-session',lambda r:r.fulfill(status=200,json={'familyId':'b'*64,'token':'isolated-fixture-'*4,'expiresAt':'2036-01-01T00:00:00Z'}));page=c.new_page();page.goto(URL,wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for()
  completed=json.loads((OUT/'flow-result.json').read_text())['after'];page.evaluate("p=>localStorage.setItem('star-learning-v40:__local__:progress',JSON.stringify(p))",completed);page.reload(wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for()
  page.get_by_role('button',name='家長登入',exact=True).last.click();page.get_by_role('button',name='使用此帳號',exact=True).click()
  d=page.get_by_role('dialog',name='設定家庭 PIN',exact=True);d.locator('input').fill('4819');d.get_by_role('button',name='設定 PIN',exact=True).click();d.wait_for(state='detached');page.wait_for_timeout(200)
  page.get_by_role('button',name='家長登入',exact=True).last.click();page.get_by_role('button',name='使用此帳號',exact=True).click()
  d=page.get_by_role('dialog',name='管理者驗證',exact=True)
  for n in '4819':d.get_by_role('button',name=n,exact=True).click()
  d.get_by_role('button',name='解鎖家長專區',exact=True).click();d.wait_for(state='detached');page.wait_for_timeout(300)
  page.get_by_role('button',name='學習報表',exact=True).wait_for()
  page.get_by_role('button',name='學習報表',exact=True).click();page.get_by_role('heading',name='學習報表',exact=True).wait_for();page.wait_for_timeout(300);assert page.get_by_text('50%',exact=True).count()==4;page.screenshot(path=str(OUT/'parent-report.png'),full_page=True)
  (OUT/'parent-report-result.json').write_text(json.dumps({'status':'PASS_MOCKED_PARENT_NAVIGATION','url':URL,'fourLearnersAccuracy':'50% each after UI wrong then correct','completedSource':'flow-result.json after','reportText':page.locator('body').inner_text(),'boundary':'PIN success response mocked; no real credentials or cloud data'},ensure_ascii=False,indent=2));b.close()
if __name__=='__main__':main()
