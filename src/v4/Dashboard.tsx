import DailyParticipants from './DailyParticipants';
import { cancelEnglishSpeech } from './voice';
import { cloudStatusLabel } from '../statusLabels';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import WorldDisplayImage from '../components/WorldDisplayImage';
import PetCompanion from '../components/PetCompanion';
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
  LogIn,
  LogOut,
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
import { courseEggId, resolveSemester } from '../semesters';
import AvatarHero, { normalizeAvatarId } from '../components/AvatarHero';
import GameBadge from '../components/GameBadge';
import { badges } from '../badges';
import { calculateRewards, easterEggDays } from '../rewards';
import type { AppProgress, AppSettings, CourseDay, FamilyUserProfile } from '../types';
import type { CourseDayAccess, TrustedTaipeiDate } from '../dailyChallenge';
import { formatTaipeiCourseDate } from '../dailyChallenge';
import { levelTitle, playerResources, subjectLabel, youtubeThumb, xpToNextLevel } from './model';
import GameImage from './GameImage';
import GameIcon from './GameIcon';
import AnimatedMedia from '../v5/AnimatedMedia';
import { CaregiverAvatar } from './caregivers';
import { APP_UPDATED_AT, APP_VERSION } from '../generated/appVersion';
import { cosmeticAssetPath, equippedCosmeticForSlot } from '../cosmetics';
import { useDialogFocusTrap } from '../accessibility';
import { cardFrameAssetPath, reviewedWorldAssetPath } from '../worldArtAssets';
import { useRoomScenePath } from '../useRoomScenePath';
import ThemePointer from '../components/ThemePointer';

export type DashboardViewKey = 'home' | 'today' | 'semester' | 'achievements' | 'report' | 'shop' | 'settings' | 'parent-logout';

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
  participantIds: (day: CourseDay) => string[];
  onSelectParticipant: (day: CourseDay, childId: string, selected: boolean) => void;
  onNavigate: (view: DashboardViewKey) => void;
  onParentArea: () => void;
  cloudStatus: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onThemeChange: (theme: AppSettings['visualTheme']) => void;
  onDisplayLearnerChange: (childId: string) => void;
  onClaimTreasure: (childId: string, day: CourseDay) => void;
  activeUser?: FamilyUserProfile;
  parentPreviewUnlocked: boolean;
};

export function AdventureHeader({ settings, progress = {}, onThemeChange, soundEnabled, onToggleSound, activeUser, parentPreviewUnlocked, onParentArea, onParentLogout, homeGreetingActive = false, displayLearnerId }: { settings: AppSettings; progress?: AppProgress; onThemeChange?: (t: AppSettings['visualTheme'])=>void; soundEnabled?: boolean; onToggleSound?: () => void; activeUser?: FamilyUserProfile; parentPreviewUnlocked?: boolean; onParentArea?: () => void; onParentLogout?: () => void; homeGreetingActive?: boolean; displayLearnerId?: string }) {
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const themeSheetRef = useDialogFocusTrap<HTMLElement>(themeSheetOpen);
  const base = `${import.meta.env.BASE_URL}assets/v5/`;
  const themes: Array<{id:AppSettings['visualTheme'];name:string}> = [
    {id:'hero',name:'星際英雄'},{id:'mecha',name:'機甲戰士'},{id:'racing',name:'賽車冒險'},{id:'tank',name:'奇幻精靈'},{id:'creature',name:'海底世界'},
  ];
  const art:Record<string,string>={mecha:'mecha',racing:'racing',tank:'fantasy',creature:'ocean'};
  const themeThumbnail = (theme: AppSettings['visualTheme']) => theme === 'hero'
    ? `${base}themes/space-hero-v2-thumb.webp`
    : `${import.meta.env.BASE_URL}assets/v6.5.2/themes/${art[theme]}-thumb.webp`;
  const themedScene = `${import.meta.env.BASE_URL}assets/v6.5.2/themes/${art[settings.visualTheme]}-panorama.webp`;
  const keyart = settings.visualTheme === 'hero' ? `${base}keyart/hero-bg.webp` : themedScene;
  const mobileKeyart = settings.visualTheme === 'hero' ? `${base}keyart/hero-bg-mobile.webp` : themedScene;
  const showcaseLearners = [
    { id: 'header-brother', name: '哥哥', avatar: 'brother' },
    { id: 'header-younger', name: '弟弟', avatar: 'younger' },
    { id: 'header-sister', name: '姊姊', avatar: 'sister' },
    { id: 'header-younger-sister', name: '妹妹', avatar: 'younger-sister' },
  ];
  const activeLearners = settings.children.filter((child) => !child.disabled);
  const visibleHeroLearners = showcaseLearners.map((showcase) => activeLearners.find((learner) => normalizeAvatarId(learner.avatar) === showcase.avatar) ?? showcase);
  const displayLearner = activeLearners.find((learner) => learner.id === displayLearnerId) ?? activeLearners[0];
  const leadEquipment = displayLearner ? progress[displayLearner.id]?.equippedCosmetics : undefined;
  const equippedShip = equippedCosmeticForSlot(leadEquipment, 'spaceship');
  const renderHeroLearner = (learner: typeof visibleHeroLearners[number], slot: number) => {
    const avatar = normalizeAvatarId(learner.avatar);
    return <AvatarHero key={`${learner.id}-${avatar}`} className={`v5-hero-character hero-slot-${slot} ${avatar} v6-hero-character-static`} avatarId={avatar} stageOverride={4} size={142} eager/>;
  };
  return <header className={`v4-adventure-header v5-cinematic-header ${homeGreetingActive ? 'v64-home-arrival' : ''}`} data-home-greeting={homeGreetingActive ? 'playing' : 'resting'}>
    <picture className="v5-hero-bg-picture" aria-hidden="true">
      <source media="(max-width: 760px)" srcSet={mobileKeyart} />
      <img className={`v5-hero-bg ${settings.visualTheme === 'hero' ? '' : 'v652-theme-panorama'}`} src={keyart} alt="" width={settings.visualTheme === 'hero' ? 3072 : 2172} height={settings.visualTheme === 'hero' ? 300 : 724} loading="eager" decoding="async" fetchPriority="high" />
    </picture>
    <div className="v4-brand-lockup">
      <img className="v53-brand-logo" src={`${base}brand/little-explorers-logo-v2.webp`}
        srcSet={`${import.meta.env.BASE_URL}assets/v6.5/display/little-explorers-logo-v2-256.webp 256w, ${import.meta.env.BASE_URL}assets/v6.5/display/little-explorers-logo-v2-384.webp 384w, ${import.meta.env.BASE_URL}assets/v6.4/brand-display/little-explorers-logo-v2-768.webp 768w, ${base}brand/little-explorers-logo-v2.webp 1997w`}
        sizes="(max-width: 760px) 164px, 244px"
        alt="小小探險隊" width={1997} height={787} loading="eager" decoding="async" fetchPriority="high"
        onError={(event) => { event.currentTarget.removeAttribute('srcset'); }} />
      <span className="v4-brand-subtitle">一起學習・一起長大</span>
    </div>
    <div className="v4-hero-cast v5-hero-layers v65-hero-showcase" aria-label="哥哥、弟弟、姐姐與妹妹的傳奇探險造型展示">
      <div className={`v6-hero-learner-roster members-${visibleHeroLearners.length}`}>
        {visibleHeroLearners.map((learner, index) => renderHeroLearner(learner, index + 1))}
      </div>
    </div>
    {equippedShip ? <WorldDisplayImage itemId={equippedShip.id} slot="spaceship" className="v5-rocket-flyby v6-equipped-header-ship" fallback={cosmeticAssetPath(equippedShip)} alt={`${equippedShip.name}飛越基地`} /> : <AnimatedMedia className="v5-rocket-flyby" webm={`${base}animations/rocket-flyby.webm`} poster={`${import.meta.env.BASE_URL}assets/v6.5/display/rocket-flyby-poster-384.webp`} posterFallback={`${base}animations/rocket-flyby-poster.webp`} alt="探險火箭飛越基地" size={640} />}
    <div className="v5-header-controls">
      <button type="button" className="v652-parent-session" onClick={parentPreviewUnlocked ? onParentLogout : onParentArea} aria-label={parentPreviewUnlocked ? '家長登出' : '家長登入'}>
        {parentPreviewUnlocked && activeUser ? <CaregiverAvatar user={activeUser} size={32}/> : <ShieldCheck size={22}/>}
        <span><strong>{parentPreviewUnlocked ? '登出' : '家長登入'}</strong><small>{parentPreviewUnlocked ? `${activeUser?.name ?? '家長'}已登入` : '報表與家庭管理'}</small></span>
        {parentPreviewUnlocked ? <LogOut size={18}/> : <LogIn size={18}/>}
      </button>
      {onThemeChange && <div className="v5-header-theme">{themes.map(t=> <button key={t.id} onClick={()=>onThemeChange(t.id)} title={t.name} className={settings.visualTheme===t.id?'active':''}><GameImage src={themeThumbnail(t.id)} alt={t.name} /></button>)}</div>}
      {onThemeChange && <button type="button" className="v6-mobile-theme-trigger" onClick={()=>setThemeSheetOpen(true)}><Sparkles/> 主題</button>}
      {onToggleSound && <button className="v5-sound-toggle" type="button" onClick={onToggleSound} aria-label={soundEnabled ? '關閉音效' : '開啟音效'} title={soundEnabled ? '關閉音效' : '開啟音效'}>{soundEnabled ? <Volume2/> : <VolumeX/>}</button>}
    </div>
    {onThemeChange && themeSheetOpen && <div className="v6-theme-sheet-backdrop" role="presentation" onMouseDown={()=>setThemeSheetOpen(false)}><section ref={themeSheetRef} className="v6-theme-sheet" role="dialog" aria-modal="true" aria-label="選擇冒險世界" onKeyDown={(event)=>{ if (event.key === 'Escape') { event.stopPropagation(); setThemeSheetOpen(false); } }} onMouseDown={(event)=>event.stopPropagation()}><header><div><span>冒險世界</span><h2>選擇今天的旅程</h2></div><button type="button" aria-label="關閉冒險世界選單" onClick={()=>setThemeSheetOpen(false)}>×</button></header><div>{themes.map((theme)=> <button type="button" key={theme.id} className={settings.visualTheme===theme.id?'active':''} onClick={()=>{onThemeChange(theme.id);setThemeSheetOpen(false);}}><GameImage src={themeThumbnail(theme.id)} alt=""/><span>{theme.name}</span>{settings.visualTheme===theme.id&&<Check/>}</button>)}</div></section></div>}
  </header>;
}

export function MainNavigation({ active, onNavigate, onParentArea, parentPreviewUnlocked = false }: { active: DashboardViewKey; onNavigate: (view: DashboardViewKey) => void; onParentArea: () => void; parentPreviewUnlocked?: boolean }) {
  const items: Array<{ id: DashboardViewKey | 'parent-login'; label: string; icon: React.ReactNode; nav3d?: string; action: () => void }> = [
    { id: 'home', label: '首頁', icon: <Home/>, nav3d: 'home-3d-96', action: () => onNavigate('home') },
    { id: 'semester', label: '學習日曆', icon: <CalendarDays/>, nav3d: 'calendar-3d-96', action: () => onNavigate('semester') },
    { id: 'achievements', label: '成就獎勵', icon: <Award/>, nav3d: 'star-3d-96', action: () => onNavigate('achievements') },
    { id: 'shop', label: '寶物商店', icon: <ShoppingBag/>, nav3d: 'chest-3d-96', action: () => onNavigate('shop') },
    ...(parentPreviewUnlocked ? [
      { id: 'report' as const, label: '學習報表', icon: <BarChart3/>, nav3d: 'chart-3d-96', action: () => onNavigate('report') },
      { id: 'settings' as const, label: '家庭管理中心', icon: <Settings/>, action: () => onNavigate('settings') },
    ] : [{ id: 'parent-login' as const, label: '家長登入', icon: <ShieldCheck/>, action: onParentArea }]),
  ];
  const selected = active === 'today' ? 'home' : active;
  return <nav className="v4-main-navigation v652-main-navigation" data-parent-unlocked={parentPreviewUnlocked} aria-label="主要功能" style={{'--navigation-count':items.length} as React.CSSProperties}>{items.map(item => <button key={item.id} type="button" data-navigation={item.id} className={selected === item.id ? 'active' : ''} aria-current={selected === item.id ? 'page' : undefined} onClick={item.action}>
    <span className="v652-nav-art">{item.nav3d ? <><img src={`${import.meta.env.BASE_URL}assets/v5/nav-icons/${item.nav3d}.webp`} alt="" width={40} height={40} onError={event => {event.currentTarget.style.display='none'; const fallback=event.currentTarget.nextElementSibling as HTMLElement|null;if(fallback)fallback.style.display='grid';}}/><span className="v65-nav-svg-fallback"><GameIcon tone={item.id === 'shop' ? 'gold' : 'blue'}>{item.icon}</GameIcon></span></> : <GameIcon tone="purple">{item.icon}</GameIcon>}</span><span>{item.label}</span>
  </button>)}</nav>;
}

function PlayerProfile({ settings, progress }: { settings: AppSettings; progress: AppProgress }) {
  const learners = settings.children.filter((child) => !child.disabled);
  const [reactingChildId, setReactingChildId] = useState<string | null>(null);
  const reactionTimer = useRef<number | null>(null);
  const lastReactionAt = useRef(0);
  useEffect(() => () => { if (reactionTimer.current !== null) window.clearTimeout(reactionTimer.current); }, []);
  const reactToChild = (childId: string) => {
    const now = Date.now();
    if (now - lastReactionAt.current < 1000) return;
    lastReactionAt.current = now;
    setReactingChildId(childId);
    if (reactionTimer.current !== null) window.clearTimeout(reactionTimer.current);
    reactionTimer.current = window.setTimeout(() => setReactingChildId(null), 760);
  };
  const familyXp = learners.reduce((total, child) => total + playerResources(progress[child.id]).xp, 0);
  const familyLevel = Math.max(1, Math.floor(familyXp / 440) + 1);
  const nextFamilyXp = familyLevel * 440;
  const familyPct = Math.min(100, Math.round((familyXp % 440) / 440 * 100));
  return <section className="v4-panel v4-player-profile"><div className="v4-panel-title"><div><span>PLAYER TEAM</span><h2>冒險隊伍</h2></div><span className="v65-team-crest" role="img" aria-label="小小探險隊隊徽"><ShieldCheck/><i><Star/></i></span></div>
    <section className="v53-family-level" aria-label={`全家共同冒險進度，家庭等級 ${familyLevel}`}><Sparkles/><div><span>全家共同冒險進度</span><strong>家庭 Lv.{familyLevel}</strong><small>全家合計 {familyXp.toLocaleString()} / {nextFamilyXp.toLocaleString()} XP</small><i><b style={{width:`${familyPct}%`}}/></i></div></section>
    <div className="v6-player-roster-meta"><strong>{learners.length} 位學習者</strong><span>{learners.length > 4 ? '捲動查看全部成員' : '每位獨立記錄進度'}</span></div>
    <div className={`v4-player-stack ${learners.length > 4 ? 'is-scrollable' : ''}`} aria-label={`學習者名單，共 ${learners.length} 位`}>{learners.map((child) => {
      const resources = playerResources(progress[child.id]);
      const next = xpToNextLevel(resources.xp);
      const pct = resources.level >= 15 ? 100 : Math.min(100, Math.round(((resources.xp % 220) / 220) * 100));
      const reacting = reactingChildId === child.id;
      return <article className={`v4-player-card ${reacting ? 'v64-character-reacting' : ''}`} key={child.id} data-character-reaction={reacting ? 'playing' : 'resting'}>
        <button type="button" className="v4-player-avatar v64-player-reactor" onClick={() => reactToChild(child.id)} aria-label={`和${child.name}打招呼`}><AvatarHero avatarId={child.avatar} xp={resources.xp} equippedCosmetics={progress[child.id]?.equippedCosmetics} size={90} greet/><span>Lv.{resources.level}</span></button>
        <div className="v4-player-copy"><h3 title={child.name}>{child.name}</h3><p>{levelTitle(resources.level)}</p><div className="v4-xp-track"><i style={{width:`${pct}%`}}/></div><small className={reacting ? 'v64-reaction-copy active' : 'v64-reaction-copy'} aria-live="polite">{reacting ? '✨ 一起出發！' : next ? `下一級還差 ${next} XP` : '已達 Lv.15 傳奇英雄'}</small></div>
        <div className="v4-resource-row" aria-label={`${child.name} 的冒險資源`}><span title="XP"><Zap/> {resources.xp}</span><span title="Coins"><Coins/> {resources.coins}</span><span title="Stars"><Star/> {resources.stars}</span><span title="Gems"><Gem/> {resources.gems}</span></div>
      </article>;
    })}</div>
  </section>;
}

function AICompanion({ todayDay, isDayDone, equippedCosmetics }: { todayDay?: CourseDay; isDayDone: (day: CourseDay) => boolean; equippedCosmetics?: string[] }) {
  const text = !todayDay ? '下一個冒險日還沒到，我會幫你守住基地！' : isDayDone(todayDay) ? '今天任務全部完成！明天再一起出發。' : '今天有新的冒險喔！兩堂課都在任務區等你。';
  const [reacting, setReacting] = useState(false);
  const reactionTimer = useRef<number | null>(null);
  const lastReactionAt = useRef(0);
  useEffect(() => () => { if (reactionTimer.current !== null) window.clearTimeout(reactionTimer.current); }, []);
  const speak = () => {
    const now = Date.now();
    const startsReaction = now - lastReactionAt.current >= 1000;
    if (startsReaction) {
      lastReactionAt.current = now;
      setReacting(true);
      if (reactionTimer.current !== null) window.clearTimeout(reactionTimer.current);
      reactionTimer.current = window.setTimeout(() => setReacting(false), 760);
    }
    if (!('speechSynthesis' in window)) return;
    const spokenText = startsReaction ? '一起出發！' : text;
    // Visible feedback must commit even when a device TTS implementation is slow.
    // Run speech in a later task instead of blocking React's click-state paint.
    window.setTimeout(() => {
      cancelEnglishSpeech();
      const u = new SpeechSynthesisUtterance(spokenText);
      u.lang = 'zh-TW';
      window.speechSynthesis.speak(u);
    }, 0);
  };
  const mood = !todayDay ? 'guard' : isDayDone(todayDay) ? 'celebrate' : 'ready';
  const room = equippedCosmeticForSlot(equippedCosmetics, 'room');
  const robot = equippedCosmeticForSlot(equippedCosmetics, 'robot');
  return <section className={`v4-panel v4-ai-companion mood-${mood} ${reacting?'v64-companion-reacting':''} ${room?'has-mounted-room':''} ${robot?'has-mounted-robot':''}`} data-room={room?.id ?? 'base'} data-companion-reaction={reacting ? 'playing' : 'resting'}><button type="button" className="v4-ai-bot v5-ai-bot" onClick={speak} aria-label="請小光說出今天的提示">{robot?<WorldDisplayImage itemId={robot.id} slot="robot" className="v6-ai-robot-art" fallback={cosmeticAssetPath(robot)} alt={`${robot.name}小光造型`}/>:<AnimatedMedia webm={`${import.meta.env.BASE_URL}assets/v5/animations/robot-idle.webm`} poster={`${import.meta.env.BASE_URL}assets/v5/animations/robot-idle-poster.webp`} alt="AI 學習夥伴小光" size={512} fitContainer deferPlayback deferUntilNearViewport/>}</button><div><h3>小光</h3><p aria-live="polite">{reacting ? '一起出發！我會陪你完成今天的冒險。' : text}</p><small className="v5-ai-hint">{reacting ? '收到！準備出發' : robot?`已裝備 ${robot.name}`:'點小光聽提示'}</small></div></section>;
}

function SemesterCalendar({ settings, trustedDate, courseDateKey, accessForDay, isDayDone }: Pick<DashboardProps,'settings'|'trustedDate'|'courseDateKey'|'accessForDay'|'isDayDone'>) {
  const semester = resolveSemester(settings);
  const curriculum = semester.days;
  const exactIndex = curriculum.findIndex((day) => courseDateKey(day) === trustedDate.ymd);
  const nextIndex = curriculum.findIndex((day) => courseDateKey(day) >= trustedDate.ymd);
  const priorIndex = curriculum.reduce((latest, day, index) => courseDateKey(day) <= trustedDate.ymd ? index : latest, -1);
  const focusIndex = exactIndex >= 0 ? exactIndex : nextIndex >= 0 ? nextIndex : Math.max(0, priorIndex);
  const start = Math.max(0, Math.min(curriculum.length - 15, focusIndex - (focusIndex % 5) - 5));
  const visible = curriculum.slice(start, start + 15);
  return <div className="v4-calendar-inner"><div className="v4-panel-title"><div><span>SEMESTER MAP</span><h2>學期日曆</h2><small>{semester.label}</small></div><div className="v4-calendar-legend"><i className="done"/>完成<i className="today"/>今天<i className="lock"/>鎖定</div></div>
    <div className="v4-calendar-weekdays"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span></div>
    <div className="v4-calendar-grid v5-grid-15">{visible.map((day) => {
      const access = accessForDay(day); const done = isDayDone(day); const special = easterEggDays.has(day.index); const date = courseDateKey(day);
      const status = done ? 'done' : access === 'today' ? 'today' : access === 'future' ? 'locked' : 'missed';
      return <div key={day.id} className={`v4-calendar-day ${status} ${special ? 'special' : ''}`} title={`Day ${day.index} · ${formatTaipeiCourseDate(date)}`}><span>{date.slice(5).replace('-','/')}</span><strong>D{day.index}</strong><i>{done ? <Check/> : access === 'today' ? <Rocket/> : access === 'future' ? <Lock/> : <Star/>}</i>{special && <b><Gift/></b>}</div>;
    })}</div>
  </div>;
}

function WeeklyProgress({ settings, anchorDay, isDayDone }: { settings: AppSettings; anchorDay: CourseDay; isDayDone: (day: CourseDay) => boolean }) {
  const curriculum = resolveSemester(settings).days;
  const week = anchorDay.week;
  const days = curriculum.filter((day) => day.week === week);
  const completed = days.filter(isDayDone).length;
  const pct = days.length ? completed / days.length * 100 : 0;
  const semesterDone = curriculum.filter(isDayDone).length;
  return <div className="v4-progress-inner"><div className="v4-panel-title"><div><span>WEEK {String(week).padStart(2,'0')}</span><h2>本週進度</h2></div></div><AnimatedMedia className="v53-weekly-rocket" webm={`${import.meta.env.BASE_URL}assets/v5/animations/weekly-rocket-robot.webm`} poster={`${import.meta.env.BASE_URL}assets/v6.4/brand-display/weekly-rocket-robot-384.webp`} posterFallback={`${import.meta.env.BASE_URL}assets/v5/brand/weekly-rocket-robot.webp`} alt="小光搭著火箭陪伴本週學習" size={512} deferPlayback deferUntilNearViewport/>
    <div className="v4-progress-body v5-weekly-body"><div className="v4-progress-ring" style={{'--progress':`${pct * 3.6}deg`,width:118,height:118} as React.CSSProperties}><div><strong style={{fontSize:30}}>{completed} / {days.length}</strong><span>完成</span></div></div><div className="v4-goals v5-goals"><div className={semesterDone >= 5 ? 'done' : ''}><Trophy size={26}/><span>小目標</span><strong>5 天</strong></div><div className={semesterDone >= 10 ? 'done' : ''}><Trophy size={26}/><span>中目標</span><strong>10 天</strong></div><div className={semesterDone >= curriculum.length ? 'done' : ''}><Trophy size={26}/><span>大目標</span><strong>{curriculum.length} 天</strong></div></div></div>
  </div>;
}

function SemesterOverviewPanel({ settings, trustedDate, courseDateKey, accessForDay, isDayDone, featuredDay }: Pick<DashboardProps,'settings'|'trustedDate'|'courseDateKey'|'accessForDay'|'isDayDone'|'featuredDay'>) {
  return <section className="v4-panel v5-semester-overview"><div className="v5-semester-calendar-lane"><SemesterCalendar settings={settings} trustedDate={trustedDate} courseDateKey={courseDateKey} accessForDay={accessForDay} isDayDone={isDayDone} /></div><div className="v5-weekly-progress-lane"><WeeklyProgress settings={settings} anchorDay={featuredDay} isDayDone={isDayDone} /></div></section>;
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
  return <section className="v4-panel v4-badge-panel"><div className="v4-panel-title"><div><h2>成就徽章</h2></div><button className="v4-text-action" onClick={()=>onNavigate('achievements')}>全部查看 <ChevronRight/></button></div><div className="v4-badge-shelf">{badges.slice(0,8).map((badge)=><GameBadge key={badge.id} badge={badge} unlocked={Boolean(unlocks[badge.id])} earnedDate={unlocks[badge.id]} size={72} label={false} displaySizes="(max-width:1479px) 66px, calc(clamp(118px, 4.4vw, 156px) - 26px)"/>)}</div></section>;
}

function LessonMissionCard({ cardId, day, lessonIndex, access, verified, done, parentPreviewUnlocked, onOpen, onRequestParent }: { cardId?: string; day: CourseDay; lessonIndex: 0|1; access: CourseDayAccess; verified: boolean; done: boolean; parentPreviewUnlocked: boolean; onOpen: () => void; onRequestParent: () => void }) {
  const [coverUnavailable, setCoverUnavailable] = useState(false);
  const collectible = equippedCosmeticForSlot(cardId ? [cardId] : [], 'card');
  const collectiblePath = collectible ? cardFrameAssetPath(collectible.id) : undefined;
  const block = day.blocks[lessonIndex]; const formal = access === 'today' && verified;
  const fullPreview = parentPreviewUnlocked && !formal;
  const childTeaser = !formal && !fullPreview;
  const canOpenLesson = formal || fullPreview;
  const action = done ? (canOpenLesson ? '查看內容' : '查看成果') : formal ? '開始挑戰' : fullPreview ? '完整備課' : '查看主題';
  const status = done ? '已完成' : formal ? '今日挑戰' : fullPreview ? '家長備課' : '明日驚喜';
  const clock = lessonIndex === 0 ? '18:30–19:00' : '19:05–19:35';
  const click = canOpenLesson ? onOpen : onRequestParent;
  return <article data-collectible-card={collectible?.id} className={`v4-lesson-card ${collectiblePath ? 'has-collectible-card' : ''} ${done ? 'done' : ''} ${formal ? '' : 'preview'}`}>
    <header className="v5-lesson-card-header"><strong><Star/> 第 {lessonIndex + 1} 節</strong><span>{clock}</span>{collectible && collectiblePath && <WorldDisplayImage itemId={collectible.id} slot="card" fallback={collectiblePath} className="v653-lesson-collectible" alt={`${collectible.name}收藏卡`}/>}</header>
    <div className="v5-lesson-card-body"><div className="v4-lesson-thumb"><GameImage src={childTeaser ? `${import.meta.env.BASE_URL}assets/v5/vocab/rocket.webp` : youtubeThumb(block.video.videoId)} alt={childTeaser ? `${day.theme} 主題預告` : `${block.video.title} 影片封面`} fallbackLabel="影片封面暫時無法載入，仍可開啟課程" showFallbackLabel={false} onFallbackChange={setCoverUnavailable} deferUntilNearViewport/>{!formal && <i><BookOpen/></i>}</div>
      <div className="v4-lesson-content"><div className="v4-lesson-meta"><span>{childTeaser ? 'Adventure' : subjectLabel(block.subject)}</span><small>{status}</small></div><h3>{childTeaser ? `${day.theme} 冒險預告` : block.title}</h3>{(formal || fullPreview) ? <div className="v5-song-info"><small className="v5-song-label">課前歌曲</small><span className="v5-song-name">{block.warmup.title}</span></div> : <p>明日主題：{day.theme}</p>}{coverUnavailable && <div className="v64-image-fallback-label v653-lesson-cover-status" role="status">影片封面暫時無法載入，仍可開啟課程</div>}<button onClick={click}>{done ? <><Check/> {action}</> : formal ? <><Play/> {action} <ChevronRight/></> : <><BookOpen/> {action} <ChevronRight/></>}</button></div>
    </div>
  </article>;
}

function TreasureChest({ day, settings, progress, isChildDayDone, access, verified, onClaimTreasure }: { day: CourseDay; settings: AppSettings; progress: AppProgress; isChildDayDone: (childId: string, day: CourseDay) => boolean; access: CourseDayAccess; verified: boolean; onClaimTreasure: (childId: string, day: CourseDay) => void }) {
  const [openingChildId, setOpeningChildId] = useState<string | null>(null);
  const [animateOpening, setAnimateOpening] = useState(true);
  const openingVisual = useRef<HTMLDivElement>(null);
  const openingSkip = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (!openingChildId || !animateOpening) return;
    // Keep this user-triggered moment visible, and give keyboard users a way
    // to continue while the learner buttons are temporarily disabled.
    openingSkip.current?.focus({ preventScroll: true });
    openingVisual.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, [openingChildId, animateOpening]);
  const pendingOpening = useRef<{ childId: string; day: CourseDay } | null>(null);
  const claimTreasure = useRef(onClaimTreasure);
  useEffect(() => { claimTreasure.current = onClaimTreasure; }, [onClaimTreasure]);
  const finishOpen = useCallback(() => {
    const pending = pendingOpening.current;
    if (!pending) return;
    pendingOpening.current = null;
    setOpeningChildId(null);
    claimTreasure.current(pending.childId, pending.day);
  }, []);
  useEffect(() => {
    if (!openingChildId) return;
    // Normally show the complete two-second clip. A failed or slow download
    // must still allow the reward within a short, bounded wait.
    const timer = window.setTimeout(finishOpen, animateOpening ? 2500 : 120);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = () => { if (motion.matches) finishOpen(); };
    motion.addEventListener('change', onMotionChange);
    return () => { window.clearTimeout(timer); motion.removeEventListener('change', onMotionChange); };
  }, [openingChildId, animateOpening, finishOpen]);
  useEffect(() => () => { pendingOpening.current = null; }, []);
  const treasureDay = easterEggDays.has(day.index);
  const nextTreasure = [...easterEggDays].find((index) => index >= day.index) ?? 90;
  const learners = settings.children.filter((child)=>!child.disabled);
  const beginOpen = (childId: string) => {
    if (pendingOpening.current) return;
    // Prepare the existing lazy reward dialog while the opening clip plays.
    void import('./RewardModal').catch(() => {});
    pendingOpening.current = { childId, day };
    setAnimateOpening(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setOpeningChildId(childId);
  };
  return <section className={`v4-treasure-chest ${openingChildId ? 'is-opening' : ''} ${treasureDay ? 'treasure-day' : 'teaser'}`}>
    <div ref={openingVisual} className={`v4-chest-visual ${openingChildId ? 'is-opening' : ''}`} aria-hidden="true">{openingChildId && animateOpening ? <AnimatedMedia webm={`${import.meta.env.BASE_URL}assets/v5/rewards/treasure-open.webm`} poster={`${import.meta.env.BASE_URL}assets/v5/rewards/treasure-open-poster.webp`} alt="寶箱打開" size={512} loop={false} onEnded={finishOpen} onPlaybackError={finishOpen}/> : <GameImage src={`${import.meta.env.BASE_URL}assets/v5/nav-icons/chest-3d.webp`} alt="冒險寶箱" deferUntilNearViewport/>}</div>
    <div className="v4-chest-copy"><span>HIDDEN REWARD</span><h3>{treasureDay ? '完成兩堂課，打開冒險寶箱' : `神秘獎勵藏在 Day ${nextTreasure}`}</h3><p>{treasureDay ? '寶箱獎勵每個孩子各自只能領一次。' : '探索更多天，發現神秘獎勵！'}</p></div>
    {openingChildId && <button ref={openingSkip} type="button" className="v64-chest-skip" onClick={finishOpen}>略過開箱動畫，領取獎勵</button>}
    {treasureDay && <div className="v4-chest-learners">{learners.map((child)=>{ const done=isChildDayDone(child.id,day); const claimed=progress[child.id]?.claimedEggs?.includes(courseEggId(day))??false; const canOpen=verified&&access==='today'&&done&&!claimed; const opening=openingChildId===child.id; return <button key={child.id} disabled={!canOpen||Boolean(openingChildId)} className={claimed?'claimed':opening?'opening':canOpen?'ready':'locked'} onClick={()=>beginOpen(child.id)}><AvatarHero avatarId={child.avatar} xp={calculateRewards(progress[child.id]).xp} equippedCosmetics={progress[child.id]?.equippedCosmetics} size={42}/><span>{child.name}</span><strong>{claimed?'已開啟':opening?'開箱中…':done?'開寶箱':'完成兩堂後解鎖'}</strong>{claimed?<Check/>:opening?<Sparkles/>:canOpen?<Sparkles/>:<Lock/>}</button>; })}</div>}
  </section>;
}

function DailyMissionPanel({ participantIds, onSelectParticipant, settings, progress, trustedDate, todayDay, featuredDay, courseDateKey, accessForDay, isChildDayDone, onOpenLesson, onClaimTreasure, parentPreviewUnlocked, onParentArea, onNavigate, displayLearnerId }: Pick<DashboardProps,'participantIds'|'onSelectParticipant'|'settings'|'progress'|'trustedDate'|'todayDay'|'featuredDay'|'courseDateKey'|'accessForDay'|'isChildDayDone'|'onOpenLesson'|'onClaimTreasure'|'parentPreviewUnlocked'|'onParentArea'|'onNavigate'> & { displayLearnerId?: string }) {
  const activeLearners = settings.children.filter(child => !child.disabled);
  const lead = activeLearners.find(child => child.id === displayLearnerId) ?? activeLearners[0];
  const cardId = equippedCosmeticForSlot(lead ? progress[lead.id]?.equippedCosmetics ?? [] : [], 'card')?.id;
  const day = todayDay ?? featuredDay; const access = accessForDay(day); const date = trustedDate.ymd;
  const weekday = new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',weekday:'short'}).format(new Date(`${date}T12:00:00+08:00`));
  const adventureDate = formatTaipeiCourseDate(courseDateKey(day));
  const selectedIds = participantIds(day);
  const lessonDone = ([0, 1] as const).map(index => selectedIds.length > 0 && selectedIds.every(id => progress[id]?.completedBlocks.includes(day.blocks[index].id)));
  const completedLessons = lessonDone.filter(Boolean).length;
  const formalToday = Boolean(todayDay) && trustedDate.verified && access === 'today';
  const allDone = completedLessons === 2;
  const nextLessonIndex: 0 | 1 = lessonDone[0] ? 1 : 0;
  const primaryActionKind = !formalToday ? 'next-adventure' : allDone ? 'rewards' : completedLessons > 0 ? 'resume' : 'start';
  const primaryLabel = !formalToday ? '看看下一次冒險' : allDone ? '看看今天的收穫' : completedLessons > 0 ? `繼續第 ${nextLessonIndex + 1} 節` : '開始今天的冒險';
  const handlePrimaryAction = () => {
    if (!formalToday) { onNavigate('semester'); return; }
    if (!selectedIds.length) {
      const target = document.querySelector<HTMLInputElement>('.v64-daily-participants input:not(:disabled)');
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      window.setTimeout(() => target?.focus({ preventScroll: true }), 180);
      return;
    }
    if (allDone) { onNavigate('achievements'); return; }
    onOpenLesson(day, nextLessonIndex);
  };
  return <section id="today-course" tabIndex={-1} className="v4-panel v4-daily-panel"><div className="v53-date-strip"><span>今天・{Number(date.slice(5,7))}月{Number(date.slice(8,10))}日</span><i>{weekday}</i><strong>{todayDay ? `Day ${day.index}` : '今天沒有正式課'}</strong></div>
    <div className="v64-home-primary-action"><button type="button" className="v64-home-primary-cta" data-home-primary-action={primaryActionKind} onClick={handlePrimaryAction}><span className="v653-action-emblem" aria-hidden="true">{primaryActionKind === 'rewards' ? <Trophy/> : primaryActionKind === 'next-adventure' ? <CalendarDays/> : <Rocket/>}</span><span className="v653-action-label">{primaryLabel}</span><ChevronRight aria-hidden="true"/></button><small>{formalToday ? selectedIds.length ? allDone ? '兩堂都完成了，去看看今天累積的成果。' : `今天 ${selectedIds.length} 位孩子一起冒險。` : '先勾選今天一起上課的孩子，再從這裡出發。' : `${adventureDate} · Day ${day.index}`}</small></div>
    <div className="v4-daily-head v652-mission-brief"><div><span>{todayDay ? '今天的冒險 · TODAY' : '下一次冒險 · NEXT'}</span><h2>{day.title}</h2>{!todayDay && <strong className="v4-next-adventure-date">{adventureDate} · Day {day.index}</strong>}<p>{day.bigIdea}</p></div><img className="v5-daily-mission-art" src={`${import.meta.env.BASE_URL}assets/v6.5/display/rocket-flyby-poster-384.webp`} alt="" onError={(event)=>{ if (!event.currentTarget.src.includes('/v5/animations/rocket-flyby-poster.webp')) event.currentTarget.src=`${import.meta.env.BASE_URL}assets/v5/animations/rocket-flyby-poster.webp`; }} /></div>
    <ol className="v652-daily-route" aria-label="今天的學習路徑">
      {(['第一堂', '第二堂', '今日收穫'] as const).map((label, index) => <li key={label} className={(index < 2 ? lessonDone[index] : allDone) ? 'is-complete' : ''}><span aria-hidden="true">{index === 2 ? <Trophy size={16}/> : index + 1}</span><strong>{label}</strong>{(index < 2 ? lessonDone[index] : allDone) && <small>完成</small>}</li>)}
    </ol>
    <p className="v652-learning-pause">{allDone ? '今天的努力已留下紀錄，休息一下，明天再出發！' : '一堂一小步，慢慢長大。中場記得喝水、動一動。'}</p>
    <DailyParticipants children={settings.children} selectedIds={selectedIds} editable={trustedDate.verified && access === 'today'} onChange={(id, selected) => onSelectParticipant(day, id, selected)} />
    <div className="v4-daily-progress"><div><span>{todayDay ? '今日完成' : '下一次課程'}</span><strong>{completedLessons} / 2</strong></div><div className="v4-mini-track"><i style={{width:`${completedLessons * 50}%`}}/></div></div>
    <div className="v4-lesson-list">{([0,1] as const).map((index)=> <LessonMissionCard cardId={cardId} key={day.blocks[index].id} day={day} lessonIndex={index} access={access} verified={trustedDate.verified} done={selectedIds.length > 0 && selectedIds.every(id => progress[id]?.completedBlocks.includes(day.blocks[index].id))} parentPreviewUnlocked={parentPreviewUnlocked} onOpen={()=>onOpenLesson(day,index)} onRequestParent={onParentArea}/>)}</div>
    <TreasureChest day={day} settings={settings} progress={progress} isChildDayDone={isChildDayDone} access={access} verified={trustedDate.verified} onClaimTreasure={onClaimTreasure}/>
    {(!trustedDate.verified || access !== 'today') && <div className="v4-lock-note"><BookOpen/> {parentPreviewUnlocked ? '家長備課已解鎖：可完整查看，但仍不會寫入獎勵。' : '孩子先看明日主題；完整備課內容需由家長 PIN 解鎖。'}</div>}
  </section>;
}

export function BottomStatusBar({ trustedDate, cloudStatus }: { cloudStatus: string; trustedDate: TrustedTaipeiDate }) {
  return <footer className="v4-status-bar"><span><Cloud/>{cloudStatusLabel(cloudStatus)}</span><span><ShieldCheck/>{trustedDate.verified ? '今日日期已確認' : '日期未確認 · 安全預覽'}</span><span><Video/>完整教案與影片</span><strong>下一關，就比上一關更厲害。</strong><small>Version V{APP_VERSION} · Updated {APP_UPDATED_AT}</small></footer>;
}

export default function AdventureDashboard(props: DashboardProps) {
  const [homeGreetingActive, setHomeGreetingActive] = useState(false);
  const [compactHome, setCompactHome] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 899px)').matches);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 899px)');
    const sync = () => {
      setCompactHome(media.matches);
      if (!media.matches) setOverviewExpanded(false);
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    const key = 'little-explorers-v64-home-greeting-at';
    const now = Date.now();
    const last = Number(window.sessionStorage.getItem(key) ?? '0');
    if (now - last < 5 * 60 * 1000) return;
    if (props.settings.motionEffects === false || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setHomeGreetingActive(true);
    // Record the greeting only after it completes. React StrictMode performs a
    // setup/cleanup/setup cycle in development; recording before the timer
    // finished let the first cleanup cancel the timer while the second setup
    // treated the unfinished greeting as already played, leaving it stuck.
    const timer = window.setTimeout(() => {
      setHomeGreetingActive(false);
      window.sessionStorage.setItem(key, String(Date.now()));
    }, 520);
    return () => window.clearTimeout(timer);
  }, []);
  const activeHomeLearners = props.settings.children.filter((child) => !child.disabled);
  const leadLearner = activeHomeLearners.find((child) => child.id === props.settings.homeDisplayLearnerId) ?? activeHomeLearners[0];
  const leadEquipment = leadLearner ? props.progress[leadLearner.id]?.equippedCosmetics ?? [] : [];
  const leadPet = equippedCosmeticForSlot(leadEquipment, 'pet');
  const leadRoom = equippedCosmeticForSlot(leadEquipment, 'room');
  const scene = useRoomScenePath(leadRoom?.id);
  const leadCard = equippedCosmeticForSlot(leadEquipment, 'card');
  const worldStyle = {
    '--equipped-room-scene': scene ? `url("${new URL(scene, window.location.href).href}")` : undefined,
    '--equipped-card-slice': leadCard && reviewedWorldAssetPath(leadCard.id, 'card') ? '12% 10%' : '112',
  } as React.CSSProperties;
  const worldItemClasses = leadEquipment
    .filter((id) => /^(ship|room|robot|card|effect|pet)-/.test(id))
    .map((id) => `has-${id}`)
    .join(' ');
  return <div className={`v4-shell ${worldItemClasses}`} data-world-items={worldItemClasses} style={worldStyle}>
    <ThemePointer surface="home" enabled={props.settings.cursorEffects !== false} />
    {leadRoom && <div className={`v64-room-ambient ${leadRoom.id}`} aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</div>}
    {scene && <link rel="preload" as="image" href={scene} fetchPriority="high" />}
    <AdventureHeader settings={props.settings} progress={props.progress} onThemeChange={props.onThemeChange} soundEnabled={props.soundEnabled} onToggleSound={props.onToggleSound} activeUser={props.activeUser} parentPreviewUnlocked={props.parentPreviewUnlocked} onParentArea={props.onParentArea} onParentLogout={() => props.onNavigate('parent-logout')} homeGreetingActive={homeGreetingActive} displayLearnerId={leadLearner?.id}/>
    <MainNavigation active={props.activeView} onNavigate={props.onNavigate} onParentArea={props.onParentArea} parentPreviewUnlocked={props.parentPreviewUnlocked}/>
    {leadLearner && <section className="v65-home-display-selector" aria-label="首頁冒險世界展示孩子">
      <div><span>首頁冒險世界</span><strong>選擇展示孩子</strong></div>
      <div role="group" aria-label="選擇首頁展示孩子">{activeHomeLearners.map((learner) => <button type="button" key={learner.id} aria-pressed={learner.id === leadLearner.id} className={learner.id === leadLearner.id ? 'active' : ''} onClick={() => props.onDisplayLearnerChange(learner.id)}><AvatarHero avatarId={learner.avatar} xp={playerResources(props.progress[learner.id]).xp} equippedCosmetics={props.progress[learner.id]?.equippedCosmetics} size={38}/><span>{learner.name}</span></button>)}</div>
      <small>僅切換首頁展示；不影響家長登入或今日上課名單。</small>
    </section>}
    <main className="v4-dashboard-grid">
      <section className="v4-right-column" aria-label="今天的冒險任務"><DailyMissionPanel participantIds={props.participantIds} onSelectParticipant={props.onSelectParticipant} settings={props.settings} progress={props.progress} trustedDate={props.trustedDate} todayDay={props.todayDay} featuredDay={props.featuredDay} courseDateKey={props.courseDateKey} accessForDay={props.accessForDay} isChildDayDone={props.isChildDayDone} onOpenLesson={props.onOpenLesson} onClaimTreasure={props.onClaimTreasure} parentPreviewUnlocked={props.parentPreviewUnlocked} onParentArea={props.onParentArea} onNavigate={props.onNavigate} displayLearnerId={leadLearner?.id}/></section>
      <aside className="v4-left-column" aria-label="冒險隊伍與小光"><PlayerProfile settings={props.settings} progress={props.progress}/><AICompanion todayDay={props.todayDay} isDayDone={props.isDayDone} equippedCosmetics={leadEquipment}/>{leadPet && <PetCompanion key={`${leadLearner?.id}:${leadPet.id}`} itemId={leadPet.id} learnerName={leadLearner?.name ?? ''}/>}</aside>
      <section className={`v4-center-column ${compactHome ? 'v64-compact-overview' : ''}`} aria-label="學期進度與成長">
        {compactHome && <button type="button" className="v64-overview-disclosure" aria-expanded={overviewExpanded} aria-controls="v64-home-overview-details" onClick={() => setOverviewExpanded((value) => !value)}><span><Sparkles/><strong>學期進度與角色成長</strong><small>{overviewExpanded ? '收起詳細內容，回到今日任務' : '需要時再展開日曆、角色成長與徽章'}</small></span><ChevronRight className={overviewExpanded ? 'expanded' : ''}/></button>}
        <div id="v64-home-overview-details" className="v64-overview-details" hidden={compactHome && !overviewExpanded}><SemesterOverviewPanel settings={props.settings} trustedDate={props.trustedDate} courseDateKey={props.courseDateKey} accessForDay={props.accessForDay} isDayDone={props.isDayDone} featuredDay={props.featuredDay}/><CharacterEvolution settings={props.settings} progress={props.progress}/><BadgeShelf settings={props.settings} progress={props.progress} onNavigate={props.onNavigate}/></div>
      </section>
    </main>
    <BottomStatusBar cloudStatus={props.cloudStatus} trustedDate={props.trustedDate}/>
  </div>;
}
