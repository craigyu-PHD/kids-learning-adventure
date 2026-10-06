"""Evidence-only contact sheets. Does not modify source or runtime images."""
import json,argparse
from pathlib import Path
from PIL import Image,ImageDraw
p=argparse.ArgumentParser();p.add_argument('report');args=p.parse_args();report=Path(args.report);rows=json.loads(report.read_text())['rows']
for start in range(0,len(rows),4):
 batch=rows[start:start+4];c=Image.new('RGB',(400*len(batch),850),'#e8edf4');dr=ImageDraw.Draw(c)
 for j,r in enumerate(batch):
  im=Image.open(r['screenshot']).convert('RGB');w,h=im.size;full=im.copy();full.thumbnail((400,610));c.paste(full,(400*j+(400-full.width)//2,28));dr.text((400*j+5,5),f"{start+j}: {r.get('avatar')} {r.get('skin')} {r.get('theme')}",fill='black')
  # Additional head-only detail from the same screenshot pixels.
  head=im.crop((w*.18,h*.20,w*.82,h*.54));head.thumbnail((390,220));c.paste(head,(400*j+(400-head.width)//2,625))
 c.save(report.parent/f'review-{start:02}.png')
