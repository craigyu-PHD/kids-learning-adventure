"""Verify complete, identical-candidate formal Shop shards without launching a browser."""
import argparse
import itertools
import json
import re
from pathlib import Path

from qa_v653_full_shop_acceptance import AVATARS, BASE, ROOT, WEARABLE, inventory, public_refs, read_bytes, sha
from qa_v653_shop_resume import verify_carried_row


def screenshot_refs(value):
    if isinstance(value, dict):
        if 'screenshot' in value and 'screenshotSHA256' in value:
            yield value['screenshot'], value['screenshotSHA256']
        for child in value.values():
            yield from screenshot_refs(child)
    elif isinstance(value, list):
        for child in value:
            yield from screenshot_refs(child)


def validate(reports):
    assert reports, 'at least one completed formal report required'
    reference = reports[0]
    assert reference['inventory'] == inventory(), 'aggregate inventory differs from current source'
    assert len(reference['profiles']) == 4 and len({p['id'] for p in reference['profiles']}) == 4
    stable_keys = ['candidateId','candidateManifests','sourcePins','inventory','profiles','fullMatrixCount']
    expected = set(itertools.product(
        (p['id'] for p in reference['profiles']), AVATARS,
        (item['id'] for item in reference['inventory'])))
    assert len(expected) == reference['fullMatrixCount']
    found, screenshots = {}, []
    for report in reports:
        assert report['formal'] is True and report['manifestOverride'] is False and report['cssOverride'] is False
        assert report['status'] in ['PASS_FUNCTIONAL_PENDING_VISUAL','PASS_SELECTED_CASES_ONLY_PENDING_VISUAL'], report['status']
        assert report['runtimeInventoryMatches'] is True
        assert all(report[key] == reference[key] for key in stable_keys), 'shards have different candidate/source/inventory/profiles'
        assert len(report['cases']) == report['plannedCases']
        for case in report['cases']:
            assert case['status'] == 'PASS_FUNCTIONAL_PENDING_VISUAL'
            verify_carried_row(case)
            key = (case['profile']['id'],case['avatar'],case['item']['id'])
            assert key not in found, ('duplicate case',key)
            found[key] = case['status']
            screenshots.extend(screenshot_refs(case))
    assert set(found) == expected, {'missing':sorted(expected-set(found)),'extra':sorted(set(found)-expected)}
    return reference, found, screenshots


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--attempt',required=True)
    parser.add_argument('--reports',type=Path,nargs='+',required=True)
    args = parser.parse_args()
    assert re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_-]*',args.attempt)
    reports = [json.loads(read_bytes(path)) for path in args.reports]
    reference, found, screenshots = validate(reports)
    for path,digest in reference['sourcePins'].items():
        assert sha(ROOT/path) == digest, ('source drift since formal run',path)
    for kind,candidate in reference['candidateManifests'].items():
        assert sha(candidate['file']) == candidate['sha256']
        local = ROOT/'src/data'/('avatarAssetManifest.json' if kind=='avatar' else 'worldArtManifest.json')
        assert read_bytes(local) == read_bytes(candidate['file']), ('integrated manifest no longer byte-equal',kind)
    avatar = json.loads(read_bytes(reference['candidateManifests']['avatar']['file']))
    world = json.loads(read_bytes(reference['candidateManifests']['world']['file']))
    wearable_records = {r['id']:r for r in avatar['accessories']}
    skin_records = {(r['avatarId'],r['skinId']):r for r in avatar['skins']}
    world_records = {r['itemId']:r for r in world['records']}
    for report in reports:
        for case in report['cases']:
            ident,slot = case['item']['id'],case['item']['slot']
            record = skin_records[(case['avatar'],ident)] if slot == 'outfit' else wearable_records[ident] if slot in WEARABLE else world_records[ident]
            expected_paths = {'/'+p.removeprefix('public/') for p in public_refs(record)}
            fields = ['catalog','trial','equipped','home','homeReload','achievement'] if slot in WEARABLE else ['trial','homeWorld','homeWorldReload']
            for field in fields:
                assert expected_paths.intersection(case[field]['proof']['urls']), ('missing exact candidate SKU path',ident,field)
    for path,digest in screenshots:
        file = (ROOT/path).resolve()
        assert file.is_relative_to(BASE.resolve())
        assert sha(file) == digest, ('screenshot changed',path)
    out = BASE/('final-full-shop-'+args.attempt)
    out.mkdir(parents=True,exist_ok=False)
    summary = {'status':'PASS_FUNCTIONAL_PENDING_VISUAL','formal':True,'manifestOverride':False,'cssOverride':False,
        'candidateId':reference['candidateId'],'candidateManifests':reference['candidateManifests'],
        'sourcePins':reference['sourcePins'],'profiles':reference['profiles'],'inventoryCount':len(reference['inventory']),
        'completedCases':len(found),'expectedCases':reference['fullMatrixCount'],'screenshotCount':len(screenshots),
        'carriedCaseCount':sum('carriedFrom' in case for report in reports for case in report['cases']),
        'executedCaseCount':sum('carriedFrom' not in case for report in reports for case in report['cases']),
        'reports':[{'path':str(p.resolve()),'sha256':sha(p)} for p in args.reports],
        'fixtureScope':reference['fixtureScope'],'visualReview':'NOT_PERFORMED_BY_AGGREGATOR',
        'checks':['exact full unique matrix','same candidate and source pins','formal without manifest/CSS overrides',
                  'all lifecycle cases passed','exact candidate SKU asset paths in actual views',
                  'current source unchanged','integrated manifests byte-equal','all screenshot hashes intact']}
    (out/'aggregate.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:summary[k] for k in ['status','completedCases','expectedCases','screenshotCount']},indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
