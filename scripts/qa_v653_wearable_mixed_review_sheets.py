"""QA-only review sheets from hash-verified actual Shop captures, one SKU per invocation."""
import argparse,json,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
p=argparse.ArgumentParser();p.add_argument('--attempt',required=True);p.add_argument('--count',type=int,default=1000);a=p.parse_args();root=Path(__file__).resolve().parents[1];base=root/'qa/v653/20261005/wearables'/a.attempt;report=json.loads((base/'report.json').read_text());out=base/'review-sheets';out.mkdir(exist_ok=True);rows=[r for r in report['cases'][:a.count] if r.get('shopScreenshot')];made=[]
for k in range(0,len(rows),4):
 if len(rows[k:k+4])!=4:continue
 sheet=Image.new('RGB',(1600,1040),'#e4eaf4');d=ImageDraw.Draw(sheet)
 for j,row in enumerate(rows[k:k+4]):
  file=root/row['shopScreenshot'];assert hashlib.sha256(file.read_bytes()).hexdigest()==row['shopScreenshotSha256'];im=Image.open(file).convert('RGB');small=im.copy();small.thumbnail((396,600));sheet.paste(small,(400*j+(396-small.width)//2,50));d.text((400*j+5,8),report['phone'],fill='black');d.text((400*j+5,25),row['profile']+' / '+row['avatar']+' / '+row['skin'],fill='black')
  w,h=im.size;crop=im.crop((int(w*.15),int(h*.22),int(w*.85),int(h*.62)));crop.thumbnail((396,365));sheet.paste(crop,(400*j+(396-crop.width)//2,665))
 name=f'shop-{k+1:03}-{k+4:03}.jpg';sheet.save(out/name,quality=97);made.append({'path':str((out/name).relative_to(root)),'rows':[{'avatar':r['avatar'],'skin':r['skin'],'profile':r['profile'],'original':r['shopScreenshot'],'originalSHA256':r['shopScreenshotSha256']} for r in rows[k:k+4]]})
(out/'index.json').write_text(json.dumps({'sku':report['phone'],'candidateSHA256':report['candidateSha256'],'sheets':made,'status':'AWAITING_INDIVIDUAL_VISUAL_REVIEW'},indent=2)+'\n');print(len(made),'sheets',len(made)*4,'cases',out)
