from pathlib import Path
from PIL import Image
import json,hashlib
root=Path.cwd();b=root/'art-source/v653/headwear-feedback-r2';qa=root/'qa/v653/20261006/user-feedback-r2/headwear';q=qa/'candidate-r1';ns=Path('public/assets/v6.5.3/headwear-feedback-r2-candidate-r1');m=json.loads((q/'avatarAssetManifest-r2.json').read_text());prior=json.loads((q/'lineage-r2.json').read_text());rows=prior['sources'];poses=json.loads((qa/'pose-jobs/pose-map.json').read_text());saved={};retained=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for e in m['accessories']:
 sku=e['id']
 if sku not in ['phones-racer','phones-ai','story-headphones','phones-legend']:continue
 original=json.loads(json.dumps(e));e['requiredHairstyleFits']=['hair-nebula'];e['hairstyleSplitVariants']={'hair-nebula':{}}
 for p in poses:
  a,skin,pose=p['avatar'],p['skin'],p['renderPose'];key=sku+'-nebula-back';target=root/ns/'retained-earwear-nebula-r1'/key/(a+'--'+pose+'.webp')
  if target not in saved:
   source=b/(sku+'-nebula-r1')/(a+'--default--back.png') if pose=='default' else b/'other-pose-projections-r1'/key/(a+'--'+pose+'.png');target.parent.mkdir(parents=True,exist_ok=True);im=Image.open(source).convert('RGBA');im.save(target,'WEBP',lossless=True,quality=100,method=6);blend=source.with_suffix('.blend');row={'path':str(target.relative_to(root)),'sha256':sha(target),'sourcePNG':str(source.relative_to(root)),'sourcePNGSHA256':sha(source),'nativeBlend':str(blend.relative_to(root)),'nativeBlendSHA256':sha(blend),'width':im.width,'height':im.height,'itemId':sku,'method':'Existing SKU native sculpture with Nebula-fit back arch only; complete native camera rendering and lossless encoding'};rows.append(row);saved[target]=row
  sb=e.get('skinBackVariants',{}).get(a,{}).get(skin);sf=e.get('skinFrontVariants',{}).get(a,{}).get(skin);front=sf if sb and sf else e['frontVariants'][a];assert (root/front).is_file();e['hairstyleSplitVariants']['hair-nebula'].setdefault(a,{})[skin]={'back':str(target.relative_to(root)),'front':front};retained.append({'itemId':sku,'avatar':a,'skin':skin,'path':front,'sha256':sha(root/front),'mode':'EXACT_ORIGINAL_FRONT_PATH_AND_BYTES_RETAINED'})
 assert {k:v for k,v in e.items() if k not in ['requiredHairstyleFits','hairstyleSplitVariants']}==original
canonical=q/'avatarAssetManifest-final.json';canonical.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n');(q/'asset-lineage-final.json').write_text(json.dumps({**prior,'status':'FROZEN_CANDIDATE_PENDING_COMPILED_608_AND_SHOP_ACCEPTANCE','manifestPath':str(canonical.relative_to(root)),'manifestSHA256':sha(canonical),'finalizerSHA256':sha(Path(__file__)),'sources':rows,'retainedFronts':retained,'notCovered':['compiled608 actual product homepage','390/1440 light/night Shop cancel save reload','full selected-item regression']},indent=2)+'\n');print(len(rows),'new assets',len(retained),'retained exact fronts',sha(canonical))
