"""Audit immutable FreshShop raw evidence, then emit exact gate pointer bindings.
The separate observation raw preserves original report, row index and control mode.
"""
import argparse,hashlib,json
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path.cwd().resolve();sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def ref(p):return {'path':str(Path(p).resolve().relative_to(ROOT)),'sha256':sha(p)}
def write(p,o):assert not p.exists();p.write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n')
def capture(c):
 return bool(c and c.get('proof',{}).get('images') and c.get('assets') and c.get('naturalDimensionProof')) and all(((x.get('dimensionsExact') is True and x['domNatural']==x['pinnedFileSize']) or (x.get('densityCorrected') is True and x.get('dimensionsValid') is True and x.get('aspectMatches') is True and all(v.get('selectedDescriptorMatchesPinnedWidth') is True and v.get('aspectMatches') is True for v in x.get('validation',[])) and bool(x.get('validation')))) and x['http']['status']==200 and x['http']['sha256']==x['expectedSHA256'] for x in c['naturalDimensionProof'])
def healthy(c):return c['health']['overflow']<=1 and not c['health']['broken'] and not c['health']['errors']
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--kind',choices=['regression','workflow','negative'],required=True);ap.add_argument('--raw',type=Path,action='append',required=True);ap.add_argument('--http-receipt',type=Path,required=True);ap.add_argument('--runner',type=Path,required=True);ap.add_argument('--out',type=Path,required=True);a=ap.parse_args();a.out.mkdir(parents=True,exist_ok=False)
 h=json.loads(a.http_receipt.read_text());assert h['status']=='PASS' and h['sourceAndArtifactsUnchangedBeforeAndAfterHTTP'] is True
 for key in ['sourcePins','artifactPins']:assert sha(ROOT/h[key]['path'])==h[key]['sha256']
 artifact_map=json.loads((ROOT/h['artifactPins']['path']).read_text());records=[];raws=[];seen=set()
 for path in a.raw:
  r=json.loads(path.read_text());rr=ref(path);raws.append(rr);assert r['browserClosed'] is True and r['status'].startswith('PASS')
  assert r['sourcePinsSHA256']==h['sourcePins']['sha256'] and r['artifactPinsSHA256']==h['artifactPins']['sha256'] and r['runnerSHA256']==sha(a.runner)
  for dep,digest in r.get('preservedRunnerDependencies',{}).items():assert sha(ROOT/dep)==digest,'preserved wrapper dependency changed'
  assert not r['networkErrors'] and not r['sourceRequests']
  assert r['compiledDocuments'] and r['compiledAssets'],'missing actual browser compiled HTTP evidence'
  for path,proof in r['compiledDocuments'].items():assert proof['status']==200 and proof['sha256']==artifact_map['index.html']
  for path,proof in r['compiledAssets'].items():assert proof['status']==200 and proof['sha256']==artifact_map[path.lstrip('/')]
  if a.kind=='workflow':assert r['selectedMatrixCount']==80 and set(r['items'])=={'hair-nebula','starter-sun-cap','starter-buddy-headphones','phones-sky','sister-cat-headphones'},'workflow must be independently run on exactly the five changed items, not reuse 1024 regression'
  baselines={(x['itemId'],x['avatar']) for x in r.get('controls',[]) if x['mode']=='baseline' and x['status']=='PASS_BASELINE'}
  for i,row in enumerate(r['controls'] if a.kind=='negative' else r['cases']):
   if a.kind=='negative':
    mode=row['mode']
    if mode=='baseline':assert row['status']=='PASS_BASELINE';continue
    names={'wrong-role':'wrong-avatar','missing':'missing-layer','swapped':'swapped-item','stale':'stale-candidate'};control=names[mode]
    assert (row['itemId'],row['avatar']) in baselines,'negative lacks actual passing baseline';expected_hash=artifact_map[row['runtimeRequestedPath'].lstrip('/')]
    passed=row['status']=='PASS_NEGATIVE_REJECTED' and row['ledgerUnchanged'] is True and row['runtimeRequestedPath'].startswith('/assets/') and bool(row.get('reasons'))
    if mode=='missing':passed=passed and row['byteProof']['status']==404 and bool(row.get('visibleFailureUI'))
    else:passed=passed and row['byteProof']['status']==200 and row['byteProof']['sha256']!=expected_hash and 'EXACT_CANDIDATE_BROWSER_BYTES_MISMATCH' in row['reasons']
    values={'control':control};checks={'rejected':bool(passed)};record={'expectedCandidateSHA256':expected_hash,'originalMode':mode,'itemId':row['itemId'],'role':row['avatar']}
   else:
    assert row['status']=='PASS_FUNCTIONAL_PENDING_VISUAL'
    item=row['item']['id'];values={'role':row['avatar'],'itemId':item,'profile':str(row['profile']['width'])+'-'+row['profile']['theme']};record={'originalMatrixIndex':row['originalMatrixIndex']}
    cs=[row[k] for k in ['trial','equipped','home','homeReload','achievement','homeWorld','homeWorldReload'] if k in row]
    if a.kind=='regression':checks={'correctItem':bool(row['exactCandidatePaths']) and all(row['exactCandidatePaths'].values()),'imageLoaded':all(capture(c) for c in cs),'noOverflow':all(healthy(c) for c in cs)}
    else:
     before=row['ledgerBefore'];equip=row['ledgerAfterEquip'];tx=row['equipmentTransactions'];checks={'trial':capture(row['trial']) and bool(row['exactCandidatePaths']['trial']),'cancel':row['cancelPreservesProgress'] is True,'equip':capture(row['equipped']) and item in equip['equippedCosmetics'],'home':capture(row['home']),'reload':capture(row['homeReload']),'achievements':capture(row['achievement']),'ledger':len(tx)==2 and tx[0]['itemId']==item and tx[0]['action']=='equip' and tx[1]['itemId']==item and tx[1]['action']=='unequip' and equip['equipmentTransactions']==tx[:1] and equip['purchaseTransactions']==before['purchaseTransactions'] and len({x['id'] for x in tx})==2}
   key=json.dumps(values,sort_keys=True);assert key not in seen,('duplicate case',values);seen.add(key);assert all(v is True for v in checks.values()),(values,checks)
   record.update(values=values,checks=checks,sourceRaw=rr,sourcePointer=('/controls/' if a.kind=='negative' else '/cases/')+str(i));records.append(record)
 expected={'regression':1024,'workflow':80,'negative':4}[a.kind];assert len(records)==expected,(len(records),expected)
 group={'regression':'shopRegression','workflow':'headwearWorkflow','negative':'headwearNegative'}[a.kind];observed=datetime.now(timezone.utc).isoformat();observations={'status':'PASS_EXACT_RAW_AUDIT','observedAt':observed,'scope':'Read-only assertions on actual immutable runtime raw; not another browser run or visual acceptance','rawReports':raws,'httpReceipt':ref(a.http_receipt),'auditor':ref(__file__),'cases':records};op=a.out/'observations.json';write(op,observations);oref=ref(op)
 cases=[{'values':r['values'],'raw':oref,'bindings':{k:f'/cases/{i}/values/{k}' for k in r['values']},'checks':{k:{'ref':oref,'pointer':f'/cases/{i}/checks/{k}','equals':True} for k in r['checks']}} for i,r in enumerate(records)]
 report={'group':group,'mode':'fresh','status':'PASS','observedAt':observed,'sourcePins':h['sourcePins'],'artifactPins':h['artifactPins'],'servedArtifacts':ref(a.http_receipt),'runner':ref(a.runner),'cases':cases};out=a.out/(group+'.json');write(out,report);print(ref(out))
if __name__=='__main__':main()
