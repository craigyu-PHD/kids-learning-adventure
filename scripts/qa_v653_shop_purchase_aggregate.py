"""Aggregate exactly43 passed r1 rows +21 fresh r2 rows; never rewrite r1 FAIL."""
import json,hashlib
from collections import Counter
from pathlib import Path
root=Path(__file__).resolve().parents[1];base=root/'qa/v653/20261005/shop-coverage';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();load=lambda p:json.loads(p.read_text())
freeze=root/'qa/v653/20261005/release-art/final/source-pins.json';pins=load(freeze);expected='156bf02b0153d96bbf7feadd8b1ca2e982394acb0f8ef136e901a58f4beb6c8d';assert sha(freeze)==expected and len(pins)==106
assert all(sha(root/p)==h for p,h in pins.items())
f1=load(base/'purchase-ui-formal-r1-source-freeze.json');f2=load(base/'purchase-ui-formal-r2-source-freeze.json')
assert f1['before106Match'] and f1['after106Match'] and f1['rootFreezeUnchanged'] and f1['exitCode']==1
assert f2['status']=='PASS_PROCESSES_AND_ROOT_FREEZE' and all(j['exitCode']==0 and j['sourceAfterExact'] for j in f2['jobs'])
rows=[];reports=[];visuals=[];originals={};inventory=None
for attempt,limit in [('formal-r1',43),('formal-remaining-r2',21)]:
 folder=base/('purchase-ui-'+attempt);rp=folder/'report.json';vp=folder/'visual-review.json';r=load(rp);v=load(vp)
 assert r['formal'] and not r['manifestOverride'] and not r['cssOverride'] and r['runtimeInventoryCostMatches'] and r['runtimeFormalManifestsMatch']
 assert r['status']==('FAIL' if attempt=='formal-r1' else 'PASS_SELECTED_UI_PURCHASE_ONLY')
 assert all(r['sourcePins'][p]==h for p,h in pins.items() if p in r['sourcePins'])
 assert r['candidateManifests']['avatar']['sha256']=='8a508d93e6d2ea29530f1b9a4012b2c63cb729c9758976f6adc921dabce3002a'
 assert r['candidateManifests']['world']['sha256']=='50579bb6ee962d5456345cd0f7a4d8868398545ca492afb430acd5e72b945e6d'
 assert v['functionalReportSHA256AtReview']==sha(rp) and v['reviewedSKUCount']==limit
 visual={x['sku']:x for x in v['rows']};inventory=r['inventory'] if inventory is None else inventory;assert inventory==r['inventory']
 reports.append({'path':str(rp.relative_to(root)),'sha256':sha(rp),'originalStatus':r['status'],'selectedOriginalRowIndices':list(range(limit)),'allCaseCount':len(r['cases'])})
 visuals.append({'path':str(vp.relative_to(root)),'sha256':sha(vp),'selectedSKUCount':limit})
 for i,c in enumerate(r['cases'][:limit]):
  sku=c['item']['id'];assert c['status']=='PASS_UI_PURCHASE_CURRENT_COST_ONCE';assert c['childIsolation'] and c['reloadPreservesLedger'] and c['blankPageSeed']
  for child in c['initialProgress'].values():
   assert all(child[k]==[] for k in ['unlockedCosmetics','equippedCosmetics','purchaseTransactions','equipmentTransactions'])
  cost=c['item']['cost'];assert c['purchaseTransaction']['cost']==cost
  assert c['rewardsBefore']['coins']==10000 and c['rewardsBefore']['spentCoins']==0 and c['rewardsAfter']['coins']==10000-cost and c['rewardsAfter']['spentCoins']==cost
  p=c['finalProgress']['child-1'];assert len(p['purchaseTransactions'])==len(p['equipmentTransactions'])==1
  assert p['purchaseTransactions'][0]==c['purchaseTransaction'] and p['equipmentTransactions'][0]==c['equipmentEvent']
  assert c['finalProgress']['child-2']==c['initialProgress']['child-2']
  assert c['purchaseRetry']['sameObject'] and c['purchaseRetry']['unchanged'] and c['equipRetry']['sameObject']
  images=[]
  for phase,rec in c.items():
   if isinstance(rec,dict) and 'screenshot' in rec:
    assert sha(root/rec['screenshot'])==rec['screenshotSHA256'];images.append({'phase':phase,'path':rec['screenshot'],'sha256':rec['screenshotSHA256']});originals[rec['screenshot']]=rec['screenshotSHA256']
  vr=visual[sku];assert vr['status']=='PASS_VISUALLY_REVIEWED' and len(vr['images'])==3
  rows.append({'sku':sku,'cost':cost,'avatar':c['avatar'],'profile':c['profile']['id'],'sourceReport':str(rp.relative_to(root)),'sourceReportSHA256':sha(rp),'sourceRowIndex':i,'rowSHA256':hashlib.sha256(json.dumps(c,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest(),'functionalStatus':c['status'],'purchaseTransaction':c['purchaseTransaction'],'equipmentEvent':c['equipmentEvent'],'screenshots':images,'visualReview':vr})
assert len(rows)==len({r['sku'] for r in rows})==64 and {r['sku'] for r in rows}=={i['id'] for i in inventory}
summary={'status':'PASS_FORMAL_64_UNIQUE_UI_PURCHASE_AND_SCOPED_VISUAL','scope':'64 unique SKU actual UI purchase and equip;43 r1 successful original rows plus21 fresh r2 rows. Original r1 overallFAIL is preserved.','candidateId':'v6.5.3-formal-mf6','formal':True,'manifestOverride':False,'cssOverride':False,'rootSourceFreezePath':str(freeze.relative_to(root)),'rootSourceFreezeSHA256':expected,'root106CurrentMatch':True,'sourceBeforeAfterEvidence':[{'path':str((base/n).relative_to(root)),'sha256':sha(base/n)} for n in ['purchase-ui-formal-r1-source-freeze.json','purchase-ui-formal-r2-source-freeze.json']], 'originalReports':reports,'visualEvidence':visuals,'uniqueSKUCount':64,'paidSKUCount':sum(r['cost']>0 for r in rows),'legitimateFreeSKUCount':sum(r['cost']==0 for r in rows),'currentCostSumSyntheticCoins':sum(r['cost'] for r in rows),'roleCounts':dict(Counter(r['avatar'] for r in rows)),'profileCounts':dict(Counter(r['profile'] for r in rows)),'visuallyReviewedImageCount':192,'verifiedOriginalScreenshotCount':len(originals),'sessions':{'paidPetSmoke':{'id':78214,'exit':0},'initial64Attempt':{'id':4199,'exit':1,'successfulRows':43},'worldSmokeAndRemaining21':{'id':19374,'exit':0}},'retryScope':'First purchase and equipment actual UI; owned purchase action absent and reentry no charge. Same-event service retry pure memory on UI-created ledger, without storage write.','limitations':['Synthetic local-only RewardTransaction funds; real earning UI, real families, auth/cloud and deployedProduction are not covered.','One role/profile per SKU, rotating four roles and four profiles; this is not256SKU-role matrix.','Reduced-motion static item visuals only. Room scene is dashboard background, substantially occluded by content cards.','Initial r1 room failure was wrong QA selector(.v4-ai-companion);r2 uses actual .v4-dashboard-grid computed expectedvariant and bytes. No product source modified.'],'rows':rows,'aggregationScriptSHA256':sha(Path(__file__))}
out=base/'purchase-ui-formal-64-aggregate-r2.json';out.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':summary['status'],'file':str(out.relative_to(root)),'sha256':sha(out),'paid':summary['paidSKUCount'],'free':summary['legitimateFreeSKUCount'],'visuals':192,'originalPNGs':len(originals)},ensure_ascii=False))
