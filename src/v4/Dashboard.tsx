import { useState } from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Cloud,
  Coins,
  Gift,
  Gem,
  Home,
  Lock,
  Play,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Settings,
  Trophy,
  Video,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { curriculum } from '../data/curriculum';
import AvatarHero, { normalizeAvatarId } from '../components/AvatarHero';
import GameBadge from '../components/GameBadge';
import { badges } from '../badges';
import { calculateRewards, easterEggDays } from '../rewards';
import type { AppProgress, AppSettings, CourseDay, FamilyUserProfile } from '../types';
import type { CourseDayAccess, TrustedTaipeiDate } from '../dailyChallenge';
import { formatTaipeiCourseDate } from '../dailyChallenge';
import { levelTitle, playerResources, subjectLabel, xpToNextLevel } from './model';
import GameImage from './GameImage';
import GameIcon from './GameIcon';
import AnimatedMedia from '../v5/AnimatedMedia';
import { CaregiverAvatar } from './caregivers';
import { APP_UPDATED_AT, APP_VERSION } from '../generated/appVersion';
import { cosmeticAssetPath, equippedCosmeticForSlot } from '../cosmetics';
import { useDialogFocusTrap } from '../accessibility';

export type DashboardViewKey = 'home' | 'today' | 'semester' | 'achievements' | 'report' | 'shop';

type DashboardProps = {
  activeView: 'home';
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
  onNavigate: (view: DashboardViewKey) => void;
  onParentArea: () => void;
  cloudStatus: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onThemeChange: (theme: AppSettings['visualTheme']) => void;
  onClaimTreasure: (childId: string, day: CourseDay) => void;
  activeUser?: FamilyUserProfile;
  parentPreviewUnlocked: boolean;
};

export function AdventureHeader({ settings, progress = {}, onThemeChange, soundEnabled, onToggleSound, activeUser, parentPreviewUnlocked, onParentArea }: { settings: AppSettings; progress?: AppProgress; onThemeChange?: (t: AppSettings['visualTheme'])=>void; soundEnabled?: boolean; onToggleSound?: () => void; activeUser?: FamilyUserProfile; parentPreviewUnlocked?: boolean; onParentArea?: () => void }) {
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const themeSheetRef = useDialogFocusTrap<HTMLElement>(themeSheetOpen);
  const base = `${import.meta.env.BASE_URL}assets/v5/`;
  const keyart = `${base}keyart/hero-bg.webp`;
  const themes: Array<{id:AppSettings['visualTheme'];name:string}> = [
    {id:'hero',name:'星際英雄'},{id:'mecha',name:'機甲戰士'},{id:'racing',name:'賽車冒險'},{id:'tank',name:'奇幻精靈'},{id:'creature',name:'海底世界'},
  ];
  const art:Record<string,string>={hero:'space-hero-v2',mecha:'mecha-warrior-v2',racing:'racing-adventure-v2',tank:'fantasy-spirit-v2',creature:'ocean-world-v2'};
  const fallbackLearners = [
    { id: 'header-brother', name: '哥哥', avatar: 'brother' },
    { id: 'header-younger', name: '弟弟', avatar: 'younger' },
    { id: 'header-sister', name: '姊姊', avatar: 'sister' },
    { id: 'header-younger-sister', name: '妹妹', avatar: 'younger-sister' },
  ];
  const activeLearners = settings.children.filter((child) => !child.disabled);
  const visibleHeroLearners = (activeLearners.length ? activeLearners : fallbackLearners).slice(0, 4);
  const hiddenHeroLearnerCount = Math.max(0, activeLearners.length - visibleHeroLearners.length);
  const leadEquipment = activeLearners[0] ? progress[activeLearners[0].id]?.equippedCosmetics : undefined;
  const equippedShip = equippedCosmeticForSlot(leadEquipment, 'spaceship');
  const equippedEffect = equippedCosmeticForSlot(leadEquipment, 'effect');
  const renderHeroLearner = (learner: typeof visibleHeroLearners[number], slot: number) => {
    const avatar = normalizeAvatarId(learner.avatar);
    const resources = calculateRewards(progress[learner.id]);
    return <AvatarHero className={`v5-hero-character hero-slot-${slot} ${avatar} v6-hero-character-static`} avatarId={avatar} xp={resources.xp} equippedCosmetics={progress[learner.id]?.equippedCosmetics} size={142} eager/>;
  };
  return <header className="v4-adventure-header v5-cinematic-header">
    <picture className="v5-hero-bg-picture" aria-hidden="true">
      <source media="(max-width: 760px)" srcSet={`${base}keyart/hero-bg-mobile.webp`} />
      <img className="v5-hero-bg" src={keyart} alt="" width={3072} height={300} loading="eager" decoding="async" fetchPriority="high" />
    </picture>
    <div className="v4-brand-lockup">
      <img className="v53-brand-logo" src={`${base}brand/little-explorers-logo-v2.webp`} alt="小小探險隊" width={1997} height={787} loading="eager" decoding="async" fetchPriority="high" />
      <span className="v4-brand-subtitle">一起學習・一起長大</span>
    </div>
    <div className="v4-hero-cast v5-hero-layers" aria-label={`小小探險隊夥伴，目前 ${activeLearners.length || visibleHeroLearners.length} 位學習者`}>
      <img className="v6-hero-parent father" src={`${base}characters/caregivers/avatar-father.webp`} alt="爸爸陪伴學習"/>
      <div className={`v6-hero-learner-roster members-${visibleHeroLearners.length}`}>
        {visibleHeroLearners.map((learner, index) => renderHeroLearner(learner, index + 1))}
      </div>
      <img className="v6-hero-parent mother" src={`${base}characters/caregivers/avatar-mother.webp`} alt="媽媽陪伴學習"/>
      {hiddenHeroLearnerCount > 0 && <span className="v6-hero-more-members" aria-label={`另有 ${hiddenHeroLearnerCount} 位學習者`}>+{hiddenHeroLearnerCount}</span>}
    </div>
    {equippedEffect && <div className={`v6-header-world-effect effect-${equippedEffect.id}`} aria-hidden="true">{Array.from({length:10},(_,index)=><i key={index}/>)}</div>}
    {equippedShip ? <img className="v5-rocket-flyby v6-equipped-header-ship" src={cosmeticAssetPath(equippedShip)} alt={`${equippedShip.name}飛越基地`} /> : <AnimatedMedia className="v5-rocket-flyby" webm={`${base}animations/rocket-flyby.webm`} poster={`${base}animations/rocket-flyby-poster.webp`} alt="探險火箭飛越基地" size={640} />}
    <div className="v5-header-controls">
      {activeUser && <button type="button" className="v53-parent-status" onClick={onParentArea} aria-label="開啟家長模式"><CaregiverAvatar user={activeUser} size={40}/><span><strong>歡迎回來，{activeUser.name}</strong><small>{parentPreviewUnlocked ? 'PIN 已解鎖 · 可完整備課' : '家長模式 · 點此解鎖備課'}</small></span><Settings/></button>}
      {onThemeChange && <div className="v5-header-theme">{themes.map(t=> <button key={t.id} onClick={()=>onThemeChange(t.id)} title={t.name} className={settings.visualTheme===t.id?'active':''}><GameImage src={`${base}themes/${art[t.id]}-thumb.webp`} alt={t.name} /></button>)}</div>}
      {onThemeChange && <button type="button" className="v6-mobile-theme-trigger" onClick={()=>setThemeSheetOpen(true)}><Sparkles/> 冒險世界</button>}
      {onToggleSound && <button className="v5-sound-toggle" type="button" onClick={onToggleSound} aria-label={soundEnabled ? '關閉音效' : '開啟音效'} title={soundEnabled ? '關閉音效' : '開啟音效'}>{soundEnabled ? <Volume2/> : <VolumeX/>}</button>}
    </div>
    {onThemeChange && themeSheetOpen && <div className="v6-theme-sheet-backdrop" role="presentation" onMouseDown={()=>setThemeSheetOpen(false)}><section ref={themeSheetRef} className="v6-theme-sheet" role="dialog" aria-modal="true" aria-label="選擇冒險世界" onMouseDown={(event)=>event.stopPropagation()}><header><div><span>冒險世界</span><h2>選擇今天的旅程</h2></div><button type="button" aria-label="關閉冒險世界選單" onClick={()=>setThemeSheetOpen(false)}>×</button></header><div>{themes.map((theme)=> <button type="button" key={theme.id} className={settings.visualTheme===theme.id?'active':''} onClick={()=>{onThemeChange(theme.id);setThemeSheetOpen(false);}}><GameImage src={`${base}themes/${art[theme.id]}-thumb.webp`} alt=""/><span>{theme.name}</span>{settings.visualTheme===theme.id&&<Check/>}</button>)}</div></section></div>}
  </header>;
}

export function MainNavigation({ active, onNavigate, onParentArea }: { active: DashboardViewKey; onNavigate: (view: DashboardViewKey) => void; onParentArea: () => void }) {
  const items: Array<{ id: DashboardViewKey; label: string; icon: React.ReactNode; nav3d: string; action?: () => void }> = [
    { id: 'home', label: '首頁', icon: <Home/>, nav3d: 'home-3d-96' },
    { id: 'today', label: '今日課程', icon: <Play/>, nav3d: 'calendar-3d-96' },
    { id: 'semester', label: '學期日曆', icon: <CalendarDays/>, nav3d: 'calendar-3d-96' },
    { id: 'achievements', label: '成就獎勵', icon: <Award/>, nav3d: 'star-3d-96' },
    { id: 'report', label: '學習報表', icon: <BarChart3/>, nav3d: 'chart-3d-96', action: onParentArea },
    { id: 'shop', label: '寶物商店', icon: <ShoppingBag/>, nav3d: 'chest-3d-96' },
  ];
  return <nav className="v4-main-navigation" aria-label="主要功能">{items.map((item, index) => <button key={`${item.label}-${index}`} className={active === item.id ? 'active' : ''} aria-current={active === item.id ? 'page' : undefined} onClick={item.action ?? (() => onNavigate(item.id))}><span style={{width:40,height:40,display:'grid',placeItems:'center'}}><img src={`${import.meta.env.BASE_URL}assets/v5/nav-icons/${item.nav3d}.webp`} alt="" width={40} height={40} style={{width:40,height:40,objectFit:'contain'}} onError={(e)=>{ (e.target as HTMLImageElement).style.display='none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} /><span className="hidden" style={{display:'none'}}><GameIcon tone={item.id === 'report' ? 'purple' : item.id === 'shop' ? 'gold' : 'blue'}>{item.icon}</GameIcon></span></span><span>{item.label}</span></button>)}</nav>;
}

function PlayerProfile({ settings, progress }: { settings: AppSettings; progress: AppProgress }) {
  const learners = settings.children.filter((child) => !child.disabled);
  const familyXp = learners.reduce((total, child) => total + playerResources(progress[child.id]).xp, 0);
  const familyLevel = Math.max(1, Math.floor(familyXp / 440) + 1);
  const nextFamilyXp = familyLevel * 440;
  const familyPct = Math.min(100, Math.round((familyXp % 440) / 440 * 100));
  return <section className="v4-panel v4-player-profile"><div className="v4-panel-title"><div><span>PLAYER TEAM</span><h2>冒險隊伍</h2></div><GameIcon tone="gold"><Award/></GameIcon></div>
    <section className="v53-family-level"><Sparkles/><div><span>家庭冒險等級</span><strong>Lv.{familyLevel}</strong><small>{familyXp.toLocaleString()} / {nextFamilyXp.toLocaleString()} XP</small><i><b style={{width:`${familyPct}%`}}/></i></div></section>
    <div className="v6-player-roster-meta"><strong>{learners.length} 位學習者</strong><span>{learners.length > 4 ? '捲動查看全部成員' : '每位獨立記錄進度'}</span></div>
    <div className={`v4-player-stack ${learners.length > 4 ? 'is-scrollable' : ''}`} aria-label={`學習者名單，共 ${learners.length} 位`}>{learners.map((child) => {
      const resources = playerResources(progress[child.id]);
      const next = xpToNextLevel(resources.xp);
      const pct = resources.level >= 15 ? 100 : Math.min(100, Math.round(((resources.xp % 220) / 220) * 100));
      return <article className="v4-player-card" key={child.id}>
        <div className="v4-player-avatar"><AvatarHero avatarId={child.avatar} xp={resources.xp} equippedCosmetics={progress[child.id]?.equippedCosmetics} size={90}/><span>Lv.{resources.level}</span></div>
        <div className="v4-player-copy"><h3>{child.name}</h3><p>{levelTitle(resources.level)}</p><div className="v4-xp-track"><i style={{width:`${pct}%`}}/></div><small>{next ? `下一級還差 ${next} XP` : '已達 Lv.15 傳奇英雄'}</small></div>
        <div className="v4-resource-row" aria-label={`${child.name} 的冒險資源`}><span title="XP"><Zap/> {resources.xp}</span><span title="Coins"><Coins/> {resources.coins}</span><span title="Stars"><Star/> {resources.stars}</span><span title="Gems"><Gem/> {resources.gems}</span></div>
      </article>;
    })}</div>
  </section>;
}

function AICompanion({ todayDay, isDayDone, equippedCosmetics }: { todayDay?: CourseDay; isDayDone: (day: CourseDay) => boolean; equippedCosmetics?: string[] }) {
  const text = !todayDay ? '下一個冒險日還沒到，我會幫你守住基地！' : isDayDone(todayDay) ? '今天任務全部完成！明天再一起出發。' : '今天有新的冒險喔！兩堂課都在右邊等你。';
  const speak = () => { if (!('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'zh-TW'; window.speechSynthesis.speak(u); };
  const mood = !todayDay ? 'guard' : isDayDone(todayDay) ? 'celebrate' : 'ready';
  const room = equippedCosmeticForSlot(equippedCosmetics, 'room');
  const robot = equippedCosmeticForSlot(equippedCosmetics, 'robot');
  return <section className={`v4-panel v4-ai-companion mood-${mood} ${room?'has-mounted-room':''} ${robot?'has-mounted-robot':''}`} data-room={room?.id ?? 'base'}><button type="button" className="v4-ai-bot v5-ai-bot" onClick={speak} aria-label="請小光說出今天的提示">{robot?<img className="v6-ai-robot-art" src={cosmeticAssetPath(robot)} alt={`${robot.name}小光造型`}/>:<AnimatedMedia webm={`${import.meta.env.BASE_URL}assets/v5/animations/robot-idle.webm`} poster={`${import.meta.env.BASE_URL}assets/v5/animations/robot-idle-poster.webp`} alt="AI 學習夥伴小光" size={512} deferPlayback/>}</button><div><h3>小光</h3><p>{text}</p><small className="v5-ai-hint">{robot?`已裝備 ${robot.name}`:'點小光聽提示'}</small></div></section>;
}

function SemesterCalendar({ trustedDate, courseDateKey, accessForDay, isDayDone }: Pick<DashboardProps,'trustedDate'|'courseDateKey'|'accessForDay'|'isDayDone'>) {
  const exactIndex = curriculum.findIndex((day) => courseDateKey(day) === trustedDate.ymd);
  const nextIndex = curriculum.findIndex((day) => courseDateKey(day) >= trustedDate.ymd);
  const priorIndex = curriculum.reduce((latest, day, index) => courseDateKey(day) <= trustedDate.ymd ? index : latest, -1);
  const focusIndex = exactIndex >= 0 ? exactIndex : nextIndex >= 0 ? nextIndex : Math.max(0, priorIndex);
  const start = Math.max(0, Math.min(curriculum.length - 15, focusIndex - (focusIndex % 5) - 5));
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

function WeeklyProgress({ anchorDay, isDayDone }: { anchorDay: CourseDay; isDayDone: (day: CourseDay) => boolean }) {
  const week = anchorDay.week;
  const days = curriculum.filter((day) => day.week === week);
  const completed = days.filter(isDayDone).length;
  const pct = completed / 5 * 100;
  const semesterDone = curriculum.filter(isDayDone).length;
  return <div className="v4-progress-inner"><div className="v4-panel-title"><div><span>WEEK {String(week).padStart(2,'0')}</span><h2>本週進度</h2></div></div><AnimatedMedia className="v53-weekly-rocket" webm={`${import.meta.env.BASE_URL}assets/v5/animations/weekly-rocket-robot.webm`} poster={`${import.meta.env.BASE_URL}assets/v5/brand/weekly-rocket-robot.webp`} alt="小光搭著火箭陪伴本週學習" size={512} deferPlayback/>
    <div className="v4-progress-body v5-weekly-body"><div className="v4-progress-ring" style={{'--progress':`${pct * 3.6}deg`,width:118,height:118} as React.CSSProperties}><div><strong style={{fontSize:30}}>{completed} / 5</strong><span>完成</span></div></div><div className="v4-goals v5-goals"><div className={semesterDone >= 5 ? 'done' : ''}><Trophy size={26}/><span>小目標</span><strong>5 天</strong></div><div className={semesterDone >= 10 ? 'done' : ''}><Trophy size={26}/><span>中目標</span><strong>10 天</strong></div><div className={semesterDone >= 90 ? 'done' : ''}><Trophy size={26}/><span>大目標</span><strong>90 天</strong></div></div></div>
  </div>;
}

function SemesterOverviewPanel({ trustedDate, courseDateKey, accessForDay, isDayDone, featuredDay }: Pick<DashboardProps,'trustedDate'|'courseDateKey'|'accessForDay'|'isDayDone'|'featuredDay'>) {
  return <section className="v4-panel v5-semester-overview"><div className="v5-semester-calendar-lane"><SemesterCalendar trustedDate={trustedDate} courseDateKey={courseDateKey} accessForDay={accessForDay} isDayDone={isDayDone} /></div><div className="v5-weekly-progress-lane"><WeeklyProgress anchorDay={featuredDay} isDayDone={isDayDone} /></div></section>;
}

function CharacterEvolution({ settings, progress }: { settings: AppSettings; progress: AppProgress }) {
  const stages = [
    { level: 1, label: '學習新手' },
    { level: 5, label: '冒險勇者' },
    { level: 10, label: '星際英雄' },
    { level: 15, label: '傳奇英雄' },
  ];
  return <section className="v4-panel v4-evolution-panel"><div className="v4-panel-title"><div><h2>角色成長</h2></div><img className="v5-panel-emblem" src={`${import.meta.env.BASE_URL}assets/v5/nav-icons/star-3d-96.webp`} alt="" /></div><div className="v4-evolution-row">{settings.children.filter((c)=>!c.disabled).map((child)=>{ const r=playerResources(progress[child.id]); const current=r.level>=15?3:r.level>=10?2:r.level>=5?1:0; return <article className="v5-evolution-lane" key={child.id}><header><AvatarHero avatarId={child.avatar} xp={r.xp} equippedCosmetics={progress[child.id]?.equippedCosmetics} size={58}/><div><strong>{child.name}的進化</strong><span>Lv.{r.level} · {levelTitle(r.level)}</span></div></header><div className="v5-evolution-stages">{stages.map((stage,stageIndex)=><div className={`v5-evolution-stage ${stageIndex<current?'done':stageIndex===current?'current':'locked'}`} key={stage.level}>{stageIndex>0&&<ChevronRight className="v5-evolution-arrow"/>}<div><AvatarHero avatarId={child.avatar} xp={r.xp} stageOverride={stageIndex+1} size={72}/>{stageIndex<current&&<Check className="v5-stage-check"/>}</div><small>Lv.{stage.level}</small><span>{stage.label}</span></div>)}</div></article>; })}</div></section>;
}

function BadgeShelf({ settings, progress, onNavigate }: { settings: AppSettings; progress: AppProgress; onNavigate: (view: DashboardViewKey) => void }) {
  const learner = settings.children.find((c)=>!c.disabled); const unlocks = learner ? progress[learner.id]?.badgeUnlocks ?? {} : {};
  return <section className="v4-panel v4-badge-panel"><div className="v4-panel-title"><div><h2>成就徽章</h2></div><button className="v4-text-action" onClick={()=>onNavigate('achievements')}>全部查看 <ChevronRight/></button></div><div className="v4-badge-shelf">{badges.slice(0,8).map((badge)=><GameBadge key={badge.id} badge={badge} unlocked={Boolean(unlocks[badge.id])} earnedDate={unlocks[badge.id]} size={72} label={false}/>)}</div></section>;
}

function LessonMissionCard({ day, lessonIndex, access, verified, done, parentPreviewUnlocked, onOpen, onRequestParent }: { day: CourseDay; lessonIndex: 0|1; access: CourseDayAccess; verified: boolean; done: boolean; parentPreviewUnlocked: boolean; onOpen: () => void; onRequestParent: () => void }) {
  const block = day.blocks[lessonIndex]; const formal = access === 'today' && verified;
  const fullPreview = parentPreviewUnlocked && !formal;
  const childTeaser = !formal && !fullPreview;
  const canOpenLesson = formal || fullPreview;
  const action = done ? (canOpenLesson ? '查看內容' : '查看成果') : formal ? '開始挑戰' : fullPreview ? '完整備課' : '查看主題';
  const status = done ? '已完成' : formal ? '今日挑戰' : fullPreview ? '家長備課' : '明日驚喜';
  const clock = lessonIndex === 0 ? '18:30–19:00' : '19:05–19:35';
  const click = canOpenLesson ? onOpen : onRequestParent;
  return <article className={`v4-lesson-card ${done ? 'done' : ''} ${formal ? '' : 'preview'}`}>
    <header className="v5-lesson-card-header"><strong><Star/> 第 {lessonIndex + 1} 節</strong><span>{clock}</span></header>
    <div className="v5-lesson-card-body"><div className="v4-lesson-thumb"><GameImage src={`${import.meta.env.BASE_URL}assets/v5/vocab/rocket.webp`} alt={childTeaser ? `${day.theme} 主題預告` : `${block.title} 課程預覽`} eager/>{!formal && <i><BookOpen/></i>}</div>
      <div className="v4-lesson-content"><div className="v4-lesson-meta"><span>{childTeaser ? 'Adventure' : subjectLabel(block.subject)}</span><small>{status}</small></div><h3>{childTeaser ? `${day.theme} 冒險預告` : block.title}</h3>{(formal || fullPreview) ? <div className="v5-song-info"><small className="v5-song-label">課前歌曲</small><span className="v5-song-name">{block.warmup.title}</span></div> : <p>明日主題：{day.theme}</p>}<button onClick={click}>{done ? <><Check/> {action}</> : formal ? <><Play/> {action} <ChevronRight/></> : <><BookOpen/> {action} <ChevronRight/></>}</button></div>
    </div>
  </article>;
}

function TreasureChest({ day, settings, progress, isChildDayDone, access, verified, onClaimTreasure }: { day: CourseDay; settings: AppSettings; progress: AppProgress; isChildDayDone: (childId: string, day: CourseDay) => boolean; access: CourseDayAccess; verified: boolean; onClaimTreasure: (childId: string, day: CourseDay) => void }) {
  const [openingChildId, setOpeningChildId] = useState<string | null>(null);
  const treasureDay = easterEggDays.has(day.index);
  const nextTreasure = [...easterEggDays].find((index) => index >= day.index) ?? 90;
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
  return <section className={`v4-treasure-chest ${openingChildId ? 'is-opening' : ''} ${treasureDay ? 'treasure-day' : 'teaser'}`}>
    <div className={`v4-chest-visual ${openingChildId ? 'is-opening' : ''}`} aria-hidden="true">{openingChildId ? <AnimatedMedia webm={`${import.meta.env.BASE_URL}assets/v5/rewards/treasure-open.webm`} poster={`${import.meta.env.BASE_URL}assets/v5/rewards/treasure-open-poster.webp`} alt="寶箱打開" size={512} loop={false}/> : <GameImage src={`${import.meta.env.BASE_URL}assets/v5/nav-icons/chest-3d.webp`} alt="冒險寶箱"/>}</div>
    <div className="v4-chest-copy"><span>HIDDEN REWARD</span><h3>{treasureDay ? '完成兩堂課，打開冒險寶箱' : `神秘獎勵藏在 Day ${nextTreasure}`}</h3><p>{treasureDay ? '寶箱獎勵每個孩子各自只能領一次。' : '探索更多天，發現神秘獎勵！'}</p></div>
    {treasureDay && <div className="v4-chest-learners">{learners.map((child)=>{ const done=isChildDayDone(child.id,day); const claimed=progress[child.id]?.claimedEggs?.includes(`egg-day-${day.index}`)??false; const canOpen=verified&&access==='today'&&done&&!claimed; const opening=openingChildId===child.id; return <button key={child.id} disabled={!canOpen||Boolean(openingChildId)} className={claimed?'claimed':opening?'opening':canOpen?'ready':'locked'} onClick={()=>beginOpen(child.id)}><AvatarHero avatarId={child.avatar} xp={calculateRewards(progress[child.id]).xp} equippedCosmetics={progress[child.id]?.equippedCosmetics} size={42}/><span>{child.name}</span><strong>{claimed?'已開啟':opening?'開箱中…':done?'開寶箱':'完成兩堂後解鎖'}</strong>{claimed?<Check/>:opening?<Sparkles/>:canOpen?<Sparkles/>:<Lock/>}</button>; })}</div>}
  </section>;
}

function DailyMissionPanel({ settings, progress, trustedDate, todayDay, featuredDay, courseDateKey, accessForDay, isChildDayDone, onOpenLesson, onClaimTreasure, parentPreviewUnlocked, onParentArea }: Pick<DashboardProps,'settings'|'progress'|'trustedDate'|'todayDay'|'featuredDay'|'courseDateKey'|'accessForDay'|'isChildDayDone'|'onOpenLesson'|'onClaimTreasure'|'parentPreviewUnlocked'|'onParentArea'>) {
  const day = todayDay ?? featuredDay; const access = accessForDay(day); const date = trustedDate.ymd;
  const weekday = new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',weekday:'short'}).format(new Date(`${date}T12:00:00+08:00`));
  const adventureDate = formatTaipeiCourseDate(courseDateKey(day));
  const completedLessons = day.blocks.filter((block)=>settings.children.filter((c)=>!c.disabled).every((c)=>progress[c.id]?.completedBlocks.includes(block.id))).length;
  return <section id="today-course" className="v4-panel v4-daily-panel"><div className="v53-date-strip"><span>今天・{Number(date.slice(5,7))}月{Number(date.slice(8,10))}日</span><i>{weekday}</i><strong>{todayDay ? `Day ${day.index}` : '今天沒有正式課'}</strong></div><div className="v4-daily-head"><div><span>{todayDay ? 'TODAY MISSION' : 'NEXT ADVENTURE'}</span><h2>{day.title}</h2>{!todayDay && <strong className="v4-next-adventure-date">{adventureDate} · Day {day.index}</strong>}<p>{day.bigIdea}</p></div><img className="v5-daily-mission-art" src={`${import.meta.env.BASE_URL}assets/v5/animations/rocket-flyby-poster.webp`} alt="" /></div>
    <div className="v4-daily-progress"><div><span>{todayDay ? '今日完成' : '下一次課程'}</span><strong>{completedLessons} / 2</strong></div><div className="v4-mini-track"><i style={{width:`${completedLessons * 50}%`}}/></div></div>
    <div className="v4-lesson-list">{([0,1] as const).map((index)=> <LessonMissionCard key={day.blocks[index].id} day={day} lessonIndex={index} access={access} verified={trustedDate.verified} done={settings.children.filter((c)=>!c.disabled).every((child)=>progress[child.id]?.completedBlocks.includes(day.blocks[index].id))} parentPreviewUnlocked={parentPreviewUnlocked} onOpen={()=>onOpenLesson(day,index)} onRequestParent={onParentArea}/>)}</div>
    <TreasureChest day={day} settings={settings} progress={progress} isChildDayDone={isChildDayDone} access={access} verified={trustedDate.verified} onClaimTreasure={onClaimTreasure}/>
    {(!trustedDate.verified || access !== 'today') && <div className="v4-lock-note"><BookOpen/> {parentPreviewUnlocked ? '家長備課已解鎖：可完整查看，但仍不會寫入獎勵。' : '孩子先看明日主題；完整備課內容需由家長 PIN 解鎖。'}</div>}
  </section>;
}

export function BottomStatusBar({ trustedDate }: { cloudStatus: string; trustedDate: TrustedTaipeiDate }) {
  return <footer className="v4-status-bar"><span><Cloud/>雲端已同步{!trustedDate.verified ? '（確認中）' : ''}</span><span><ShieldCheck/>今日任務已確認</span><span><Video/>教材準備完成</span><strong>下一關，就比上一關更厲害。</strong><small>Version V{APP_VERSION} · Updated {APP_UPDATED_AT}</small></footer>;
}

export default function AdventureDashboard(props: DashboardProps) {
  const leadLearner = props.settings.children.find((child) => !child.disabled);
  const leadEquipment = leadLearner ? props.progress[leadLearner.id]?.equippedCosmetics ?? [] : [];
  const worldItemClasses = leadEquipment
    .filter((id) => /^(ship|room|robot|card|effect)-/.test(id))
    .map((id) => `has-${id}`)
    .join(' ');
  return <div className={`v4-shell ${worldItemClasses}`} data-world-items={worldItemClasses}>
    <AdventureHeader settings={props.settings} progress={props.progress} onThemeChange={props.onThemeChange} soundEnabled={props.soundEnabled} onToggleSound={props.onToggleSound} activeUser={props.activeUser} parentPreviewUnlocked={props.parentPreviewUnlocked} onParentArea={props.onParentArea}/>
    <MainNavigation active={props.activeView} onNavigate={props.onNavigate} onParentArea={props.onParentArea}/>
    <main className="v4-dashboard-grid">
      <aside className="v4-left-column"><PlayerProfile settings={props.settings} progress={props.progress}/><AICompanion todayDay={props.todayDay} isDayDone={props.isDayDone} equippedCosmetics={leadEquipment}/></aside>
      <section className="v4-center-column"><SemesterOverviewPanel trustedDate={props.trustedDate} courseDateKey={props.courseDateKey} accessForDay={props.accessForDay} isDayDone={props.isDayDone} featuredDay={props.featuredDay}/><CharacterEvolution settings={props.settings} progress={props.progress}/><BadgeShelf settings={props.settings} progress={props.progress} onNavigate={props.onNavigate}/></section>
      <aside className="v4-right-column"><DailyMissionPanel settings={props.settings} progress={props.progress} trustedDate={props.trustedDate} todayDay={props.todayDay} featuredDay={props.featuredDay} courseDateKey={props.courseDateKey} accessForDay={props.accessForDay} isChildDayDone={props.isChildDayDone} onOpenLesson={props.onOpenLesson} onClaimTreasure={props.onClaimTreasure} parentPreviewUnlocked={props.parentPreviewUnlocked} onParentArea={props.onParentArea}/></aside>
    </main>
    <BottomStatusBar cloudStatus={props.cloudStatus} trustedDate={props.trustedDate}/>
  </div>;
}
