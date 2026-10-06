#!/usr/bin/env python3
"""FreshShop density correction wrapper. Frozen run.py remains byte-identical."""
import importlib.util,hashlib,io,json
from pathlib import Path
from PIL import Image
from urllib.parse import unquote
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('feedback_frozen_fresh_shop',HERE/'run.py');frozen=importlib.util.module_from_spec(spec);spec.loader.exec_module(frozen)
FROZEN_SHA='6454034c5f095c10cdae43b91b00e2b95b0833d626264d8c562905b696cd2888'
assert frozen.sha(HERE/'run.py')==FROZEN_SHA,'frozen dependency changed'
META=r'''image=>[...document.images].filter(i=>{const r=i.getBoundingClientRect();return new URL(i.currentSrc||i.src,location.href).pathname===image.src&&i.naturalWidth===image.width&&i.naturalHeight===image.height&&(!image.rect||(Math.abs(r.left-image.rect.left)<1&&Math.abs(r.top-image.rect.top)<1&&Math.abs(r.width-image.rect.width)<1&&Math.abs(r.height-image.rect.height)<1))}).map(i=>({srcset:i.getAttribute('srcset')||'',sizes:i.getAttribute('sizes')||'',currentSrc:i.currentSrc,selectedDescriptors:(i.getAttribute('srcset')||'').split(',').map(s=>s.trim().split(/\s+/)).filter(t=>t.length===2&&new URL(t[0],location.href).href===i.currentSrc).map(t=>t[1])}))'''
def dimensions(natural,physical,meta):
 assert all(n>0 for n in natural),'natural image not loaded'
 if not meta['srcset']:
  assert natural==physical,('non-responsive natural raster mismatch',natural,physical)
  return {'densityCorrected':False,'dimensionsExact':True,'aspectMatches':True}
 descriptors=meta['selectedDescriptors'];assert descriptors and all(d.endswith('w') and float(d[:-1])==physical[0] for d in descriptors),('selected responsive descriptor differs from pinned raster width',descriptors,physical)
 assert abs(natural[1]-natural[0]*physical[1]/physical[0])<=1,('density corrected aspect mismatch',natural,physical)
 return {'densityCorrected':True,'dimensionsExact':False,'selectedDescriptorMatchesPinnedWidth':True,'aspectMatches':True,'dimensionsValid':True}
class DensityFreshShop(frozen.FreshShop):
 def __init__(self,*args,**kwargs):
  super().__init__(*args,**kwargs);self.report['runnerSHA256']=frozen.sha(__file__);self.report['preservedRunnerDependencies']={str((HERE/'run.py').relative_to(frozen.ROOT.resolve())):FROZEN_SHA};self.report['densityCorrection']='width srcset: descriptor equals physical width; positive density-corrected DOM and <=1px aspect tolerance; no decode'
 def dimension_proof(self,p,proof):
  results=[]
  for image in proof['images']:
   if image.get('visible') is False:continue
   path=image['src'];assert path.startswith('/assets/');file=(frozen.ROOT/'public'/unquote(path.lstrip('/'))).resolve();assert file.is_relative_to((frozen.ROOT/'public').resolve())
   pinned=self.asset_pins.get(path);assert pinned is not None,('raster absent from pre-run pins',path)
   data=frozen.read_bytes(file);assert hashlib.sha256(data).hexdigest()==pinned
   with Image.open(io.BytesIO(data)) as raster:physical=list(raster.size)
   natural=[image['width'],image['height']];matches=p.evaluate(META,image);assert matches,('actual image remounted before dimension proof',path,natural)
   validations=[dimensions(natural,physical,meta) for meta in matches];responsive=any(v['densityCorrected'] for v in validations)
   actual=p.evaluate(frozen.FETCH,path);assert actual['status']==200 and actual['sha256']==pinned
   results.append({'path':path,'domNatural':natural,'pinnedFileSize':physical,'expectedSHA256':pinned,'http':actual,'densityCorrected':responsive,'dimensionsExact':not responsive,'dimensionsValid':True,'aspectMatches':True,'responsiveSelections':matches,'validation':validations})
  return results
frozen.FreshShop=DensityFreshShop
if __name__=='__main__':raise SystemExit(frozen.main())
