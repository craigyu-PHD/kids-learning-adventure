"""Native SKU-specific headphone sculpt. Procedural meshes/curves, no raster planes."""
import bpy,math,json,argparse,sys
from pathlib import Path
from mathutils import Vector,Matrix
p=argparse.ArgumentParser();p.add_argument('--hair-fit',choices=['base','nebula'],default='base');p.add_argument('--out',required=True);p.add_argument('--view',choices=['beauty','side','front'],default='beauty');p.add_argument('--fit-ledger');p.add_argument('--avatar');p.add_argument('--skin',default='default');p.add_argument('--part',choices=['full','back','front'],default='full');args=p.parse_args(sys.argv[sys.argv.index('--')+1:])
SKU='phones-racer'
RZ=({'brother':2.02,'younger':2.32,'sister':1.99,'younger-sister':1.98}.get(args.avatar,1.83) if args.hair_fit=='nebula' else 1.83)+12/({'brother':142.168,'younger':159.577,'sister':133.132,'younger-sister':143.086}.get(args.avatar,142.168)*.966)
RX=1.32 if args.hair_fit=='nebula' else 1.26
def archx(a,r=0):return (1.10+(RX-1.10)*max(0,math.sin(a))**.35+r)*math.cos(a)
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,c,metal=0,rough=.34):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough;return m
shell=mat('Racing cobalt lacquer',(.014,.17,.72),.5,.22);orange=mat('Race orange elastomer',(.95,.16,.008),.15,.32);white=mat('White racing ceramic',(.9,.94,.98),.2,.3);silver=mat('Brushed titanium',(.62,.69,.77),.85,.28);black=mat('Black memory foam',(.014,.02,.029),0,.72);carbon=mat('Carbon fibre band',(.026,.035,.048),.15,.46)
n=carbon.node_tree.nodes;noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=130;bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.2;bump.inputs['Distance'].default_value=.02;carbon.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);carbon.node_tree.links.new(bump.outputs['Normal'],n.get('Principled BSDF').inputs['Normal'])
def finish(o,name,m,part='front'):
 o.name=name;o.data.materials.append(m);o['part']=part
 if hasattr(o.data,'polygons'):
  for f in o.data.polygons:f.use_smooth=True
 return o
def tube(name,pts,r,m,part='front'):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=4;c.resolution_u=24;s=c.splines.new('BEZIER');s.bezier_points.add(len(pts)-1)
 for q,co in zip(s.bezier_points,pts):q.co=co;q.handle_left_type='AUTO';q.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);return finish(o,name,m,part)
def orb(name,co,scale,m,part='front'):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,location=co);o=bpy.context.object;o.scale=scale;return finish(o,name,m,part)
def disc(name,co,sx,sz,depth,m):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=1,depth=depth,location=co,rotation=(math.pi/2,0,0));o=bpy.context.object;o.scale=(sx,sz,1);finish(o,name,m);mod=o.modifiers.new('Machined fillet','BEVEL');mod.width=.025;mod.segments=4;o.modifiers.new('Surface normals','WEIGHTED_NORMAL');return o
def poly(name,points,depth,m):
 # points in X,Z; outer relief faces camera along -Y.
 verts=[(x,y,z) for y in [-depth/2,depth/2] for x,z in points];n=len(points);faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,m);mod=o.modifiers.new('Jeweller bevel','BEVEL');mod.width=.009;mod.segments=3;o.modifiers.new('Relief normals','WEIGHTED_NORMAL');return o
def star(name,x,y,z,r,m):
 pts=[(x+(r if i%2==0 else r*.39)*math.cos(math.pi/2+i*math.pi/5),z+(r if i%2==0 else r*.39)*math.sin(math.pi/2+i*math.pi/5)) for i in range(10)];o=poly(name,pts,.024,m);o.location.y=y;return o
def band(name,inner,outer,yhalf,m):
 verts=[]
 for i in range(73):
  a=math.pi*i/72
  for r,y in [(inner,-yhalf),(outer,-yhalf),(outer,yhalf),(inner,yhalf)]:verts.append((archx(a,r),y,.16+(RZ+r)*math.sin(a)))
 faces=[(4*i+j,4*i+(j+1)%4,4*(i+1)+(j+1)%4,4*(i+1)+j) for i in range(72) for j in range(4)]+[(3,2,1,0),(288,289,290,291)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,m,'back');b=o.modifiers.new('Rolled leather and shell edges','BEVEL');b.width=.03;b.segments=4;o.modifiers.new('Band normals','WEIGHTED_NORMAL');return o
def box(name,co,scale,m,bevel=.06,part='front'):
 bpy.ops.mesh.primitive_cube_add(size=2,location=co);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);finish(o,name,m,part);mod=o.modifiers.new('Rounded moulded case','BEVEL');mod.width=bevel;mod.segments=6;o.modifiers.new('Case normals','WEIGHTED_NORMAL');return o
band('RACER carbon structural bridge',0,.07,.12,carbon);band('RACER cushioned inner arch',-.08,.003,.11,black)
tube('RACER orange stitched crown pad',[(archx(.48+2.18*i/40,-0.030000),0,.16+(RZ+-0.050000)*math.sin(.48+2.18*i/40)) for i in range(41)],.065,orange,'back')
for y in [-.12,.12]:tube('RACER blue racing rails',[(archx(math.pi*i/48,0.040000),y,.16+(RZ+0.040000)*math.sin(math.pi*i/48)) for i in range(49)],.027,shell,'back')
bpy.context.view_layer.update();pivot=Vector((0,0,.16));rear=Matrix.Translation(pivot)@Matrix.Rotation(math.radians(-15),4,'X')@Matrix.Translation(-pivot)
for obj in bpy.context.scene.objects:
 if obj.get('part')=='back':obj.matrix_world=rear@obj.matrix_world
for sign,side in [(-1,'L'),(1,'R')]:
 before=set(bpy.context.scene.objects);x=1.10*sign;z=-.04
 box(side+' RACER moulded cobalt ear cup',(x,.006,z),(.235,.13,.32),shell,.11)
 box(side+' RACER orange rubber crash rim',(x,-.094,z),(.231,.045,.307),orange,.09)
 box(side+' RACER ceramic inset',(x,-.14,z),(.209,.04,.285),white,.09)
 box(side+' RACER blue layered cup face',(x,-.182,z),(.176,.03,.266),shell,.075)
 # Hollow oblong pad and recessed acoustic centre, not a solid face painted black.
 pts=[(x+.204*math.cos(2*math.pi*i/64),.15,z+.266*math.sin(2*math.pi*i/64)) for i in range(65)];tube(side+' RACER hollow foam oval ear seal',pts,.075,black)
 disc(side+' RACER recessed acoustic driver',(x,.14,z),.145,.21,.018,carbon)
 # Checkerboard upper face remains part of this SKU geometry.
 for row in range(3):
  for col in range(4):
   box(side+' RACER chequer tile '+str(row)+'-'+str(col),(x+(col-1.5)*.068,-.22,z+.06+row*.065),(.033,.008,.031),white if (row+col)%2==0 else black,.003)
 box(side+' RACER lower vent orange surround',(x,-.218,z-.154),(.134,.024,.090),orange,.045)
 box(side+' RACER vent recess',(x,-.246,z-.154),(.109,.013,.065),black,.024)
 for row in range(4):
  for col in range(7):
   orb(side+' RACER perforated vent stud',(x+(col-3)*.026,-.26,z-.194+row*.027),(.007,.008,.007),silver)
 for y in [-.015,.145]:tube(side+' RACER silver fork',[(x,y,.34),(x+sign*.13,y,.25),(x+sign*.18,y,.07),(x+sign*.11,y,-.1)],.034,silver,'back')
 box(side+' RACER orange hinge stem',(x,0,.37),(.075,.07,.12),orange,.04,'back')
 box(side+' RACER silver adjustment cuff',(x,.03,.50),(.098,.085,.072),silver,.035,'back')
 orb(side+' RACER pivot axle',(x+sign*.12,-.06,.14),(.065,.052,.065),silver)
 bpy.context.view_layer.update();pivot=Vector((x,0,z));turn=Matrix.Translation(pivot)@Matrix.Rotation(sign*math.radians(60),4,'Z')@Matrix.Translation(-pivot)
 for obj in set(bpy.context.scene.objects)-before:obj.matrix_world=turn@obj.matrix_world
# Asymmetric, real flexible boom microphone from the right cup towards the mouth.
tube('RACER flexible boom microphone',[(1.11,-.22,-.18),(1.04,-.40,-.31),(.85,-.49,-.39),(.62,-.49,-.43)],.026,black)
orb('RACER microphone orange collar',(.65,-.49,-.425),(.04,.043,.039),orange)
orb('RACER directional foam microphone tip',(.56,-.49,-.445),(.105,.049,.059),black)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True;scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True;scene.world.color=(.18,.18,.18);scene.view_settings.view_transform='AgX'
for name,loc,power,color,size in [('Warm studio key',(-3,-4,5),650,(1,.9,.79),4),('Cool fill',(3,-3,2),480,(.7,.8,1),3),('Top edge',(0,3,3.5),850,(.85,.9,1),3),('Frontal detail',(0,-5,0),90,(1,1,1),2)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.5))-o.location).to_track_quat('-Z','Y').to_euler()
loc={'beauty':(3.2,-7,2.4),'side':(7,-3,2),'front':(0,-8,.7)}[args.view];bpy.ops.object.camera_add(location=loc);cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=3.6;cam.rotation_euler=(Vector((0,0,.65))-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
stem=SKU+'-'+args.view
if args.avatar:
 fit=next(r['fit'] for r in json.loads(Path(args.fit_ledger).read_text())['rows'] if r['avatar']==args.avatar and r['skin']==args.skin);px=fit['px'];height=1792;cam.location=((512-fit['cx'])/px,-8,(fit['cy']+256-height/2-.04*px)/px);cam.rotation_euler=(math.pi/2,0,0);cam.data.ortho_scale=height/px;scene.render.resolution_x=1024;scene.render.resolution_y=height;stem=args.avatar+'--'+args.skin+'--'+args.part
for o in bpy.context.scene.objects:
 if o.type in ['MESH','CURVE']:o.hide_render=args.part!='full' and o.get('part')!=args.part
scene['hair_fit']=args.hair_fit;scene['product_id']=SKU;scene['source_revision']='racer-native-r1';scene['avatar']=args.avatar or '';scene['skin']=args.skin;scene['native_part']=args.part;scene['canvas_top_padding']=256;scene['construction']='Native angular racing cups, 3D checkerboard tiles, perforated vents, carbon band, orange crown cushion, silver fork suspension and asymmetric boom microphone; no raster planes.'
scene.render.filepath=str(out/(stem+'.png'));bpy.ops.wm.save_as_mainfile(filepath=str(out/(stem+'.blend')));bpy.ops.render.render(write_still=True)
