"""Native rounded fabric explorer bucket hat. Complete model, no texture planes."""
import bpy,math,sys,argparse
from pathlib import Path
from mathutils import Vector,Matrix
p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--avatar',default='brother');a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(n,c,rough=.48,metal=0):
 m=bpy.data.materials.new(n);m.use_nodes=True;nodes=m.node_tree.nodes;bs=nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 if not metal:
  no=nodes.new('ShaderNodeTexNoise');no.inputs['Scale'].default_value=145;bu=nodes.new('ShaderNodeBump');bu.inputs['Strength'].default_value=.12;bu.inputs['Distance'].default_value=.012;m.node_tree.links.new(no.outputs['Fac'],bu.inputs['Height']);m.node_tree.links.new(bu.outputs['Normal'],bs.inputs['Normal'])
 return m
blue=mat('Soft sky woven cotton',(.012,.23,.37));navy=mat('Deep teal cotton band',(.006,.09,.13));stitch=mat('Pale turquoise seam',(.18,.63,.70));gold=mat('Warm sun embroidery thread',(.95,.61,.10),.55,0);ivory=mat('Cream badge backing',(.95,.87,.65),.4)
def mesh(n,v,f,m):
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);o.data.materials.append(m)
 for q in me.polygons:q.use_smooth=True
 return o
def tube(n,pts,r,m):
 cu=bpy.data.curves.new(n,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=4;cu.resolution_u=24;sp=cu.splines.new('POLY');sp.points.add(len(pts)-1)
 for q,co in zip(sp.points,pts):q.co=(*co,1)
 o=bpy.data.objects.new(n,cu);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o
# Low softly domed crown, six subtle sewn panels.
v=[];f=[]
for j in range(33):
 t=j/32;rad=math.sin(t*math.pi/2)**.48;z=.72*math.cos(t*math.pi/2)
 for k in range(129):
  ph=2*math.pi*k/128;wrinkle=1+.012*math.cos(6*ph)*t*t;v.append((rad*math.cos(ph)*wrinkle,.83*rad*math.sin(ph)*wrinkle,z))
for j in range(32):
 for k in range(128):n=j*129+k;f.append((n,n+1,n+130,n+129))
o=mesh('Complete six panel soft crown',v,f,blue);sol=o.modifiers.new('Fabric thickness','SOLIDIFY');sol.thickness=.025
# Sewn brim is a gently curved oval annulus, never a flat pasted disc.
v=[];f=[]
for j in range(17):
 t=j/16;r=1+.27*t
 for k in range(129):
  ph=2*math.pi*k/128;v.append((r*math.cos(ph),.83*r*math.sin(ph),-.025-.075*math.sin(t*math.pi/2)+.018*math.cos(2*ph)*t))
for j in range(16):
 for k in range(128):n=j*129+k;f.append((n,n+1,n+130,n+129))
o=mesh('Soft shaped all around brim',v,f,blue);sol=o.modifiers.new('Bound brim thickness','SOLIDIFY');sol.thickness=.058;bev=o.modifiers.new('Soft brim edge','BEVEL');bev.width=.025;bev.segments=3
for r in [1.06,1.16,1.245]:tube('Concentric sewn brim stitch',[(r*math.cos(t),.83*r*math.sin(t),-.025-.075*math.sin((r-1)/.27*math.pi/2)+.018*math.cos(2*t)*(r-1)/.27+.009) for t in [2*math.pi*k/192 for k in range(193)]],.0035,stitch)
# Narrow fabric band follows crown volume.
v=[];f=[]
for j in range(9):
 z=.035+.13*j/8;r=(1-(z/.72)**2)**.24+.050
 for k in range(129):ph=2*math.pi*k/128;v.append((r*math.cos(ph),.83*r*math.sin(ph),z))
for j in range(8):
 for k in range(128):n=j*129+k;f.append((n,n+1,n+130,n+129))
mesh('Continuous tailored cotton hat band',v,f,navy)
for z in [.049,.151]:
 r=(1-(z/.72)**2)**.24+.053
 for k in range(96):
  t=2*math.pi*k/96;u=t+.035;tube('Individual band stitch',[(r*math.cos(t),.83*r*math.sin(t),z),(r*math.cos(u),.83*r*math.sin(u),z)],.0035,stitch)
for k in range(6):
 ph=math.pi/6+math.pi*k/3;tube('Soft panel top seam',[(math.sin(t)**.48*math.cos(ph)*1.032,.83*math.sin(t)**.48*math.sin(ph)*1.032,.72*math.cos(t)+.006) for t in [i/64*1.40 for i in range(65)]],.007,stitch)
# Little sun medallion, no lettering and no loose dangling hardware.
bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=20,location=(.03,-.869,.215));o=bpy.context.object;o.scale=(.123,.008,.123);o.data.materials.append(ivory)
for ray in range(8):
 t=ray*math.pi/4;tube('Sun rounded embroidered ray',[(.03+.070*math.cos(t),-.889,.215+.070*math.sin(t)),(.03+.097*math.cos(t),-.889,.215+.097*math.sin(t))],.007,gold)
bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=20,location=(.03,-.899,.215));o=bpy.context.object;o.scale=(.046,.008,.046);o.data.materials.append(gold)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True;scene.render.resolution_x=1024;scene.render.resolution_y=1792;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True;scene.view_settings.view_transform='AgX';scene.world.color=(.22,.22,.22)
# Low crown axis follows forehead; body geometry remains unchanged.
fits={'brother':(512,110,178),'younger':(521,206,197),'sister':(538,150,168),'younger-sister':(499,161,175)};cx,cy,px=fits[a.avatar]
# Tilt the complete product 7 degrees to reveal its top; no raster deformation.
bpy.context.view_layer.update()
for obj in list(bpy.context.scene.objects):obj.matrix_world=Matrix.Rotation(math.radians(15),4,'X')@obj.matrix_world
for name,loc,power,size in [('Large warm key',(-3,-5,5),700,5),('Cool soft fill',(4,-4,2),400,4),('Top fabric rim',(0,3,5),500,4)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((0,0,.25))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=((512-cx)/px,-8,(cy+256-896)/px));cam=bpy.context.object;cam.rotation_euler=(math.pi/2,0,0);cam.data.type='ORTHO';cam.data.ortho_scale=1792/px;scene.camera=cam;scene['product_id']='starter-sun-cap';scene['revision']='soft-native-r5';scene['avatar']=a.avatar;scene['construction']='Complete native cotton crown brim stitching band and sun badge; no raster planes';scene.render.filepath=str(out/(a.avatar+'.png'));bpy.ops.wm.save_as_mainfile(filepath=str(out/(a.avatar+'.blend')));bpy.ops.render.render(write_still=True)
