import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Cloud,
  CloudOff,
  Coins,
  Copy,
  KeyRound,
  LogOut,
  ExternalLink,
  Gift,
  GraduationCap,
  Monitor,
  Moon,
  PlayCircle,
  Plus,
  RefreshCw,
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
import AvatarHero, { avatarName, avatarOptions, normalizeAvatarId } from './components/AvatarHero';
import AnimatedBadge from './components/AnimatedBadge';
import PhoneticText from './components/PhoneticText';
import { loadCloudSnapshot, normalizeFamilyPin, saveCloudSnapshot, validFamilyPin } from './cloud';
import {
  avatarStageFromXp,
  BLOCK_REWARD,
  calculateRewards,
  easterEggDays,
  EGG_REWARD,
  levelFromXp,
  nextAvatarStageXp,
  normalizeProgress,
} from './rewards';
import { iconForWord, subjectAction, visualThemeOptions } from './uiData';
import type {
  AppProgress,
  AppSettings,
  AttendanceMap,
  ChildProfile,
  ChildProgress,
  CloudSnapshot,
  CourseDay,
  DayReflection,
  LessonBlock,
  ReflectionMap,
  ThemeMode,
  VideoClip,
  ViewingStatus,
} from './types';

const SETTINGS_KEY = 'star-learning-settings-v1';
const PROGRESS_KEY = 'star-learning-progress-v1';
const ATTENDANCE_KEY = 'star-learning-attendance-v1';
const REFLECTION_KEY = 'star-learning-reflections-v1';
const ACTIVE_PIN_KEY = 'star-learning-active-family-pin-v21';

const familyStorageKey = (pin: string, kind: 'settings' | 'progress' | 'attendance' | 'reflections') =>
  `star-learning-v21:${pin}:${kind}`;

function hasLegacyLocalData() {
  return Boolean(
    localStorage.getItem(SETTINGS_KEY)
    || localStorage.getItem(PROGRESS_KEY)
    || localStorage.getItem(ATTENDANCE_KEY)
    || localStorage.getItem(REFLECTION_KEY),
  );
}

const defaultSettings: AppSettings = {
  theme: 'system',
  visualTheme: 'hero',
  semesterStart: '2026-08-31',
  children: [
    { id: 'child-1', name: '哥哥', avatar: 'nova' },
    { id: 'child-2', name: '弟弟', avatar: 'rex' },
  ],
  cloudSync: { enabled: false, familyCode: '' },
};

const emptyReflection = (): DayReflection => ({ engagement: '', note: '', viewing: {} });
const emptyProgress = (): ChildProgress => normalizeProgress();

type CloudStatus = 'local' | 'loading' | 'saving' | 'synced' | 'error';
type RewardToast = { id: number; title: string; detail: string } | null;
type ClickBurst = { id: number; x: number; y: number };

function safeLoad<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeSettings(raw?: Partial<AppSettings> | null): AppSettings {
  const theme = raw?.theme === 'light' || raw?.theme === 'dark' || raw?.theme === 'system' ? raw.theme : 'system';
  const visualTheme = visualThemeOptions.some((option) => option.id === raw?.visualTheme) ? raw!.visualTheme! : 'hero';
  const children = Array.isArray(raw?.children) && raw!.children!.length
    ? raw!.children!.map((child, index) => ({
        id: child.id || `child-${index + 1}`,
        name: child.name || `小朋友 ${index + 1}`,
        avatar: normalizeAvatarId(child.avatar),
      }))
    : defaultSettings.children;
  return {
    theme,
    visualTheme,
    semesterStart: raw?.semesterStart || defaultSettings.semesterStart,
    children,
    cloudSync: {
      enabled: Boolean(raw?.cloudSync?.enabled),
      familyCode: String(raw?.cloudSync?.familyCode ?? '').slice(0, 24),
    },
  };
}

function loadFamilyValue<T>(pin: string, kind: 'settings' | 'progress' | 'attendance' | 'reflections', legacyKey: string, fallback: T): T {
  const namespaced = safeLoad<T>(familyStorageKey(pin, kind), fallback);
  if (localStorage.getItem(familyStorageKey(pin, kind))) return namespaced;
  if (pin === '1234' && hasLegacyLocalData()) return safeLoad<T>(legacyKey, fallback);
  return fallback;
}

function normalizeProgressMap(raw: AppProgress | undefined, children: ChildProfile[]) {
  const next: AppProgress = {};
  if (raw && typeof raw === 'object') {
    Object.entries(raw).forEach(([id, item]) => { next[id] = normalizeProgress(item); });
  }
  children.forEach((child) => { if (!next[child.id]) next[child.id] = emptyProgress(); });
  return next;
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
  return new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(date);
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long' }).format(date);
}

function youtubeEmbedUrl(clip: VideoClip) {
  const params = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' });
  if (clip.start) params.set('start', String(clip.start));
  if (clip.end) params.set('end', String(clip.end));
  return `https://www.youtube-nocookie.com/embed/${clip.videoId}?${params.toString()}`;
}

function snapshotNow(settings: AppSettings, progress: AppProgress, attendance: AttendanceMap, reflections: ReflectionMap): CloudSnapshot {
  const cloudSafeSettings = { ...settings, cloudSync: { enabled: true, familyCode: '' } };
  return { version: 2, updatedAt: new Date().toISOString(), settings: cloudSafeSettings, progress, attendance, reflections };
}

function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return <div className="progress-track" aria-label={`進度 ${Math.round(pct)}%`}><div className="progress-fill" style={{ width: `${pct}%` }} /></div>;
}

function SubjectBadge({ subject }: { subject: LessonBlock['subject'] }) {
  const labels: Record<LessonBlock['subject'], string> = {
    English: 'English', Math: '數學', Zhuyin: 'ㄅㄆㄇ', Life: '生活', Science: '探索', Review: '複習',
  };
  return <span className={`subject-badge subject-${subject.toLowerCase()}`}>{labels[subject]}</span>;
}

function VideoPlayer({ clip, compact = false, warmup = false }: { clip: VideoClip; compact?: boolean; warmup?: boolean }) {
  return (
    <div className={`video-card ${compact ? 'compact' : ''} ${warmup ? 'food-warmup-card' : ''}`}>
      <div className="video-title-row">
        <div>
          <span className="eyebrow">{warmup ? '🍎 美食暖身歌' : clip.channel}</span>
          <h4>{clip.title}</h4>
        </div>
        {clip.sourceUrl && <a className="icon-button" href={clip.sourceUrl} target="_blank" rel="noreferrer" title="在 YouTube 開啟"><ExternalLink size={17} /></a>}
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

function ClickEffects({ bursts }: { bursts: ClickBurst[] }) {
  return (
    <div className="click-effects" aria-hidden="true">
      {bursts.map((burst) => (
        <span key={burst.id} className="click-burst" style={{ left: burst.x, top: burst.y }}>
          {Array.from({ length: 6 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}
        </span>
      ))}
    </div>
  );
}

function CloudPill({ status }: { status: CloudStatus }) {
  const label = status === 'synced' ? '雲端已同步' : status === 'saving' ? '同步中' : status === 'loading' ? '讀取雲端' : status === 'error' ? '雲端待重試' : '本機模式';
  return <span className={`cloud-pill cloud-${status}`}>{status === 'local' || status === 'error' ? <CloudOff size={14} /> : <Cloud size={14} />}{label}</span>;
}

function FamilyApp({ familyPin, onSwitchFamily, onOpenFamily }: { familyPin: string; onSwitchFamily: () => void; onOpenFamily: (pin: string) => void }) {
  const initialSettings = useMemo(() => {
    const raw = loadFamilyValue<Partial<AppSettings>>(familyPin, 'settings', SETTINGS_KEY, defaultSettings);
    const normalized = normalizeSettings(raw);
    return { ...normalized, cloudSync: { enabled: true, familyCode: familyPin } };
  }, [familyPin]);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [progress, setProgress] = useState<AppProgress>(() => normalizeProgressMap(loadFamilyValue<AppProgress>(familyPin, 'progress', PROGRESS_KEY, {}), initialSettings.children));
  const [attendance, setAttendance] = useState<AttendanceMap>(() => loadFamilyValue<AttendanceMap>(familyPin, 'attendance', ATTENDANCE_KEY, {}));
  const [reflections, setReflections] = useState<ReflectionMap>(() => loadFamilyValue<ReflectionMap>(familyPin, 'reflections', REFLECTION_KEY, {}));
  const [view, setView] = useState<'home' | 'semester' | 'settings'>('home');
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('loading');
  const [cloudMessage, setCloudMessage] = useState('正在辨識家庭 PIN…');
  const [cloudReady, setCloudReady] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState('');
  const [rewardToast, setRewardToast] = useState<RewardToast>(null);
  const [bursts, setBursts] = useState<ClickBurst[]>([]);
  const cloudUpdatedAtRef = useRef('');
  const rewardTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setProgress((current) => normalizeProgressMap(current, settings.children));
  }, [settings.children]);

  useEffect(() => localStorage.setItem(familyStorageKey(familyPin, 'settings'), JSON.stringify(settings)), [settings, familyPin]);
  useEffect(() => localStorage.setItem(familyStorageKey(familyPin, 'progress'), JSON.stringify(progress)), [progress, familyPin]);
  useEffect(() => localStorage.setItem(familyStorageKey(familyPin, 'attendance'), JSON.stringify(attendance)), [attendance, familyPin]);
  useEffect(() => localStorage.setItem(familyStorageKey(familyPin, 'reflections'), JSON.stringify(reflections)), [reflections, familyPin]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.adventureTheme = settings.visualTheme;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && media.matches);
      root.classList.toggle('dark', dark);
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [settings.theme, settings.visualTheme]);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      const id = Date.now() + Math.random();
      setBursts((current) => [...current.slice(-5), { id, x: event.clientX, y: event.clientY }]);
      window.setTimeout(() => setBursts((current) => current.filter((item) => item.id !== id)), 700);
    };
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, []);

  const showReward = (title: string, detail: string) => {
    const next = { id: Date.now(), title, detail };
    setRewardToast(next);
    if (rewardTimerRef.current) window.clearTimeout(rewardTimerRef.current);
    rewardTimerRef.current = window.setTimeout(() => setRewardToast(null), 1800);
  };

  const applyCloudSnapshot = (snapshot: CloudSnapshot, code: string) => {
    const remoteSettings = normalizeSettings(snapshot.settings);
    const nextSettings = { ...remoteSettings, cloudSync: { enabled: true, familyCode: code } };
    setCloudReady(false);
    setSettings(nextSettings);
    setProgress(normalizeProgressMap(snapshot.progress, nextSettings.children));
    setAttendance(snapshot.attendance ?? {});
    setReflections(snapshot.reflections ?? {});
    cloudUpdatedAtRef.current = snapshot.updatedAt;
    setLastCloudSync(snapshot.updatedAt);
    window.setTimeout(() => setCloudReady(true), 0);
  };

  const pullCloud = async (pin: string, force = true) => {
    const normalized = normalizeFamilyPin(pin);
    if (!validFamilyPin(normalized)) {
      setCloudStatus('error');
      setCloudMessage('家庭 PIN 必須是 4–6 位數字。');
      return false;
    }
    setCloudStatus('loading');
    setCloudMessage('正在讀取這個家庭的雲端進度…');
    try {
      const snapshot = await loadCloudSnapshot(normalized);
      if (!snapshot) {
        setCloudStatus('error');
        setCloudMessage('這組 PIN 尚未建立雲端資料。');
        return false;
      }
      if (force || !cloudUpdatedAtRef.current || new Date(snapshot.updatedAt) > new Date(cloudUpdatedAtRef.current)) {
        applyCloudSnapshot(snapshot, normalized);
      }
      setCloudReady(true);
      setCloudStatus('synced');
      setCloudMessage('已載入這個家庭的最新進度。');
      return true;
    } catch (error) {
      setCloudStatus('error');
      setCloudMessage(error instanceof Error ? error.message : '雲端讀取失敗');
      return false;
    }
  };

  useEffect(() => {
    if (!initialSettings.cloudSync.enabled || !initialSettings.cloudSync.familyCode) return;
    void (async () => {
      try {
        const snapshot = await loadCloudSnapshot(initialSettings.cloudSync.familyCode);
        if (snapshot) {
          applyCloudSnapshot(snapshot, initialSettings.cloudSync.familyCode);
          setCloudStatus('synced');
          setCloudMessage('啟動時已讀取雲端進度。');
        } else {
          setCloudReady(true);
          setCloudStatus('saving');
          setCloudMessage('雲端尚無資料，正在建立第一份副本…');
        }
      } catch (error) {
        setCloudReady(false);
        setCloudStatus('error');
        setCloudMessage(error instanceof Error ? `${error.message}；為避免覆寫雲端，本機暫停自動上傳。` : '啟動時無法讀取雲端；為避免覆寫，本機暫停自動上傳。');
      }
    })();
    // Initial bootstrap is intentionally one-time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!settings.cloudSync.enabled || !settings.cloudSync.familyCode || !cloudReady) return;
    const code = settings.cloudSync.familyCode;
    const timer = window.setTimeout(async () => {
      setCloudStatus('saving');
      setCloudMessage('正在儲存最新進度…');
      try {
        const response = await saveCloudSnapshot(code, snapshotNow(settings, progress, attendance, reflections));
        cloudUpdatedAtRef.current = response.updatedAt;
        setLastCloudSync(response.updatedAt);
        setCloudStatus('synced');
        setCloudMessage('所有裝置可讀取這份最新進度。');
      } catch (error) {
        setCloudStatus('error');
        setCloudMessage(error instanceof Error ? error.message : '雲端儲存失敗；本機資料仍安全保留。');
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [settings, progress, attendance, reflections, cloudReady]);

  useEffect(() => {
    if (!settings.cloudSync.enabled || !settings.cloudSync.familyCode) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void pullCloud(settings.cloudSync.familyCode, false);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [settings.cloudSync.enabled, settings.cloudSync.familyCode]);

  const syncNow = async () => {
    const code = settings.cloudSync.familyCode;
    if (!code) return;
    setCloudStatus('saving');
    try {
      const response = await saveCloudSnapshot(code, snapshotNow(settings, progress, attendance, reflections));
      cloudUpdatedAtRef.current = response.updatedAt;
      setLastCloudSync(response.updatedAt);
      setCloudReady(true);
      setCloudStatus('synced');
      setCloudMessage('手動同步完成，已恢復自動同步。');
    } catch (error) {
      setCloudStatus('error');
      setCloudMessage(error instanceof Error ? error.message : '手動同步失敗');
    }
  };

  const selectedDay = selectedDayId ? curriculum.find((day) => day.id === selectedDayId) ?? null : null;
  const participantIds = (day: CourseDay) => attendance[day.id] ?? settings.children.map((child) => child.id);
  const isChildBlockDone = (childId: string, blockId: string) => Boolean(progress[childId]?.completedBlocks.includes(blockId));
  const isChildDayDone = (childId: string, day: CourseDay) => day.blocks.every((block) => isChildBlockDone(childId, block.id));
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
    setAttendance((current) => current[day.id] ? current : { ...current, [day.id]: settings.children.map((child) => child.id) });
    setSelectedDayId(day.id);
  };

  const toggleAttendance = (day: CourseDay, childId: string) => {
    setAttendance((current) => {
      const currentIds = current[day.id] ?? settings.children.map((child) => child.id);
      if (currentIds.includes(childId) && currentIds.length === 1) return current;
      const nextIds = currentIds.includes(childId) ? currentIds.filter((id) => id !== childId) : [...currentIds, childId];
      return { ...current, [day.id]: nextIds };
    });
  };

  const toggleMission = (childId: string, mission: LessonBlock['missions'][number]) => {
    const before = normalizeProgress(progress[childId]);
    const done = before.completedMissions.includes(mission.id);
    const parentDay = curriculum.find((day) => day.blocks.some((block) => block.missions.some((item) => item.id === mission.id)));
    const parentBlock = parentDay?.blocks.find((block) => block.missions.some((item) => item.id === mission.id));
    setProgress((current) => {
      const child = normalizeProgress(current[childId]);
      const isDone = child.completedMissions.includes(mission.id);
      if (!isDone) {
        return { ...current, [childId]: { ...child, completedMissions: [...child.completedMissions, mission.id] } };
      }

      const nextMissions = child.completedMissions.filter((id) => id !== mission.id);
      const nextBlocks = parentBlock ? child.completedBlocks.filter((id) => id !== parentBlock.id) : child.completedBlocks;
      const nextDays = parentDay ? child.completedDays.filter((id) => id !== parentDay.id) : child.completedDays;
      return {
        ...current,
        [childId]: {
          ...child,
          completedMissions: nextMissions,
          completedBlocks: nextBlocks,
          completedDays: nextDays,
        },
      };
    });
    if (!done) {
      const name = settings.children.find((child) => child.id === childId)?.name ?? '小朋友';
      showReward(`${name} 任務完成！`, `+${mission.xp} XP · +${mission.coins} 金幣`);
    }
  };

  const toggleBlock = (childId: string, day: CourseDay, block: LessonBlock) => {
    const before = normalizeProgress(progress[childId]);
    const done = before.completedBlocks.includes(block.id);
    const allMissionsDone = block.missions.every((mission) => before.completedMissions.includes(mission.id));
    if (!done && !allMissionsDone) return;

    setProgress((current) => {
      const child = normalizeProgress(current[childId]);
      const isDone = child.completedBlocks.includes(block.id);
      const nextBlocks = isDone ? child.completedBlocks.filter((id) => id !== block.id) : [...child.completedBlocks, block.id];
      const dayDone = day.blocks.every((item) => nextBlocks.includes(item.id));
      const nextDays = dayDone ? Array.from(new Set([...child.completedDays, day.id])) : child.completedDays.filter((id) => id !== day.id);
      return { ...current, [childId]: { ...child, completedBlocks: nextBlocks, completedDays: nextDays } };
    });
    if (!done) {
      const name = settings.children.find((child) => child.id === childId)?.name ?? '小朋友';
      showReward(`${name} 完成本節！`, `通關獎勵 +${BLOCK_REWARD.xp} XP · +${BLOCK_REWARD.coins} 金幣`);
    }
  };

  const claimEgg = (childId: string, day: CourseDay) => {
    const eggId = `egg-day-${day.index}`;
    const child = normalizeProgress(progress[childId]);
    if (child.claimedEggs.includes(eggId)) return;
    setProgress((current) => {
      const item = normalizeProgress(current[childId]);
      return { ...current, [childId]: { ...item, claimedEggs: [...item.claimedEggs, eggId] } };
    });
    const name = settings.children.find((item) => item.id === childId)?.name ?? '小朋友';
    showReward(`${name} 找到隱藏彩蛋！`, `祕密獎勵 +${EGG_REWARD.xp} XP · +${EGG_REWARD.coins} 金幣`);
  };

  const cycleTheme = () => {
    const order: ThemeMode[] = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(settings.theme) + 1) % order.length];
    setSettings((current) => ({ ...current, theme: next }));
  };

  if (selectedDay) {
    return (
      <>
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
          onUpdateReflection={(patch) => setReflections((current) => ({ ...current, [selectedDay.id]: { ...(current[selectedDay.id] ?? emptyReflection()), ...patch } }))}
          onClaimEgg={(childId) => claimEgg(childId, selectedDay)}
        />
        <ClickEffects bursts={bursts} />
        {rewardToast && <div className="reward-toast" key={rewardToast.id}><Sparkles size={22} /><div><strong>{rewardToast.title}</strong><span>{rewardToast.detail}</span></div></div>}
      </>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView('home')}>
          <span className="brand-mark"><Rocket size={21} /></span>
          <span><strong>星際共學基地</strong><small>Family Learning Mission · V2</small></span>
        </button>
        <nav className="top-actions">
          <CloudPill status={cloudStatus} />
          <span className="family-pin-chip"><KeyRound size={14} /> 家庭 {familyPin}</span>
          <button className="nav-button switch-family-button" onClick={onSwitchFamily} title="切換家庭"><LogOut size={17} /><span>切換家庭</span></button>
          <button className="nav-button" onClick={cycleTheme} title="切換顯示模式">
            {settings.theme === 'dark' ? <Moon size={18} /> : settings.theme === 'light' ? <Sun size={18} /> : <Monitor size={18} />}
          </button>
          <button className={`nav-button ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}><SettingsIcon size={18} /><span>設定</span></button>
        </nav>
      </header>

      <main>
        {view === 'home' && <HomeView settings={settings} progress={progress} featuredDay={featuredDay} todayDay={todayDay} completedDays={completedDays} completionPct={completionPct} isDayDone={isDayDone} isChildDayDone={isChildDayDone} openDay={openDay} goSemester={() => setView('semester')} cloudStatus={cloudStatus} />}
        {view === 'semester' && <SemesterView settings={settings} isDayDone={isDayDone} openDay={openDay} goHome={() => setView('home')} />}
        {view === 'settings' && (
          <SettingsView
            settings={settings}
            setSettings={setSettings}
            progress={progress}
            attendance={attendance}
            reflections={reflections}
            setProgress={setProgress}
            setAttendance={setAttendance}
            setReflections={setReflections}
            familyPin={familyPin}
            cloudStatus={cloudStatus}
            cloudMessage={cloudMessage}
            lastCloudSync={lastCloudSync}
            onSyncNow={syncNow}
            onPullCloud={() => pullCloud(familyPin, true)}
            onSwitchFamily={onSwitchFamily}
            onOpenFamily={onOpenFamily}
            goHome={() => setView('home')}
          />
        )}
      </main>

      <footer className="footer">
        <div><strong>教材來源</strong>{youtubeChannelLinks.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>)}</div>
        <div className="asset-credit">介面、角色與主題為本專案原創設計；功能圖示採 <a href="https://lucide.dev/" target="_blank" rel="noreferrer">Lucide（ISC）</a>。YouTube 影片以官方播放器嵌入，著作權歸原權利人所有。</div>
      </footer>
      <ClickEffects bursts={bursts} />
      {rewardToast && <div className="reward-toast" key={rewardToast.id}><Sparkles size={22} /><div><strong>{rewardToast.title}</strong><span>{rewardToast.detail}</span></div></div>}
    </div>
  );
}

function HomeView({ settings, progress, featuredDay, todayDay, completedDays, completionPct, isDayDone, isChildDayDone, openDay, goSemester, cloudStatus }: {
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
  cloudStatus: CloudStatus;
}) {
  const level = Math.floor(completedDays / 10) + 1;
  const nextMilestone = Math.min(90, Math.ceil((completedDays + 1) / 10) * 10);
  const monthGroups = useMemo(() => {
    const groups = new Map<string, Array<{ day: CourseDay; date: Date }>>();
    curriculum.forEach((day) => {
      const date = addCourseWeekdays(settings.semesterStart, day.index - 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ day, date });
    });
    return Array.from(groups.values());
  }, [settings.semesterStart]);

  const firstChild = settings.children[0];
  const firstRewards = calculateRewards(progress[firstChild?.id]);

  return (
    <div className="page home-page">
      <section className="hero-card v2-hero">
        <div className="hero-copy">
          <div className="pill"><Sparkles size={15} /> V2 · 18 週家庭共學任務</div>
          <h1><PhoneticText text="今晚不用備課" />，<br /><span><PhoneticText text="一起唱、一起玩、一起變強" />。</span></h1>
          <p>每節先用孩子喜歡的食物歌開機，再由爸爸、媽媽或照顧者控制影片節奏。暫停、複誦、回看、找東西、動起來，全部都寫在教案裡。</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => openDay(featuredDay)}><PlayCircle size={20} /> <PhoneticText text={todayDay ? '開始今天課程' : '繼續課程'} />{!todayDay && ` Day ${featuredDay.index}`}</button>
            <button className="secondary-button" onClick={goSemester}><BookOpen size={19} /> <PhoneticText text="看完整學期" /></button>
          </div>
          {settings.cloudSync.enabled && <div className="hero-cloud-line"><Cloud size={15} /> {cloudStatus === 'synced' ? '家庭進度已在雲端同步' : '家庭雲端同步已啟用'}</div>}
        </div>
        <div className="hero-visual hero-avatar-stage" aria-hidden="true">
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          {firstChild && <AvatarHero avatarId={firstChild.avatar} xp={firstRewards.xp} size={190} showStage />}
          <span className="floating-star star-a">★</span><span className="floating-star star-b">✦</span><span className="floating-star star-c">✧</span>
        </div>
      </section>

      <section className="dashboard-grid compact-dashboard">
        <article className="mission-card today-card">
          <div className="card-heading"><div><span className="eyebrow">{todayDay ? 'TODAY MISSION' : 'NEXT MISSION'}</span><h2>{featuredDay.emoji} <PhoneticText text={`Day ${featuredDay.index}｜${featuredDay.title}`} /></h2></div><span className="date-chip">{formatCourseDate(addCourseWeekdays(settings.semesterStart, featuredDay.index - 1))}</span></div>
          <p>{featuredDay.bigIdea}</p>
          <div className="lesson-preview-row">{featuredDay.blocks.map((block, i) => <div className="lesson-preview" key={block.id}><span>第 {i + 1} 節 · 約 {block.duration} 分鐘</span><strong>{block.title}</strong><SubjectBadge subject={block.subject} /></div>)}</div>
          <button className="primary-button full" onClick={() => openDay(featuredDay)}><PhoneticText text="進入教案" /> <ChevronRight size={18} /></button>
        </article>

        <article className="mission-card progress-card">
          <div className="card-heading"><div><span className="eyebrow">SEMESTER PROGRESS</span><h2><PhoneticText text={`Level ${level} 家庭探險隊`} /></h2></div><AnimatedBadge art="trophy" size={54} label="學期獎盃" /></div>
          <div className="big-number">{completionPct}<small>%</small></div>
          <ProgressBar value={completedDays} max={90} />
          <div className="progress-meta"><span>{completedDays} / 90 學習日</span><span>下一里程碑：{nextMilestone} 天</span></div>
          <div className="milestone-row rich-milestones"><div className={completedDays >= 5 ? 'reached' : ''}><AnimatedBadge art="star" size={38} /> <span>5 天</span></div><div className={completedDays >= 30 ? 'reached' : ''}><AnimatedBadge art="xp" size={38} /> <span>30 天</span></div><div className={completedDays >= 60 ? 'reached' : ''}><AnimatedBadge art="rocket" size={38} /> <span>60 天</span></div><div className={completedDays >= 90 ? 'reached' : ''}><AnimatedBadge art="trophy" size={38} /> <span>90 天</span></div></div>
        </article>
      </section>

      <section className="section-block">
        <div className="section-title"><div><span className="eyebrow">CREW STATUS</span><h2><PhoneticText text="小小探險隊" /></h2></div><span className="muted"><Users size={17} /> {settings.children.length} 位小朋友</span></div>
        <div className="children-grid evolved-children-grid">
          {settings.children.map((child) => {
            const childProgress = normalizeProgress(progress[child.id]);
            const rewards = calculateRewards(childProgress);
            const childDays = curriculum.filter((day) => isChildDayDone(child.id, day)).length;
            const childLevel = levelFromXp(rewards.xp);
            const stage = avatarStageFromXp(rewards.xp);
            const nextStage = nextAvatarStageXp(rewards.xp);
            return (
              <article className="child-card evolved-child-card" key={child.id}>
                <AvatarHero avatarId={child.avatar} xp={rewards.xp} size={92} />
                <div className="child-main"><span>LEVEL {childLevel} · 進化 {stage}/4</span><h3>{child.name} <small>{avatarName(child.avatar)}</small></h3><ProgressBar value={childDays} max={90} /><small>完成 {childDays} 天{nextStage ? ` · 距下一次進化 ${Math.max(0, nextStage - rewards.xp)} XP` : ' · 已達最高進化'}</small></div>
                <div className="currency-stack"><span><Zap size={15} /> {rewards.xp} XP</span><span><Coins size={15} /> {rewards.coins}</span></div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-block compact-calendar-section">
        <div className="section-title"><div><span className="eyebrow">SEMESTER CALENDAR</span><h2><PhoneticText text="學期日曆" /></h2></div><button className="text-button" onClick={goSemester}>展開 18 週課程 <ChevronRight size={17} /></button></div>
        <div className="month-grid">
          {monthGroups.map((items) => {
            const first = items[0].date;
            const offset = Math.max(0, first.getDay() - 1);
            return (
              <article className="month-card" key={`${first.getFullYear()}-${first.getMonth()}`}>
                <div className="month-title"><strong>{formatMonth(first)}</strong><span>{items.length} 課</span></div>
                <div className="month-weekdays"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span></div>
                <div className="month-days">
                  {Array.from({ length: offset }, (_, i) => <span className="calendar-spacer" key={`s-${i}`} />)}
                  {items.map(({ day, date }) => {
                    const done = isDayDone(day);
                    const current = ymd(date) === ymd(new Date());
                    return (
                      <button key={day.id} className={`mini-calendar-day ${done ? 'done' : ''} ${current ? 'today' : ''}`} onClick={() => openDay(day)} title={`Day ${day.index}｜${day.title}`}>
                        <span className="mini-date">{date.getDate()}</span><span className="mini-emoji">{done ? '✓' : day.emoji}</span><small>D{day.index}</small>
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SemesterView({ settings, isDayDone, openDay, goHome }: { settings: AppSettings; isDayDone: (day: CourseDay) => boolean; openDay: (day: CourseDay) => void; goHome: () => void }) {
  return (
    <div className="page">
      <div className="page-heading"><button className="icon-button" onClick={goHome}><ArrowLeft size={19} /></button><div><span className="eyebrow">FULL SEMESTER</span><h1>18 週完整學習地圖</h1><p>{semesterStats.days} 天 · {semesterStats.blocks} 節活動單元 · 約 {semesterStats.minutes / 60} 小時家庭共學</p></div></div>
      <div className="week-list">{weekSummaries.map((week) => {
        const days = curriculum.filter((day) => day.week === week.week);
        const doneCount = days.filter(isDayDone).length;
        return <section className="week-card" key={week.week}><div className="week-head"><div className="week-number">W{String(week.week).padStart(2, '0')}</div><div className="week-copy"><h2>{week.emoji} {week.title}</h2><p>{week.bigIdea}</p></div><div className="week-progress"><strong>{doneCount}/5</strong><small>完成</small></div></div><div className="week-vocab">{week.vocab.slice(0, 7).map((word) => <span key={word}>{iconForWord(word)} {word}</span>)}</div><div className="week-days">{days.map((day) => { const date = addCourseWeekdays(settings.semesterStart, day.index - 1); const done = isDayDone(day); return <button key={day.id} onClick={() => openDay(day)} className={`week-day-button ${done ? 'done' : ''}`}><div><span>DAY {day.index}</span><strong>{day.title.split('｜')[1]}</strong><small>{formatCourseDate(date)}</small></div>{done ? <CheckCircle2 size={21} /> : <ChevronRight size={20} />}</button>; })}</div></section>;
      })}</div>
    </div>
  );
}

function DayView({ day, date, settings, progress, participants, onBack, onToggleAttendance, onToggleMission, onToggleBlock, reflection, onUpdateReflection, onClaimEgg }: {
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
  onClaimEgg: (childId: string) => void;
}) {
  return (
    <div className="lesson-page">
      <header className="lesson-header v2-lesson-header">
        <button className="icon-button glass" onClick={onBack}><ArrowLeft size={20} /></button>
        <div className="lesson-header-copy"><span>WEEK {day.week} · DAY {day.index} · {formatCourseDate(date)}</span><h1>{day.emoji} {day.title}</h1><p>{day.bigIdea}</p></div>
        <div className="mission-badge"><Rocket size={20} /> Mission {day.index}/90</div>
        {easterEggDays.has(day.index) && <EasterEgg day={day} settings={settings} progress={progress} participants={participants} onClaim={onClaimEgg} />}
      </header>

      <main className="lesson-content">
        <section className="attendance-panel">
          <div><span className="eyebrow">TODAY'S CREW</span><h2><PhoneticText text="今天誰一起上課" />？</h2><p>每天都能重新選擇參與的小朋友；每位孩子分開記錄任務、XP、金幣與頭像進化。</p></div>
          <div className="attendance-chips">{settings.children.map((child) => {
            const active = participants.includes(child.id); const rewards = calculateRewards(progress[child.id]);
            return <button key={child.id} className={`attendance-chip ${active ? 'active' : ''}`} onClick={() => onToggleAttendance(child.id)}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={42} /><strong>{child.name}</strong>{active ? <Check size={17} /> : <Circle size={17} />}</button>;
          })}</div>
        </section>

        <section className="caregiver-brief enlarged-caregiver-brief">
          <div className="brief-icon"><Users size={24} /></div>
          <div><span className="eyebrow">給第一次帶課的大人</span><h3>你是今天的「節奏控制員」：孩子想說話、指畫面、笑出來或開始分心，就停。</h3><p>不用追著分鐘數跑。影片是教材，不是整堂課；請依畫面教案做「播放 → 暫停 → 複誦 → 回看 → 找東西／做動作」。4 歲只說單字也算成功，6 歲再往完整句推進。</p></div>
        </section>

        {day.blocks.map((block, blockIndex) => <LessonBlockView key={block.id} block={block} blockIndex={blockIndex} day={day} settings={settings} progress={progress} participants={participants} onToggleMission={onToggleMission} onToggleBlock={onToggleBlock} />)}

        <section className="bonus-card"><div className="bonus-icon rich-bonus-icon"><AnimatedBadge art="treasure" size={58} /></div><div><span className="eyebrow">BONUS QUEST</span><h3><PhoneticText text="今日加碼任務" /></h3><p>{day.bonus}</p></div></section>
        <ReflectionPanel day={day} reflection={reflection} onUpdate={onUpdateReflection} />
      </main>
    </div>
  );
}

function EasterEgg({ day, settings, progress, participants, onClaim }: { day: CourseDay; settings: AppSettings; progress: AppProgress; participants: string[]; onClaim: (childId: string) => void }) {
  const [revealed, setRevealed] = useState(false);
  const eggId = `egg-day-${day.index}`;
  return (
    <div className={`secret-egg ${revealed ? 'revealed' : ''}`}>
      {!revealed ? <button onClick={() => setRevealed(true)} title="這裡好像有東西…">✦</button> : (
        <div className="egg-popover"><strong>🥚 找到祕密彩蛋！</strong><span>今天上課的小朋友都可以各領一次。</span><div>{settings.children.filter((child) => participants.includes(child.id)).map((child) => {
          const claimed = normalizeProgress(progress[child.id]).claimedEggs.includes(eggId);
          return <button key={child.id} disabled={claimed} onClick={() => onClaim(child.id)}>{claimed ? '✓ 已領' : `${child.name} 領獎`}</button>;
        })}</div></div>
      )}
    </div>
  );
}

function ReflectionPanel({ day, reflection, onUpdate }: { day: CourseDay; reflection: DayReflection; onUpdate: (patch: Partial<DayReflection>) => void }) {
  const viewingLabels: Record<ViewingStatus, string> = { full: '完整看', partial: '片段看', skip: '跳過' };
  const engagementOptions = [{ value: 'great' as const, emoji: '🤩', label: '很投入' }, { value: 'ok' as const, emoji: '🙂', label: '普通' }, { value: 'tired' as const, emoji: '😴', label: '今天累了' }];
  const setViewing = (blockId: string, status: ViewingStatus) => onUpdate({ viewing: { ...reflection.viewing, [blockId]: status } });
  return (
    <section className="reflection-card enlarged-reflection">
      <div className="panel-heading"><CalendarDays size={22} /><div><span className="eyebrow">30-SECOND LOG</span><h3><PhoneticText text="課後紀錄" /></h3></div></div>
      <p className="reflection-help">只記「實際發生什麼」，不是替孩子打成績。影片只看片段完全可以；如果今天累了，也照實留下紀錄。</p>
      <div className="viewing-log-grid">{day.blocks.map((block, index) => <div className="viewing-log-row" key={block.id}><strong>第 {index + 1} 節影片看多少？</strong><div className="viewing-options">{(['full', 'partial', 'skip'] as ViewingStatus[]).map((status) => <button key={status} className={reflection.viewing[block.id] === status ? 'active' : ''} onClick={() => setViewing(block.id, status)}>{viewingLabels[status]}</button>)}</div></div>)}</div>
      <div className="engagement-row">{engagementOptions.map((option) => <button key={option.value} className={reflection.engagement === option.value ? 'active' : ''} onClick={() => onUpdate({ engagement: option.value })}><span>{option.emoji}</span>{option.label}</button>)}</div>
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
  const action = subjectAction(block.subject);
  return (
    <section className="lesson-block-card v2-lesson-block">
      <div className="block-heading"><div className="block-index">{blockIndex + 1}</div><div className="block-title-copy"><span className="eyebrow">第 {blockIndex + 1} 節 · 約 {block.duration} 分鐘</span><h2>{block.title}</h2></div><SubjectBadge subject={block.subject} /></div>

      <div className="lesson-media-grid"><VideoPlayer clip={block.warmup} compact warmup /><VideoPlayer clip={block.video} /></div>

      <div className="focus-deck">
        <div className="focus-heading"><div><span className="eyebrow">TODAY'S FOCUS</span><h3><PhoneticText text="今日重點" /></h3></div><span className="focus-hint">看得到 · 說得出 · 做得到</span></div>
        <div className="focus-grid">
          <div className="focus-card focus-words"><strong>👀 今天要認得</strong><div className="picture-word-grid">{block.vocabulary.map((word) => <span key={word}><b>{iconForWord(word)}</b><em>{word}</em></span>)}</div></div>
          <div className="focus-card focus-sentence"><strong>🗣️ <PhoneticText text="句型" /></strong><p>{block.sentence}</p><small>4 歲：能補最後一個字就很棒。<br />6 歲：試著自己說完整句。</small></div>
          <div className="focus-card focus-action"><strong>{action.icon} {action.label}</strong><p>{action.text}</p><small>把眼睛、嘴巴、手和身體都加入，記憶會比只看影片更牢。</small></div>
        </div>
      </div>

      <div className="guide-grid">
        <div className="timeline-panel enlarged-script">
          <div className="panel-heading"><BookOpen size={21} /><div><span className="eyebrow">CAREGIVER SCRIPT</span><h3><PhoneticText text="照著做就能上課" /></h3></div></div>
          <div className="timeline">{block.steps.map((step, index) => <div className="timeline-step" key={`${block.id}-${index}`}><div className="time-dot"><span>{step.minute}</span></div><div><h4>{step.title}</h4><p>{step.instruction}</p>{step.cue && <div className="pause-cue">⏸ 暫停提示：{step.cue}</div>}</div></div>)}</div>
        </div>
        <aside className="side-guide"><div className="tip-card"><span className="eyebrow">帶課提醒</span><p>{block.caregiverTip}</p></div><div className="level-card"><div><span>4 歲／初階</span><p>{block.younger}</p></div><div><span>6 歲／進階</span><p>{block.older}</p></div></div></aside>
      </div>

      <div className="interactive-section v2-missions">
        <div className="panel-heading"><Zap size={22} /><div><span className="eyebrow">INTERACTIVE MISSIONS</span><h3><PhoneticText text="互動任務" />｜做到標準再領獎</h3></div></div>
        <div className="mission-rule-banner"><strong>家長怎麼判斷？</strong><span>先讓孩子實際做 → 對照「完成標準」→ 達標才按孩子的領獎按鈕。答錯後經提示完成也算，不需要一次就答對。</span></div>
        <div className="mission-grid">{block.missions.map((mission, missionIndex) => <article className="mini-mission v2-mini-mission" key={mission.id}><div className="mission-top"><span className={`mission-kind kind-${mission.kind}`}>任務 {missionIndex + 1}｜{mission.title}</span><span className="reward">+{mission.xp} XP · +{mission.coins} 🪙</span></div><p className="mission-prompt">{mission.prompt}</p><div className="mission-criteria"><strong>✓ 完成標準</strong><span>{mission.criteria}</span></div><div className="mission-players">{settings.children.filter((child) => participants.includes(child.id)).map((child) => { const done = progress[child.id]?.completedMissions.includes(mission.id) ?? false; const rewards = calculateRewards(progress[child.id]); return <button key={child.id} className={`player-score reward-button ${done ? 'done' : ''}`} onClick={() => onToggleMission(child.id, mission)}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={34} /><span><strong>{child.name}</strong><small>{done ? '已領獎 · 再按可撤銷' : `完成了！領 +${mission.xp} XP`}</small></span>{done ? <CheckCircle2 size={18} /> : <Gift size={18} />}</button>; })}</div></article>)}</div>
      </div>

      <div className="complete-row v2-complete-row">
        <div><span className="eyebrow">FINISH THIS BLOCK</span><h3><PhoneticText text="完成本節" /></h3><p>兩個互動任務都完成後，「完成本節」才會亮起；這樣上課紀錄與獎勵邏輯會保持一致。</p></div>
        <div className="complete-buttons">{settings.children.filter((child) => participants.includes(child.id)).map((child) => {
          const childProgress = normalizeProgress(progress[child.id]);
          const done = childProgress.completedBlocks.includes(block.id);
          const ready = block.missions.every((mission) => childProgress.completedMissions.includes(mission.id));
          const rewards = calculateRewards(childProgress);
          return <button key={child.id} disabled={!done && !ready} className={`complete-button ${done ? 'done' : ''} ${ready ? 'ready' : ''}`} onClick={() => onToggleBlock(child.id, block)}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={31} /> {child.name} {done ? <><CheckCircle2 size={18} /> 已完成</> : ready ? <>通關 +{BLOCK_REWARD.xp} XP</> : <>先完成 2 個任務</>}</button>;
        })}</div>
      </div>
    </section>
  );
}

function SettingsView({ settings, setSettings, progress, attendance, reflections, setProgress, setAttendance, setReflections, familyPin, cloudStatus, cloudMessage, lastCloudSync, onSyncNow, onPullCloud, onSwitchFamily, onOpenFamily, goHome }: {
  settings: AppSettings;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
  progress: AppProgress;
  attendance: AttendanceMap;
  reflections: ReflectionMap;
  setProgress: Dispatch<SetStateAction<AppProgress>>;
  setAttendance: Dispatch<SetStateAction<AttendanceMap>>;
  setReflections: Dispatch<SetStateAction<ReflectionMap>>;
  familyPin: string;
  cloudStatus: CloudStatus;
  cloudMessage: string;
  lastCloudSync: string;
  onSyncNow: () => Promise<void>;
  onPullCloud: () => Promise<boolean>;
  onSwitchFamily: () => void;
  onOpenFamily: (pin: string) => void;
  goHome: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nextFamilyPin, setNextFamilyPin] = useState('');
  const [pinSwitchError, setPinSwitchError] = useState('');

  const addChild = () => {
    const id = `child-${Date.now()}`;
    const child: ChildProfile = { id, name: `小朋友 ${settings.children.length + 1}`, avatar: avatarOptions[settings.children.length % avatarOptions.length].id };
    setSettings((current) => ({ ...current, children: [...current.children, child] }));
  };
  const updateChild = (id: string, patch: Partial<ChildProfile>) => setSettings((current) => ({ ...current, children: current.children.map((child) => child.id === id ? { ...child, ...patch } : child) }));
  const removeChild = (id: string) => { if (settings.children.length > 1) setSettings((current) => ({ ...current, children: current.children.filter((child) => child.id !== id) })); };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: 2, settings, progress, attendance, reflections }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `星際共學基地-V2-學習紀錄-${ymd(new Date())}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const resetProgress = () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    setProgress({}); setAttendance({}); setReflections({}); setConfirmReset(false);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(familyPin);
    setCopied(true); window.setTimeout(() => setCopied(false), 1300);
  };

  const openAnotherFamily = () => {
    const normalized = normalizeFamilyPin(nextFamilyPin);
    if (!validFamilyPin(normalized)) {
      setPinSwitchError('請輸入 4–6 位數字 PIN。');
      return;
    }
    if (normalized === familyPin) {
      setPinSwitchError('這就是目前家庭的 PIN。');
      return;
    }
    setPinSwitchError('');
    onOpenFamily(normalized);
  };

  return (
    <div className="page settings-page v2-settings">
      <div className="page-heading"><button className="icon-button" onClick={goHome}><ArrowLeft size={19} /></button><div><span className="eyebrow">CONTROL CENTER · V2</span><h1><PhoneticText text="家庭共學設定" /></h1><p>每個家庭以專屬 PIN 識別。相同 PIN 在手機、平板、Mac 與 Windows 會讀取同一份獨立進度；不同家庭彼此分開。</p></div></div>

      <section className="settings-card"><div className="setting-label"><span className="setting-icon"><Sun size={20} /></span><div><h3>顯示明暗</h3><p>亮色、暗色或跟隨裝置系統。</p></div></div><div className="segmented-control">{(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => <button key={mode} className={settings.theme === mode ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, theme: mode }))}>{mode === 'system' ? <Monitor size={17} /> : mode === 'light' ? <Sun size={17} /> : <Moon size={17} />}{mode === 'system' ? '隨系統' : mode === 'light' ? '明亮' : '暗黑'}</button>)}</div></section>

      <section className="settings-card vertical theme-settings-card">
        <div className="setting-label"><span className="setting-icon">🎮</span><div><h3>冒險主題風格</h3><p>只借用「類型感」而非版權角色。套用後背景、面板、按鈕、遊標與點擊特效都會一起換。</p></div></div>
        <div className="visual-theme-grid">{visualThemeOptions.map((option) => <button key={option.id} className={`visual-theme-option ${settings.visualTheme === option.id ? 'active' : ''}`} onClick={() => setSettings((current) => ({ ...current, visualTheme: option.id }))}><span>{option.icon}</span><div><strong>{option.title}</strong><small>{option.subtitle}</small></div>{settings.visualTheme === option.id && <CheckCircle2 size={18} />}</button>)}</div>
      </section>

      <section className="settings-card"><div className="setting-label"><span className="setting-icon"><CalendarDays size={20} /></span><div><h3>學期起始日</h3><p>改日期後，90 個平日課程會自動重新排程，首頁月份日曆也一起更新。</p></div></div><input className="date-input" type="date" value={settings.semesterStart} onChange={(e) => setSettings((current) => ({ ...current, semesterStart: e.target.value }))} /></section>

      <section className="settings-card vertical">
        <div className="setting-label"><span className="setting-icon"><Users size={20} /></span><div><h3><PhoneticText text="小小探險隊" />頭像</h3><p>每位孩子選一位原創英雄。XP 增加時角色會自動從第 1 階進化到第 4 階，不需要另外購買或手動升級。</p></div></div>
        <div className="children-settings-list v2-children-settings">{settings.children.map((child) => {
          const rewards = calculateRewards(progress[child.id]); const stage = avatarStageFromXp(rewards.xp);
          return <div className="child-setting-card" key={child.id}><div className="child-setting-head"><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={94} showStage /><div className="child-name-editor"><input value={child.name} onChange={(e) => updateChild(child.id, { name: e.target.value })} /><span>{avatarName(child.avatar)} · Level {levelFromXp(rewards.xp)} · 進化 {stage}/4</span><div className="child-inline-stats"><span><Zap size={15} /> {rewards.xp} XP</span><span><Coins size={15} /> {rewards.coins}</span></div></div><button className="icon-button danger" onClick={() => removeChild(child.id)} disabled={settings.children.length <= 1}><Trash2 size={17} /></button></div><div className="avatar-choice-grid">{avatarOptions.map((option) => <button key={option.id} className={normalizeAvatarId(child.avatar) === option.id ? 'active' : ''} onClick={() => updateChild(child.id, { avatar: option.id })}><AvatarHero avatarId={option.id} xp={rewards.xp} size={46} /><span>{option.short}</span></button>)}</div></div>;
        })}</div>
        <button className="secondary-button add-child" onClick={addChild}><Plus size={18} /> 新增小朋友</button>
      </section>

      <section className="settings-card vertical cloud-settings-card pin-profile-card">
        <div className="setting-label"><span className="setting-icon"><KeyRound size={20} /></span><div><h3><PhoneticText text="家庭 PIN" /> 與雲端同步</h3><p>目前登入的家庭資料會自動存到 Vercel 私有雲端；同一組 PIN 在其他裝置登入，就會讀取同一份進度。</p></div></div>
        <div className="cloud-active-panel">
          <div className="cloud-code-box pin-code-box"><span>目前家庭 PIN</span><strong>{familyPin}</strong><button className="icon-button" onClick={() => void copyCode()} title="複製家庭 PIN">{copied ? <Check size={18} /> : <Copy size={18} />}</button></div>
          <div className="family-pin-switcher">
            <div><strong>新增／切換家庭 PIN</strong><span>新 PIN 會建立新的家庭設定檔；已存在的 PIN 會載入原本那一家。</span></div>
            <div className="family-pin-switch-row"><input type="password" inputMode="numeric" maxLength={6} value={nextFamilyPin} onChange={(e) => { setNextFamilyPin(normalizeFamilyPin(e.target.value)); setPinSwitchError(''); }} onKeyDown={(e) => { if (e.key === 'Enter') openAnotherFamily(); }} placeholder="例如 0000" /><button className="secondary-button" disabled={!validFamilyPin(nextFamilyPin)} onClick={openAnotherFamily}><KeyRound size={17} /> 開啟家庭</button></div>
            {pinSwitchError && <div className="pin-error inline-pin-error">{pinSwitchError}</div>}
          </div>
          <div className={`cloud-status-box cloud-${cloudStatus}`}><CloudPill status={cloudStatus} /><p>{cloudMessage || '進度變更後會自動同步到這個家庭。'}</p>{lastCloudSync && <small>最近同步：{new Date(lastCloudSync).toLocaleString('zh-TW')}</small>}</div>
          <div className="cloud-actions"><button className="secondary-button" onClick={() => void onSyncNow()}><Cloud size={17} /> 立即儲存</button><button className="secondary-button" onClick={() => void onPullCloud()}><RefreshCw size={17} /> 重新讀取雲端</button><button className="secondary-button danger-outline" onClick={onSwitchFamily}><LogOut size={17} /> 切換家庭</button></div>
          <p className="cloud-security-note">4 位 PIN 的主要用途是區分家庭資料，不等同銀行等級密碼。請避免使用生日或公開資訊；若分享給朋友，請各家使用不同 PIN。</p>
        </div>
      </section>

      <section className="settings-card vertical"><div className="setting-label"><span className="setting-icon"><BookOpen size={20} /></span><div><h3>資料備份與重設</h3><p>可另外匯出完整 V2 JSON。清除進度採兩次確認；若雲端同步開啟，清除後的新狀態也會同步到雲端。</p></div></div><div className="data-actions"><button className="secondary-button" onClick={exportData}>匯出完整學習紀錄 JSON</button><button className={`secondary-button danger-outline ${confirmReset ? 'confirming' : ''}`} onClick={resetProgress}>{confirmReset ? '再按一次確認清除' : '清除所有學習進度'}</button></div></section>
    </div>
  );
}

function PinGate({ onEnter }: { onEnter: (pin: string) => void }) {
  const legacyDetected = hasLegacyLocalData();
  const [pin, setPin] = useState(legacyDetected ? '1234' : '');
  const [error, setError] = useState('');

  const submit = () => {
    const normalized = normalizeFamilyPin(pin);
    if (!validFamilyPin(normalized)) {
      setError('請輸入 4–6 位數字 PIN。');
      return;
    }
    setError('');
    onEnter(normalized);
  };

  return (
    <main className="pin-gate-shell">
      <section className="pin-gate-card">
        <div className="pin-gate-visual" aria-hidden="true">
          <div className="pin-orb pin-orb-one" /><div className="pin-orb pin-orb-two" />
          <div className="pin-shield"><KeyRound size={38} /></div>
          <span>★</span><span>✦</span><span>●</span>
        </div>
        <div className="pin-gate-copy">
          <span className="eyebrow">FAMILY PROFILE · V2.1</span>
          <h1><PhoneticText text="歡迎回到星際共學基地" /></h1>
          <p>輸入家庭專屬 PIN，系統會自動載入這一家人的孩子名單、課程進度、XP、金幣與上課紀錄。首頁不公開列出其他家庭設定檔。</p>
          {legacyDetected && <div className="legacy-pin-note"><Sparkles size={17} /><span>偵測到這台裝置有舊版學習資料，已為你預填家庭 PIN <strong>1234</strong>；第一次進入後會自動建立獨立雲端資料。</span></div>}
          <label className="pin-input-label" htmlFor="family-pin">家庭 PIN</label>
          <div className="pin-input-row">
            <KeyRound size={21} />
            <input id="family-pin" type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} value={pin} onChange={(event) => setPin(normalizeFamilyPin(event.target.value))} onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} placeholder="例如 1234" autoFocus />
            <button className="primary-button" disabled={!validFamilyPin(pin)} onClick={submit}>進入家庭基地 <ChevronRight size={18} /></button>
          </div>
          {error && <div className="pin-error">{error}</div>}
          <div className="pin-privacy-note"><Cloud size={16} /><span>PIN 只在裝置與加密連線中使用；雲端儲存路徑會先經伺服器 HMAC 轉換，不直接以 PIN 命名。</span></div>
        </div>
      </section>
    </main>
  );
}

function App() {
  const [familyPin, setFamilyPin] = useState(() => {
    const saved = normalizeFamilyPin(localStorage.getItem(ACTIVE_PIN_KEY) ?? '');
    return validFamilyPin(saved) ? saved : '';
  });

  const enterFamily = (pin: string) => {
    localStorage.setItem(ACTIVE_PIN_KEY, pin);
    setFamilyPin(pin);
  };

  const switchFamily = () => {
    localStorage.removeItem(ACTIVE_PIN_KEY);
    setFamilyPin('');
  };

  if (!familyPin) return <PinGate onEnter={enterFamily} />;
  return <FamilyApp key={familyPin} familyPin={familyPin} onSwitchFamily={switchFamily} onOpenFamily={enterFamily} />;
}

export default App;
