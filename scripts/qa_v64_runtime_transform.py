"""Verify a traced, authorized single-accessory transform and optional own-body mask."""
import sys,json,hashlib
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import numpy as np
from qa_v64_image_pair import inspect_pair

e=json.loads(Path(sys.argv[1]).read_text())
def read(link):
 p=Path(link['path']);assert hashlib.sha256(p.read_bytes()).hexdigest()==link['sha256'],str(p)
 return p
raw=read(e['rawNative']);der=read(e['derivedPng']);delivery=read(e['delivery']);t=json.loads(read(e['transform']).read_text())
assert t['sourceSha256']==e['rawNative']['sha256'] and t['derivedSha256']==e['derivedPng']['sha256']
a=Image.open(raw).convert('RGBA');s=t['transform']['uniformScale'];assert 0<s<=2
resized=a.resize((round(a.width*s),round(a.height*s)),Image.Resampling.LANCZOS)
expected=Image.new('RGBA',(1024,1536));expected.alpha_composite(resized,(t['transform']['translateX'],t['transform']['translateY']))
assert np.array_equal(np.asarray(expected),np.asarray(Image.open(der).convert('RGBA'))),'Derived pixels differ from trace'
assert inspect_pair(der,delivery,True)['status']=='PASS','PNG/WebP mismatch'
if e.get('mask'):
 m=Image.open(read(e['mask']));metadata=json.loads(read(e['maskConstruction']).read_text())
 assert metadata['master']==e['identityMaster']['path']
 expectedMask=Image.new('L',(1024,1536),255);draw=ImageDraw.Draw(expectedMask)
 for polygon in metadata['polygonsHidden']:draw.polygon([tuple(x) for x in polygon],fill=0)
 expectedMask=expectedMask.filter(ImageFilter.GaussianBlur(metadata['edgeFeatherPx']))
 assert np.array_equal(np.asarray(m),np.asarray(expectedMask)),'Own mask pixels differ from construction'
 assert m.getextrema()==(0,255),'Empty or fabricated all-white mask'
print('PASS: traceable single-layer geometry and exact delivery'+(' / own mask' if e.get('mask') else ''))
