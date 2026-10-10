"""Assemble completed, source-bound QA reports for the unchanged release gate."""
import argparse
import copy
import hashlib
import json
import os
from pathlib import Path

from qa_v653_release_art import assets

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'qa/v653/20261005/release-art'
FINAL = BASE / 'final'


def link(path):
    path = Path(path).resolve()
    assert path.is_relative_to(ROOT)
    return {'path': str(path.relative_to(ROOT)),
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def read(path):
    return json.loads(Path(path).read_bytes())


def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def encoded(document):
    return (json.dumps(document, ensure_ascii=False, indent=2)+'\n').encode()


def planned_link(name, document):
    return {'path': str((FINAL/name).relative_to(ROOT)),
            'sha256': hashlib.sha256(encoded(document)).hexdigest()}


def publish(documents):
    # Validate every dependency before publishing any PASS document. Index is last.
    assert all(not (FINAL/name).exists() for name in documents), 'Preserve existing completed evidence'
    pending = []
    try:
        for name, document in documents.items():
            temporary = FINAL/('.'+name+'.pending')
            assert not temporary.exists(), ('pending evidence already exists', temporary)
            temporary.write_bytes(encoded(document))
            pending.append((temporary, FINAL/name))
        for temporary, target in pending:
            os.replace(temporary, target)
    finally:
        for temporary, _ in pending:
            if temporary.exists():
                temporary.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--formal-aggregate', type=Path, required=True)
    parser.add_argument('--formal-visual', type=Path, required=True)
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    freeze = read(FINAL / 'source-pins.json')
    for path, digest in freeze.items():
        assert link(ROOT/path)['sha256'] == digest, ('source drift', path)
    avatar = read(ROOT/'src/data/avatarAssetManifest.json')
    world = read(ROOT/'src/data/worldArtManifest.json')
    candidate = {
        'avatarManifestSha256': link(ROOT/'src/data/avatarAssetManifest.json')['sha256'],
        'worldManifestSha256': link(ROOT/'src/data/worldArtManifest.json')['sha256'],
        'sourcePinsSha256': link(FINAL/'source-pins.json')['sha256'],
    }
    aggregate = read(args.formal_aggregate)
    assert aggregate['status'] == 'PASS_FUNCTIONAL_PENDING_VISUAL'
    assert aggregate['completedCases'] == aggregate['expectedCases'] == 1024
    assert aggregate['inventoryCount'] == 64
    assert aggregate['formal'] and not aggregate['manifestOverride'] and not aggregate['cssOverride']
    for path, digest in freeze.items():
        assert aggregate['sourcePins'][path] == digest
    reports = []
    original_reports = [link(args.formal_aggregate)]
    for ref in aggregate['reports']:
        assert link(ref['path'])['sha256'] == ref['sha256']
        document = read(ref['path'])
        assert document['status'] in {'PASS_FUNCTIONAL_PENDING_VISUAL', 'PASS_SELECTED_CASES_ONLY_PENDING_VISUAL'}
        assert document['productSourcePinsSHA256'] == candidate['sourcePinsSha256']
        reports.append(document)
        original_reports.append(link(ref['path']))
    cases = [case for report in reports for case in report['cases']]
    assert len(cases) == 1024
    keys = {(c['profile']['id'], c['avatar'], c['item']['id']) for c in cases}
    assert len(keys) == 1024 and all(c['status'] == 'PASS_FUNCTIONAL_PENDING_VISUAL' for c in cases)
    health = [node['health'] for case in cases for node in walk(case) if 'health' in node]
    assert health
    overflow = max(h['overflow'] for h in health)
    broken = sum(len(h['broken']) for h in health)
    load_errors = sum(len(h['errors']) for h in health)
    assert overflow == broken == load_errors == 0, (overflow, broken, load_errors)
    assert not any(c.get('pageErrors') for c in cases)

    visual = read(args.formal_visual)
    final_visual_path = args.formal_visual.parent/'final-acceptance.json'
    final_visual = read(final_visual_path)
    assert final_visual['status'] == 'PASS_FORMAL_LIFECYCLE_AND_SCOPED_VISUAL'
    assert final_visual['aggregateSHA256'] == link(args.formal_aggregate)['sha256']
    assert final_visual['observationsSHA256'] == link(args.formal_visual)['sha256']
    assert final_visual['sourcePinsSHA256'] == candidate['sourcePinsSha256']
    assert final_visual['verifierSHA256'] == link(ROOT/'scripts/qa_v653_shop_visual_finalize.py')['sha256']
    assert final_visual['completedUniqueCases'] == 1024 and final_visual['reviewedProfileSKUSheets'] == 256
    assert final_visual['candidateManifests'] == aggregate['candidateManifests']
    assert visual['sourcePinsSHA256'] == candidate['sourcePinsSha256']
    assert visual['candidateId'] == aggregate['candidateId']
    assert visual['reviewedProfileSKUCount'] == 256 and visual['reviewedCases'] == 1024
    assert len(visual['items']) == 64
    observed_keys = set()
    case_by_key = {(c['item']['id'], c['profile']['id'], c['avatar']): c for c in cases}
    sheets = {}
    for profile in aggregate['profiles']:
        document = read(args.formal_visual.parent/(profile['id']+'--index.json'))
        assert document['candidateManifests'] == aggregate['candidateManifests']
        assert document['sourcePins'] == aggregate['sourcePins'] and document['completedSKUs'] == 64
        sheets[profile['id']] = {row['item']: row for row in document['sheets']}
    for item in visual['items']:
        for profile, observation in item['profiles'].items():
            assert observation['status'] == 'PASS_SCOPED_VISUAL'
            assert set(observation['reviewedAvatars']) == {'brother','younger','sister','younger-sister'}
            assert observation['observations'] and observation['sheet']
            assert link(ROOT/observation['sheet'])['sha256'] == observation['sheetSHA256']
            sheet = sheets[profile][item['id']]
            assert sheet['sheet'] == observation['sheet'] and sheet['sha256'] == observation['sheetSHA256']
            assert set(observation['viewsSeen']) == {s['view'] for s in sheet['sources']}
            for source in sheet['sources']:
                capture = case_by_key[(item['id'], profile, source['avatar'])][source['view']]
                assert source['path'] == capture['screenshot'] and source['sha256'] == capture['screenshotSHA256']
                assert link(ROOT/source['path'])['sha256'] == source['sha256']
            observed_keys.add((profile,item['id']))
    assert len(observed_keys) == 256

    purchase_path = ROOT/'qa/v653/20261005/shop-coverage/purchase-ui-formal-64-aggregate-r2.json'
    purchase = read(purchase_path)
    assert purchase['status'] == 'PASS_FORMAL_64_UNIQUE_UI_PURCHASE_AND_SCOPED_VISUAL'
    assert purchase['uniqueSKUCount'] == 64 and purchase['paidSKUCount'] == 61 and purchase['legitimateFreeSKUCount'] == 3
    assert purchase['rootSourceFreezeSHA256'] == candidate['sourcePinsSha256'] and purchase['root106CurrentMatch']
    economy_path = ROOT/'qa/v653/20261005/shop-coverage/economy-formal-r3/result.json'
    economy = read(economy_path)
    assert economy['status'] == 'PASS_SERVICE_ECONOMY'
    assert economy['total'] == economy['passed'] == len(economy['rows']) == 256 and not economy['failures']
    assert len(economy['controls']) == 7 and all(r['status'] == 'PASS' for r in economy['controls'])
    assert all(r['status'] == 'PASS' for r in economy['rows'])
    assert {(r['avatar'], r['itemId']) for r in economy['rows']} == {(c['avatar'], c['item']['id']) for c in cases}
    assert len(economy['sourcePins']) == 8
    assert all(freeze[p] == h == link(ROOT/p)['sha256'] for p,h in economy['sourcePins'].items())

    normalized = read(BASE/'lineage/candidate-r6b/index.json')
    avatar_base = ROOT/'qa/v653/20261005/recovery/avatarAssetManifest.frozen-production.json'
    world_base = BASE.parent/'blender/cards/native-r5-candidate/worldArtManifest.before-local-card.json'
    refs = {**{'avatar'+k:v for k,v in assets(avatar).items()},
            **{'world'+k:v for k,v in assets(world).items()}}
    before = {**{'avatar'+k:v for k,v in assets(read(avatar_base)).items()},
              **{'world'+k:v for k,v in assets(read(world_base)).items()}}
    changes = {key:{'before':before.get(key),'after':value} for key,value in refs.items() if before.get(key)!=value}
    removals = {key:value for key,value in before.items() if key not in refs}
    covered = set(normalized['newAssets']) | {d['after'] for d in changes.values()}
    assert len(normalized['newAssets']) == 198

    variant_path = ROOT/'qa/v653/20261005/build/current-variant-path/current-component-r1/report.json'
    variant_completion_path = variant_path.parent/'completion.json'
    variant_completion = read(variant_completion_path)
    assert variant_completion['report'] == link(variant_path)
    variant = read(variant_path)
    assert variant['status'] == 'PASS_SCOPED_CURRENT_COMPONENT_PATHS' and not variant['failures']
    assert variant['formalManifests'] and not variant['manifestOverrides'] and not variant['productCssOverrides']
    assert variant['familyApisBlocked'] and variant['source106BeforeMatch'] and variant['source106AfterMatch']
    assert variant['source106Before'] == variant['source106After'] == freeze
    assert variant['source106SHA256'] == candidate['sourcePinsSha256']
    assert variant['candidate'] == {k:v for k,v in candidate.items() if k != 'sourcePinsSha256'}
    assert variant['runnerSHA256'] == link(ROOT/'scripts/qa_v653_current_variant_paths.py')['sha256']
    assert variant['selectedCases'] == variant['plannedCases'] == len(variant['cases']) == 132
    assert variant['plannedAvatarFits'] == 448
    assert all(c['status'] == 'PASS_CURRENT_COMPONENT_PATHS' and not c['pageErrors'] for c in variant['cases'])
    for p,h in variant['fixturePins'].items():
        assert link(ROOT/p)['sha256'] == h
    variant_cases = {c['id']:c for c in variant['cases']}
    assert len(variant_cases) == 132
    for row in variant_cases.values():
        assert link(ROOT/row['screenshot'])['sha256'] == row['screenshotSHA256']
    observed = set(variant['pathEvidence'])
    source_only = {r['path'] for r in variant['unobservedPaths']}
    expected_sources = {r['source']['path'] for r in world['records'] if r['itemId'] in {'card-sky','pet-space-fox'}}
    assert observed == set(variant['observedGatePaths']) and len(observed) == 211
    assert source_only == expected_sources and len(source_only) == 2
    assert observed | source_only == covered and not observed & source_only
    for row in variant['unobservedPaths']:
        assert row['scope'] == 'SOURCE_CODEC_ONLY_NOT_RUNTIME' and link(ROOT/row['path'])['sha256'] == row['sha256']
    for path, entries in variant['pathEvidence'].items():
        assert entries
        for entry in entries:
            row = variant_cases[entry['caseId']]
            assert entry['screenshot'] == row['screenshot'] and entry['screenshotSHA256'] == row['screenshotSHA256']
            assert entry['http']['status'] == 200 and entry['http']['sha256'] == link(ROOT/path)['sha256']
            assert any(u['path'] == path and u['role'] == entry['role'] and u['skin'] == entry['skin'] and u['http'] == entry['http'] for u in row['uses'])
    formal_paths = set()
    for case in cases:
        for node in walk(case):
            if 'proof' in node:
                formal_paths.update('public'+u for u in node['proof'].get('urls',[]) if u.startswith('/assets/'))
    formal_paths &= covered

    actual = copy.deepcopy(read(FINAL/'visual.draft.json'))
    assert actual['candidate'] == candidate
    actual['status'] = 'PASS'
    actual['scope'] = 'Exact-source native/fit review plus fresh formal full64x4x4 actual screenshots; scope of each original review remains explicit.'
    actual['originalReports'].extend([link(args.formal_visual),link(final_visual_path)])
    for item in visual['items']:
        for profile, observation in item['profiles'].items():
            observed_paths = set()
            for case in cases:
                if case['item']['id'] == item['id'] and case['profile']['id'] == profile:
                    for node in walk(case):
                        if 'proof' in node:
                            observed_paths.update('public'+u for u in node['proof'].get('urls',[]) if u.startswith('/assets/'))
            actual['reviews'].append({
                'image': link(ROOT/observation['sheet']), 'verdict':'PASS',
                'observation':' '.join(observation['observations']),
                'assetPaths':sorted(observed_paths & covered),
                'scope':'Fresh formal per-SKU QA sheet, four roles, original screenshot hashes preserved.',
                'itemId':item['id'], 'profile':profile, 'reviewer':visual['reviewer'],
            })
    actual['assetPaths'] = sorted(covered)
    actual['reviewer'] = {'id':'Root source/fit/current compiled subset and '+visual['reviewer']+' formal1024 actual reviewers', 'canViewImages':True}
    visual_link = planned_link('visual.json',actual)

    runtime = {
        'schemaVersion':1, 'kind':'runtime', 'status':'PASS', 'candidate':candidate,
        'assetPaths':sorted(covered), 'originalReports':original_reports+[link(purchase_path),link(economy_path),link(variant_path),link(final_visual_path)],
        'assetPathsMeaning':'Admission evidence inventory: 211 DOM-used assets plus two paired native source PNGs. These two source PNGs are never claimed as runtime loads.',
        'domObservedAssetPaths':sorted(observed), 'sourceCodecOnlyAssetPaths':sorted(source_only),
        'formalLifecycleAssetPaths':sorted(formal_paths), 'additionalPathEvidence':link(variant_path),
        'familyApisBlocked':True, 'fixture':'synthetic-local', 'manifestOverrides':False, 'cssOverrides':False,
        'brokenImages':broken, 'overflow':overflow, 'pageErrors':0,
        'roles':sorted({c['avatar'] for c in cases}), 'widths':sorted({c['profile']['width'] for c in cases}),
        'modes':sorted({c['profile']['theme'] for c in cases}),
        'operations':['trial','cancel','purchase-coins-derived','equip','home','reload','achievements','unequip','child-isolation','reduced-motion'],
        'coverage':{'formalLifecycleCases':1024,'uniqueSKU':64,
                    'carriedRows':aggregate['carriedCaseCount'],'freshRows':aggregate['executedCaseCount'],
                    'trueUIPurchaseUniqueSKU':64,'purchasePaidSKU':61,'purchaseFreeSKU':3,
                    'currentComponentCases':132,'currentComponentAvatarFits':448,
                    'domObservedPaths':211,'sourceCodecOnlyPaths':2,'formalLifecyclePaths':len(formal_paths),
                    'healthCaptures':len(health)},
        'limits':['Formal1024 uses one synthetic preowned zero-cost item; true prices/purchase are separate64UI and256service tests.',
                  'Default-role/profile lifecycle does not claim every possible multi-item permutation. The 448 current component fits verify garment variant paths separately; native fit and mixed224 visual reports retain their own scopes.',
                  'Chromium synthetic local family, no real cloud family writes or physical phone acceptance.'],
    }
    runtime_link = planned_link('runtime.json',runtime)
    negative = read(FINAL/'negative.json')
    assert negative['candidate'] == candidate and negative['status'] == 'PASS'
    assert {r['id'] for r in negative['controls']} >= {'missing-layer','stale-art','wrong-sku'}
    assert all(r['expectedFailureCaught'] and r['assertion'] for r in negative['controls'])
    for ref in negative['originalReports'] + [r['report'] for r in negative['controls']]:
        assert link(ROOT/ref['path'])['sha256'] == ref['sha256']
    pet_path = FINAL/'pet-cloud-contract/completion.json'
    pet = read(pet_path)
    assert str(pet['status']).startswith('PASS'), 'pet server contract incomplete'
    index = {
        'schemaVersion':1,'release':'v6.5.3','status':'READY_FOR_GATE_NOT_DEPLOYED','candidate':candidate,
        'sourcePins':link(FINAL/'source-pins.json'),
        'legacyGatePins':link(BASE/'legacy-gate-pins.json'),
        'retainedPins':link(BASE/'retained-original-pins.json'),
        'baselineManifests':{'avatar':link(avatar_base),'world':link(world_base)},
        'bindings':refs,'bindingChanges':changes,'bindingRemovals':removals,
        'newAssets':normalized['newAssets'],
        'visual':visual_link,'runtime':runtime_link,'negative':link(FINAL/'negative.json'),
        'currentMotionProof':link(BASE/'retained-motion/current-r2/current-proof.json'),
        'protectedCore':link(FINAL/'protected-core-build-pins.json'),
        'dependencyContract':link(FINAL/'dependency-lock-comparison.json'),
        'learningParentSummary':link(FINAL/'learning-parent-summary.json'),
        'petCloudContract':link(pet_path), 'finalVisualAcceptance':link(final_visual_path),
        'variantPaths':link(variant_path),
        'variantCompletion':link(variant_completion_path),
        'scope':'Local same-source art/function acceptance for formal prebuild. Final compiler/artifact/deploy and post-deploy checks remain required.',
    }
    for p,h in freeze.items():
        assert link(ROOT/p)['sha256'] == h, ('source drift before publish',p)
    if not args.check_only:
        publish({'visual.json':actual,'runtime.json':runtime,'evidence-index.json':index})
    print(json.dumps({'status':index['status'],'newAssets':198,'formalLifecycle':1024,'trueUIPurchase':64,'observedProfileSKU':256}))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
