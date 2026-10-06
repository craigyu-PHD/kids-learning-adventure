#!/usr/bin/env python3
"""Copy exact frozen inputs to an isolated non-Git release stage, without secrets."""
import argparse
import hashlib
import json
from pathlib import Path
import signal
import sys

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = Path('/Users/yuzikui/.codex/project-runtime')
BASE = 'qa/v653/20261005/release-art/'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--stage', required=True)
    ap.add_argument('--final-index')
    ap.add_argument('--report-name')
    args = ap.parse_args()
    dest = Path(args.stage).resolve()
    if dest.parent != RUNTIME or not dest.name.startswith('little-explorers-v653-release-'):
        raise ValueError('Owned isolated release stage required')
    if (dest / '.git').exists():
        raise ValueError('Release stage must have no Git repository')
    dest.mkdir(parents=True, exist_ok=True)
    records = {}
    scanned = set()
    external_metadata = []

    def expired(*_):
        raise TimeoutError('Exact source file read timed out')
    signal.signal(signal.SIGALRM, expired)

    def copy(rel, expected=None, follow=False, depth=0):
        source = Path(rel)
        if source.is_absolute():
            source = source.resolve().relative_to(ROOT)
        if source.parts[0] in {'.git', 'node_modules'} or source.name.startswith('.env'):
            raise ValueError('Protected or secret input: '+str(source))
        origin = (ROOT / source).resolve()
        if not origin.is_relative_to(ROOT):
            raise ValueError('Input outside project: '+str(source))
        signal.alarm(8)
        try:
            raw = origin.read_bytes()
        finally:
            signal.alarm(0)
        h = digest(raw)
        if expected and h != expected:
            raise ValueError('Source drift: '+str(source))
        target = dest / source
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists() or digest(target.read_bytes()) != h:
            target.write_bytes(raw)
        records[str(source)] = {'sha256': h, 'bytes': len(raw)}
        if follow and source.suffix == '.json' and str(source) not in scanned:
            scanned.add(str(source))
            visit(json.loads(raw), depth)

    def visit(node, depth=0):
        if isinstance(node, dict):
            if isinstance(node.get('path'), str) and isinstance(node.get('sha256'), str):
                rel = Path(node['path'])
                if rel.is_absolute() and rel.is_relative_to(ROOT):
                    rel = rel.relative_to(ROOT)
                if rel.parts[0] in {'public', 'src', 'api', 'scripts', 'qa', 'art-source'}:
                    copy(rel, node['sha256'], follow=depth < 1, depth=depth+1)
                else:
                    # Historical artifact inventories also contain paths
                    # relative to their old Vercel stage, such as builds.json.
                    external_metadata.append(node)
            for value in node.values():
                visit(value, depth)
        elif isinstance(node, list):
            for value in node:
                visit(value, depth)

    pins_path = BASE+'final/source-pins.json'
    pins = json.loads((ROOT / pins_path).read_bytes())
    for name, h in pins.items():
        copy(name, h)
    copy(pins_path)
    for directory in ('src', 'api', 'scripts'):
        for path in sorted((ROOT / directory).rglob('*')):
            if path.is_file() and path.suffix in {'.ts', '.tsx', '.css', '.json', '.py', '.mjs', '.js'}:
                copy(path.relative_to(ROOT))
    for name in ('tsconfig.json', '.vercelignore'):
        copy(name)
    retained = json.loads((ROOT / (BASE+'retained-original-pins.json')).read_bytes())
    for name, h in retained['pins'].items():
        if Path(name).name != '.DS_Store':
            copy(name, h)
    for name in (BASE+'retained-original-pins.json', BASE+'legacy-gate-pins.json',
                 BASE+'lineage/candidate-r6b/index.json',
                 'qa/v653/20261005/recovery/avatarAssetManifest.frozen-production.json',
                 'qa/v653/20261005/blender/cards/native-r5-candidate/worldArtManifest.before-local-card.json'):
        copy(name, follow='baseline' not in name and 'frozen-production' not in name and 'before-local-card' not in name)
    lineage = json.loads((ROOT / (BASE+'lineage/candidate-r6b/index.json')).read_bytes())
    for name, row in lineage['newAssets'].items():
        copy(name, row['sha256'])
    for directory in ('qa/art-gate/brand-display', 'qa/art-gate/weekly-poster-delivery', 'qa/art-gate/caregiver-display'):
        for path in sorted((ROOT / directory).glob('*.json')):
            copy(path.relative_to(ROOT), follow=True)
    if args.final_index:
        copy(args.final_index, follow=True)
    for name, h in pins.items():
        if digest((ROOT/name).read_bytes()) != h or digest((dest/name).read_bytes()) != h:
            raise ValueError('Final source changed: '+name)
    result = {'status': 'STAGED_EXACT_INPUTS' if args.final_index else 'STAGED_INPUTS_FINAL_PROOF_PENDING',
              'stage': str(dest), 'sourcePinsSha256': digest((ROOT/pins_path).read_bytes()),
              'files': records, 'count': len(records), 'bytes': sum(r['bytes'] for r in records.values()),
              'historicalStageMetadataReferences': external_metadata,
              'secretsCopied': False, 'gitCopied': False, 'buildPassed': False}
    (dest/'stage-inputs.json').write_text(json.dumps(result, indent=2)+'\n')
    out = ROOT/'qa/v653/20261005/build'/dest.name
    out.mkdir(parents=True, exist_ok=True)
    name = args.report_name or ('final-stage.json' if args.final_index else 'initial-stage.json')
    if Path(name).name != name or not name.endswith('.json'):
        raise ValueError('Report name must be a single JSON filename')
    report = out/name
    if args.report_name and report.exists():
        raise ValueError('Preserve previous named stage receipt')
    report.write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k not in {'files','historicalStageMetadataReferences'}}))

if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(json.dumps({'status':'FAIL','error':str(exc)}))
        sys.exit(1)
