"""Native SKU-specific headphone sculpt. Procedural meshes/curves, no raster planes."""
import bpy,math,json,argparse,sys
from pathlib import Path
from mathutils import Vector,Matrix
p=argparse.ArgumentParser();p.add_argument('--hair-fit', choices=['base','nebula'], default='base');p.add_argument('--out',required=True);p.add_argument('--view',choices=['beauty','side','front'],default='beauty');p.add_argument('--fit-ledger');p.add_argument('--avatar');p.add_argument('--skin',default='default');p.add_argument('--part',choices=['full','back','front'],default='full');args=p.parse_args(sys.argv[sys.argv.index('--')+1:])
SKU='sister-cat-headphones'
RZ=({'brother':2.02,'younger':2.32,'sister':1.99,'younger-sister':1.98}.get(args.avatar,1.83) if args.hair_fit=='nebula' else 1.83)
RX=1.32 if args.hair_fit=='nebula' else 1.26
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,c,metal=0,rough=.34):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,1);n.inputs['Metallic'].default_value=metal*.65;n.inputs['Roughness'].default_value=max(.32,rough);return m
shell=mat('CAT glossy lagoon shell',(.005,.58,.46),.35,.23);white=mat('CAT ivory soft leather',(.91,.87,.75),0,.6);gold=mat('CAT warm gold hinges',(.92,.62,.13),.82,.25);fabric=mat('CAT teal acoustic cloth',(.018,.24,.21),0,.76);pink=mat('CAT rose inner ears',(.92,.26,.60),.12,.4);paw=mat('CAT pearl paw emblem',(.92,1,.98),.2,.27)
# Native shader gradient across inner ears, no texture planes.
n=pink.node_tree.nodes;tex=n.new('ShaderNodeTexCoord');sep=n.new('ShaderNodeSeparateXYZ');ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.98,.5,.46,1);ramp.color_ramp.elements[1].color=(.40,.025,.72,1);pink.node_tree.links.new(tex.outputs['Generated'],sep.inputs[0]);pink.node_tree.links.new(sep.outputs['Z'],ramp.inputs[0]);pink.node_tree.links.new(ramp.outputs['Color'],n.get('Principled BSDF').inputs['Base Color'])
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
  for r,y in [(inner,-yhalf),(outer,-yhalf),(outer,yhalf),(inner,yhalf)]:verts.append(((1.10+(RX-1.10)*max(0,math.sin(a))**.35+r)*math.cos(a),y,.16+(RZ+r)*math.sin(a)))
 faces=[(4*i+j,4*i+(j+1)%4,4*(i+1)+(j+1)%4,4*(i+1)+j) for i in range(72) for j in range(4)]+[(3,2,1,0),(288,289,290,291)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,m,'back');b=o.modifiers.new('Rolled leather and shell edges','BEVEL');b.width=.03;b.segments=4;o.modifiers.new('Band normals','WEIGHTED_NORMAL');return o
band('CAT teal structural padded arch',0,.10,.145,shell);band('CAT thick ivory crown cushion',-.095,.004,.130,white)
for y in [-.146,.146]:tube('CAT rolled teal band seam',[((1.16+(RX-1.10)*math.sin(math.pi*i/48)**.35)*math.cos(math.pi*i/48),y,.16+(RZ+.06)*math.sin(math.pi*i/48)) for i in range(49)],.014,shell,'back')
# Distinct cat ear sculptures fixed to the band, including full rear shells and inset faces.
for sign,side in [(-1,'L'),(1,'R')]:
 pts=[(sign*.40,1.67),(sign*.96,2.16),(sign*1.04,1.42)]
 o=poly(side+' CAT rounded triangular ear shell',pts,.20,shell);o.location.y=.01;o.location.z=(RZ-1.83);o['part']='back';o.modifiers.get('Jeweller bevel').width=.070;o.modifiers.get('Jeweller bevel').segments=8
 pts=[(sign*.58,1.68),(sign*.89,1.99),(sign*.94,1.55)]
 o=poly(side+' CAT soft gradient inner ear',pts,.055,pink);o.location.y=-.117;o.location.z=(RZ-1.83);o['part']='back';o.modifiers.get('Jeweller bevel').width=.035;o.modifiers.get('Jeweller bevel').segments=8
bpy.context.view_layer.update();pivot=Vector((0,0,.16));rear=Matrix.Translation(pivot)@Matrix.Rotation(math.radians(-15),4,'X')@Matrix.Translation(-pivot)
for obj in bpy.context.scene.objects:
 if obj.get('part')=='back':obj.matrix_world=rear@obj.matrix_world
for sign,side in [(-1,'L'),(1,'R')]:
 before=set(bpy.context.scene.objects);x=1.10*sign;z=-.04
 orb(side+' CAT round oval chamber',(x,.015,z),(.242,.18,.29),shell)
 bpy.ops.mesh.primitive_torus_add(major_radius=.209,minor_radius=.069,major_segments=64,minor_segments=20,location=(x,.165,z),rotation=(math.pi/2,0,0));o=bpy.context.object;o.scale=(.91,1.14,1.22);finish(o,side+' CAT true hollow ivory cushion',white)
 disc(side+' CAT recessed acoustic driver',(x,.152,z),.141,.206,.02,fabric)
 disc(side+' CAT thin gold outer bezel',(x,-.10,z),.232,.283,.080,gold);disc(side+' CAT convex jade face',(x,-.151,z),.212,.266,.079,shell)
 # Paw relief with a soft central heart pad and four rounded toe beans.
 for dx,dz,rx,rz in [(-.093,.049,.027,.039),(-.036,.097,.030,.043),(.036,.097,.030,.043),(.093,.049,.027,.039)]:
  o=orb(side+' CAT pearl paw cushion relief',(x+dx,-.209,z+dz),(rx,.018,rz),paw)
 # One continuous softly heart-shaped palm pad, smooth volumetric mesh.
 verts=[];faces=[]
 for ring in range(13):
  rr=math.sin(math.pi*ring/24)
  for k in range(64):
   aa=2*math.pi*k/64;xx=.079*math.cos(aa);zz=.067*math.sin(aa)-.046
   if math.sin(aa)>0:zz-=.020*(1-abs(math.cos(aa)))
   verts.append((x+rr*xx,-.209-.022*math.cos(math.pi*ring/24),z-.046+rr*(zz+.046)))
 for ring in range(12):
  for k in range(64):faces.append((ring*64+k,ring*64+(k+1)%64,(ring+1)*64+(k+1)%64,(ring+1)*64+k))
 mesh=bpy.data.meshes.new(side+' CAT continuous palm');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(side+' CAT pearl heart palm',mesh);bpy.context.collection.objects.link(o);finish(o,o.name,paw)
 for y in [-.013,.15]:tube(side+' CAT forked gilt suspension',[(x,y,.29),(x+sign*.11,y,.18),(x+sign*.155,y,-.01),(x+sign*.10,y,-.16)],.030,gold,'back')
 disc(side+' CAT gold knuckle',(x,-.054,.34),.069,.069,.057,gold)
 disc(side+' CAT embossed hinge inset',(x,-.087,.34),.045,.045,.014,shell)
 for y in [-.02,.085]:tube(side+' CAT adjustable teal stem',[(x,y,.29),(x,y,.48)],.032,shell,'back')
 bpy.context.view_layer.update();pivot=Vector((x,0,z));turn=Matrix.Translation(pivot)@Matrix.Rotation(sign*math.radians(72),4,'Z')@Matrix.Translation(-pivot)
 for obj in set(bpy.context.scene.objects)-before:obj.matrix_world=turn@obj.matrix_world
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True;scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True;scene.world.color=(.18,.18,.18);scene.view_settings.view_transform='AgX'
for name,loc,power,color,size in [('Warm studio key',(-3,-4,5),650,(1,.9,.79),4),('Cool fill',(3,-3,2),480,(.7,.8,1),3),('Top edge',(0,3,3.5),850,(.85,.9,1),3),('Frontal detail',(0,-5,0),90,(1,1,1),2)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.5))-o.location).to_track_quat('-Z','Y').to_euler()
loc={'beauty':(3.2,-7,2.4),'side':(7,-3,2),'front':(0,-8,.7)}[args.view];bpy.ops.object.camera_add(location=loc);cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=3.6;cam.rotation_euler=(Vector((0,0,.65))-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
stem=SKU+'-'+args.view
if args.avatar:
 fit=next(r['fit'] for r in json.loads(Path(args.fit_ledger).read_text())['rows'] if r['avatar']==args.avatar and r['skin']==args.skin);px=fit['px'];fit={**fit,'cy':fit['cy']-12};height=1792;cam.location=((512-fit['cx'])/px,-8,(fit['cy']+256-height/2-.04*px)/px);cam.rotation_euler=(math.pi/2,0,0);cam.data.ortho_scale=height/px;scene.render.resolution_x=1024;scene.render.resolution_y=height;stem=args.avatar+'--'+args.skin+'--'+args.part
for o in bpy.context.scene.objects:
 if o.type in ['MESH','CURVE']:o.hide_render=args.part!='full' and o.get('part')!=args.part
scene['hair_fit']=args.hair_fit;scene['product_id']=SKU;scene['source_revision']='cat-native-r2';scene['avatar']=args.avatar or '';scene['skin']=args.skin;scene['native_part']=args.part;scene['canvas_top_padding']=256;scene['construction']='Native cat ear shells with gradient inset, pearl paw relief, jade oval cups, hollow ivory cushions, gilt pivot and full adjustable forked suspension; no raster planes.'
scene.render.filepath=str(out/(stem+'.png'));bpy.ops.wm.save_as_mainfile(filepath=str(out/(stem+'.blend')));bpy.ops.render.render(write_still=True)
