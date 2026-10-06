#!/usr/bin/env python3
"""Normalize real reviewed images by exact original/source SHA; formal runtime remains pending."""
import json,hashlib,sys
from pathlib import Path
from qa_v653_release_art import assets,ROOT
OUT=ROOT/'qa/v653/20261005/release-art/final';BASE='qa/v653/20261005';LINE=BASE+'/release-art/lineage/candidate-r6b/index.json'
def path(p):
 p=Path(p);return p if p.is_absolute() else ROOT/p
def rel(p):return str(path(p).relative_to(ROOT))
def sha(p):return hashlib.sha256(path(p).read_bytes()).hexdigest()
def load(p):return json.loads(path(p).read_text())
def link(p,expected=None):
 h=sha(p)
 if expected:assert h==expected,('SHA mismatch',p,h,expected)
 return {'path':rel(p),'sha256':h}
def save(name,obj):(OUT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
index=load(LINE);new=index['newAssets'];pins_path=BASE+'/release-art/final/source-pins.json';pins=load(pins_path)
assert len(new)==198 and len(pins)==106
for p,h in pins.items():assert sha(p)==h,p
candidate={**index['candidate'],'sourcePinsSha256':sha(pins_path)}
for p,k in [('src/data/avatarAssetManifest.json','avatarManifestSha256'),('src/data/worldArtManifest.json','worldManifestSha256')]:assert sha(p)==candidate[k]
orig={};reviews=[];covered=set();source_reviews={};bindings={p:[] for p in new}
def original(p):orig[rel(p)]=link(p);return orig[rel(p)]
def add(image,paths,observation,scope,report,extra=None):
 paths=sorted(set(paths)&set(new))
 if not paths:return
 image=link(image['path'],image['sha256']);r={'image':image,'assetPaths':paths,'verdict':'PASS','observation':observation,'scope':scope,'originalReport':original(report)}
 if extra:r.update(extra)
 reviews.append(r)
 for p in paths:bindings[p].append(len(reviews)-1)
 covered.update(paths)
def source_add(h,image,report,observation,extra=None):source_reviews.setdefault(h,[]).append({'image':image,'report':report,'observation':observation,'extra':extra or {}})
# Actual 240 Shop candidate review: preserved original source pins and scope, not fresh formal runtime.
shop=BASE+'/shop-coverage/final-full-shop-native-r6-candidate-r2';cap=load(shop+'/report.json');original(shop+'/report.json')
assert cap['candidateManifests']['avatar']['sha256']==candidate['avatarManifestSha256'] and cap['candidateManifests']['world']['sha256']==candidate['worldManifestSha256']
for kind in ['desktop','mobile']:
 rp=shop+'/root-'+kind+'-actual-review.json';r=load(rp)
 for row in r['reviews']:
  paths=[]
  for p in row['assetPaths']:
   if p in new:
    assert cap['candidateAssetPins']['/'+p.removeprefix('public/')]==new[p]['sha256']==sha(p);paths.append(p)
  assert row['verdict'].startswith('PASS')
  add(row['image'],paths,row['observation'],'actual-Shop-candidate-screenshot; same asset bytes, current formal runtime separate',rp,{'originalVerdict':row['verdict'],'itemId':row['itemId'],'role':row['avatar'],'profile':row['profile'],'stage':row['stage']})
direct=set(covered)
# Six earwear48 actual reviews; match source bytes, never infer SKU from filename.
for sku in ['starter-buddy-headphones','phones-sky','phones-racer','phones-ai','story-headphones','sister-cat-headphones']:
 rp=BASE+'/wearables/remaining-earwear-repair/'+sku+'/FINAL-review.json';r=load(rp);rootreview=BASE+'/wearables/remaining-earwear-repair/'+sku+'/root-source-fit-review.json';original(rootreview)
 for row in r['rows']:
  assert 'PASS' in row['status'];image=link(row['screenshot'],row['sha256'])
  for layer in row['layers']:
   link(layer['path'],layer['sha256']);source_add(layer['sha256'],image,rp,'Actual individually reviewed source/fit: cup aligns to ear, full native layer and unchanged body. Full Shop lifecycle not implied.',{'role':row['avatar'],'skin':row['skin'],'rootReview':original(rootreview)})
# Legend source/fit rows have explicit overlay/back SHA and actual image SHA.
rp=BASE+'/wearables/phones-candidate/FINAL-depth-r9-review.json';r=load(rp)
for row in r['rows']:
 if 'ACCEPTED' not in row.get('status',''):continue
 image=link(row['screenshot'],row['screenshotSHA256'])
 for layer in row.get('layers',[]):
  link(layer['path'],layer['sha256']);source_add(layer['sha256'],image,rp,'Actual accepted phones-legend exact body-specific source/fit; cup placement and native side layer reviewed. Exact source-to-delivery binding, not a fresh full Shop claim.',{'role':row['avatar'],'skin':row.get('skin')})
 for pkey,hkey in [('overlay','overlaySHA256'),('back','backSHA256')]:
  if pkey in row:link(row[pkey],row[hkey]);source_add(row[hkey],image,rp,'Actual accepted phones-legend source/fit with native cup depth and side layers. Same-source delivery only; current full Shop acceptance separate.')
# Hair32 exact original overlay hashes + inspected screenshot path correspondence.
rp=BASE+'/hair/headwear-candidate-r1/fit-visual-review.json';r=load(rp);capture=load(r['screenshotsSource']);original(r['screenshotsSource']);line=BASE+'/hair/headwear-candidate-r1/delivery-lineage.json';hairpins=load(line);original(line)
for h in hairpins:
 link(h['overlay'],h['overlaySha256']);link(h['delivery'],h['deliverySha256']);assert h['overlaySha256']==h['deliverySha256']
 row=next(x for x in capture['rows'] if x['skin']==h['skin'] and x['hat']=='hat-crown');assert any(i['src']=='/'+h['overlay'] for d in row['dom'] for i in d['images'])
 source_add(h['overlaySha256'],link(row['screenshot'],row['sha256']),rp,'Root actual 224 hair/headwear fits; single crown, no face obstruction, role hair preserved, body fixed. This image covers the exact reviewed source SHA; no full Shop PASS implied.',{'role':h['avatar'],'skin':h['skin'],'sourceLineage':original(line)})
# Root source visual records for world artwork, bound to named native delivery indexes.
for sku,folder,lp,assetkey in [('card-sky','cards/native-r5-candidate','cards/source-delivery-lineage-r5.json','sources_and_deliveries'),('pet-space-fox','pet/runtime-candidate-r1','pet/source-delivery-lineage-r8.json','assets')]:
 rp=BASE+'/blender/'+folder+'/source-review.json';r=load(rp);line=BASE+'/blender/'+lp;rows=load(line)[assetkey];original(line)
 viewed=next(x for x in rows if (x.get('size')==[768,1152] if sku=='card-sky' else x.get('sha256')==r['sourceSha256']))
 source_add(r['sourceSha256'],link(viewed['path'],viewed['sha256']),rp,r.get('visible',r.get('criteria'))+' Source visual only; new derivative RGBA recipe checked independently.',{'reviewedSourceSha256':r['sourceSha256'],'sourceLineage':original(line)})
# Exact per-path new lineage connects source reviews to delivery bytes, including display resize recipe.
for p,d in new.items():
 link(p,d['sha256']);rec=load(d['lineage']['path']);link(d['lineage']['path'],d['lineage']['sha256']);src=rec.get('source',{});h=src.get('sha256');link(src['path'],h)
 if p in covered:continue
 matches=source_reviews.get(h,[]) or source_reviews.get(d['sha256'],[])
 if not matches:continue
 assert not rec['failures'] and rec['codecRecipe'].get('decodedRGBAExact') is True
 m=matches[0];add(m['image'],[p],m['observation'],'source/individual-fit visual with exact source-to-delivery lineage; not current Shop runtime',m['report'],{'sourceBinding':{'reviewedSource':src,'delivery':{'path':p,'sha256':d['sha256']},'operation':rec['operation'],'codecRecipe':rec['codecRecipe'],'lineage':d['lineage']},**m['extra']})
missing=sorted(set(new)-covered)
visual={'schemaVersion':1,'kind':'visual','status':'DRAFT_PENDING_FINAL_FORMAL_RUNTIME','candidate':candidate,'assetPaths':sorted(covered),'reviewer':{'id':'root actual source-fit and240 candidate visual reviewers, normalized by lesson_parent_flow','canViewImages':True},'reviews':reviews,'originalReports':list(orig.values()),'sourceCoverageStatus':'COMPLETE' if not missing else 'INCOMPLETE','counts':{'newAssets':198,'directShopAssetPaths':len(direct),'sourceBoundAdditionalPaths':len(covered-direct),'totalCovered':len(covered),'originalReviewRows':len(reviews)},'missingPaths':missing,'candidateCaptureSourceDrift':{p:{'captureSha256':h,'currentSha256':pins.get(p)} for p,h in cap['sourcePins'].items() if p in pins and pins[p]!=h},'limits':['Source/individual fit acceptance is never full Shop PASS.','Candidate240 screenshot images have exact final asset SHA; their source pins predate narrow final source changes.','Final formal1024/path and trueUI64 acceptance pending; no runtime PASS generated.']}
save('visual.draft.json',visual);save('path-visual-coverage.json',{'candidate':candidate,'paths':{p:{'sha256':new[p]['sha256'],'reviewRows':v,'scope':['direct-Shop-candidate' if p in direct else 'source-fit-only'] if v else []} for p,v in bindings.items()},'missingPaths':missing})
# Negative rows are freshly viewed; bind all release bytes but explicitly declare representative fault scope.
negpath=BASE+'/release-art/final/negative-run/report.json';neg=load(negpath);assert neg['candidate']==candidate and neg['sourcePinsBefore']==pins==neg['sourcePinsAfter']
controls=[]
for r in neg['rows']:
 link(r['screenshot']['path'],r['screenshot']['sha256'])
 if r['id']=='baseline':continue
 assert r['expectedFailureCaught'];controls.append({'id':r['id'],'expectedFailureCaught':True,'assertion':r['assertion'],'report':link(negpath),'image':r['screenshot'],'visualObservation':{'wrong-sku':'Incorrect injected layer removes intended legend hairstyle; exact bytes reject admission.','missing-layer':'Incomplete legend hair hidden; base head, crown and other mixed items remain visible.','stale-art':'Injected old crowned hair creates visible double crown; exact formal byte hash rejects admission.'}[r['id']]})
# Match release gate covered set including retained references whose binding changed.
oldrefs={};refs={}
for kind,p,old in [('avatar','src/data/avatarAssetManifest.json',BASE+'/recovery/avatarAssetManifest.frozen-production.json'),('world','src/data/worldArtManifest.json',BASE+'/blender/cards/native-r5-candidate/worldArtManifest.before-local-card.json')]:
 refs.update({kind+k:v for k,v in assets(load(p)).items()});oldrefs.update({kind+k:v for k,v in assets(load(old)).items()})
changed={v for k,v in refs.items() if oldrefs.get(k)!=v};covered_gate=set(new)|changed
# Fifteen retained body-mask files acquired new manifest bindings; existing actual hair-fit DOM names exact mask URL.
mask_coverage=[];frozen=load(BASE+'/release-art/retained-original-pins.json')['pins'];hair_capture=load(BASE+'/hair/fit-all-skins-r2/report.json');hair_review=BASE+'/hair/headwear-candidate-r1/fit-visual-review.json'
for mask in sorted(covered_gate-set(new)):
 assert sha(mask)==frozen[mask]
 candidates=[row for row in hair_capture['rows'] if any('/'+mask.removeprefix('public/') in im.get('mask','') for d in row['dom'] for im in d['images'])]
 if not candidates:missing.append(mask);continue
 row=candidates[0];reviews.append({'image':link(row['screenshot'],row['sha256']),'assetPaths':[mask],'verdict':'PASS','observation':'Exact retained body hair mask composed in actually reviewed hair/headwear screenshot; visible face/body preserved. Frozen deployed mask bytes unchanged.','scope':'retained mask new binding; root source-fit visual, not final Shop runtime','originalReport':original(hair_review),'maskBinding':{'path':mask,'sha256':frozen[mask]},'domEvidence':original(BASE+'/hair/fit-all-skins-r2/report.json')});mask_coverage.append(mask)
visual['assetPaths']=sorted(covered|set(mask_coverage));visual['originalReports']=list(orig.values());visual['missingPaths']=missing;visual['counts']['retainedMasksWithChangedBinding']=len(mask_coverage);visual['counts']['totalGateAssetPaths']=len(visual['assetPaths']);visual['counts']['originalReviewRows']=len(reviews);visual['sourceCoverageStatus']='COMPLETE' if not missing else 'INCOMPLETE';save('visual.draft.json',visual)
negative={'schemaVersion':1,'kind':'negative','status':'PASS','candidate':candidate,'assetPaths':sorted(covered_gate),'originalReports':[link(negpath),link(BASE+'/release-art/final/negative-runner.py')],'controls':controls,'familyApisBlocked':True,'fixture':'synthetic-local','normalManifestOverrides':False,'normalCssOverrides':False,'negativeImageOverrides':True,'scope':'One formal mixed-item baseline and three representative faults. All198 release asset hashes/source106 bound; not per-SKU exhaustive fault injection. Wrong/stale bytes rejected by QA admission, not a claim production browser cryptographically rejects images.','actualVisualReview':{'reviewer':'lesson_parent_flow','canViewImages':True,'images':[r['screenshot'] for r in neg['rows']]}}
save('negative.json',negative);save('runtime.pending.json',{'schemaVersion':1,'kind':'runtime','status':'PENDING_FINAL_FORMAL_REPORTS','candidate':candidate,'assetPaths':[],'originalReports':[],'missing':['formal1024/path report acceptance','trueUI64 current acceptance'],'currentMotionProof':link(BASE+'/release-art/retained-motion/current-r2/current-proof.json')})
save('assembly-status.json',{'status':'DRAFT_SOURCE_VISUAL_COMPLETE_RUNTIME_PENDING' if not missing else 'DRAFT_INCOMPLETE','counts':visual['counts'],'missingPaths':missing,'sourcePins':link(pins_path),'lineageIndex':link(LINE),'visual':link(OUT/'visual.draft.json'),'negative':link(OUT/'negative.json'),'runtime':link(OUT/'runtime.pending.json'),'currentMotionProof':link(BASE+'/release-art/retained-motion/current-r2/current-proof.json')})
for p,h in pins.items():assert sha(p)==h,'Source changed during evidence assembly: '+p
print(json.dumps({'coverage':len(covered),'missing':missing,'reviewRows':len(reviews)},ensure_ascii=False))
