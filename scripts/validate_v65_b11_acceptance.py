#!/usr/bin/env python3
"""Validate B11 isolated same-candidate evidence. Read-only except acceptance report."""
from __future__ import annotations
import hashlib,json,time
from pathlib import Path
from typing import Any
ROOT=Path(__file__).resolve().parents[1]
B11=ROOT/'qa/v65/art-workpacks/B11'; S=B11/'scripts'
DIST=S/'candidate-dist-build.json'; RUNTIME=S/'runtime/all-role-integrated-runtime-gate.json'
NEGATIVE=S/'runtime/negative-controls.json'; COMPAT=S/'compatibility/report.json'
BOARD_DIR=S/'runtime/runtime-visual-review-boards'; VISUAL_DIR=S/'runtime/actual-visual-review'
OUT=S/'acceptance-integrity.json'
ITEMS=('sister-starlight-clip','sister-mint-bow'); AVATARS=('brother','younger','sister','younger-sister')
SURFACES=('shop-trial','shop-equipped','home','achievements'); MODES=('390x844-light','390x844-dark','1440x900-light','1440x900-dark')
REVIEW_PROMPT_VERSION='b11-item-specific-v1'
def sha(p:Path)->str:return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p:Path)->Any:return json.loads(p.read_text())
def fingerprint(v)->str:return hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def candidate_path(item,avatar):return B11/f'fit-candidates/{avatar}/{item}.webp'
def source_snapshot():
 paths=[]
 for name in ('src','index.html','package.json','package-lock.json','vite.config.ts','tsconfig.json','tsconfig.app.json','tsconfig.node.json'):
  p=ROOT/name
  if p.is_file():paths.append(p)
  elif p.is_dir():paths.extend(x for x in p.rglob('*') if x.is_file())
 return {str(p.relative_to(ROOT)):sha(p) for p in sorted(paths)}
def current_candidates():return {f'{i}:{a}':sha(candidate_path(i,a)) for i in ITEMS for a in AVATARS}
def expected_shots(item,avatar):
 cap=S/f'runtime/{item}/{avatar}/integrated-runtime-capture'
 return {str((cap/f'{mode}-{surface}.png').relative_to(ROOT)):sha(cap/f'{mode}-{surface}.png') for mode in MODES for surface in SURFACES}
def structural_errors():
 e=[]
 for p in (DIST,RUNTIME,NEGATIVE,COMPAT):
  if not p.is_file():e.append(f'missing {p.relative_to(ROOT)}')
 if e:return e
 dist,runtime,negative,compat=map(load,(DIST,RUNTIME,NEGATIVE,COMPAT));cand=current_candidates()
 if dist.get('status')!='PASS' or dist.get('candidateOnly') is not True or dist.get('sharedSrcWritten') is not False or dist.get('sharedPublicWritten') is not False:e.append('candidate dist not isolated PASS')
 if dist.get('candidateHashes')!=cand:e.append('candidate hashes drift')
 if dist.get('rootSourceChangedDuringBuild') is not False or dist.get('rootPublicChangedDuringBuild') is not False:e.append('shared roots changed during build')
 current_fp=fingerprint(source_snapshot())
 if dist.get('rootSourceEndFingerprint')!=current_fp:e.append(f"current source drift: built={dist.get('rootSourceEndFingerprint')} current={current_fp}")
 if runtime.get('status')!='PASS' or runtime.get('bindingErrors'):e.append('runtime not PASS/clean')
 if runtime.get('distReportSha256')!=sha(DIST):e.append('runtime dist report binding mismatch')
 if runtime.get('inputFingerprint')!=dist.get('workspaceSourceFingerprint') or runtime.get('distFingerprint')!=dist.get('distFingerprint'):e.append('runtime build fingerprint mismatch')
 rows=runtime.get('rows') or [];keys=[(r.get('itemId'),r.get('avatarId')) for r in rows]
 if len(rows)!=8 or set(keys)!={(i,a) for i in ITEMS for a in AVATARS} or len(keys)!=len(set(keys)):e.append('runtime row coverage mismatch')
 for row in rows:
  k=f"{row.get('itemId')}:{row.get('avatarId')}"
  if row.get('pass') is not True or row.get('candidateSha256')!=cand.get(k) or len(row.get('cases') or [])!=4:e.append(f'runtime row invalid {k}')
 if negative.get('status')!='PASS' or negative.get('baselineIntegrityPass') is not True or len(negative.get('cases') or [])!=4 or any(c.get('actual')!='REJECT' for c in negative.get('cases') or []):e.append('negative controls invalid')
 assertions=negative.get('representativeCopyAssertions') or negative.get('copyAssertions') or []
 if assertions and any(x.get('pass') is not True for x in assertions):e.append('representative copy assertions invalid')
 if compat.get('status')!='PASS_TECHNICAL_ONLY' or len(compat.get('rows') or [])!=16 or any(r.get('pass') is not True for r in compat.get('rows') or []):e.append('compatibility technical gate invalid')
 for i in ITEMS:
  for a in AVATARS:
   b=BOARD_DIR/f'{i}__{a}.jpg'
   if not b.is_file():e.append(f'missing board {i}/{a}')
   for p in expected_shots(i,a):
    if not (ROOT/p).is_file():e.append(f'missing screenshot {p}')
 return e
def visual_errors(candidate_fp,runtime_sha):
 e=[];reviews={};expected_keys={(i,a) for i in ITEMS for a in AVATARS}
 if not VISUAL_DIR.is_dir():return ['visual review directory missing'],reviews
 for p in VISUAL_DIR.glob('*__*.json'):
  try:d=load(p)
  except Exception as x:e.append(f'{p.relative_to(ROOT)} parse {x}');continue
  key=(d.get('itemId'),d.get('avatarId'))
  if key not in expected_keys:e.append(f'unexpected review row {key}');continue
  if d.get('model') in (None,'') or d.get('reviewerAgentId') in (None,''):e.append(f'{p.name}: reviewer identity missing')
  if d.get('reviewerPromptVersion')!=REVIEW_PROMPT_VERSION:e.append(f'{p.name}: prompt version mismatch')
  if d.get('candidateFingerprint')!=candidate_fp or d.get('runtimeReportSha256')!=runtime_sha:e.append(f'{p.name}: candidate/runtime binding mismatch')
  dist,negative,compat=load(DIST),load(NEGATIVE),load(COMPAT)
  evidence_binding={
   'buildReportSha256':sha(DIST),
   'negativeControlsReportSha256':sha(NEGATIVE),
   'compatibilityReportSha256':sha(COMPAT),
   'workspaceSourceFingerprint':dist.get('workspaceSourceFingerprint'),
   'distFingerprint':dist.get('distFingerprint'),
  }
  if any(d.get(k)!=v for k,v in evidence_binding.items()):e.append(f'{p.name}: build/negative/compat/source/dist binding mismatch')
  board=BOARD_DIR/f'{key[0]}__{key[1]}.jpg'
  if d.get('board')!=str(board.relative_to(ROOT)) or d.get('boardSha256')!=sha(board):e.append(f'{p.name}: board binding mismatch')
  cp=candidate_path(*key)
  if d.get('candidateAsset')!=str(cp.relative_to(ROOT)) or d.get('candidateSha256')!=sha(cp):e.append(f'{p.name}: candidate binding mismatch')
  expected=expected_shots(*key);got={x.get('path'):x.get('sha256') for x in d.get('reviewedScreenshots') or []}
  if got!=expected:e.append(f'{p.name}: reviewed screenshot set/hash mismatch')
  comp_expected={}
  for extra in ('sunny-explorer-hat','phones-ai'):
   q=S/f'compatibility/{key[0]}__{key[1]}__{extra}.png';comp_expected[str(q.relative_to(ROOT))]=sha(q)
  comp_got={x.get('path'):x.get('sha256') for x in d.get('compatibilityScreenshots') or []}
  if comp_got!=comp_expected:e.append(f'{p.name}: compatibility screenshot set/hash mismatch')
  if d.get('visuallyInspected') is not True or d.get('deterministicDecision')!='PASS' or (d.get('response') or {}).get('decision')!='PASS' or (d.get('response') or {}).get('blocking_issues'):e.append(f'{p.name}: visual decision not clean PASS')
  reviews.setdefault(key,[]).append({'path':str(p.relative_to(ROOT)),'sha256':sha(p),'model':d.get('model'),'reviewerAgentId':d.get('reviewerAgentId')})
 for key in expected_keys:
  group=reviews.get(key,[])
  if len(group)!=2 or len({x['model'] for x in group})<2 or len({x['reviewerAgentId'] for x in group})<2:e.append(f'{key}: requires exactly two distinct model/agent reviews')
 return e,reviews
def run():
 structural=structural_errors();cand=current_candidates() if DIST.is_file() else {};candidate_fp=fingerprint(cand) if cand else None;runtime_sha=sha(RUNTIME) if RUNTIME.is_file() else None
 visual,reviews=visual_errors(candidate_fp,runtime_sha) if not structural else (['visual skipped until structural PASS'],{})
 result={'schemaVersion':1,'suite':'v65-b11-acceptance','createdAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'candidateFingerprint':candidate_fp,'runtimeReportSha256':runtime_sha,'candidateHashes':cand,'structuralErrors':structural,'visualErrors':visual,'sameCandidatePass':not structural,'visualComplete':len(reviews)==8 and all(len(v)==2 for v in reviews.values()),'visualPass':not visual,'promotionReady':not structural and not visual,'reviewRows':{f'{k[0]}:{k[1]}':v for k,v in reviews.items()}}
 OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');return result
def main():
 r=run();print(json.dumps({k:r[k] for k in ('sameCandidatePass','visualComplete','visualPass','promotionReady','structuralErrors','visualErrors')},ensure_ascii=False,indent=2));return 0 if r['promotionReady'] else 1
if __name__=='__main__':raise SystemExit(main())
