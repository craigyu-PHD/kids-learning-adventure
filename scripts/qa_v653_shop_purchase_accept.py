"""Record only actually viewed purchase/equip/Home screenshots; no inferred visual PASS."""
import argparse,json,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--attempt',required=True);p.add_argument('--start',type=int,required=True);p.add_argument('--end',type=int,required=True);p.add_argument('--note',required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'qa/v653/20261005/shop-coverage'/('purchase-ui-'+a.attempt);rp=out/'report.json';r=json.loads(rp.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();vp=out/'visual-review.json';v=json.loads(vp.read_text()) if vp.exists() else {'reviewer':'wearable_reproduction','scope':'Actual UI purchased-card/equipped-Shop/Home screenshots per SKU; does not claim all roles or motion acceptance.','rows':[]}
assert 1<=a.start<=a.end<=len(r['cases'])
by={x['sku']:x for x in v['rows']}
for c in r['cases'][a.start-1:a.end]:
 assert c['status']=='PASS_UI_PURCHASE_CURRENT_COST_ONCE';images=[]
 for key in ['ownedCard','equippedShop','homeWorld' if 'homeWorld' in c else 'home']:
  rec=c[key];assert sha(root/rec['screenshot'])==rec['screenshotSHA256'];images.append({'phase':key,'path':rec['screenshot'],'sha256':rec['screenshotSHA256']})
 by[c['item']['id']]={'sku':c['item']['id'],'avatar':c['avatar'],'profile':c['profile']['id'],'status':'PASS_VISUALLY_REVIEWED','note':a.note,'images':images}
v['rows']=list(by.values());v['reviewedSKUCount']=len(v['rows']);v['reviewedImageCount']=sum(len(x['images']) for x in v['rows']);v['status']='PASS_64_UI_VISUAL_SCOPE' if len(v['rows'])==64 and r['status']=='PASS_FORMAL_64_UI_PURCHASE_CURRENT_COST_ONCE' else 'PARTIAL_VISUAL_REVIEW';v['functionalReport']=str(rp.relative_to(root));v['functionalReportSHA256AtReview']=sha(rp);vp.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');print(v['status'],v['reviewedSKUCount'],v['reviewedImageCount'])
