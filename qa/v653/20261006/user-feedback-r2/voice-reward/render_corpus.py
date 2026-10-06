from pathlib import Path
import hashlib,json,time,subprocess,os
import torch,soundfile as sf,numpy as np
from kokoro import KModel,KPipeline
root=Path(__file__).resolve().parent;project=root.parents[4];out=project/'public/assets/v6.5/audio';wavroot=root/'source-wav';wavroot.mkdir(exist_ok=True)
cache=Path('/tmp/little-explorers-kokoro-r2-model');corpus=json.loads((root/'corpus.json').read_text());evidence_path=root/'rendered-corpus.json';records=json.loads(evidence_path.read_text()) if evidence_path.exists() else []
existing={(x['textSha256'],x['mode']):x for x in records};started=time.monotonic();torch.set_num_threads(4)
model=KModel(repo_id='hexgrad/Kokoro-82M',config=str(cache/'config.json'),model=str(cache/'kokoro-v1_0.pth')).eval();pipeline=KPipeline(lang_code='a',repo_id='hexgrad/Kokoro-82M',model=model);voice=torch.load(cache/'voices/af_heart.pt',weights_only=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write_json(path,value):
 tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2));tmp.replace(path)
for row in corpus['entries']:
 for mode,speed in [('slow',.9),('standard',1.)]:
  key=(row['textSha256'],mode);old=existing.get(key)
  if old and (out/old['file']).exists() and sha(out/old['file'])==old['audioSha256']:continue
  chunks=list(pipeline(row['text'],voice=voice,speed=speed));text=' '.join(x.graphemes for x in chunks).strip();assert text==row['text'],(text,row['text'])
  phonemes=[x.phonemes for x in chunks];assert all(x.strip() for x in phonemes)
  audio=np.concatenate([x.audio.numpy() for x in chunks]);assert len(audio)>2400 and np.isfinite(audio).all() and abs(audio).max()<1
  wav=wavroot/f"{row['textSha256']}-{mode}.wav";sf.write(wav,audio,24000,subtype='PCM_16')
  temp=Path('/tmp/little-explorers-kokoro-render.m4a');temp.unlink(missing_ok=True)
  subprocess.run(['afconvert','-f','m4af','-d','aac','-b','64000',str(wav),str(temp)],check=True,capture_output=True)
  audio_sha=sha(temp);filename=f"{row['textSha256'][:16]}-af-heart-{mode}-{audio_sha[:12]}.m4a";(out/filename).write_bytes(temp.read_bytes())
  record=dict(text=row['text'],textSha256=row['textSha256'],uses=row['uses'],mode=mode,synthesisSpeed=speed,voice='af_heart',file=filename,audioSha256=audio_sha,wav=str(wav.relative_to(project)),wavSha256=sha(wav),seconds=len(audio)/24000,peak=float(abs(audio).max()),rms=float(np.sqrt(np.mean(audio**2))),phonemes=phonemes,renderedText=text,bytes=(out/filename).stat().st_size)
  if old: records.remove(old)
  records.append(record);existing[key]=record
  write_json(evidence_path,records)
  write_json(root/'render-progress.json',dict(completed=len(records),total=len(corpus['entries'])*2,lastText=row['text'],elapsedSeconds=time.monotonic()-started,status='RUNNING',pid=os.getpid()))
  if len(records)%20==0:print(f"{len(records)}/{len(corpus['entries'])*2}: {row['text']}",flush=True)
lookup={}
for row in records:lookup.setdefault(row['text'],{})[row['mode']]=row['file']
assert len(records)==len(corpus['entries'])*2 and all(set(x)=={'slow','standard'} for x in lookup.values())
manifest={'schema':1,'voice':'af_heart','model':'hexgrad/Kokoro-82M v1.0','modelSha256':'496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4','corpusSha256':sha(root/'corpus.json'),'clips':lookup}
write_json(project/'src/data/lessonSpeechManifest.json',manifest)
write_json(out/'lesson-speech-provenance.json',{'model':json.loads((root/'model-provenance.json').read_text()),'sourceCurriculumSha256':corpus['curriculumSha256'],'sourceFormatterSha256':corpus['formatterSha256'],'records':records})
write_json(root/'render-progress.json',dict(completed=len(records),total=len(corpus['entries'])*2,elapsedSeconds=time.monotonic()-started,status='COMPLETE',pid=os.getpid(),publicBytes=sum(r['bytes'] for r in records),uniquePhrases=len(lookup)))
print('COMPLETE',len(records),flush=True)
