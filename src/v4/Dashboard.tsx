import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Award,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  Cloud,
  Coins,
  Gamepad2,
  Gem,
  Gift,
  Home,
  Lock,
  Play,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Trophy,
  Video,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { curriculum } from '../data/curriculum';
import AvatarHero from '../components/AvatarHero';
import GameBadge from '../components/GameBadge';
import { badges } from '../badges';
import { calculateRewards, easterEggDays } from '../rewards';
import type { AppProgress, AppSettings, CourseDay } from '../types';
import type { CourseDayAccess, TrustedTaipeiDate } from '../dailyChallenge';
import { formatTaipeiCourseDate } from '../dailyChallenge';
import { levelTitle, playerResources, subjectLabel, xpToNextLevel, youtubeThumb } from './model';
import GameImage from './GameImage';
import GameIcon from './GameIcon';

const TreasureLottie = lazy(() => import('./TreasureLottie'));

export type ViewKey = 'home' | 'today' | 'semester' | 'achievements' | 'report' | 'shop';

type DashboardProps = {
  activeView: 'home' | 'today';
  settings: AppSettings;
  progress: AppProgress;
  trustedDate: TrustedTaipeiDate;
  todayDay: CourseDay | undefined;
  featuredDay: CourseDay;
  courseDateKey: (day: CourseDay) => string;
  accessForDay: (day: CourseDay) => CourseDayAccess;
  isDayDone: (day: CourseDay) => boolean;
  isChildDayDone: (childId: string, day: CourseDay) => boolean;
  onOpenLesson: (day: CourseDay, lessonIndex: 0 | 1) => void;
  onNavigate: (view: ViewKey) => void;
  onParentArea: () => void;
  cloudStatus: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onThemeChange: (theme: AppSettings['visualTheme']) => void;
  onClaimTreasure: (childId: string, day: CourseDay) => void;
};

export function AdventureHeader({ settings, progress, onThemeChange }: { settings: AppSettings; progress?: AppProgress; onThemeChange?: (t: AppSettings['visualTheme'])=>void }) {
  const children = settings.children.filter((child) => !child.disabled).slice(0, 2);
  const keyart = `${import.meta.env.BASE_URL}assets/v5/keyart/hero-keyart-desktop.webp`;
  const logo = `${import.meta.env.BASE_URL}assets/v5/keyart/little-explorers-logo.webp`;
  const fallbackBanner = `${import.meta.env.BASE_URL}assets/v40/hero-space-dashboard.webp`;
  const themes: Array<{id:AppSettings['visualTheme'];name:string}> = [
    {id:'hero',name:'星際英雄'},{id:'mecha',name:'機甲戰士'},{id:'racing',name:'賽車冒險'},{id:'tank',name:'奇幻精靈'},{id:'creature',name:'海底世界'},
  ];
  const art:Record<string,string>={hero:'space-hero',mecha:'mecha-warrior',racing:'racing-adventure',tank:'fantasy-spirit',creature:'ocean-world'};
  return <header className="v4-adventure-header" style={{backgroundImage:`linear-gradient(90deg,rgba(6,29,87,.85),rgba(6,29,87,.2)),url(${keyart}),url(${fallbackBanner})`}}>
    <div className="v4-stars" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
    <div className="v4-brand-lockup">
      <img src={logo} alt="小小探險隊" style={{width:360,height:76,objectFit:'contain'}} onError={(e)=>{ (e.target as HTMLImageElement).style.display='none'; }} />
      <div style={{display:'none'}}><strong>小小探險隊</strong><span>一起學習・一起長大</span></div>
      <span className="v4-brand-subtitle">一起學習・一起長大</span>
    </div>
    <div className="v4-hero-cast" aria-label="小小探險隊夥伴">
      {children.map((child) => {
        const reward = calculateRewards(progress?.[child.id]);
        return <AvatarHero key={child.id} avatarId={child.avatar} xp={reward.xp} equippedCosmetics={progress?.[child.id]?.equippedCosmetics} size={86}/>;
      })}
      <div className="v4-robot-avatar"><GameImage src={`${import.meta.env.BASE_URL}assets/v40/characters/avatar-robot.webp`} alt="AI 學習夥伴" eager /><span className="v4-robot-face" aria-hidden="true"><i/><i/></span><span className="v4-robot-hand" aria-hidden="true"/></div>
      <Rocket className="v4-floating-rocket" size={54}/>
      <span className="v4-planet planet-one"/><span className="v4-planet planet-two"/>
    </div>
    {onThemeChange && <div className="v5-header-theme" style={{width:350,height:82,display:'flex',gap:8,alignItems:'center',justifyContent:'flex-end'}}>{themes.map(t=> <button key={t.id} onClick={()=>onThemeChange(t.id)} title={t.name} style={{width:52,height:52,borderRadius:16,border: settings.visualTheme===t.id?'3px solid #FFD83D':'2px solid rgba(255,255,255,.35)',transform: settings.visualTheme===t.id?'scale(1.08)':'none',overflow:'hidden',padding:0,background:'#0A1F63'}}><GameImage src={`${import.meta.env.BASE_URL}assets/v40/themes/${art[t.id]}.webp`} alt={t.name} /></button>)}</div>}
  </header>;
}

export function MainNavigation({ active, onNavigate, onParentArea }: { active: ViewKey; onNavigate: (view: ViewKey) => void; onParentArea: () => void }) {
  const items: Array<{ id: ViewKey; label: string; icon: React.ReactNode; nav3d: string; action?: () => void }> = [
    { id: 'home', label: '首頁', icon: <Home/>, nav3d: 'home-3d' },
    { id: 'today', label: '今日課程', icon: <Gamepad2/>, nav3d: 'book-3d' },
    { id: 'semester', label: '學期日曆', icon: <CalendarDays/>, nav3d: 'calendar-3d' },
    { id: 'achievements', label: '成就獎勵', icon: <Award/>, nav3d: 'star-3d' },
    { id: 'report', label: '學習報表', icon: <BarChart3/>, nav3d: 'chart-3d', action: onParentArea },
    { id: 'shop', label: '寶物商店', icon: <ShoppingBag/>, nav3d: 'chest-3d' },
  ];
  return <nav className="v4-main-navigation" aria-label="主要功能">{items.map((item, index) => <button key={`${item.label}-${index}`} className={active === item.id ? 'active' : ''} aria-current={active === item.id ? 'page' : undefined} onClick={item.action ?? (() => onNavigate(item.id))}><span style={{width:40,height:40,display:'grid',placeItems:'center'}}><img src={`${import.meta.env.BASE_URL}assets/v5/nav-icons/${item.nav3d}.webp`} alt="" width={40} height={40} style={{width:40,height:40,objectFit:'contain'}} onError={(e)=>{ (e.target as HTMLImageElement).style.display='none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} /><span className="hidden" style={{display:'none'}}><GameIcon tone={index === 3 ? 'purple' : index === 5 ? 'gold' : 'blue'}>{item.icon}</GameIcon></span></span><span>{item.label}</span></button>)}</nav>;
}

function PlayerProfile({ settings, progress }: { settings: AppSettings; progress: AppProgress }) {
  return <section className="v4-panel v4-player-profile"><div className="v4-panel-title"><div><span>PLAYER TEAM</span><h2>冒險隊伍</h2></div><GameIcon tone="gold"><Trophy/></GameIcon></div>
    <div className="v4-player-stack">{settings.children.filter((child) => !child.disabled).map((child) => {
      const resources = playerResources(progress[child.id]);
      const next = xpToNextLevel(resources.xp);
      const pct = resources.level >= 15 ? 100 : Math.min(100, Math.round(((resources.xp % 220) / 220) * 100));
      return <article className="v4-player-card" key={child.id}>
        <div className="v4-player-avatar"><AvatarHero avatarId={child.avatar} xp={resources.xp} size={104}/><span>Lv.{resources.level}</span></div>
        <div className="v4-player-copy"><h3>{child.name}</h3><p>{levelTitle(resources.level)}</p><div className="v4-xp-track"><i style={{width:`${pct}%`}}/></div><small>{next ? `下一級還差 ${next} XP` : '已達 Lv.15 傳奇英雄'}</small></div>
        <div className="v4-resource-row"><span><Zap/> {resources.xp}</span><span><Coins/> {resources.coins}</span><span><Star/> {resources.stars}</span><span><Gem/> {resources.gems}</span></div>
      </article>;
    })}</div>
  </section>;
}

function AICompanion({ todayDay, isDayDone, soundEnabled, onToggleSound }: { todayDay?: CourseDay; isDayDone: (day: CourseDay) => boolean; soundEnabled: boolean; onToggleSound: () => void }) {
  const text = !todayDay ? '下一個冒險日還沒到，我會幫你守住基地！' : isDayDone(todayDay) ? '今天任務全部完成！明天再一起出發。' : '今天有新的冒險喔！兩堂課都在右邊等你。';
  const speak = () => { if (!('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'zh-TW'; window.speechSynthesis.speak(u); };
  const mood = !todayDay ? 'guard' : isDayDone(todayDay) ? 'celebrate' : 'ready';
  return <section className={`v4-panel v4-ai-companion mood-${mood}`}><div className="v4-ai-bot"><GameImage src={`${import.meta.env.BASE_URL}assets/v40/characters/avatar-robot.webp`} alt="AI 學習夥伴"/><span className="v4-robot-face" aria-hidden="true"><i/><i/></span><span className="v4-robot-hand" aria-hidden="true"/></div><div><span>AI LEARNING BUDDY</span><h3>小光</h3><p>{text}</p><div className="v4-ai-actions"><button onClick={speak}><Volume2/>聽我說</button><button onClick={onToggleSound}>{soundEnabled ? <Volume2/> : <VolumeX/>}{soundEnabled ? '音效開' : '音效關'}</button></div></div></section>;
}

function SemesterCalendar({ trustedDate, courseDateKey, accessForDay, isDayDone }: Pick<DashboardProps,'trustedDate'|'courseDateKey'|'accessForDay'|'isDayDone'>) {
  const todayIndex = Math.max(0, curriculum.findIndex((day) => courseDateKey(day) === trustedDate.ymd));
  const start = Math.max(0, Math.min(curriculum.length - 15, todayIndex >= 0 ? todayIndex - (todayIndex % 5) - 5 : 0));
  const visible = curriculum.slice(start, start + 15);
  return <div className="v4-calendar-inner"><div className="v4-panel-title"><div><span>SEMESTER MAP</span><h2>學期日曆</h2></div><div className="v4-calendar-legend"><i className="done"/>完成<i className="today"/>今天<i className="lock"/>鎖定</div></div>
    <div className="v4-calendar-weekdays"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span></div>
    <div className="v4-calendar-grid v5-grid-15">{visible.map((day) => {
      const access = accessForDay(day); const done = isDayDone(day); const special = easterEggDays.has(day.index); const date = courseDateKey(day);
      const status = done ? 'done' : access === 'today' ? 'today' : access === 'future' ? 'locked' : 'missed';
      return <div key={day.id} className={`v4-calendar-day ${status} ${special ? 'special' : ''}`} title={`Day ${day.index} · ${formatTaipeiCourseDate(date)}`}><span>{date.slice(5).replace('-','/')}</span><strong>Day {day.index}</strong><i>{done ? <Check/> : access === 'today' ? <Rocket/> : access === 'future' ? <Lock/> : <Star/>}</i>{special && <b><Gift/></b>}</div>;
    })}</div>
  </div>;
}

function WeeklyProgress({ todayDay, isDayDone }: { todayDay?: CourseDay; isDayDone: (day: CourseDay) => boolean }) {
  const week = todayDay?.week ?? 1;
  const days = curriculum.filter((day) => day.week === week);
  const completed = days.filter(isDayDone).length;
  const pct = completed / 5 * 100;
  const semesterDone = curriculum.filter(isDayDone).length;
  return <div className="v4-progress-inner"><div className="v4-panel-title"><div><span>WEEK {String(week).padStart(2,'0')}</span><h2>本週進度</h2></div><GameIcon tone="green"><Zap/></GameIcon></div>
    <div className="v4-progress-body v5-weekly-body"><div className="v4-progress-ring" style={{'--progress':`${pct * 3.6}deg`,width:118,height:118} as React.CSSProperties}><div><strong style={{fontSize:30}}>{completed} / 5</strong><span>完成</span></div></div><div className="v4-goals v5-goals"><div className={semesterDone >= 5 ? 'done' : ''}><Trophy size={26}/><span>小目標</span><strong>5 天</strong></div><div className={semesterDone >= 10 ? 'done' : ''}><Trophy size={26}/><span>中目標</span><strong>10 天</strong></div><div className={semesterDone >= 90 ? 'done' : ''}><Trophy size={26}/><span>大目標</span><strong>90 天</strong></div></div></div>
  </div>;
}

function SemesterOverviewPanel({ trustedDate, courseDateKey, accessForDay, isDayDone, todayDay }: Pick<DashboardProps,'trustedDate'|'courseDateKey'|'accessForDay'|'isDayDone'> & { todayDay?: CourseDay }) {
  return <section className="v4-panel v5-semester-overview" style={{width:880,height:368,display:'grid',gridTemplateColumns:'536px 310px',gap:12,padding:16,borderRadius:16,background:'#F9FBFF'}}><div style={{width:536,height:296}}><SemesterCalendar trustedDate={trustedDate} courseDateKey={courseDateKey} accessForDay={accessForDay} isDayDone={isDayDone} /></div><div style={{width:310,height:296,background:'#FFFDF3',borderRadius:16,padding:12,border:'1.5px solid #F0E6C8'}}><WeeklyProgress todayDay={todayDay} isDayDone={isDayDone} /></div></section>;
}

function CharacterEvolution({ settings, progress }: { settings: AppSettings; progress: AppProgress }) {
  return <section className="v4-panel v4-evolution-panel"><div className="v4-panel-title"><div><span>EVOLUTION</span><h2>角色成長</h2></div><GameIcon tone="purple"><Sparkles/></GameIcon></div><div className="v4-evolution-row">{settings.children.filter((c)=>!c.disabled).map((child)=>{ const r=playerResources(progress[child.id]); return <article key={child.id}><AvatarHero avatarId={child.avatar} xp={r.xp} size={94}/><div><strong>{child.name} · Lv.{r.level}</strong><span>{levelTitle(r.level)}</span><small>{r.level < 15 ? `Lv.${r.level + 1} 解鎖下一段成長` : '傳奇英雄已完成'}</small></div></article>; })}</div></section>;
}

function BadgeShelf({ settings, progress, onNavigate }: { settings: AppSettings; progress: AppProgress; onNavigate: (view: ViewKey) => void }) {
  const learner = settings.children.find((c)=>!c.disabled); const unlocks = learner ? progress[learner.id]?.badgeUnlocks ?? {} : {};
  return <section className="v4-panel v4-badge-panel"><div className="v4-panel-title"><div><span>ACHIEVEMENTS</span><h2>成就徽章</h2></div><button className="v4-text-action" onClick={()=>onNavigate('achievements')}>全部查看 <ChevronRight/></button></div><div className="v4-badge-shelf">{badges.slice(0,8).map((badge)=><GameBadge key={badge.id} badge={badge} unlocked={Boolean(unlocks[badge.id])} earnedDate={unlocks[badge.id]} size={52}/>)}</div></section>;
}

function LessonMissionCard({ day, lessonIndex, access, verified, done, onOpen }: { day: CourseDay; lessonIndex: 0|1; access: CourseDayAccess; verified: boolean; done: boolean; onOpen: () => void }) {
  const block = day.blocks[lessonIndex]; const locked = access !== 'today' || !verified;
  return <article className={`v4-lesson-card ${done ? 'done' : ''} ${locked ? 'locked' : ''}`}>
    <div className="v4-lesson-thumb"><GameImage src={youtubeThumb(block.video.videoId)} alt={`${block.title} YouTube 預覽`}/><span>{lessonIndex + 1}</span>{locked && <i><Lock/></i>}</div>
    <div className="v4-lesson-content"><div className="v4-lesson-meta"><span>{subjectLabel(block.subject)}</span><small>{block.duration} min</small></div><h3>{block.title}</h3><p>課前歌曲：{block.warmup.title}</p><button disabled={locked || done} onClick={onOpen}>{done ? <><Check/> 已完成</> : locked ? <><Lock/> 尚未開放</> : <><Play/> 開始挑戰 <ChevronRight/></>}</button></div>
  </article>;
}

function TreasureChest({ day, settings, progress, isChildDayDone, access, verified, onClaimTreasure }: { day: CourseDay; settings: AppSettings; progress: AppProgress; isChildDayDone: (childId: string, day: CourseDay) => boolean; access: CourseDayAccess; verified: boolean; onClaimTreasure: (childId: string, day: CourseDay) => void }) {
  const [openingChildId, setOpeningChildId] = useState<string | null>(null);
  if (!easterEggDays.has(day.index)) return null;
  const learners = settings.children.filter((child)=>!child.disabled);
  const beginOpen = (childId: string) => {
    if (openingChildId) return;
    setOpeningChildId(childId);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => {
      onClaimTreasure(childId, day);
      setOpeningChildId(null);
    }, reduceMotion ? 120 : 1150);
  };
  return <section className={`v4-treasure-chest ${openingChildId ? 'is-opening' : ''}`}>
    <div className={`v4-chest-visual ${openingChildId ? 'is-opening' : ''}`} aria-hidden="true">{openingChildId ? <Suspense fallback={<Gift/>}><TreasureLottie/></Suspense> : <><Gift/><span/><i/></>}</div>
    <div className="v4-chest-copy"><span>TREASURE DAY</span><h3>完成兩堂課，打開冒險寶箱</h3><p>寶箱獎勵每個孩子各自只能領一次。</p></div>
    <div className="v4-chest-learners">{learners.map((child)=>{ const done=isChildDayDone(child.id,day); const claimed=progress[child.id]?.claimedEggs?.includes(`egg-day-${day.index}`)??false; const canOpen=verified&&access==='today'&&done&&!claimed; const opening=openingChildId===child.id; return <button key={child.id} disabled={!canOpen||Boolean(openingChildId)} className={claimed?'claimed':opening?'opening':canOpen?'ready':'locked'} onClick={()=>beginOpen(child.id)}><AvatarHero avatarId={child.avatar} xp={calculateRewards(progress[child.id]).xp} size={42}/><span>{child.name}</span><strong>{claimed?'已開啟':opening?'開箱中…':done?'開寶箱':'完成兩堂後解鎖'}</strong>{claimed?<Check/>:opening?<Sparkles/>:canOpen?<Sparkles/>:<Lock/>}</button>; })}</div>
  </section>;
}

function DailyMissionPanel({ settings, progress, trustedDate, todayDay, featuredDay, accessForDay, isChildDayDone, onOpenLesson, onClaimTreasure }: Pick<DashboardProps,'settings'|'progress'|'trustedDate'|'todayDay'|'featuredDay'|'accessForDay'|'isChildDayDone'|'onOpenLesson'|'onClaimTreasure'>) {
  const day = todayDay ?? featuredDay; const access = accessForDay(day); const date = trustedDate.ymd;
  return <section className="v4-panel v4-daily-panel"><div className="v4-daily-head"><div><span>{todayDay ? 'TODAY MISSION' : 'NEXT MISSION'}</span><h2>{todayDay ? `${date.slice(5).replace('-','/')} · Day ${day.index}` : `Day ${day.index}`}</h2><p>{day.bigIdea}</p></div><GameIcon tone="orange"><Rocket/></GameIcon></div>
    <div className="v4-daily-progress"><div><span>今日完成</span><strong>{day.blocks.filter((block)=>settings.children.filter((c)=>!c.disabled).every((c)=>progress[c.id]?.completedBlocks.includes(block.id))).length} / 2</strong></div><div className="v4-mini-track"><i style={{width:`${day.blocks.filter((block)=>settings.children.filter((c)=>!c.disabled).every((c)=>progress[c.id]?.completedBlocks.includes(block.id))).length * 50}%`}}/></div></div>
    <div className="v4-lesson-list">{([0,1] as const).map((index)=> <LessonMissionCard key={day.blocks[index].id} day={day} lessonIndex={index} access={access} verified={trustedDate.verified} done={settings.children.filter((c)=>!c.disabled).every((child)=>progress[child.id]?.completedBlocks.includes(day.blocks[index].id))} onOpen={()=>onOpenLesson(day,index)}/>)}</div>
    <TreasureChest day={day} settings={settings} progress={progress} isChildDayDone={isChildDayDone} access={access} verified={trustedDate.verified} onClaimTreasure={onClaimTreasure}/>
    {(!trustedDate.verified || access !== 'today') && <div className="v4-lock-note"><Lock/> {!trustedDate.verified ? '正在向伺服器確認 Asia/Taipei 日期；確認前不會開放課程或獎勵。' : '今天沒有可挑戰課程；未來課程會在台北時間 00:00 自動開放。'}</div>}
  </section>;
}

export function BottomStatusBar({ cloudStatus, trustedDate }: { cloudStatus: string; trustedDate: TrustedTaipeiDate }) {
  return <footer className="v4-status-bar"><span><Cloud/>雲端：{cloudStatus}</span><span><ShieldCheck/>日期保護：{trustedDate.verified ? 'Server verified' : 'checking'}</span><span><Video/>影片資料：360 unique</span><strong>下一關，就比上一關更厲害。</strong></footer>;
}

export default function V4Dashboard(props: DashboardProps) {
  useEffect(() => {
    if (props.activeView !== 'today') return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.requestAnimationFrame(() => document.querySelector('.v4-daily-panel')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }));
  }, [props.activeView]);
  const leadLearner = props.settings.children.find((child) => !child.disabled);
  const worldItemClasses = (leadLearner ? props.progress[leadLearner.id]?.equippedCosmetics ?? [] : [])
    .filter((id) => /^(ship|room|robot|card|effect)-/.test(id))
    .map((id) => `has-${id}`)
    .join(' ');
  return <div className={`v4-shell ${worldItemClasses}`} data-world-items={worldItemClasses}>
    <AdventureHeader settings={props.settings} progress={props.progress} onThemeChange={props.onThemeChange}/>
    <MainNavigation active={props.activeView} onNavigate={props.onNavigate} onParentArea={props.onParentArea}/>
    <main className="v4-dashboard-grid">
      <aside className="v4-left-column"><PlayerProfile settings={props.settings} progress={props.progress}/><AICompanion todayDay={props.todayDay} isDayDone={props.isDayDone} soundEnabled={props.soundEnabled} onToggleSound={props.onToggleSound}/></aside>
      <section className="v4-center-column"><SemesterOverviewPanel trustedDate={props.trustedDate} courseDateKey={props.courseDateKey} accessForDay={props.accessForDay} isDayDone={props.isDayDone} todayDay={props.todayDay} /><CharacterEvolution settings={props.settings} progress={props.progress}/><BadgeShelf settings={props.settings} progress={props.progress} onNavigate={props.onNavigate}/></section>
      <aside className="v4-right-column"><DailyMissionPanel settings={props.settings} progress={props.progress} trustedDate={props.trustedDate} todayDay={props.todayDay} featuredDay={props.featuredDay} accessForDay={props.accessForDay} isChildDayDone={props.isChildDayDone} onOpenLesson={props.onOpenLesson} onClaimTreasure={props.onClaimTreasure}/></aside>
    </main>
    <BottomStatusBar cloudStatus={props.cloudStatus} trustedDate={props.trustedDate}/>
  </div>;
}
