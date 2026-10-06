#!/usr/bin/env python3
"""Create/verify the V6.4 T08 release-candidate owning-input fingerprint.

The fingerprint deliberately covers product/build/QA-contract inputs, not QA
outputs, dist/, docs handover/status files, caches, or local evidence generated
while the candidate is being tested. A P12 gate may write evidence without
changing candidate identity. Any edit under the owning inputs below invalidates
the fingerprint and requires a new candidate plus affected/full fresh gates.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / 'qa' / 'release-candidate' / '20260917' / 'v64-t08-owning-input-fingerprint.json'
OWNING_DIRS = ('src', 'public', 'api', 'scripts')
TOP_FILES = (
    'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts',
    'index.html', '.gitignore', '.vercelignore', 'AGENTS.md', 'docs/CURRENT-SPEC.md',
    '.vercel/project.json', '.env.local',
)
IGNORE_NAMES = {'.DS_Store', '__pycache__'}
IGNORE_SUFFIXES = {'.pyc', '.pyo'}


def sha_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def included_files() -> list[Path]:
    paths: set[Path] = set()
    for rel in TOP_FILES:
        p = ROOT / rel
        if p.is_file(): paths.add(p)
    for rel in OWNING_DIRS:
        base = ROOT / rel
        if not base.is_dir(): continue
        for p in base.rglob('*'):
            if not p.is_file(): continue
            if any(part in IGNORE_NAMES for part in p.relative_to(ROOT).parts): continue
            if p.suffix in IGNORE_SUFFIXES: continue
            paths.add(p)
    return sorted(paths, key=lambda p: p.relative_to(ROOT).as_posix())


def capture() -> dict:
    records=[]
    aggregate=hashlib.sha256()
    for path in included_files():
        rel=path.relative_to(ROOT).as_posix()
        digest=sha_file(path)
        size=path.stat().st_size
        records.append({'path':rel,'sha256':digest,'bytes':size})
        rb=rel.encode(); db=bytes.fromhex(digest)
        aggregate.update(len(rb).to_bytes(4,'big')); aggregate.update(rb)
        aggregate.update(size.to_bytes(8,'big')); aggregate.update(db)
    head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    branch=subprocess.check_output(['git','rev-parse','--abbrev-ref','HEAD'],cwd=ROOT,text=True).strip()
    return {
        'schemaVersion':1,
        'suiteName':'v64-t08-owning-input-fingerprint',
        'generatedAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),
        'branch':branch,
        'gitHead':head,
        'fileCount':len(records),
        'totalBytes':sum(r['bytes'] for r in records),
        'aggregateSha256':aggregate.hexdigest(),
        'scope':{
            'directories':list(OWNING_DIRS),
            'topFiles':[f for f in TOP_FILES if (ROOT/f).is_file()],
            'excludedByDesign':['dist/**','qa/**','.qa/**','docs/handover/**','docs/plans/** except docs/CURRENT-SPEC.md','node_modules/**','_BACKUPS/**','_DEPLOY_STAGING/**','generated test/evidence outputs'],
            'secretHandling':'.env.local is hash-bound only; contents are never copied into this report.',
        },
        'files':records,
    }


def compare(expected: dict, actual: dict) -> dict:
    exp={r['path']:(r['sha256'],r['bytes']) for r in expected.get('files',[])}
    act={r['path']:(r['sha256'],r['bytes']) for r in actual.get('files',[])}
    added=sorted(set(act)-set(exp)); removed=sorted(set(exp)-set(act))
    changed=sorted(p for p in set(exp)&set(act) if exp[p]!=act[p])
    passed=(expected.get('aggregateSha256')==actual.get('aggregateSha256') and not added and not removed and not changed)
    return {'status':'PASS' if passed else 'FAIL','matchingAggregate':expected.get('aggregateSha256')==actual.get('aggregateSha256'),'expectedAggregate':expected.get('aggregateSha256'),'actualAggregate':actual.get('aggregateSha256'),'added':added,'removed':removed,'changed':changed}


def main() -> int:
    ap=argparse.ArgumentParser()
    ap.add_argument('--output',default=str(DEFAULT_OUT.relative_to(ROOT)))
    ap.add_argument('--verify',action='store_true')
    args=ap.parse_args()
    target=ROOT/args.output
    if args.verify:
        if not target.is_file():
            print(json.dumps({'status':'FAIL','error':f'missing fingerprint {target.relative_to(ROOT)}'},ensure_ascii=False)); return 1
        expected=json.loads(target.read_text(encoding='utf-8'))
        result=compare(expected,capture())
        print(json.dumps(result,ensure_ascii=False,indent=2))
        return 0 if result['status']=='PASS' else 1
    data=capture(); target.parent.mkdir(parents=True,exist_ok=True); target.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'CAPTURED','path':str(target.relative_to(ROOT)),'fileCount':data['fileCount'],'totalBytes':data['totalBytes'],'aggregateSha256':data['aggregateSha256'],'gitHead':data['gitHead']},ensure_ascii=False,indent=2))
    return 0

if __name__=='__main__': raise SystemExit(main())
