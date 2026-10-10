#!/usr/bin/env python3
"""Generate V6.5 Phase-3 art workpacks from the authoritative V6.4 judge matrix.

This generator creates metadata/instructions only. It never creates or edits artwork,
never promotes candidates into runtime, and never marks any visual row PASS.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MATRIX = ROOT / 'V6.4審查包/02_63商品四角色矩陣.md'
AVATAR_MANIFEST = ROOT / 'src/data/avatarAssetManifest.json'
OUT = ROOT / 'qa/v65/art-workpacks'
AVATARS = ('brother', 'younger', 'sister', 'younger-sister')
AVATAR_LABELS = {'brother':'哥哥','younger':'弟弟','sister':'姐姐','younger-sister':'妹妹'}
BASE_REFERENCES = {avatar:f'public/assets/v5/characters/{avatar}/wardrobe/base-body.png' for avatar in AVATARS}
BATCHES = [
 ('B01','服裝',['outfit-cadet','outfit-mecha','outfit-ocean']),
 ('B02','服裝',['outfit-mage','outfit-legend','sister-bloom-outfit']),
 ('B03','背包',['trail-backpack','pack-rocket','pack-treasure']),
 ('B04','背包',['pack-ocean','pack-legend','sister-comet-pack']),
 ('B05','披風',['hero-cape','cape-sky','cape-nebula']),
 ('B06','披風',['cape-ocean','cape-legend','sister-galaxy-cape']),
 ('B07','眼鏡',['sky-view-glasses','glasses-racer','glasses-star']),
 ('B08','眼鏡',['glasses-holo','glasses-legend','sister-heart-glasses']),
 ('B09','耳機',['story-headphones','phones-sky','phones-racer']),
 ('B10','耳機',['phones-ai','phones-legend','sister-cat-headphones']),
 ('B11','髮型與髮飾',['sister-starlight-clip','sister-mint-bow']),
]

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def parse_matrix() -> list[dict[str, Any]]:
    section=''; rows=[]
    for line in MATRIX.read_text(encoding='utf-8').splitlines():
        if line.startswith('## '): section=line[3:].strip(); continue
        if not line.startswith('| `'): continue
        cols=[part.strip() for part in line.strip().strip('|').split('|')]
        if len(cols)<7: continue
        codes=dict(zip(AVATARS,cols[2:6]))
        if not any(code in {'R','C','K','W'} for code in codes.values()): continue
        rows.append({'section':section,'itemId':cols[0].strip('`'),'name':cols[1],'codes':codes,'judgeInstruction':cols[6]})
    return rows

def current_renderer_contracts() -> dict[tuple[str,str],dict[str,Any]]:
    manifest=json.loads(AVATAR_MANIFEST.read_text(encoding='utf-8')); contracts={}
    for skin in manifest.get('skins',[]):
        if skin.get('skinId')=='default': continue
        contracts[(skin['skinId'],skin['avatarId'])]={'renderer':'full-skin','slot':'skin','currentRuntime':[skin['path']]}
    for acc in manifest.get('accessories',[]):
        if acc.get('renderer')=='standard-effect': continue
        for avatar in AVATARS:
            if avatar not in acc.get('supportedAvatars',AVATARS): continue
            if acc.get('renderer')=='aligned-overlay':
                path=(acc.get('variants') or {}).get(avatar) or ((acc.get('defaultSkinDetails') or {}).get(avatar) or {}).get('overlay')
                current=[path] if path else []
            elif acc.get('renderer')=='split-overlay':
                current=[p for p in ((acc.get('backVariants') or {}).get(avatar),(acc.get('frontVariants') or {}).get(avatar)) if p]
            else: continue
            contracts[(acc['id'],avatar)]={'renderer':acc['renderer'],'slot':acc.get('slot'),'currentRuntime':current}
    return contracts

def candidate_outputs(batch_id,item_id,avatar,renderer):
    base=f'public/assets/v6.5/art-candidates/{batch_id}/{avatar}'
    return [f'{base}/{item_id}-back.webp',f'{base}/{item_id}-front.webp'] if renderer=='split-overlay' else [f'{base}/{item_id}.webp']

def promoted_outputs(item_id,avatar,renderer):
    base=f'public/assets/v6.5/runtime/{avatar}'
    return [f'{base}/{item_id}-back.webp',f'{base}/{item_id}-front.webp'] if renderer=='split-overlay' else [f'{base}/{item_id}.webp']

def prompt_rules(renderer,section):
    rules=[
      '固定 1024×1536 透明畫布；角色中心 X=512、地面基線 Y=1488。',
      '四角色維持各自臉、髮型、膚色、身形比例、姿勢與身分，不可互換或同臉化。',
      '不得使用程序化幾何貼片、平面多邊形、噪點假材質或把舊 V5 幾何素材重新包裝成新圖。',
      '商品設計語言四角色一致，但尺寸、透視、遮擋與接觸點需依角色個別貼合。',
      'HTTP 200、decode、hash、rendered item count 都不是美術 PASS；必須實際 runtime + visual review。',
    ]
    if renderer=='full-skin': rules += ['輸出完整角色 full-skin；臉、手腳與姿勢需延續 reference。','服裝需具布料/護甲體積、縫線與材質層次，不可像貼紙。']
    elif renderer=='aligned-overlay': rules += ['輸出只保留配件本體與必要陰影/高光，其餘透明；不可把角色身體烘進 overlay。','以 reference 定位耳朵、鼻橋、頭頂或髮束，但輸出仍是 accessory-only 固定畫布。']
    elif renderer=='split-overlay': rules += ['同商品/角色輸出 back 與 front 兩張固定畫布。','back/front 視為同一件物件，材質、透視、接點完全一致。']
    extra={'背包':'背包需有袋體厚度、肩帶壓力與沿肩線自然走向，並與披風正確分層。','披風':'披風需有自然垂墜、褶皺、重量感與立體前扣，不得是平面色塊。','眼鏡':'眼鏡需有鏡框、鼻橋、鏡腳、透明/半透明鏡片與耳側接觸關係。','耳機':'耳機需有耳罩厚度、頭帶弧度、軟墊與頭髮/帽子的自然遮擋。','髮型與髮飾':'髮飾需有晶體/緞帶/夾具體積與真實固定方式；保留角色原髮。'}
    if section in extra: rules.append(extra[section])
    return rules

def main() -> int:
    rows=parse_matrix(); by_id={r['itemId']:r for r in rows}; contracts=current_renderer_contracts(); matrix_hash=sha(MATRIX); manifest_hash=sha(AVATAR_MANIFEST)
    r_rows=[(r['itemId'],a) for r in rows for a,c in r['codes'].items() if c=='R']; c_rows=[(r['itemId'],a) for r in rows for a,c in r['codes'].items() if c=='C']; k_rows=[(r['itemId'],a) for r in rows for a,c in r['codes'].items() if c=='K']; world_products=[r for r in rows if any(c=='W' for c in r['codes'].values())]
    if (len(r_rows),len(c_rows),len(k_rows))!=(127,4,61): raise SystemExit(f'ROW_COUNT_MISMATCH R={len(r_rows)} C={len(c_rows)} K={len(k_rows)}')
    r_products=[]
    for item,_ in r_rows:
        if item not in r_products: r_products.append(item)
    batch_products=[item for _,_,items in BATCHES for item in items]
    if set(batch_products)!=set(r_products) or len(batch_products)!=len(set(batch_products)): raise SystemExit('BATCH_PRODUCT_SET_MISMATCH')
    OUT.mkdir(parents=True,exist_ok=True); covered=set(); summaries=[]
    for order,(batch_id,section,item_ids) in enumerate(BATCHES,1):
        d=OUT/batch_id; d.mkdir(parents=True,exist_ok=True); products=[]; refs=set(); runtimes=set(); rcount=0
        for item_id in item_ids:
            row=by_id[item_id]; roles=[]
            for avatar in AVATARS:
                if row['codes'][avatar]!='R': continue
                contract=contracts.get((item_id,avatar))
                if not contract: raise SystemExit(f'MISSING_RENDERER_CONTRACT {item_id}:{avatar}')
                reference=BASE_REFERENCES[avatar]
                if not (ROOT/reference).is_file(): raise SystemExit(f'MISSING_REFERENCE {reference}')
                for path in contract['currentRuntime']:
                    if not (ROOT/path).is_file(): raise SystemExit(f'MISSING_RUNTIME {path}')
                    runtimes.add(path)
                refs.add(reference); covered.add((item_id,avatar)); rcount+=1
                roles.append({'avatarId':avatar,'avatarLabel':AVATAR_LABELS[avatar],'referenceBase':reference,'currentRuntime':contract['currentRuntime'],'renderer':contract['renderer'],'visualSlot':contract['slot'],'candidateOutputs':candidate_outputs(batch_id,item_id,avatar,contract['renderer']),'promotedOutputs':promoted_outputs(item_id,avatar,contract['renderer']),'status':'ART_SOURCE_BLOCKED'})
            products.append({'itemId':item_id,'name':row['name'],'section':section,'judgeInstruction':row['judgeInstruction'],'roles':roles,'promptRules':prompt_rules(roles[0]['renderer'],section)})
        manifest={'schemaVersion':1,'version':'V6.5','phase':'Phase3-Art-Rebuild','batchId':batch_id,'order':order,'section':section,'status':'ART_SOURCE_BLOCKED','matrixSource':str(MATRIX.relative_to(ROOT)),'matrixSha256':matrix_hash,'avatarManifestSource':str(AVATAR_MANIFEST.relative_to(ROOT)),'avatarManifestSha256':manifest_hash,'productCount':len(item_ids),'rRowCount':rcount,'products':products,'promotionPolicy':{'candidateRoot':f'public/assets/v6.5/art-candidates/{batch_id}/','runtimeRoot':'public/assets/v6.5/runtime/','noDirectOverwriteV64':True,'noPromotionWithoutVisualReview':True,'requiredRuntimeFlow':['Shop trial','purchase/equip','Home display','reload persistence'],'requiredVisualModes':['390 light','390 night','1440 light','1440 night'],'negativeControls':['wrong-avatar candidate','missing layer','swapped item','stale candidate screenshot']}}
        (d/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        (d/'reference-files.txt').write_text('\n'.join(sorted(refs|runtimes))+'\n',encoding='utf-8')
        lines='\n'.join(f"- `{p['itemId']}` {p['name']}：{len(p['roles'])} R rows；{p['judgeInstruction']}" for p in products)
        (d/'README.md').write_text(f"# V6.5 Phase 3｜{batch_id} {section}美術施工包\n\n- 狀態：`ART_SOURCE_BLOCKED`\n- 商品數：{len(products)}\n- R rows：{rcount}\n- 權威矩陣 SHA256：`{matrix_hash}`\n- Avatar manifest SHA256：`{manifest_hash}`\n\n## 本批商品\n{lines}\n\n## 強制規則\n1. 只使用內建 ChatGPT Images／image editing 做正式美術。\n2. 不得使用 PIL、SVG 幾何、程序化圖形或外部付費 API 冒充美術。\n3. 先輸出到 `public/assets/v6.5/art-candidates/{batch_id}/`，不得直接覆寫 V6.4 runtime。\n4. runtime 操作與實際 visual review 都 PASS 後才可 promote 到 V6.5 runtime。\n5. 本機檔案路徑本身不構成 Images 可編輯 target；reference 尚未進入對話時保持 blocked。\n",encoding='utf-8')
        summaries.append({'batchId':batch_id,'order':order,'section':section,'productIds':item_ids,'productCount':len(item_ids),'rRowCount':rcount,'status':'ART_SOURCE_BLOCKED','manifest':str((d/'manifest.json').relative_to(ROOT))})
    if covered!=set(r_rows): raise SystemExit(f'R_ROW_COVERAGE_MISMATCH {len(covered)}/{len(r_rows)}')
    retain={'schemaVersion':1,'version':'V6.5','matrixSha256':matrix_hash,'avatarManifestSha256':manifest_hash,'C':[{'itemId':i,'avatarId':a,'status':'COMPATIBILITY_FIX_REVALIDATE'} for i,a in c_rows],'K':[{'itemId':i,'avatarId':a,'status':'RETAIN_REQUIRES_RUNTIME_AND_VISUAL_REVALIDATION'} for i,a in k_rows],'World':[{'itemId':r['itemId'],'name':r['name'],'status':'WORLD_RETAIN_INTEGRATION_REVALIDATION'} for r in world_products],'counts':{'R':len(r_rows),'C':len(c_rows),'K':len(k_rows),'WorldProducts':len(world_products)}}
    (OUT/'retain-revalidate.json').write_text(json.dumps(retain,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    master={'schemaVersion':1,'version':'V6.5','status':'READY_FOR_IMAGE_BRIDGE','blocker':'ART_SOURCE_BLOCKED','matrixSource':str(MATRIX.relative_to(ROOT)),'matrixSha256':matrix_hash,'avatarManifestSource':str(AVATAR_MANIFEST.relative_to(ROOT)),'avatarManifestSha256':manifest_hash,'counts':{'rRows':len(r_rows),'rProducts':len(r_products),'batches':len(BATCHES),'cRows':len(c_rows),'kRows':len(k_rows),'worldProducts':len(world_products)},'batches':summaries,'bridgeContract':{'allowedGenerator':'built-in ChatGPT Images / image editing only','referenceMustExistInConversation':True,'localPathAloneIsNotImageTarget':True,'externalPaidImageApiAllowed':False,'proceduralArtAllowed':False}}
    (OUT/'master-index.json').write_text(json.dumps(master,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    readme=['# V6.5 Phase 3｜127R 正式美術批次索引','',f'- R rows：**{len(r_rows)}**',f'- R 商品：**{len(r_products)}**',f'- 正式批次：**{len(BATCHES)}**',f'- C rows：**{len(c_rows)}**',f'- K rows：**{len(k_rows)}**',f'- World 商品：**{len(world_products)}**','- 目前 blocker：`ART_SOURCE_BLOCKED`','','## 批次']
    readme += [f"- {b['batchId']}｜{b['section']}｜{b['productCount']} 商品｜{b['rRowCount']} R rows｜`{b['manifest']}`" for b in summaries]
    readme += ['','## Promotion 原則','- candidate 不直接覆寫 V6.4 runtime。','- 實際 visual review + runtime flow 都 PASS 才可 promote。','- 目前沒有把本機 reference image 直接掛入此對話給 Images 編輯的合法 bridge，因此所有 R 批次維持 blocked。']
    (OUT/'README.md').write_text('\n'.join(readme)+'\n',encoding='utf-8')
    print(json.dumps(master,ensure_ascii=False,indent=2)); return 0
if __name__=='__main__': raise SystemExit(main())
