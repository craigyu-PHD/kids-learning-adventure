"""Retained V5 WebP display variants only, not PNG masters or new art acceptance."""
from pathlib import Path
import hashlib,json,sys
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def verify(manifest):
 assert manifest['contract']=='v64-retained-caregiver-display-v1'
 records=manifest['records'];expected={(r,w) for r in ['father','mother','caregiver'] for w in [128,256,512]}
 assert len(records)==len(expected) and {(r['role'],r['width']) for r in records}==expected,'Exact role/width set required'
 for r in records:
  src=ROOT/f"public/assets/v5/characters/caregivers/avatar-{r['role']}.webp";dst=ROOT/f"public/assets/v6.4/caregiver-display/avatar-{r['role']}-{r['width']}.webp"
  assert r['source']==str(src.relative_to(ROOT)) and r['path']==str(dst.relative_to(ROOT))
  assert hashlib.sha256(src.read_bytes()).hexdigest()==r['sourceSha256'] and hashlib.sha256(dst.read_bytes()).hexdigest()==r['sha256']
  a=Image.open(src);a.load();b=Image.open(dst);b.load();assert a.format==b.format=='WEBP' and a.size==(1024,1024) and b.size==(r['width'],r['width'])
  expected=np.array(a.convert('RGBA').resize(b.size,Image.Resampling.LANCZOS));actual=np.array(b.convert('RGBA'));visible=expected[:,:,3]>0
  assert visible.any() and np.array_equal(expected[:,:,3],actual[:,:,3]),'Alpha changed'
  assert np.array_equal(expected[:,:,:3][visible],actual[:,:,:3][visible]),'Visible RGB changed'
 return {'status':'PASS_RETAINED_DISPLAY_ONLY','records':len(records),'checks':'Exact 3 roles x 3 sizes, paths/hash, format/dimensions, freshly resampled exact alpha and visible RGB. No PNG-master/new-art acceptance.'}
if __name__=='__main__':
 try:result=verify(json.loads(Path(sys.argv[1] if len(sys.argv)>1 else ROOT/'qa/art-gate/caregiver-display/manifest.json').read_text()));print(json.dumps(result))
 except Exception as e:print(json.dumps({'status':'FAIL','error':type(e).__name__+': '+str(e)}));sys.exit(1)
