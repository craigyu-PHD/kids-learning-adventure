"""Bind fresh mixed lifecycle screenshots to previously viewed exact PNG bytes."""
import argparse, hashlib, json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--attempt',required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1];base=root/'qa/v653/20261005/wearables';out=base/a.attempt
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
rp=out/'report.json';r=json.loads(rp.read_text());sku=r['phone'];prior=base/('final-native-mixed-r1--'+sku);pv=prior/'visual-review.json';v=json.loads(pv.read_text());old={(c['avatar'],c['skin'],c['profile']):c for c in v['rows']}
assert r['candidateSha256']==v['candidateSHA256']==sha(root/r['candidate'])
assert all(sha(root/p)==h for p,h in r['sourcePins'].items())
fresh_path=out/'fresh-visual-review.json'
fresh=json.loads(fresh_path.read_text())['rows'] if fresh_path.exists() else []
fresh_by={(c['avatar'],c['skin'],c['profile']):c for c in fresh}
rows=[];changed=[]
for c in r['cases']:
 assert c['status']=='PASS_FUNCTIONAL_SAME_CANDIDATE'
 assert c['initialLedger']['appAbsentDuringSeed'] and c['initialLedger']['exactProgressMatch']
 assert len(c['newEquipmentEvents'])==2 and {e['itemId'] for e in c['newEquipmentEvents']}=={'hat-crown',sku}
 assert len(c['bodyChecks'])==6 and all(x['maxDelta']<.05 for x in c['bodyChecks'])
 assert set(c['snapshotBarrier']['expectedItems'])<=set(c['snapshotBarrier']['renderedItems'].split())
 path=root/c['shopScreenshot'];assert sha(path)==c['shopScreenshotSha256'];o=old[(c['avatar'],c['skin'],c['profile'])];assert sha(root/o['shopScreenshot'])==o['shopScreenshotSha256']
 row={k:c[k] for k in ['avatar','skin','profile','shopScreenshot','shopScreenshotSha256']}
 row.update(priorVisuallyReviewedScreenshot=o['shopScreenshot'],priorSHA256=o['shopScreenshotSha256'],exactPNGBytesMatch=c['shopScreenshotSha256']==o['shopScreenshotSha256'])
 rows.append(row)
 if not row['exactPNGBytesMatch']:
  f=fresh_by.get((c['avatar'],c['skin'],c['profile']))
  if f and f['shopScreenshotSha256']==c['shopScreenshotSha256'] and f['status']=='PASS_VISUALLY_REVIEWED':row['freshVisualReview']=f
  else:changed.append(row)
expected=128 if sku=='phones-legend' else 16
status='PASS_SCOPED_MIXED_LIFECYCLE_AND_VISUAL' if len(rows)==expected and r['status']=='PASS_FUNCTIONAL_SAME_CANDIDATE' and not changed else 'NEEDS_CHANGED_IMAGE_REVIEW' if changed else 'PARTIAL_EXACT_VISUAL_MATCH'
result={'status':status,'sku':sku,'candidateSHA256':r['candidateSha256'],'functionalReport':str(rp.relative_to(root)),'functionalReportSHA256':sha(rp),'sourcePins':r['sourcePins'],'expectedCases':expected,'visuallyReviewedCases':len(rows)-len(changed),'reviewBasis':'Fresh screenshots either SHA256-equal to individually viewed r1 PNGs, or separately inspected and pinned in fresh-visual-review.json. Unreviewed differences prevent acceptance.','freshVisualReview':str(fresh_path.relative_to(root)) if fresh_path.exists() else None,'freshVisualReviewSHA256':sha(fresh_path) if fresh_path.exists() else None,'priorVisualReview':str(pv.relative_to(root)),'priorVisualReviewSHA256':sha(pv),'visualNotes':v['visualNotes'],'rows':rows,'changedImages':changed,'scope':'MF6 isolated local candidate only; no formal manifest or full release claim.'}
(out/'visual-review.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(sku,status,'reviewed',len(rows)-len(changed),'changed',len(changed))
