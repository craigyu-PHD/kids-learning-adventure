#!/usr/bin/env python3
"""Transactional LOCAL B10 promotion. Requires --execute; never commits, pushes, or deploys."""
from __future__ import annotations
import argparse,hashlib,json,os,subprocess,sys,time
from pathlib import Path
import validate_v65_b10_acceptance as validator
ROOT=Path(__file__).resolve().parents[1]
B10=ROOT/"qa/v65/art-workpacks/B10";R2=B10/"round2"
MANIFEST=ROOT/"src/data/avatarAssetManifest.json"
WORKPACK=B10/"manifest.json";OUT=B10/"promotion-report.json"
ITEMS=validator.ITEMS;AVATARS=validator.AVATARS
def sha(p:Path)->str:return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p:Path):return json.loads(p.read_text())
def candidate(item,avatar):return ROOT/f"public/assets/v6.5/art-candidates/B10/{avatar}/{item}.webp"
def destination(item,avatar):return ROOT/f"public/assets/v6.5/runtime/{avatar}/{item}.webp"
def hashes(paths):
 return {str(p.relative_to(ROOT)):sha(p) for p in sorted(set(paths)) if p.is_file()}
def protected_hashes():
 paths=list((ROOT/"public/assets/v6.4/runtime").rglob("*"))
 paths+=list((ROOT/"qa/v65/art-workpacks/B08").rglob("*"))
 paths+=list((ROOT/"qa/v65/art-workpacks/B09").rglob("*"))
 for item in ("glasses-holo","glasses-legend","sister-heart-glasses","story-headphones","phones-sky","phones-racer"):
  for avatar in AVATARS:paths.append(ROOT/f"public/assets/v6.5/runtime/{avatar}/{item}.webp")
 paths+=list((B10/"round1-archive").rglob("*"))
 return hashes(paths)
def evidence_hashes():
 paths=[validator.DIST,validator.RUNTIME,validator.NEGATIVE,validator.COMPAT,validator.EVIDENCE,validator.OUT,Path(validator.__file__),Path(__file__),B10/"run-post-promotion-runtime-gate.py"]
 paths+=list(validator.BOARD_DIR.glob("*.jpg"))
 paths+=list(validator.VISUAL_DIR.rglob("*.json")) if validator.VISUAL_DIR.exists() else []
 paths+=list(R2.glob("*.py"))
 return hashes(paths)
def atomic(path:Path,data:bytes):
 path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_name(path.name+f".b10-{os.getpid()}.tmp")
 try:tmp.write_bytes(data);tmp.replace(path)
 finally:
  if tmp.exists():tmp.unlink()
def verify_promotion(r):
 e=[]
 try:
  if r.get("status")!="PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE":e.append("promotion status invalid")
  if r.get("promoterSha256")!=sha(Path(__file__)):e.append("promoter changed")
  if r.get("candidateFingerprint")!=validator.fingerprint(validator.current_candidates()):e.append("candidate fingerprint drift")
  if r.get("avatarManifestAfterSha256")!=sha(MANIFEST):e.append("manifest drift")
  if r.get("promotedInputFingerprint")!=validator.fingerprint(validator.source_snapshot()):e.append("promoted source fingerprint drift")
  if r.get("protectedHashes")!=protected_hashes():e.append("protected V6.4/B08/B09/round1 drift")
  if r.get("reviewEvidenceHashes")!=evidence_hashes():e.append("round2 evidence drift")
  entries={x["id"]:x for x in load(MANIFEST)["accessories"]};seen=set()
  for row in r.get("copies",[]):
   k=(row["itemId"],row["avatarId"]);seen.add(k);dst=destination(*k)
   if sha(candidate(*k))!=row["candidateSha256"] or sha(dst)!=row["candidateSha256"] or sha(dst)!=row.get("promotedSha256"):e.append(f"byte mismatch {k}")
   if entries[k[0]]["variants"].get(k[1])!=str(dst.relative_to(ROOT)):e.append(f"manifest binding mismatch {k}")
  if seen!={(i,a) for i in ITEMS for a in AVATARS}:e.append("coverage mismatch")
 except Exception as x:e.append(f"{type(x).__name__}: {x}")
 return e
def main():
 ap=argparse.ArgumentParser(description=__doc__);g=ap.add_mutually_exclusive_group(required=True)
 g.add_argument("--preflight",action="store_true");g.add_argument("--execute",action="store_true");args=ap.parse_args()
 acceptance=validator.run()
 if args.preflight:
  print(json.dumps({"promotionReady":acceptance["promotionReady"],"candidateFingerprint":acceptance["candidateFingerprint"],"structuralErrors":acceptance["structuralErrors"],"visualErrors":acceptance["visualErrors"]},ensure_ascii=False,indent=2))
  return 0 if acceptance["promotionReady"] else 1
 result={"schemaVersion":1,"suite":"v65-b10-local-promotion","createdAt":time.strftime("%Y-%m-%dT%H:%M:%S%z"),"status":"FAIL","productionDeployed":False,"copies":[],"promoterSha256":sha(Path(__file__))}
 before=None;original={};started=False
 try:
  if OUT.exists() and load(OUT).get("status")=="PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE":raise RuntimeError("B10 already promoted; preserve transaction report")
  if acceptance.get("promotionReady") is not True:raise RuntimeError("fresh B10 acceptance promotionReady is not true")
  baseline_binding={k:acceptance[k] for k in ("candidateFingerprint","runtimeReportSha256","candidateHashes","sameCandidatePass","visualComplete","visualPass","promotionReady")}
  proc=subprocess.run([sys.executable,str(R2/"test-negative-controls.py")],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  if proc.returncode or load(validator.NEGATIVE).get("status")!="PASS":raise RuntimeError("fresh negative controls failed")
  fresh=validator.run();fresh_binding={k:fresh[k] for k in baseline_binding}
  if fresh_binding!=baseline_binding:raise RuntimeError("acceptance binding changed during fresh negative controls")
  before=MANIFEST.read_bytes();result["avatarManifestBeforeSha256"]=hashlib.sha256(before).hexdigest()
  protected=protected_hashes();evidence=evidence_hashes();manifest=json.loads(before);entries={x["id"]:x for x in manifest["accessories"]}
  plan=[];seen=set()
  work=load(WORKPACK)
  for product in work.get("products",[]):
   item=product.get("itemId")
   if item not in ITEMS:continue
   entry=entries[item]
   if entry.get("renderer")!="aligned-overlay":raise RuntimeError(f"unexpected renderer {item}")
   if entry.get("defaultSkinDetails") or entry.get("headwearVariants"):raise RuntimeError(f"unreviewed alternate path for {item}")
   for role in product.get("roles",[]):
    avatar=role.get("avatarId");k=(item,avatar)
    if avatar not in AVATARS or k in seen:raise RuntimeError(f"unexpected/duplicate {k}")
    seen.add(k);src=candidate(*k);dst=destination(*k);data=src.read_bytes();digest=hashlib.sha256(data).hexdigest()
    if acceptance["candidateHashes"].get(f"{item}:{avatar}")!=digest:raise RuntimeError(f"candidate drift {k}")
    original[dst]=dst.read_bytes() if dst.exists() else None;plan.append((item,avatar,src,dst,data,digest))
  if seen!={(i,a) for i in ITEMS for a in AVATARS}:raise RuntimeError("workpack coverage is not 12")
  backup=B10/"promotion-backups"/str(time.time_ns());backup.mkdir(parents=True)
  (backup/"avatarAssetManifest.original.json").write_bytes(before)
  for dst,data in original.items():
   if data is not None:
    q=backup/dst.relative_to(ROOT);q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(data)
  (backup/"preflight.json").write_text(json.dumps({"acceptanceBinding":baseline_binding,"protectedHashes":protected,"reviewEvidenceHashes":evidence},ensure_ascii=False,indent=2)+"\n")
  if MANIFEST.read_bytes()!=before or protected_hashes()!=protected or evidence_hashes()!=evidence:raise RuntimeError("inputs drift before first write")
  started=True
  for item,avatar,src,dst,data,digest in plan:
   atomic(dst,data);entries[item]["variants"][avatar]=str(dst.relative_to(ROOT))
   result["copies"].append({"itemId":item,"avatarId":avatar,"candidate":str(src.relative_to(ROOT)),"promoted":str(dst.relative_to(ROOT)),"candidateSha256":digest,"promotedSha256":sha(dst)})
  atomic(MANIFEST,(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n").encode())
  result.update({"status":"PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE","backupDirectory":str(backup.relative_to(ROOT)),"candidateFingerprint":acceptance["candidateFingerprint"],"runtimeReportSha256":acceptance["runtimeReportSha256"],"protectedHashes":protected,"reviewEvidenceHashes":evidence,"avatarManifestAfterSha256":sha(MANIFEST),"promotedInputFingerprint":validator.fingerprint(validator.source_snapshot()),"copyCount":len(plan),"v64RuntimeTouched":False})
  errs=verify_promotion(result)
  if errs:raise RuntimeError("; ".join(errs))
 except Exception as x:
  result["error"]=f"{type(x).__name__}: {x}"
  if started:
   rollback=[]
   for p,data in original.items():
    try:
     if data is None:
      if p.exists():p.unlink()
     else:atomic(p,data)
    except Exception as y:rollback.append(f"{p}: {y}")
   try:atomic(MANIFEST,before)
   except Exception as y:rollback.append(f"manifest: {y}")
   result["rollbackErrors"]=rollback;result["rollbackComplete"]=not rollback
 out=OUT if not OUT.exists() else B10/f"promotion-attempt-{time.time_ns()}.json"
 out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
 print(json.dumps({"status":result["status"],"report":str(out.relative_to(ROOT)),"error":result.get("error"),"rollbackComplete":result.get("rollbackComplete")},ensure_ascii=False))
 return 0 if result["status"]=="PROMOTED_LOCAL_PENDING_POST_PROMOTION_ACCEPTANCE" else 1
if __name__=="__main__":raise SystemExit(main())
