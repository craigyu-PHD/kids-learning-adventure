"""Record only images explicitly viewed by the reviewing agent."""
import argparse,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'qa/v653/20261005/shop-coverage'
p=argparse.ArgumentParser();p.add_argument('--items',required=True);p.add_argument('--avatars',default='brother,younger,sister,younger-sister');p.add_argument('--status',default='VIEWED_NO_SINGLE_ITEM_DEFECT');p.add_argument('--note',required=True);a=p.parse_args();path=BASE/'visual-review.json';r=json.loads(path.read_text())
for item in a.items.split(','):
 for avatar in a.avatars.split(','):
  shot=BASE/'baseline252-r1'/avatar/(item+'--trial.png')
  row={'item':item,'avatar':avatar,'screenshot':str(shot.relative_to(ROOT)),'sha256':hashlib.sha256(shot.read_bytes()).hexdigest(),'review':a.status,'note':a.note}
  r['rows']=[x for x in r['rows'] if (x['item'],x['avatar'])!=(item,avatar)];r['rows'].append(row)
r['reviewedCount']=len(r['rows']);path.write_text(json.dumps(r,ensure_ascii=False,indent=2));print(r['reviewedCount'])
