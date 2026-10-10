#!/usr/bin/env python3
"""Local-only visual review for T06 World runtime contact sheets.

Uses an already-installed Ollama Gemma 3 vision model. No external API, paid
service, upload, or model download is performed. The top/middle/bottom images
in each contact sheet are current 1440 Light, 390 reduced-motion Light, and 1440
reduced-motion Night runtime captures from qa_v64_world_runtime_closure.py.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import time
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'qa' / 'production-audit' / '2026-09-16' / 'v64-world-runtime'
CLOSURE = BASE / 'world-runtime-closure.json'

SCORE_KEYS = ['itemVisibility','composition','readability','crossModeConsistency','childAppeal','distinctIdentity','overallPolish']


def sha(path: Path) -> str:
    h=hashlib.sha256(); h.update(path.read_bytes()); return h.hexdigest()


def extract_json(text: str) -> dict[str, Any]:
    text=text.strip()
    fenced=re.search(r'```(?:json)?\s*(\{.*\})\s*```',text,re.S)
    if fenced: text=fenced.group(1)
    else:
        start=text.find('{'); end=text.rfind('}')
        if start>=0 and end>start: text=text[start:end+1]
    return json.loads(text)


def review(model: str, image: Path, item_id: str) -> tuple[dict[str, Any], str]:
    prompt=f"""You are a strict UI/visual QA reviewer. Inspect ONE vertical contact sheet for World item {item_id} in a children's learning website.
The contact sheet contains exactly three CURRENT runtime screenshots stacked vertically:
1) 1440px Light mode, 2) 390px mobile Light with reduced-motion, 3) 1440px Night with reduced-motion.
Judge what is visibly present. Do not assume hidden implementation facts and do not invent text.
Check: item is clearly visible and not blank; no severe crop/stretch; item/learner do not overlap incorrectly; title/status remain readable; mobile composition is usable; Night mode remains readable; the same item identity is recognisable across all three; child-facing visual appeal remains polished. A deliberate compact crop of surrounding page chrome is fine because the screenshot is the equipment stage itself.
Return ONLY one JSON object with this exact schema:
{{
  "itemId":"{item_id}",
  "canSeeAllThree":true,
  "scores":{{"itemVisibility":0.0,"composition":0.0,"readability":0.0,"crossModeConsistency":0.0,"childAppeal":0.0,"distinctIdentity":0.0,"overallPolish":0.0}},
  "blockers":[],
  "notes":"brief evidence-based visual note"
}}
Scores are 0-10. A blocker is only a release-relevant visible defect such as missing/wrong art, severe overlap/crop, unreadable title/status, obvious duplicate/wrong item, or broken Night/mobile composition. Do not create blockers for subjective style preferences alone."""
    payload={
        'model':model,
        'messages':[{'role':'user','content':prompt,'images':[base64.b64encode(image.read_bytes()).decode()]}],
        'stream':False,
        'options':{'temperature':0,'seed':64},
    }
    req=urllib.request.Request('http://127.0.0.1:11434/api/chat',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=180) as response:
        raw=json.loads(response.read())['message']['content']
    return extract_json(raw), raw


def valid_result(data: dict[str, Any], item_id: str) -> tuple[bool,list[str]]:
    failures=[]
    if data.get('itemId') != item_id: failures.append(f"itemId={data.get('itemId')!r}")
    if data.get('canSeeAllThree') is not True: failures.append('model could not see all three runtime views')
    scores=data.get('scores') if isinstance(data.get('scores'),dict) else {}
    for key in SCORE_KEYS:
        value=scores.get(key)
        if not isinstance(value,(int,float)) or not (0 <= value <= 10): failures.append(f'invalid {key}={value!r}')
    blockers=data.get('blockers')
    if not isinstance(blockers,list): failures.append('blockers is not a list')
    elif blockers: failures.append(f'visual blockers: {blockers}')
    if not failures:
        if min(float(scores[k]) for k in SCORE_KEYS[:-1]) < 7.5: failures.append(f"dimension below 7.5: {scores}")
        if float(scores['overallPolish']) < 8.0: failures.append(f"overallPolish below 8.0: {scores['overallPolish']}")
    return not failures, failures


def main() -> int:
    parser=argparse.ArgumentParser()
    parser.add_argument('--model',default='gemma3:4b')
    parser.add_argument('--only',action='append',default=[])
    args=parser.parse_args()
    closure=json.loads(CLOSURE.read_text(encoding='utf-8'))
    contacts=[Path(p) for p in closure.get('contactSheets',[])]
    if args.only: contacts=[p for p in contacts if p.stem in set(args.only)]
    rows=[]; failures=[]
    for rel in contacts:
        path=ROOT/rel
        item_id=path.stem
        started=time.time()
        try:
            data,raw=review(args.model,path,item_id)
            passed,row_failures=valid_result(data,item_id)
        except Exception as exc:
            data={}; raw=''; passed=False; row_failures=[f'vision review exception: {exc}']
        failures.extend(f'{item_id}: {f}' for f in row_failures)
        rows.append({
            'itemId':item_id,'pass':passed,'failures':row_failures,'model':args.model,
            'contactSheet':str(rel),'contactSheetSha256':sha(path),'review':data,
            'rawResponse':raw,'elapsedSeconds':round(time.time()-started,2),
        })
        print(json.dumps({'itemId':item_id,'pass':passed,'failures':row_failures,'scores':data.get('scores')},ensure_ascii=False),flush=True)
    model_slug=re.sub(r'[^a-zA-Z0-9._-]+','-',args.model)
    out=BASE/f'world-local-vision-{model_slug}.json'
    payload={
        'schemaVersion':1,'suiteName':'v64-world-local-vision','model':args.model,
        'localOnly':True,'externalUpload':False,'status':'PASS' if not failures and len(rows)==len(contacts) else 'FAIL',
        'reviewed':len(rows),'expected':len(contacts),'rows':rows,'failures':failures,
    }
    out.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':payload['status'],'reviewed':len(rows),'failureCount':len(failures),'failures':failures,'result':str(out.relative_to(ROOT))},ensure_ascii=False,indent=2))
    return 0 if payload['status']=='PASS' else 1


if __name__=='__main__':
    raise SystemExit(main())
