"""Native SKU-specific headphone sculpt. Procedural meshes/curves, no raster planes."""
import bpy,math,json,argparse,sys
from pathlib import Path
from mathutils import Vector,Matrix
p=argparse.ArgumentParser();p.add_argument('--hair-fit',choices=['base','nebula'],default='base');p.add_argument('--out',required=True);p.add_argument('--view',choices=['beauty','side','front'],default='beauty');p.add_argument('--fit-ledger');p.add_argument('--avatar');p.add_argument('--skin',default='default');p.add_argument('--part',choices=['full','back','front'],default='full');args=p.parse_args(sys.argv[sys.argv.index('--')+1:])
SKU='phones-ai'
RZ=({'brother':2.02,'younger':2.32,'sister':1.99,'younger-sister':1.98}.get(args.avatar,1.83) if args.hair_fit=='nebula' else 1.83)+12/({'brother':142.168,'younger':159.577,'sister':133.132,'younger-sister':143.086}.get(args.avatar,142.168)*.966)
RX=1.32 if args.hair_fit=='nebula' else 1.26
def archx(a,r=0):return (1.10+(RX-1.10)*max(0,math.sin(a))**.35+r)*math.cos(a)
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,c,metal=0,rough=.34):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough;return m
silver=mat('AI pearl alloy',(.75,.86,.94),.75,.24);white=mat('AI ceramic white',(.92,.96,1),.25,.25);cyan=mat('AI cyan glass trim',(.0,.56,.91),.45,.2);purple=mat('AI violet memory foam',(.14,.025,.54),0,.58);navy=mat('AI deep display glass',(.005,.022,.075),.45,.15);light=mat('AI luminous cyan eyes',(.10,.87,1),.15,.2);gold=mat('AI small gold axle',(.9,.58,.16),.8,.25)
light.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=(.05,.5,1,1);light.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=.6
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
band('AI ceramic structural bridge',0,.10,.135,white);band('AI deep violet memory crown pad',-.115,.005,.122,purple)
for aa in [.50,.86,1.22,1.58,1.94,2.30,2.66]:
 o=orb('AI flush curved cyan bridge inlay',(archx(aa,0.106000),0,.16+(RZ+0.103000)*math.sin(aa)),(.21,.132,.034),cyan,'back');o.rotation_euler.y=-aa-math.pi/2
for y in [-.135,.135]:tube('AI chrome band border',[(archx(math.pi*i/48,0.065000),y,.16+(RZ+0.065000)*math.sin(math.pi*i/48)) for i in range(49)],.012,silver,'back')
bpy.context.view_layer.update();pivot=Vector((0,0,.16));rear=Matrix.Translation(pivot)@Matrix.Rotation(math.radians(-15),4,'X')@Matrix.Translation(-pivot)
for obj in bpy.context.scene.objects:
 if obj.get('part')=='back':obj.matrix_world=rear@obj.matrix_world
for sign,side in [(-1,'L'),(1,'R')]:
 before=set(bpy.context.scene.objects);x=1.10*sign;z=-.04
 orb(side+' AI polished oval chamber',(x,.025,z),(.249,.17,.31),silver)
 bpy.ops.mesh.primitive_torus_add(major_radius=.218,minor_radius=.065,major_segments=64,minor_segments=20,location=(x,.16,z),rotation=(math.pi/2,0,0));o=bpy.context.object;o.scale=(.89,1.16,1.25);finish(o,side+' AI hollow violet memory foam pad',purple)
 disc(side+' AI violet acoustic driver',(x,.148,z),.15,.22,.02,purple)
 disc(side+' AI cyan layered seal',(x,-.095,z),.238,.302,.084,cyan);disc(side+' AI porcelain oval face',(x,-.15,z),.211,.272,.072,white)
 disc(side+' AI display chrome rim',(x,-.211,z),.171,.211,.046,silver);orb(side+' AI convex deep blue glass',(x,-.241,z),(.155,.052,.191),navy)
 if side=='L':
  # Friendly planet computer, independent 3D eyes, smile, and an orbit ring.
  for ex in [-.057,.057]:
   tube('AI happy eye '+str(ex),[(x+ex-.023,-.295,z+.026),(x+ex,-.303,z+.043),(x+ex+.023,-.295,z+.026)],.010,light)
  tube('AI planet smile',[(x-.038,-.297,z-.050),(x,-.306,z-.073),(x+.038,-.297,z-.050)],.012,light)
  pts=[(x+.238*math.cos(2*math.pi*i/64),-.222+.048*math.sin(2*math.pi*i/64),z+.073*math.sin(2*math.pi*i/64)+.08*math.cos(2*math.pi*i/64)) for i in range(65)];tube('AI tilted orbital silver ring',pts,.018,silver)
  pts=[(xx,yy-.012,zz+.018) for xx,yy,zz in pts];tube('AI cyan orbit light rail',pts,.007,light)
  orb('AI orbital satellite',(x-.20,-.25,z+.115),(.037,.03,.037),cyan)
 else:
  bpy.ops.mesh.primitive_torus_add(major_radius=.126,minor_radius=.014,major_segments=64,minor_segments=12,location=(x,-.294,z),rotation=(math.pi/2,0,0));finish(bpy.context.object,'AI circular cyan touch control',light)
  orb('AI touch glass',(x,-.290,z),(.106,.018,.106),cyan)
  tube('AI short control microphone',[(x+.075,-.22,z-.14),(x+.14,-.34,z-.27)],.018,silver);orb('AI microphone soft tip',(x+.145,-.345,z-.281),(.039,.030,.054),cyan)
 # Native raised swept fins with curved volume and violet inner lens.
 for m,scale,y in [(cyan,1,-.02),(purple,.76,-.074)]:
  o=orb(side+' AI swept oval side fin',(x+sign*.135,y,.43),(.095*scale,.045,.19*scale),m);o.rotation_euler.y=sign*.50
 for y in [-.015,.15]:tube(side+' AI bifurcated alloy yoke',[(x,y,.29),(x+sign*.11,y,.20),(x+sign*.16,y,.01),(x+sign*.1,y,-.16)],.029,silver,'back')
 orb(side+' AI spherical gold knuckle',(x+sign*.10,-.025,.25),(.06,.05,.062),gold)
 for y in [-.02,.08]:tube(side+' AI telescopic chrome support',[(x,y,.29),(x,y,.46)],.027,silver,'back')
 bpy.context.view_layer.update();pivot=Vector((x,0,z));turn=Matrix.Translation(pivot)@Matrix.Rotation(sign*math.radians(60),4,'Z')@Matrix.Translation(-pivot)
 for obj in set(bpy.context.scene.objects)-before:obj.matrix_world=turn@obj.matrix_world
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True;scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True;scene.world.color=(.18,.18,.18);scene.view_settings.view_transform='AgX'
for name,loc,power,color,size in [('Warm studio key',(-3,-4,5),650,(1,.9,.79),4),('Cool fill',(3,-3,2),480,(.7,.8,1),3),('Top edge',(0,3,3.5),850,(.85,.9,1),3),('Frontal detail',(0,-5,0),90,(1,1,1),2)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.5))-o.location).to_track_quat('-Z','Y').to_euler()
loc={'beauty':(-3.2,-7,2.4),'side':(7,-3,2),'front':(0,-8,.7)}[args.view];bpy.ops.object.camera_add(location=loc);cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=3.6;cam.rotation_euler=(Vector((0,0,.65))-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
stem=SKU+'-'+args.view
if args.avatar:
 fit=next(r['fit'] for r in json.loads(Path(args.fit_ledger).read_text())['rows'] if r['avatar']==args.avatar and r['skin']==args.skin);px=fit['px'];height=1792;cam.location=((512-fit['cx'])/px,-8,(fit['cy']+256-height/2-.04*px)/px);cam.rotation_euler=(math.pi/2,0,0);cam.data.ortho_scale=height/px;scene.render.resolution_x=1024;scene.render.resolution_y=height;stem=args.avatar+'--'+args.skin+'--'+args.part
for o in bpy.context.scene.objects:
 if o.type in ['MESH','CURVE']:o.hide_render=args.part!='full' and o.get('part')!=args.part
scene['hair_fit']=args.hair_fit;scene['product_id']=SKU;scene['source_revision']='ai-native-r2';scene['avatar']=args.avatar or '';scene['skin']=args.skin;scene['native_part']=args.part;scene['canvas_top_padding']=256;scene['construction']='Native asymmetric AI planet face and orbital ring, opposite touch control and microphone, cyan segmented white bridge, violet hollow pads, side fins and alloy yokes; no raster planes.'
scene.render.filepath=str(out/(stem+'.png'));bpy.ops.wm.save_as_mainfile(filepath=str(out/(stem+'.blend')));bpy.ops.render.render(write_still=True)
