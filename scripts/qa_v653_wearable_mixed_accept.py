"""Record individually completed visual review; never infer visual acceptance from a functional PASS."""
import argparse,json,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--attempt',required=True);p.add_argument('--rows',required=True,type=int);p.add_argument('--notes',required=True);a=p.parse_args();root=Path(__file__).resolve().parents[1];out=root/'qa/v653/20261005/wearables'/a.attempt;r=json.loads((out/'report.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();assert r['candidateSha256']=='8a508d93e6d2ea29530f1b9a4012b2c63cb729c9758976f6adc921dabce3002a';assert sha(root/r['candidate'])==r['candidateSha256'];assert all(sha(root/p)==h for p,h in r['sourcePins'].items());assert len(r['cases'])>=a.rows
rows=[]
for case in r['cases'][:a.rows]:
 assert case['status']=='PASS_FUNCTIONAL_SAME_CANDIDATE';assert sha(root/case['shopScreenshot'])==case['shopScreenshotSha256'];rows.append({k:case[k] for k in ['avatar','skin','profile','shopScreenshot','shopScreenshotSha256']})
expected=128 if r['phone']=='phones-legend' else 16;assert a.rows<=expected
result={'sku':r['phone'],'candidateSHA256':r['candidateSha256'],'sourcePins':r['sourcePins'],'functionalReport':str((out/'report.json').relative_to(root)),'functionalReportSHA256':sha(out/'report.json'),'expectedCases':expected,'visuallyReviewedCases':a.rows,'status':'PASS_SCOPED_MIXED_LIFECYCLE_AND_VISUAL' if a.rows==expected and r['status']=='PASS_FUNCTIONAL_SAME_CANDIDATE' else 'PARTIAL_VISUAL_REVIEW','visualReviewer':'wearable_reproduction','visualNotes':a.notes,'scope':'Isolated local same candidate hair-legend + hat-crown + SKU mixed Shop trial/cancel/equip/Home/reload/Achievement; 4 roles and 390/1440 light/dark. No full release claim.','rows':rows}
(out/'visual-review.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(result['sku'],result['status'],a.rows)
