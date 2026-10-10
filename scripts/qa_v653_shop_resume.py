"""Validate immutable, per-case carry-forward evidence after a QA-only fix."""
import copy
import json
from pathlib import Path

from qa_v653_full_shop_acceptance import BASE, ROOT, read_bytes, sha


def screenshots(value):
    if isinstance(value,dict):
        if 'screenshot' in value and 'screenshotSHA256' in value:
            yield value['screenshot'],value['screenshotSHA256']
        for child in value.values():
            yield from screenshots(child)
    elif isinstance(value,list):
        for child in value:
            yield from screenshots(child)


def case_key(case):
    return case['profile']['id'],case['avatar'],case['item']['id']


def load_resume(paths, inventory, profiles, manifests, candidate_id, product_pins_path, launch_proof_path):
    assert product_pins_path, 'carry-forward requires explicit product-source-pins'
    pins = json.loads(read_bytes(product_pins_path))
    assert pins and all(not p.startswith('scripts/qa_v653_') for p in pins), 'product/build pins must not include the QA harness being repaired'
    for path,digest in pins.items():
        assert sha(ROOT/path)==digest, ('product source changed',path)
    assert launch_proof_path, 'original product pin launch proof required'
    launch = json.loads(read_bytes(launch_proof_path))
    assert launch['formal'] and launch['rootPinsMatchAtLaunch'] and launch['candidateId']==candidate_id
    assert launch['rootPinsSHA256']==sha(product_pins_path) and launch['rootPinsCount']==len(pins)
    assert not launch['manifestOverride'] and not launch['cssOverride']
    carried,origins = {},[]
    for path in paths:
        path = path.resolve()
        assert path.is_relative_to(BASE.resolve()), 'resume report must be a local QA artifact'
        assert path.parent.name in {'final-full-shop-'+job['attempt'] for job in launch['jobs']}
        raw = read_bytes(path);report = json.loads(raw)
        assert report['formal'] and not report['manifestOverride'] and not report['cssOverride']
        assert report['runtimeInventoryMatches'] and report['candidateId']==candidate_id
        assert report['inventory']==inventory and report['profiles']==profiles
        assert all(report['candidateManifests'][key]['sha256']==value['sha256'] for key,value in manifests.items())
        harness = 'scripts/qa_v653_full_shop_acceptance.py'
        assert sha(path.parent/'runner-frozen.py')==report['sourcePins'][harness], 'missing exact frozen original harness'
        allowed_harness_changes = {harness,'scripts/qa_v653_full_shop_aggregate.py','scripts/qa_v653_shop_resume.py'}
        for source,digest in report['sourcePins'].items():
            if source not in allowed_harness_changes:
                assert sha(ROOT/source)==digest, ('resume source/fixture mismatch',source)
        accepted,excluded = 0,[]
        for index,case in enumerate(report['cases']):
            if case['status']!='PASS_FUNCTIONAL_PENDING_VISUAL':
                excluded.append({'rowIndex':index,'key':case_key(case),'status':case['status']})
                continue
            assert case['item'] in inventory and case['profile'] in profiles
            key = case_key(case)
            assert key not in carried, ('duplicate carry-forward case',key)
            for image,digest in screenshots(case):
                image_path = (ROOT/image).resolve()
                assert image_path.is_relative_to(BASE.resolve()) and sha(image_path)==digest, ('resume image mismatch',image)
            row = copy.deepcopy(case)
            row['carriedFrom'] = {'report':str(path),'reportSHA256':sha(path),'rowIndex':index,
                'originalOverallStatus':report['status'],'originalRunnerSHA256':report['sourcePins'][harness],
                'scope':'Exact successful row only; original failed overall report remains failed. No failed row or whole-SKU extrapolation.'}
            carried[key]=row;accepted+=1
        origins.append({'report':str(path),'sha256':sha(path),'acceptedRows':accepted,'excludedRows':excluded})
    return carried,{'productSourcePins':pins,'productSourcePinsFile':str(product_pins_path.resolve()),
        'productSourcePinsSHA256':sha(product_pins_path),'launchProof':str(launch_proof_path.resolve()),
        'launchProofSHA256':sha(launch_proof_path),'origins':origins,'validatedRows':len(carried)}


def verify_carried_row(case):
    lineage = case.get('carriedFrom')
    if not lineage:
        return
    assert sha(lineage['report'])==lineage['reportSHA256']
    origin = json.loads(read_bytes(lineage['report']))
    source = origin['cases'][lineage['rowIndex']]
    assert source['status']=='PASS_FUNCTIONAL_PENDING_VISUAL'
    comparison = copy.deepcopy(case)
    del comparison['carriedFrom']
    # The destination shard may enumerate its rows differently; content must match.
    comparison['index']=source['index']
    assert comparison==source, ('carried row mutated',case_key(case))
    assert sha(Path(lineage['report']).parent/'runner-frozen.py')==lineage['originalRunnerSHA256']
