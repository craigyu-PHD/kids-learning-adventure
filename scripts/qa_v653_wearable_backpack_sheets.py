from pathlib import Path
import json,argparse
from PIL import Image,ImageDraw
p=argparse.ArgumentParser();p.add_argument('report');a=p.parse_args();root=Path(__file__).resolve().parents[1];rp=root/a.report;report=json.loads(rp.read_text());out=rp.parent/'review-sheets';out.mkdir(exist_ok=True)
for k in range(0,len(report['cases']),4):
 sheet=Image.new('RGB',(1600,1000),'#e4eaf4');d=ImageDraw.Draw(sheet)
 for j,row in enumerate(report['cases'][k:k+4]):
  path=root/row['screenshot'];im=Image.open(path).convert('RGB');im.thumbnail((396,600));sheet.paste(im,(j*400,30));d.text((j*400+6,8),row['role']+' / '+row['skin'],fill='black')
  av=Image.open(path.with_name(path.stem+'--avatar.png')).convert('RGB');w,h=av.size;crop=av.crop((int(w*.1),int(h*.20),int(w*.9),int(h*.58)));crop.thumbnail((396,365));sheet.paste(crop,(j*400,625))
 sheet.save(out/f'actual-{k+1:02}-{min(k+4,len(report["cases"])):02}.jpg',quality=96)
print(out)
