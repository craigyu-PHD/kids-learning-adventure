#!/usr/bin/env python3
"""Focused, mutation-free tests for B03 acceptance and promotion planning."""
from __future__ import annotations
import copy,hashlib,json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
import validate_v65_b03_acceptance as v
import promote_v65_b03 as p

def source_tree(base:Path):return {str(x.relative_to(ROOT)):v.sha(x) for x in sorted(base.rglob('*')) if x.is_file() and x.name!='.DS_Store'}
def leaf_diffs(a,b,prefix=''):
 out=[]
 if isinstance(a,dict) and isinstance(b,dict):
  for k in sorted(set(a)|set(b)):out+=leaf_diffs(a.get(k),b.get(k),f'{prefix}/{k}')
 elif isinstance(a,list) and isinstance(b,list):
  for i,(x,y) in enumerate(zip(a,b)):out+=leaf_diffs(x,y,f'{prefix}/{i}')
  if len(a)!=len(b):out.append(prefix+'/length')
 elif a!=b:out.append(prefix)
 return out

class B03AcceptanceTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.src_before=source_tree(ROOT/'src');cls.public_before=source_tree(ROOT/'public');cls.acceptance=v.run()
 @classmethod
 def tearDownClass(cls):
  assert cls.src_before==source_tree(ROOT/'src'),'test changed shared src'
  assert cls.public_before==source_tree(ROOT/'public'),'test changed shared public'
 def test_strict_acceptance_ready(self):
  self.assertTrue(self.acceptance['promotionReady'],self.acceptance['structuralErrors']+self.acceptance['visualErrors'])
  self.assertEqual(self.acceptance['candidateHashes'],v.candidate_hashes())
 def test_root_review_exact_seal(self):
  self.assertEqual(v.sha(v.ROOT_REVIEW),v.ROOT_REVIEW_SHA256)
  review=v.load(v.ROOT_REVIEW);self.assertEqual(len(review['boards']),12);self.assertEqual(len(review['originalsViewed']),12)
 def test_exact_24_manifest_leaf_delta(self):
  before=v.load(v.MANIFEST);after=p.manifest_plan(before);diffs=leaf_diffs(before,after)
  expected=[]
  accessories={x['id']:i for i,x in enumerate(before['accessories'])}
  for item,avatar in v.ROWS:
   ix=accessories[item]
   for layer,key in (('back','backVariants'),('front','frontVariants')):expected.append(f'/accessories/{ix}/{key}/{avatar}')
  self.assertEqual(set(diffs),set(expected));self.assertEqual(len(diffs),24)
 def test_exact_24_copy_plan(self):
  rows=p.plan(self.acceptance);self.assertEqual(len(rows),24);self.assertEqual(len({x[4] for x in rows}),24)
  for item,avatar,layer,src,dst,data,h in rows:
   self.assertEqual(hashlib.sha256(data).hexdigest(),h);self.assertEqual(h,self.acceptance['candidateHashes'][f'{item}:{avatar}:{layer}']);self.assertEqual(dst,p.destination(item,avatar,layer))
 def test_b02_plus_k_boundary_and_protected_bytes(self):
  errors,details=v.boundary_errors();self.assertEqual([],errors)
  self.assertEqual(details['normalizedSourceFingerprint'],v.load(v.BOUNDARY)['normalizedSourceFingerprint'])
  self.assertEqual(v.sha(v.MANIFEST),v.load(v.K_REPORT)['manifestAfterSha256'])
 def test_old_b02_only_state_rejected(self):
  kr=v.load(v.K_REPORT);old=v.load(v.ROOT/kr['backupDirectory']/'manifest.original.json')
  errors,_=v.boundary_errors(current_source=kr['sourceFilesBefore'],current_manifest=old,current_public=kr['publicFilesBefore']);self.assertTrue(errors)
 def test_unrelated_source_byte_rejected(self):
  current=v.source_snapshot();current['src/components/AvatarRenderer.tsx']='0'*64
  errors,_=v.boundary_errors(current_source=current);self.assertIn('current source is not exact B02 plus K',errors)
 def test_hidden_source_not_exempt(self):
  current=v.source_snapshot();current['src/.unexpected']='0'*64
  errors,_=v.boundary_errors(current_source=current);self.assertIn('current source is not exact B02 plus K',errors)
 def test_changed_other_manifest_leaf_rejected(self):
  current=v.load(v.MANIFEST);current['skins'][0]['path']='public/unreviewed.webp'
  errors,_=v.boundary_errors(current_manifest=current);self.assertIn('current manifest is not exact B02 plus one K leaf',errors)
 def test_extra_public_file_rejected(self):
  current=v.public_snapshot();current['public/assets/v6.5/art-candidates/unapproved.webp']='0'*64
  errors,_=v.boundary_errors(current_public=current);self.assertIn('current public is not exact B02 plus K',errors)
 def test_only_ds_store_metadata_exempt(self):
  kr=v.load(v.K_REPORT);source=dict(kr['sourceFilesBefore']);source['src/data/avatarAssetManifest.json']=kr['manifestAfterSha256'];source['src/.DS_Store']='0'*64
  public=dict(kr['publicFilesBefore']);public[v.K_DEST]=kr['candidateSha256'];public.update(v.load(v.BOUNDARY)['authorizedB05CandidateFiles']);public['public/.DS_Store']='1'*64
  errors,details=v.boundary_errors(current_source=source,current_public=public);self.assertEqual([],errors);self.assertTrue(details['sourceMetadataDeltas']);self.assertTrue(details['publicMetadataDeltas'])
 def test_authorized_b05_changed_byte_rejected(self):
  current=v.public_snapshot();key=next(iter(v.load(v.BOUNDARY)['authorizedB05CandidateFiles']));current[key]='0'*64
  errors,_=v.boundary_errors(current_public=current);self.assertIn('current public is not exact B02 plus K',errors)
 def test_authorized_b05_missing_file_rejected(self):
  current=v.public_snapshot();key=next(iter(v.load(v.BOUNDARY)['authorizedB05CandidateFiles']));current.pop(key)
  errors,_=v.boundary_errors(current_public=current);self.assertIn('current public is not exact B02 plus K',errors)
 def test_k_fullskin_preserved_by_b03_plan(self):
  before=v.load(v.MANIFEST);after=p.manifest_plan(before)
  self.assertEqual(before['skins'],after['skins']);self.assertEqual(next(x for x in after['skins'] if x['id']=='brother:outfit-cadet')['path'],v.K_DEST)
 def test_post_entry_static_contract(self):
  post=ROOT/'scripts/run_v65_b03_post_promotion.py';compile(post.read_text(),str(post),'exec')
  cape=v.S/'run-cape-compatibility.py';compile(cape.read_text(),str(cape),'exec')
  self.assertIn('limitedUnchangedHeroCapeCompatibility',post.read_text());self.assertIn('not a new cape visual acceptance',cape.read_text())

if __name__=='__main__':
 suite=unittest.defaultTestLoader.loadTestsFromTestCase(B03AcceptanceTests);result=unittest.TextTestRunner(verbosity=2).run(suite)
 report={'schemaVersion':1,'suite':'v65-b03-focused-acceptance-tests','testsRun':result.testsRun,'failures':[str(x[1]) for x in result.failures],'errors':[str(x[1]) for x in result.errors],'status':'PASS' if result.wasSuccessful() else 'FAIL','sharedSrcWritten':False,'sharedPublicWritten':False}
 out=v.S/'acceptance-focused-tests-after-k.json';out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');raise SystemExit(0 if result.wasSuccessful() else 1)
