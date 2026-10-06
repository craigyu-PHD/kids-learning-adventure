from pathlib import Path
import json,hashlib,subprocess
root=Path(__file__).resolve().parent;project=root.parents[4];out=project/'public/assets/v6.5/audio'
records=json.loads((root/'rendered-corpus.json').read_text());manifest_path=project/'src/data/lessonSpeechManifest.json';manifest=json.loads(manifest_path.read_text());samples=json.loads((root/'samples.json').read_text())
selected=next(x for x in samples if x['text']=='I can take three steps.' and x['speed']==.9)
r=next(x for x in records if x['text']==selected['text'] and x['mode']=='slow')
before=r.copy();wav=root/selected['file'];tmp=Path('/tmp/little-explorers-selected-sample.m4a');tmp.unlink(missing_ok=True)
subprocess.run(['afconvert','-f','m4af','-d','aac','-b','64000',str(wav),str(tmp)],check=True,capture_output=True)
sha=hashlib.sha256(tmp.read_bytes()).hexdigest();name=f"{r['textSha256'][:16]}-af-heart-slow-{sha[:12]}.m4a";(out/name).write_bytes(tmp.read_bytes())
r.update(file=name,audioSha256=sha,wav=str(wav.relative_to(project)),wavSha256=selected['sha256'],seconds=selected['seconds'],peak=selected['peak'],rms=selected['rms'],phonemes=selected['phonemes'],bytes=tmp.stat().st_size,selectionEvidence='User selected slow sample 1 via root on 2026-10-06; exact original source WAV retained')
manifest['clips'][r['text']]['slow']=name
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2));(root/'rendered-corpus.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
provenance_path=out/'lesson-speech-provenance.json';provenance=json.loads(provenance_path.read_text());provenance['records']=records;provenance_path.write_text(json.dumps(provenance,ensure_ascii=False,indent=2))
(root/'selected-sample-preservation.json').write_text(json.dumps(dict(before=before,after=r),ensure_ascii=False,indent=2));print(name)
