"""QA-only contact sheets with original screenshot SHA256 lineage, four SKU columns."""
import argparse,json,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
p=argparse.ArgumentParser();p.add_argument('--attempt',required=True);p.add_argument('--count',type=int,default=0);a=p.parse_args()
root=Path(__file__).resolve().parents[1];folder=root/'qa/v653/20261005/shop-coverage'/('purchase-ui-'+a.attempt);r=json.loads((folder/'report.json').read_text());cases=r['cases'][:a.count or None];out=folder/'review-sheets';out.mkdir(exist_ok=True);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();index=[]
for start in range(0,len(cases),4):
 rows=cases[start:start+4]
 sheet=Image.new('RGB',(1680,1720),'#e4eaf2');draw=ImageDraw.Draw(sheet);parts=[]
 for col,c in enumerate(rows):
  assert c['status']=='PASS_UI_PURCHASE_CURRENT_COST_ONCE'
  ident=c['item']['id'];draw.text((col*420+8,8),ident,fill='black');draw.text((col*420+8,25),f"{c['avatar']} / {c['profile']['id']} / cost={c['item']['cost']}",fill='black')
  for label,key,top,height in [('PURCHASED','ownedCard',55,480),('EQUIPPED','equippedShop',570,630),('HOME','homeWorld' if 'homeWorld' in c else 'home',1240,465)]:
   rec=c[key];path=root/rec['screenshot'];assert sha(path)==rec['screenshotSHA256'];im=Image.open(path).convert('RGB');im.thumbnail((404,height));sheet.paste(im,(col*420+(420-im.width)//2,top));draw.text((col*420+8,top-17),label,fill='#243856');parts.append({'sku':ident,'phase':key,'original':rec['screenshot'],'originalSHA256':rec['screenshotSHA256']})
 name=f'skus-{start+1:02d}-{start+len(rows):02d}.jpg';path=out/name;sheet.save(path,quality=95);index.append({'sheet':str(path.relative_to(root)),'sha256':sha(path),'images':parts})
(out/'index.json').write_text(json.dumps(index,indent=2)+'\n');print(len(index),'sheets',len(cases),'SKU')
