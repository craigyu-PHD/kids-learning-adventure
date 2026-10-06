#!/usr/bin/env python3
"""Fail closed unless four immutable role shards cover all 1008 actual lifecycles."""
import argparse,hashlib,itertools,json
from pathlib import Path
from qa_v652_all_shop_lifecycle import AVATARS,ROOT,load_inventory

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--shards',type=Path,nargs=4,required=True);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args();assert not args.output.exists()
 inventory=load_inventory();expected={f"{i['id']}--{a}--{w}--{t}" for i,a,w,t in itertools.product(inventory,AVATARS,[390,1440],['light','dark'])};seen=set();manifest_hashes=set();rows=[];common_pins={}
 for directory in args.shards:
  summary=json.loads((directory/'summary.json').read_text());assert summary['status']=='PASS_TECHNICAL' and summary['passed']==252 and summary['failed']==0 and summary['expectedCases']==252
  manifest_hashes.add(summary['manifestSHA256']);pins=json.loads((directory/'pins.json').read_text())
  for path,digest in pins.items():
   if path in common_pins:assert common_pins[path]==digest,('cross-shard drift',path)
   common_pins[path]=digest;assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==digest,('pin drift',path)
  for case in summary['cases']:
   assert case['case'] in expected and case['case'] not in seen;seen.add(case['case']);evpath=ROOT/case['evidence'];ev=json.loads(evpath.read_text());assert ev['case']==case['case'] and ev['status']=='PASS_TECHNICAL'
   assert not ev['blockedApi'] and not ev['pageErrors'] and not ev['localFailures'];assert ev['ledgerFinal']==ev['ledgerEquipped'];assert ev['cancel']['unchangedFullProgress'];assert all(k in ev for k in ['trial','equippedShop','home','reload','achievements','servedAssets'])
   assert sum(Path(s['path']).name=='trial.png' for s in ev['screenshots'])==1
   for shot in ev['screenshots']:assert hashlib.sha256((ROOT/shot['path']).read_bytes()).hexdigest()==shot['sha256']
   rows.append({'case':case['case'],'evidence':case['evidence'],'sha256':hashlib.sha256(evpath.read_bytes()).hexdigest()})
 assert seen==expected and len(manifest_hashes)==1
 result={'status':'PASS_1008_ACTUAL_SHOP_LIFECYCLES','caseCount':len(seen),'manifestSHA256':next(iter(manifest_hashes)),'checkedFilePins':len(common_pins),'rows':rows,'visualAcceptance':False,'releaseAcceptance':False,'scope':'Trial screenshot per case; complete progress/ledger isolation, exact manifest image paths and served bytes; Home/reload/Achievements snapshots for slot representatives only.'};args.output.write_text(json.dumps(result,indent=2)+'\n');print(result['status'],len(seen))
if __name__=='__main__':main()
