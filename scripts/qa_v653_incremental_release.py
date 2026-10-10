#!/usr/bin/env python3
"""Read-only incremental admission. Does not replace or relabel historical gates.

Index JSON is externally SHA-pinned. See incremental-release/ready-requirements.json.
No browser, network, source writes, imports from mutable old QA, or command execution.
"""
from __future__ import annotations
import argparse
import copy
import difflib
import hashlib
import io
import json
from pathlib import Path
import re
import signal
import sys
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OWN = 'qa/v653/20261006/full-goal-audit/incremental-release'
STAGE = Path('/Users/yuzikui/.codex/project-runtime/little-explorers-v653-release-20261006-r1')
SELF = 'scripts/qa_v653_incremental_release.py'
PREBUILD = 'scripts/prebuild_v653.py'
APP = 'src/App.tsx'
RENDERER = 'src/components/AvatarRenderer.tsx'
CURRICULUM = 'src/data/curriculum.ts'
LESSON_CSS = 'src/styles/components/lesson.css'
HOOK = 'src/useAvatarDetailReadiness.ts'
R6_PINS_SHA = '391ca3525f14fbd2a9d2da95c7fad98934058b396a851ba321660ea20f0db3ea'
R5_PINS_SHA = '6ddcf0cc37bd77879f60c2b28d02fb2fbde7fc623ea67604775dc59e855a37e2'
HOOK_BEFORE = '85505e776025c727fe86ec813723fb2e9ae8ac889141fe3bd827d75e11ef8bda'
HOOK_AFTER = 'fba8bb898805a8bca8ab25f0d01c5c2747bb7eeea28c1af8d47e5439ef91d4e7'
RENDERER_DEPTH = 'b5e338b9e077cc63159de873f29dfe66d179fef5224131132869eb80476adcab'
RENDERER_AFTER = '5a14fd21a264ad9fc5bf1740290bcb5f5b2f91cdd7b8ae486c378294933bdd8e'
HOOK_PATCH = 'a8401eeac374ac6b88c2ec25b7848e94aff1a7cd6c0b58d88d1a72154e6b8e34'
RENDERER_RETRY_PATCH = '830b4be2f736ed891e04588f3baa7d0c2f2d322a136636a4f006bf96979ae812'
R5_FAIL_REPORT_SHA = '4fc1955500c3292654462328064e75d74fbb901ffcf71a2313e451cdceadb0ad'
READINESS_CONTROLS = {'normal','oneShotRecover','permanentReject','missing404','wrongDimensions','cancelSafe','switchSafe','mountedOneShotRecover','underMaskOneShotRecover'}
ALLOWED = {APP, RENDERER, CURRICULUM, LESSON_CSS, PREBUILD, HOOK}
ANCHORS = {
 'release': ('qa/v653/20261005/release-art/final/release-completion.json', '6d4a011b27890b0a38f0c9379497ae95265ed60e3ad7fa6ad3fe69a04bfe137f'),
 'source106': ('qa/v653/20261005/release-art/final/source-pins.json', '156bf02b0153d96bbf7feadd8b1ca2e982394acb0f8ef136e901a58f4beb6c8d'),
 'protected7': ('qa/v653/20261005/release-art/final/protected-core-build-pins.json', 'e687e50fe265b2bee510e81ba40c4b9736728907bdf844d17c2298a4265ef5dd'),
 'oldIndex': ('qa/v653/20261005/release-art/final/evidence-index.json', 'a23dcf0f1c9dbfacbd6d3c19b907f467e44beef66175864e0a8843d346e5f9aa'),
 'artifact': ('qa/v653/20261005/build/final-artifact-binding-r1/final-artifact-pins.json', '9cd430b964e02f8ed66333f140e1d2ac5464a2801b8a1a2c7efd7862aee3d44c'),
 'stageInputs': (str(STAGE/'stage-inputs.json'), '5a03cb171fbf5bf86b74a2f32d36be3633ae600d3ad9545a555ed8d40c6950f0'),
}
GROUPS = {'worldR1', 'depthR1', 'hairHatR3', 'rewardR4', 'targeted77R6', 'authored180', 'guidance3', 'negative', 'readinessRecoveryR6'}
CARRY_ALLOWED = {
 'worldR1': {CURRICULUM, LESSON_CSS, PREBUILD, SELF, HOOK, RENDERER},
 'depthR1': {CURRICULUM, LESSON_CSS, PREBUILD, SELF, HOOK, RENDERER},
 'hairHatR3': {CURRICULUM, LESSON_CSS, PREBUILD, SELF, HOOK, RENDERER},
 'rewardR4': {CURRICULUM, PREBUILD, SELF, HOOK, RENDERER},
 'targeted77R6': {PREBUILD, SELF},
 'authored180': {CURRICULUM, LESSON_CSS, PREBUILD, SELF, HOOK, RENDERER},
 'guidance3': {PREBUILD, SELF, HOOK, RENDERER},
 'negative': {PREBUILD, SELF},
 'readinessRecoveryR6': {PREBUILD, SELF},
}
# Minimum original case counts; derived figures and broad scope need explicit raw assertions.
MIN_CASES = {'worldR1':4, 'depthR1':28, 'hairHatR3':445, 'rewardR4':8,
             'targeted77R6':77, 'authored180':180, 'guidance3':3, 'negative':3, 'readinessRecoveryR6':9}
MIN_SCREENS = {'worldR1':8, 'depthR1':28, 'hairHatR3':445, 'rewardR4':24, 'targeted77R6':77, 'readinessRecoveryR6':2}
HEX = re.compile(r'^[0-9a-f]{64}$')


def digest(raw): return hashlib.sha256(raw).hexdigest()

def safe(path, external=False):
    p = (ROOT / path).resolve()
    if not p.is_relative_to(ROOT) and not (external and p.is_relative_to(STAGE)):
        raise ValueError(f'PATH_OUTSIDE_APPROVED_ROOT: {path}')
    return p

def read(path, external=False):
    p = safe(path, external)
    def expired(*_): raise TimeoutError(f'FILE_READ_TIMEOUT: {p}')
    old = signal.signal(signal.SIGALRM, expired)
    signal.alarm(8)
    try: return p.read_bytes()
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old)

def sha(path, external=False): return digest(read(path, external))

def pointer(node, path):
    if path == '': return node
    if not isinstance(path,str) or not path.startswith('/'): raise ValueError('Invalid JSON pointer')
    for part in path[1:].split('/'):
        part = part.replace('~1','/').replace('~0','~')
        node = node[int(part)] if isinstance(node,list) else node[part]
    return node

def deltas(before, after):
    return {k:{'before':before.get(k),'after':after.get(k)} for k in sorted(set(before)|set(after)) if before.get(k)!=after.get(k)}

def contains(node, value):
    if node == value: return True
    if isinstance(node,dict): return any(contains(v,value) for v in node.values())
    if isinstance(node,list): return any(contains(v,value) for v in node)
    return False

def nodes(node):
    yield node
    if isinstance(node,dict):
        for v in node.values(): yield from nodes(v)
    elif isinstance(node,list):
        for v in node: yield from nodes(v)

def passed(value):
    return isinstance(value,str) and value.startswith(('PASS','ACCEPTED','COMPLETE_SCOPED')) and not re.search(r'(^|_)(FAIL|FAILED|REJECTED|PENDING|AWAITING|PARTIAL)($|_)',value)


class Gate:
    def __init__(self): self.failures=[]; self.verified=[]; self.facts={}; self.input_index=None
    def need(self, condition, message):
        if not condition: self.failures.append(message)
        return bool(condition)
    def link(self, ref, label, external=False, json_data=True):
        try:
            if not isinstance(ref,dict) or not isinstance(ref.get('path'),str) or not HEX.fullmatch(ref.get('sha256','')):
                raise ValueError('requires path and lowercase SHA-256')
            raw=read(ref['path'],external)
            if digest(raw)!=ref['sha256']: raise ValueError('SHA_MISMATCH')
            self.verified.append(ref)
            return json.loads(raw) if json_data else raw
        except (OSError,ValueError,TypeError,KeyError,TimeoutError) as e:
            self.failures.append(f'{label}: {e}')
            return None
    def anchor(self, name, ref):
        path, expected=ANCHORS[name]
        # stage inputs may be copied verbatim into a future build stage, never rehashed as baseline.
        self.need(ref.get('sha256')==expected,f'ANCHOR_SHA:{name}')
        if name!='stageInputs': self.need(safe(ref.get('path',''))==safe(path),f'ANCHOR_PATH:{name}')
        return self.link(ref,name,external=name=='stageInputs')
    def check_map(self, pins, label):
        self.need(isinstance(pins,dict) and bool(pins),f'{label}:PIN_MAP_MISSING')
        for p,h in (pins or {}).items():
            try: self.need(HEX.fullmatch(h) and sha(p)==h,f'{label}:CURRENT_SHA:{p}')
            except (OSError,ValueError,TypeError,TimeoutError) as e:self.failures.append(f'{label}:{p}:{e}')
    def assertions(self, doc, checks, label):
        self.need(isinstance(checks,list) and bool(checks),f'{label}:NO_RAW_ASSERTIONS')
        for c in checks or []:
            try:self.need(pointer(doc,c['pointer'])==c['equals'],f'{label}:ASSERT:{c["pointer"]}')
            except (KeyError,TypeError,ValueError,IndexError):self.failures.append(f'{label}:BAD_ASSERTION:{c}')
    def public_set_policy(self, actual, expected):
        self.need(set(actual)==set(expected),'NEW_OR_MISSING_PUBLIC_ASSET')
    def source_policy(self, baseline, current):
        self.need(len(baseline)==106,'BASELINE_NOT_106')
        self.need(set(current)==set(baseline)|{SELF} and len(current)==107,'CURRENT_NOT_EXACT_107_SET')
        diff=deltas(baseline,current)
        self.need(set(diff)==ALLOWED|{SELF},'UNAUTHORIZED_OR_MISSING_SOURCE_CHANGE')
        return diff
    def carry_policy(self, name, capture, current, carry):
        diff=deltas(capture,current)
        self.need(carry.get('differences')==diff,f'{name}:CARRY_DIFF_NOT_EXACT')
        self.need(set(diff)<=CARRY_ALLOWED[name],f'{name}:SUBSYSTEM_SOURCE_DRIFT')
        self.need(carry.get('mode')=='CONTROLLED_DEPENDENCY_CARRY_NOT_FRESH_FINAL',f'{name}:CARRY_SCOPE')
        reasons=carry.get('reasonByPath',{})
        self.need(set(reasons)==set(diff) and all(isinstance(v,str) and len(v)>=12 for v in reasons.values()),f'{name}:MISSING_DEPENDENCY_RATIONALE')
        dependencies=carry.get('testedDependencies',[])
        self.need(bool(dependencies) and all(p in capture and p in current and capture[p]==current[p] for p in dependencies),f'{name}:TESTED_DEPENDENCY_CHANGED')
        controlled=carry.get('controlledDependencies',{})
        self.need(set(diff)&{HOOK,RENDERER}<=set(controlled),f'{name}:READINESS_CARRY_CONTRACT_MISSING')
        for p,binding in controlled.items():
            self.need(p in {HOOK,RENDERER} and p in diff and binding=={'before':capture.get(p),'after':current.get(p),'contract':'readinessPatchContract'},f'{name}:INVALID_CONTROLLED_DEPENDENCY')
            if p==HOOK:self.need(capture[p] in {HOOK_BEFORE,'d8ee5a3e9021f958c355dd2100a2d5410c757b84317dcbc1745ba35e695fc736'} and current[p]==HOOK_AFTER,f'{name}:HOOK_CARRY_NOT_EXACT')
            if p==RENDERER:self.need(capture[p]==RENDERER_DEPTH and current[p]==RENDERER_AFTER,f'{name}:RENDERER_CARRY_NOT_EXACT')
        mandatory={HOOK,RENDERER} if name in {'targeted77R6','readinessRecoveryR6','negative'} else ({APP} if name=='worldR1' else ({RENDERER} if name in {'depthR1','hairHatR3','targeted77R6','negative'} else ({LESSON_CSS} if name=='rewardR4' else set())))
        self.need(mandatory<=(set(dependencies)|set(controlled)),f'{name}:MANDATORY_DEPENDENCY_MISSING')
    def evidence_group(self,name,g,current,baseline):
        self.need(g.get('status')=='ACCEPTED_SCOPED_EVIDENCE',f'{name}:NOT_ACCEPTED')
        capture=self.link(g.get('captureSourcePins'),f'{name}:capture')
        if not isinstance(capture,dict):return
        self.need(set(capture)==set(baseline) and len(capture)==106,f'{name}:CAPTURE_NOT_ORIGINAL_106_SET')
        self.carry_policy(name,capture,current,g.get('carry',{}))
        if name in {'targeted77R6','readinessRecoveryR6','negative'}:
            self.need(g['captureSourcePins']['sha256']==R6_PINS_SHA,f'{name}:REQUIRES_FRESH_R6_CAPTURE')
            self.need(capture.get(HOOK)==HOOK_AFTER,f'{name}:REQUIRES_R6_HOOK')
        docs=[]
        for i,item in enumerate(g.get('rawReports',[])):
            doc=self.link(item.get('ref'),f'{name}:raw:{i}')
            if doc is None:continue
            docs.append(doc);self.assertions(doc,item.get('assertions'),f'{name}:raw:{i}')
        self.need(bool(docs),f'{name}:MISSING_RAW_REPORT')
        self.need(any(contains(d,g['captureSourcePins']['sha256']) or contains(d,capture) for d in docs),f'{name}:RAW_CAPTURE_BINDING_MISSING')
        # Canonical count is backed by an exact raw JSON pointer, not an index-only number.
        fact=g.get('caseCountEvidence',{})
        try:
            count=pointer(docs[fact['reportIndex']],fact['pointer'])
            if fact.get('operation')=='length':count=len(count)
            self.need(type(count)==int and count==g.get('caseCount') and count>=MIN_CASES[name],f'{name}:CASE_COUNT')
        except (KeyError,TypeError,ValueError,IndexError):self.failures.append(f'{name}:CASE_COUNT_EVIDENCE_MISSING')
        runtime=g.get('runtime',{})
        try:
            status=pointer(docs[runtime['reportIndex']],runtime['statusPointer'])
            # Functional-only result is accepted only alongside independently linked visual evidence below.
            self.need(passed(status),f'{name}:FAILED_RUNTIME')
        except (KeyError,TypeError,ValueError,IndexError):self.failures.append(f'{name}:RUNTIME_STATUS_MISSING')
        visual=g.get('visual')
        if name not in {'authored180','guidance3','negative'}:
            if not self.need(bool(visual),f'{name}:MISSING_VISUAL'):return
            vd=self.link(visual.get('ref'),f'{name}:visual')
            try:self.need(passed(pointer(vd,visual['statusPointer'])),f'{name}:VISUAL_NOT_ACCEPTED')
            except (KeyError,TypeError,ValueError,IndexError):self.failures.append(f'{name}:VISUAL_STATUS_MISSING')
            self.assertions(vd,visual.get('assertions'),f'{name}:visual')
            screens=g.get('screenshots',[])
            self.need(len(screens)>=MIN_SCREENS[name],f'{name}:INSUFFICIENT_SCREENSHOTS')
            self.need(len({s.get('ref',{}).get('path') for s in screens})==len(screens),f'{name}:DUPLICATE_SCREENSHOTS')
            for i,s in enumerate(screens):
                self.link(s.get('ref'),f'{name}:screen:{i}',json_data=False)
                try:
                    proof=pointer(vd,s['visualPointer'])
                    self.need(contains(proof,s['ref']['sha256']),f'{name}:SCREEN_NOT_VISUALLY_LINKED:{i}')
                    self.need(any(contains(d,s['ref']['sha256']) for d in docs),f'{name}:SCREEN_NOT_RUNTIME_LINKED:{i}')
                except (KeyError,TypeError,ValueError,IndexError):self.failures.append(f'{name}:SCREEN_VISUAL_POINTER:{i}')
        if name=='negative':
            self.need(set(g.get('controls',{}))=={'wrongSKU','staleArt','missingLayer'},'NEGATIVE_CONTROLS_INCOMPLETE')
            for key,c in g.get('controls',{}).items():
                try:self.need(pointer(docs[c['reportIndex']],c['pointer'])==c['expected'] and c['expected'] in (True,'PASS','REJECTED_AS_EXPECTED'),f'NEGATIVE_NOT_REJECTED:{key}')
                except (KeyError,TypeError,ValueError,IndexError):self.failures.append(f'NEGATIVE_BAD_CONTROL:{key}')
        if name=='readinessRecoveryR6':
            controls=g.get('controls',{})
            self.need(set(controls)==READINESS_CONTROLS,'READINESS_CONTROL_SET')
            addresses=[]
            for key,c in controls.items():
                try:
                    addresses.append((c['reportIndex'],c['pointer']))
                    self.need(pointer(docs[c['reportIndex']],c['pointer'])==c['expected'] and c['expected'] == {'normal':'ALL_FOUR_ROLES_READY','oneShotRecover':'ALL_FOUR_ROLES_READY','permanentReject':'EXPECTED_HARD_FAILURE_NO_TARGET_ADMISSION','missing404':'EXPECTED_HARD_FAILURE_NO_TARGET_ADMISSION','wrongDimensions':'EXPECTED_HARD_FAILURE_NO_TARGET_ADMISSION','cancelSafe':'CANCELLED_OLD_GENERATION_NOT_ACTIVATED','switchSafe':'CANCELLED_OLD_GENERATION_NOT_ACTIVATED','mountedOneShotRecover':'ALL_FOUR_ROLES_READY','underMaskOneShotRecover':'ALL_FOUR_ROLES_READY'}[key],f'READINESS_CONTROL_FAILED:{key}')
                except (KeyError,TypeError,ValueError,IndexError):self.failures.append(f'READINESS_CONTROL_MISSING:{key}')
            self.need(len(set(addresses))==len(READINESS_CONTROLS),'READINESS_CONTROL_POINTERS_NOT_DISTINCT')
            red=g.get('beforeFailures',[])
            self.need(len(red)==2,'READINESS_TWO_BEFORE_FAILURES_REQUIRED')
            red_addresses=[]
            for i,r in enumerate(red):
                before_doc=self.link(r.get('ref'),f'readiness-before-failure:{i}')
                self.assertions(before_doc,r.get('assertions'),f'readiness-before-failure:{i}')
                try:
                    value=pointer(before_doc,r['statusPointer']);red_addresses.append((r['ref']['sha256'],r['statusPointer']))
                    self.need(value=='EXPECTED_PERMANENT_LATCH_OBSERVED' and before_doc.get('status')=='FAIL_HARNESS_OR_UNEXPECTED' and r['ref']['sha256']=='e933b263ca05608d790cc296c53c81604c5d2dbdb2066f4a543bed136c5e5851','READINESS_ORIGINAL_RED_NOT_FAIL')
                    self.need(contains(before_doc,HOOK_BEFORE),'READINESS_ORIGINAL_RED_HOOK_BINDING')
                    self.need(contains(before_doc,'d1f58945ab66476cee7eeb01c27b9608c9069c2897e28f6a67303959e0662a2e'),'READINESS_ORIGINAL_RED_R4_BINDING')
                except (KeyError,TypeError,ValueError,IndexError):self.failures.append('READINESS_ORIGINAL_RED_STATUS_MISSING')
            self.need(len(set(red_addresses))==2,'READINESS_ORIGINAL_RED_NOT_DISTINCT')
            r5=g.get('r5CancelledMountedFailure',{})
            self.need(r5.get('sha256')==R5_FAIL_REPORT_SHA,'R5_CANCELLED_MOUNTED_RED_ANCHOR')
            r5doc=self.link(r5,'r5-cancelled-mounted-failure')
            if r5doc:
                cancel=next((c for c in r5doc.get('cases',[]) if c.get('name')=='cancel-pending'),{})
                self.need(cancel.get('status')=='UNEXPECTED_FAILURE' and cancel.get('domSnapshot',{}).get('callbackFailures')=='younger:wearable,sister:wearable','R5_CANCEL_RED_NOT_PRESERVED')
        # Read actual normal-runtime health and source maps rather than trusting only summary counts.
        if name not in {'authored180','guidance3','negative','readinessRecoveryR6'}:
            health_count=0
            for doc in docs:
                for n in nodes(doc):
                    if not isinstance(n,dict):continue
                    state=n.get('status')
                    if isinstance(state,str):self.need(not any(x in state for x in ('FAIL','REJECT','TIMEOUT')),f'{name}:RAW_CASE_FAILURE:{state}')
                    for key in ('source106Before','source106After','sourceBefore','sourceAfter'):
                        if key in n:self.need(n[key]==capture,f'{name}:RAW_SOURCE_MAP:{key}')
                    for key in ('pageErrors','sourceDrift','source106Drift','failedRequests'):
                        if key in n:self.need(n[key] in ([],0),f'{name}:RAW_ERROR:{key}')
                    if 'pageOverflow' in n:
                        health_count+=1
                        self.need(n['pageOverflow']==0,f'{name}:PAGE_OVERFLOW')
                    if 'geometryFailureCount' in n:self.need(n['geometryFailureCount']==0,f'{name}:GEOMETRY_FAIL')
                    if 'broken' in n and isinstance(n['broken'],list):self.need(n['broken']==[],f'{name}:BROKEN_IMAGES')
                    if isinstance(n.get('decode'),list):
                        health_count+=1
                        self.need(bool(n['decode']),f'{name}:EMPTY_DECODE')
                        for frame in n['decode']:
                            natural=frame.get('natural',0)
                            if isinstance(natural,list):natural=min(natural) if natural else 0
                            good=frame.get('decoded') is True or any(a.get('ok') is True for a in frame.get('attempts',[]))
                            self.need(frame.get('complete') is True and natural>0 and good,f'{name}:DECODE_NOT_READY')
                    if isinstance(n.get('health'),dict):
                        h=n['health'];health_count+=1
                        self.need(h.get('overflow')==0 and h.get('broken')==[] and h.get('errors',[])==[],f'{name}:RAW_HEALTH_FAIL')
            self.need(health_count>0,f'{name}:NO_RAW_HEALTH')
        self.facts[name]={'caseCount':g.get('caseCount'),'captureSourceSHA256':g['captureSourcePins']['sha256'],'carryDifferences':list(deltas(capture,current))}
    def readiness_policy(self,baseline,current,hc):
        # This specific error-only retry is the entire allowed hook carry contract.
        self.need(baseline.get(HOOK)==HOOK_BEFORE and current.get(HOOK)==HOOK_AFTER,'READINESS_HOOK_EXACT_APPROVED_BYTES')
        self.need(hc.get('patch',{}).get('sha256')==HOOK_PATCH,'READINESS_PATCH_ANCHOR')
        self.link(hc.get('patch'),'readiness-approved-patch',json_data=False)
        self.need(hc.get('beforeSHA256')==HOOK_BEFORE and hc.get('afterSHA256')==HOOK_AFTER,'READINESS_PATCH_HASH_CHAIN')
        self.need(hc.get('scope')=='SHARED_BOUNDED_DECODE_DETACHED_MOUNTED_UNDERMASK_ONLY','READINESS_PATCH_SCOPE')
        self.need(current.get(RENDERER)==RENDERER_AFTER and hc.get('rendererDepthBeforeSHA256')==RENDERER_DEPTH and hc.get('rendererAfterSHA256')==RENDERER_AFTER,'RENDERER_READINESS_EXACT_BYTES')
        self.need(hc.get('rendererRetryPatch',{}).get('sha256')==RENDERER_RETRY_PATCH,'RENDERER_RETRY_PATCH_ANCHOR')
        self.link(hc.get('rendererRetryPatch'),'renderer-retry-only-patch',json_data=False)
        self.need(hc.get('samePixelNativeRequired') is True and hc.get('preserveKeysAndDepth') is True,'NATIVE_PIXEL_AND_DEPTH_CONTRACT_MISSING')
        self.need(set(hc.get('requiredProofGroups',[]))=={'readinessRecoveryR6','targeted77R6'},'READINESS_PROOF_DEPENDENCY_REQUIRED')
    def normal_pixels(self,ref,index,current):
        proof=self.link(ref,'normal-pixel-proof')
        if not isinstance(proof,dict):return
        self.need(proof.get('status')=='PASS_EXACT_RGBA_NATIVE_COMPARISON','NORMAL_PIXELS_STATUS')
        self.need(proof.get('beforeSourcePinsSHA256')==R5_PINS_SHA and proof.get('afterSourcePinsSHA256')==R6_PINS_SHA,'NORMAL_PIXELS_CAPTURE_BINDING')
        self.need(proof.get('beforeReport',{}).get('sha256')==R5_FAIL_REPORT_SHA,'NORMAL_PIXELS_ORIGINAL_REPORT_ANCHOR')
        before_doc=self.link(proof.get('beforeReport'),'normal-pixels-before-report')
        after_doc=self.link(proof.get('afterReport'),'normal-pixels-after-report')
        visual=self.link(proof.get('visualReview'),'normal-pixels-visual-review')
        self.need(isinstance(visual,dict) and passed(visual.get('status')),'NORMAL_PIXELS_VISUAL_MISSING')
        recovery=index.get('evidence',{}).get('readinessRecoveryR6',{})
        self.need(proof.get('afterReport') in [r.get('ref') for r in recovery.get('rawReports',[])],'NORMAL_PIXELS_NOT_RECOVERY_REPORT')
        pairs=proof.get('pairs',[])
        expected={(c,r) for c in ('026','076') for r in ('brother','younger','sister','younger-sister')}
        self.need(len(pairs)==8 and {(p.get('caseId'),p.get('role')) for p in pairs}==expected,'NORMAL_PIXELS_EIGHT_ROLE_PAIRS')
        for i,p in enumerate(pairs):
            a=self.link(p.get('before'),f'normal-pixels:{i}:before',json_data=False)
            b=self.link(p.get('after'),f'normal-pixels:{i}:after',json_data=False)
            self.need(contains(before_doc,p.get('before',{}).get('sha256')) and contains(after_doc,p.get('after',{}).get('sha256')),'NORMAL_PIXELS_IMAGE_RUNTIME_LINK')
            self.need(contains(visual,p.get('after',{}).get('sha256')),'NORMAL_PIXELS_IMAGE_VISUAL_LINK')
            box=p.get('box',[])
            self.need(len(box)==4 and all(type(v)==int for v in box),'NORMAL_PIXELS_CROP_FORMAT')
            if a is None or b is None or len(box)!=4:continue
            try:
                left,top,right,bottom=box
                ia=Image.open(io.BytesIO(a)).convert('RGBA');ib=Image.open(io.BytesIO(b)).convert('RGBA')
                self.need(ia.size==ib.size and 0<=left<right<=ia.width and 0<=top<bottom<=ia.height and right-left>=200 and bottom-top>=350,'NORMAL_PIXELS_NATIVE_CROP_BOUNDS')
                delta=ImageChops.difference(ia.crop(box),ib.crop(box))
                self.need(all(channel.getbbox() is None for channel in delta.split()),f'NORMAL_PIXELS_NONZERO:{i}')
            except (ValueError,OSError,TypeError) as e:self.failures.append(f'NORMAL_PIXELS_DECODE:{i}:{e}')
    def run(self,index):
        self.need(index.get('schemaVersion')==1,'SCHEMA_VERSION')
        pointer_path='qa/v653/CURRENT-RELEASE.json'
        try:
            pointer_raw=read(pointer_path);release_pointer=json.loads(pointer_raw)
            self.need(release_pointer.get('schemaVersion')==1 and release_pointer.get('kind')=='little-explorers-incremental-release','RELEASE_POINTER_SCHEMA')
            self.need(release_pointer.get('index')==self.input_index,'RELEASE_POINTER_INDEX_MISMATCH')
            self.facts['releasePointerSHA256']=digest(pointer_raw)
        except (OSError,ValueError,TypeError,TimeoutError) as e:self.failures.append(f'RELEASE_POINTER_MISSING_OR_INVALID:{e}')
        self.need(index.get('status')=='READY_FOR_INCREMENTAL_GATE_NOT_RELEASED','INDEX_NOT_READY')
        anchors={k:self.anchor(k,index.get('baseline',{}).get(k,{})) for k in ANCHORS}
        if any(v is None for v in anchors.values()):return
        baseline=anchors['source106'];current=self.link(index.get('source107'),'source107')
        if not isinstance(current,dict):return
        diff=self.source_policy(baseline,current);self.check_map(current,'source107')
        self.readiness_policy(baseline,current,index.get('readinessPatchContract',{}))
        self.need(anchors['stageInputs'].get('sourcePinsSha256')==ANCHORS['source106'][1],'STAGE_BASELINE_SOURCE')
        protected=anchors['protected7']['pins'];self.need(len(protected)==7,'PROTECTED_NOT_7');self.check_map(protected,'protected7')
        # Reject extra unpinned source/API inputs, even if no import currently reaches them.
        workspace=index.get('validationRootKind')=='source-workspace'
        self.need(index.get('validationRootKind') in {'source-workspace','release-stage'},'VALIDATION_ROOT_KIND')
        tracked_src={str(p.relative_to(ROOT)) for p in (ROOT/'src').rglob('*') if p.is_file() and not (workspace and p.name=='.DS_Store')}
        self.need(tracked_src=={p for p in current if p.startswith('src/')},'EXTRA_OR_MISSING_SRC_FILE')
        self.need({str(p.relative_to(ROOT)) for p in (ROOT/'api').rglob('*') if p.is_file()}=={p for p in protected if p.startswith('api/')},'EXTRA_OR_MISSING_API_FILE')
        pub={p:v['sha256'] for p,v in anchors['stageInputs']['files'].items() if p.startswith('public/')}
        self.need(len(pub)==3738,'PUBLIC_BASELINE_COUNT')
        actual={str(p.relative_to(ROOT)) for p in (ROOT/'public').rglob('*') if p.is_file()}
        if workspace:
            extra_ref=index.get('rootOnlyExclusions',{})
            self.need(extra_ref.get('sha256')=='42e55c45f3b179b1bf57c5003ae1e6a062c1a0b610765193009f0bce07e1eafc','ROOT_EXCLUSION_ANCHOR')
            extra=self.link(extra_ref,'root-only-exclusions')
            excluded={v['path']:v['sha256'] for v in (extra or {}).get('candidates',[])}
            self.need(len(excluded)==9,'ROOT_EXCLUSION_COUNT')
            self.check_map(excluded,'rootExcludedCandidateBytes')
            self.need(not set(excluded)&set(pub),'EXCLUDED_PUBLISHED_FILE')
            self.need({p for p in actual if Path(p).name!='.DS_Store'}==set(pub)|set(excluded),'NEW_OR_MISSING_PUBLIC_ASSET')
        else:
            self.public_set_policy(actual,pub)
        self.check_map(pub,'publicRetained')
        artifact=anchors['artifact'];self.need(len(artifact)==3756,'ORIGINAL_ARTIFACT_COUNT')
        self.need(all(artifact.get(p.removeprefix('public/'))==h for p,h in pub.items()),'PUBLIC_NOT_BOUND_TO_ACCEPTED_ARTIFACT')
        old=anchors['oldIndex']
        legacy=self.link(old['legacyGatePins'],'legacy-gate-pins')
        if isinstance(legacy,dict):self.check_map(legacy,'legacy-gates-unchanged')
        oldruntime=self.link(old['runtime'],'old-runtime')
        oldvisual=self.link(old['visual'],'old-visual')
        self.need(oldruntime is not None and oldvisual is not None,'OLD_ART_ACCEPTANCE_MISSING')
        artpaths=set(oldruntime.get('assetPaths',[])) if oldruntime else set()
        self.need(len(artpaths)==213 and artpaths<=set(pub),'OLD_213_ART_PATH_SET')
        pc=index.get('publishedCarry',{})
        self.need(pc.get('mode')=='UNCHANGED_BYTES_PRIOR_ACCEPTANCE_NOT_FRESH_RUNTIME','PUBLISHED_CARRY_SCOPE')
        self.need(set(pc.get('assetPaths',[]))==artpaths,'PUBLISHED_213_CARRY_SET')
        self.need(pc.get('sourcePinsSHA256')==ANCHORS['source106'][1],'PUBLISHED_CARRY_SOURCE')
        for manifest in ('src/data/avatarAssetManifest.json','src/data/worldArtManifest.json','src/data/characterMotionManifest.json'):
            self.need(current.get(manifest)==baseline.get(manifest),f'MANIFEST_CHANGED:{manifest}')
        # Verify every controlled patch as an exact text diff between pinned file snapshots.
        chains=index.get('patchChains',{})
        self.need(set(chains)==ALLOWED,'PATCH_CHAIN_PATH_SET')
        for path,chain in chains.items():
            last=baseline.get(path)
            self.need(bool(chain),f'EMPTY_PATCH_CHAIN:{path}')
            for i,step in enumerate(chain):
                a=self.link(step.get('before'),f'{path}:{i}:before',external=True,json_data=False)
                b=self.link(step.get('after'),f'{path}:{i}:after',json_data=False)
                patch=self.link(step.get('patch'),f'{path}:{i}:patch',json_data=False)
                if None in (a,b,patch):continue
                self.need(digest(a)==last,f'PATCH_CHAIN_BROKEN:{path}:{i}')
                try:
                    expected=''.join(difflib.unified_diff(a.decode().splitlines(True),b.decode().splitlines(True),fromfile=path,tofile=path)).encode()
                    self.need(patch==expected,f'PATCH_NOT_EXACT:{path}:{i}')
                except UnicodeError:self.failures.append(f'PATCH_NOT_UTF8:{path}')
                self.need(bool(step.get('reason')) and bool(step.get('evidence')),f'PATCH_REASON_EVIDENCE_MISSING:{path}:{i}')
                for ref in step.get('evidence',[]):self.link(ref,f'patch-evidence:{path}:{i}')
                last=digest(b)
            self.need(last==current.get(path),f'PATCH_FINAL_MISMATCH:{path}')
        # All 180 authored lessons were reviewed at R3; only the approved 3 guidance values may follow.
        cr=index.get('curriculumReview',{})
        expected_r3='53ce04506c3f256c82179f9143675dd115bd4432d345e91ee6d6a4913daecfa1'
        expected_proposal='cc153009e5e884b527e1754f0e67fc58860932c756186fc4656060d5f06e3aa4'
        self.need(cr.get('r3Snapshot',{}).get('sha256')==expected_r3,'LESSON_R3_ANCHOR')
        self.need(cr.get('guidanceProposal',{}).get('sha256')==expected_proposal,'GUIDANCE_PROPOSAL_ANCHOR')
        prior=self.link(cr.get('r3Snapshot'),'lesson-r3-snapshot')
        proposal=self.link(cr.get('guidanceProposal'),'guidance-proposal')
        final_lessons=self.link(cr.get('finalSnapshot'),'final-lesson-snapshot')
        extraction=self.link(cr.get('extractionReceipt'),'lesson-extraction-receipt')
        if isinstance(prior,list) and isinstance(proposal,dict):
            expected=copy.deepcopy(prior);by_id={v['id']:v for v in expected}
            self.need(len(expected)==len(by_id)==180,'AUTHORED_LESSON_COUNT')
            fields=[]
            for lesson in proposal.get('reviews',[]):
                for change in lesson['proposedReplacements']:
                    lid=lesson['lessonId'];field=change['field'];fields.append((lid,field))
                    self.need(by_id[lid][field]==change['old'],'GUIDANCE_OLD_VALUE')
                    by_id[lid][field]=change['new']
            self.need(set(fields)=={('w11d1b2','younger'),('w11d1b2','older'),('w11d5b1','younger')},'GUIDANCE_FIELD_SET')
            self.need(final_lessons==expected,'UNAPPROVED_LESSON_LEAF_CHANGE')
        if extraction is not None:
            ep=self.link(cr.get('extractionSourcePins'),'lesson-extraction-source106')
            self.need(cr.get('extractionSourcePins',{}).get('sha256')==R6_PINS_SHA and extraction.get('sourcePinsSHA256')==R6_PINS_SHA and extraction.get('curriculumSHA256')==current.get(CURRICULUM),'FINAL_EXTRACTION_SOURCE_BINDING')
            if isinstance(ep,dict):
                ed=deltas(ep,current)
                self.need(set(ep)==set(baseline) and len(ep)==106 and set(ed)<={PREBUILD,SELF},'EXTRACTION_NONBUILD_DRIFT')
                self.need(cr.get('extractionCarry',{}).get('differences')==ed and cr.get('extractionCarry',{}).get('mode')=='CAPTURE106_PLUS_BUILD_ONLY_FINAL107','EXTRACTION_CARRY_NOT_EXACT')
            self.need(extraction.get('snapshotSHA256')==cr.get('finalSnapshot',{}).get('sha256') and extraction.get('status')=='PASS_EXACT_CURRENT_EXTRACTION','FINAL_EXTRACTION_SNAPSHOT_BINDING')
        groups=index.get('evidence',{})
        self.need(set(groups)==GROUPS,'REQUIRED_EVIDENCE_GROUP_SET')
        for name in sorted(GROUPS):
            if name in groups:self.evidence_group(name,groups[name],current,baseline)
        self.normal_pixels(index.get('normalPixelProof'),index,current)
        self.facts.update(sourceCount=len(current),protectedCount=len(protected),retainedPublicCount=len(pub),retainedArtPaths=len(artpaths),sourceDifferences=diff)
        # Recheck source at the end; never accept a source transition during validation.
        self.check_map(current,'source107After')


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--index',required=True);p.add_argument('--expected-index-sha',required=True);p.add_argument('--out',required=True)
    a=p.parse_args();g=Gate()
    try:
        if Path(a.index).is_absolute():raise ValueError('--index must be repository-relative')
        output=safe(a.out)
        if not output.is_relative_to(ROOT/OWN):raise ValueError('--out must be inside owned incremental-release QA directory')
        if output.exists():raise ValueError('Preserve existing result: choose a new --out')
        index=g.link({'path':a.index,'sha256':a.expected_index_sha},'incremental-index')
        g.input_index={'path':a.index,'sha256':a.expected_index_sha}
        if index is not None:g.run(index)
    except (OSError,ValueError,TypeError,KeyError,IndexError,TimeoutError) as e:g.failures.append(f'VALIDATION_EXCEPTION:{e}')
    report={'status':'FAIL_INCREMENTAL_NOT_READY' if g.failures else 'PASS_SCOPED_INCREMENTAL_ADMISSION_NOT_DEPLOYED',
            'index':{'path':a.index,'sha256':a.expected_index_sha},'gateSHA256':sha(SELF),
            'failures':g.failures,'facts':g.facts,'verifiedLinks':g.verified,
            'limits':['Integrity and declared scoped acceptance only; visual judgments are linked human/agent reviews, not inferred from hashes.',
                      'Prior art acceptance is unchanged-byte carry, never relabeled fresh runtime.',
                      'No build, performance, deployment, physical device, real-family, or full-video-viewing claim.']}
    try:
        output=safe(a.out)
        if output.is_relative_to(ROOT/OWN) and not output.exists():
            output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    except OSError as e:print(e,file=sys.stderr)
    print(json.dumps({'status':report['status'],'failures':g.failures,'facts':g.facts},ensure_ascii=False))
    return 1 if g.failures else 0

if __name__=='__main__':sys.exit(main())
