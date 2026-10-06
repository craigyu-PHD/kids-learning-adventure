"""Repair original mesh connections and remove obsolete floating seam curves; native geometry only."""
import bpy,math,sys,json,hashlib
from pathlib import Path
j=json.loads(Path(sys.argv[sys.argv.index('--')+1]).read_text());bpy.ops.wm.open_mainfile(filepath=j['source']);scene=bpy.context.scene;changes=[]
if j['sku']=='starter-buddy-headphones':
 for o in list(scene.objects):
  if o.name.startswith('BUDDY segmented cushion seam'):changes.append('Removed obsolete detached inner stitch '+o.name);bpy.data.objects.remove(o,do_unlink=True)
else:
 for o in scene.objects:
  if o.type=='MESH' and ('structural padded arch' in o.name or 'thick ivory crown cushion' in o.name):
   for index,v in enumerate(o.data.vertices):
    angle=math.pi*(index//4)/72;c=math.cos(angle);sn=math.sin(angle);r=(v.co.x/c-1.26) if abs(c)>1e-5 else ((v.co.z-.16)/sn-1.83);v.co.x=(1.10+.16*max(0,sn)**.35+r)*c
   changes.append('Tapered band endpoints to native stem: '+o.name)
  if o.type=='CURVE' and o.name.startswith('CAT rolled teal band seam'):
   pts=o.data.splines[0].bezier_points
   for index,p in enumerate(pts):
    angle=math.pi*index/(len(pts)-1);p.co.x=(1.16+.16*math.sin(angle)**.35)*math.cos(angle)
   changes.append('Matched rolled band seam to taper: '+o.name)
scene['closure_parent_sha256']=hashlib.sha256(Path(j['source']).read_bytes()).hexdigest();scene['closure_changes']='; '.join(changes);scene.render.filepath=j['output'];Path(j['output']).parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(Path(j['output']).with_suffix('.blend')));bpy.ops.render.render(write_still=True);Path(j['output']).with_suffix('.json').write_text(json.dumps({**j,'changes':changes,'parentBlendSHA256':scene['closure_parent_sha256'],'outputSHA256':hashlib.sha256(Path(j['output']).read_bytes()).hexdigest()},indent=2)+'\n')
