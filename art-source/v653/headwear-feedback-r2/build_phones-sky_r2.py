"""Native SKU-specific headphone sculpt. Procedural meshes/curves, no raster planes."""
import bpy,math,json,argparse,sys
from pathlib import Path
from mathutils import Vector,Matrix
p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--view',choices=['beauty','side','front'],default='beauty');p.add_argument('--fit-ledger');p.add_argument('--avatar');p.add_argument('--skin',default='default');p.add_argument('--part',choices=['full','back','front'],default='full');args=p.parse_args(sys.argv[sys.argv.index('--')+1:])
SKU='phones-sky'
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,c,metal=0,rough=.34):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,1);n.inputs['Metallic'].default_value=metal*.65;n.inputs['Roughness'].default_value=max(.32,rough);return m
shell=mat('Glazed clear sky blue',(.015,.42,.79),.45,.23);white=mat('Soft ivory cloud leather',(.90,.92,.95),0,.55);gold=mat('Warm wing gold',(.90,.53,.09),.82,.25);fabric=mat('White acoustic knit',(.61,.7,.78),0,.75);blue=mat('Celestial blue enamel',(.025,.62,.92),.30,.18);silver=mat('Pearl white wing inlay',(.94,.94,.87),.13,.35)
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
  for r,y in [(inner,-yhalf),(outer,-yhalf),(outer,yhalf),(inner,yhalf)]:verts.append(((1.10+.16*max(0,math.sin(a))**.35+r)*math.cos(a),y,.16+(1.83+r)*math.sin(a)))
 faces=[(4*i+j,4*i+(j+1)%4,4*(i+1)+(j+1)%4,4*(i+1)+j) for i in range(72) for j in range(4)]+[(3,2,1,0),(288,289,290,291)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,m,'back');b=o.modifiers.new('Rolled leather and shell edges','BEVEL');b.width=.03;b.segments=4;o.modifiers.new('Band normals','WEIGHTED_NORMAL');return o
band('SKY lightweight rounded blue bridge',0,.09,.125,shell);band('SKY white cushioned inner arch',-.10,.004,.115,white)
for y in [-.131,.131]:tube('SKY gilded continuous shell piping',[((1.145+.16*math.sin(math.pi*i/48)**.35)*math.cos(math.pi*i/48),y,.16+1.875*math.sin(math.pi*i/48)) for i in range(49)],.012,gold,'back')
bpy.context.view_layer.update();pivot=Vector((0,0,.16));rear=Matrix.Translation(pivot)@Matrix.Rotation(math.radians(-15),4,'X')@Matrix.Translation(-pivot)
for obj in bpy.context.scene.objects:
 if obj.get('part')=='back':obj.matrix_world=rear@obj.matrix_world
for sign,side in [(-1,'L'),(1,'R')]:
 before=set(bpy.context.scene.objects);x=1.10*sign;z=-.04
 orb(side+' SKY spherical acoustic shell',(x,.025,z),(.26,.18,.295),shell)
 bpy.ops.mesh.primitive_torus_add(major_radius=.215,minor_radius=.065,major_segments=64,minor_segments=20,location=(x,.16,z),rotation=(math.pi/2,0,0));o=bpy.context.object;o.scale=(.96,1.10,1.2);finish(o,side+' SKY hollow white memory foam ear cushion',white)
 disc(side+' SKY woven inner driver',(x,.15,z),.159,.21,.02,fabric)
 disc(side+' SKY pearl perimeter',(x,-.084,z),.247,.283,.10,white);disc(side+' SKY blue convex cup face',(x,-.144,z),.218,.258,.08,shell)
 disc(side+' SKY satin blue recessed medallion',(x,-.213,z),.160,.197,.045,blue)
 # One legible soft cloud relief is built into the blue outer shell.
 for cx,cz,rx,rz in [(-.073,-.012,.050,.048),(-.023,.027,.070,.071),(.049,.008,.062,.057),(.080,-.035,.040,.032)]:
  orb(side+' SKY cloud volume',(x+cx,-.286,z+cz),(rx,.028,rz),white)
 orb(side+' SKY rounded cloud base',(x+.002,-.289,z-.038),(.117,.027,.030),white)
 for y in [-.005,.155]:tube(side+' SKY forked floating suspension',[(x,y,.30),(x+sign*.14,y,.21),(x+sign*.18,y,-.03),(x+sign*.13,y,-.20)],.030,gold,'back')
 orb(side+' SKY enclosed gilt pivot',(x+sign*.12,-.01,.14),(.059,.052,.064),gold)
 for y in [-.03,.09]:tube(side+' SKY telescoping white stem',[(x,y,.26),(x,y,.43)],.025,white,'back')
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
scene['product_id']=SKU;scene['source_revision']='sky-cloud-native-feedback-r2';scene['avatar']=args.avatar or '';scene['skin']=args.skin;scene['native_part']=args.part;scene['canvas_top_padding']=256;scene['construction']='Native blue/white round cups, layered pearl wing feathers, four-point star, cloud relief, hollow white cushions and gilt suspension; no raster planes.'
scene.render.filepath=str(out/(stem+'.png'));bpy.ops.wm.save_as_mainfile(filepath=str(out/(stem+'.blend')));bpy.ops.render.render(write_still=True)
