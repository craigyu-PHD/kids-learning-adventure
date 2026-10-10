"""Run unchanged core fixture tests without overwriting historical .qa files.

The source project remains the authority. Byte-identical test and input copies
run in a fresh local stage, with input hashes rechecked after every process.
No family network requests or production credentials are used.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa/v653/20261005/core' / f'isolated-{time.time_ns()}'
STAGE = Path('/Users/yuzikui/.codex/project-runtime') / OUT.name
TESTS = ['qa_v40_family_auth', 'qa_v40_state_guard', 'qa_v40_date_engine']
INPUTS = ['api/family-auth.ts', 'api/family-session.ts', 'api/state-guards.ts',
          'api/state.ts', 'src/App.tsx', 'src/v4/ParentSettings.tsx', 'src/cloud.ts',
          'src/dailyChallenge.ts', 'package.json', 'tsconfig.json']
INPUTS += [f'scripts/{name}.ts' for name in TESTS]
sha = lambda data: hashlib.sha256(data).hexdigest()
OUT.mkdir(parents=True)
STAGE.mkdir(parents=True)
pins = {}
for relative in INPUTS:
    data = (ROOT / relative).read_bytes()
    destination = STAGE / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    pins[relative] = sha(data)
    assert sha(destination.read_bytes()) == pins[relative]
(STAGE / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)
report = {'status': 'RUNNING', 'stage': str(STAGE), 'sourcePins': pins,
          'tests': [], 'originalTestsModified': False,
          'realFamilyData': 'NOT_USED', 'historicalQaResults': 'NOT_OVERWRITTEN'}
save = lambda: (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
save()
for name in TESTS:
    command = ['node', '--import', 'tsx', f'scripts/{name}.ts']
    result = subprocess.run(command, cwd=STAGE, capture_output=True, text=True, timeout=60)
    (OUT / f'{name}.log').write_text(result.stdout + result.stderr)
    for relative, digest in pins.items():
        assert sha((ROOT / relative).read_bytes()) == digest, f'source changed: {relative}'
        assert sha((STAGE / relative).read_bytes()) == digest, f'stage changed: {relative}'
    output = STAGE / '.qa' / (name.removeprefix('qa_') + '_result.json')
    row = {'test': name, 'exitCode': result.returncode, 'command': command}
    if output.is_file():
        data = output.read_bytes()
        (OUT / output.name).write_bytes(data)
        row.update(result=json.loads(data), resultSha256=sha(data))
    report['tests'].append(row)
    save()
    assert result.returncode == 0 and row.get('result', {}).get('status') == 'PASS', row
report['status'] = 'PASS_UNCHANGED_CORE_FIXTURES'
save()
print(json.dumps({'status': report['status'], 'report': str(OUT / 'report.json'),
                  'tests': [row['test'] for row in report['tests']]}, ensure_ascii=False))
