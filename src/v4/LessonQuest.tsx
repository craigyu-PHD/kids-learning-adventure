import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Coins,
  Gamepad2,
  Gift,
  Headphones,
  Lock,
  MessageCircleQuestion,
  Play,
  Repeat2,
  Rocket,
  Sparkles,
  Star,
  Tags,
  Trophy,
  Users,
  Volume2,
  Zap,
} from 'lucide-react';
import AvatarHero from '../components/AvatarHero';
import { BLOCK_REWARD, calculateRewards, normalizeProgress, SPECIAL_TASK_BONUS } from '../rewards';
import type { AppProgress, AppSettings, CourseDay, DayReflection, LessonBlock } from '../types';
import type { CourseDayAccess } from '../dailyChallenge';
import { subjectLabel } from './model';
import GameImage from './GameImage';
import { playV4Sound } from './sound';

const STAGES = [
  { title: '唱歌暖身', short: 'Warm-up', icon: Headphones },
  { title: '單字預覽', short: 'Words', icon: BookOpen },
  { title: '觀看影片', short: 'Video', icon: Play },
  { title: '暫停提問', short: 'Pause', icon: MessageCircleQuestion },
  { title: '複誦練習', short: 'Repeat', icon: Repeat2 },
  { title: '互動遊戲', short: 'Game', icon: Gamepad2 },
  { title: '分類活動', short: 'Sort', icon: Tags },
  { title: '完成任務', short: 'Finish', icon: CheckCircle2 },
  { title: '領取獎勵', short: 'Reward', icon: Gift },
] as const;

type Props = {
  day: CourseDay;
  lessonIndex: 0 | 1;
  dateKey: string;
  access: CourseDayAccess;
  trustedDateVerified: boolean;
  settings: AppSettings;
  progress: AppProgress;
  participants: string[];
  reflection: DayReflection;
  onUpdateReflection: (patch: Partial<DayReflection>) => void;
  onToggleMission: (childId: string, mission: LessonBlock['missions'][number]) => void;
  onAnswer: (childId: string, target: string, answer: string, correct: boolean, stage: number) => void;
  onToggleBlock: (childId: string, block: LessonBlock) => void;
  onClaimSpecialBonus: (childId: string, day: CourseDay) => void;
  onCompleteStage: (stage: number) => void;
  onBack: () => void;
};

function videoSrc(videoId: string, start?: number, end?: number) {
  const params = new URLSearchParams({ rel: '0', playsinline: '1' });
  if (start) params.set('start', String(start));
  if (end) params.set('end', String(end));
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = .82;
  window.speechSynthesis.speak(utterance);
}

export default function LessonQuest(props: Props) {
  const block = props.day.blocks[props.lessonIndex];
  const formal = props.access === 'today' && props.trustedDateVerified;
  const completedStages = props.reflection.lessonStages?.[block.id] ?? [];
  const initialStage = Math.min(8, completedStages.length ? Math.max(...completedStages) + 1 : 0);
  const [stage, setStage] = useState(initialStage);
  const [highestStage, setHighestStage] = useState(initialStage);
  const learnerList = props.settings.children.filter((child) => props.participants.includes(child.id) && !child.disabled);
  const missionOne = block.missions[0];
  const missionTwo = block.missions[1];
  const allLearnersBlockDone = learnerList.length > 0 && learnerList.every((child) => props.progress[child.id]?.completedBlocks.includes(block.id));
  const stagePct = Math.round(((stage + 1) / 9) * 100);

  const stageComplete = (index: number) => completedStages.includes(index) || (index === 7 && allLearnersBlockDone);
  const persistStage = (index: number) => {
    if (!formal || completedStages.includes(index)) return;
    const lessonStages = { ...(props.reflection.lessonStages ?? {}) };
    lessonStages[block.id] = Array.from(new Set([...(lessonStages[block.id] ?? []), index])).sort((a,b)=>a-b);
    props.onUpdateReflection({ lessonStages });
  };
  const stageReady = (index: number) => {
    if (!formal) return props.access === 'past';
    if (index === 5 && missionOne) return learnerList.every((child) => props.progress[child.id]?.completedMissions.includes(missionOne.id));
    if (index === 6 && missionTwo) return learnerList.every((child) => props.progress[child.id]?.completedMissions.includes(missionTwo.id));
    if (index === 7) return allLearnersBlockDone;
    return true;
  };
  const next = () => {
    if (!stageReady(stage)) return;
    persistStage(stage);
    props.onCompleteStage(stage);
    setStage((current) => {
      const nextStage = Math.min(8, current + 1);
      setHighestStage((highest) => Math.max(highest, nextStage));
      return nextStage;
    });
  };
  const prev = () => setStage((current) => Math.max(0, current - 1));

  const totalMissionReward = useMemo(() => block.missions.reduce((sum, mission) => ({ xp: sum.xp + mission.xp, coins: sum.coins + mission.coins }), { xp: BLOCK_REWARD.xp, coins: BLOCK_REWARD.coins }), [block]);

  return <div className="v4-quest-shell">
    <header className="v4-quest-header">
      <button className="v4-quest-back" onClick={props.onBack}><ArrowLeft/> 返回今日課程</button>
      <div className="v4-quest-title"><span>DAY {props.day.index} · LESSON {props.lessonIndex + 1} · {subjectLabel(block.subject)}</span><h1>{block.title}</h1><p>{props.day.bigIdea}</p></div>
      <div className={`v4-quest-mode ${formal ? 'today' : 'locked'}`}>{formal ? <><Rocket/> 今日挑戰</> : <><Lock/> {props.access === 'past' ? '歷史紀錄' : '尚未開放'}</>}</div>
    </header>

    <div className="v4-quest-progress"><div><span>關卡 {stage + 1} / 9</span><strong>{STAGES[stage].title}</strong></div><div className="v4-quest-track"><i style={{width:`${stagePct}%`}}/></div><b>{stagePct}%</b></div>

    <nav className="v4-stage-map" aria-label="課程九關">{STAGES.map((item,index)=>{ const Icon=item.icon; const done=stageComplete(index); const locked=formal && index>highestStage; return <button key={item.short} disabled={locked} className={`${stage===index?'active':''} ${done?'done':''} ${locked?'locked':''}`} onClick={()=>!locked&&setStage(index)}><span>{done?<Check/>:locked?<Lock/>:index+1}</span><Icon/><small>{item.short}</small></button>; })}</nav>

    {!formal && <div className="v4-quest-lock-banner"><Lock/><div><strong>{props.access === 'past' ? '這堂課已結束，不能重新挑戰。' : '這堂課尚未開放。'}</strong><span>{props.access === 'past' ? '可查看既有得分、星星、徽章與學習紀錄；不會再次發放獎勵。' : `只有 ${props.dateKey} 台北時間 00:00–23:59:59 可以正式進入。`}</span></div></div>}

    <main className="v4-quest-stage-card">
      {stage === 0 && <section className="v4-stage-content"><StageHeading icon={<Headphones/>} eyebrow="STAGE 1" title="唱歌暖身" text="原課前歌曲完整保留。先用動作與節奏把孩子帶進狀態。"/><div className="v4-video-frame"><iframe src={videoSrc(block.warmup.videoId, block.warmup.start, block.warmup.end)} title={block.warmup.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/><div><strong>{block.warmup.title}</strong><span>{block.warmup.channel}</span></div></div><CaregiverCallout block={block}/></section>}

      {stage === 1 && <section className="v4-stage-content"><StageHeading icon={<BookOpen/>} eyebrow="STAGE 2" title="單字預覽" text="每個單字都能直接播放英文發音。"/><div className="v4-word-grid">{block.vocabulary.map((word)=><button key={word} onClick={()=>speak(word)}><GameImage src={`${import.meta.env.BASE_URL}assets/v40/vocab/${slug(word)}.webp`} alt={word} className="v4-vocab-image"/><strong>{word}</strong><span><Volume2/> Listen</span></button>)}</div></section>}

      {stage === 2 && <section className="v4-stage-content"><StageHeading icon={<Play/>} eyebrow="STAGE 3" title="觀看主課影片" text={`教學焦點：${block.videoFocus}`}/><div className="v4-video-frame main"><iframe src={videoSrc(block.video.videoId, block.video.start, block.video.end)} title={block.video.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/><div><strong>{block.video.title}</strong><span>{block.video.channel}</span></div></div></section>}

      {stage === 3 && <section className="v4-stage-content"><StageHeading icon={<CircleHelp/>} eyebrow="STAGE 4" title="暫停提問" text="把原教案的時間點、操作方式與暫停提示完整攤開，不再藏在底部。"/><div className="v4-teaching-timeline">{block.steps.map((step,index)=><article key={`${step.minute}-${index}`}><b>{step.minute}</b><div><strong>{step.title}</strong><p>{step.instruction}</p>{step.cue&&<span><MessageCircleQuestion/> 暫停提示：{step.cue}</span>}</div></article>)}</div></section>}

      {stage === 4 && <section className="v4-stage-content"><StageHeading icon={<Repeat2/>} eyebrow="STAGE 5" title="複誦練習" text="先說單字，再把單字放回完整句型。"/><div className="v4-repeat-hero"><div><span>SENTENCE PATTERN</span><strong>{block.sentence}</strong><button onClick={()=>speak(block.sentence)}><Volume2/> 播放句型</button></div><div className="v4-age-tips"><article><span>YOUNGER</span><p>{block.younger}</p></article><article><span>OLDER</span><p>{block.older}</p></article></div></div></section>}

      {stage === 5 && <MissionStage mission={missionOne} number={1} stage={5} vocabulary={block.vocabulary} blockId={block.id} learners={learnerList} progress={props.progress} formal={formal} onToggle={props.onToggleMission} onAnswer={props.onAnswer}/>}
      {stage === 6 && <MissionStage mission={missionTwo} number={2} stage={6} vocabulary={block.vocabulary} blockId={block.id} learners={learnerList} progress={props.progress} formal={formal} onToggle={props.onToggleMission} onAnswer={props.onAnswer}/>}

      {stage === 7 && <section className="v4-stage-content"><StageHeading icon={<CheckCircle2/>} eyebrow="STAGE 8" title="完成任務" text="兩個互動任務都完成後，才可以正式完成本堂課。"/><div className="v4-finish-grid">{learnerList.map((child)=>{ const p=normalizeProgress(props.progress[child.id]); const ready=block.missions.every((mission)=>p.completedMissions.includes(mission.id)); const done=p.completedBlocks.includes(block.id); const rewards=calculateRewards(p); return <button key={child.id} className={done?'done':''} disabled={!formal||!ready||done} onClick={()=>props.onToggleBlock(child.id,block)}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={72}/><div><strong>{child.name}</strong><span>{done?'本堂課已完成':ready?'可以完成並領獎':'還有任務未完成'}</span></div>{done?<CheckCircle2/>:<Trophy/>}</button>; })}</div><CaregiverCallout block={block}/></section>}

      {stage === 8 && <section className="v4-stage-content v4-reward-stage"><StageHeading icon={<Gift/>} eyebrow="STAGE 9" title="領取獎勵" text="完成紀錄是唯一發獎依據；重新整理或重進本頁不會再次領取。"/><div className="v4-reward-podium"><div className="v4-reward-orbit"><Star/><Sparkles/><Trophy/></div><h2>{allLearnersBlockDone ? 'Mission Complete!' : '完成上一關後就能領獎'}</h2><div className="v4-reward-values"><span><Zap/> +{totalMissionReward.xp} XP</span><span><Coins/> +{totalMissionReward.coins} Coins</span><span><Star/> Stars</span></div><p>{allLearnersBlockDone ? '這堂課的完成紀錄已安全保存；正確率 Bonus 會在完成本堂時自動結算。' : '獎勵按每位孩子自己的完成紀錄獨立計算。'}</p></div><div className="v4-special-task"><div><span>SPECIAL BONUS</span><h3>{props.day.bonus}</h3><p>完成今天兩堂課後即可領取一次特殊任務獎勵。</p><strong>+{SPECIAL_TASK_BONUS.xp} XP · +{SPECIAL_TASK_BONUS.coins} Coins · +{SPECIAL_TASK_BONUS.stars} Star · +{SPECIAL_TASK_BONUS.gems} Gem</strong></div><div>{learnerList.map((child)=>{ const p=normalizeProgress(props.progress[child.id]); const dayDone=props.day.blocks.every((item)=>p.completedBlocks.includes(item.id)); const claimed=p.rewardTransactions?.some((transaction)=>transaction.id===`v4-special:${props.day.id}:${child.id}`)??false; return <button key={child.id} type="button" disabled={!formal||!dayDone||claimed} className={claimed?'done':''} onClick={()=>props.onClaimSpecialBonus(child.id,props.day)}><AvatarHero avatarId={child.avatar} xp={calculateRewards(p).xp} size={48}/><span>{child.name}</span><strong>{claimed?'已領取':dayDone?'完成加碼任務':'完成兩堂後解鎖'}</strong>{claimed?<Check/>:<Gift/>}</button>; })}</div></div></section>}
    </main>

    <div className="v4-quest-controls"><button onClick={prev} disabled={stage===0}><ChevronLeft/> 上一關</button><div><span>{STAGES[stage].short}</span><strong>{STAGES[stage].title}</strong></div>{stage<8?<button className="primary" onClick={next} disabled={(!formal && props.access !== 'past') || !stageReady(stage)}>{stageReady(stage) ? '完成這關' : '先完成本關任務'} <ChevronRight/></button>:<button className="primary" onClick={props.onBack}>回今日課程 <Rocket/></button>}</div>
  </div>;
}

function StageHeading({icon,eyebrow,title,text}:{icon:React.ReactNode;eyebrow:string;title:string;text:string}) { return <div className="v4-stage-heading"><span>{icon}</span><div><small>{eyebrow}</small><h2>{title}</h2><p>{text}</p></div></div>; }

function CaregiverCallout({block}:{block:LessonBlock}) { return <aside className="v4-caregiver-callout"><Users/><div><strong>家長帶課提示</strong><p>{block.caregiverTip}</p></div></aside>; }

function MissionStage({mission,number,stage,vocabulary,blockId,learners,progress,formal,onToggle,onAnswer}:{mission:LessonBlock['missions'][number];number:number;stage:number;vocabulary:string[];blockId:string;learners:AppSettings['children'];progress:AppProgress;formal:boolean;onToggle:(childId:string,mission:LessonBlock['missions'][number])=>void;onAnswer:(childId:string,target:string,answer:string,correct:boolean,stage:number)=>void}) {
  const target = vocabulary[(number - 1) % Math.max(1, vocabulary.length)] ?? mission.title;
  const alternatives = vocabulary.filter((word) => word !== target);
  const choices = Array.from(new Set([alternatives[number % Math.max(1, alternatives.length)] ?? alternatives[0], target, alternatives[(number + 1) % Math.max(1, alternatives.length)] ?? alternatives[1]])).filter(Boolean).slice(0,3);
  const [feedback,setFeedback]=useState<Record<string,'correct'|'wrong'>>({});
  const choose=(childId:string,answer:string)=>{ if(!formal) return; const correct=answer===target; playV4Sound(correct ? 'success' : 'error'); onAnswer(childId,target,answer,correct,stage); setFeedback((current)=>({...current,[childId]:correct?'correct':'wrong'})); if(correct) speak(answer); };
  return <section className="v4-stage-content"><StageHeading icon={<Gamepad2/>} eyebrow={`STAGE ${number+5}`} title={number===1?'互動遊戲':'分類活動'} text={mission.prompt}/><div className="v4-mission-focus"><div className="v4-mission-number">{number}</div><div><span>{mission.title}</span><h3>{mission.prompt}</h3><p><strong>完成標準</strong>{mission.criteria}</p></div></div><section className="v4-quick-check"><header><div><span>QUICK CHECK</span><h3>聽聲音，選出正確單字</h3></div><button type="button" onClick={()=>speak(target)}><Volume2/> 播放題目</button></header><div>{learners.map((child)=>{ const p=normalizeProgress(progress[child.id]); const alreadyCorrect=(p.answerEvents??[]).some((event)=>event.blockId===blockId&&event.stage===stage&&event.target===target&&event.correct); const state=alreadyCorrect?'correct':feedback[child.id]; return <article key={child.id} className={state??''}><AvatarHero avatarId={child.avatar} xp={calculateRewards(p).xp} size={48}/><strong>{child.name}</strong><div>{choices.map((choice)=><button key={choice} type="button" disabled={!formal||alreadyCorrect} onClick={()=>choose(child.id,choice)}>{choice}</button>)}</div><small>{alreadyCorrect||state==='correct'?'答對了！':state==='wrong'?'再聽一次看看':'先聽題目再作答'}</small></article>; })}</div></section><div className="v4-mission-learners">{learners.map((child)=>{ const p=normalizeProgress(progress[child.id]); const done=p.completedMissions.includes(mission.id); const r=calculateRewards(p); return <button key={child.id} disabled={!formal||done} className={done?'done':''} onClick={()=>onToggle(child.id,mission)}><AvatarHero avatarId={child.avatar} xp={r.xp} size={62}/><span><strong>{child.name}</strong><small>{done?'完成':'完成任務'}</small></span>{done?<Check/>:<><Zap/>+{mission.xp}</>}</button>; })}</div></section>;
}

function slug(word:string) { const value=word.toLowerCase().trim().replace(/[?!]/g,'').replace(/\s+[\u4e00-\u9fff]+$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); return value||'zh-audio'; }
