"""Adversarial QA controls; temporary synthetic pixels are never art deliverables."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from qa_v64_image_pair import inspect_pair
from qa_v64_hybrid_review import replay, ROOT, BASE

class Controls(unittest.TestCase):
    def test_pair_decode_and_content(self):
        with tempfile.TemporaryDirectory(prefix='v64-pair-control-') as temp:
            d=Path(temp);a=d/'source.png';b=d/'delivery.webp'
            im=Image.open(ROOT/'public/assets/v5/characters/brother/wardrobe/base-body.png');im.save(a);im.save(b,format='WEBP',lossless=True,exact=True)
            self.assertEqual(inspect_pair(a,b,True)['status'],'PASS','format conversion control only, not accepted artwork')
            Image.new('RGBA',im.size,(0,0,0,0)).save(b,format='WEBP')
            self.assertEqual(inspect_pair(a,b,True)['status'],'FAIL')
            Image.new('RGBA',(16,16)).save(b,format='WEBP')
            self.assertEqual(inspect_pair(a,b,True)['status'],'FAIL')
            b.write_bytes(a.read_bytes())
            self.assertEqual(inspect_pair(a,b,True)['status'],'FAIL','extension must not substitute format')
    def test_hybrid_rejects_duplicate_and_tamper(self):
        original=json.loads((ROOT/BASE/'round51-hybrid-overall-calibration/full-hybrid-gate.json').read_text())
        with tempfile.TemporaryDirectory(prefix='v64-review-control-') as temp:
            p=Path(temp)/'matrix.json'
            d=json.loads(json.dumps(original));d['records'][1]=d['records'][0];p.write_text(json.dumps(d))
            self.assertEqual(replay(str(p))['status'],'FAIL')
            d=json.loads(json.dumps(original));d['records'][0]['scores']['overallPolishHybrid']=10;p.write_text(json.dumps(d))
            self.assertEqual(replay(str(p))['status'],'FAIL')

if __name__=='__main__':unittest.main()
