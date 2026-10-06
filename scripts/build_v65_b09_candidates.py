#!/usr/bin/env python3
"""Fit each admitted native single accessory to three independently reviewed avatar anchors."""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "qa/v65/art-workpacks/B09"
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    config = json.loads((WORK / "source-admission-static-v1.json").read_text())
    assert config["status"] == "ADMITTED_SOURCE_ONLY"
    rows = []
    for item, master in config["masters"].items():
        source = ROOT / master["path"]
        assert sha(source) == master["sha256"], "Stale admitted source"
        im = Image.open(source).convert("RGBA")
        bbox = im.getchannel("A").getbbox()
        crop = im.crop(bbox)
        src = np.array([[master[k][0]*crop.width, master[k][1]*crop.height, 1] for k in ["left","right","top"]])
        for avatar, anchors in config["fit"].items():
            target = np.array([anchors[k] for k in ["left","right","top"]])
            forward = np.linalg.solve(src, target).T
            inverse = np.linalg.inv(np.vstack([forward,[0,0,1]]))[:2].ravel()
            canvas = crop.transform((1024,1536), Image.Transform.AFFINE, tuple(inverse), Image.Resampling.BICUBIC)
            out = ROOT / f"public/assets/v6.5/art-candidates/B09/{avatar}/{item}.webp"
            out.parent.mkdir(parents=True,exist_ok=True)
            canvas.save(out,"WEBP",quality=92,method=6)
            rows.append({"itemId":item,"avatarId":avatar,"master":master["path"],"masterSha256":sha(source),
                         "candidate":str(out.relative_to(ROOT)),"sha256":sha(out),"size":[1024,1536],
                         "masterBBox":list(bbox),"candidateBBox":list(canvas.getbbox()),"anchors":anchors,
                         "forwardAffine":forward.tolist(),"bytes":out.stat().st_size})
    report = {"schemaVersion":1,"batchId":"B09","status":"BUILT_CANDIDATE_ONLY_NOT_PROMOTED",
              "sourceAdmission":"qa/v65/art-workpacks/B09/source-admission-static-v1.json",
              "sourceAdmissionSha256":sha(WORK/"source-admission-static-v1.json"),
              "candidateCount":len(rows),"rows":rows,"v64RuntimeTouched":False,"promotion":"NOT_STARTED"}
    (WORK/"candidate-build-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({"status":report["status"],"rows":len(rows)},ensure_ascii=False))
if __name__=="__main__": main()
