"""Measure explicit display derivatives; never accepts them as full-size masters."""
import hashlib,json,sys
from pathlib import Path
import numpy as np
from PIL import Image, __version__ as pillow_version

def inspect_display_pair(source, delivery, width):
 checks={};r={'status':'FAIL','checks':checks,'contract':'v64-display-derivative-v1','resampling':'Pillow-RGBA-LANCZOS','pillowVersion':pillow_version}
 try:
  src=Image.open(source);src.load();dst=Image.open(delivery);dst.load()
  checks['formats']=src.format=='PNG' and dst.format=='WEBP'
  checks['knownDisplayWidth']=width in [192,384,768]
  checks['downscaleOnly']=0<width<src.width
  expected_size=(width,round(src.height*width/src.width))
  checks['explicitDimensions']=dst.size==expected_size
  r.update(sourceSha256=hashlib.sha256(Path(source).read_bytes()).hexdigest(),deliverySha256=hashlib.sha256(Path(delivery).read_bytes()).hexdigest(),sourceSize=list(src.size),size=list(dst.size))
  if not all(checks.values()):return r
  expected=np.array(src.convert('RGBA').resize(expected_size,Image.Resampling.LANCZOS));actual=np.array(dst.convert('RGBA'))
  checks['resampledAlphaExact']=bool(np.array_equal(expected[:,:,3],actual[:,:,3]))
  visible=expected[:,:,3]>0
  checks['nonempty']=bool(visible.any())
  checks['resampledVisibleRgbExact']=bool(np.array_equal(expected[:,:,:3][visible],actual[:,:,:3][visible]))
  r['status']='PASS_DISPLAY_DERIVATIVE' if all(checks.values()) else 'FAIL'
 except Exception as e:r['error']=type(e).__name__+': '+str(e)
 return r
if __name__=='__main__':
 r=inspect_display_pair(sys.argv[1],sys.argv[2],int(sys.argv[3]));print(json.dumps(r,indent=2));sys.exit(0 if r['status']=='PASS_DISPLAY_DERIVATIVE' else 1)
