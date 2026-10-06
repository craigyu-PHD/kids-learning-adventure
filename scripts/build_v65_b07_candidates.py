from pathlib import Path
import base64, json, hashlib
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BRIDGE = ROOT / 'qa/v65/art-workpacks/B07/.bridge'
MANIFEST = ROOT / 'qa/v65/art-workpacks/B07/manifest.json'
MASTER_MAP = {
    'sky-view-glasses': ('sky_master_q80.b64', 'sky_master_q80.webp'),
    'glasses-racer': ('racer_master_q80.b64', 'racer_master_q80.webp'),
    'glasses-star': ('star_master_q80.b64', 'star_master_q80.webp'),
}

def alpha_bbox(im: Image.Image):
    a = im.getchannel('A')
    return a.getbbox()

def fit_master(master: Image.Image, target_bbox):
    mb = alpha_bbox(master)
    if not mb:
        raise ValueError('master has no alpha content')
    crop = master.crop(mb)
    tx0, ty0, tx1, ty1 = target_bbox
    tw, th = tx1-tx0, ty1-ty0
    # Keep a small safety inset to avoid clipping glow/highlights.
    inset = 0.94
    maxw, maxh = max(1, int(tw*inset)), max(1, int(th*inset))
    scale = min(maxw/crop.width, maxh/crop.height)
    nw, nh = max(1, round(crop.width*scale)), max(1, round(crop.height*scale))
    crop = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (1024,1536), (0,0,0,0))
    cx, cy = (tx0+tx1)//2, (ty0+ty1)//2
    x, y = cx - nw//2, cy - nh//2
    canvas.alpha_composite(crop, (x,y))
    return canvas

def sha256(path: Path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    data=json.loads(MANIFEST.read_text())
    master_paths={}
    for item,(b64name,outname) in MASTER_MAP.items():
        raw=base64.b64decode((BRIDGE/b64name).read_text().strip())
        out=BRIDGE/outname
        out.write_bytes(raw)
        master_paths[item]=out

    rows=[]
    for prod in data['products']:
        item=prod['itemId']
        master=Image.open(master_paths[item]).convert('RGBA')
        for role in prod['roles']:
            ref=ROOT/role['currentRuntime'][0]
            rim=Image.open(ref).convert('RGBA')
            rb=alpha_bbox(rim)
            if not rb:
                raise ValueError(f'no alpha bbox in {ref}')
            cand=fit_master(master, rb)
            out=ROOT/role['candidateOutputs'][0]
            out.parent.mkdir(parents=True, exist_ok=True)
            cand.save(out, 'WEBP', quality=88, method=6)
            rows.append({
                'itemId':item,
                'avatarId':role['avatarId'],
                'reference':str(ref.relative_to(ROOT)),
                'referenceBBox':rb,
                'candidate':str(out.relative_to(ROOT)),
                'candidateBBox':alpha_bbox(cand),
                'size':cand.size,
                'mode':cand.mode,
                'bytes':out.stat().st_size,
                'sha256':sha256(out),
            })
    report=ROOT/'qa/v65/art-workpacks/B07/candidate-build-report.json'
    report.write_text(json.dumps({'status':'BUILT_NOT_VISUALLY_PROMOTED','rows':rows},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'status':'OK','count':len(rows),'report':str(report.relative_to(ROOT))},ensure_ascii=False))

if __name__=='__main__':
    main()
