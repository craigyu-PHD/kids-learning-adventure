#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, os, subprocess
ROOT=Path(__file__).resolve().parents[1]
ATT=ROOT/'qa/art-gate/attempts/20260916_p10_motion_coverage'
def sha(p):return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
def read(path):return json.loads((ROOT/path).read_text())
expected={
 'existing-art-inventory.json':'c97c063b4601cff8313b11c7cd51a13ff1941d6262860d1575c2c7e0628a7d7d',
 'transfer-eligibility-summary.json':'21c3264d6267a152fc0a36e0dc59a1ab7b02acdeadfdb2333ac0793aeb2d2334',
 'derived-candidate-manifest.json':'420d09e32f8a501508667c0dd9100f51e417d58ff35a6ddfd1059d5fbf54d56b',
 'candidate-visual-admission-summary.json':'62f11719c199f9d14c07ff7b30fe3425b13a082856ae757ff80a569cdea3ed71',
 'motion-promotion.json':'0cdf58a24fed65ff7390b93d5156696176fea9dd5789999df791658849581033',
}
for name,digest in expected.items():
 p=f'qa/art-gate/attempts/20260916_p10_motion_coverage/{name}'
 assert sha(p)==digest,(name,sha(p),digest)
inv=read('qa/art-gate/attempts/20260916_p10_motion_coverage/existing-art-inventory.json')
assert inv['status']=='PASS_EXISTING_ART_COMPLETE' and all(inv['checks'].values())
elig=read('qa/art-gate/attempts/20260916_p10_motion_coverage/transfer-eligibility-summary.json')
assert (elig['status'],elig['rowCount'],elig['verdictCount'],elig['passRows'])==('PASS',30,60,30)
admission=read('qa/art-gate/attempts/20260916_p10_motion_coverage/candidate-visual-admission-summary.json')
assert (admission['status'],admission['rowCount'],admission['verdictCount'],admission['passRows'])==('PASS',30,60,30)
promotion=read('qa/art-gate/attempts/20260916_p10_motion_coverage/motion-promotion.json')
assert promotion['status']=='PROMOTED_PENDING_RUNTIME'
assert (promotion['characterRecordsPromoted'],promotion['robotRecordsPromoted'],len(promotion['formalFiles']))==(28,2,120)
for f in promotion['formalFiles']: assert sha(f['path'])==f['sha256'],f['path']
cm=read('src/data/characterMotionManifest.json');av=read('src/data/avatarAssetManifest.json')
expected_looks={(r['avatarId'],r['skinId']) for r in av['skins']}
actual={(r['avatarId'],r['skin']) for r in cm['records'] if r['motion']=='blink'}
assert len(cm['records'])==32 and actual==expected_looks
for r in cm['records']:
 assert r['productionUrlPass']=='PENDING'
 for v in r['displayVariants']: assert sha(v['path'])==v['sha256']
wm=read('src/data/worldArtManifest.json');robots={r['itemId']:r for r in wm['records'] if r['slot']=='robot'}
assert set(robots)=={'robot-sky','robot-mecha','robot-legend'}
assert all('blink' in r for r in robots.values())
for item,r in robots.items():
 b=r['blink'];assert sha(b['source']['path'])==b['source']['sha256'];assert sha(b['delivery']['path'])==b['delivery']['sha256'];assert [v['width'] for v in b['displayVariants']]==[384,768]
 for v in b['displayVariants']:assert sha(v['path'])==v['sha256']
 if item!='robot-sky':
  assert b['derivation']['visualAdmission']['sha256']==expected['candidate-visual-admission-summary.json']
  assert b['derivation']['metrics']['alphaExact'] is True and b['derivation']['metrics']['outsideMaskChangedPixels']==0
hook=(ROOT/'src/useCharacterBlink.ts').read_text();renderer=(ROOT/'src/components/AvatarRenderer.tsx').read_text()
assert "r.avatarId === avatarId && r.skin === skin && r.motion === 'blink'" in hook
assert 'window.devicePixelRatio' in hook and 'ResizeObserver' in hook
assert "skin?.id ?? 'default'" in renderer
assert '(greet || heroPreview) && stageOverride === undefined && !hero && !fullSkin' in renderer
assert '(greet || heroPreview) && !fullSkin' not in renderer
env=os.environ.copy();env['CHARACTER_BLINK_REQUIRE_ALL']='1';env['CHARACTER_BLINK_REQUIRE_FULL']='1'
run=subprocess.run(['python3','qa/art-gate/validate-character-motion.py'],cwd=ROOT,env=env,text=True,capture_output=True)
assert run.returncode==0,run.stdout+run.stderr
print(json.dumps({'status':'PASS_P10_MOTION_COVERAGE_DETERMINISTIC','characterLooks':32,'characterFullSkin':28,'robotsWithBlink':3,'eligibilityVerdicts':60,'candidateVisualVerdicts':60,'formalFiles':120,'productionAcceptance':'PENDING'},ensure_ascii=False))
