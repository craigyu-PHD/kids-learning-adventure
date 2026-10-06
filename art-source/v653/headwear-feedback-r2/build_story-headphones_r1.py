"""Native SKU-specific headphone sculpt. Procedural meshes/curves, no raster planes."""
import bpy,math,json,argparse,sys
from pathlib import Path
from mathutils import Vector,Matrix
p=argparse.ArgumentParser();p.add_argument('--hair-fit',choices=['base','nebula'],default='base');p.add_argument('--out',required=True);p.add_argument('--view',choices=['beauty','side','front'],default='beauty');p.add_argument('--fit-ledger');p.add_argument('--avatar');p.add_argument('--skin',default='default');p.add_argument('--part',choices=['full','back','front'],default='full');args=p.parse_args(sys.argv[sys.argv.index('--')+1:])
SKU='story-headphones'
RZ=({'brother':2.02,'younger':2.32,'sister':1.99,'younger-sister':1.98}.get(args.avatar,1.83) if args.hair_fit=='nebula' else 1.83)+12/({'brother':142.168,'younger':159.577,'sister':133.132,'younger-sister':143.086}.get(args.avatar,142.168)*.966)
RX=1.32 if args.hair_fit=='nebula' else 1.26
def archx(a,r=0):return (1.10+(RX-1.10)*max(0,math.sin(a))**.35+r)*math.cos(a)
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,c,metal=0,rough=.34):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough;return m
purple=mat('Royal violet lacquer',(.075,.018,.38),.4,.23);violet=mat('Lilac padded leather',(.39,.10,.70),0,.48);gold=mat('Brushed storybook gold',(.92,.53,.11),.78,.25);navy=mat('Deep indigo cushion textile',(.018,.028,.16),0,.65);paper=mat('Warm ivory page edges',(.99,.85,.58),0,.52);ink=mat('Fine gilt manuscript lines',(.6,.28,.04),.55,.34);blue=mat('Luminous sky book jewel',(.015,.5,.82),.45,.18)
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
band('STORY continuous violet crown shell',0,.11,.135,purple);band('STORY plush lilac cushion',-.12,.006,.122,violet)
for y in [-.14,.14]:tube('STORY continuous gilt piping',[(archx(math.pi*i/48,0.050000),y,.16+(RZ+0.050000)*math.sin(math.pi*i/48)) for i in range(49)],.015,gold,'back')
for a in [math.pi*.25,math.pi*.38,math.pi*.5,math.pi*.62,math.pi*.75]:
 tube('STORY segmented cushion seam',[(archx(a,-0.105000),y,.16+(RZ+-0.105000)*math.sin(a)) for y in [-.116,-.04,.04,.116]],.006,purple,'back')
# Crown portion bends gently behind the head; no artificial elevated halo.
bpy.context.view_layer.update();pivot=Vector((0,0,.16));rear=Matrix.Translation(pivot)@Matrix.Rotation(math.radians(-15),4,'X')@Matrix.Translation(-pivot)
for obj in bpy.context.scene.objects:
 if obj.get('part')=='back':obj.matrix_world=rear@obj.matrix_world
for sign,side in [(-1,'L'),(1,'R')]:
 before=set(bpy.context.scene.objects);x=1.1*sign;z=-.04
 orb(side+' STORY oval acoustic chamber',(x,.03,z),(.225,.17,.33),purple)
 bpy.ops.mesh.primitive_torus_add(major_radius=.215,minor_radius=.064,major_segments=64,minor_segments=20,location=(x,.15,z),rotation=(math.pi/2,0,0));o=bpy.context.object;o.scale=(.8,1.22,1.25);finish(o,side+' STORY thick hollow fabric ear cushion',navy)
 disc(side+' STORY recessed cloth driver',(x,.147,z),.142,.242,.02,navy)
 disc(side+' STORY double gilt oval frame',(x,-.075,z),.225,.328,.09,gold);disc(side+' STORY indigo relief face',(x,-.136,z),.191,.288,.08,purple)
 # Raised open book. Separately curved left/right pages, real page thickness.
 for leaf in [-1,1]:
  pts=[(x,z+.09),(x+leaf*.105,z+.145),(x+leaf*.113,z-.065),(x,z-.11)]
  o=poly(side+' STORY bound gold book cover '+str(leaf),pts,.024,gold);o.location.y=-.206
  pts2=[(x+leaf*.012,z+.083),(x+leaf*.093,z+.124),(x+leaf*.099,z-.051),(x+leaf*.012,z-.093)]
  o=poly(side+' STORY ivory page block '+str(leaf),pts2,.018,paper);o.location.y=-.224
  for k in range(4):tube(side+' STORY engraved page text',[(x+leaf*.026,-.237,z+.047-k*.026),(x+leaf*.079,-.237,z+.066-k*.026)],.0035,ink)
 tube(side+' STORY book spine',[(x,-.239,z-.105),(x,-.245,z+.09)],.008,gold)
 o=poly(side+' STORY lapis bookmark',[(x,z+.028),(x+.025,z-.012),(x,z-.061),(x-.025,z-.012)],.015,blue);o.location.y=-.251
 # Satin bow over cup and suspended gold star under cup are SKU-specific.
 for leaf in [-1,1]:
  # Bow loop is folded ribbon with a rounded tip and a depressed central fold.
  verts=[];faces=[]
  for ti in range(25):
   t=ti/24;xx=x+leaf*(.008+.112*t);half=.010+.040*math.sin(math.pi*t)**.60
   for vi in range(9):
    v=-1+vi/4;verts.append((xx,-.18-.033*math.sin(math.pi*t)*(1-.55*v*v)+.008*math.cos(v*math.pi),.266+.014*t+v*half))
  for ti in range(24):
   for vi in range(8):n=ti*9+vi;faces.append((n,n+1,n+10,n+9))
  mesh=bpy.data.meshes.new(side+' folded satin loop');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(side+' STORY rounded folded ribbon '+str(leaf),mesh);bpy.context.collection.objects.link(o);finish(o,o.name,violet)
  solid=o.modifiers.new('Real ribbon thickness','SOLIDIFY');solid.thickness=.010
  sub=o.modifiers.new('Soft fabric subdivision','SUBSURF');sub.levels=2;sub.render_levels=2
  o=poly(side+' STORY satin bow tail '+str(leaf),[(x,.253),(x+leaf*.05,.226),(x+leaf*.08,.12),(x+leaf*.045,.15),(x+leaf*.02,.125)],.022,violet);o.location.y=-.185
 orb(side+' STORY bow knot',(x,-.192,.259),(.027,.025,.035),gold)
 tube(side+' STORY lower pendant chain',[(x,-.15,-.34),(x,-.15,-.41)],.008,gold);star(side+' STORY hanging star',x,-.15,-.45,.07,gold)
 for height in [.175,-.222]:star(side+' STORY face constellation',x,-.205,height,.023,gold)
 # Full bifurcated yoke, gold rotating knuckle, and two telescoping stems.
 for y in [-.015,.15]:tube(side+' STORY full swivel fork',[(x,y,.31),(x+sign*.10,y,.21),(x+sign*.155,y,-.04),(x+sign*.115,y,-.22)],.034,gold,'back')
 orb(side+' STORY knuckle pivot',(x+sign*.10,-.04,.15),(.063,.055,.063),gold)
 for y in [-.03,.09]:tube(side+' STORY telescoping arm',[(x,y,.29),(x,y,.44)],.027,gold,'back')
 # All cup components rotate as a rigid native assembly toward the ear.
 bpy.context.view_layer.update();pivot=Vector((x,0,z));turn=Matrix.Translation(pivot)@Matrix.Rotation(sign*math.radians(60),4,'Z')@Matrix.Translation(-pivot)
 for obj in set(bpy.context.scene.objects)-before:obj.matrix_world=turn@obj.matrix_world
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True;scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True;scene.world.color=(.18,.18,.18);scene.view_settings.view_transform='AgX'
for name,loc,power,color,size in [('Warm studio key',(-3,-4,5),650,(1,.9,.79),4),('Cool fill',(3,-3,2),480,(.7,.8,1),3),('Top edge',(0,3,3.5),850,(.85,.9,1),3),('Frontal detail',(0,-5,0),90,(1,1,1),2)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.5))-o.location).to_track_quat('-Z','Y').to_euler()
loc={'beauty':(3.2,-7,2.4),'side':(7,-3,2),'front':(0,-8,.7)}[args.view];bpy.ops.object.camera_add(location=loc);cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=3.6;cam.rotation_euler=(Vector((0,0,.65))-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
stem=SKU+'-'+args.view
if args.avatar:
 fit=next(r['fit'] for r in json.loads(Path(args.fit_ledger).read_text())['rows'] if r['avatar']==args.avatar and r['skin']==args.skin);px=fit['px'];height=1792;cam.location=((512-fit['cx'])/px,-8,(fit['cy']+256-height/2-.04*px)/px);cam.rotation_euler=(math.pi/2,0,0);cam.data.ortho_scale=height/px;scene.render.resolution_x=1024;scene.render.resolution_y=height;stem=args.avatar+'--'+args.skin+'--'+args.part
for o in bpy.context.scene.objects:
 if o.type in ['MESH','CURVE']:o.hide_render=args.part!='full' and o.get('part')!=args.part
scene['hair_fit']=args.hair_fit;scene['product_id']=SKU;scene['source_revision']='story-native-r2';scene['avatar']=args.avatar or '';scene['skin']=args.skin;scene['native_part']=args.part;scene['canvas_top_padding']=256;scene['construction']='Native open-book page relief, bows, pendants, oval acoustic cups, true hollow cushions, yokes and hinges; no raster planes.'
scene.render.filepath=str(out/(stem+'.png'));bpy.ops.wm.save_as_mainfile(filepath=str(out/(stem+'.blend')));bpy.ops.render.render(write_still=True)
