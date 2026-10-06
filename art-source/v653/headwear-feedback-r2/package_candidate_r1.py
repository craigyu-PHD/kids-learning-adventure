"""Encode native renders and bind every exact role/pose pair; no runtime manifest promotion."""
from pathlib import Path
from PIL import Image
import json,hashlib
root=Path.cwd();b=root/'art-source/v653/headwear-feedback-r2';qa=root/'qa/v653/20261006/user-feedback-r2/headwear';ns=Path('public/assets/v6.5.3/headwear-feedback-r2-candidate-r1');m=json.loads((qa/'manifest-candidate-hair-default-r4.json').read_text());entries={e['id']:e for e in m['accessories']};poses=json.loads((qa/'pose-jobs/pose-map.json').read_text());lineage=[];done={}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def encode(src,target,blend=None,method='Native Blender render, lossless RGBA WebP encoding'):
 target=root/ns/target
 if target in done:return str(target.relative_to(root))
 target.parent.mkdir(parents=True,exist_ok=True);im=Image.open(src).convert('RGBA');im.save(target,'WEBP',lossless=True,quality=100,method=6);row={'path':str(target.relative_to(root)),'sha256':sha(target),'sourcePNG':str(src.relative_to(root)),'sourcePNGSHA256':sha(src),'width':im.width,'height':im.height,'method':method}
 if blend:row.update({'nativeBlend':str(blend.relative_to(root)),'nativeBlendSHA256':sha(blend)})
 lineage.append(row);done[target]=row;return row['path']
def asset(key,a,pose,source):
 if pose!='default':source=b/'pose-projections-r1'/key/(a+'--'+pose+'.png')
 return encode(source,Path(key)/(a+'--'+pose+'.webp'),source.with_suffix('.blend'))
for sku in ['phones-sky','starter-buddy-headphones','sister-cat-headphones']:
 e=entries[sku];e['backVariants']={};e['frontVariants']={};e['skinBackVariants']={};e['skinFrontVariants']={};e['requiredHairstyleFits']=['hair-nebula'];e['hairstyleSplitVariants']={'hair-nebula':{}};revision='r1' if sku=='sister-cat-headphones' else 'r2'
 for p in poses:
  a,skin,pose=p['avatar'],p['skin'],p['renderPose'];paths={}
  for part in ['back','front']:
   source=b/(sku+'-'+revision)/(a+'--default--'+part+'.png');paths[part]=asset(sku+'-'+part,a,pose,source)
   if skin=='default':e[part+'Variants'][a]=paths[part]
   else:e['skin'+part.title()+'Variants'].setdefault(a,{})[skin]=paths[part]
  back=asset(sku+'-nebula-back',a,pose,b/(sku+'-nebula-r3')/(a+'--default--back.png'));e['hairstyleSplitVariants']['hair-nebula'].setdefault(a,{})[skin]={'back':back,'front':paths['front']}
for sku in ['hair-nebula','starter-sun-cap']:
 e=entries[sku];e['variants']={};e['defaultSkinDetails']={};e['skinDetails']={};e['skinVariants']={};e.pop('headwearHairDetails',None)
 for p in poses:
  a,skin,pose=p['avatar'],p['skin'],p['renderPose'];source=b/('sun-cap-r5' if sku=='starter-sun-cap' else ('soft-nebula-r9' if a=='brother' else 'fitted-nebula-r3'))/(a+'.png');overlay=asset(sku,a,pose,source);detail={'overlay':overlay,'canvasTopPadding':256};maskdir=b/'candidate-masks-r1';maskdir.mkdir(exist_ok=True)
  if sku=='hair-nebula':
   original=b/('soft-nebula-r8' if a=='brother' else 'fitted-nebula-r3')/(a+'--body-hair-mask-r5.png');im=Image.open(original).convert('L');s=p['scale'];tx,ty=p['translate'];im=im.transform((1024,1536),Image.Transform.AFFINE,(1/s,0,-tx/s,0,1/s,-ty/s),Image.Resampling.BICUBIC,fillcolor=255);mp=maskdir/f'{sku}-{a}--{pose}-body.png';im.save(mp);detail['hairVisibilityMask']=encode(mp,Path(sku)/(a+'--'+pose+'--body-mask.webp'),method='Exact existing face-safe mask projected with native wardrobe rig; no RGB face inference')
  else:
   import numpy as np
   arr=np.array(Image.open(root/overlay).getchannel('A'));bottoms=[]
   for x in range(1024):
    ys=np.flatnonzero(arr[:,x]>80);bottoms.append(float(ys[-1])-1.5 if len(ys) else None)
   known=np.array([i for i,v in enumerate(bottoms) if v is not None]);vals=np.array([v for v in bottoms if v is not None]);contour=np.interp(np.arange(1024),known,vals);yy=np.arange(1792)[:,None];mask=np.clip((yy-contour[None,:]+1)/2*255,0,255).astype('uint8')
   for label,content in [('under',mask),('body',mask[256:])]:
    mp=maskdir/f'{sku}-{a}--{pose}-{label}.png';Image.fromarray(content).save(mp);path=encode(mp,Path(sku)/(a+'--'+pose+'--'+label+'-mask.webp'),method='Native brim lower contour; entire region above brim hidden including hat-external headband/cat ears');detail['underHeadwearVisibilityMask' if label=='under' else 'hairVisibilityMask']=path
  if skin=='default':e['variants'][a]=overlay;e['defaultSkinDetails'][a]=detail
  else:e['skinVariants'].setdefault(a,{})[skin]=overlay;e['skinDetails'].setdefault(a,{})[skin]=detail
out=qa/'candidate-r1';out.mkdir(exist_ok=True);manifest=out/'avatarAssetManifest.json';manifest.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n');(out/'lineage.json').write_text(json.dumps({'status':'CANDIDATE_ONLY_PENDING_8_SKIN_VISUAL_QA_AND_FULL_MATRIX','namespace':str(ns),'manifestSHA256':sha(manifest),'builderSHA256':sha(Path(__file__)),'poseMapSHA256':sha(qa/'pose-jobs/pose-map.json'),'items':['phones-sky','starter-buddy-headphones','sister-cat-headphones','hair-nebula','starter-sun-cap'],'sources':lineage,'notCovered':['catalog updates','other four headphones','480 matrix','390/1440 light/night Shop cancel save reload','negative controls']},indent=2)+'\n');print(len(lineage),'lossless assets',manifest)
