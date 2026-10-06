"""Bounded immutable failed-row recovery; never rewrites a raw report.

Original per-row assertions are executed directly from the pinned adapt.py AST.
Timing receipt: {events:[{originalRaw:{path,sha256}, retryRaw:{path,sha256},
originalCompletedAt:ISO, retryStartedAt:ISO, retryCompletedAt:ISO, evidence:[refs]}]}.
Each event also supplies timeAssertions: {timeField:{ref:exactRef,pointer:JSONPointer}}.
The external timing receipt must describe actual process evidence, not inferred mtimes.
"""
import argparse
import ast
import copy
import hashlib
import importlib.util
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

ROOT = Path.cwd().resolve()
BASELINE_ADAPTER_SHA = '25bd6ac7673d73223caaafd8366b49e2f04f8850377399279a280ff20852a643'
ADAPTER = Path(__file__).with_name('adapt.py')
PASS = 'PASS_FUNCTIONAL_PENDING_VISUAL'
WORKFLOW_ITEMS = {'hair-nebula', 'starter-sun-cap', 'starter-buddy-headphones', 'phones-sky', 'sister-cat-headphones'}
ROLES = ['brother', 'younger', 'sister', 'younger-sister']
PROFILES = ['1440-light', '1440-dark', '390-light', '390-dark']

def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def ref(p):
    p = Path(p).resolve()
    return {'path': str(p.relative_to(ROOT)), 'sha256': sha(p)}

def exact(r):
    assert set(r) == {'path', 'sha256'}, 'malformed exact ref'
    p = (ROOT / r['path']).resolve()
    p.relative_to(ROOT)
    assert sha(p) == r['sha256'], ('SHA mismatch', r['path'])
    return p

def read(p):
    return json.loads(Path(p).read_text())

def date(s):
    d = datetime.fromisoformat(s.replace('Z', '+00:00'))
    assert d.tzinfo is not None, 'timestamp must have timezone'
    return d

def pointer(value, path):
    assert path.startswith('/')
    for key in path[1:].split('/'):
        key = key.replace('~1', '/').replace('~0', '~')
        value = value[int(key)] if isinstance(value, list) else value[key]
    return value

def write(p, value):
    assert not p.exists(), ('immutable output exists', str(p))
    p.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def original_checker():
    assert sha(ADAPTER) == BASELINE_ADAPTER_SHA, 'original adapter changed'
    spec = importlib.util.spec_from_file_location('immutable_shop_adapter', ADAPTER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    tree = ast.parse(ADAPTER.read_text())
    candidates = [n for n in ast.walk(tree) if isinstance(n, ast.If)
                  and ast.unparse(n.test) == "a.kind == 'negative'"
                  and n.orelse and isinstance(n.orelse[0], ast.Assert)]
    assert len(candidates) == 1, 'cannot locate exact original case checks'
    fn = ast.parse('def check(row, a):\n pass').body[0]
    fn.body = copy.deepcopy(candidates[0].orelse) + ast.parse('return values, checks, record').body
    code = ast.fix_missing_locations(ast.Module(body=[fn], type_ignores=[]))
    namespace = {'capture': module.capture, 'healthy': module.healthy}
    exec(compile(code, str(ADAPTER), 'exec'), namespace)
    return namespace['check']

def identity(row):
    return {'role': row['avatar'], 'itemId': row['item']['id'],
            'profile': str(row['profile']['width']) + '-' + row['profile']['theme']}

def validate_report(r, h, artifact_map, runner_sha, kind, catalog):
    assert r['status'] in ('PASS_SELECTED_SCOPE_PENDING_VISUAL', 'PASS_FULL_MATRIX_PENDING_VISUAL',
                           'FAIL_RAW_CASES_PRESERVED'), 'partial/unknown raw status'
    assert r['browserClosed'] is True and r['phase'] == 'matrix' and r['freshCasesOnly'] is True
    for name in ('networkErrors', 'sourceRequests'):
        assert name in r and not r[name], ('raw errors', name)
    for name in ('globalError', 'error', 'pageErrors', 'errors'):
        assert not r.get(name), ('global errors', name)
    assert r['sourcePinsSHA256'] == h['sourcePins']['sha256'], 'stale source SHA'
    assert r['artifactPinsSHA256'] == h['artifactPins']['sha256'], 'stale artifact SHA'
    assert r['runnerSHA256'] == runner_sha, 'runner SHA mismatch'
    for field in ('preservedRunnerDependencies', 'harnessDependencies'):
        assert r.get(field), ('missing frozen dependencies', field)
        for dep, digest in r[field].items():
            exact({'path': dep, 'sha256': digest})
    assert r['compiledDocuments'] and r['compiledAssets'], 'missing browser HTTP proof'
    for proof in r['compiledDocuments'].values():
        assert proof['status'] == 200 and proof['sha256'] == artifact_map['index.html']
    for path, proof in r['compiledAssets'].items():
        assert proof['status'] == 200 and proof['sha256'] == artifact_map[path.lstrip('/')]
    expected_items = WORKFLOW_ITEMS if kind == 'workflow' else set(r['items'])
    expected_count = 16 * len(expected_items)
    assert expected_items and expected_items <= set(catalog), 'unknown items scope'
    assert len(r['items']) == len(expected_items) and set(r['items']) == expected_items, 'items scope mismatch'
    assert r['selectedMatrixCount'] == expected_count and r['fullMatrixCount'] == 1024 and r['catalogCount'] == 64
    assert r['roles'] == ROLES
    assert [str(p['width']) + '-' + p['theme'] for p in r['profiles']] == PROFILES
    indices = [row['originalMatrixIndex'] for row in r['cases']]
    assert indices == r['plannedOriginalMatrixIndices'] and len(indices) == r['plannedCases'], 'partial planned coverage'
    assert len(set(indices)) == len(indices), 'duplicate original index'
    assert type(r['shardCount']) is int and r['shardCount'] > 0 and 0 <= r['shardIndex'] < r['shardCount'], 'invalid shard plan'
    expected_indices = [pi * 256 + ri * 64 + ci for pi in range(4) for ri in range(4)
                        for ci, item in enumerate(catalog) if item in expected_items
                        and (pi * 256 + ri * 64 + ci) % r['shardCount'] == r['shardIndex']]
    assert indices == expected_indices, 'incomplete declared items/shard plan'
    for row in r['cases']:
        assert row.get('contextClosed') is True, 'context not closed'
        assert not row.get('pageErrors'), 'case page errors'
        value = identity(row)
        assert value['itemId'] in expected_items and value['role'] in ROLES and value['profile'] in PROFILES
        expected_index = PROFILES.index(value['profile']) * 256 + ROLES.index(value['role']) * 64 + catalog.index(value['itemId'])
        assert row['originalMatrixIndex'] == expected_index, 'wrong original index/identity'
        assert row['status'] in (PASS, 'FAIL'), 'running/unknown case'
    assert (r['status'] == 'FAIL_RAW_CASES_PRESERVED') == any(row['status'] == 'FAIL' for row in r['cases']), 'top/row status inconsistency'

def choose(originals, retries, timing):
    selected, failed, audit, used_events = {}, {}, [], set()
    for rr, report in originals:
        for i, row in enumerate(report['cases']):
            idx = row['originalMatrixIndex']
            assert idx not in selected, 'duplicate original coverage'
            selected[idx] = (rr, i, row)
            if row['status'] == 'FAIL':
                failed[idx] = (rr, i, row, report)
    replaced = set()
    for rr, report in retries:
        for i, row in enumerate(report['cases']):
            idx = row['originalMatrixIndex']
            assert idx in selected, 'unknown retry case'
            assert idx in failed, 'cannot replace original PASS'
            assert idx not in replaced, 'duplicate retry selection'
            original_ref, oi, old, old_report = failed[idx]
            assert row['status'] == PASS, 'retry did not pass'
            assert identity(row) == identity(old) and row['profile'] == old['profile'] and row['item'] == old['item'], 'wrong retry identity'
            for field in ('sourcePinsSHA256', 'artifactPinsSHA256', 'runnerSHA256', 'candidateId', 'manifestPins',
                          'harnessDependencies', 'preservedRunnerDependencies', 'selectedMatrixCount', 'items'):
                assert report[field] == old_report[field], ('retry provenance mismatch', field)
            matches = [(n, e) for n, e in enumerate(timing['events']) if e['originalRaw'] == original_ref and e['retryRaw'] == rr]
            assert len(matches) == 1, 'missing/duplicate timing event'
            ti, event = matches[0]
            assert event['evidence'], 'timing requires actual process evidence refs'
            for evidence in event['evidence']:
                exact(evidence)
            for field in ('originalCompletedAt', 'retryStartedAt', 'retryCompletedAt'):
                assertion = event['timeAssertions'][field]
                assert assertion['ref'] in event['evidence'], 'time evidence not declared'
                assert pointer(read(exact(assertion['ref'])), assertion['pointer']) == event[field], 'time assertion mismatch'
            assert date(event['originalCompletedAt']) <= date(event['retryStartedAt']) <= date(event['retryCompletedAt']), 'retry predates original completion'
            used_events.add(ti)
            selected[idx] = (rr, i, row)
            replaced.add(idx)
            audit.append({'originalMatrixIndex': idx, 'values': identity(row), 'originalRaw': original_ref,
                          'originalPointer': '/cases/' + str(oi), 'originalTopStatus': old_report['status'],
                          'originalStatus': old['status'], 'originalReason': old.get('error'),
                          'originalFailureScreenshotError': old.get('failureScreenshotError'),
                          'retryRaw': rr, 'retryPointer': '/cases/' + str(i), 'retryStatus': row['status'],
                          'afterComplete': True, 'timingPointer': '/events/' + str(ti),
                          'originalCompletedAt': event['originalCompletedAt'], 'retryStartedAt': event['retryStartedAt'],
                          'retryCompletedAt': event['retryCompletedAt']})
    assert replaced == set(failed), 'unresolved original failures'
    assert used_events == set(range(len(timing['events']))), 'unknown timing selections'
    return selected, audit

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--kind', choices=['workflow', 'regression'], required=True)
    ap.add_argument('--raw', type=Path, action='append', required=True)
    ap.add_argument('--retry', type=Path, action='append', required=True)
    ap.add_argument('--timing-receipt', type=Path, required=True)
    ap.add_argument('--http-receipt', type=Path, required=True)
    ap.add_argument('--runner', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    assert not args.out.exists(), 'output exists'
    h = read(args.http_receipt)
    assert h['status'] == 'PASS' and h['sourceAndArtifactsUnchangedBeforeAndAfterHTTP'] is True
    for k in ('sourcePins', 'artifactPins'):
        exact(h[k])
    artifacts = read(exact(h['artifactPins']))
    source = (ROOT / 'src/cosmetics.ts').read_text().split('export const cosmetics:')[1].split('];')[0]
    catalog = re.findall(r"id\s*:\s*'([^']+)'\s*,\s*slot\s*:\s*'[^']+'\s*,\s*name\s*:\s*'[^']+'", source)
    assert len(catalog) == len(set(catalog)) == 64
    assert sha(ROOT / 'src/cosmetics.ts') == read(exact(h['sourcePins']))['src/cosmetics.ts']
    inputs = []
    for paths in (args.raw, args.retry):
        rows = []
        for p in paths:
            r = read(p)
            validate_report(r, h, artifacts, sha(args.runner), args.kind, catalog)
            rows.append((ref(p), r))
        inputs.append(rows)
    timing = read(args.timing_receipt)
    selected, selections = choose(*inputs, timing)
    check = original_checker()
    records, seen = [], set()
    for idx, (rr, i, row) in sorted(selected.items()):
        values, checks, record = check(row, SimpleNamespace(kind=args.kind))
        key = json.dumps(values, sort_keys=True)
        assert key not in seen and all(v is True for v in checks.values()), (values, checks)
        seen.add(key)
        record.update(values=values, checks=checks, sourceRaw=rr, sourcePointer='/cases/' + str(i))
        records.append(record)
    items = WORKFLOW_ITEMS if args.kind == 'workflow' else set(catalog)
    expected = {json.dumps({'role': role, 'itemId': item, 'profile': p}, sort_keys=True)
                for role in ROLES for item in items for p in PROFILES}
    assert seen == expected, 'missing/unknown exact matrix coverage'
    group = {'workflow': 'headwearWorkflow', 'regression': 'shopRegression'}[args.kind]
    now = datetime.now(timezone.utc).isoformat()
    observations = {'status': 'PASS_EXACT_RAW_AUDIT_WITH_EXPLICIT_RETRIES', 'observedAt': now,
                    'scope': 'Immutable per-row observations; original failed report remains failed. No new browser or visual claim.',
                    'rawReports': [r for r, _ in inputs[0]], 'retryReports': [r for r, _ in inputs[1]],
                    'retrySelections': selections, 'timingReceipt': ref(args.timing_receipt),
                    'httpReceipt': ref(args.http_receipt), 'auditor': ref(__file__), 'originalCaseChecker': ref(ADAPTER),
                    'cases': records}
    args.out.mkdir(parents=True)
    op = args.out / 'observations.json'
    write(op, observations)
    oref = ref(op)
    cases = [{'values': r['values'], 'raw': oref,
              'bindings': {k: f'/cases/{i}/values/{k}' for k in r['values']},
              'checks': {k: {'ref': oref, 'pointer': f'/cases/{i}/checks/{k}', 'equals': True} for k in r['checks']}}
             for i, r in enumerate(records)]
    adapter = dict(group=group, mode='fresh', status='PASS', observedAt=now,
                   sourcePins=h['sourcePins'], artifactPins=h['artifactPins'],
                   servedArtifacts=ref(args.http_receipt), runner=ref(args.runner), cases=cases)
    path = args.out / (group + '.json')
    write(path, adapter)
    print(json.dumps(ref(path)))

if __name__ == '__main__':
    main()
