from pathlib import Path
from PIL import Image,ImageFilter
import json,hashlib
m={x['id']:x for x in json.load(open('src/data/avatarAssetManifest.json'))['accessories']};out=Path('art-source/v653/headwear-feedback-r2')
for a in ['younger','sister','younger-sister']:
 p=Path(m['hair-nebula']['defaultSkinDetails'][a]['overlay']);im=Image.open(p).convert('RGBA');alpha=im.getchannel('A').filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(.7));pad=im.height-1536;step=1;box=alpha.getbbox();x0,y0,x1,y1=box
 points=[];rows=[]
 for y in range(max(0,y0-3),y1+3,step):
  rows.append([int(alpha.getpixel((x,y))>80) if x<im.width and y<im.height else 0 for x in range(max(0,x0-3),x1+3,step)])
 data={'avatar':a,'reference':str(p),'referenceSHA256':hashlib.sha256(p.read_bytes()).hexdigest(),'usage':'alpha contour only, no raster RGB/material/image texture is imported into native scene','origin':[max(0,x0-3),max(0,y0-3)-pad],'step':step,'mask':rows,'part':{'younger':[548,105],'sister':[585,98],'younger-sister':[544,102]}[a]}
 (out/f'{a}-hair-shape-reference-r3.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
