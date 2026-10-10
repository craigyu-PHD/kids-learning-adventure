"""Persist explicit human/agent visual attestation AFTER images have been reviewed."""
import json,hashlib,shutil,argparse
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--sku',required=True);p.add_argument('--revision',required=True);p.add_argument('--visual-reviewed',action='store_true',required=True);p.add_argument('--notes',required=True);args=p.parse_args();q=Path('qa/v653/20261005/wearables/remaining-earwear-repair')/args.sku;s=Path('art-source/v653')/args.sku;rev=args.revision
f=json.loads((q/f'full-{rev}/report.json').read_text());b=json.loads((q/f'base-{rev}/report.json').read_text());n=json.loads((q/f'negative-{rev}/report.json').read_text());assert len(f['rows'])==48 and len(n['rows'])==4 and all(r['status']=='PASS' for r in n['rows']);assert [r['sha256'] for r in f['rows'][:8]]==[r['sha256'] for r in b['rows']]
for r in f['rows']:r['status']='DIRECT_VISUAL_REVIEW_SCOPED_PASS'
inspection=json.loads((s/'fit-r2/native-inspection.json').read_text());assert len(inspection)==18 and all(r['dimensions']==[1024,1792] and r['rasterDependencies']==0 for r in inspection)
f.update(status='48_SCOPED_VISUAL_PLUS_4_NEGATIVE_PASS',negative=n,nativeInspection=inspection,visualNotes=args.notes,limits='Direct Renderer only;32 body high-hair,4 base ordinary-hair,12 base profile captures. Not Shop/production gate.')
f['sourceFiles']=[{'path':str(p.resolve()),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [s/'build_source.py',s/'body-ear-anchors.json',*sorted((s/f'gold-{rev}').glob('*'))] if p.is_file() and p.suffix!='.blend1']
(q/'FINAL-review.json').write_text(json.dumps(f,ensure_ascii=False,indent=2));shutil.copy2(q/f'full-{rev}/manifest-entry.json',q/'FINAL-manifest-entry.json');shutil.copy2(s/'build_source.py',s/f'build_source.frozen-{rev}.py');print(args.sku,48,4,'SOURCE_AND_DIRECT_RENDERER_SCOPE_ONLY')
