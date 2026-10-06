"""Bind manually observed formal runtime sheets to the complete functional aggregate.
This verifier never creates or changes visual verdicts.
"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--aggregate', type=Path, required=True)
    parser.add_argument('--observations', type=Path, required=True)
    args = parser.parse_args()
    agg = json.loads(args.aggregate.read_text())
    obs = json.loads(args.observations.read_text())
    assert obs['status'] == 'PASS_SCOPED_VISUAL'
    assert agg['status'] == 'PASS_FUNCTIONAL_PENDING_VISUAL'
    assert agg['formal'] and not agg['manifestOverride'] and not agg['cssOverride']
    assert agg['completedCases'] == agg['expectedCases'] == 1024
    assert agg['carriedCaseCount'] == 86 and agg['executedCaseCount'] == 938
    assert obs['candidateId'] == agg['candidateId']
    pins = ROOT/'qa/v653/20261005/release-art/final/source-pins.json'
    assert digest(pins) == obs['sourcePinsSHA256']
    for path, expected in json.loads(pins.read_text()).items():
        assert digest(ROOT/path) == expected, ('product source drift', path)
    profiles = {r['id'] for r in agg['profiles']}
    avatars = ['brother', 'younger', 'sister', 'younger-sister']
    assert len(obs['items']) == agg['inventoryCount'] == 64
    assert len({r['id'] for r in obs['items']}) == 64
    cases = {}
    for report_ref in agg['reports']:
        assert digest(report_ref['path']) == report_ref['sha256']
        report = json.loads(Path(report_ref['path']).read_text())
        for case in report['cases']:
            key = (case['item']['id'], case['profile']['id'], case['avatar'])
            assert key not in cases
            cases[key] = case
    assert {r['id'] for r in obs['items']} == {key[0] for key in cases}
    rows = []
    sheets = {}
    for profile in profiles:
        index_path = args.observations.parent/(profile+'--index.json')
        index = json.loads(index_path.read_text())
        assert index['candidateManifests'] == agg['candidateManifests']
        assert index['sourcePins'] == agg['sourcePins']
        assert index['completedSKUs'] == 64
        sheets[profile] = {r['item']: r for r in index['sheets']}
    for item in obs['items']:
        assert item['status'] == 'PASS_SCOPED_VISUAL'
        assert set(item['profiles']) == profiles
        for profile, review in item['profiles'].items():
            assert review['status'] == 'PASS_SCOPED_VISUAL', (item['id'],profile,review['status'])
            assert review['observations'] and all(s.strip() for s in review['observations'])
            assert review['reviewedAvatars'] == avatars
            sheet = sheets[profile][item['id']]
            assert review['sheet'] == sheet['sheet']
            assert review['sheetSHA256'] == sheet['sha256'] == digest(ROOT/sheet['sheet'])
            assert set(review['viewsSeen']) == {r['view'] for r in sheet['sources']}
            for source in sheet['sources']:
                assert digest(ROOT/source['path']) == source['sha256']
                case_source = cases[(item['id'], profile, source['avatar'])][source['view']]
                assert source['path'] == case_source['screenshot']
                assert source['sha256'] == case_source['screenshotSHA256']
            rows.extend((item['id'],profile,a) for a in avatars)
    assert len(rows) == len(set(rows)) == 1024
    result = {'status':'PASS_FORMAL_LIFECYCLE_AND_SCOPED_VISUAL',
        'scope':'64 SKUs x 4 avatars x (1440x1050 / 390x844, light / dark); reduced-motion synthetic preowned fixture; not purchase, live family, or production deployment evidence',
        'completedUniqueCases':len(rows), 'reviewedProfileSKUSheets':len(rows)//4,
        'carriedFunctionalCases':agg['carriedCaseCount'], 'freshFunctionalCases':agg['executedCaseCount'],
        'aggregate':str(args.aggregate.resolve()), 'aggregateSHA256':digest(args.aggregate),
        'observations':str(args.observations.resolve()), 'observationsSHA256':digest(args.observations),
        'sourcePinsSHA256':digest(pins),'candidateManifests':agg['candidateManifests'],
        'verifierSHA256':digest(__file__),
        'note':'Visual verdicts are manually recorded after viewing actual screenshot sheets. This script only verifies coverage and evidence integrity.'}
    output=args.observations.parent/'final-acceptance.json'
    assert not output.exists(), 'preserve previous acceptance evidence'
    output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False,indent=2))

if __name__ == '__main__':
    main()
