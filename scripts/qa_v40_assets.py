#!/usr/bin/env python3
import json,re,subprocess
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]; A=ROOT/'public/assets/v40'; QA=ROOT/'.qa'; QA.mkdir(exist_ok=True)
fail=[]
def dim(p):
    with Image.open(p) as im:return im.size
def require(path,w,h,square=False,label='asset'):
    p=A/path
    if not p.exists(): fail.append(f'missing {label} {path}'); return
    x,y=dim(p)
    if x<w or y<h or (square and x!=y): fail.append(f'invalid {label} {path} {x}x{y}')
require(Path('hero-space-dashboard.webp'),1920,600,label='hero')
avatars=['nova','thunder','titan','turbo','rex','aqua']
for aid in avatars:
    for stage in range(1,6): require(Path('characters')/f'{aid}-stage-{stage}.webp',1024,1024,True,'character-full')
    require(Path('characters/bust')/f'{aid}.webp',512,512,True,'character-bust')
for name in ['avatar-robot.webp','avatar-father.webp','avatar-mother.webp','avatar-caregiver.webp']:
    require(Path('characters')/name,1024,1024,True,'profile-full'); require(Path('characters/bust')/name,512,512,True,'profile-bust')
code="import {cosmetics} from './src/cosmetics.ts'; console.log(JSON.stringify(cosmetics.map(x=>x.id)))"
item_ids=json.loads(subprocess.check_output(['npx','tsx','-e',code],cwd=ROOT,text=True).strip())
for item in item_ids: require(Path('items')/f'{item}.webp',512,512,True,'shop-item')
badge_ids=['streak-3','streak-7','streak-14','streak-30','speaking-first-word','speaking-brave','speaking-sentence','speaking-hero','listening-good','listening-sound-hunter','listening-music-explorer','listening-master','learning-first-mission','learning-10','learning-50','learning-100','adventure-world-explorer','adventure-forest','adventure-ocean','adventure-space','special-perfect-day','special-early-bird','special-comeback','special-super-explorer']
for bid in badge_ids: require(Path('badges')/f'{bid}.webp',512,512,True,'badge')
for theme in ['space-hero','mecha-warrior','racing-adventure','fantasy-spirit','ocean-world']: require(Path('themes')/f'{theme}.webp',1024,768,label='theme-card')
def slug(word):
    v=word.lower().strip().replace('?','').replace('!',''); v=re.sub(r'\s+[\u4e00-\u9fff]+$','',v); v=re.sub(r'[^a-z0-9]+','-',v).strip('-'); return v or 'zh-audio'
code="import {curriculum} from './src/data/curriculum.ts'; console.log(JSON.stringify([...new Set(curriculum.flatMap(d=>d.blocks).flatMap(b=>b.vocabulary))]))"
vocab=json.loads(subprocess.check_output(['npx','tsx','-e',code],cwd=ROOT,text=True).strip())
for word in vocab: require(Path('vocab')/f'{slug(word)}.webp',640,480,label='vocabulary')
for reward in ['xp','coin','star','gem','treasure']: require(Path('rewards')/f'{reward}.webp',512,512,True,'reward-icon')
runtime=[ROOT/'src/v4/Dashboard.tsx',ROOT/'src/v4/LessonQuest.tsx',ROOT/'src/v4/SecondaryViews.tsx',ROOT/'src/v4/ParentSettings.tsx',ROOT/'src/v4/ParentAccess.tsx',ROOT/'src/v4/caregivers.tsx',ROOT/'src/v4/RewardModal.tsx',ROOT/'src/components/AvatarHero.tsx',ROOT/'src/components/GameBadge.tsx',ROOT/'src/components/AnimatedBadge.tsx']
legacy=[]
for p in runtime:
    text=p.read_text(encoding='utf-8')
    if 'assets/v30/' in text: legacy.append(str(p.relative_to(ROOT)))
if legacy: fail.append(f'V4 runtime still references v30 {legacy}')
settings_text=(ROOT/'src/v4/ParentSettings.tsx').read_text(encoding='utf-8')
settings_legacy=('assets/v30/' in settings_text) or ('v30Asset(' in settings_text)
if settings_legacy: fail.append('Visible V4 ParentSettings still references V30 assets')
result={'status':'PASS' if not fail else 'FAIL','hero':1,'characterFull':30,'profileFull':4,'characterBust':6,'profileBust':4,'shopItems':len(item_ids),'badges':len(badge_ids),'themes':5,'vocabularyTerms':len(vocab),'rewardIcons':5,'runtimeV30Refs':legacy,'settingsV30AssetRefs':settings_legacy,'failures':fail}
(QA/'v40_asset_result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
if fail: raise SystemExit(1)
