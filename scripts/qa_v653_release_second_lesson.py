"""Post-deploy second lesson continuation from the primary smoke's real UI ledger.

No fabricated awards: exact first-lesson state is imported from the pinned primary
report, then the second lesson runs through real UI. One isolated Chromium.
"""
import argparse
import copy
import json
import traceback
from pathlib import Path
from qa_v653_release_smoke import (Smoke, ROOT, BASE, KEY, NAMES, SOURCE_PINS,
    SOURCE_PINS_SHA, MANIFESTS, fixture, read_bytes, sha, digest)


class SecondLessonSmoke(Smoke):
    def run_second(self, browser, first_after):
        store=fixture(four=True);store[KEY]=json.dumps(first_after,ensure_ascii=False)
        context=self.context(browser,store);page=context.new_page();errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
        state=lambda:page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)||"{}")',KEY)
        def close_reward():
            page.locator('.v4-reward-continue').wait_for(state='visible')
            page.locator('.v4-reward-continue').click();page.locator('.v4-reward-modal').wait_for(state='detached')
        result={'fixture':'Exact primary production-r1 first-lesson UI ledger; second lesson prerequisites and awards not fabricated','stages':[]}
        try:
            page.goto(self.args.url,wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for()
            result['compiled']=self.assert_compiled(page);result['before']=state()
            assert result['before']==first_after, 'primary ledger changed on seeded mount'
            assert len(first_after)==4
            for child in first_after.values():
                assert len(child['completedBlocks'])==1 and len(child['completedMissions'])==2 and not child['completedDays']
            page.locator('.v4-lesson-card').nth(1).get_by_role('button').click();page.locator('.v4-quest-shell').wait_for()
            for stage in range(10):
                text=page.locator('main').inner_text();step={'lesson':2,'stage':stage,'kind':'preparation' if stage==0 else 'lesson-stage','text':text}
                if stage==0:assert all(s in text for s in ['30 分鐘','較小的孩子','較大的孩子'])
                if stage==2:
                    for card in page.locator('.v64-word-flip').all():card.click()
                if stage==5:
                    page.get_by_role('button',name='播放句型',exact=True).click()
                    for _ in range(8):
                        confirm=page.get_by_role('button',name='照顧者確認',exact=True)
                        if not confirm.count():break
                        confirm.first.click()
                    assert not page.get_by_role('button',name='照顧者確認',exact=True).count()
                if stage in (6,7):
                    page.locator('.v64-mission-guidance summary').click();page.get_by_role('button',name='播放題目',exact=True).click();step['answers']=[]
                    for i,name in enumerate(NAMES):
                        article=page.locator('[data-quick-child]').nth(i)
                        for option in article.get_by_role('button').all_text_contents():
                            button=article.get_by_role('button',name=option,exact=True)
                            if button.is_disabled():break
                            button.click();page.wait_for_timeout(80)
                            step['answers'].append({'child':name,'option':option,'feedback':article.inner_text()})
                            if '答對' in article.inner_text() or 'correct' in (article.get_attribute('class') or ''):break
                    self.shot(page,f'lesson2/stage-{stage}-feedback')
                    for name in NAMES:
                        page.locator('.v4-mission-learners button').filter(has_text=name).click();close_reward()
                if stage==8:
                    for name in NAMES:
                        page.locator('main button').filter(has_text=name).click();close_reward()
                step['screenshot']=self.shot(page,f'lesson2/stage-{stage}');result['stages'].append(step)
                print('second lesson stage',stage,'PASS',flush=True)
                if stage<9:page.get_by_role('button',name='下一關',exact=True).click()
            page.get_by_role('button',name='返回課程總覽',exact=True).click();page.locator('.v4-dashboard-grid').wait_for()
            after=state();assert set(after)==set(first_after);deltas=[]
            for ident,child in after.items():
                before=first_after[ident]
                assert len(child['completedBlocks'])==2 and len(child['completedMissions'])==4 and child['completedDays']==['day-14']
                prior={t['id']:t for t in before['rewardTransactions']};current={t['id']:t for t in child['rewardTransactions']}
                assert len(current)==len(child['rewardTransactions']) and all(current.get(k)==v for k,v in prior.items())
                assert len(current)>len(prior), 'second lesson produced no new actual rewards'
                prior_answers={e['id']:e for e in before['answerEvents']};new_answers={e['id']:e for e in child['answerEvents']}
                assert len(new_answers)==len(child['answerEvents']) and all(new_answers.get(k)==v for k,v in prior_answers.items()) and len(new_answers)>len(prior_answers)
                deltas.append({'child':ident,'priorRewardIDs':sorted(prior),'newRewardIDs':sorted(set(current)-set(prior)),'newAnswerIDs':sorted(set(new_answers)-set(prior_answers))})
            self.shot(page,'lesson2/two-lessons-complete-home')
            page.reload(wait_until='domcontentloaded');page.locator('.v4-dashboard-grid').wait_for();assert state()==after
            page.locator('.v4-lesson-card').nth(1).get_by_role('button').click();page.locator('.v4-quest-shell').wait_for()
            for index in [6,7,8]:
                page.locator('.v4-stage-map button').nth(index).click()
                controls=page.locator('.v4-mission-learners button') if index<8 else page.locator('main button')
                assert controls.count()==4 and all(x.is_disabled() for x in controls.all())
            assert state()==after and not errors
            self.shot(page,'lesson2/reenter-no-duplicate-reward')
            result.update(passed=True,after=after,deltas=deltas,reloadStable=True,secondLessonCompletedControlsDisabled=True,pageErrors=errors)
            return result
        except Exception:
            self.shot(page,'lesson2/failure');raise
        finally:context.close()


def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--url',required=True);ap.add_argument('--attempt',required=True);ap.add_argument('--build-dir',type=Path,required=True);ap.add_argument('--primary',type=Path,required=True);args=ap.parse_args()
    assert args.attempt.replace('-','').isalnum();args.formal=True;args.body_tolerance_px=1.0
    primary=json.loads(read_bytes(args.primary));assert primary['status']=='PASS_FUNCTIONAL_PENDING_ACTUAL_VISUAL_REVIEW' and primary['lesson']['passed']
    assert primary['url']==args.url and primary['releaseScope']=='POST_DEPLOY_SYNTHETIC_SMOKE' and primary['sourcePinsSHA256']==SOURCE_PINS_SHA
    assert primary['buildIndex']['sha256']==sha(args.build_dir/'index.html') and not primary['sourceDrift']
    assert sha(SOURCE_PINS)==SOURCE_PINS_SHA;frozen=json.loads(read_bytes(SOURCE_PINS));manifests={}
    for name,(path,expected) in MANIFESTS.items():
        raw=read_bytes(ROOT/path);assert digest(raw)==expected;manifests[name]={'file':str(ROOT/path),'sha256':expected,'text':raw.decode(),'value':json.loads(raw)}
    out=BASE/args.attempt;out.mkdir(parents=True,exist_ok=False)
    report={'status':'RUNNING','url':args.url,'version':'6.5.3','releaseScope':'POST_DEPLOY_SYNTHETIC_SECOND_LESSON','cases':[],
      'sourcePinsSHA256':SOURCE_PINS_SHA,'sourcePins':frozen,'primary':{'path':str(args.primary.resolve().relative_to(ROOT)),'sha256':sha(args.primary)},
      'runnerSHA256':sha(__file__),'primaryRunnerSHA256':sha(ROOT/'scripts/qa_v653_release_smoke.py'),'browserCount':1,
      'security':'Synthetic local context only; all family APIs/mutations blocked by unchanged primary Smoke.route; no true cloud',
      'scope':'Four learners actual second lesson preparation and9stages, preserving primary actual first lesson ledger; rewards/reload/reentry',
      'buildIndex':{'path':str(args.build_dir/'index.html'),'sha256':sha(args.build_dir/'index.html')}}
    runner=SecondLessonSmoke(args,out,manifests,frozen,report);runner.stable();runner.save()
    from playwright.sync_api import sync_playwright
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch()
            try:report['lesson2']=runner.run_second(browser,copy.deepcopy(primary['lesson']['after']))
            finally:browser.close()
        runner.stable();assert not runner.source_requests and not runner.network_errors
        report['status']='PASS_SECOND_LESSON_FUNCTIONAL_PENDING_VISUAL'
    except Exception as e:report.update(status='FAIL',error=repr(e),traceback=traceback.format_exc())
    finally:
        report.update(compiledDocuments=runner.documents,compiledAssets=runner.compiled,networkErrors=runner.network_errors,sourceModuleRequests=runner.source_requests,apiBlocks=runner.api_blocks,screenshots=runner.snapshots,manifestOverrides=False,cssOverrides=False,visualReview='NOT_PERFORMED')
        report['sourceDrift']=[p for p,h in frozen.items() if sha(ROOT/p)!=h]
        if report['sourceDrift']:report['status']='FAIL'
        runner.save()
    print(report['status']);return 0 if report['status'].startswith('PASS') else 1

if __name__=='__main__':raise SystemExit(main())
