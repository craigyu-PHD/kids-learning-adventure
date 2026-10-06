#!/usr/bin/env python3
from __future__ import annotations
import argparse, base64, hashlib, json, time, urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'qa/v65/art-workpacks/B07/runtime'
BOARDS=BASE/'runtime-visual-review-boards'
OUT=BASE/'actual-visual-review'
ITEMS=('sky-view-glasses','glasses-racer','glasses-star')
AVATARS=('brother','younger','sister','younger-sister')
ALL_MODELS=('gemma3:4b','gemma3:12b')
CHECKS=(
    'eyes_readable','natural_face_fit','frame_bridge_temples_structure','lens_transparency',
    'temples_ear_contact','no_float_clip_intersection','single_glasses','design_identity',
    'shop_home_consistency','light_dark_consistency','viewport_consistency','character_identity_preserved'
)

SCHEMA={
  'type':'object','properties':{
    'decision':{'type':'string','enum':['PASS','FAIL']},
    'confidence':{'type':'number','minimum':0,'maximum':1},
    'checks':{'type':'object','properties':{k:{'type':'string','enum':['PASS','FAIL']} for k in CHECKS},'required':list(CHECKS)},
    'blocking_issues':{'type':'array','items':{'type':'string'}},
    'observations':{'type':'array','items':{'type':'string'}}
  },'required':['decision','confidence','checks','blocking_issues','observations']
}
PROMPT='''You are a strict visual QA inspector for a premium children's 3D avatar wardrobe. Review ONE item x ONE avatar row only. The supplied evidence board contains eight ACTUAL WEBSITE screenshots: Shop Trial and Home, each at 390 and 1440, Light and Night. Evaluate only what is visibly supported by the pixels.

This row is GLASSES. Required visual contract:
1. both eyes remain readable; lenses must be transparent or semi-transparent rather than opaque blocks;
2. frames have plausible thickness, a visible nose bridge, and temple arms; the glasses should read as a wearable 3D object rather than a flat geometric sticker;
3. bridge aligns naturally with the nose; temples plausibly extend toward the ears; no obvious floating gap;
4. no clipping through eyes/face/hair, no severe intersection, no detached/floating object, no duplicate pair;
5. scale and vertical/horizontal position are plausible for this character;
6. design identity is stable across all eight screenshots;
7. Shop vs Home, Light vs Night, and 390 vs 1440 are visually consistent;
8. character identity/face is preserved.

FAIL a check if the evidence visibly violates it or if a blocking defect makes it unreliable. Do not grant PASS merely because the page renders. Return ONLY JSON matching the supplied schema. decision must be PASS only when every check is PASS and blocking_issues is empty.'''

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()

def call(model:str, board:Path, timeout=240):
    payload={
      'model':model,'stream':False,'format':SCHEMA,
      'options':{'temperature':0,'seed':65},
      'messages':[{'role':'user','content':PROMPT,'images':[base64.b64encode(board.read_bytes()).decode('ascii')]}]
    }
    req=urllib.request.Request('http://127.0.0.1:11434/api/chat',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
    t=time.time()
    with urllib.request.urlopen(req,timeout=timeout) as r: raw=json.load(r)
    content=raw.get('message',{}).get('content','')
    try: resp=json.loads(content)
    except Exception as e: raise RuntimeError(f'invalid model JSON: {content[:1000]}') from e
    checks=resp.get('checks',{})
    deterministic='PASS' if all(checks.get(k)=='PASS' for k in CHECKS) and not resp.get('blocking_issues') else 'FAIL'
    if resp.get('decision')!=deterministic: resp['decision']=deterministic
    return resp,round(time.time()-t,2)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--models',nargs='*',default=list(ALL_MODELS)); ap.add_argument('--limit',type=int,default=0)
    a=ap.parse_args(); OUT.mkdir(parents=True,exist_ok=True)
    rows=[]
    jobs=[(i,v) for i in ITEMS for v in AVATARS]
    if a.limit: jobs=jobs[:a.limit]
    for item,avatar in jobs:
      board=BOARDS/f'{item}__{avatar}.jpg'
      if not board.exists(): raise SystemExit(f'missing board {board}')
      row={'itemId':item,'avatarId':avatar,'board':str(board.relative_to(ROOT)),'boardSha256':sha(board),'models':{}}
      for model in a.models:
        resp,elapsed=call(model,board)
        ev={'itemId':item,'avatarId':avatar,'model':model,'board':str(board.relative_to(ROOT)),'boardSha256':sha(board),'response':resp,'deterministicDecision':resp['decision'],'elapsed_s':elapsed}
        path=OUT/f'{item}__{avatar}__{model.replace(":","-")}.json'; path.write_text(json.dumps(ev,ensure_ascii=False,indent=2)+'\n')
        row['models'][model]={'decision':resp['decision'],'confidence':resp.get('confidence'),'blockingIssues':resp.get('blocking_issues',[]),'evidence':str(path.relative_to(ROOT)),'evidenceSha256':sha(path)}
        print(json.dumps({'item':item,'avatar':avatar,'model':model,'decision':resp['decision'],'confidence':resp.get('confidence'),'blocking':resp.get('blocking_issues',[]),'elapsed_s':elapsed},ensure_ascii=False),flush=True)
      row['rowDecision']='PASS' if len(row['models'])==len(a.models) and all(x['decision']=='PASS' and not x['blockingIssues'] for x in row['models'].values()) else 'FAIL'
      rows.append(row)
    full=len(jobs)==12 and set(a.models)==set(ALL_MODELS)
    summary={'schemaVersion':1,'suite':'v65-b07-actual-runtime-dual-model-visual-review','models':a.models,'requiredAgreement':'both models PASS with zero blocking issues','rows':rows,'rowsPassed':sum(r['rowDecision']=='PASS' for r in rows),'rowsTotal':len(rows),'status':('PASS' if full and all(r['rowDecision']=='PASS' for r in rows) else ('FAIL' if full else 'PARTIAL'))}
    sp=BASE/'actual-visual-review-summary.json'; sp.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'status':summary['status'],'rowsPassed':summary['rowsPassed'],'rowsTotal':summary['rowsTotal'],'summary':str(sp.relative_to(ROOT))},ensure_ascii=False),flush=True)
    return 0 if summary['status'] in ('PASS','PARTIAL') else 1
if __name__=='__main__': raise SystemExit(main())
