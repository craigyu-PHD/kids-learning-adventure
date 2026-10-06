"""Whole accepted native sculpture photographed for catalogue, no raster assembly."""
import bpy,sys,json,math,hashlib
from pathlib import Path
from mathutils import Vector
j=json.loads(Path(sys.argv[sys.argv.index('--')+1]).read_text());bpy.ops.wm.open_mainfile(filepath=j['source']);scene=bpy.context.scene;cam=scene.camera
for o in scene.objects:
 if o.type in ['MESH','CURVE']:o.hide_render=False
scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100;scene.render.filepath=j['output'];Path(j['output']).parent.mkdir(parents=True,exist_ok=True)
if j['kind']=='headphones':
 cam.location=(3.2,-7,2.4);target=Vector((0,0,.65));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=3.7
else:
 # Reframe the native camera from the accepted alpha bounds; pixels are never used as texture.
 box=j['bounds'];px=1792/cam.data.ortho_scale;x=(box[0]+box[2])/2;y=(box[1]+box[3])/2;cam.location.x+=(x-512)/px;cam.location.z+=(896-y)/px;cam.data.ortho_scale=max(box[2]-box[0],box[3]-box[1])/px*1.20
scene['catalogue_source_sha256']=hashlib.sha256(Path(j['source']).read_bytes()).hexdigest();scene['catalogue_construction']='Complete source geometry, single native camera render, no raster composition';bpy.ops.wm.save_as_mainfile(filepath=str(Path(j['output']).with_suffix('.blend')));bpy.ops.render.render(write_still=True)
