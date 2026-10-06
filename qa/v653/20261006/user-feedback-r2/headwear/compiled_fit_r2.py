#!/usr/bin/env python3
"""Actual compiled Home/Shop fit matrix; isolated preowned fixtures, no source overrides.

Each row names one review target and exact selected layer paths. Screenshots are
observations, not visual approvals. The independent reviewer writes those later.
"""
import argparse
import copy
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import traceback
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen

ROOT = Path.cwd()
assert (ROOT / 'docs/CURRENT-SPEC.md').is_file(), 'Run from candidate root'
sys.path.insert(0, str(ROOT / 'scripts'))
HELPER = ROOT / 'qa/v653/20261006/user-feedback-r2/site-ui/compiled-shop-r1/run.py'
spec = importlib.util.spec_from_file_location('feedback_compiled_shop', HELPER)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
FreshShop, fixture, KEY, SETTINGS, BODY = module.FreshShop, module.fixture, module.KEY, module.SETTINGS, module.BODY
sha, read_bytes, public_refs = module.sha, module.read_bytes, module.public_refs

def now():
    return datetime.now(timezone.utc).isoformat()

def ref(path):
    path = Path(path).resolve()
    assert path.is_relative_to(ROOT), 'Evidence must be inside candidate root'
    return {'path': str(path.relative_to(ROOT)), 'sha256': sha(path)}

def write(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

class Fit(FreshShop):
    def seed_fit(self, page, profile, row, items):
        store = fixture(profile['theme'])
        settings = json.loads(store[SETTINGS])
        settings.update(homeDisplayLearnerId='child-1')
        settings['children'][0].update(avatar=row['role'], name=row['role'])
        store[SETTINGS] = json.dumps(settings, ensure_ascii=False)
        progress = copy.deepcopy(self.blank)
        progress['child-1'].update(
            unlockedCosmetics=items, equippedCosmetics=items,
            purchaseTransactions=[{'id': 'fixture-owned-'+ident, 'childId':'child-1', 'itemId':ident, 'cost':0,
                'createdAt':'2026-09-02T00:00:00.000Z', 'source':'purchase'} for ident in items],
            equipmentTransactions=[{'id':'fixture-equipped-'+ident, 'childId':'child-1', 'itemId':ident, 'action':'equip',
                'createdAt':'2026-09-02T00:00:00.000Z'} for ident in items])
        store[KEY] = json.dumps(progress, ensure_ascii=False)
        seed = self.args.url.rstrip('/')+'/__qa_fixture_seed__'
        handler = lambda route: route.fulfill(content_type='text/html', body='<!doctype html><title>Isolated fit seed</title>')
        page.route(seed, handler)
        page.goto(seed, wait_until='load')
        page.evaluate('(s)=>{localStorage.clear();sessionStorage.clear();for(const[k,v]of Object.entries(s))localStorage.setItem(k,v)}', store)
        page.unroute(seed, handler)
        page.goto(self.args.url, wait_until='domcontentloaded')
        page.locator('.v4-dashboard-grid').wait_for()
        self.assert_compiled(page)
        avatar = page.locator('.v4-player-card .avatar-renderer').first
        self.ready(avatar)
        return avatar, page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))', KEY)

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    for key in ('base', 'out', 'build-dir', 'source-pins', 'artifact-pins', 'cases', 'candidate-id'):
        ap.add_argument('--'+key, required=True, type=Path if key in ('out','build-dir','source-pins','artifact-pins','cases') else str)
    ap.add_argument('--expected-count', type=int, default=608)
    ap.add_argument('--shard-count', type=int, default=1)
    ap.add_argument('--shard-index', type=int, default=0)
    ap.add_argument('--run', action='store_true')
    args = ap.parse_args()
    args.out = args.out.resolve()
    assert not args.out.exists(), 'Do not overwrite earlier observations'
    args.out.mkdir(parents=True)
    rows = json.loads(args.cases.read_bytes())
    assert isinstance(rows, list) and len(rows) == args.expected_count
    identities = [(r['group'], r['role'], r['skin'], r['itemSet']) for r in rows]
    assert len(set(identities)) == len(rows)
    for row in rows:
        assert row['group'] in ('headwearFit', 'retainedEarwearHairFit')
        assert row['itemSet'] == '+'.join(sorted(row['itemIds']))
        assert row['targetItemId'] in row['itemIds']
        assert row['expectedPaths'] and all(p.startswith('/assets/') for p in row['expectedPaths'])
    assert 1 <= args.shard_count <= 4 and 0 <= args.shard_index < args.shard_count
    all_rows = list(enumerate(rows))
    selected_rows = [(i,r) for i,r in all_rows if i % args.shard_count == args.shard_index]
    report = {'status':'PLAN_ONLY_NOT_EXECUTED', 'candidateId':args.candidate_id, 'startedAt':now(),
        'runner':ref(__file__), 'caseSpec':ref(args.cases), 'sourcePins':ref(args.source_pins),
        'artifactPins':ref(args.artifact_pins), 'fullMatrixRows':len(rows), 'plannedRows':len(selected_rows), 'rows':[], 'baselines':[],
        'shardCount':args.shard_count, 'shardIndex':args.shard_index,
        'browserClosed':True, 'visualReview':'NOT_PERFORMED',
        'scope':'Actual compiled Home; exact layer HTTP bytes, unchanged body scale, isolated synthetic owned/equipped state. No purchase/earned/cloud assertion.'}
    save = lambda: write(args.out/'report.json', report)
    save()
    if not args.run:
        print(json.dumps({'status':report['status'], 'rows':len(selected_rows), 'fullMatrixRows':len(rows)})); return 0
    assert urlsplit(args.base).hostname in ('127.0.0.1','localhost')
    pins = json.loads(args.source_pins.read_bytes())
    artifacts = json.loads(args.artifact_pins.read_bytes())
    assert 'index.html' in artifacts and b'/src/main.tsx' not in read_bytes(args.build_dir/'index.html')
    args.url, args.formal = args.base, True
    manifests = {k:{'file':ROOT/path, 'sha256':sha(ROOT/path), 'value':json.loads(read_bytes(ROOT/path))}
        for k,(path,_) in module.MANIFESTS.items()}
    baseline_manifest = json.loads((ROOT/'qa/v653/20261006/user-feedback-r2/release/baseline-avatar-manifest-r6.json').read_bytes())
    baseline_items = {r['id']:r for r in baseline_manifest['accessories']}
    baseline_public = json.loads((ROOT/'qa/v653/20261006/user-feedback-r2/release/gate-baseline-public.json').read_bytes())
    generated = {p:h for p,h in artifacts.items() if not (ROOT/'public'/p).is_file()}
    assert generated and 'index.html' in generated
    served = {'status':'RUNNING', 'baseURL':args.base, 'before':{}, 'after':{}, 'files':{}, 'observedAt':now()}
    def stable(full=False):
        assert all(sha(ROOT/p)==h for p,h in pins.items()), 'Candidate source drift'
        checked = artifacts if full else generated
        assert all(sha(args.build_dir/p)==h for p,h in checked.items()), 'Artifact drift'
    def verify_served(phase):
        files = {}
        for path, expected in sorted(generated.items()):
            with urlopen(Request(args.base.rstrip('/')+'/'+quote(path, safe='/'), headers={'Cache-Control':'no-cache'}), timeout=20) as response:
                actual = hashlib.sha256(response.read()).hexdigest()
                assert response.status==200 and actual==expected, ('Served stale compiled asset', path)
                files[path] = actual
        served[phase] = files; served['files'] = files; served['observedAt'] = now()
        served['status'] = 'PASS'
        write(args.out/'served-artifacts.json', served)
    stable(full=True); verify_served('before')
    runner = Fit(args, args.out, manifests, pins, report)
    runner.asset_pins = {'/'+p:h for p,h in artifacts.items() if p.startswith('assets/')}
    report.update(status='RUNNING', browserClosed=False,
        harnessDependencies={p:sha(ROOT/p) for p in ['scripts/qa_v653_full_shop_acceptance.py','scripts/qa_v653_release_smoke.py','scripts/qa_v653_shop_coverage.py',str(HELPER.relative_to(ROOT))]})
    baselines = {}
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            try:
                profile = {'id':'fit-desktop-light','width':1440,'height':1050,'theme':'light'}
                for ordinal, (index, specification) in enumerate(selected_rows):
                    stable(); row = copy.deepcopy(specification); row.update(index=index,status='RUNNING',observedAt=now())
                    context = runner.context(browser, profile)
                    page = context.new_page(); page.set_default_timeout(20000)
                    errors = []; page.on('pageerror', lambda error:errors.append(str(error)))
                    folder = args.out/row['group']/row['role']/row['skin']/row['itemSet']
                    folder.mkdir(parents=True, exist_ok=False)
                    outfit = [] if row['skin'] in ('default','outfit-default') else [row['skin']]
                    try:
                        key = (row['role'], row['skin'])
                        if key not in baselines:
                            avatar, ledger = runner.seed_fit(page,profile,row,outfit)
                            baselines[key] = runner.body(avatar)
                            report['baselines'].append({'role':row['role'],'skin':row['skin'],'body':baselines[key]})
                        avatar, before = runner.seed_fit(page,profile,row,outfit+row['itemIds'])
                        expected_items = set(outfit+row['itemIds'])
                        page.wait_for_function('(ids)=>{const e=document.querySelector(".v4-player-card .avatar-renderer");const a=(e?.dataset.renderedItems||"").split(" ").filter(Boolean);return ids.every(i=>a.includes(i));}',arg=list(expected_items))
                        runner.ready(avatar)
                        body = runner.body(avatar)
                        comparison = module.compare_body(baselines[key],body,1)
                        capture = runner.capture(page,avatar,folder,'actual-home-avatar')
                        urls = set(capture['proof']['urls'])
                        assert set(row['expectedPaths']) <= urls, ('Wrong or missing exact selected layers', set(row['expectedPaths'])-urls)
                        assert set(row.get('expectedMasks',[])) <= urls, ('Wrong or missing selected mask', set(row.get('expectedMasks',[]))-urls)
                        if row['group'] == 'retainedEarwearHairFit':
                            original = baseline_items[row['targetItemId']]
                            front = original.get('skinFrontVariants',{}).get(row['role'],{}).get(row['skin'],original['frontVariants'][row['role']])
                            front_url = '/'+front.removeprefix('public/')
                            assert front_url in urls and runner.asset_pins[front_url]==baseline_public[front], 'Original cups/yoke changed'
                            row.update(frontPreserved=True, originalFront={'path':front, 'sha256':baseline_public[front]})
                        # The real Shop stage supplies a larger actual wearing
                        # view for independent review, without a CSS/renderer override.
                        runner.shop(page,runner.catalog[row['targetItemId']])
                        shop_avatar = page.locator('.v63-equipment-stage .avatar-renderer').first
                        page.wait_for_function('(ids)=>{const e=document.querySelector(".v63-equipment-stage .avatar-renderer");const a=(e?.dataset.renderedItems||"").split(" ").filter(Boolean);return ids.every(i=>a.includes(i));}',arg=list(expected_items))
                        runner.ready(shop_avatar)
                        shop_capture = runner.capture(page,shop_avatar,folder,'actual-shop-avatar')
                        shop_urls = set(shop_capture['proof']['urls'])
                        assert set(row['expectedPaths']) <= shop_urls, ('Shop selected layers differ',set(row['expectedPaths'])-shop_urls)
                        assert set(row.get('expectedMasks',[])) <= shop_urls, ('Shop mask differs',set(row.get('expectedMasks',[]))-shop_urls)
                        assert not errors, errors
                        unchanged = before == page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)
                        assert unchanged, 'Fit-only visit changed progress'
                        row.update(status='PASS_FUNCTIONAL_PENDING_VISUAL',sameBodySize=True,correctLayers=True,noMissingAssets=True,
                            body=body,bodyComparison=comparison,capture=capture,shopCapture=shop_capture,ledgerUnchanged=True,pageErrors=errors,
                            compiled=runner.assert_compiled(page))
                    except Exception as error:
                        row.update(status='FAIL',sameBodySize=False,correctLayers=False,noMissingAssets=False,error=repr(error),traceback=traceback.format_exc(),pageErrors=errors)
                        runner.failure_shot(page,folder,row)
                    finally:
                        context.close(); row['contextClosed']=True
                    report['rows'].append(row); save()
                    print(ordinal+1,len(selected_rows),row['role'],row['skin'],row['itemSet'],row['status'],flush=True)
            finally:
                browser.close(); report['browserClosed']=True
        stable(full=True); verify_served('after')
        assert served['before']==served['after'], 'Compiled HTTP drift'
        assert not runner.network_errors and not runner.source_requests, (runner.network_errors,runner.source_requests)
        assert len(report['rows'])==len(selected_rows) and all(r['status'].startswith('PASS') for r in report['rows']), 'Raw fit failures preserved'
        report['status']='PASS_FUNCTIONAL_PENDING_INDEPENDENT_VISUAL'
    except Exception as error:
        report.update(status='FAIL',error=repr(error),traceback=traceback.format_exc())
    finally:
        report.update(completedAt=now(),servedArtifacts=ref(args.out/'served-artifacts.json'),
            compiledDocuments=runner.documents,compiledAssets=runner.compiled,networkErrors=runner.network_errors,
            sourceRequests=runner.source_requests,barriers=runner.barriers,apiBlocks=runner.api_blocks)
        save()
    print(report['status']);return 0 if report['status'].startswith('PASS') else 1

if __name__=='__main__':
    raise SystemExit(main())
