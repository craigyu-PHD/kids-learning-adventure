from pathlib import Path
from PIL import Image
import json,hashlib
root=Path.cwd();b=root/'art-source/v653/headwear-feedback-r2';q=root/'qa/v653/20261006/user-feedback-r2/headwear/candidate-r1';ns=Path('public/assets/v6.5.3/headwear-feedback-r2-candidate-r1');m=json.loads((q/'avatarAssetManifest.json').read_text());old=json.loads((q/'lineage.json').read_text());sources={r['path']:r for r in old['sources']};replacements={}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def enc(src,target):
 p=root/ns/target;p.parent.mkdir(parents=True,exist_ok=True);im=Image.open(src).convert('RGBA');im.save(p,'WEBP',lossless=True,quality=100,method=6);blend=src.with_suffix('.blend');path=str(p.relative_to(root));sources[path]={'path':path,'sha256':sha(p),'sourcePNG':str(src.relative_to(root)),'sourcePNGSHA256':sha(src),'nativeBlend':str(blend.relative_to(root)),'nativeBlendSHA256':sha(blend),'width':im.width,'height':im.height,'method':'Whole native mesh/curve sculpture, native camera, lossless RGBA encoding'};return path
for source in sorted((b/'closed-backs-r4').glob('*/*.png')):
 key=source.parent.name;stem=source.stem;original=str(ns/key/(stem+'.webp'));replacements[original]=enc(source,Path('closed-backs-r4')/key/(stem+'.webp'))
def update(x):
 if isinstance(x,str):return replacements.get(x,x)
 if isinstance(x,dict):return {k:update(v) for k,v in x.items()}
 if isinstance(x,list):return [update(v) for v in x]
 return x
m=update(m)
for e in m['accessories']:
 if e['id'] not in ['phones-sky','starter-buddy-headphones','sister-cat-headphones','starter-sun-cap','hair-nebula']:continue
 sku=e['id'];avs=['brother','younger','sister','younger-sister'] if sku=='hair-nebula' else ['brother'];paths={}
 for a in avs:
  rev='catalog-r2' if sku in ['starter-buddy-headphones','sister-cat-headphones'] else 'catalog-r1';source=b/rev/(sku+'--'+a+'.png');paths[a]=enc(source,Path('catalog-r2')/(sku+'--'+a+'.webp'))
 e['catalogPath']=paths['brother'];e['catalogVariants']=paths if sku=='hair-nebula' else {}
paths=set()
def collect(x):
 if isinstance(x,str):paths.add(x)
 elif isinstance(x,list):
  for v in x:collect(v)
 elif isinstance(x,dict):
  for v in x.values():collect(v)
collect(m);manifest=q/'avatarAssetManifest-r2.json';manifest.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n');selected=[row for path,row in sources.items() if path in paths];(q/'lineage-r2.json').write_text(json.dumps({**old,'status':'CANDIDATE_R2_PENDING_8_SKIN_VISUAL_AND_7_HEADPHONE_COMPLETION','manifestSHA256':sha(manifest),'updateBuilderSHA256':sha(Path(__file__)),'sources':selected,'notCovered':['other four headphones Nebula fit','full 480 matrix','390/1440 light/night Shop cancel save reload']},indent=2)+'\n');print(len(selected),manifest)
