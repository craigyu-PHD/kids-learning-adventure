#!/usr/bin/env python3
from __future__ import annotations
import json, re, hashlib
from pathlib import Path
from collections import Counter

ROOT=Path(__file__).resolve().parents[1]
MATRIX=ROOT/'V6.4審查包/02_63商品四角色矩陣.md'
MANIFEST=ROOT/'src/data/avatarAssetManifest.json'
OUT_JSON=ROOT/'qa/v65/art/phase3-batches.json'
OUT_MD=ROOT/'docs/handover/V65_Phase3_ArtBatches.md'
AVATARS=['brother','younger','sister','younger-sister']
BATCHES=[
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
 ('B11','髮飾',['sister-starlight-clip','sister-mint-bow']),
]

def sha(path:Path)->str:
 h=hashlib.sha256();
 with path.open('rb') as f:
  for c in iter(lambda:f.read(1024*1024),b''): h.update(c)
 return h.hexdigest()

def parse_matrix():
 text=MATRIX.read_text(encoding='utf-8'); section=''; rows={}
 for line in text.splitlines():
  if line.startswith('## '): section=line[3:].strip()
  if not line.startswith('| `'): continue
  cols=[c.strip() for c in line.strip().strip('|').split('|')]
  if len(cols)<7: continue
  iid=cols[0].strip('`'); codes=dict(zip(AVATARS,cols[2:6]))
  rows[iid]={'section':section,'itemId':iid,'name':cols[1],'codes':codes,'disposition':cols[6]}
 return rows

def runtime_contract(manifest,iid,avatar):
 for s in manifest.get('skins',[]):
  if s.get('skinId')==iid and s.get('avatarId')==avatar:
   return {'renderer':'full-skin','slot':'skin','currentRuntime':[s['path']]}
 for a in manifest.get('accessories',[]):
  if a.get('id')!=iid: continue
  r=a.get('renderer'); slot=a.get('slot')
  if r=='aligned-overlay':
   p=(a.get('variants') or {}).get(avatar) or ((a.get('defaultSkinDetails') or {}).get(avatar) or {}).get('overlay')
   return {'renderer':r,'slot':slot,'currentRuntime':[p] if p else []}
  if r=='split-overlay':
   back=(a.get('backVariants') or {}).get(avatar); front=(a.get('frontVariants') or {}).get(avatar)
   return {'renderer':r,'slot':slot,'currentRuntime':[p for p in (back,front) if p]}
 raise KeyError(f'No renderer contract for {iid}/{avatar}')

def candidate_paths(batch,iid,avatar,renderer):
 base=f'public/assets/v6.5/art-candidates/{batch}/{avatar}'
 runtime=f'public/assets/v6.5/runtime/{avatar}'
 if renderer=='split-overlay':
  return {
   'candidate':[f'{base}/{iid}-back.png',f'{base}/{iid}-front.png'],
   'promotion':[f'{runtime}/{iid}-back.webp',f'{runtime}/{iid}-front.webp']}
  
 return {'candidate':[f'{base}/{iid}.png'],'promotion':[f'{runtime}/{iid}.webp']}

def prompt_contract(renderer,section,note):
 common=[
  'Use the supplied avatar reference as identity/pose/proportion source; do not redesign the child.',
  'Canvas contract: 1024x1536 RGBA transparent, character center x=512, ground baseline y=1488.',
  'Premium children-learning game art; natural material depth, clean edges, no flat geometric sticker look.',
  'No background, text, watermark, extra props, pose drift, face drift, body-scale drift, or cropped canvas.',
 ]
 if renderer=='full-skin':
  spec=['Return the complete character wearing the new outfit on transparent canvas.','Preserve face, hair identity, hands, feet, pose and silhouette; outfit must wrap the body naturally.','Keep head region compatible with hats/headphones and preserve blink-critical face area.']
 elif renderer=='split-overlay':
  spec=['Produce TWO transparent fixed-canvas layers: BACK layer behind torso and FRONT layer containing only straps/clasps/foreground pieces.','Back/front together must read as one volumetric object; do not paint body pixels into either layer.','Respect cape/backpack mutual occlusion and shoulder anatomy.']
 else:
  spec=['Return accessory-only transparent overlay on fixed canvas; do not include body/background pixels.','Fit exact anatomy of this avatar; preserve facial identity and underlying hair except where physically occluded.']
 return common+spec+[f'Audit requirement: {note}']

def combos(section):
 return {
  '服裝':['single','starter-sun-cap','starter-sky-glasses + starter-buddy-headphones'],
  '背包':['single','with hero/cape equivalent','with outfit-racer'],
  '披風':['single','with backpack','with outfit-racer'],
  '眼鏡':['single','with hair-comet','with starter-buddy-headphones'],
  '耳機':['single','with hair-comet','with starter-sun-cap','with starter-sky-glasses'],
  '髮型與髮飾':['single','with starter-sun-cap','with starter-buddy-headphones'],
  '髮飾':['single','with starter-sun-cap','with starter-buddy-headphones'],
 }.get(section,['single'])

def main():
 rows=parse_matrix(); manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
 base={e['avatarId']:e for e in manifest.get('baseDisplayVariants',[])}
 batches=[]; all_rows=[]
 for bid,label,items in BATCHES:
  br=[]
  for iid in items:
   row=rows[iid]
   for av in AVATARS:
    if row['codes'].get(av)!='R': continue
    c=runtime_contract(manifest,iid,av); paths=candidate_paths(bid,iid,av,c['renderer'])
    b=base[av]
    rec={
     'deliveryId':f'{iid}:{av}','batch':bid,'category':row['section'],'itemId':iid,'name':row['name'],'avatarId':av,
     'auditCode':'R','disposition':row['disposition'],'renderer':c['renderer'],'slot':c['slot'],
     'referenceBase':{'path':b['source']['path'],'sha256':b['source']['sha256']},
     'referenceDisplay':{'path':b['path'],'sha256':b['sha256'],'width':b['width'],'height':b['height']},
     'currentRuntime':c['currentRuntime'],'candidateOutputs':paths['candidate'],'promotionTargets':paths['promotion'],
     'requiredVisualCombos':combos(row['section']),
     'promptContract':prompt_contract(c['renderer'],row['section'],row['disposition']),
     'status':'ART_SOURCE_BLOCKED',
     'acceptance':{
      'sourceBridge':'PENDING','imageGenContext':'PENDING','candidateFiles':'PENDING','runtimePromotion':'PENDING',
      'shopPurchaseEquip':'PENDING','homeReload':'PENDING','visualReview':'PENDING','candidateFingerprint':'PENDING'
     }
    }
    br.append(rec); all_rows.append(rec)
  batches.append({'batchId':bid,'label':label,'products':items,'rRowCount':len(br),'status':'ART_SOURCE_BLOCKED','rows':br})
 expected=set()
 for r in rows.values():
  for av,code in r['codes'].items():
   if code=='R': expected.add(f"{r['itemId']}:{av}")
 actual={r['deliveryId'] for r in all_rows}
 if actual!=expected: raise SystemExit(f'R coverage mismatch missing={sorted(expected-actual)} extra={sorted(actual-expected)}')
 payload={
  'schemaVersion':1,'version':'V6.5','sourceMatrix':str(MATRIX.relative_to(ROOT)),'sourceMatrixSha256':sha(MATRIX),
  'avatarManifest':str(MANIFEST.relative_to(ROOT)),'avatarManifestSha256':sha(MANIFEST),
  'canvasContract':manifest.get('contract'),'bridgePolicy':{
   'required':'built-in ChatGPT Images/image editing with usable in-conversation avatar reference',
   'forbidden':['procedural/PIL art substitute','external paid image API','direct overwrite of V6.4 runtime','status-only acceptance'],
   'current':'ART_SOURCE_BLOCKED'
  },
  'batchCount':len(batches),'rProductCount':len({r['itemId'] for r in all_rows}),'rRowCount':len(all_rows),
  'countsByCategory':dict(Counter(r['category'] for r in all_rows)),'batches':batches
 }
 OUT_JSON.parent.mkdir(parents=True,exist_ok=True); OUT_JSON.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 lines=['# 小小探險隊 V6.5｜Phase 3 美術施工批次','',f'- R 商品：{payload["rProductCount"]} 個',f'- R item×avatar：{payload["rRowCount"]} 列',f'- 正式批次：{payload["batchCount"]} 批（每批 2–3 商品）','- 目前狀態：`ART_SOURCE_BLOCKED`；批次包完成不等於美術完成。','', '## 共通規則','', '- 只用內建 ChatGPT Images / image editing；必須有可用的角色 reference。','- 不用 procedural/PIL 幾何圖冒充正式 Art，不用外部付費 image API。','- 不直接覆寫 V6.4 runtime；先 candidate，視覺驗收後才 promotion 到 V6.5 runtime。','- 每列必須通過 Shop→購買/裝備→Home→reload、實際視覺審查與同 candidate fingerprint。','']
 for b in batches:
  products=', '.join(f'`{p}`' for p in b['products'])
  lines += [f'## {b["batchId"]}｜{b["label"]}', '', f'- 商品：{products}', f'- R rows：{b["rRowCount"]}', '- 狀態：`ART_SOURCE_BLOCKED`', '']
  seen=set()
  for r in b['rows']:
   if r['itemId'] in seen: continue
   seen.add(r['itemId']); avs=[x['avatarId'] for x in b['rows'] if x['itemId']==r['itemId']]
   lines += [f'### {r["name"]} `{r["itemId"]}`', '', f'- 重製角色：{", ".join(avs)}', f'- Renderer：`{r["renderer"]}`', f'- 審查要求：{r["disposition"]}', f'- 必測組合：{"；".join(r["requiredVisualCombos"])}', '']
 OUT_MD.parent.mkdir(parents=True,exist_ok=True); OUT_MD.write_text('\n'.join(lines)+'\n',encoding='utf-8')
 print(json.dumps({'status':'PASS_BATCH_PLAN','batchCount':len(batches),'rProductCount':payload['rProductCount'],'rRowCount':len(all_rows),'countsByCategory':payload['countsByCategory'],'json':str(OUT_JSON.relative_to(ROOT)),'markdown':str(OUT_MD.relative_to(ROOT))},ensure_ascii=False,indent=2))
if __name__=='__main__': main()
