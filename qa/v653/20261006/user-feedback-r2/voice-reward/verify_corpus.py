from pathlib import Path
import json,hashlib,subprocess,time
import soundfile as sf
import numpy as np
root=Path(__file__).resolve().parent;project=root.parents[4];out=project/'public/assets/v6.5/audio'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
corpus=json.loads((root/'corpus.json').read_text());records=json.loads((root/'rendered-corpus.json').read_text());manifest=json.loads((project/'src/data/lessonSpeechManifest.json').read_text());bytext={r['text']:r for r in corpus['entries']}
assert len(records)==len(corpus['entries'])*2
assert corpus['curriculumSha256']==sha(project/'src/data/curriculum.ts')
assert corpus['formatterSha256']==sha(project/'src/lessonInstructionText.ts')
assert manifest['corpusSha256']==sha(root/'corpus.json')
seen=set();checks=[];start=time.monotonic();temp=Path('/tmp/little-explorers-decoded-corpus.wav')
for r in records:
 key=(r['text'],r['mode']);assert key not in seen;seen.add(key)
 assert r['renderedText']==r['text'] and r['uses']==bytext[r['text']]['uses']
 assert hashlib.sha256(r['text'].encode()).hexdigest()==r['textSha256']
 assert sha(out/r['file'])==r['audioSha256'] and sha(project/r['wav'])==r['wavSha256']
 assert manifest['clips'][r['text']][r['mode']]==r['file']
 assert 'Adventure ' not in r['text'] and r['phonemes'] and all(p.strip() for p in r['phonemes'])
 temp.unlink(missing_ok=True)
 subprocess.run(['afconvert','-f','WAVE','-d','LEI16',str(out/r['file']),str(temp)],check=True,capture_output=True)
 audio,rate=sf.read(str(temp));duration=len(audio)/rate;peak=float(abs(audio).max());rms=float(np.sqrt(np.mean(audio**2)))
 assert abs(duration-r['seconds'])<.15,(r['text'],duration,r['seconds'])
 assert .0001<rms<.6,(r['text'],rms)
 checks.append(dict(file=r['file'],decodedSeconds=duration,decodedPeak=peak,decodedRms=rms))
 if len(checks)%100==0:print('verified',len(checks),flush=True)
assert len(manifest['clips'])==len(corpus['entries'])
result=dict(status='PASS',files=len(checks),uniqueTexts=len(corpus['entries']),sentenceUses=sum(u['kind']=='sentence' for r in corpus['entries'] for u in r['uses']),vocabularyUses=sum(u['kind']=='vocabulary' for r in corpus['entries'] for u in r['uses']),publicBytes=sum(r['bytes'] for r in records),elapsedSeconds=time.monotonic()-start,checks=checks,boundary='Hash, source text, IDs, phonemes presence and decoded waveform checks; not 257-phrase human listening.')
(root/'corpus-verification.json').write_text(json.dumps(result,indent=2));print({k:v for k,v in result.items() if k!='checks'})
