"""Native, editable Blender legendary headphones. No raster mesh, kitbash, or image warp."""
import bpy, math, sys, argparse, json
from pathlib import Path
from mathutils import Vector,Matrix

parser=argparse.ArgumentParser()
parser.add_argument('--hair-fit',choices=['base','nebula'],default='base');parser.add_argument('--out',required=True)
parser.add_argument('--variant',choices=['normal','high'],default='normal')
parser.add_argument('--view',choices=['beauty','front','side'],default='beauty')
parser.add_argument('--fit-avatar',choices=['brother','younger','sister','younger-sister'])
parser.add_argument('--depth-fit',action='store_true')
parser.add_argument('--fit-skin',default='default')
parser.add_argument('--fit-ledger')
parser.add_argument('--parts',choices=['full','back','front'],default='full')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def material(name,color,metal=0,rough=.35):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
 p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 return m
navy=material('Royal sapphire anodised shell',(0.012,.055,.21),.75,.24)
blue=material('Sapphire enamel inserts',(.02,.13,.43),.38,.22)
gold=material('Warm satin gold machined metal',(.76,.40,.075),.82,.26)
edge=material('Champagne gold bevel',(.95,.66,.21),.85,.23)
pad=material('Deep navy memory foam cushions',(.012,.019,.037),0,.55)
seam=material('Cushion stitching',(.075,.11,.17),0,.61)
jewel=material('Lapis star enamel',(.012,.3,.66),.45,.16)

def finish(o,name,mat):
 o.name=name;o.data.materials.append(mat)
 if hasattr(o.data,'polygons'):
  for p in o.data.polygons:p.use_smooth=True
 return o

def tube(name,pts,radius,mat):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=24
 c.bevel_depth=radius;c.bevel_resolution=5;c.resolution_u=32
 s=c.splines.new('BEZIER');s.bezier_points.add(len(pts)-1)
 for p,co in zip(s.bezier_points,pts):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o

def orb(name,loc,scale,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,location=loc)
 o=bpy.context.object;o.scale=scale;return finish(o,name,mat)

def disc(name,loc,radius,depth,scale,mat):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=radius,depth=depth,location=loc,rotation=(math.pi/2,0,0))
 o=bpy.context.object;o.scale=scale;finish(o,name,mat)
 mod=o.modifiers.new('Rounded manufactured edge','BEVEL');mod.width=.045;mod.segments=5
 o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');return o

def star(name,loc,radius,mat):
 # Solid chamfered star emblem, deliberately small enough to read as a product detail.
 verts=[]
 for y in [-.025,.025]:
  for i in range(10):
   a=math.pi/2+i*math.pi/5;r=radius if i%2==0 else radius*.45
   verts.append((loc[0]+r*math.cos(a),loc[1]+y,loc[2]+r*math.sin(a)))
 faces=[tuple(range(9,-1,-1)),tuple(range(10,20))]+[(i,(i+1)%10,(i+1)%10+10,i+10) for i in range(10)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,mat)
 mod=o.modifiers.new('Soft emblem edges','BEVEL');mod.width=.014;mod.segments=3;o.modifiers.new('Star normals','WEIGHTED_NORMAL')

rx=1.08 if args.variant=='normal' else 1.92
rz=1.88 if args.variant=='normal' else 2.85
fits={
 'brother':{'cx':518.075,'cy':298.12,'px':142.168,'high_rx':1.99,'high_rz':2.86},
 'younger':{'cx':521.085,'cy':376.325,'px':159.577,'high_rx':1.83,'high_rz':2.39},
 'sister':{'cx':537.565,'cy':310.395,'px':133.132,'high_rx':2.06,'high_rz':2.52},
 'younger-sister':{'cx':498.575,'cy':321.21,'px':143.086,'high_rx':2.04,'high_rz':2.45},
}
if args.fit_avatar and args.variant=='high':
 rx=fits[args.fit_avatar]['high_rx'];rz=fits[args.fit_avatar]['high_rz']
if args.depth_fit:
 rx=1.32 if args.hair_fit=='nebula' else 1.26
 rz=({'brother':2.02,'younger':2.32,'sister':1.99,'younger-sister':1.98}.get(args.fit_avatar,1.83) if args.hair_fit=='nebula' else 1.83)+12/(fits.get(args.fit_avatar,fits['brother'])['px']*.966)
z0=.16

def arch(a,radial=0):
 if args.variant=='normal' or args.depth_fit:return ((1.10+(rx-1.10)*max(0,math.sin(a))**.35+radial)*math.cos(a),z0+(rz+radial)*math.sin(a))
 # Raised crown clearance with a formed, continuously tapered lower arm.
 # The side returns into the same earcup pivot instead of a wide horizontal elbow.
 def point(t):
  ss=max(0,math.sin(t));taper=1-(1-1.10/rx)*math.exp(-8*ss)
  return (rx*math.cos(t)*taper,z0+rz*math.sin(t))
 x,z=point(a);lo,hi=max(0,a-.0001),min(math.pi,a+.0001)
 xl,zl=point(lo);xh,zh=point(hi);dx,dz=xh-xl,zh-zl;length=math.hypot(dx,dz)
 return (x+radial*dz/length,z-radial*dx/length)

def arc_points(radial=0,y=0,n=65):
 return [(arch(math.pi*i/(n-1),radial)[0],y,arch(math.pi*i/(n-1),radial)[1]) for i in range(n)]

def band(name,r_inner,r_outer,yhalf,mat):
 verts=[]
 for i in range(65):
  a=math.pi*i/64
  for r,y in [(r_inner,-yhalf),(r_outer,-yhalf),(r_outer,yhalf),(r_inner,yhalf)]:
   x,z=arch(a,r);verts.append((x,y,z))
 faces=[]
 for i in range(64):
  for j in range(4):faces.append((4*i+j,4*i+(j+1)%4,4*(i+1)+(j+1)%4,4*(i+1)+j))
 faces.extend([(3,2,1,0),(256,257,258,259)])
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,mat)
 bevel=o.modifiers.new('Headband rolled corners','BEVEL');bevel.width=.035;bevel.segments=4
 o.modifiers.new('Band normal continuity','WEIGHTED_NORMAL');return o

band('Continuous formed sapphire headband',0,.105,.13,navy)
band('Soft underside foam liner',-.10,.008,.117,pad)
for y in [-.137,.137]:tube('Continuous gold headband edge',arc_points(.052,y),.019,gold)
for y in [-.104,.104]:tube('Foam seam',arc_points(-.065,y),.008,seam)

for sign,side in [(-1,'L'),(1,'R')]:
 before=set(bpy.context.scene.objects)
 x=sign*1.10
 anchor=1.10 if args.variant=='high' and not args.depth_fit else rx
 # Cups are complete rounded shells; pads and suspension are genuine separate geometry.
 orb(side+' rear acoustic chamber',(x,.085,-.04),(.235,.185,.325),navy)
 bpy.ops.mesh.primitive_torus_add(major_radius=.22,minor_radius=.062,major_segments=64,minor_segments=20,
   location=(x-sign*.035,.145,-.045),rotation=(math.pi/2,0,0))
 cushion=bpy.context.object;cushion.scale=(.80,1.10,1.5);finish(cushion,side+' continuous memory foam pad',pad)
 disc(side+' recessed acoustic fabric',(x-sign*.035,.148,-.045),1,.025,(.144,.219,1),seam)
 disc(side+' gold structural bezel',(x,-.075,-.04),1,.12,(.24,.32,.95),gold)
 disc(side+' inset enamel face',(x,-.153,-.04),1,.08,(.192,.263,.90),blue)
 disc(side+' jewel mounting ring',(x,-.208,-.03),1,.055,(.108,.135,.9),edge)
 disc(side+' center lapis',(x,-.245,-.03),1,.025,(.080,.102,.9),jewel)
 star(side+' gold star mark',(x,-.265,-.027),.067,edge)
 # Fork arms straddle each earcup, then join an adjustable band telescope.
 for y in [-.015,.15]:
  tube(side+' continuous swivel yoke',[(sign*anchor,y,.21),(sign*(anchor+.035),y,.11),(sign*1.24,y,-.03),(sign*1.205,y,-.27)],.044,gold)
 orb(side+' pivot hinge',(sign*1.235,-.065,.08),(.078,.066,.078),edge)
 disc(side+' hinge screw',(sign*1.235,-.123,.08),1,.028,(.025,.025,1),navy)
 for dy in [-.025,.10]:tube(side+' adjustable stem',[(sign*anchor,dy,.18),(sign*anchor,dy,.31)],.024,edge)
 # Readable seam and perforations on the front lower cup, not floating decoration.
 for i in range(5):
  xx=x+(i-2)*.038
  orb(side+' acoustic vent '+str(i),(xx,-.196,-.216),(.008,.006,.015),pad)
 # Ear pads face inward toward the skull, outer cups face laterally.
 # A small forward swivel keeps the star enamel legible in the frontal game camera.
 pivot=Vector((x,0,-.04))
 swivel=Matrix.Translation(pivot)@Matrix.Rotation(sign*math.radians(60),4,'Z')@Matrix.Translation(-pivot)
 bpy.context.view_layer.update()
 for obj in set(bpy.context.scene.objects)-before:obj.matrix_world=swivel@obj.matrix_world

primary_band_names=['Continuous formed sapphire headband','Soft underside foam liner','Continuous gold headband edge','Foam seam']
def is_band(o):return any(o.name.startswith(name) for name in primary_band_names)
def is_back(o):return is_band(o) or 'continuous swivel yoke' in o.name or 'adjustable stem' in o.name
if args.depth_fit:
 bpy.context.view_layer.update()
 pivot=Vector((0,0,z0));rearward=Matrix.Translation(pivot)@Matrix.Rotation(math.radians(-15),4,'X')@Matrix.Translation(-pivot)
 for obj in bpy.context.scene.objects:
  if is_band(obj):obj.matrix_world=rearward@obj.matrix_world
for obj in bpy.context.scene.objects:
 if obj.type in ['MESH','CURVE']:
  obj['headphone_part']='back' if is_back(obj) else 'front'
  if args.parts!='full':obj.hide_render=(is_back(obj) != (args.parts=='back'))

scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
scene.world.color=(.18,.18,.18)
scene.view_settings.view_transform='AgX'

def area(name,loc,power,color,size):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size
 o.rotation_euler=(Vector((0,0,.55))-o.location).to_track_quat('-Z','Y').to_euler()
area('Large warm key',(-3,-4,5),650,(1,.88,.72),4)
area('Cool face fill',(3,-3,2),480,(.60,.77,1),3)
area('Soft gold rim',(0,3,3.5),850,(.80,.9,1),3)
area('Front detail',(0,-5,0),90,(1,1,1),2)
target=Vector((0,0,.70 if args.variant=='normal' else 1.0))
loc={'beauty':(3.2,-7,2.4),'front':(0,-8,.7 if args.variant=='normal' else 1.0),'side':(7,-3,2)}[args.view]
bpy.ops.object.camera_add(location=loc);camera=bpy.context.object;camera.name='Product camera';camera.data.type='ORTHO';camera.data.ortho_scale=3.75 if args.variant=='normal' else 4.2
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();scene.camera=camera
scene['hair_fit']=args.hair_fit;scene['product_id']='phones-legend';scene['source_revision']='v653-native-r9-depth-fit';scene['fit_variant']=args.variant
scene['construction']='Editable native meshes and curves; full cups/pads/yokes/hinges; no raster planes or image deformation.'
scene['native_render_part']=args.parts;scene['depth_fit']=args.depth_fit
scene.render.filepath=str(out/f'phones-legend-{args.variant}-{args.view}.png')
if args.fit_avatar:
 fit=fits[args.fit_avatar]
 if args.fit_ledger:fit=next(r['fit'] for r in json.loads(Path(args.fit_ledger).read_text())['rows'] if r['avatar']==args.fit_avatar and r['skin']==args.fit_skin)
 px=fit['px'];padding=256;height=1536+padding
 cx=(512-fit['cx'])/px;cz=(fit['cy']+padding-height/2-.04*px)/px
 camera.location=(cx,-8,cz);camera.rotation_euler=(math.pi/2,0,0)
 camera.data.ortho_scale=height/px
 scene.render.resolution_x=1024;scene.render.resolution_y=height
 scene['fit_reference']='Alpha-weighted existing earcup centers; same orthographic scale in X and Y'
 scene['canvas_top_padding']=padding;scene['avatar']=args.fit_avatar;scene['skin']=args.fit_skin
 stem=f'{args.fit_avatar}--{args.fit_skin}--{args.parts}'
 scene.render.filepath=str(out/(stem+'.png'))
else:stem=f'phones-legend-{args.variant}'
bpy.ops.wm.save_as_mainfile(filepath=str(out/(stem+'.blend')))
bpy.ops.render.render(write_still=True)
