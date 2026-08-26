import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Coins,
  ExternalLink,
  GraduationCap,
  Monitor,
  Moon,
  PlayCircle,
  Plus,
  Rocket,
  Settings as SettingsIcon,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { curriculum, semesterStats, weekSummaries } from './data/curriculum';
import { youtubeChannelLinks } from './data/videos';
import type {
  AppProgress,
  AppSettings,
  ChildProfile,
  ChildProgress,
  CourseDay,
  LessonBlock,
  ThemeMode,
  VideoClip,
} from './types';

const SETTINGS_KEY = 'star-learning-settings-v1';
const PROGRESS_KEY = 'star-learning-progress-v1';
const ATTENDANCE_KEY = 'star-learning-attendance-v1';
const REFLECTION_KEY = 'star-learning-reflections-v1';

type ViewingStatus = 'full' | 'partial' | 'skip';
type DayReflection = {
  engagement: '' | 'great' | 'ok' | 'tired';
  note: string;
  viewing: Record<string, ViewingStatus>;
};

const emptyReflection = (): DayReflection => ({ engagement: '', note: '', viewing: {} });

const avatarOptions = ['🚀', '🦖', '🦈', '🤖', '🛸', '🐯', '🦁', '🚗', '🌟', '⚡'];

const defaultSettings: AppSettings = {
  theme: 'system',
  semesterStart: '2026-08-31',
  children: [
    { id: 'child-1', name: '哥哥', avatar: '🚀' },
    { id: 'child-2', name: '弟弟', avatar: '🦖' },
  ],
};

const emptyProgress = (): ChildProgress => ({
  xp: 0,
  coins: 0,
  completedDays: [],
  completedBlocks: [],
  completedMissions: [],
});

function safeLoad<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function parseYmd(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function ymd(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addCourseWeekdays(start: string, offset: number) {
  const date = parseYmd(start);
  let left = offset;
  while (left > 0) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) left -= 1;
  }
  return date;
}

function formatCourseDate(date: Date) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

function youtubeEmbedUrl(clip: VideoClip) {
  const params = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' });
  if (clip.start) params.set('start', String(clip.start));
  if (clip.end) params.set('end', String(clip.end));
  return `https://www.youtube-nocookie.com/embed/${clip.videoId}?${params.toString()}`;
}

function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="progress-track" aria-label={`進度 ${Math.round(pct)}%`}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function SubjectBadge({ subject }: { subject: LessonBlock['subject'] }) {
  const labels: Record<LessonBlock['subject'], string> = {
    English: 'English',
    Math: '數學',
    Zhuyin: 'ㄅㄆㄇ',
    Life: '生活',
    Science: '探索',
    Review: '複習',
  };
  return <span className={`subject-badge subject-${subject.toLowerCase()}`}>{labels[subject]}</span>;
}

function VideoPlayer({ clip, compact = false }: { clip: VideoClip; compact?: boolean }) {
  return (
    <div className={`video-card ${compact ? 'compact' : ''}`}>
      <div className="video-title-row">
        <div>
          <span className="eyebrow">{clip.channel}</span>
          <h4>{clip.title}</h4>
        </div>
        {clip.sourceUrl && (
          <a className="icon-button" href={clip.sourceUrl} target="_blank" rel="noreferrer" title="在 YouTube 開啟">
            <ExternalLink size={17} />
          </a>
        )}
      </div>
      <div className="video-frame-wrap">
        <iframe
          src={youtubeEmbedUrl(clip)}
          title={`${clip.channel} - ${clip.title}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  );
}

function App() {
  const [settings, setSettings] = useState<AppSettings>(() => safeLoad(SETTINGS_KEY, defaultSettings));
  const [progress, setProgress] = useState<AppProgress>(() => safeLoad(PROGRESS_KEY, {}));
  const [attendance, setAttendance] = useState<Record<string, string[]>>(() => safeLoad(ATTENDANCE_KEY, {}));
  const [reflections, setReflections] = useState<Record<string, DayReflection>>(() => safeLoad(REFLECTION_KEY, {}));
  const [view, setView] = useState<'home' | 'semester' | 'settings'>('home');
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  useEffect(() => {
    setProgress((current) => {
      const next = { ...current };
      let changed = false;
      settings.children.forEach((child) => {
        if (!next[child.id]) {
          next[child.id] = emptyProgress();
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [settings.children]);

  useEffect(() => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)), [progress]);
  useEffect(() => localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendance)), [attendance]);
  useEffect(() => localStorage.setItem(REFLECTION_KEY, JSON.stringify(reflections)), [reflections]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && media.matches);
      root.classList.toggle('dark', dark);
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [settings.theme]);

  const selectedDay = selectedDayId ? curriculum.find((day) => day.id === selectedDayId) ?? null : null;

  const participantIds = (day: CourseDay) => attendance[day.id] ?? settings.children.map((child) => child.id);

  const isChildBlockDone = (childId: string, blockId: string) =>
    Boolean(progress[childId]?.completedBlocks.includes(blockId));

  const isChildDayDone = (childId: string, day: CourseDay) =>
    day.blocks.every((block) => isChildBlockDone(childId, block.id));

  const isDayDone = (day: CourseDay) => {
    const ids = participantIds(day);
    return ids.length > 0 && ids.every((id) => isChildDayDone(id, day));
  };

  const completedDays = curriculum.filter(isDayDone).length;
  const completionPct = Math.round((completedDays / curriculum.length) * 100);

  const todayKey = ymd(new Date());
  const todayDay = curriculum.find((day) => ymd(addCourseWeekdays(settings.semesterStart, day.index - 1)) === todayKey);
  const nextDay = curriculum.find((day) => !isDayDone(day)) ?? curriculum[curriculum.length - 1];
  const featuredDay = todayDay ?? nextDay;

  const openDay = (day: CourseDay) => {
    setAttendance((current) => {
      if (current[day.id]) return current;
      return { ...current, [day.id]: settings.children.map((child) => child.id) };
    });
    setSelectedDayId(day.id);
  };

  const toggleAttendance = (day: CourseDay, childId: string) => {
    setAttendance((current) => {
      const currentIds = current[day.id] ?? settings.children.map((child) => child.id);
      if (currentIds.includes(childId) && currentIds.length === 1) return current;
      const nextIds = currentIds.includes(childId)
        ? currentIds.filter((id) => id !== childId)
        : [...currentIds, childId];
      return { ...current, [day.id]: nextIds };
    });
  };

  const toggleMission = (childId: string, mission: LessonBlock['missions'][number]) => {
    setProgress((current) => {
      const child = current[childId] ?? emptyProgress();
      const done = child.completedMissions.includes(mission.id);
      return {
        ...current,
        [childId]: {
          ...child,
          xp: Math.max(0, child.xp + (done ? -mission.xp : mission.xp)),
          coins: Math.max(0, child.coins + (done ? -mission.coins : mission.coins)),
          completedMissions: done
            ? child.completedMissions.filter((id) => id !== mission.id)
            : [...child.completedMissions, mission.id],
        },
      };
    });
  };

  const toggleBlock = (childId: string, day: CourseDay, block: LessonBlock) => {
    setProgress((current) => {
      const child = current[childId] ?? emptyProgress();
      const done = child.completedBlocks.includes(block.id);
      const nextBlocks = done
        ? child.completedBlocks.filter((id) => id !== block.id)
        : [...child.completedBlocks, block.id];
      const dayDone = day.blocks.every((b) => nextBlocks.includes(b.id));
      const nextDays = dayDone
        ? Array.from(new Set([...child.completedDays, day.id]))
        : child.completedDays.filter((id) => id !== day.id);
      return {
        ...current,
        [childId]: {
          ...child,
          xp: Math.max(0, child.xp + (done ? -15 : 15)),
          coins: Math.max(0, child.coins + (done ? -5 : 5)),
          completedBlocks: nextBlocks,
          completedDays: nextDays,
        },
      };
    });
  };

  const cycleTheme = () => {
    const order: ThemeMode[] = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(settings.theme) + 1) % order.length];
    setSettings((current) => ({ ...current, theme: next }));
  };

  if (selectedDay) {
    return (
      <DayView
        day={selectedDay}
        date={addCourseWeekdays(settings.semesterStart, selectedDay.index - 1)}
        settings={settings}
        progress={progress}
        participants={participantIds(selectedDay)}
        onBack={() => setSelectedDayId(null)}
        onToggleAttendance={(childId) => toggleAttendance(selectedDay, childId)}
        onToggleMission={toggleMission}
        onToggleBlock={(childId, block) => toggleBlock(childId, selectedDay, block)}
        reflection={reflections[selectedDay.id] ?? emptyReflection()}
        onUpdateReflection={(patch) => setReflections((current) => ({
          ...current,
          [selectedDay.id]: { ...(current[selectedDay.id] ?? emptyReflection()), ...patch },
        }))}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView('home')}>
          <span className="brand-mark"><Rocket size={21} /></span>
          <span><strong>星際共學基地</strong><small>Family Learning Mission</small></span>
        </button>
        <nav className="top-actions">
          <button className="nav-button" onClick={cycleTheme} title="切換顯示模式">
            {settings.theme === 'dark' ? <Moon size={18} /> : settings.theme === 'light' ? <Sun size={18} /> : <Monitor size={18} />}
          </button>
          <button className={`nav-button ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
            <SettingsIcon size={18} /><span>設定</span>
          </button>
        </nav>
      </header>

      <main>
        {view === 'home' && (
          <HomeView
            settings={settings}
            progress={progress}
            featuredDay={featuredDay}
            todayDay={todayDay}
            completedDays={completedDays}
            completionPct={completionPct}
            isDayDone={isDayDone}
            isChildDayDone={isChildDayDone}
            openDay={openDay}
            goSemester={() => setView('semester')}
          />
        )}
        {view === 'semester' && (
          <SemesterView
            settings={settings}
            isDayDone={isDayDone}
            openDay={openDay}
            goHome={() => setView('home')}
          />
        )}
        {view === 'settings' && (
          <SettingsView
            settings={settings}
            setSettings={setSettings}
            progress={progress}
            setProgress={setProgress}
            setAttendance={setAttendance}
            goHome={() => setView('home')}
          />
        )}
      </main>

      <footer className="footer">
        <div>
          <strong>教材來源</strong>
          {youtubeChannelLinks.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
          ))}
        </div>
        <div className="asset-credit">
          介面為原創設計；功能圖示採 <a href="https://lucide.dev/" target="_blank" rel="noreferrer">Lucide（ISC）</a>，火箭裝飾採 <a href="https://openmoji.org/" target="_blank" rel="noreferrer">OpenMoji</a>（<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>）。不使用蜘蛛人、寶可夢等受保護角色圖像。
        </div>
      </footer>
    </div>
  );
}

function HomeView({
  settings,
  progress,
  featuredDay,
  todayDay,
  completedDays,
  completionPct,
  isDayDone,
  isChildDayDone,
  openDay,
  goSemester,
}: {
  settings: AppSettings;
  progress: AppProgress;
  featuredDay: CourseDay;
  todayDay?: CourseDay;
  completedDays: number;
  completionPct: number;
  isDayDone: (day: CourseDay) => boolean;
  isChildDayDone: (childId: string, day: CourseDay) => boolean;
  openDay: (day: CourseDay) => void;
  goSemester: () => void;
}) {
  const level = Math.floor(completedDays / 10) + 1;
  const nextMilestone = Math.min(90, Math.ceil((completedDays + 1) / 10) * 10);

  return (
    <div className="page home-page">
      <section className="hero-card">
        <div className="hero-copy">
          <div className="pill"><Sparkles size={15} /> 18 週家庭共學任務</div>
          <h1>今晚不用備課，<br /><span>打開就能一起學。</span></h1>
          <p>影片只是素材；爸爸、媽媽或其他照顧者依照畫面教案暫停、複誦、回看、玩遊戲，兩個孩子可各自累積 XP 與金幣。</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => openDay(featuredDay)}>
              <PlayCircle size={20} /> {todayDay ? '開始今天課程' : `繼續 Day ${featuredDay.index}`}
            </button>
            <button className="secondary-button" onClick={goSemester}><BookOpen size={19} /> 看完整學期</button>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="planet planet-one" />
          <div className="planet planet-two" />
          <img src="https://openmoji.org/data/color/svg/1F680.svg" alt="" />
          <span className="floating-star star-a">★</span>
          <span className="floating-star star-b">✦</span>
          <span className="floating-star star-c">✧</span>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="mission-card today-card">
          <div className="card-heading">
            <div><span className="eyebrow">{todayDay ? 'TODAY MISSION' : 'NEXT MISSION'}</span><h2>{featuredDay.emoji} Day {featuredDay.index}｜{featuredDay.title}</h2></div>
            <span className="date-chip">{formatCourseDate(addCourseWeekdays(settings.semesterStart, featuredDay.index - 1))}</span>
          </div>
          <p>{featuredDay.bigIdea}</p>
          <div className="lesson-preview-row">
            {featuredDay.blocks.map((block, i) => (
              <div className="lesson-preview" key={block.id}>
                <span>第 {i + 1} 節 · 約 {block.duration} 分鐘</span>
                <strong>{block.title}</strong>
                <SubjectBadge subject={block.subject} />
              </div>
            ))}
          </div>
          <button className="primary-button full" onClick={() => openDay(featuredDay)}>進入教案 <ChevronRight size={18} /></button>
        </article>

        <article className="mission-card progress-card">
          <div className="card-heading"><div><span className="eyebrow">SEMESTER PROGRESS</span><h2>Level {level} 星際探索者</h2></div><Trophy size={28} /></div>
          <div className="big-number">{completionPct}<small>%</small></div>
          <ProgressBar value={completedDays} max={90} />
          <div className="progress-meta"><span>{completedDays} / 90 學習日</span><span>下一里程碑：{nextMilestone} 天</span></div>
          <div className="milestone-row">
            <div className={completedDays >= 5 ? 'reached' : ''}><Star size={17} /> 5 天</div>
            <div className={completedDays >= 30 ? 'reached' : ''}><Zap size={17} /> 30 天</div>
            <div className={completedDays >= 60 ? 'reached' : ''}><Rocket size={17} /> 60 天</div>
            <div className={completedDays >= 90 ? 'reached' : ''}><GraduationCap size={17} /> 90 天</div>
          </div>
        </article>
      </section>

      <section className="section-block">
        <div className="section-title"><div><span className="eyebrow">CREW STATUS</span><h2>小小探險隊</h2></div><span className="muted"><Users size={17} /> {settings.children.length} 位小朋友</span></div>
        <div className="children-grid">
          {settings.children.map((child) => {
            const childProgress = progress[child.id] ?? emptyProgress();
            const childDays = curriculum.filter((day) => isChildDayDone(child.id, day)).length;
            const childLevel = Math.floor(childProgress.xp / 250) + 1;
            return (
              <article className="child-card" key={child.id}>
                <div className="avatar-bubble">{child.avatar}</div>
                <div className="child-main"><span>LEVEL {childLevel}</span><h3>{child.name}</h3><ProgressBar value={childDays} max={90} /><small>完成 {childDays} 天</small></div>
                <div className="currency-stack"><span><Zap size={15} /> {childProgress.xp} XP</span><span><Coins size={15} /> {childProgress.coins}</span></div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <div><span className="eyebrow">SEMESTER CALENDAR</span><h2>學期日曆</h2></div>
          <button className="text-button" onClick={goSemester}>展開 18 週課程 <ChevronRight size={17} /></button>
        </div>
        <div className="calendar-shell">
          <div className="calendar-weekdays"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span></div>
          <div className="semester-calendar">
            {curriculum.map((day) => {
              const date = addCourseWeekdays(settings.semesterStart, day.index - 1);
              const done = isDayDone(day);
              const current = ymd(date) === ymd(new Date());
              return (
                <button key={day.id} className={`calendar-day ${done ? 'done' : ''} ${current ? 'today' : ''}`} onClick={() => openDay(day)} title={day.title}>
                  <span className="day-index">{day.index}</span>
                  <strong>{date.getDate()}</strong>
                  <small>W{day.week}</small>
                  {done ? <CheckCircle2 size={15} /> : <span className="day-emoji">{day.emoji}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function SemesterView({ settings, isDayDone, openDay, goHome }: {
  settings: AppSettings;
  isDayDone: (day: CourseDay) => boolean;
  openDay: (day: CourseDay) => void;
  goHome: () => void;
}) {
  return (
    <div className="page">
      <div className="page-heading">
        <button className="icon-button" onClick={goHome}><ArrowLeft size={19} /></button>
        <div><span className="eyebrow">FULL SEMESTER</span><h1>18 週完整學習地圖</h1><p>{semesterStats.days} 天 · {semesterStats.blocks} 節活動單元 · 約 {semesterStats.minutes / 60} 小時家庭共學</p></div>
      </div>
      <div className="week-list">
        {weekSummaries.map((week) => {
          const days = curriculum.filter((day) => day.week === week.week);
          const doneCount = days.filter(isDayDone).length;
          return (
            <section className="week-card" key={week.week}>
              <div className="week-head">
                <div className="week-number">W{String(week.week).padStart(2, '0')}</div>
                <div className="week-copy"><h2>{week.emoji} {week.title}</h2><p>{week.bigIdea}</p></div>
                <div className="week-progress"><strong>{doneCount}/5</strong><small>完成</small></div>
              </div>
              <div className="week-vocab">{week.vocab.slice(0, 7).map((word) => <span key={word}>{word}</span>)}</div>
              <div className="week-days">
                {days.map((day) => {
                  const date = addCourseWeekdays(settings.semesterStart, day.index - 1);
                  const done = isDayDone(day);
                  return (
                    <button key={day.id} onClick={() => openDay(day)} className={`week-day-button ${done ? 'done' : ''}`}>
                      <div><span>DAY {day.index}</span><strong>{day.title.split('｜')[1]}</strong><small>{formatCourseDate(date)}</small></div>
                      {done ? <CheckCircle2 size={21} /> : <ChevronRight size={20} />}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function DayView({
  day,
  date,
  settings,
  progress,
  participants,
  onBack,
  onToggleAttendance,
  onToggleMission,
  onToggleBlock,
  reflection,
  onUpdateReflection,
}: {
  day: CourseDay;
  date: Date;
  settings: AppSettings;
  progress: AppProgress;
  participants: string[];
  onBack: () => void;
  onToggleAttendance: (childId: string) => void;
  onToggleMission: (childId: string, mission: LessonBlock['missions'][number]) => void;
  onToggleBlock: (childId: string, block: LessonBlock) => void;
  reflection: DayReflection;
  onUpdateReflection: (patch: Partial<DayReflection>) => void;
}) {
  return (
    <div className="lesson-page">
      <header className="lesson-header">
        <button className="icon-button glass" onClick={onBack}><ArrowLeft size={20} /></button>
        <div className="lesson-header-copy">
          <span>WEEK {day.week} · DAY {day.index} · {formatCourseDate(date)}</span>
          <h1>{day.emoji} {day.title}</h1>
          <p>{day.bigIdea}</p>
        </div>
        <div className="mission-badge"><Rocket size={20} /> Mission {day.index}/90</div>
      </header>

      <main className="lesson-content">
        <section className="attendance-panel">
          <div><span className="eyebrow">TODAY'S CREW</span><h2>今天誰一起上課？</h2><p>可以每一天重新選擇參與的小朋友；各自累積 XP、金幣與完成紀錄。</p></div>
          <div className="attendance-chips">
            {settings.children.map((child) => {
              const active = participants.includes(child.id);
              return (
                <button key={child.id} className={`attendance-chip ${active ? 'active' : ''}`} onClick={() => onToggleAttendance(child.id)}>
                  <span>{child.avatar}</span><strong>{child.name}</strong>{active ? <Check size={17} /> : <Circle size={17} />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="caregiver-brief">
          <div className="brief-icon"><Users size={22} /></div>
          <div><span className="eyebrow">給第一次帶課的大人</span><h3>你不是按下播放就結束，而是今天的「節奏控制員」。</h3><p>孩子想說、想指、笑出來或開始分心時，都可以暫停。教案中的分鐘數只是導航，不是硬性倒數；45–60 分鐘完成核心任務就算成功。</p></div>
        </section>

        {day.blocks.map((block, blockIndex) => (
          <LessonBlockView
            key={block.id}
            block={block}
            blockIndex={blockIndex}
            day={day}
            settings={settings}
            progress={progress}
            participants={participants}
            onToggleMission={onToggleMission}
            onToggleBlock={onToggleBlock}
          />
        ))}

        <section className="bonus-card">
          <div className="bonus-icon">🎁</div>
          <div><span className="eyebrow">BONUS QUEST</span><h3>今日加碼任務</h3><p>{day.bonus}</p></div>
        </section>

        <ReflectionPanel day={day} reflection={reflection} onUpdate={onUpdateReflection} />
      </main>
    </div>
  );
}

function ReflectionPanel({ day, reflection, onUpdate }: { day: CourseDay; reflection: DayReflection; onUpdate: (patch: Partial<DayReflection>) => void }) {
  const viewingLabels: Record<ViewingStatus, string> = { full: '完整看', partial: '片段看', skip: '跳過' };
  const engagementOptions = [
    { value: 'great' as const, emoji: '🤩', label: '很投入' },
    { value: 'ok' as const, emoji: '🙂', label: '普通' },
    { value: 'tired' as const, emoji: '😴', label: '今天累了' },
  ];

  const setViewing = (blockId: string, status: ViewingStatus) => {
    onUpdate({ viewing: { ...reflection.viewing, [blockId]: status } });
  };

  return (
    <section className="reflection-card">
      <div className="panel-heading"><CalendarDays size={20} /><div><span className="eyebrow">30-SECOND LOG</span><h3>課後 30 秒紀錄</h3></div></div>
      <p className="reflection-help">不用寫教學日誌。留下今天實際看了多少、孩子投入程度與一句備註，就能保留真實上課軌跡。</p>
      <div className="viewing-log-grid">
        {day.blocks.map((block, index) => (
          <div className="viewing-log-row" key={block.id}>
            <strong>第 {index + 1} 節影片</strong>
            <div className="viewing-options">
              {(['full', 'partial', 'skip'] as ViewingStatus[]).map((status) => (
                <button key={status} className={reflection.viewing[block.id] === status ? 'active' : ''} onClick={() => setViewing(block.id, status)}>{viewingLabels[status]}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="engagement-row">
        {engagementOptions.map((option) => (
          <button key={option.value} className={reflection.engagement === option.value ? 'active' : ''} onClick={() => onUpdate({ engagement: option.value })}>
            <span>{option.emoji}</span>{option.label}
          </button>
        ))}
      </div>
      <textarea className="reflection-note" value={reflection.note} onChange={(e) => onUpdate({ note: e.target.value })} placeholder="可選填：今天最喜歡什麼？哪裡卡住？下次要注意什麼？" rows={3} />
    </section>
  );
}

function LessonBlockView({ block, blockIndex, day, settings, progress, participants, onToggleMission, onToggleBlock }: {
  block: LessonBlock;
  blockIndex: number;
  day: CourseDay;
  settings: AppSettings;
  progress: AppProgress;
  participants: string[];
  onToggleMission: (childId: string, mission: LessonBlock['missions'][number]) => void;
  onToggleBlock: (childId: string, block: LessonBlock) => void;
}) {
  return (
    <section className="lesson-block-card">
      <div className="block-heading">
        <div className="block-index">{blockIndex + 1}</div>
        <div className="block-title-copy"><span className="eyebrow">第 {blockIndex + 1} 節 · 約 {block.duration} 分鐘</span><h2>{block.title}</h2></div>
        <SubjectBadge subject={block.subject} />
      </div>

      <div className="lesson-media-grid">
        <VideoPlayer clip={block.warmup} compact />
        <VideoPlayer clip={block.video} />
      </div>

      <div className="vocab-panel">
        <div><span className="eyebrow">TODAY'S WORDS</span><h3>本節核心字</h3></div>
        <div className="word-cloud">{block.vocabulary.map((word) => <span key={word}>{word}</span>)}</div>
        <div className="sentence-chip"><span>句型</span><strong>{block.sentence}</strong></div>
      </div>

      <div className="guide-grid">
        <div className="timeline-panel">
          <div className="panel-heading"><BookOpen size={19} /><div><span className="eyebrow">CARETAKER SCRIPT</span><h3>照著做就能上課</h3></div></div>
          <div className="timeline">
            {block.steps.map((step, index) => (
              <div className="timeline-step" key={`${block.id}-${index}`}>
                <div className="time-dot"><span>{step.minute}</span></div>
                <div><h4>{step.title}</h4><p>{step.instruction}</p>{step.cue && <div className="pause-cue">⏸ 暫停提示：{step.cue}</div>}</div>
              </div>
            ))}
          </div>
        </div>

        <aside className="side-guide">
          <div className="tip-card"><span className="eyebrow">帶課提醒</span><p>{block.caregiverTip}</p></div>
          <div className="level-card"><div><span>4 歲／初階</span><p>{block.younger}</p></div><div><span>6 歲／進階</span><p>{block.older}</p></div></div>
        </aside>
      </div>

      <div className="interactive-section">
        <div className="panel-heading"><Zap size={20} /><div><span className="eyebrow">INTERACTIVE MISSIONS</span><h3>互動任務｜每個孩子各自得分</h3></div></div>
        <div className="mission-grid">
          {block.missions.map((mission) => (
            <article className="mini-mission" key={mission.id}>
              <div className="mission-top"><span className={`mission-kind kind-${mission.kind}`}>{mission.title}</span><span className="reward">+{mission.xp} XP · +{mission.coins} 🪙</span></div>
              <p>{mission.prompt}</p>
              <div className="mission-players">
                {settings.children.filter((child) => participants.includes(child.id)).map((child) => {
                  const done = progress[child.id]?.completedMissions.includes(mission.id) ?? false;
                  return (
                    <button key={child.id} className={`player-score ${done ? 'done' : ''}`} onClick={() => onToggleMission(child.id, mission)}>
                      <span>{child.avatar}</span>{child.name}{done ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="complete-row">
        <div><span className="eyebrow">FINISH THIS BLOCK</span><h3>本節完成紀錄</h3></div>
        <div className="complete-buttons">
          {settings.children.filter((child) => participants.includes(child.id)).map((child) => {
            const done = progress[child.id]?.completedBlocks.includes(block.id) ?? false;
            return (
              <button key={child.id} className={`complete-button ${done ? 'done' : ''}`} onClick={() => onToggleBlock(child.id, block)}>
                {done ? <CheckCircle2 size={19} /> : <Circle size={19} />} {child.avatar} {child.name} {done ? '已完成' : '完成本節'}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SettingsView({ settings, setSettings, progress, setProgress, setAttendance, goHome }: {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  progress: AppProgress;
  setProgress: React.Dispatch<React.SetStateAction<AppProgress>>;
  setAttendance: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  goHome: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);

  const addChild = () => {
    const id = `child-${Date.now()}`;
    const child: ChildProfile = { id, name: `小朋友 ${settings.children.length + 1}`, avatar: avatarOptions[settings.children.length % avatarOptions.length] };
    setSettings((current) => ({ ...current, children: [...current.children, child] }));
  };

  const updateChild = (id: string, patch: Partial<ChildProfile>) => {
    setSettings((current) => ({ ...current, children: current.children.map((child) => child.id === id ? { ...child, ...patch } : child) }));
  };

  const removeChild = (id: string) => {
    if (settings.children.length <= 1) return;
    setSettings((current) => ({ ...current, children: current.children.filter((child) => child.id !== id) }));
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ settings, progress }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `星際共學基地-學習紀錄-${ymd(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetProgress = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setProgress({});
    setAttendance({});
    setConfirmReset(false);
  };

  return (
    <div className="page settings-page">
      <div className="page-heading"><button className="icon-button" onClick={goHome}><ArrowLeft size={19} /></button><div><span className="eyebrow">CONTROL CENTER</span><h1>家庭共學設定</h1><p>V1 不需要登入、PIN 或密碼；資料保存在目前瀏覽器。</p></div></div>

      <section className="settings-card">
        <div className="setting-label"><span className="setting-icon"><Sun size={20} /></span><div><h3>顯示模式</h3><p>亮色、暗色或跟隨裝置系統。</p></div></div>
        <div className="segmented-control">
          {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
            <button key={mode} className={settings.theme === mode ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, theme: mode }))}>
              {mode === 'system' ? <Monitor size={17} /> : mode === 'light' ? <Sun size={17} /> : <Moon size={17} />}
              {mode === 'system' ? '隨系統' : mode === 'light' ? '明亮' : '暗黑'}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-card">
        <div className="setting-label"><span className="setting-icon"><CalendarDays size={20} /></span><div><h3>學期起始日</h3><p>預設從 2026/8/31（一）開始；改日期後，90 個平日課程會自動重新排程。</p></div></div>
        <input className="date-input" type="date" value={settings.semesterStart} onChange={(e) => setSettings((current) => ({ ...current, semesterStart: e.target.value }))} />
      </section>

      <section className="settings-card vertical">
        <div className="setting-label"><span className="setting-icon"><Users size={20} /></span><div><h3>小朋友名單</h3><p>可增加參與人數；每一天進入教案後還能另外勾選「今天誰有上課」。</p></div></div>
        <div className="children-settings-list">
          {settings.children.map((child) => (
            <div className="child-setting-row" key={child.id}>
              <select value={child.avatar} onChange={(e) => updateChild(child.id, { avatar: e.target.value })} aria-label={`${child.name} 頭像`}>
                {avatarOptions.map((avatar) => <option value={avatar} key={avatar}>{avatar}</option>)}
              </select>
              <input value={child.name} onChange={(e) => updateChild(child.id, { name: e.target.value })} />
              <div className="child-inline-stats"><span><Zap size={15} /> {progress[child.id]?.xp ?? 0}</span><span><Coins size={15} /> {progress[child.id]?.coins ?? 0}</span></div>
              <button className="icon-button danger" onClick={() => removeChild(child.id)} disabled={settings.children.length <= 1}><Trash2 size={17} /></button>
            </div>
          ))}
        </div>
        <button className="secondary-button add-child" onClick={addChild}><Plus size={18} /> 新增小朋友</button>
      </section>

      <section className="settings-card vertical">
        <div className="setting-label"><span className="setting-icon"><BookOpen size={20} /></span><div><h3>V1 資料保存</h3><p>目前使用 localStorage，沒有帳號與雲端資料庫。桌機、手機、平板都可開網站，但不同瀏覽器不會自動同步進度。</p></div></div>
        <div className="data-actions">
          <button className="secondary-button" onClick={exportData}>匯出學習紀錄 JSON</button>
          <button className={`secondary-button danger-outline ${confirmReset ? 'confirming' : ''}`} onClick={resetProgress}>{confirmReset ? '再按一次確認清除' : '清除所有學習進度'}</button>
        </div>
      </section>
    </div>
  );
}

export default App;
