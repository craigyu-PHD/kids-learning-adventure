#!/usr/bin/env python3
"""Bind selected actual compiled fit observations to the frozen gate.

Consumes make_fit_contacts index rawOrigin pins. Contacts are not test evidence;
every boolean and identity points directly into the original raw report.
"""
import argparse
from datetime import datetime
import hashlib
import importlib.util
import json
from pathlib import Path


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--contacts',type=Path,required=True)
    ap.add_argument('--build-receipt',type=Path,required=True)
    ap.add_argument('--out',type=Path,required=True)
    args=ap.parse_args()
    root=Path.cwd().resolve();out=args.out.resolve()
    if out.exists() or not out.is_relative_to(root):
        ap.error('Use a new output directory inside the repository')
    def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
    def ref(p):
        p=Path(p).resolve()
        if not p.is_relative_to(root):raise ValueError('External evidence ref')
        return {'path':str(p.relative_to(root)),'sha256':sha(p)}
    def load(r):
        p=(root/r['path']).resolve()
        if not p.is_relative_to(root) or sha(p)!=r['sha256']:raise ValueError('Evidence SHA mismatch')
        return json.loads(p.read_text())
    contact_ref=ref(args.contacts);contacts=load(contact_ref)
    build_ref=ref(args.build_receipt);build=load(build_ref)
    if build['status']!='PASS' or build['exitCode']!=0:raise ValueError('Build did not pass')
    spec=importlib.util.spec_from_file_location('gate',root/'scripts/qa_v653_feedback_release.py')
    gate=importlib.util.module_from_spec(spec);spec.loader.exec_module(gate);contract=gate.contract()
    sources=load(build['sourcePins']);artifacts=load(build['artifactPins']);public=load(build['publicPins'])
    raw_cache={};grouped={};seen=set();selected_counts={}
    for row in contacts['rows']:
        origin=row['rawOrigin'];raw_ref={'path':str(Path(origin['report']['path']).resolve().relative_to(root)),'sha256':origin['report']['sha256']}
        if raw_ref['path'] not in raw_cache:
            raw_cache[raw_ref['path']]=load(raw_ref)
        raw=raw_cache[raw_ref['path']]
        if raw['sourcePins']!=build['sourcePins'] or raw['artifactPins']!=build['artifactPins']:
            raise ValueError('Observation belongs to another compiled candidate')
        i=origin['rowIndex'];actual=raw['rows'][i]
        keys=['group','role','skin','itemSet','targetItemId']
        if any(row[k]!=actual[k] for k in keys):raise ValueError('Raw identity changed')
        group=actual['group']
        if group not in ['headwearFit','retainedEarwearHairFit']:raise ValueError('Unexpected fit group')
        identity=tuple(actual[k] for k in ['group','role','skin','itemSet'])
        if identity in seen:raise ValueError('Duplicate selected identity')
        seen.add(identity)
        if not actual['status'].startswith('PASS'):raise ValueError('Selected raw observation failed')
        checks=contract['groups'][group]['checks']
        if any(actual[k] is not True for k in checks):raise ValueError('Raw check is not boolean true')
        selection=origin['selection'];selected_counts[selection]=selected_counts.get(selection,0)+1
        if selection=='fresh-retry-success':
            previous=origin['supersededFailedObservation'];previous_ref={'path':str(Path(previous['report']['path']).resolve().relative_to(root)),'sha256':previous['report']['sha256']}
            old=load(previous_ref)['rows'][previous['rowIndex']]
            if old['status']!='FAIL' or any(old[k]!=actual[k] for k in keys):raise ValueError('Retry did not replace exact failed identity')
        elif selection!='original-success':raise ValueError('Unknown selection policy')
        ptr=f'/rows/{i}'
        case={'values':{k:actual[k] for k in ['role','skin','itemSet']},'raw':raw_ref,
              'bindings':{k:ptr+'/'+k for k in ['role','skin','itemSet']},
              'checks':{k:{'ref':raw_ref,'pointer':ptr+'/'+k,'equals':True} for k in checks}}
        grouped.setdefault((group,raw_ref['path']),{'raw':raw,'rawRef':raw_ref,'cases':[]})['cases'].append(case)
    if len(seen)!=608:raise ValueError('Expected exact 608 selected fit identities')
    out.mkdir(parents=True);evidence={g:[] for g in ['headwearFit','retainedEarwearHairFit']}
    for n,((group,_),entry) in enumerate(sorted(grouped.items())):
        raw=entry['raw']
        report={'group':group,'mode':'fresh','status':'PASS','observedAt':raw['completedAt'],
                'sourcePins':raw['sourcePins'],'runner':raw['runner'],'artifactPins':raw['artifactPins'],
                'servedArtifacts':raw['servedArtifacts'],'cases':entry['cases'],
                'reportScope':'Selected valid actual observations only; original raw top-level status is preserved and not reclassified.',
                'originalRaw':entry['rawRef'],'originalRawTopLevelStatus':raw['status'],
                'selectionInput':contact_ref,'adapterRunner':ref(__file__)}
        p=out/f'{group}-{n}.json'
        with p.open('x') as f:json.dump(report,f,ensure_ascii=False,indent=2);f.write('\n')
        evidence[group].append(ref(p))
    checker=gate.Gate();checker.sources=sources;checker.public=public;checker.artifact_ref=build['artifactPins']
    checker.built_at=datetime.fromisoformat(build['completedAt'].replace('Z','+00:00'))
    checker.generated_artifacts={p:h for p,h in artifacts.items() if 'public/'+p not in public}
    for group,refs in evidence.items():checker.evidence(group,refs,contract['groups'][group])
    result={'status':'PASS_FIT_ADAPTER_BINDINGS_ONLY' if not checker.errors else 'FAIL',
            'evidence':evidence,'checks':len(checker.checks),'errors':checker.errors,
            'selectedCounts':selected_counts,'rows':608,'build':build_ref,
            'scope':'Functional fit only; no visual acceptance or original raw status repair.'}
    p=out/'index.json'
    with p.open('x') as f:json.dump(result,f,ensure_ascii=False,indent=2);f.write('\n')
    print(json.dumps({'index':ref(p),'status':result['status'],'errors':checker.errors}))
    return 0 if not checker.errors else 2


if __name__=='__main__':raise SystemExit(main())
