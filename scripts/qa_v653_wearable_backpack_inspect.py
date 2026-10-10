import bpy,json,hashlib,sys
from pathlib import Path
base=Path(sys.argv[sys.argv.index('--')+1]);rows=[]
for path in sorted(base.glob('*.blend')):
 bpy.ops.wm.open_mainfile(filepath=str(path));s=bpy.context.scene;objects=[o for o in s.objects if o.type in ['MESH','CURVE']];assert objects
 external=[i.filepath for i in bpy.data.images if i.source=='FILE'];assert not external
 rp=Path(s.render.filepath);rp=rp if rp.is_absolute() else Path.cwd()/rp
 rows.append({'nativeBlend':str(path.resolve()),'nativeBlendSHA256':hashlib.sha256(path.read_bytes()).hexdigest(),'renderFilepathFromScene':s.render.filepath,'renderedPNG':str(rp.resolve()),'renderedPNGSHA256':hashlib.sha256(rp.read_bytes()).hexdigest(),'nativeGeometryObjects':len(objects),'meshObjects':sum(o.type=='MESH' for o in objects),'curveObjects':sum(o.type=='CURVE' for o in objects),'rasterImageDependencies':external,'renderedGeometry':sum(not o.hide_render for o in objects),'inspectionOnlyStraps':sum(bool(o.get('runtime_hide')) for o in objects),'size':[s.render.resolution_x,s.render.resolution_y],'transparent':s.render.film_transparent,'status':'NATIVE_STRUCTURE_VERIFIED_NOT_VISUAL_PASS'})
(base/'native-inspection.json').write_text(json.dumps(rows,indent=2)+'\n');print('Inspected',len(rows))
