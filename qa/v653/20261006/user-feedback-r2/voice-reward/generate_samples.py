from pathlib import Path
import hashlib, json, urllib.request, time
root=Path(__file__).resolve().parent
cache=Path('/tmp/little-explorers-kokoro-r2-model'); cache.mkdir(exist_ok=True)
revision='f3ff3571791e39611d31c381e3a41a3af07b4987'
records=[]
for name in ['config.json','kokoro-v1_0.pth','voices/af_heart.pt','README.md','VOICES.md']:
 path=cache/name; path.parent.mkdir(parents=True,exist_ok=True)
 url=f'https://huggingface.co/hexgrad/Kokoro-82M/resolve/{revision}/{name}'
 if not path.exists():
  print('Downloading',name,flush=True)
  urllib.request.urlretrieve(url,path)
 sha=hashlib.sha256(path.read_bytes()).hexdigest()
 records.append(dict(path=str(path),source=url,sha256=sha,bytes=path.stat().st_size))
 if name=='kokoro-v1_0.pth': assert sha=='496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4'
(root/'model-provenance.json').write_text(json.dumps(dict(revision=revision,license='Apache-2.0',files=records),indent=2))
import torch, soundfile as sf, numpy as np
from kokoro import KModel, KPipeline
torch.set_num_threads(4)
model=KModel(repo_id='hexgrad/Kokoro-82M',config=str(cache/'config.json'),model=str(cache/'kokoro-v1_0.pth')).eval()
pipeline=KPipeline(lang_code='a',repo_id='hexgrad/Kokoro-82M',model=model)
voice=torch.load(cache/'voices/af_heart.pt',weights_only=True)
texts=['I can take three steps.','Hello! Let us learn English together.','I can see a red apple.']
outputs=[]
for i,text in enumerate(texts):
 for speed in [1.0,0.9]:
  start=time.monotonic(); chunks=list(pipeline(text,voice=voice,speed=speed)); audio=np.concatenate([x.audio.numpy() for x in chunks]); name=f'kokoro-af-heart-{i+1}-speed-{speed}.wav'; path=root/name
  sf.write(path,audio,24000,subtype='PCM_16')
  record=dict(file=name,text=text,speed=speed,sampleRate=24000,seconds=len(audio)/24000,peak=float(abs(audio).max()),rms=float(np.sqrt(np.mean(audio**2))),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),elapsed=time.monotonic()-start,phonemes=[x.phonemes for x in chunks],naturalness='PENDING_LISTEN')
  outputs.append(record); print(json.dumps(record),flush=True)
  (root/'samples.json').write_text(json.dumps(outputs,indent=2))
