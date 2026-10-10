#!/usr/bin/env python3
"""Technical-only V6.5 revalidation for C/K retained wearables and 15 World products.

PASS here means current renderer/file/hash/decode lineage is technically valid.
It explicitly does NOT make an aesthetic/visual PASS claim.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
QUEUE = ROOT / 'qa/v65/art-workpacks/retain-revalidate.json'
AVATAR_MANIFEST = ROOT / 'src/data/avatarAssetManifest.json'
WORLD_MANIFEST = ROOT / 'src/data/worldArtManifest.json'
OUT = ROOT / 'qa/v65/art-workpacks/retain-technical.json'
AVATARS = ('brother','younger','sister','younger-sister')


def sha(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):
            h.update(chunk)
    return h.hexdigest()


def decode(path: Path) -> tuple[bool,str|None]:
    try:
        with Image.open(path) as im:
            im.verify()
        return True,None
    except Exception as exc:
        return False,f'{type(exc).__name__}: {exc}'


def contracts() -> dict[tuple[str,str],dict[str,Any]]:
    m=json.loads(AVATAR_MANIFEST.read_text(encoding='utf-8')); out={}
    for skin in m.get('skins',[]):
        if skin.get('skinId')=='default': continue
        out[(skin['skinId'],skin['avatarId'])]={'renderer':'full-skin','paths':[skin['path']]}
    for acc in m.get('accessories',[]):
        if acc.get('renderer')=='standard-effect': continue
        for avatar in AVATARS:
            if avatar not in acc.get('supportedAvatars',AVATARS): continue
            if acc.get('renderer')=='aligned-overlay':
                primary=(acc.get('variants') or {}).get(avatar)
                detail=((acc.get('defaultSkinDetails') or {}).get(avatar) or {}).get('overlay')
                paths=[]
                for p in (primary,detail):
                    if p and p not in paths: paths.append(p)
            elif acc.get('renderer')=='split-overlay':
                paths=[p for p in ((acc.get('backVariants') or {}).get(avatar),(acc.get('frontVariants') or {}).get(avatar)) if p]
            else: continue
            out[(acc['id'],avatar)]={'renderer':acc['renderer'],'paths':paths}
    return out


def validate_path(path_text: str, expected_sha: str|None=None) -> dict[str,Any]:
    p=ROOT/path_text
    row={'path':path_text,'exists':p.is_file(),'sha256':None,'decode':False,'error':None}
    if not p.is_file(): row['error']='missing'; return row
    row['sha256']=sha(p)
    if expected_sha and row['sha256']!=expected_sha:
        row['error']=f'hash mismatch expected {expected_sha}'
    ok,reason=decode(p); row['decode']=ok
    if not ok: row['error']=reason
    return row


def main() -> int:
    queue=json.loads(QUEUE.read_text(encoding='utf-8'))
    current_contracts=contracts()
    failures=[]; c_results=[]; k_results=[]

    for lane,key in [('C','C'),('K','K')]:
        target=c_results if lane=='C' else k_results
        for row in queue[key]:
            item=row['itemId']; avatar=row['avatarId']; contract=current_contracts.get((item,avatar))
            result={'itemId':item,'avatarId':avatar,'technicalStatus':'PASS','visualStatus':'PENDING_VISUAL_REVIEW','renderer':None,'files':[]}
            if not contract:
                result['technicalStatus']='FAIL'; failures.append(f'{lane} missing renderer contract {item}:{avatar}'); target.append(result); continue
            result['renderer']=contract['renderer']
            if not contract['paths']:
                result['technicalStatus']='FAIL'; failures.append(f'{lane} empty runtime paths {item}:{avatar}')
            for path_text in contract['paths']:
                f=validate_path(path_text); result['files'].append(f)
                if not f['exists'] or not f['decode'] or f['error']:
                    result['technicalStatus']='FAIL'; failures.append(f'{lane} bad runtime {item}:{avatar} {path_text}: {f["error"]}')
            if lane=='C' and item=='starter-sun-cap':
                if any('/v5/' in p for p in contract['paths']) or not any('/v6.4/runtime/' in p for p in contract['paths']):
                    result['technicalStatus']='FAIL'; failures.append(f'C A01 fallback still selectable {item}:{avatar}: {contract["paths"]}')
            target.append(result)

    world_manifest=json.loads(WORLD_MANIFEST.read_text(encoding='utf-8'))
    world_by_id={r['itemId']:r for r in world_manifest.get('records',[])}
    world_results=[]
    for row in queue['World']:
        item=row['itemId']; rec=world_by_id.get(item)
        result={'itemId':item,'technicalStatus':'PASS','visualStatus':'RETAINED_MASTER_PENDING_V65_VISUAL_REVALIDATION','files':[]}
        if not rec:
            result['technicalStatus']='FAIL'; failures.append(f'World missing manifest record {item}'); world_results.append(result); continue
        for field in ('source','delivery'):
            evidence=rec.get(field) or {}; f=validate_path(str(evidence.get('path','')),evidence.get('sha256')); f['role']=field; result['files'].append(f)
            if not f['exists'] or not f['decode'] or f['error']:
                result['technicalStatus']='FAIL'; failures.append(f'World bad {field} {item}: {f["error"]}')
        for index,variant in enumerate(rec.get('displayVariants') or []):
            f=validate_path(str(variant.get('path','')),variant.get('sha256')); f['role']=f'displayVariant[{index}]'; result['files'].append(f)
            if not f['exists'] or not f['decode'] or f['error']:
                result['technicalStatus']='FAIL'; failures.append(f'World bad display variant {item}: {f["error"]}')
        result['productionUrlPass']=rec.get('productionUrlPass','PENDING')
        world_results.append(result)

    if len(c_results)!=4: failures.append(f'C count {len(c_results)} != 4')
    if len(k_results)!=61: failures.append(f'K count {len(k_results)} != 61')
    if len(world_results)!=15: failures.append(f'World count {len(world_results)} != 15')

    payload={
      'schemaVersion':1,'version':'V6.5','suite':'retain-technical-revalidation',
      'status':'PASS_TECHNICAL_ONLY' if not failures else 'FAIL',
      'scope':'file/hash/decode/current-renderer only; no aesthetic acceptance',
      'queueSha256':sha(QUEUE),'avatarManifestSha256':sha(AVATAR_MANIFEST),'worldManifestSha256':sha(WORLD_MANIFEST),
      'counts':{'C':len(c_results),'K':len(k_results),'WorldProducts':len(world_results),'failures':len(failures)},
      'C':c_results,'K':k_results,'World':world_results,'failures':failures,
      'notClaimed':['aesthetic PASS','final art acceptance','production verification','physical-device verification'],
    }
    OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':payload['status'],'counts':payload['counts'],'failures':failures[:20],'result':str(OUT.relative_to(ROOT))},ensure_ascii=False,indent=2))
    return 0 if not failures else 1

if __name__=='__main__': raise SystemExit(main())
