#!/usr/bin/env python3
"""Read-only, fail-closed admission for the October 6 feedback candidate.

No deployment, pointer editing, report repair, browser execution or old-gate changes.
See release/gate-contract.json and gate-README.md for assembly instructions.
"""
import argparse
import copy
import hashlib
import itertools
import json
import marshal
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'qa/v653/20261006/user-feedback-r2/release/'
ANCHORS = {
    'baselineVercelConfig': (BASE+'gate-baseline-vercel-output-config.json', 'da702a9d897460d3a33c41adb9f0e32d73d9d5d64c07b7a05aa3c76b1244f459'),
    'baselineSource': ('qa/v653/20261006/full-goal-audit/incremental-release/source-pins107-final-r6.json', '04be36df35c2b1b924d9008cb03e94ab8a7644f281d6c6569eddbc474169612f'),
    'baselineArtifacts': ('qa/v653/20261006/full-goal-audit/incremental-release/build-r6/artifact-pins.json', '5423d96bc59dcd5249ce1f9c8879a22b58f914910171cbfb5d6e055962d26d33'),
    'baselinePublic': (BASE+'gate-baseline-public.json', '9f1b2d83b7faa13d0cd69d1deda4c739f442e75c606e80042135a0dbd0e8f5b8'),
    'requirements': (BASE+'requirements.json', '7d1876831e2a1e3db91963a74a7315f4bf3424f0267c03644e5332960c2a3b7b'),
    'protected15': (BASE+'gate-protected15.json', '94054b41636386676bc7b85a76df37e635bc87c90623ef872ce3e92de4060103'),
}
ALLOWED_CHANGED = set('''src/components/AvatarRenderer.tsx src/styles/components/dashboard.css src/styles/components/lesson.css src/styles/components/speaking.css src/styles/index.css src/styles/responsive.css src/v4/Dashboard.tsx src/v4/LessonPreparation.tsx src/v4/LessonQuest.tsx src/v4/ParentSettings.tsx src/v4/RewardModal.tsx src/v4/TreasureLottie.tsx src/v4/voice.ts src/v4/GameImage.tsx src/v5/AnimatedMedia.tsx src/data/avatarAssetManifest.json src/avatarAssetRegistry.ts scripts/prebuild_v653.py'''.split())
ALLOWED_NEW = set('''src/styles/components/actions.css src/styles/components/reward.css src/data/lessonSpeechManifest.json scripts/qa_v653_feedback_release.py'''.split())
ROLES = ['brother', 'younger', 'sister', 'younger-sister']
SKINS = ['default', 'outfit-cadet', 'outfit-legend', 'outfit-mage', 'outfit-mecha', 'outfit-ocean', 'outfit-racer', 'sister-bloom-outfit']
ITEMS = ['hair-nebula', 'starter-sun-cap', 'starter-buddy-headphones', 'phones-sky', 'sister-cat-headphones']
RETAINED_EARWEAR = ['phones-racer', 'phones-ai', 'story-headphones', 'phones-legend']
RETAINED_PAIR_FIELDS = {'requiredHairstyleFits', 'hairstyleSplitVariants'}
FUNCTIONS = ['family-auth', 'family-session', 'server-time', 'state-guards', 'state', 'time']
SETS = [[x] for x in ITEMS] + [ITEMS[:2]] + [[a, b] for a in ITEMS[:2] for b in ITEMS[2:]] + [[*ITEMS[:2], b] for b in ITEMS[2:]]
PROFILES = ['390-light', '390-dark', '1440-light', '1440-dark']
LESSON_PROFILES = ['360-light', '390-light', '820-light', '1440-light', '390-dark', '1440-dark', '2560-light']
COMMON_UI = ['src/styles/index.css', 'src/styles/responsive.css']
DEPS = {
    'headwear': ['src/components/AvatarRenderer.tsx', 'src/data/avatarAssetManifest.json', 'src/avatarAssetRegistry.ts', 'src/avatarShop.ts', 'src/cosmetics.ts', 'src/v4/SecondaryViews.tsx'],
    'lesson': ['src/v4/LessonQuest.tsx', 'src/v4/LessonPreparation.tsx', 'src/v4/RewardModal.tsx', 'src/v4/GameImage.tsx', 'src/styles/components/lesson.css', 'src/styles/components/speaking.css', 'src/styles/components/reward.css', *COMMON_UI],
    'site': ['src/v4/Dashboard.tsx', 'src/v5/AnimatedMedia.tsx', 'src/v4/GameImage.tsx', 'src/styles/components/dashboard.css', 'src/styles/components/actions.css', *COMMON_UI],
    'voice': ['src/v4/voice.ts', 'src/data/lessonSpeechManifest.json', 'src/v4/ParentSettings.tsx', 'src/v4/LessonQuest.tsx', 'src/lessonInstructionText.ts'],
}

def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe(path):
    p = (ROOT / path).resolve()
    if not p.is_relative_to(ROOT):
        raise ValueError(f'Path outside candidate root: {path}')
    return p


def link(path):
    p = safe(path)
    return {'path': str(p.relative_to(ROOT)), 'sha256': digest(p.read_bytes())}


def pointer(obj, key):
    if key == '':
        return obj
    if not isinstance(key, str) or not key.startswith('/'):
        raise ValueError('Expected JSON pointer')
    for part in key[1:].split('/'):
        part = part.replace('~1', '/').replace('~0', '~')
        obj = obj[int(part)] if isinstance(obj, list) else obj[part]
    return obj


def bound_value(raw, binding):
    """Small, explicit adapters for existing raw dimension representations."""
    if isinstance(binding,str):
        return pointer(raw,binding)
    transform=binding.get('transform')
    if transform=='string':
        return str(pointer(raw,binding['pointer']))
    if transform=='sorted-plus':
        return '+'.join(sorted(pointer(raw,binding['pointer'])))
    if transform=='join':
        return binding['separator'].join(str(pointer(raw,p)) for p in binding['pointers'])
    raise ValueError('Unsupported raw binding transform')


def inventory():
    baseline = json.loads(safe(ANCHORS['baselineSource'][0]).read_bytes())
    names = {p for p in set(baseline) | ALLOWED_NEW if not p.startswith('scripts/')}
    for directory in ('src', 'api'):
        names.update(str(p.relative_to(ROOT)) for p in safe(directory).rglob('*') if p.is_file() and p.name!='.DS_Store')
    names.update(json.loads(safe(ANCHORS['protected15'][0]).read_bytes()))
    sources = {name: digest(safe(name).read_bytes()) for name in sorted(names) if safe(name).is_file()}
    public = {str(p.relative_to(ROOT)): digest(p.read_bytes()) for p in safe('public').rglob('*') if p.is_file()}
    return sources, public


def publication_scope(sources, live_public):
    """Derive publication closure; index cannot freely omit runtime assets."""
    baseline=json.loads(safe(ANCHORS['baselinePublic'][0]).read_bytes())
    paths=set(baseline)
    def walk(value):
        if isinstance(value,dict):
            for child in value.values(): walk(child)
        elif isinstance(value,list):
            for child in value: walk(child)
        elif isinstance(value,str):
            if value.startswith('public/assets/'): paths.add(value)
            elif value.startswith('/assets/'): paths.add('public'+value)
    # Both are authoritative source manifests, not draft QA manifests.
    for name in ('src/data/avatarAssetManifest.json','src/data/worldArtManifest.json'):
        walk(json.loads(safe(name).read_bytes()))
    speech=json.loads(safe('src/data/lessonSpeechManifest.json').read_bytes())
    for modes in speech['clips'].values():
        for file in modes.values(): paths.add('public/assets/v6.5/audio/'+file)
    paths.update({'public/assets/v6.5/audio/lesson-speech-provenance.json','public/assets/v6.5/audio/KOKORO_LICENSE.txt'})
    # Catch literal runtime references outside the authoritative manifest closure.
    referenced=set()
    for name in sources:
        if name.startswith('src/'):
            text=safe(name).read_text()
            for value in re.findall(r"(?:public)?/assets/[^\s\"'`<>)}]+",text):
                referenced.add(value if value.startswith('public/') else 'public'+value)
    excluded={p:{'sha256':h,'reason':'Finder metadata' if Path(p).name=='.DS_Store' else 'Not referenced by current admitted runtime manifests or audio provenance','status':'UNPUBLISHED_LOCAL_FILE'} for p,h in live_public.items() if p not in paths}
    return paths, excluded, referenced


def retained_pair_issues(before, after, baseline_public, candidate_public):
    """Four retained designs may only gain exact Nebula split-pair metadata."""
    issues=[]
    if {k:v for k,v in after.items() if k not in RETAINED_PAIR_FIELDS} != before:
        issues.append('Existing catalog/default/skin/design metadata changed')
    if after.get('requiredHairstyleFits') != ['hair-nebula']:
        issues.append('Required hairstyle set must be exactly hair-nebula')
    variants=after.get('hairstyleSplitVariants',{})
    if set(variants) != {'hair-nebula'}:
        issues.append('Only hair-nebula pairs may be added')
    roles=variants.get('hair-nebula',{})
    if set(roles)!=set(ROLES):issues.append('Four exact role pairs required')
    for role in ROLES:
        skins=roles.get(role,{})
        if set(skins)!=set(SKINS):issues.append(role+': eight exact skin pairs required')
        for skin in SKINS:
            pair=skins.get(skin,{})
            if set(pair)!={'back','front'}:
                issues.append(role+'/'+skin+': exact back/front fields required');continue
            original_front=before.get('skinFrontVariants',{}).get(role,{}).get(skin,before['frontVariants'][role])
            original_back=before.get('skinBackVariants',{}).get(role,{}).get(skin,before['backVariants'][role])
            if pair['front']!=original_front or baseline_public.get(original_front)!=candidate_public.get(original_front) or original_front not in baseline_public:
                issues.append(role+'/'+skin+': retained front path/bytes changed')
            if not isinstance(pair['back'],str) or not pair['back'].startswith('public/assets/v6.5.3/') or pair['back']==original_back:
                issues.append(role+'/'+skin+': explicit new native Nebula back required')
    return issues


def matrix(**axes):
    return [dict(zip(axes, row)) for row in itertools.product(*axes.values())]


def contract():
    # Cosmetics remains baseline-pinned. Parsing only literal IDs avoids executing source.
    catalog = re.findall(r"\{\s*id:\s*'([^']+)'", safe('src/cosmetics.ts').read_text())
    if len(catalog) != 64 or len(set(catalog)) != 64:
        raise ValueError('Expected unchanged 64-item catalog')
    fit = matrix(role=ROLES, skin=SKINS, itemSet=['+'.join(sorted(x)) for x in SETS])
    workflow = matrix(role=ROLES, itemId=ITEMS, profile=PROFILES)
    shop = matrix(role=ROLES, itemId=catalog, profile=PROFILES)
    lesson = matrix(profile=LESSON_PROFILES, stage=['0', '2', '2-back', '4', '5', '6', '7', '9'])
    cta = [dict(profile=f'{w}-light', world=t, state='start') for w in (390, 1440) for t in ('hero', 'mecha', 'racing', 'tank', 'creature')]
    cta += [dict(profile=f'{w}-dark', world='hero', state='start') for w in (390, 1440)]
    cta += [dict(profile='390-light', world='hero', state=s) for s in ('selected0', 'midLesson', 'allDone', 'missingtrusteddate')]
    groups = {}
    def add(name, domain, rows, checks, visual=False, compiled=True):
        groups[name] = dict(domain=domain, expected=rows, checks=checks, visual=visual, compiled=compiled)
    add('headwearFit', 'headwear', fit, ['sameBodySize', 'correctLayers', 'noMissingAssets'])
    add('headwearVisual', 'headwear', fit, ['accepted'], True)
    retained=matrix(role=ROLES,skin=SKINS,itemSet=['+'.join(sorted(['hair-nebula',x])) for x in RETAINED_EARWEAR])
    add('retainedEarwearHairFit','headwear',retained,['sameBodySize','correctLayers','noMissingAssets','frontPreserved'])
    add('retainedEarwearHairVisual','headwear',retained,['accepted'],True)
    add('headwearWorkflow', 'headwear', workflow, ['trial', 'cancel', 'equip', 'home', 'reload', 'achievements', 'ledger'])
    add('shopRegression', 'headwear', shop, ['correctItem', 'imageLoaded', 'noOverflow'])
    add('headwearNegative', 'headwear', matrix(control=['wrong-avatar', 'missing-layer', 'swapped-item', 'stale-candidate']), ['rejected'])
    add('lessonRuntime', 'lesson', lesson, ['healthy', 'interaction'])
    add('lessonVisual', 'lesson', lesson, ['accepted'], True)
    add('lessonFlow', 'lesson', matrix(case=['preparation-keyboard', 'speaking-four-children', 'mission-wrong-right', 'reward-idempotency', '360x560-badge', 'thumbnail-fallback']), ['passed'])
    add('siteCTA', 'site', cta, ['healthy', 'correctAction', 'ledgerUnchanged'])
    add('siteNavigation', 'site', matrix(profile=[f'{w}-{t}' for w in (390, 820, 1440) for t in ('light', 'dark')]), ['allRoutes', 'healthy'])
    add('companion', 'site', matrix(profile=PROFILES), ['crop', 'click', 'reducedMotion', 'equippedRobotRoom'])
    add('siteVisual', 'site', cta, ['accepted'], True)
    add('voiceBrowser', 'voice', matrix(case=['no-preload', 'lesson-slow-ended', 'rapid-replay', 'stage-cancel', 'route-cancel', '404-fallback', 'rejected-play-fallback', 'delayed-fallback', 'pagehide-cancel', 'settings-slow', 'settings-normal']), ['passed'])
    add('core', 'core', matrix(case=['date', 'auth', 'state', 'structural', 'online', 'shop_service', 'lessonpolicy']), ['passed'], compiled=False)
    return {'schemaVersion': 1, 'kind': 'little-explorers-feedback-release', 'groups': groups, 'allowedChanged': sorted(ALLOWED_CHANGED), 'allowedNew': sorted(ALLOWED_NEW), 'requiredLimitations': ['No physical mobile acceptance', 'No real family cloud writes', 'No all-clips human auditory acceptance', 'No commit or push'], 'anchors': {k:dict(path=v[0], sha256=v[1]) for k,v in ANCHORS.items()}}


class Gate:
    def __init__(self, phase='prebuild', output_ref=None):
        if phase not in ('prebuild','final-output'): raise ValueError('Unknown admission phase')
        self.phase,self.output_ref,self.index_ref=phase,output_ref,None
        self.errors, self.checks, self.cache = [], [], {}
        self.sources, self.public = {}, {}
        self.json_snapshots = {}
    def check(self, label, condition):
        self.checks.append({'check': label, 'pass': bool(condition)})
        if not condition:
            self.errors.append(label)
        return bool(condition)
    def attempt(self, label, fn):
        try:
            fn()
        except Exception as exc:
            self.check(label + ': ' + str(exc), False)
    def read(self, ref, as_json=True):
        if not isinstance(ref, dict) or set(ref) != {'path', 'sha256'}:
            raise ValueError('Expected exact {path, sha256} ref')
        key = (ref['path'], ref['sha256'])
        if key not in self.cache:
            data = safe(ref['path']).read_bytes()
            if not re.fullmatch('[0-9a-f]{64}', ref['sha256']) or digest(data) != ref['sha256']:
                raise ValueError('Hash mismatch: ' + ref['path'])
            self.cache[key] = data
        if not as_json:
            return self.cache[key]
        if key not in self.json_snapshots:
            # Only snapshots produced here from verified JSON bytes may be decoded.
            parsed = json.loads(self.cache[key])
            snapshot = marshal.dumps(parsed)
            # Preserve native JSON edge cases such as the decoder's NaN identity.
            self.json_snapshots[key] = snapshot if marshal.loads(snapshot) == parsed else None
        snapshot = self.json_snapshots[key]
        return json.loads(self.cache[key]) if snapshot is None else marshal.loads(snapshot)
    def assertion(self, assertion, expected=None):
        actual = pointer(self.read(assertion['ref']), assertion['pointer'])
        expected = assertion['equals'] if expected is None else expected
        return type(actual) is type(expected) and actual == expected
    def sources_and_public(self, index):
        baseline_all = self.read(dict(zip(('path', 'sha256'), ANCHORS['baselineSource'])))
        baseline = {p:h for p,h in baseline_all.items() if not p.startswith('scripts/')}
        self.read(dict(zip(('path','sha256'),ANCHORS['requirements'])))
        tool_paths = {'scripts/prebuild_v653.py', 'scripts/qa_v653_incremental_release.py', 'scripts/qa_v653_feedback_release.py'}
        tools = self.read(index['toolPins'])
        self.check('exact independent gate tool inventory', set(tools)==tool_paths and all(digest(safe(p).read_bytes())==h for p,h in tools.items()))
        self.check('old validator unchanged',tools.get('scripts/qa_v653_incremental_release.py')==baseline_all['scripts/qa_v653_incremental_release.py'])
        prebuild=safe('scripts/prebuild_v653.py').read_text()
        start=prebuild.index("        if pointer.get('kind') == 'little-explorers-feedback-release':\n")
        end=prebuild.index("        if pointer.get('schemaVersion') != 1 or pointer.get('kind') != 'little-explorers-incremental-release':\n",start)
        self.check('prebuild old branches byte preserved',digest((prebuild[:start]+prebuild[end:]).encode())==baseline_all['scripts/prebuild_v653.py'])
        old_public = self.read(dict(zip(('path', 'sha256'), ANCHORS['baselinePublic'])))
        protected = self.read(dict(zip(('path', 'sha256'), ANCHORS['protected15'])))
        old_artifacts = self.read(dict(zip(('path', 'sha256'), ANCHORS['baselineArtifacts'])))
        self.check('baseline public agrees with published artifacts', all(old_artifacts.get(p[7:]) == h for p,h in old_public.items()))
        self.sources = self.read(index['sourcePins'])
        self.public = self.read(index['publicPins'])
        live_sources, live_public = inventory()
        self.check('full exact source/api inventory', self.sources == live_sources)
        published,excluded,referenced=publication_scope(self.sources,live_public)
        self.check('manifest-closed public inventory',set(self.public)==published and all(live_public.get(p)==h for p,h in self.public.items()))
        recorded=self.read(index['unpublishedLocalFiles'])
        self.check('local unpublished files inventoried without deleting',all(recorded.get(p)==r for p,r in excluded.items()) and not (set(recorded)&published))
        self.check('excluded files not current literal runtime references',not (set(recorded)&referenced))
        for p,r in recorded.items():
            self.check('unpublished record '+p,r['status']=='UNPUBLISHED_LOCAL_FILE' and bool(r['reason']) and re.fullmatch('[0-9a-f]{64}',r['sha256']) is not None)
            if safe(p).is_file():
                self.check('unpublished local bytes '+p,digest(safe(p).read_bytes())==r['sha256'])
        self.check('all baseline sources retained', set(baseline) <= self.sources.keys())
        self.check('only approved source additions', set(self.sources)-set(baseline)-set(protected) <= ALLOWED_NEW)
        changed = {p for p,h in baseline.items() if self.sources.get(p) != h}
        self.check('only approved source changes', changed <= ALLOWED_CHANGED)
        avatar_before=self.read(index['baselineAvatarManifest'])
        self.check('baseline avatar manifest exact published bytes',index['baselineAvatarManifest']['sha256']==baseline['src/data/avatarAssetManifest.json'])
        avatar_after=json.loads(safe('src/data/avatarAssetManifest.json').read_bytes())
        self.check('unaffected avatar manifest sections unchanged',{k:v for k,v in avatar_before.items() if k!='accessories'}=={k:v for k,v in avatar_after.items() if k!='accessories'})
        old_items={r['id']:r for r in avatar_before['accessories']};new_items={r['id']:r for r in avatar_after['accessories']}
        self.check('avatar item identity preserved',old_items.keys()==new_items.keys() and len(new_items)==len(avatar_after['accessories']))
        self.check('only authorized headwear records changed',{p for p in old_items if old_items[p]!=new_items.get(p)}<=set(ITEMS+RETAINED_EARWEAR))
        for item in RETAINED_EARWEAR:
            issues=retained_pair_issues(old_items[item],new_items[item],old_public,self.public)
            self.check('retained earwear exact metadata/front '+item,not issues)
            self.errors.extend(item+': '+issue for issue in issues)
        self.check('headwear slots and roles preserved',all(new_items[p]['slot']==old_items[p]['slot'] and new_items[p]['supportedAvatars']==old_items[p]['supportedAvatars'] for p in ITEMS))
        self.check('protected15 unchanged', len(protected)==15 and all(self.sources.get(p)==h for p,h in protected.items()))
        self.check('published public bytes preserved', all(self.public.get(p)==h for p,h in old_public.items()))
        new = set(self.public)-set(old_public)
        self.check('new public scope', bool(new) and all(p.startswith(('public/assets/v6.5/audio/', 'public/assets/v6.5.3/')) for p in new))
        self.check('new public individually accounted', set(index['assetLineage']) == new)
        for p in sorted(new):
            self.attempt('asset lineage '+p, lambda p=p: self.lineage(p,index['assetLineage'][p]))
        # A changed source needs an actual reviewed diff, not just whitelist membership.
        reviews = index.get('sourceReviews', {})
        self.check('source diff reviews complete', set(reviews)==changed)
        for p in changed:
            self.attempt('source review '+p, lambda p=p: self.review(p, baseline[p], reviews[p]))
    def review(self, path, before, ref):
        r=self.read(ref)
        self.check('reviewed source '+path, r['path']==path and r['beforeSHA256']==before and r['afterSHA256']==self.sources[path] and r['decision']=='ACCEPT' and bool(r['reviewer']) and bool(r['reason']))
        diff=self.read(r['diff'],False)
        self.check('nonempty reviewed source diff '+path, bool(diff.strip()))
    def lineage(self, path, record):
        self.check('asset exact pin '+path, record['sha256']==self.public[path])
        self.read(record['native'],False)
        self.read(record['provenance'])
        if record['kind']=='support':
            self.check('support assets not headwear', path.startswith('public/assets/v6.5/audio/') and bool(record['reason']))
        else:
            self.check('runtime asset kind', record['kind'] in ('audio','headwear'))
            found=pointer(self.read(record['manifest']['ref']),record['manifest']['pointer'])
            self.check('runtime manifest lineage '+path, isinstance(found,str) and (found==path or found=='/'+path[7:] or found==Path(path).name))
            self.check('manifest is exact candidate source', self.sources.get(record['manifest']['ref']['path'])==record['manifest']['ref']['sha256'])
        for a in record.get('assertions',[]):
            self.check('asset provenance assertion '+path,self.assertion(a))
        self.check('asset native transform assertions '+path,bool(record.get('assertions')))
    def build(self,index):
        b=self.read(index['build'])
        self.check('candidate build status',b['status']=='PASS' and b['exitCode']==0)
        self.built_at=datetime.fromisoformat(b['completedAt'].replace('Z','+00:00'))
        self.check('build timestamp timezone',self.built_at.tzinfo is not None)
        self.check('build source binding',b['sourcePins']==index['sourcePins'] and b['publicPins']==index['publicPins'])
        self.read(b['log'],False)
        artifacts=self.read(b['artifactPins'])
        self.artifact_ref=b['artifactPins']
        self.generated_artifacts={p:h for p,h in artifacts.items() if 'public/'+p not in self.public}
        self.artifacts=artifacts
        # Stage may be ROOT in prebuild, otherwise an explicitly recorded isolated local stage.
        stage=Path(b['stageRoot']).resolve()
        allowed=Path.home()/'.codex/project-runtime'
        self.check('new isolated compiled stage',stage.is_relative_to(allowed) and 'r6-incremental' not in stage.name)
        if not stage.is_relative_to(allowed) or 'r6-incremental' in stage.name:
            raise ValueError('Disallowed compiled stage')
        for p,h in self.sources.items():
            self.check('stage source '+p,digest((stage/p).read_bytes())==h)
        for p,h in self.public.items():
            self.check('stage public '+p,digest((stage/p).read_bytes())==h)
        stage_public={str(p.relative_to(stage)):digest(p.read_bytes()) for p in (stage/'public').rglob('*') if p.is_file()}
        self.check('stage public exact admitted closure',stage_public==self.public)
        self.stage=stage
        for folder in ('dist',):
            actual={str(p.relative_to(stage/folder)):digest(p.read_bytes()) for p in (stage/folder).rglob('*') if p.is_file()}
            self.check('exact compiled '+folder,actual==artifacts and bool(actual))
        self.check('compiled public unchanged',all(artifacts.get(p[7:])==h for p,h in self.public.items()))
    def final_output(self,index):
        if not self.output_ref: raise ValueError('Final-output requires an independently SHA-pinned receipt')
        r=self.read(self.output_ref)
        self.check('output receipt schema/kind',r['schemaVersion']==1 and r['kind']=='little-explorers-vercel-output')
        self.check('output binds same prebuild index',r['index']==self.index_ref)
        self.check('output binds source/public/static',r['sourcePins']==index['sourcePins'] and r['publicPins']==index['publicPins'] and r['artifactPins']==self.artifact_ref)
        self.check('output stage and target',Path(r['stageRoot']).resolve()==self.stage and r['target']=='production')
        builder=r['builder'];log=self.read(builder['log'],False).decode('utf-8')
        package=self.read(builder['cliPackage'])
        self.check('Vercel builder success',builder['exitCode']==0 and 'build' in builder['command'] and '--prod' in builder['command'] and 'deploy' not in builder['command'] and package['name']=='vercel' and package['version']==builder['cliVersion'])
        self.check('Vercel real lifecycle log','Vercel CLI '+builder['cliVersion'] in log and 'prebuild' in log and 'scripts/prebuild_v653.py' in log and 'vite build' in log and ('Build completed successfully' in log or 'Build Completed' in log))
        self.check('output after reviewed candidate',datetime.fromisoformat(builder['startedAt'].replace('Z','+00:00'))>=self.built_at and datetime.fromisoformat(builder['completedAt'].replace('Z','+00:00'))>=datetime.fromisoformat(builder['startedAt'].replace('Z','+00:00')))
        output=self.stage/'.vercel/output'
        static={str(p.relative_to(output/'static')):digest(p.read_bytes()) for p in (output/'static').rglob('*') if p.is_file()}
        self.check('final Vercel static exact tested artifact',static==self.artifacts and bool(static))
        config_path=output/'config.json';config_data=config_path.read_bytes()
        self.check('final output config exact receipt',digest(config_data)==r['configSHA256'])
        self.check('published routing/config unchanged',json.loads(config_data)==self.read(dict(zip(('path','sha256'),ANCHORS['baselineVercelConfig']))))
        pins=self.read(r['functionPins'])
        self.check_functions(output,pins,r['functionBindings'])
    def check_functions(self,output,pins,bindings):
        functions=output/'functions'
        folders={str(p.relative_to(functions)) for p in functions.rglob('*.func') if p.is_dir()}
        expected={'api/'+name+'.func' for name in FUNCTIONS}
        self.check('exact six Vercel functions',folders==expected and set(bindings)==expected)
        actual={str(p.relative_to(functions)):digest(p.read_bytes()) for p in functions.rglob('*') if p.is_file()}
        self.check('all function bytes exact pinned receipt',actual==pins and bool(actual))
        for name in FUNCTIONS:
            key='api/'+name+'.func';folder=functions/key;binding=bindings[key]
            config_bytes=(folder/'.vc-config.json').read_bytes();config=json.loads(config_bytes)
            handler='api/'+name+'.js';source='api/'+name+'.ts'
            self.check('function handler/config '+name,config['handler']==handler and config['runtime']=='nodejs24.x' and config.get('launcherType')=='Nodejs' and digest(config_bytes)==binding['configSHA256'])
            self.check('function protected source binding '+name,binding['sourcePath']==source and binding['sourceSHA256']==self.sources[source] and binding['handler']==handler and digest((folder/handler).read_bytes())==binding['handlerSHA256'])
            maps=list((folder/'api').glob('*.js.map'))
            self.check('handler source map exists '+name,(folder/(handler+'.map')) in maps)
            for path in maps:
                sm=json.loads(path.read_bytes());sources=sm.get('sources',[]);contents=sm.get('sourcesContent',[])
                self.check('source map complete '+key+'/'+path.name,bool(sources) and len(sources)==len(contents))
                for src,content in zip(sources,contents):
                    source_path='api/'+Path(src).name
                    self.check('emitted API matches protected source '+key+'/'+source_path,source_path in self.sources and isinstance(content,str) and digest(content.encode())==self.sources.get(source_path))

    def evidence(self,name,refs,spec):
        seen=set()
        for ref in refs:
            report=self.read(ref)
            self.check(name+' report fresh',report['mode']=='fresh' and report['status']=='PASS' and report['group']==name)
            deps=self.read(report['sourcePins'])
            domain=spec['domain']
            required=set(DEPS.get(domain,[]))
            if domain=='core':
                required=set(self.read(dict(zip(('path','sha256'),ANCHORS['protected15']))))
            self.check(name+' minimum dependencies',required<=deps.keys())
            self.check(name+' exact tested dependencies',bool(deps) and all(self.sources.get(p)==h for p,h in deps.items()))
            self.read(report['runner'],False)
            self.check(name+' timestamp',datetime.fromisoformat(report['observedAt'].replace('Z','+00:00')).tzinfo is not None)
            if spec['compiled']:
                self.check(name+' same compiled artifact',report['artifactPins']==self.artifact_ref)
                self.check(name+' observed after compilation',datetime.fromisoformat(report['observedAt'].replace('Z','+00:00'))>=self.built_at)
                self.read(report['artifactPins'])
                served=self.read(report['servedArtifacts'])
                self.check(name+' actual served compiled bytes', all(served['files'].get(p)==h for p,h in self.generated_artifacts.items()) and bool(served['baseURL']) and served['status']=='PASS')
            if spec['visual']:
                self.check(name+' independent reviewer',bool(report['reviewer']) and report['reviewer']!=report['runtimeOperator'])
            for row in report['cases']:
                values=row['values']
                key=json.dumps(values,sort_keys=True)
                self.check(name+' unique observation '+key,key not in seen)
                seen.add(key)
                rawref=row['raw']
                self.check(name+' raw separate from adapter',rawref['path']!=ref['path'])
                raw=self.read(rawref)
                self.check(name+' dimensions are raw-bound',set(row['bindings'])==set(values))
                for dim,val in values.items():
                    self.check(name+' raw identity '+key+' '+dim,bound_value(raw,row['bindings'][dim])==val)
                self.check(name+' check coverage '+key,set(row['checks'])==set(spec['checks']))
                for check in spec['checks']:
                    a=row['checks'][check]
                    self.check(name+' asserted '+check+' '+key, a['equals'] is True and self.assertion(a))
                if spec['visual']:
                    self.check(name+' image required '+key,bool(row['images']))
                    for image in row['images']:
                        self.check(name+' image bytes '+key,len(self.read(image,False))>100)
                    self.check(name+' reviewed image hash coverage '+key,{a['equals'] for a in row['imageAssertions']}=={i['sha256'] for i in row['images']})
                    for a in row['imageAssertions']:
                        self.check(name+' actual reviewed image hash '+key,self.assertion(a))
                    self.check(name+' meaningful review '+key,bool(row['reviewNotes']))
        expected={json.dumps(r,sort_keys=True) for r in spec['expected']}
        self.check(name+' exact raw coverage',seen==expected)
    def audio(self,index):
        a=index['audio']
        manifest=json.loads(safe('src/data/lessonSpeechManifest.json').read_bytes())
        rendered=self.read(a['renderedCorpus'])
        corpus=self.read(a['corpus'])
        self.check('corpus curriculum source binding',corpus['curriculumSha256']==self.sources['src/data/curriculum.ts'] and corpus['formatterSha256']==self.sources['src/lessonInstructionText.ts'] and corpus['days']==90 and corpus['blocks']==180)
        entries={r['text']:r for r in corpus['entries']}
        decoded=self.read(a['decoded'])
        self.check('decoded corpus complete',decoded['status']=='PASS' and decoded['files']==514 and len(decoded['checks'])==514 and decoded['sentenceUses']==180 and decoded['vocabularyUses']==721)
        decoded_by_file={r['file']:r for r in decoded['checks']}
        http=self.read(a['http'])
        self.check('514 HTTP rows',len(http['results'])==514)
        by_file={r['file']:r for r in http['results']}
        expected={(text,mode,file) for text,modes in manifest['clips'].items() for mode,file in modes.items()}
        self.check('257 unique phrases / 514 audio keys',len(manifest['clips'])==257 and len(expected)==514)
        self.check('rendered corpus exact text/mode/file', {(r['text'],r['mode'],r['file']) for r in rendered}==expected and len(rendered)==514)
        for r in rendered:
            f='public/assets/v6.5/audio/'+r['file']
            self.check('speech use identities '+r['file'],r['uses']==entries[r['text']]['uses'])
            dec=decoded_by_file[r['file']]
            self.check('decoded real audio '+r['file'],abs(dec['decodedSeconds']-r['seconds'])<.2 and 0<dec['decodedPeak']<1 and dec['decodedRms']>0)
            self.check('speech text/native '+r['file'],r['text']==r['renderedText'] and digest(r['text'].encode())==r['textSha256'] and r['voice']=='af_heart' and r['synthesisSpeed']==({'slow':.9,'standard':1.0}[r['mode']]) and bool(r['phonemes']) and bool(r['uses']) and r['seconds']>0 and r['peak']<1 and r['rms']>0)
            self.check('speech exact audio '+r['file'],self.public.get(f)==r['audioSha256'])
            self.read({'path':r['wav'],'sha256':r['wavSha256']},False)
            h=by_file[r['file']]
            self.check('HTTP/MIME/hash '+r['file'],h['status']==200 and h['mime']=='audio/mp4' and h['sha256']==r['audioSha256'])
        selected=self.read(a['selectedSample'])['after']
        self.check('exact human-selected source retained',selected['text']=='I can take three steps.' and selected['mode']=='slow' and selected['wavSha256']=='c9941183a59873a499b3ded2f99c323652aef80db92f82a4d99725447eebc9fa' and manifest['clips'][selected['text']]['slow']==selected['file'] and selected in rendered)
        self.read({'path':selected['wav'],'sha256':selected['wavSha256']},False)
        self.check('auditory boundary',a['humanAuditoryAcceptance']=='selected-slow-sample-only')
    def performance(self,index):
        p=index['performance']; raw=self.read(p['lighthouse'])
        self.check('performance same artifact',p['artifactPins']==self.artifact_ref)
        dt=datetime.fromisoformat(raw['fetchTime'].replace('Z','+00:00'))
        age=(datetime.now(timezone.utc)-dt).total_seconds()
        self.check('performance age <=6 hours',0<=age<=21600 and dt>=self.built_at)
        self.check('desktop Lighthouse',raw['configSettings']['formFactor']=='desktop')
        self.check('performance >=90',raw['categories']['performance']['score']>=.9)
        for key,limit in [('largest-contentful-paint',2500),('cumulative-layout-shift',.1),('total-blocking-time',200)]:
            self.check(key,raw['audits'][key]['numericValue']<limit)
    def run(self,index):
        self.check('index version/kind',index.get('schemaVersion')==1 and index.get('kind')=='little-explorers-feedback-release')
        self.attempt('sources/public',lambda:self.sources_and_public(index))
        self.attempt('compiled candidate',lambda:self.build(index))
        c=contract()
        self.check('required evidence group set',set(index.get('evidence',{}))==set(c['groups']))
        for name,spec in c['groups'].items():
            self.attempt('evidence '+name,lambda name=name,spec=spec:self.evidence(name,index['evidence'][name],spec))
        self.attempt('audio',lambda:self.audio(index))
        self.attempt('performance',lambda:self.performance(index))
        if self.phase=='final-output':
            self.attempt('Vercel final output',lambda:self.final_output(index))
        self.attempt('strict TypeScript',lambda:self.check('strict TypeScript current sources',self.assertion(index['strict']['assertion'],True) and self.read(index['strict']['sourcePins'])==self.sources and bool(self.read(index['strict']['runner'],False))))
        self.check('limitations retained',set(c['requiredLimitations'])<=set(index.get('limitations',[])))
        for carry in index.get('carry',[]):
            self.attempt('carry',lambda carry=carry:self.carry(carry))
        return {'status':'FAIL_FEEDBACK_NOT_READY' if self.errors else ('PASS_PREBUILD_NOT_DEPLOYABLE' if self.phase=='prebuild' else 'PASS_FINAL_OUTPUT_CHECKS_CONTROLS_PENDING'),'phase':self.phase,'deployable':False,'errors':self.errors,'checks':self.checks,'limitations':c['requiredLimitations'],'scope':'Read-only same-candidate gate; no deployment, real-account or exhaustive auditory acceptance.'}
    def carry(self,record):
        self.check('carry explicitly not fresh',record['mode']=='byte-dependency-carry-not-fresh' and bool(record['scope']))
        self.read(record['report'])
        deps=self.read(record['sourcePins'])
        self.check('carry dependencies unchanged',bool(deps) and all(self.sources.get(p)==h for p,h in deps.items()))


def validate(index_path, expected_sha=None, phase='prebuild', output_ref=None):
    g=Gate(phase,output_ref)
    try:
        ref=link(index_path)
        if expected_sha and ref['sha256']!=expected_sha:
            raise ValueError('Expected index hash mismatch')
        g.index_ref=ref
        result=g.run(g.read(ref))
    except Exception as exc:
        g.check('Invalid gate input: '+str(exc),False)
        result={'status':'FAIL_FEEDBACK_NOT_READY','phase':phase,'deployable':False,'errors':g.errors,'checks':g.checks}
    result['indexPath']=index_path
    result['indexSHA256']=digest(safe(index_path).read_bytes()) if safe(index_path).is_file() else None
    return result


def write_new(path,obj):
    p=safe(path)
    if not str(p.relative_to(ROOT)).startswith(BASE+'gate-'):
        raise ValueError('Output must be a new release/gate-* path')
    p.parent.mkdir(parents=True,exist_ok=True)
    with p.open('x') as f:
        json.dump(obj,f,ensure_ascii=False,indent=2)
        f.write('\n')


def negatives(index_path,out,expected_sha=None,phase='prebuild',output_ref=None):
    baseline=validate(index_path,expected_sha,phase,output_ref)
    if baseline['errors']:
        return {'status':'FAIL_CONTROLS_BASELINE_NOT_ADMITTED','baselineErrors':baseline['errors'],'controls':[]}
    baseline_path=str(Path(out).with_suffix(''))+'-baseline-result.json'
    write_new(baseline_path,baseline)
    original=json.loads(safe(index_path).read_bytes())
    controls=[]
    sequence=[0]
    def persist(obj,label):
        sequence[0]+=1
        path=str(Path(out).with_suffix(''))+f'-data-{sequence[0]}-{label}.json'
        write_new(path,obj)
        return link(path)
    def mutate_report(index,group,change):
        r=json.loads(safe(index['evidence'][group][0]['path']).read_bytes())
        change(r)
        index['evidence'][group][0]=persist(r,group)
    def stale_dependencies(index):
        def change(r):
            pins=json.loads(safe(r['sourcePins']['path']).read_bytes())
            pins[next(iter(pins))]='0'*64
            r['sourcePins']=persist(pins,'stale-source-pins')
        mutate_report(index,'voiceBrowser',change)
    def old_artifact(index):
        build=json.loads(safe(index['build']['path']).read_bytes())
        build['artifactPins']=dict(zip(('path','sha256'),ANCHORS['baselineArtifacts']))
        index['build']=persist(build,'old-build-artifacts')
    mutations={
        'missing-headwear':lambda x:x['evidence'].pop('headwearFit'),
        'missing-retained-earwear-fit':lambda x:x['evidence'].pop('retainedEarwearHairFit'),
        'missing-retained-earwear-visual':lambda x:x['evidence'].pop('retainedEarwearHairVisual'),
        'source-pin-tamper':lambda x:x['sourcePins'].update(sha256='0'*64),
        'old-compiled-artifacts':old_artifact,
        'missing-raw':lambda x:mutate_report(x,'headwearFit',lambda r:r['cases'][0]['raw'].update(path=BASE+'gate-NONEXISTENT.json')),
        'stale-tested-dependencies':stale_dependencies,
        'wrong-avatar':lambda x:mutate_report(x,'headwearFit',lambda r:r['cases'][0]['values'].update(role='wrong-avatar')),
        'missing-layer-check':lambda x:mutate_report(x,'headwearFit',lambda r:r['cases'][0]['checks'].pop('correctLayers')),
        'swapped-item':lambda x:mutate_report(x,'headwearFit',lambda r:r['cases'][0]['values'].update(itemSet='swapped-item')),
        'false-pass-assertion':lambda x:mutate_report(x,'headwearFit',lambda r:r['cases'][0]['checks']['correctLayers'].update(equals=False)),
        'missing-native-lineage':lambda x:x['assetLineage'].pop(next(iter(x['assetLineage']))),
        'swapped-audio-corpus':lambda x:x['audio'].update(renderedCorpus=x['audio']['http']),
        'missing-visual':lambda x:x['evidence'].pop('headwearVisual'),
        'missing-limitations':lambda x:x.update(limitations=[]),
    }
    for name,mutate in mutations.items():
        candidate=copy.deepcopy(original);mutate(candidate)
        path=str(Path(out).with_suffix(''))+'-'+name+'-index.json'
        write_new(path,candidate)
        result=validate(path)
        write_new(str(Path(out).with_suffix(''))+'-'+name+'-result.json',result)
        controls.append({'name':name,'index':link(path),'rejected':bool(result['errors']),'errors':result['errors']})
    if phase=='final-output':
        output_original=json.loads(safe(output_ref['path']).read_bytes())
        def empty_function_pins(r):r['functionPins']=persist({},'empty-function-pins')
        output_mutations={
            'output-wrong-index':lambda r:r['index'].update(sha256='0'*64),
            'output-stale-config':lambda r:r.update(configSHA256='0'*64),
            'output-missing-function-inventory':empty_function_pins,
            'output-swapped-handler':lambda r:r['functionBindings']['api/state.func'].update(handler='api/time.js'),
            'output-wrong-api-source':lambda r:r['functionBindings']['api/state.func'].update(sourceSHA256='0'*64),
            'output-builder-failed':lambda r:r['builder'].update(exitCode=1),
            'output-stale-cli':lambda r:r['builder'].update(cliVersion='0.0.0'),
            'output-wrong-stage':lambda r:r.update(stageRoot=str(ROOT)),
        }
        for name,mutate in output_mutations.items():
            candidate=copy.deepcopy(output_original);mutate(candidate)
            candidate_ref=persist(candidate,name)
            result=validate(index_path,expected_sha,'final-output',candidate_ref)
            write_new(str(Path(out).with_suffix(''))+'-'+name+'-result.json',result)
            controls.append({'name':name,'receipt':candidate_ref,'rejected':bool(result['errors']),'errors':result['errors']})
        missing=validate(index_path,expected_sha,'final-output',None)
        write_new(str(Path(out).with_suffix(''))+'-output-absent-receipt-result.json',missing)
        controls.append({'name':'output-absent-receipt','rejected':bool(missing['errors']),'errors':missing['errors']})
    passed=all(x['rejected'] for x in controls)
    status=('PASS_PREBUILD_NOT_DEPLOYABLE' if phase=='prebuild' else 'PASS_FINAL_OUTPUT_ADMISSION_NOT_DEPLOYED') if passed else 'FAIL_CONTROLS'
    return {'status':status,'phase':phase,'deployable':passed and phase=='final-output','baseline':link(index_path),'baselineResult':link(baseline_path),'outputReceipt':output_ref,'controls':controls,'boundary':'Index/receipt mutations are separate from actual renderer rejection observations. Prebuild can never authorize deployment.'}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--phase',choices=['prebuild','final-output'],default='prebuild')
    parser.add_argument('--vercel-output-receipt');parser.add_argument('--expected-output-sha')
    parser.add_argument('--index');parser.add_argument('--expected-index-sha');parser.add_argument('--out',required=True)
    parser.add_argument('--contract',action='store_true');parser.add_argument('--inventory',action='store_true');parser.add_argument('--negative-controls',action='store_true')
    args=parser.parse_args()
    output_ref=None
    if args.vercel_output_receipt or args.expected_output_sha:
        if not (args.vercel_output_receipt and args.expected_output_sha):parser.error('Output receipt and expected SHA must be paired')
        output_ref={'path':args.vercel_output_receipt,'sha256':args.expected_output_sha}
    if args.contract: result=contract()
    elif args.inventory:
        sources,public=inventory();published,excluded,referenced=publication_scope(sources,public);result={'status':'INVENTORY_NOT_ADMISSION','sourcePins':sources,'publicPins':{p:public.get(p) for p in sorted(published)},'unpublishedLocalFiles':excluded,'missingPublic':sorted(published-set(public)),'excludedRuntimeReferences':sorted(set(excluded)&referenced),'toolPins':{p:digest(safe(p).read_bytes()) for p in ('scripts/prebuild_v653.py','scripts/qa_v653_incremental_release.py','scripts/qa_v653_feedback_release.py')}}
    elif args.negative_controls:
        if not args.index: parser.error('--index required')
        result=negatives(args.index,args.out,args.expected_index_sha,args.phase,output_ref)
    else:
        if not args.index: parser.error('--index required')
        result=validate(args.index,args.expected_index_sha,args.phase,output_ref)
    write_new(args.out,result)
    print(json.dumps({'status':result.get('status','CONTRACT_NOT_ADMISSION'),'out':args.out,'errors':len(result.get('errors',[]))}))
    return 1 if result.get('status','').startswith('FAIL') else 0


if __name__=='__main__':
    sys.exit(main())
