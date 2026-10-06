#!/usr/bin/env python3
"""Normalize existing V653 source receipts, without granting art/runtime acceptance.

Only reads manifests/assets/original receipts; writes owned release-art lineage.
--source-map may add explicit original PNG -> native project/inspection bindings.
Never infers a .blend or a digest from a filename.
"""
from __future__ import annotations
import argparse
import io
import json
from pathlib import Path
import sys
from PIL import Image, __version__ as pillow_version
from qa_v653_release_art import ROOT, Gate, assets, read_bytes, sha, safe

BASE = 'qa/v653/20261005'
OUTPUT_DIR = None

def relative(p):
    return str(safe(p).relative_to(ROOT))


def load(p):
    return json.loads(read_bytes(p))


def link(p, expected=None):
    p=relative(p); actual=sha(p)
    if expected is not None and actual!=expected:
        raise ValueError(f'Original receipt SHA mismatch: {p}: {actual} != {expected}')
    return {'path':p,'sha256':actual}


def write(p,data):
    p.parent.mkdir(parents=True,exist_ok=True)
    raw=(json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode()
    if p.exists() and p.read_bytes()!=raw:
        raise ValueError(f'Output already exists with different bytes; use a fresh --output: {p}')
    p.write_bytes(raw)
    return link(p)


def build_maps(extra):
    deliveries={}; native={}; errors=[]
    # Bounded current-task directories, not a recursive historical QA scan.
    delivery_files=sorted((ROOT/BASE/'wearables').glob('native-delivery-r*/delivery-lineage.json'))
    delivery_files += [ROOT/BASE/'wearables/combined-candidate-r1/phones-native-delivery-lineage.json']
    for p in delivery_files:
        d=load(p)
        for r in d.get('rows',[]):
            if 'delivery' in r and 'path' not in r:
                r={**r,'path':r['delivery'],'sha256':r['deliverySha256']}
            key=relative(r['path'])
            if key in deliveries and deliveries[key][0]!=r:
                errors.append(f'Conflicting original delivery receipts: {key}')
            deliveries[key]=(r,link(p))
    for p in (ROOT/BASE/'wearables/remaining-earwear-repair').glob('*/delivery-layer-index.json'):
        d=load(p); final=p.parent/'FINAL-review.json'
        if not final.exists():
            errors.append(f'Missing original FINAL-review: {final}');continue
        f=load(final); inspections=f.get('nativeInspection',[])
        inspection_path=final
        if isinstance(inspections,str):
            inspection_path=safe(inspections);inspections=load(inspection_path)
        for r in d.get('files',[]):
            src=relative(r['path']); blend=link(r['nativeBlend'],r['nativeBlendSHA256'])
            matches=[x for x in inspections if relative(x['path'])==blend['path'] and x.get('sha256')==blend['sha256']]
            if len(matches)!=1:
                errors.append(f'Native inspection binding absent/ambiguous: {src}');continue
            native[src]={'source':link(src,r['sha256']),'sourceKind':'blender','nativeProject':blend,
                         'sceneInspection':link(inspection_path),'originalReports':[link(p),link(final),link(inspection_path)],
                         'sceneInspectionPointer':f'/nativeInspection/{inspections.index(matches[0])}'}
    # A receipt explicitly containing one blend and its complete render assets is
    # sufficient for its own source images; multiple blends require an explicit map.
    for p in (ROOT/BASE/'blender/backpacks').glob('*/source-delivery-lineage-*.json'):
        d=load(p); rows=d.get('assets',[]); blends=[r for r in rows if str(r.get('path','')).endswith('.blend')]
        if len(blends)!=1:continue
        blend=link(blends[0]['path'],blends[0]['sha256'])
        for r in rows:
            if Path(r.get('path','')).suffix.lower() not in {'.png','.webp'}:continue
            src=relative(r['path'])
            native[src]={'source':link(src,r['sha256']),'sourceKind':'blender','nativeProject':blend,
                         'sceneInspection':link(p),'sceneInspectionPointer':'/source_metadata','originalReports':[link(p)]}
    for p in extra:
        d=load(p)
        for row in d.get('rows',[]):
            src=link(row['source']['path'],row['source']['sha256'])
            project=link(row['nativeProject']['path'],row['nativeProject']['sha256'])
            inspection=link(row['sceneInspection']['path'],row['sceneInspection']['sha256'])
            native[src['path']]={**row,'source':src,'sourceKind':'blender','nativeProject':project,'sceneInspection':inspection,'originalReports':[*row.get('originalReports',[]),link(p)]}
    hair_path='art-source/v653/hair-legend/source-lineage-r1.json'
    hair={relative(r['source']):(r,link(hair_path)) for r in load(hair_path)['rows']}
    fit_path=BASE+'/hair/headwear-candidate-r1/delivery-lineage.json'
    fit={relative(r['delivery']):(r,link(fit_path)) for r in load(fit_path)}
    return deliveries,native,hair,fit,errors



def inspect_native(executable, sources, out):
    """Read saved scene.render.filepath, never infer the source association."""
    import subprocess
    blends=sorted({relative(p) for source in sources for p in safe(source).parent.glob('*.blend')})
    request=out/'native-inspection-request.json';write(request,{'blends':blends})
    worker=out/'inspect-native-readonly.py'
    worker.write_text("""import bpy,json,hashlib,sys
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:];root=Path(args[0]);request=json.load(open(args[1]));rows=[]
for text in request['blends']:
 p=root/text;before=hashlib.sha256(p.read_bytes()).hexdigest()
 bpy.ops.wm.open_mainfile(filepath=str(p),load_ui=False)
 scene=bpy.context.scene;render=Path(bpy.path.abspath(scene.render.filepath))
 row={'nativeProject':{'path':text,'sha256':before},'renderPath':str(render),'objects':len(scene.objects),'transparent':scene.render.film_transparent,'dimensions':[scene.render.resolution_x,scene.render.resolution_y],'externalImages':[bpy.path.abspath(i.filepath) for i in bpy.data.images if i.source=='FILE' and not i.packed_file]}
 if render.is_file():row['renderSha256']=hashlib.sha256(render.read_bytes()).hexdigest()
 row['nativeBytesUnchanged']=hashlib.sha256(p.read_bytes()).hexdigest()==before
 rows.append(row);print('INSPECTED '+text,flush=True)
Path(args[2]).write_text(json.dumps({'status':'READ_ONLY_SCENE_INSPECTION_NOT_VISUAL_PASS','rows':rows},indent=2)+'\\n')
""")
    report=out/'native-inspection.json'
    with (out/'native-inspection.log').open('w') as log:
        proc=subprocess.run([executable,'--background','--factory-startup','--python',str(worker),'--',str(ROOT),str(request),str(report)],stdout=log,stderr=subprocess.STDOUT,timeout=300)
    if proc.returncode:raise ValueError('Blender read-only inspection failed: '+relative(out/'native-inspection.log'))
    d=load(report);mapping={}
    for r in d['rows']:
        if not r['nativeBytesUnchanged']:raise ValueError('Blender source bytes changed during read-only inspection')
        path=relative(r['renderPath'])
        if not r.get('renderSha256'):raise ValueError('Saved scene render file missing: '+path)
        value={'source':link(path,r['renderSha256']),'sourceKind':'blender','nativeProject':link(r['nativeProject']['path'],r['nativeProject']['sha256']),
               'sceneInspection':link(report),'originalReports':[link(report)],'sceneInspectionPointer':'/rows/'+str(d['rows'].index(r))}
        if path in sources:
            mapping.setdefault(path,[]).append(value)
        # Association by independently decoded exact pixels, never basename.
        for source in sources:
            if source==path or safe(source).parent!=safe(path).parent:continue
            actual=Image.open(io.BytesIO(read_bytes(source))).convert('RGBA')
            rendered=Image.open(io.BytesIO(read_bytes(path))).convert('RGBA')
            if actual.size==rendered.size and actual.tobytes()==rendered.tobytes():
                mapping.setdefault(source,[]).append({**value,'source':link(source),'nativeRender':link(path,r['renderSha256']),'nativeRenderRGBAExact':True})
    # More than one project saving the same render is ambiguous, not a license to guess.
    return {p:values[0] for p,values in mapping.items() if len(values)==1}


def main():
    global OUTPUT_DIR
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--avatar-manifest',required=True)
    ap.add_argument('--world-manifest',required=True)
    ap.add_argument('--output',required=True,help='Fresh directory within qa/v653/20261005/release-art/lineage')
    ap.add_argument('--source-map',action='append',default=[],help='Additional explicit original source mapping JSON; repeatable')
    ap.add_argument('--inspect-native',help='Installed Blender executable; read saved render paths without rendering/saving')
    args=ap.parse_args();out=safe(args.output)
    if not out.is_relative_to(ROOT/BASE/'release-art/lineage'):
        raise ValueError('Output outside owned release-art/lineage')
    out.mkdir(parents=True,exist_ok=True)
    OUTPUT_DIR=out
    failures=[]; result={};records=[]
    a=load(args.avatar_manifest);w=load(args.world_manifest)
    candidate={'avatarManifestSha256':sha(args.avatar_manifest),'worldManifestSha256':sha(args.world_manifest)}
    deliveries,native,hair,fit,map_errors=build_maps(args.source_map); failures.extend(map_errors)
    refs={**{'avatar'+k:v for k,v in assets(a).items()},**{'world'+k:v for k,v in assets(w).items()}}
    new=sorted({p for p in refs.values() if p.startswith('public/assets/v6.5.3/')})
    if args.inspect_native:
        needed={relative(deliveries[p][0]['source']) for p in new if p in deliveries and relative(deliveries[p][0]['source']) not in native and relative(deliveries[p][0]['source']) not in fit}
        for source in list(needed):
            if source in deliveries:
                original=relative(deliveries[source][0]['source']);needed.remove(source);needed.add(original)
        native.update(inspect_native(args.inspect_native,needed,out))
        for path,(receipt,receipt_link) in deliveries.items():
            src=relative(receipt['source'])
            if src in native:
                link(path,receipt['sha256']);link(src,receipt['sourceSha256'])
                if read_bytes(path)==read_bytes(src):
                    n=native[src];native[path]={**n,'source':link(path),'originalReports':[*n['originalReports'],receipt_link]}
    worlds={}
    for r in w['records']:
        if not r['source']['path'].startswith('public/assets/v6.5.3/'):continue
        for role,obj in [('source',r['source']),('delivery',r['delivery']),*[('display',v) for v in r.get('displayVariants',[])]]:
            worlds[obj['path']]=(r,role,obj)
    for number,p in enumerate(new):
        row_errors=[];g=Gate(); im=g.image(p); failures.extend(g.failures)
        if im is None:continue
        row={'schemaVersion':1,'status':'SOURCE_INDEX_ONLY_RUNTIME_AND_VISUAL_PENDING','delivery':link(p),
             'size':im['size'],'alphaExtrema':im['alphaExtrema'],'alphaBBox':im['alphaBBox'],
             'runtimeAcceptance':'PENDING','visualAcceptance':'PENDING','originalReports':[]}
        try:
            if p in worlds:
                r,role,obj=worlds[p];link(p,obj['sha256']);trace=load(r['generationTrace']['path']);link(r['generationTrace']['path'],r['generationTrace']['sha256'])
                project_path=trace.get('blend') or trace.get('source');project_sha=trace.get('blendSha256') or trace.get('sourceSha256')
                if not str(project_path).endswith('.blend'):raise ValueError(f'World generation has no native project: {p}')
                inspect_paths={'card-sky':BASE+'/blender/cards/r5/native-inspection.json','pet-space-fox':BASE+'/blender/pet/r8/native-inspection.json'}
                inspect=inspect_paths.get(r['itemId'])
                if not inspect:raise ValueError(f'World inspection mapping missing: {r["itemId"]}')
                scene=load(inspect)
                if relative(scene.get('blend',''))!=relative(project_path):raise ValueError(f'World scene/project mismatch: {p}')
                src=link(trace['render'],trace['renderSha256']) if role=='source' else link(r['source']['path'],r['source']['sha256'])
                row.update(source=src,sourceKind='blender',nativeProject=link(project_path,project_sha),sceneInspection=link(inspect),
                           operation='native-render' if role=='source' else ('rgba-lanczos-display' if role=='display' else 'lossless-webp'),
                           originalReports=[r['generationTrace'],r['pairing']])
            elif p in deliveries:
                delivery,receipt=deliveries[p];src=link(delivery['source'],delivery['sourceSha256']);link(p,delivery['sha256'])
                operation='uniform-fit' if delivery.get('method')=='single coherent beauty, uniform alpha-bounds fitting' else 'lossless-webp'
                row.update(source=src,operation=operation,originalReports=[receipt])
                if src['path'] in fit:
                    fitted,fref=fit[src['path']];master,href=hair[relative(fitted['source'])]
                    link(src['path'],fitted['deliverySha256']);raw=link(master['source'],master['sha256']);ref=link(master['reference'],master['reference_sha256'])
                    row.update(sourceKind='imagegen',generationTrace=href,rawOutput=raw,inputs=[ref],fitEvidence=fref,
                               originalReports=[receipt,fref,href])
                    recovered=BASE+'/hair/generation-request-recovery/generation-trace.json'
                    if safe(recovered).exists():
                        requests=load(recovered)['rows'];scope='brother' if master['avatar']=='brother' else 'other-three-roles'
                        matches=[x for x in requests if x.get('roleScope')==scope]
                        if len(matches)!=1:row_errors.append('Original imagegen request scope absent/ambiguous: '+scope)
                        else:
                            request=matches[0];row['generationTrace']=link(recovered);row['prompt']=link(request['requestFile'],request['requestSha256'])
                            row['promptProvenance']={'record':link(recovered),'roleScope':scope,'callId':request['callId'],'sourceEventSha256':request['sourceEventSha256'],'exactActualToolRequest':True}
                    else:row_errors.append('Original imagegen generation request recovery file absent')
                elif src['path'] in native:
                    n=native[src['path']];row.update({k:v for k,v in n.items() if k not in {'source','originalReports'}});row['originalReports'] += n['originalReports']
                else:
                    row_errors.append('Explicit original source→nativeProject/sceneInspection mapping missing: '+src['path'])
            else:
                row_errors.append('No original delivery receipt for manifest reference: '+p)
            if row.get('source'):
                g=Gate();g.pair(row['source']['path'],p,resize=row.get('operation')=='rgba-lanczos-display',uniform_fit=row.get('operation')=='uniform-fit')
                row_errors+=g.failures
                # Exact RGBA recipe proof, including transparent RGB; no lossy exception.
                original=Image.open(io.BytesIO(read_bytes(row['source']['path']))).convert('RGBA')
                actual=Image.open(io.BytesIO(read_bytes(p))).convert('RGBA')
                op=row.get('operation')
                if op=='rgba-lanczos-display':original=original.resize(actual.size,Image.Resampling.LANCZOS)
                elif op=='uniform-fit':
                    fitted=original.crop(original.getbbox());fitted.thumbnail((464,464),Image.Resampling.LANCZOS)
                    original=Image.new('RGBA',(512,512));original.alpha_composite(fitted,((512-fitted.width)//2,(512-fitted.height)//2))
                exact=original.size==actual.size and original.tobytes()==actual.tobytes()
                if not exact:row_errors.append('Codec/fit exact RGBA recipe mismatch: '+p)
                row['codecRecipe']={'pillowVersion':pillow_version,'operation':op,'encoding':'WebP lossless exact=True' if p.endswith('.webp') else 'native PNG bytes',
                                    'resampling':'RGBA LANCZOS' if op in {'rgba-lanczos-display','uniform-fit'} else None,'decodedRGBAExact':exact}
                if op=='uniform-fit':row['codecRecipe'].update(alphaBounds=True,fitBox=[464,464],canvas=[512,512],placement='center-floor')
            required=['delivery','source']
            if row.get('sourceKind')=='blender':required+=['nativeProject','sceneInspection']
            elif row.get('sourceKind')=='imagegen':required+=['generationTrace','prompt','rawOutput']
            else:row_errors.append('sourceKind must identify actual blender/imagegen source')
            for field in required:
                value=row.get(field)
                if not isinstance(value,dict) or not value.get('path') or not value.get('sha256'):
                    row_errors.append('Required source schema field missing: '+field)
                else:link(value['path'],value['sha256'])
            if row.get('sourceKind')=='blender' and not str(row.get('nativeProject',{}).get('path','')).endswith('.blend'):
                row_errors.append('nativeProject must be a real .blend')
            if row.get('sourceKind')=='imagegen' and not row.get('inputs'):
                row_errors.append('Imagegen input reference list missing')
            if not row.get('originalReports'):row_errors.append('Original source receipt missing')
            if not row.get('codecRecipe',{}).get('decodedRGBAExact'):row_errors.append('Exact codec recipe not verified')
            if row_errors:row['status']='FAIL_SOURCE_INDEX'
            row['failures']=row_errors
        except (OSError,ValueError,KeyError,TypeError) as exc:
            row_errors.append(str(exc));row.update(status='FAIL_SOURCE_INDEX',failures=row_errors)
        failures += [p+': '+e for e in row_errors]
        record_link=write(out/'records'/f'{number:04d}.json',row)
        result[p]={'sha256':im['sha256'],'size':im['size'],'alphaExtrema':im['alphaExtrema'],'lineage':record_link}
        records.append({'path':p,'status':row['status'],'failures':row_errors})
    if sha(args.avatar_manifest)!=candidate['avatarManifestSha256'] or sha(args.world_manifest)!=candidate['worldManifestSha256']:
        failures.append('Candidate manifests changed during normalization')
    report={'schemaVersion':1,'status':'FAIL' if failures else 'SOURCE_INDEX_READY_NOT_RELEASE_ACCEPTANCE','candidate':candidate,
            'normalizerSha256':sha('scripts/prepare_v653_art_evidence.py'),'newAssets':result,'records':records,'failures':failures,
            'visual':None,'runtime':None,'negative':None,'counts':{'newReferences':len(new),'indexed':len(result),'sourceFailures':len(failures),'failedAssets':sum(bool(r['failures']) for r in records)},
            'notClaimed':['new visual review','final runtime','shop acceptance','release PASS','production publication']}
    write(out/'index.json',report)
    print(json.dumps({'status':report['status'],'counts':report['counts'],'output':relative(out/'index.json'),'failureExamples':failures[:8]},ensure_ascii=False,indent=2))
    return 1 if failures else 0

if __name__=='__main__':
    try:sys.exit(main())
    except (OSError,ValueError,KeyError,TypeError) as exc:
        failure={'status':'FAIL','failures':[str(exc)],'notClaimed':['release acceptance','source acceptance']}
        if OUTPUT_DIR is not None:
            target=OUTPUT_DIR/'fatal-error.json'
            if not target.exists():write(target,failure)
        print(json.dumps(failure,ensure_ascii=False));sys.exit(1)
