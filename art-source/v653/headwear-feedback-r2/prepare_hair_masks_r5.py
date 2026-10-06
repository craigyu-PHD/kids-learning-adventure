from pathlib import Path
from PIL import Image,ImageChops
import numpy as np,json,hashlib
root=Path.cwd();base=root/'art-source/v653/headwear-feedback-r2';out=root/'qa/v653/20261006/user-feedback-r2/headwear';m={e['id']:e for e in json.load(open(root/'src/data/avatarAssetManifest.json'))['accessories']};rows=[]
for a in ['brother','younger','sister','younger-sister']:
 native=base/('soft-nebula-r8' if a=='brother' else 'fitted-nebula-r3')/(a+'.png');bodyPath=root/f'public/assets/v5/characters/{a}/wardrobe/base-body.webp';im=Image.open(bodyPath).convert('RGBA');legacy=m['hair-nebula']['defaultSkinDetails'][a].get('hairVisibilityMask');mask=np.array(Image.open(root/legacy).convert('L')) if legacy else np.full((1536,1024),255,dtype='uint8');hair=np.array(Image.open(native).getchannel('A'))[256:]
 if a in ['sister','younger-sister']:
  mask[:110,:]=0
  # Only the outer silhouette envelope changes. Face, ear and neck cutouts are never inferred from colour.
  for y in range(0,430):
   xs=np.flatnonzero(hair[y]>80)
   if len(xs) and xs[-1]-xs[0]>=280:
    left,right=xs[0],xs[-1];mask[y,:left]=0;mask[y,right+1:]=0
 mp=native.with_name(a+'--body-hair-mask-r5.png');Image.fromarray(mask).save(mp);im.putalpha(ImageChops.multiply(im.getchannel('A'),Image.fromarray(mask)));scene=Image.new('RGBA',(1024,1792));scene.alpha_composite(im,(0,256));scene.alpha_composite(Image.open(native).convert('RGBA'));scene.save(out/f'nebula-candidate-r5-{a}-full.png')
 rows.append({'avatar':a,'sourceBody':str(bodyPath.relative_to(root)),'sourceBodySHA256':hashlib.sha256(bodyPath.read_bytes()).hexdigest(),'nativeHair':str(native.relative_to(root)),'nativeHairSHA256':hashlib.sha256(native.read_bytes()).hexdigest(),'mask':str(mp.relative_to(root)),'maskSHA256':hashlib.sha256(mp.read_bytes()).hexdigest(),'sourceLegacyMask':legacy,'method':'Preserve existing face/ears rig mask; girls clear old scalp above y110, and only clear body outside 280px+ wide native outer hair row envelope above y430. No RGB colour segmentation. Brother preserves natural sideburns.','status':'AWAITING_VISUAL_REVIEW'})
(out/'hair-mask-lineage-r5.json').write_text(json.dumps(rows,indent=2)+'\n')
