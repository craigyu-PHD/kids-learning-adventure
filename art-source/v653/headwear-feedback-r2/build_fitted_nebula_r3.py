"""True native curved hair shell with independent tapered fibres. Alpha is a fit contour only."""
import bpy,math,sys,argparse,json,random
from pathlib import Path
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--avatar',default='sister');a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.out);out.mkdir(parents=True,exist_ok=True);ref=json.loads((Path(__file__).parent/(a.avatar+'-hair-shape-reference-r3.json')).read_text());mask=ref['mask'];rows=len(mask);cols=len(mask[0]);x0,y0=ref['origin'];step=ref['step'];partx,party=ref['part'];random.seed(58)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(n,c):
 m=bpy.data.materials.new(n);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*c,1);b.inputs['Roughness'].default_value=.5;return m
colors=[(.025,.007,.002),(.045,.014,.005),(.068,.023,.010),(.094,.035,.015),(.16,.047,.24),(.035,.10,.22)];materials=[mat('Native keratin '+str(i),c) for i,c in enumerate(colors)]
def inside(x,z):
 k=int((x-x0)/step);j=int((z-y0)/step);return 0<=j<rows and 0<=k<cols and mask[j][k]
def depth(x,z):
 # A rounded shell follows the head and falls back along the bob sides.
 dx=(x-520)/235;dy=(z-215)/285;r=max(.035,1-dx*dx-.4*dy*dy);angle=math.atan2(z-party+75,x-partx);return -.77*math.sqrt(r)-.020*math.sin(15*angle+.4*math.sin(z*.018))+.007*math.sin(x*.055+z*.016)
verts=[];faces=[];index={}
for j in range(rows):
 for k in range(cols):
  if not mask[j][k]:continue
  x=x0+k*step;z=y0+j*step;index[j,k]=len(verts);verts.append(((x-512)/180,depth(x,z),(256-z)/180))
for j in range(rows-1):
 for k in range(cols-1):
  q=[index.get((j,k)),index.get((j,k+1)),index.get((j+1,k+1)),index.get((j+1,k))]
  if all(x is not None for x in q):faces.append(tuple(q))
mesh=bpy.data.meshes.new('Whole fitted hair shell');mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new('Whole fitted three dimensional hair volume',mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(materials[0]);solid=obj.modifiers.new('Actual hair volume thickness','SOLIDIFY');solid.thickness=.035;solid.offset=1;bevel=obj.modifiers.new('Soft outer hair silhouette','BEVEL');bevel.width=.003;bevel.segments=2
for poly in mesh.polygons:poly.use_smooth=True
cu=bpy.data.curves.new('Combed bob hair fibres','CURVE');cu.dimensions='3D';cu.bevel_depth=.0015;cu.bevel_resolution=1;cu.resolution_u=1;ob=bpy.data.objects.new('Individual native tapered fibre paths',cu);bpy.context.collection.objects.link(ob)
for m in materials:cu.materials.append(m)
def flow(x,z):
 dx=x-partx;dy=z-party
 w=.5+.5*math.tanh((z-220)/65);w2=.5+.5*math.tanh((z-365)/50)
 vx=(1-w)*dx*.013+w*dx*.002
 vz=(1-w)*(.48+max(0,dy)*.012)+w
 vx=(1-w2)*vx+w2*(520-x)*.008
 vz=(1-w2)*vz+w2*.8
 vx+=.10*math.sin(z*.022+x*.008)
 length=math.hypot(vx,vz);return vx/length,vz/length
cells=list(index)
for n in range(14000):
 j,k=random.choice(cells);x=x0+k*step+random.uniform(-1.4,1.4);z=y0+j*step+random.uniform(-1.4,1.4)
 if not inside(x,z):continue
 points=[(x,z)];desired=random.randint(55,130)
 for sign in [-1,1]:
  xx,zz=x,z;seq=[]
  for ii in range(desired):
   vx,vz=flow(xx,zz);xx+=sign*vx*2.2;zz+=sign*vz*2.2
   if not inside(xx,zz):break
   seq.append((xx,zz))
  if sign<0:points=list(reversed(seq))+points
  else:points+=seq
 if len(points)<8:continue
 sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
 # Soft violet/blue streaks are fibres, never bright emissive or metallic paint.
 stripe=(x-partx)*.75+(z-party)*.20
 sp.material_index=4 if -125<stripe<-105 or 65<stripe<78 else (5 if -87<stripe<-77 else random.choices([0,1,2,3],[.2,.45,.3,.05])[0])
 offset=random.uniform(.005,.021)
 for i,(pt,(xx,zz)) in enumerate(zip(sp.points,points)):
  t=i/(len(points)-1);pt.co=((xx-512)/180,depth(xx,zz)-offset-.002*math.sin(i*.13+n),(256-zz)/180,1);pt.radius=max(.025,math.sin(math.pi*(.03+.94*t))**.30)*random.uniform(.7,1.1)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.render.resolution_x=1024;scene.render.resolution_y=1792;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True;scene.view_settings.view_transform='AgX';scene.world.color=(.20,.20,.20)
for name,loc,pow,size in [('Soft key',(-3,-5,6),600,5),('Soft fill',(4,-4,2),280,4),('Warm rim',(0,4,4),450,4)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=pow;o.data.size=size;o.rotation_euler=(Vector((0,0,.25))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-8,(512-896)/180));cam=bpy.context.object;cam.rotation_euler=(math.pi/2,0,0);cam.data.type='ORTHO';cam.data.ortho_scale=1792/180;scene.camera=cam;scene['product_id']='hair-nebula';scene['revision']='fitted-fibres-r3';scene['avatar']=a.avatar;scene['shape_reference']=ref['reference'];scene['shape_reference_sha256']=ref['referenceSHA256'];scene['construction']='Native non-planar curved closed shell and 7400 individually tapered curve fibres. Input alpha provides fit contour only; zero RGB textures or image planes.';scene.render.filepath=str(out/(a.avatar+'.png'));bpy.ops.wm.save_as_mainfile(filepath=str(out/(a.avatar+'.blend')));bpy.ops.render.render(write_still=True)
