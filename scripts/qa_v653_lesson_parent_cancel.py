"""Negative control: cancel first family setup while session request is pending."""
import json,sys
from pathlib import Path
from qa_v653_lesson_probe import OUT,URL,setup,sync_playwright

def main():
 url=sys.argv[1] if len(sys.argv)>1 else URL
 suffix=sys.argv[2] if len(sys.argv)>2 else 'production-red'
 action=sys.argv[3] if len(sys.argv)>3 else '取消'
 with sync_playwright() as p:
  b,c=setup(p);pending=[];intercepted=[]
  c.route('**/api/family-session',lambda r:pending.append(r))
  c.route('**/api/state',lambda r:(intercepted.append(r.request.method),r.fulfill(status=503,body='blocked synthetic-only state')))
  page=c.new_page();page.goto(url,wait_until='domcontentloaded');page.get_by_role('button',name='家長登入',exact=True).last.click()
  page.get_by_role('button',name='使用此帳號',exact=True).click()
  dialog=page.get_by_role('dialog',name='設定家庭 PIN',exact=True);dialog.locator('input').fill('4819');dialog.get_by_role('button',name='設定 PIN',exact=True).click()
  page.wait_for_timeout(150);assert len(pending)==1
  if action=='Escape':page.keyboard.press('Escape')
  else:dialog.get_by_role('button',name=action,exact=True).click()
  assert dialog.count()==0
  pending[0].fulfill(status=200,json={'familyId':'a'*64,'token':'fixture-only-token-'*4,'expiresAt':'2036-01-01T00:00:00Z'})
  page.wait_for_timeout(700)
  result={'url':url,'cancelAction':action,'cancelledDialog':True,'lateResponseDelivered':True,'familySwitched':page.evaluate("Object.keys(localStorage).some(k=>k.includes('"+'a'*64+"'))"),'persistedSyntheticSession':page.evaluate("Object.values(localStorage).some(v=>v.includes('fixture-only-token-'))"),'stateRequestsAfterCancel':intercepted,'text':page.locator('body').inner_text(),'security':'all family/state calls intercepted, synthetic token only'}
  result['status']='FAIL_CANCEL_RACE' if result['familySwitched'] or result['persistedSyntheticSession'] or intercepted else 'PASS_CANCEL_IGNORES_LATE_RESPONSE'
  page.screenshot(path=str(OUT/f'parent-cancel-{suffix}.png'),full_page=True);(OUT/f'parent-cancel-{suffix}.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(result['status']);b.close()
  return 1 if result['status'].startswith('FAIL') else 0
if __name__=='__main__':sys.exit(main())
