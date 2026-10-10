"""Verify and summarize completed MF6 isolated mixed lifecycle evidence."""
import hashlib,json
from datetime import datetime,timezone
from pathlib import Path
root=Path(__file__).resolve().parents[1];base=root/'qa/v653/20261005/wearables';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
mf=base/'native-delivery-r6/candidate-avatar-manifest.json';mh='8a508d93e6d2ea29530f1b9a4012b2c63cb729c9758976f6adc921dabce3002a';assert sha(mf)==mh
skus=['phones-legend','story-headphones','phones-sky','phones-racer','starter-buddy-headphones','phones-ai','sister-cat-headphones'];products=[];pins=None;allrows=[];exact=0;fresh=0
for sku in skus:
 attempt=('final-native-mixed-r2b--' if sku=='phones-legend' else 'final-native-mixed-r2--')+sku;d=base/attempt;rp=d/'report.json';vp=d/'visual-review.json';r=json.loads(rp.read_text());v=json.loads(vp.read_text());n=128 if sku=='phones-legend' else 16
 assert r['status']=='PASS_FUNCTIONAL_SAME_CANDIDATE' and len(r['cases'])==n and r['candidateSha256']==mh
 assert v['status']=='PASS_SCOPED_MIXED_LIFECYCLE_AND_VISUAL' and v['visuallyReviewedCases']==n and v['functionalReportSHA256']==sha(rp)
 assert all(sha(root/p)==h for p,h in r['sourcePins'].items())
 production={p:h for p,h in r['sourcePins'].items() if p.startswith('src/')}
 if pins is None:pins=production
 assert pins==production
 assert len({(c['avatar'],c['skin'],c['profile']) for c in r['cases']})==n
 for c in r['cases']:
  assert c['status']=='PASS_FUNCTIONAL_SAME_CANDIDATE' and c['ledgerEvents']==2 and c['bodyFrameDelta']<.05 and not c['pageErrors'] and c['overflow']<=1
  seed=c['initialLedger'];assert seed['appAbsentDuringSeed'] and seed['exactProgressMatch'];expected=['fixture-equip-hair-legend']+([] if c['skin']=='default' else ['fixture-equip-'+c['skin']]);assert seed['eventIds']==expected
  assert len(c['newEquipmentEvents'])==2 and {e['itemId'] for e in c['newEquipmentEvents']}=={'hat-crown',sku}
  assert len(c['bodyChecks'])==6 and all(x['maxDelta']<.05 for x in c['bodyChecks'])
  assert set(c['snapshotBarrier']['expectedItems'])<=set(c['snapshotBarrier']['renderedItems'].split())
  assert sha(root/c['shopScreenshot'])==c['shopScreenshotSha256'] and sha(root/c['screenshot'])==c['screenshotSha256']
 allrows+=r['cases']
 for row in v['rows']:
  if row['exactPNGBytesMatch']:exact+=1
  else:assert row['freshVisualReview']['status']=='PASS_VISUALLY_REVIEWED';fresh+=1
 script='scripts/qa_v653_wearable_mixed_lifecycle_sorted.py' if sku=='phones-legend' else 'scripts/qa_v653_mixed_lifecycle.py'
 products.append({'sku':sku,'cases':n,'report':str(rp.relative_to(root)),'reportSHA256':sha(rp),'visualReview':str(vp.relative_to(root)),'visualReviewSHA256':sha(vp),'command':['python3',script,'--candidate',str(mf.relative_to(root)),'--attempt',attempt,'--phone',sku]+([] if sku=='phones-legend' else ['--skins','default'])})
neg=root/'qa/v653/20261005/hair/final-native-mf6-negative-r2/report.json';nr=json.loads(neg.read_text());assert nr['status']=='PASS_BASELINE_AND_4_NEGATIVE_CONTROLS' and nr['candidateSha256']==mh
nv=neg.parent/'visual-review.json';assert json.loads(nv.read_text())['status']=='PASS_SAME_EXACT_VISUAL_BYTES'
for c in nr['rows']:assert sha(root/c['screenshot'])==c['screenshotSha256']
result={'status':'PASS_SCOPED_MF6_MIXED_224_AND_NEGATIVES','atUTC':datetime.now(timezone.utc).isoformat(),'candidate':str(mf.relative_to(root)),'candidateSHA256':mh,'sourcePins':pins,'functionalCases':len(allrows),'visuallyReviewedShopCases':exact+fresh,'freshCaptureExactPreviouslyReviewedPNG':exact,'freshDifferingPNGsIndividuallyReviewed':fresh,'bodyComparisons':sum(len(c['bodyChecks']) for c in allrows),'maxBodyDelta':max(c['bodyFrameDelta'] for c in allrows),'exactInitialLedgerCases':len(allrows),'twoExactNewEquipEventsCases':len(allrows),'products':products,'sessions':[{'id':81066,'scope':'legend128 sorted seed','exitCode':0},{'id':71410,'scope':'negative + six-earwear sequential96','exitCode':0}],'negative':{'report':str(neg.relative_to(root)),'sha256':sha(neg),'visualReview':str(nv.relative_to(root)),'visualReviewSHA256':sha(nv),'status':nr['status'],'scope':'Candidate admission rejects wrong role/item/stale bytes; missing layer additionally raises Renderer wearable failure.'},'priorAttempts':{'r1':'224 functional and individually viewed actual Shop images; initial App unload isolation not established. Retained as scoped visual baseline, not final gate.','r2Legend':'Second case rejected exact initial progress because seed inventory/purchases ordering differed from canonical App sort. Equipment events unchanged; isolated diagnostic retained. Fixed by sorting seed inventory, not weakening equality.'},'limitations':['Isolated synthetic fixture, all family APIs blocked; no real cloud/account operations.','MF6 candidate via route override only. Formal manifest without override and full release gates remain separate.','Legend covers all eight bodies. Other six SKUs cover default body only.','Only enumerated wearable source pins frozen; unrelated robot/version work is outside scope.'],'writes':'Only QA harnesses and QA evidence; no source/public/manifest mutation.'}
p=base/'final-native-mixed-r2-summary.json';p.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(p,sha(p),'cases',len(allrows),'body',result['bodyComparisons'],'delta',result['maxBodyDelta'],'exact',exact,'fresh',fresh)
