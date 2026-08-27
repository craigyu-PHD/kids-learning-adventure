#!/usr/bin/env python3
import json, re, subprocess
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets/v30'
QA = ROOT / '.qa'; QA.mkdir(exist_ok=True)


def dims(path: Path):
    with Image.open(path) as im:
        return im.size


def slug(word: str):
    value = word.lower().strip().replace('?', '').replace('!', '')
    value = re.sub(r'\s+[\u4e00-\u9fff]+$', '', value)
    value = re.sub(r'[^a-z0-9]+', '-', value).strip('-')
    return value or 'zh-audio'

worlds = ['hero-storybook.webp','world-hello.webp','world-color.webp','world-animal.webp','world-family.webp','world-number.webp','world-food.webp','world-ocean.webp','world-dino.webp','world-space.webp']
avatars = ['nova','thunder','titan','turbo','rex','aqua']
characters = [f'{avatar}-stage-{stage}.webp' for avatar in avatars for stage in range(1,6)]
caregivers = ['avatar-father.webp','avatar-mother.webp','avatar-caregiver.webp','mascot-helper.webp']
badge_ids = [
  'streak-3','streak-7','streak-14','streak-30','speaking-first-word','speaking-brave','speaking-sentence','speaking-hero',
  'listening-good','listening-sound-hunter','listening-music-explorer','listening-master','learning-first-mission','learning-10','learning-50','learning-100',
  'adventure-world-explorer','adventure-forest','adventure-ocean','adventure-space','special-perfect-day','special-early-bird','special-comeback','special-super-explorer'
]

failures=[]
for name in worlds:
    p=ASSETS/name
    if not p.exists(): failures.append(f'missing world {name}'); continue
    w,h=dims(p)
    if w < 1920 or h < 1080: failures.append(f'world too small {name} {w}x{h}')
for name in characters+caregivers:
    p=ASSETS/'characters'/name
    if not p.exists(): failures.append(f'missing character {name}'); continue
    w,h=dims(p)
    if w < 1024 or h < 1024: failures.append(f'character too small {name} {w}x{h}')
for bid in badge_ids:
    p=ASSETS/'badges'/f'{bid}.webp'
    if not p.exists(): failures.append(f'missing badge {bid}'); continue
    w,h=dims(p)
    if w < 512 or h < 512 or w != h: failures.append(f'badge invalid {bid} {w}x{h}')

cmd = "import {curriculum} from './src/data/curriculum.ts'; console.log(JSON.stringify([...new Set(curriculum.flatMap(d=>d.blocks).flatMap(b=>b.vocabulary))]))"
raw = subprocess.check_output(['npx','tsx','-e',cmd], cwd=ROOT, text=True)
vocab = json.loads(raw.strip())
missing_vocab=[]
small_vocab=[]
for word in vocab:
    p=ASSETS/'vocab'/f'{slug(word)}.webp'
    if not p.exists(): missing_vocab.append([word,p.name]); continue
    w,h=dims(p)
    if w < 640 or h < 480: small_vocab.append([word,w,h])
failures += [f'missing vocab {x}' for x in missing_vocab]
failures += [f'small vocab {x}' for x in small_vocab]

runtime_files=[ROOT/'src/App.tsx',ROOT/'src/components/AvatarHero.tsx',ROOT/'src/components/AnimatedBadge.tsx',ROOT/'src/components/GameBadge.tsx']
runtime_v23=[]
for p in runtime_files:
    text=p.read_text(encoding='utf-8')
    if 'assets/v23/' in text or 'v23Asset(' in text: runtime_v23.append(str(p.relative_to(ROOT)))
if runtime_v23: failures.append(f'runtime v23 refs {runtime_v23}')

result={
  'status':'PASS' if not failures else 'FAIL',
  'worlds':len(worlds),'characters':len(characters)+len(caregivers),'badges':len(badge_ids),'vocabularyTerms':len(vocab),
  'vocabularyFiles':len(list((ASSETS/'vocab').glob('*.webp'))),
  'runtimeV23Refs':runtime_v23,'missingVocabulary':missing_vocab,'smallVocabulary':small_vocab,'failures':failures,
}
(QA/'v30_asset_result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
if failures: raise SystemExit(1)
