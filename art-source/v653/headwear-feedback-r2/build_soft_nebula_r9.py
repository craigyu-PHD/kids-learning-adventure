"""Complete native sculpted side-part hair; editable mesh locks, no raster planes."""
import bpy, math, sys, argparse, json
from pathlib import Path
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--avatar',default='brother');a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(n,c,rough=.58):
 m=bpy.data.materials.new(n);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=0;noise=m.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=180;noise.inputs['Roughness'].default_value=.8;bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.018;m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal']);return m
brown=mat('Soft chestnut keratin',(.028,.009,.003));light=mat('Warm chestnut ridges',(.052,.018,.006));purple=mat('Subtle nebula violet tint',(.071,.025,.11));dark=mat('Deep natural roots',(.024,.007,.002),.55)
def mesh(n,v,f,m):
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);o.data.materials.append(m)
 for q in me.polygons:q.use_smooth=True
 return o
# Rounded scalp follows a human head; forehead opens naturally, temples descend.
v=[];f=[]
for j in range(49):
 for k in range(97):
  ph=math.pi+math.pi*k/96;front=max(0,-math.sin(ph));theta=(1.98-.75*front)*j/48
  v.append((math.sin(theta)*math.cos(ph),.74*math.sin(theta)*math.sin(ph),math.cos(theta)))
for j in range(48):
 for k in range(96):n=j*97+k;f.append((n,n+1,n+98,n+97))
mesh('One continuous scalp volume',v,f,dark)
def tube_lock(name,pts,r,m):
 # varying cross-section produces tapered cohesive locks rather than uniform noodles.
 v=[];f=[]
 for i,co in enumerate(pts):
  t=i/(len(pts)-1);prev=Vector(pts[max(0,i-1)]);nex=Vector(pts[min(len(pts)-1,i+1)]);tan=(nex-prev).normalized();normal=Vector((co[0],co[1]/.74,co[2])).normalized();side=tan.cross(normal).normalized();up=side.cross(tan).normalized();radius=r*(.015+.985*math.sin(math.pi*(.10+.90*t))**.55)
  for k in range(12):
   aa=2*math.pi*k/12;pt=Vector(co)+radius*(side*math.cos(aa)+up*.48*math.sin(aa));v.append(tuple(pt))
 for i in range(len(pts)-1):
  for k in range(12):n=i*12+k;nn=i*12+(k+1)%12;f.append((n,nn,nn+12,n+12))
 f += [tuple(range(11,-1,-1)),tuple((len(pts)-1)*12+k for k in range(12))]
 return mesh(name,v,f,m)
# Thousands of genuinely separate tapered fibres form a soft side-part volume.
import random
random.seed(62)
curve=bpy.data.curves.new('Natural combed fibre assembly','CURVE');curve.dimensions='3D';curve.bevel_depth=.0028;curve.bevel_resolution=1;curve.resolution_u=1
obj=bpy.data.objects.new('Complete native side-part fibres',curve);bpy.context.collection.objects.link(obj)
for c in [(.020,.006,.002),(.034,.010,.003),(.046,.015,.005),(.060,.021,.007),(.085,.031,.155)]:curve.materials.append(mat('Keratin fibre '+str(c),c,.48))
for side,count in [(-1,3200),(1,2400)]:
 for j in range(count):
  frac=.5+.5*random.random();phi=(math.pi/2+math.pi*frac) if side<0 else (math.pi/2-math.pi*frac)
  y0=.86*math.cos(math.pi*frac);x0=.20+.05*math.sin(frac*math.pi)+random.uniform(-.015,.015)
  start=Vector((x0,y0,math.sqrt(max(.01,1-x0*x0-y0*y0))))
  front=max(0,-math.sin(phi));endtheta=2.00-.73*front+random.uniform(-.045,.045)
  end=Vector((math.sin(endtheta)*math.cos(phi),math.sin(endtheta)*math.sin(phi),math.cos(endtheta)))
  sp=curve.splines.new('POLY');sp.points.add(48);sp.material_index=(4 if side == -1 and .80 < frac < .91 and random.random()<.35 else random.choices([0,1,2,3],[.38,.35,.22,.05])[0]);wave=random.uniform(.005,.040);phase=random.random()*6;root=1.018+random.uniform(-.004,.018)
  for i,pt in enumerate(sp.points):
   t=i/48;v=(start*(1-t)+end*t).normalized();rad=root+wave*math.sin(math.pi*t)+.004*math.sin(phase+10*t)*math.sin(math.pi*t)
   pt.co=(rad*v.x,.77*rad*v.y,rad*v.z,1);pt.radius=max(.035,(1-t)**.22)*random.uniform(.75,1.15)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.render.resolution_x=1024;scene.render.resolution_y=1792;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True;scene.view_settings.view_transform='AgX';scene.world.color=(.22,.22,.22)
# Four independent head scales and crown centres, body canvas remains fixed.
fits={'brother':(511,176,175),'younger':(522,211,198),'sister':(538,182,173),'younger-sister':(502,186,179)};cx,cy,px=fits[a.avatar]
for name,loc,pow,size in [('soft key',(-3,-5,6),620,5),('soft fill',(4,-4,2),330,4),('warm rim',(0,4,4),700,4)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=pow;o.data.size=size;o.rotation_euler=(Vector((0,0,.25))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=((512-cx)/px,-8,(cy+256-896)/px));cam=bpy.context.object;cam.rotation_euler=(math.pi/2,0,0);cam.data.type='ORTHO';cam.data.ortho_scale=1792/px;scene.camera=cam
scene['product_id']='hair-nebula';scene['revision']='soft-native-r9-internal-violet-fibres';scene['avatar']=a.avatar;scene['construction']='Native scalp and individually tapered swept locks; no textures, raster planes, or body modifications';scene.render.filepath=str(out/(a.avatar+'.png'));bpy.ops.wm.save_as_mainfile(filepath=str(out/(a.avatar+'.blend')));bpy.ops.render.render(write_still=True)
