"""Measurement only: verifies generated PNG and compressed WebP; never edits assets."""
import json
import sys
import hashlib
from pathlib import Path
import numpy as np
from PIL import Image

def inspect_pair(source, delivery, wearable=False):
    checks={}; result={'status':'FAIL','checks':checks}
    try:
        a=Image.open(source);a.load();b=Image.open(delivery);b.load()
        checks['formats']=a.format=='PNG' and b.format=='WEBP'
        checks['sameDimensions']=a.size==b.size
        checks['wearableDimensions']=not wearable or a.size==(1024,1536)
        checks['wearableNativeAlpha']=not wearable or ('A' in a.getbands() and 'A' in b.getbands())
        result.update(sourceSha256=hashlib.sha256(Path(source).read_bytes()).hexdigest(),deliverySha256=hashlib.sha256(Path(delivery).read_bytes()).hexdigest(),size=list(a.size))
        if not all(checks.values()):return result
        aa=np.array(a.convert('RGBA'));ba=np.array(b.convert('RGBA'))
        alpha=aa[:,:,3]; visible=(alpha>8)|(ba[:,:,3]>8)
        checks['nonempty']=bool(visible.any())
        checks['alphaExact']=bool(np.array_equal(alpha,ba[:,:,3]))
        checks['wearableTransparency']=not wearable or float((alpha==0).mean())>=.5
        delta=np.abs(aa[:,:,:3].astype(np.int16)-ba[:,:,:3].astype(np.int16)).max(axis=2)
        changed=float((delta[visible]>8).mean()) if visible.any() else 1.0
        # Compression may affect color slightly; alpha geometry must remain exact.
        checks['visibleContentStable']=changed<=.01
        result['changedVisibleRgbRatioGt8']=changed
        result['status']='PASS' if all(checks.values()) else 'FAIL'
    except Exception as exc:result['error']=type(exc).__name__+': '+str(exc)
    return result

if __name__=='__main__':
    r=inspect_pair(sys.argv[1],sys.argv[2],'--wearable' in sys.argv)
    print(json.dumps(r,indent=2));sys.exit(0 if r['status']=='PASS' else 1)
