import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { curriculum } from './data/curriculum';
import { normalizeAvatarId } from './components/AvatarHero';
import AdventureDashboard from './v4/Dashboard';
import LessonQuest from './v4/LessonQuest';
import type { RewardMoment } from './v4/RewardModal';
import { playV4Sound } from './v4/sound';
import { AchievementsPage, SecondaryPageShell, ReportPage, SemesterPage, ShopPage } from './v4/SecondaryViews';
import ParentSettings from './v4/ParentSettings';
import { AdminPinDialog, FamilySetupDialog, UserSwitchDialog } from './v4/ParentAccess';
import { normalizeUserRole } from './v4/caregivers';
import type { DashboardViewKey } from './v4/Dashboard';
import { createFamilySession, loadCloudSnapshot, normalizeFamilyPin, saveCloudSnapshot, validFamilyPin } from './cloud';
import type { FamilySession } from './cloud';
import {
  accuracyBonus,
  BLOCK_REWARD,
  calculateRewards,
  DAILY_COMPLETE_BONUS,
  easterEggDays,
  EGG_REWARD,
  FIRST_DAILY_BONUS,
  levelFromXp,
  normalizeProgress,
  SPECIAL_TASK_BONUS,
} from './rewards';
import { applyNewBadgeUnlocks } from './badges';
import { mergeProgressMaps, progressEqual } from './stateMerge';
import { purchaseShopItem, toggleShopItem, type ShopActionResult } from './shopService';
import { visualThemeOptions } from './uiData';
import {
  addCourseWeekdaysYmd,
  courseDayAccess,
  fetchTrustedTaipeiDate,
  msUntilNextTaipeiMidnight,
  taipeiYmd,
} from './dailyChallenge';
import type { CourseDayAccess, TrustedTaipeiDate } from './dailyChallenge';
import type {
  AppProgress,
  AppSettings,
  AttendanceMap,
  AnswerEvent,
  ChildProfile,
  ChildProgress,
  CloudSnapshot,
  CourseDay,
  DayReflection,
  LessonBlock,
  ReflectionMap,
  FamilyUserProfile,
} from './types';

const SETTINGS_KEY = 'star-learning-settings-v1';
const PROGRESS_KEY = 'star-learning-progress-v1';
const ATTENDANCE_KEY = 'star-learning-attendance-v1';
const REFLECTION_KEY = 'star-learning-reflections-v1';
const ACTIVE_SESSION_KEY = 'star-learning-active-family-session-v40';
const ACTIVE_PIN_KEY = 'star-learning-active-family-pin-v22';
const LEGACY_ACTIVE_PIN_KEY = 'star-learning-active-family-pin-v21';

const familyStorageKey = (familyId: string, kind: 'settings' | 'progress' | 'attendance' | 'reflections') =>
  `star-learning-v40:${familyId}:${kind}`;
const legacyV22FamilyStorageKey = (pin: string, kind: 'settings' | 'progress' | 'attendance' | 'reflections') =>
  `star-learning-v22:${pin}:${kind}`;
const legacyV21FamilyStorageKey = (pin: string, kind: 'settings' | 'progress' | 'attendance' | 'reflections') =>
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
  voicePreference: 'female',
  voiceRate: 0.78,
  semesterStart: '2026-08-31',
  users: [
    { id: 'user-father', name: '爸爸', role: 'father', disabled: false },
    { id: 'user-mother', name: '媽媽', role: 'mother', disabled: false },
  ],
  children: [
    { id: 'child-1', name: '哥哥', avatar: 'nova', role: 'child', disabled: false },
    { id: 'child-2', name: '弟弟', avatar: 'rex', role: 'child', disabled: false },
  ],
  cloudSync: { enabled: false, familyCode: '' },
};

const emptyReflection = (): DayReflection => ({ engagement: '', note: '', viewing: {}, dailyChallenge: { warmup: false, learn: false } });
const emptyProgress = (): ChildProgress => normalizeProgress();

type CloudStatus = 'local' | 'loading' | 'saving' | 'synced' | 'error';
const LOCAL_FAMILY_KEY = '__local__';

async function withFamilyProgressLock<T>(familyId: string, task: () => Promise<T> | T): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(`little-explorers:progress:${familyId}`, task);
  }
  return task();
}
const RewardModal = lazy(() => import('./v4/RewardModal'));

function safeLoad<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readStoredFamilySession(): FamilySession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FamilySession>;
    if (/^[a-f0-9]{64}$/.test(parsed.familyId ?? '') && typeof parsed.token === 'string' && parsed.token.length >= 32 && typeof parsed.expiresAt === 'string') {
      return parsed as FamilySession;
    }
  } catch { /* Invalid persisted sessions fall back to local mode. */ }
  localStorage.removeItem(ACTIVE_SESSION_KEY);
  return null;
}

function readLegacyActivePin() {
  const pin = normalizeFamilyPin(localStorage.getItem(ACTIVE_PIN_KEY) ?? localStorage.getItem(LEGACY_ACTIVE_PIN_KEY) ?? '');
  return validFamilyPin(pin) ? pin : '';
}

function writeFamilySnapshotCache(familyId: string, snapshot: CloudSnapshot) {
  const secureSettings = { ...snapshot.settings, cloudSync: { enabled: true, familyCode: familyId } };
  localStorage.setItem(familyStorageKey(familyId, 'settings'), JSON.stringify(secureSettings));
  localStorage.setItem(familyStorageKey(familyId, 'progress'), JSON.stringify(snapshot.progress ?? {}));
  localStorage.setItem(familyStorageKey(familyId, 'attendance'), JSON.stringify(snapshot.attendance ?? {}));
  localStorage.setItem(familyStorageKey(familyId, 'reflections'), JSON.stringify(snapshot.reflections ?? {}));
}

function migrateLegacyFamilyStorage(pin: string, familyId: string) {
  const kinds = ['settings', 'progress', 'attendance', 'reflections'] as const;
  kinds.forEach((kind) => {
    const target = familyStorageKey(familyId, kind);
    if (!localStorage.getItem(target)) {
      const source = localStorage.getItem(legacyV22FamilyStorageKey(pin, kind))
        ?? localStorage.getItem(legacyV21FamilyStorageKey(pin, kind))
        ?? (pin === '1234' ? localStorage.getItem(kind === 'settings' ? SETTINGS_KEY : kind === 'progress' ? PROGRESS_KEY : kind === 'attendance' ? ATTENDANCE_KEY : REFLECTION_KEY) : null);
      if (source) {
        if (kind === 'settings') {
          try {
            const parsed = JSON.parse(source) as Partial<AppSettings>;
            parsed.cloudSync = { enabled: true, familyCode: familyId };
            localStorage.setItem(target, JSON.stringify(parsed));
          } catch { /* Ignore malformed legacy settings rather than persisting a PIN-bearing payload. */ }
        } else {
          localStorage.setItem(target, source);
        }
      }
    }
    localStorage.removeItem(legacyV22FamilyStorageKey(pin, kind));
    localStorage.removeItem(legacyV21FamilyStorageKey(pin, kind));
  });
  const legacyUser = sessionStorage.getItem(`star-learning-v22:${pin}:active-user`) ?? sessionStorage.getItem(`star-learning-v21:${pin}:active-user`);
  if (legacyUser) sessionStorage.setItem(`star-learning-v40:${familyId}:active-user`, legacyUser);
  sessionStorage.removeItem(`star-learning-v22:${pin}:active-user`);
  sessionStorage.removeItem(`star-learning-v21:${pin}:active-user`);
  localStorage.removeItem(ACTIVE_PIN_KEY);
  localStorage.removeItem(LEGACY_ACTIVE_PIN_KEY);
}

function normalizeSettings(raw?: Partial<AppSettings> | null): AppSettings {
  const theme = raw?.theme === 'light' || raw?.theme === 'dark' || raw?.theme === 'system' ? raw.theme : 'system';
  const visualTheme = visualThemeOptions.some((option) => option.id === raw?.visualTheme) ? raw!.visualTheme! : 'hero';
  const rawChildren = Array.isArray(raw?.children) ? raw!.children! : [];
  const legacyCaregivers = rawChildren.filter((child) => child.role === 'father' || child.role === 'mother' || child.role === 'caregiver' || child.role === 'other');
  const learnerSource = rawChildren.filter((child) => !legacyCaregivers.includes(child));
  const children = (learnerSource.length ? learnerSource : defaultSettings.children).map((child, index) => ({
    id: child.id || `child-${index + 1}`,
    name: child.name || `小朋友 ${index + 1}`,
    avatar: normalizeAvatarId(child.avatar),
    role: 'child' as const,
    disabled: Boolean(child.disabled),
  }));
  const rawUsers = Array.isArray(raw?.users) ? raw!.users! : [];
  const userSource = rawUsers.length ? rawUsers : legacyCaregivers.length ? legacyCaregivers.map((child) => ({
    id: `user-${child.id}`,
    name: child.name,
    role: normalizeUserRole(child.role),
    disabled: child.disabled,
    userPinHash: child.userPinHash,
    userPinSalt: child.userPinSalt,
    userPinIterations: child.userPinIterations,
  })) : defaultSettings.users;
  const users: FamilyUserProfile[] = userSource.map((user, index) => ({
    id: user.id || `user-${index + 1}`,
    name: user.name || `照顧者 ${index + 1}`,
    role: normalizeUserRole(user.role),
    disabled: Boolean(user.disabled),
    userPinHash: typeof user.userPinHash === 'string' ? user.userPinHash : '',
    userPinSalt: typeof user.userPinSalt === 'string' ? user.userPinSalt : '',
    userPinIterations: typeof user.userPinIterations === 'number' ? user.userPinIterations : 0,
  }));
  return {
    theme,
    visualTheme,
    voicePreference: raw?.voicePreference === 'male' ? 'male' : 'female',
    voiceId: typeof raw?.voiceId === 'string' ? raw.voiceId.slice(0, 320) : undefined,
    voiceRate: raw?.voiceRate === 0.9 ? 0.9 : 0.78,
    semesterStart: raw?.semesterStart || defaultSettings.semesterStart,
    users,
    children,
    cloudSync: {
      enabled: Boolean(raw?.cloudSync?.enabled),
      familyCode: String(raw?.cloudSync?.familyCode ?? '').slice(0, 64),
    },
  };
}

function loadFamilyValue<T>(familyId: string, kind: 'settings' | 'progress' | 'attendance' | 'reflections', legacyKey: string, fallback: T): T {
  const currentKey = familyStorageKey(familyId, kind);
  if (localStorage.getItem(currentKey)) return safeLoad<T>(currentKey, fallback);
  if (familyId === LOCAL_FAMILY_KEY && hasLegacyLocalData()) return safeLoad<T>(legacyKey, fallback);
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

function snapshotNow(settings: AppSettings, progress: AppProgress, attendance: AttendanceMap, reflections: ReflectionMap): CloudSnapshot {
  const cloudSafeSettings = { ...settings, cloudSync: { enabled: true, familyCode: '' } };
  return { version: 2, updatedAt: new Date().toISOString(), settings: cloudSafeSettings, progress, attendance, reflections };
}

function blockAccuracyReward(progress: ChildProgress, blockId: string) {
  const answers = (progress.answerEvents ?? []).filter((event) => event.blockId === blockId);
  return accuracyBonus(answers.filter((event) => event.correct).length, answers.length);
}

type OpenFamily = (pin: string, seed?: CloudSnapshot) => Promise<boolean>;

function FamilyApp({ familySession, onSwitchFamily, onOpenFamily, onRefreshSession }: {
  familySession: FamilySession | null;
  onSwitchFamily: () => void;
  onOpenFamily: OpenFamily;
  onRefreshSession: (session: FamilySession) => void;
}) {
  const familyId = familySession?.familyId ?? LOCAL_FAMILY_KEY;
  const isLocalFamily = !familySession;
  const initialSettings = useMemo(() => {
    const raw = loadFamilyValue<Partial<AppSettings>>(familyId, 'settings', SETTINGS_KEY, defaultSettings);
    const normalized = normalizeSettings(raw);
    return { ...normalized, cloudSync: { enabled: !isLocalFamily, familyCode: isLocalFamily ? '' : familyId } };
  }, [familyId, isLocalFamily]);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [progress, setProgress] = useState<AppProgress>(() => normalizeProgressMap(loadFamilyValue<AppProgress>(familyId, 'progress', PROGRESS_KEY, {}), initialSettings.children));
  const [attendance, setAttendance] = useState<AttendanceMap>(() => loadFamilyValue<AttendanceMap>(familyId, 'attendance', ATTENDANCE_KEY, {}));
  const [reflections, setReflections] = useState<ReflectionMap>(() => loadFamilyValue<ReflectionMap>(familyId, 'reflections', REFLECTION_KEY, {}));
  const [view, setView] = useState<'home' | 'semester' | 'achievements' | 'report' | 'shop' | 'settings'>('home');
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<0 | 1 | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('little-explorers-v4-sound') !== 'off');
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(() => isLocalFamily ? 'local' : 'loading');
  const [cloudMessage, setCloudMessage] = useState(() => isLocalFamily ? '目前使用本機家庭模式；Child Mode 不需要 PIN。' : '正在驗證家庭安全工作階段…');
  const [cloudReady, setCloudReady] = useState(isLocalFamily);
  const [lastCloudSync, setLastCloudSync] = useState('');
  const [rewardMoment, setRewardMoment] = useState<RewardMoment | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPromptOpen, setAdminPromptOpen] = useState(false);
  const [adminDestination, setAdminDestination] = useState<'report' | 'settings'>('report');
  const [familySetupOpen, setFamilySetupOpen] = useState(false);
  const activeUserKey = `star-learning-v40:${familyId}:active-user`;
  // V6.2: Child Experience is never blocked by caregiver selection on first run.
  // Adult identity is requested only when the user explicitly enters Parent/Report/Settings flows.
  const [userPromptOpen, setUserPromptOpen] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null>(() => sessionStorage.getItem(activeUserKey));
  const [trustedDate, setTrustedDate] = useState<TrustedTaipeiDate>(() => ({
    ymd: taipeiYmd(),
    verified: false,
    source: 'device-fallback',
  }));
  const cloudUpdatedAtRef = useRef('');
  const progressStorageKey = familyStorageKey(familyId, 'progress');
  const progressRef = useRef(progress);

  const mutateProgressAtomically = async (mutator: (current: AppProgress) => { next: AppProgress; result: ShopActionResult }) => {
    return withFamilyProgressLock(familyId, async () => {
      const stored = normalizeProgressMap(safeLoad<AppProgress>(progressStorageKey, {}), settings.children);
      const base = mergeProgressMaps(stored, progressRef.current, settings.children);
      const mutation = mutator(base);
      const merged = mergeProgressMaps(base, mutation.next, settings.children);
      localStorage.setItem(progressStorageKey, JSON.stringify(merged));
      progressRef.current = merged;
      setProgress((current) => mergeProgressMaps(current, merged, settings.children));
      return mutation.result;
    });
  };

  useEffect(() => { progressRef.current = progress; }, [progress]);

  useEffect(() => {
    let cancelled = false;
    let midnightTimer: number | undefined;
    const syncTrustedDate = async () => {
      const next = await fetchTrustedTaipeiDate();
      if (cancelled) return;
      setTrustedDate(next);
      if (midnightTimer !== undefined) window.clearTimeout(midnightTimer);
      if (next.verified && next.serverNow) {
        midnightTimer = window.setTimeout(
          () => void syncTrustedDate(),
          msUntilNextTaipeiMidnight(next.serverNow),
        );
      }
    };
    void syncTrustedDate();
    const onVisible = () => { if (document.visibilityState === 'visible') void syncTrustedDate(); };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => void syncTrustedDate(), 5 * 60 * 1000);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
      if (midnightTimer !== undefined) window.clearTimeout(midnightTimer);
    };
  }, []);

  useEffect(() => {
    if (!soundEnabled) return;
    const playClick = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target.closest('button,a,[role="button"]') : null;
      if (!target || target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') return;
      playV4Sound('click');
    };
    document.addEventListener('pointerdown', playClick, true);
    return () => document.removeEventListener('pointerdown', playClick, true);
  }, [soundEnabled]);

  useEffect(() => {
    if (!soundEnabled || !rewardMoment) return;
    playV4Sound(rewardMoment.kind === 'treasure' ? 'treasure' : rewardMoment.levelUp ? 'fanfare' : 'success');
  }, [soundEnabled, rewardMoment?.id]);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('v4-offscreen', !entry.isIntersecting));
    }, { rootMargin: '120px 0px' });
    const timer = window.setTimeout(() => {
      document.querySelectorAll('.v5-ai-bot,.v5-hero-character,.v5-rocket-flyby,.v4-chest-visual,.v4-reward-orbit').forEach((element) => observer.observe(element));
    }, 0);
    return () => { window.clearTimeout(timer); observer.disconnect(); };
  }, [view, selectedDayId, selectedLessonIndex]);

  useEffect(() => {
    setProgress((current) => normalizeProgressMap(current, settings.children));
    if (activeUserId) {
      const currentUser = settings.users.find((user) => user.id === activeUserId);
      if (!currentUser || currentUser.disabled) {
        sessionStorage.removeItem(activeUserKey);
        setActiveUserId(null);
        setUserPromptOpen(false);
      }
    }
  }, [settings.children, settings.users, activeUserId, activeUserKey]);

  useEffect(() => localStorage.setItem(familyStorageKey(familyId, 'settings'), JSON.stringify(settings)), [settings, familyId]);
  useEffect(() => {
    let cancelled = false;
    void withFamilyProgressLock(familyId, async () => {
      const stored = normalizeProgressMap(safeLoad<AppProgress>(progressStorageKey, {}), settings.children);
      const merged = mergeProgressMaps(stored, progress, settings.children);
      const serialized = JSON.stringify(merged);
      if (localStorage.getItem(progressStorageKey) !== serialized) localStorage.setItem(progressStorageKey, serialized);
      if (!cancelled && !progressEqual(progress, merged)) {
        progressRef.current = merged;
        setProgress((current) => {
          const next = mergeProgressMaps(current, merged, settings.children);
          return progressEqual(current, next) ? current : next;
        });
      }
    });
    return () => { cancelled = true; };
  }, [progress, familyId, progressStorageKey, settings.children]);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== progressStorageKey || !event.newValue) return;
      try {
        const incoming = normalizeProgressMap(JSON.parse(event.newValue) as AppProgress, settings.children);
        setProgress((current) => {
          const next = mergeProgressMaps(current, incoming, settings.children);
          progressRef.current = next;
          return progressEqual(current, next) ? current : next;
        });
      } catch { /* Ignore malformed external storage writes. */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [progressStorageKey, settings.children]);
  useEffect(() => localStorage.setItem(familyStorageKey(familyId, 'attendance'), JSON.stringify(attendance)), [attendance, familyId]);
  useEffect(() => localStorage.setItem(familyStorageKey(familyId, 'reflections'), JSON.stringify(reflections)), [reflections, familyId]);
  useEffect(() => {
    if (!isLocalFamily) return;
    // State has already been loaded synchronously and persisted into the V4 local namespace above.
    [SETTINGS_KEY, PROGRESS_KEY, ATTENDANCE_KEY, REFLECTION_KEY].forEach((key) => localStorage.removeItem(key));
  }, [isLocalFamily]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.adventureTheme = settings.visualTheme;
    root.dataset.voicePreference = settings.voicePreference ?? 'female';
    root.dataset.voiceId = settings.voiceId ?? '';
    root.dataset.voiceRate = String(settings.voiceRate ?? 0.78);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && media.matches);
      root.classList.toggle('dark', dark);
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [settings.theme, settings.visualTheme]);

  const applyCloudSnapshot = (snapshot: CloudSnapshot) => {
    const remoteSettings = normalizeSettings(snapshot.settings);
    const nextSettings = { ...remoteSettings, cloudSync: { enabled: true, familyCode: familyId } };
    setCloudReady(false);
    setSettings(nextSettings);
    setProgress((current) => mergeProgressMaps(current, normalizeProgressMap(snapshot.progress, nextSettings.children), nextSettings.children));
    setAttendance(snapshot.attendance ?? {});
    setReflections(snapshot.reflections ?? {});
    cloudUpdatedAtRef.current = snapshot.updatedAt;
    setLastCloudSync(snapshot.updatedAt);
    window.setTimeout(() => setCloudReady(true), 0);
  };

  const pullCloud = async (force = true) => {
    if (!familySession) return false;
    setCloudStatus('loading');
    setCloudMessage('正在讀取這個家庭的雲端進度…');
    try {
      const snapshot = await loadCloudSnapshot(familySession);
      if (!snapshot) {
        setCloudReady(true);
        setCloudStatus('saving');
        setCloudMessage('雲端尚無資料，將建立第一份安全副本。');
        return false;
      }
      if (force || !cloudUpdatedAtRef.current || new Date(snapshot.updatedAt) > new Date(cloudUpdatedAtRef.current)) applyCloudSnapshot(snapshot);
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
    if (!familySession) return;
    void (async () => {
      try {
        const snapshot = await loadCloudSnapshot(familySession);
        if (snapshot) {
          applyCloudSnapshot(snapshot);
          setCloudStatus('synced');
          setCloudMessage('啟動時已讀取雲端進度。');
        } else {
          setCloudReady(true);
          setCloudStatus('saving');
          setCloudMessage('雲端尚無資料，正在建立第一份安全副本…');
        }
      } catch (error) {
        setCloudReady(false);
        setCloudStatus('error');
        setCloudMessage(error instanceof Error ? `${error.message}；為避免覆寫雲端，本機暫停自動上傳。` : '啟動時無法讀取雲端；為避免覆寫，本機暫停自動上傳。');
      }
    })();
    // The active family session is immutable for this FamilyApp instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!familySession || !cloudReady) return;
    const timer = window.setTimeout(async () => {
      setCloudStatus('saving');
      setCloudMessage('正在儲存最新進度…');
      try {
        const response = await saveCloudSnapshot(familySession, snapshotNow(settings, progress, attendance, reflections), cloudUpdatedAtRef.current);
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
  }, [settings, progress, attendance, reflections, cloudReady, familySession]);

  useEffect(() => {
    if (!familySession) return;
    const onVisible = () => { if (document.visibilityState === 'visible') void pullCloud(false); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [familySession]);

  const syncNow = async () => {
    if (!familySession) return;
    setCloudStatus('saving');
    try {
      const response = await saveCloudSnapshot(familySession, snapshotNow(settings, progress, attendance, reflections), cloudUpdatedAtRef.current);
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
  const enabledLearnerIds = settings.children.filter((child) => !child.disabled).map((child) => child.id);
  // A learner that is added after a day has first been opened must join the
  // lesson immediately. Older snapshots can contain a two-child attendance
  // list, which used to silently remove newly added siblings from every game.
  // Attendance remains in the snapshot for history/migration, but it may no
  // longer hide an enabled learner from the active lesson experience.
  const participantIds = (_day: CourseDay) => enabledLearnerIds;
  const isChildBlockDone = (childId: string, blockId: string) => Boolean(progress[childId]?.completedBlocks.includes(blockId));
  const isChildDayDone = (childId: string, day: CourseDay) => day.blocks.every((block) => isChildBlockDone(childId, block.id));
  const isDayDone = (day: CourseDay) => {
    const ids = participantIds(day);
    return ids.length > 0 && ids.every((id) => isChildDayDone(id, day));
  };

  const todayKey = trustedDate.ymd;
  const courseDateKey = (day: CourseDay) => addCourseWeekdaysYmd(settings.semesterStart, day.index - 1);
  const accessForDay = (day: CourseDay): CourseDayAccess => courseDayAccess(courseDateKey(day), todayKey);
  const canEarnToday = (day: CourseDay) => trustedDate.verified && accessForDay(day) === 'today';
  const challengeSteps = (day: CourseDay) => reflections[day.id]?.dailyChallenge ?? { warmup: false, learn: false };
  const todayDay = curriculum.find((day) => courseDateKey(day) === todayKey);
  const nextDay = curriculum.find((day) => courseDateKey(day) >= todayKey) ?? curriculum[curriculum.length - 1];
  const featuredDay = todayDay ?? nextDay;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const routeDayId = params.get('day');
    const routeLesson = Number(params.get('lesson'));
    if (!routeDayId) {
      if (selectedDayId && selectedLessonIndex !== null) {
        const selected = curriculum.find((day) => day.id === selectedDayId);
        if (!selected) {
          setSelectedDayId(null);
          setSelectedLessonIndex(null);
        }
      }
      return;
    }
    const routeDay = curriculum.find((day) => day.id === routeDayId);
    const validLesson = routeLesson === 1 || routeLesson === 2;
    if (!routeDay || !validLesson || (accessForDay(routeDay) !== 'today' && !adminUnlocked)) {
      window.history.replaceState({}, '', window.location.pathname);
      setSelectedDayId(null);
      setSelectedLessonIndex(null);
      return;
    }
    if (accessForDay(routeDay) === 'today') {
      setAttendance((current) => current[routeDay.id] ? current : { ...current, [routeDay.id]: enabledLearnerIds });
    }
    setSelectedDayId(routeDay.id);
    setSelectedLessonIndex((routeLesson - 1) as 0 | 1);
  }, [trustedDate.verified, trustedDate.ymd, settings.semesterStart, adminUnlocked]);

  const openLesson = (day: CourseDay, lessonIndex: 0 | 1) => {
    const access = accessForDay(day);
    if (access !== 'today' && !adminUnlocked) return;
    if (access === 'today') {
      setAttendance((current) => current[day.id] ? current : { ...current, [day.id]: enabledLearnerIds });
    }
    window.history.pushState({}, '', `${window.location.pathname}?day=${encodeURIComponent(day.id)}&lesson=${lessonIndex + 1}`);
    setSelectedLessonIndex(lessonIndex);
    setSelectedDayId(day.id);
  };

  const recordAnswer = (childId: string, day: CourseDay, block: LessonBlock, stage: number, target: string, answer: string, correct: boolean, confidence?: number) => {
    if (!canEarnToday(day)) return;
    const createdAt = new Date().toISOString();
    const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    // Daily review creates learning evidence but intentionally belongs to a
    // separate source, so it can never inflate this lesson's accuracy reward.
    const eventBlockId = stage === -1 ? `review:${block.id}` : stage === -2 ? `speaking:${block.id}` : block.id;
    const event: AnswerEvent = { id: `v4-answer:${eventBlockId}:${stage}:${childId}:${randomPart}`, dayId: day.id, blockId: eventBlockId, stage, target, answer, correct, confidence, createdAt };
    setProgress((current) => {
      const child = normalizeProgress(current[childId]);
      return { ...current, [childId]: { ...child, answerEvents: [...(child.answerEvents ?? []), event] } };
    });
  };

  const toggleMission = (childId: string, mission: LessonBlock['missions'][number]) => {
    const before = normalizeProgress(progress[childId]);
    if (before.completedMissions.includes(mission.id)) return;
    const parentDay = curriculum.find((day) => day.blocks.some((block) => block.missions.some((item) => item.id === mission.id)));
    if (!parentDay || !canEarnToday(parentDay)) return;
    const steps = challengeSteps(parentDay);
    const parentBlock = parentDay.blocks.find((block) => block.missions.some((item) => item.id === mission.id));
    const missionIndex = parentBlock?.missions.findIndex((item) => item.id === mission.id) ?? -1;
    const lessonStages = parentBlock ? reflections[parentDay.id]?.lessonStages?.[parentBlock.id] ?? [] : [];
    const requiredV4Stages = missionIndex === 0 ? [9,0,1,2,3,4] : missionIndex === 1 ? [9,0,1,2,3,4,5] : [];
    const v4Ready = requiredV4Stages.length > 0 && requiredV4Stages.every((stage) => lessonStages.includes(stage));
    const legacyReady = steps.warmup && steps.learn;
    if (!legacyReady && !v4Ready) return;
    const preview = applyNewBadgeUnlocks(before, { ...before, completedMissions: [...before.completedMissions, mission.id] }, todayKey);
    setProgress((current) => {
      const child = normalizeProgress(current[childId]);
      if (child.completedMissions.includes(mission.id)) return current;
      const rawNext = { ...child, completedMissions: [...child.completedMissions, mission.id] };
      const awarded = applyNewBadgeUnlocks(child, rawNext, todayKey);
      return { ...current, [childId]: awarded.progress };
    });
    const name = settings.children.find((child) => child.id === childId)?.name ?? '小朋友';
    const beforeLevel = Math.min(15, levelFromXp(calculateRewards(before).xp));
    const afterLevel = Math.min(15, levelFromXp(calculateRewards(preview.progress).xp));
    setRewardMoment({
      id: Date.now(), childName: name, kind: 'mission', xp: mission.xp, coins: mission.coins, stars: 0, gems: 0,
      badgeIds: preview.newBadgeIds,
      levelUp: afterLevel > beforeLevel ? afterLevel : undefined,
    });
  };

  const toggleBlock = (childId: string, day: CourseDay, block: LessonBlock) => {
    if (!canEarnToday(day)) return;
    const steps = challengeSteps(day);
    const lessonStages = reflections[day.id]?.lessonStages?.[block.id] ?? [];
    const v4Ready = [9,0,1,2,3,4,5,6].every((stage) => lessonStages.includes(stage));
    if (!(steps.warmup && steps.learn) && !v4Ready) return;
    const before = normalizeProgress(progress[childId]);
    if (before.completedBlocks.includes(block.id)) return;
    const allMissionsDone = block.missions.every((mission) => before.completedMissions.includes(mission.id));
    if (!allMissionsDone) return;

    const completionIso = new Date().toISOString();
    const nextBlocksPreview = Array.from(new Set([...before.completedBlocks, block.id]));
    const willFinishDay = day.blocks.every((item) => nextBlocksPreview.includes(item.id));
    const accuracy = blockAccuracyReward(before, block.id);
    const accuracyBonusId = `v4-accuracy:${block.id}:${childId}`;
    const dayBonusId = `v4-day:${day.id}:${childId}`;
    const firstDailyBonusId = `v4-first-daily:${day.id}:${childId}`;
    const previewTransactions = [...(before.rewardTransactions ?? [])];
    const accuracyAwarded = accuracy.xp + accuracy.coins + accuracy.stars + accuracy.gems > 0
      && !previewTransactions.some((transaction) => transaction.id === accuracyBonusId);
    const dayAwarded = willFinishDay && !previewTransactions.some((transaction) => transaction.id === dayBonusId);
    const firstDailyAwarded = willFinishDay && !previewTransactions.some((transaction) => transaction.id === firstDailyBonusId);

    if (accuracyAwarded) {
      previewTransactions.push({ id: accuracyBonusId, kind: 'achievement', sourceId: `${block.id}:accuracy-${accuracy.rate}`, xp: accuracy.xp, coins: accuracy.coins, stars: accuracy.stars, gems: accuracy.gems, createdAt: completionIso });
    }
    if (dayAwarded) {
      previewTransactions.push({ id: dayBonusId, kind: 'day', sourceId: day.id, ...DAILY_COMPLETE_BONUS, createdAt: completionIso });
    }
    if (firstDailyAwarded) {
      previewTransactions.push({ id: firstDailyBonusId, kind: 'achievement', sourceId: `${day.id}:first-complete`, ...FIRST_DAILY_BONUS, createdAt: completionIso });
    }

    const previewRaw: ChildProgress = {
      ...before,
      completedBlocks: nextBlocksPreview,
      completedDays: willFinishDay ? Array.from(new Set([...before.completedDays, day.id])) : before.completedDays,
      completionTimestamps: willFinishDay ? { ...(before.completionTimestamps ?? {}), [day.id]: before.completionTimestamps?.[day.id] ?? completionIso } : before.completionTimestamps,
      rewardTransactions: previewTransactions,
    };
    const preview = applyNewBadgeUnlocks(before, previewRaw, todayKey);

    setProgress((current) => {
      const child = normalizeProgress(current[childId]);
      if (child.completedBlocks.includes(block.id)) return current;
      const nextBlocks = Array.from(new Set([...child.completedBlocks, block.id]));
      const dayDone = day.blocks.every((item) => nextBlocks.includes(item.id));
      const childAccuracy = blockAccuracyReward(child, block.id);
      const rewardTransactions = [...(child.rewardTransactions ?? [])];
      if (childAccuracy.xp + childAccuracy.coins + childAccuracy.stars + childAccuracy.gems > 0 && !rewardTransactions.some((transaction) => transaction.id === accuracyBonusId)) {
        rewardTransactions.push({ id: accuracyBonusId, kind: 'achievement', sourceId: `${block.id}:accuracy-${childAccuracy.rate}`, xp: childAccuracy.xp, coins: childAccuracy.coins, stars: childAccuracy.stars, gems: childAccuracy.gems, createdAt: completionIso });
      }
      if (dayDone && !rewardTransactions.some((transaction) => transaction.id === dayBonusId)) {
        rewardTransactions.push({ id: dayBonusId, kind: 'day', sourceId: day.id, ...DAILY_COMPLETE_BONUS, createdAt: completionIso });
      }
      if (dayDone && !rewardTransactions.some((transaction) => transaction.id === firstDailyBonusId)) {
        rewardTransactions.push({ id: firstDailyBonusId, kind: 'achievement', sourceId: `${day.id}:first-complete`, ...FIRST_DAILY_BONUS, createdAt: completionIso });
      }
      const rawNext: ChildProgress = {
        ...child,
        completedBlocks: nextBlocks,
        completedDays: dayDone ? Array.from(new Set([...child.completedDays, day.id])) : child.completedDays,
        completionTimestamps: dayDone ? { ...(child.completionTimestamps ?? {}), [day.id]: child.completionTimestamps?.[day.id] ?? completionIso } : child.completionTimestamps,
        rewardTransactions,
      };
      const awarded = applyNewBadgeUnlocks(child, rawNext, todayKey);
      return { ...current, [childId]: awarded.progress };
    });

    const name = settings.children.find((child) => child.id === childId)?.name ?? '小朋友';
    const beforeLevel = Math.min(15, levelFromXp(calculateRewards(before).xp));
    const afterLevel = Math.min(15, levelFromXp(calculateRewards(preview.progress).xp));
    setRewardMoment({
      id: Date.now(),
      childName: name,
      kind: willFinishDay ? 'day' : 'lesson',
      xp: BLOCK_REWARD.xp + (accuracyAwarded ? accuracy.xp : 0) + (dayAwarded ? DAILY_COMPLETE_BONUS.xp : 0) + (firstDailyAwarded ? FIRST_DAILY_BONUS.xp : 0),
      coins: BLOCK_REWARD.coins + (accuracyAwarded ? accuracy.coins : 0) + (dayAwarded ? DAILY_COMPLETE_BONUS.coins : 0) + (firstDailyAwarded ? FIRST_DAILY_BONUS.coins : 0),
      stars: (accuracyAwarded ? accuracy.stars : 0) + (dayAwarded ? DAILY_COMPLETE_BONUS.stars : 0) + (firstDailyAwarded ? FIRST_DAILY_BONUS.stars : 0),
      gems: (accuracyAwarded ? accuracy.gems : 0) + (dayAwarded ? DAILY_COMPLETE_BONUS.gems : 0) + (firstDailyAwarded ? FIRST_DAILY_BONUS.gems : 0),
      badgeIds: preview.newBadgeIds,
      levelUp: afterLevel > beforeLevel ? afterLevel : undefined,
    });
  };

  const claimSpecialBonus = (childId: string, day: CourseDay) => {
    if (!canEarnToday(day) || !isChildDayDone(childId, day)) return;
    const child = normalizeProgress(progress[childId]);
    const transactionId = `v4-special:${day.id}:${childId}`;
    if (child.rewardTransactions?.some((transaction) => transaction.id === transactionId)) return;
    const createdAt = new Date().toISOString();
    const transaction = { id: transactionId, kind: 'bonus' as const, sourceId: `${day.id}:special-task`, ...SPECIAL_TASK_BONUS, createdAt };
    const previewProgress: ChildProgress = { ...child, rewardTransactions: [...(child.rewardTransactions ?? []), transaction] };
    setProgress((current) => {
      const item = normalizeProgress(current[childId]);
      if (!day.blocks.every((block) => item.completedBlocks.includes(block.id)) || item.rewardTransactions?.some((entry) => entry.id === transactionId)) return current;
      return { ...current, [childId]: { ...item, rewardTransactions: [...(item.rewardTransactions ?? []), transaction] } };
    });
    const name = settings.children.find((item) => item.id === childId)?.name ?? '小朋友';
    const beforeLevel = Math.min(15, levelFromXp(calculateRewards(child).xp));
    const afterLevel = Math.min(15, levelFromXp(calculateRewards(previewProgress).xp));
    setRewardMoment({ id: Date.now(), childName: name, kind: 'bonus', ...SPECIAL_TASK_BONUS, levelUp: afterLevel > beforeLevel ? afterLevel : undefined });
  };

  const claimEgg = (childId: string, day: CourseDay) => {
    if (!canEarnToday(day) || !easterEggDays.has(day.index)) return;
    const eggId = `egg-day-${day.index}`;
    const child = normalizeProgress(progress[childId]);
    if (child.claimedEggs.includes(eggId) || !isChildDayDone(childId, day)) return;
    const createdAt = new Date().toISOString();
    const transactionId = `v4-treasure:${eggId}:${childId}`;
    const previewTransactions = child.rewardTransactions?.some((transaction) => transaction.id === transactionId)
      ? child.rewardTransactions
      : [...(child.rewardTransactions ?? []), { id: transactionId, kind: 'treasure' as const, sourceId: eggId, xp: 0, coins: 0, stars: 0, gems: 3, createdAt }];
    const previewProgress: ChildProgress = { ...child, claimedEggs: [...child.claimedEggs, eggId], rewardTransactions: previewTransactions };
    setProgress((current) => {
      const item = normalizeProgress(current[childId]);
      if (item.claimedEggs.includes(eggId) || !isChildDayDone(childId, day)) return current;
      const rewardTransactions = item.rewardTransactions?.some((transaction) => transaction.id === transactionId)
        ? item.rewardTransactions
        : [...(item.rewardTransactions ?? []), { id: transactionId, kind: 'treasure' as const, sourceId: eggId, xp: 0, coins: 0, stars: 0, gems: 3, createdAt }];
      return { ...current, [childId]: { ...item, claimedEggs: [...item.claimedEggs, eggId], rewardTransactions } };
    });
    const name = settings.children.find((item) => item.id === childId)?.name ?? '小朋友';
    const beforeLevel = Math.min(15, levelFromXp(calculateRewards(child).xp));
    const afterLevel = Math.min(15, levelFromXp(calculateRewards(previewProgress).xp));
    setRewardMoment({ id: Date.now(), childName: name, kind: 'treasure', xp: EGG_REWARD.xp, coins: EGG_REWARD.coins, stars: 0, gems: 3, levelUp: afterLevel > beforeLevel ? afterLevel : undefined });
  };

  const unlockCosmetic = async (childId: string, cosmeticId: string): Promise<ShopActionResult> => {
    const avatarId = settings.children.find((entry) => entry.id === childId)?.avatar;
    return mutateProgressAtomically((current) => purchaseShopItem(current, childId, avatarId, cosmeticId));
  };

  const toggleCosmetic = async (childId: string, cosmeticId: string): Promise<ShopActionResult> => {
    const avatarId = settings.children.find((entry) => entry.id === childId)?.avatar;
    const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return mutateProgressAtomically((current) => toggleShopItem(current, childId, avatarId, cosmeticId, `avatar-equip:${childId}:${cosmeticId}:${randomPart}`));
  };

  const requestParentArea = () => {
    setAdminDestination('report');
    if (!activeUserId) {
      setUserPromptOpen(true);
      return;
    }
    if (isLocalFamily) {
      setFamilySetupOpen(true);
      return;
    }
    if (adminUnlocked) {
      setView('report');
      return;
    }
    setAdminPromptOpen(true);
  };

  const requestSettings = () => {
    setAdminDestination('settings');
    if (!activeUserId) {
      setUserPromptOpen(true);
      return;
    }
    if (isLocalFamily) {
      setFamilySetupOpen(true);
      return;
    }
    if (adminUnlocked) {
      setView('settings');
      return;
    }
    setAdminPromptOpen(true);
  };

  const promoteLocalFamily = async (pin: string) => {
    if (!isLocalFamily || !validFamilyPin(pin)) return false;
    const ok = await onOpenFamily(pin, snapshotNow(settings, progress, attendance, reflections));
    if (ok) setFamilySetupOpen(false);
    return ok;
  };

  const unlockAdmin = async (pin: string) => {
    if (!familySession || !validFamilyPin(pin)) return false;
    try {
      const refreshed = await createFamilySession(pin);
      if (refreshed.familyId !== familyId) return false;
      onRefreshSession(refreshed);
      setAdminUnlocked(true);
      setAdminPromptOpen(false);
      setView(adminDestination);
      return true;
    } catch {
      return false;
    }
  };

  const activateUser = (userId: string) => {
    setActiveUserId(userId);
    sessionStorage.setItem(activeUserKey, userId);
    setUserPromptOpen(false);
    if (isLocalFamily) setFamilySetupOpen(true);
    else if (!adminUnlocked) setAdminPromptOpen(true);
    else setView(adminDestination);
  };

  const retryTrustedDate = async () => setTrustedDate(await fetchTrustedTaipeiDate());
  const networkRecovery = !trustedDate.verified ? <div className="v6-network-recovery" role="status" aria-live="polite"><span>目前無法驗證台北時間；已切換為安全預覽，不會寫入 XP／Coins。</span><button type="button" onClick={() => void retryTrustedDate()}>重新確認連線</button></div> : null;
  const activeUser = activeUserId ? settings.users.find((user) => user.id === activeUserId) : undefined;
  const accessDialogs = <>
    {networkRecovery}
    {adminPromptOpen && !isLocalFamily && <AdminPinDialog onUnlock={unlockAdmin} onClose={() => setAdminPromptOpen(false)} />}
    {familySetupOpen && isLocalFamily && <FamilySetupDialog onSetPin={promoteLocalFamily} onClose={() => setFamilySetupOpen(false)} />}
    {userPromptOpen && <UserSwitchDialog users={settings.users} activeUserId={activeUserId} onActivate={activateUser} onClose={() => setUserPromptOpen(false)} />}
  </>;

  const navigateDashboard = (nextView: DashboardViewKey) => {
    if (nextView === 'report') {
      requestParentArea();
      return;
    }
    if (nextView === 'today') {
      setView('home');
      window.requestAnimationFrame(() => document.getElementById('today-course')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      return;
    }
    setView(nextView);
  };

  if (selectedDay && selectedLessonIndex !== null) {
    return (
      <>
        {networkRecovery}
        <LessonQuest
          day={selectedDay}
          lessonIndex={selectedLessonIndex}
          dateKey={courseDateKey(selectedDay)}
          settings={settings}
          progress={progress}
          participants={participantIds(selectedDay)}
          access={accessForDay(selectedDay)}
          trustedDateVerified={trustedDate.verified}
          reflection={reflections[selectedDay.id] ?? emptyReflection()}
          onUpdateReflection={(patch) => setReflections((current) => ({ ...current, [selectedDay.id]: { ...(current[selectedDay.id] ?? emptyReflection()), ...patch } }))}
          onToggleMission={toggleMission}
          onAnswer={(childId, target, answer, correct, stage, confidence) => recordAnswer(childId, selectedDay, selectedDay.blocks[selectedLessonIndex], stage, target, answer, correct, confidence)}
          onToggleBlock={(childId, block) => toggleBlock(childId, selectedDay, block)}
          onClaimSpecialBonus={claimSpecialBonus}
          onBack={() => { window.history.replaceState({}, '', window.location.pathname); setSelectedLessonIndex(null); setSelectedDayId(null); }}
        />
        {rewardMoment && <Suspense fallback={null}><RewardModal moment={rewardMoment} onClose={() => setRewardMoment(null)} /></Suspense>}
      </>
    );
  }

  if (view === 'home') {
    return (
      <>
        <AdventureDashboard
          activeView={view}
          settings={settings}
          progress={progress}
          trustedDate={trustedDate}
          todayDay={todayDay}
          featuredDay={featuredDay}
          courseDateKey={courseDateKey}
          accessForDay={accessForDay}
          isDayDone={isDayDone}
          isChildDayDone={isChildDayDone}
          onOpenLesson={openLesson}
          onNavigate={navigateDashboard}
          onParentArea={requestParentArea}
          cloudStatus={cloudStatus}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((value) => {
            const next = !value;
            localStorage.setItem('little-explorers-v4-sound', next ? 'on' : 'off');
            return next;
          })}
          onThemeChange={(visualTheme) => setSettings((current) => ({ ...current, visualTheme }))}
          onClaimTreasure={claimEgg}
          activeUser={activeUser}
          parentPreviewUnlocked={adminUnlocked}
        />
        {rewardMoment && <Suspense fallback={null}><RewardModal moment={rewardMoment} onClose={() => setRewardMoment(null)} /></Suspense>}
        {accessDialogs}
      </>
    );
  }

  if (view === 'semester') return <><SemesterPage settings={settings} progress={progress} trustedDate={trustedDate} cloudStatus={cloudStatus} courseDateKey={courseDateKey} accessForDay={accessForDay} isDayDone={isDayDone} onOpenLesson={openLesson} onNavigate={navigateDashboard} onParentArea={requestParentArea} parentPreviewUnlocked={adminUnlocked} activeUser={activeUser} />{accessDialogs}</>;
  if (view === 'achievements') return <><AchievementsPage settings={settings} progress={progress} trustedDate={trustedDate} cloudStatus={cloudStatus} onNavigate={navigateDashboard} onParentArea={requestParentArea} activeUser={activeUser} parentPreviewUnlocked={adminUnlocked} />{accessDialogs}</>;
  if (view === 'shop') return <><ShopPage settings={settings} progress={progress} trustedDate={trustedDate} cloudStatus={cloudStatus} onNavigate={navigateDashboard} onParentArea={requestParentArea} onUnlock={unlockCosmetic} onToggle={toggleCosmetic} activeUser={activeUser} parentPreviewUnlocked={adminUnlocked} />{accessDialogs}</>;
  if (view === 'report') return <><ReportPage settings={settings} progress={progress} trustedDate={trustedDate} cloudStatus={cloudStatus} isChildDayDone={isChildDayDone} onNavigate={navigateDashboard} onParentArea={requestParentArea} onSettings={requestSettings} activeUser={activeUser} parentPreviewUnlocked={adminUnlocked} />{accessDialogs}</>;

  return (
    <SecondaryPageShell settings={settings} progress={progress} active="report" trustedDate={trustedDate} cloudStatus={cloudStatus} onNavigate={navigateDashboard} onParentArea={requestParentArea} activeUser={activeUser} parentPreviewUnlocked={adminUnlocked}>
      <ParentSettings
        settings={settings}
        setSettings={setSettings}
        progress={progress}
        attendance={attendance}
        reflections={reflections}
        setProgress={setProgress}
        setAttendance={setAttendance}
        setReflections={setReflections}
        familyId={familyId}
        cloudStatus={cloudStatus}
        cloudMessage={cloudMessage}
        lastCloudSync={lastCloudSync}
        onSyncNow={syncNow}
        onPullCloud={() => pullCloud(true)}
        onSwitchFamily={onSwitchFamily}
        onOpenFamily={onOpenFamily}
        goHome={() => setView('home')}
      />
      {accessDialogs}
    </SecondaryPageShell>
  );
}

function App() {
  const [familySession, setFamilySession] = useState<FamilySession | null>(() => readStoredFamilySession());
  const [legacyMigrationPin, setLegacyMigrationPin] = useState(() => familySession ? '' : readLegacyActivePin());
  const [migrationError, setMigrationError] = useState('');
  const [migrationAttempted, setMigrationAttempted] = useState(false);

  const persistSession = (session: FamilySession) => {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem(ACTIVE_PIN_KEY);
    localStorage.removeItem(LEGACY_ACTIVE_PIN_KEY);
    setFamilySession(session);
  };

  const enterFamily: OpenFamily = async (pin, seed) => {
    try {
      const session = await createFamilySession(pin);
      if (familySession?.familyId === session.familyId && !seed) {
        persistSession(session);
        return false;
      }
      migrateLegacyFamilyStorage(pin, session.familyId);
      if (seed) writeFamilySnapshotCache(session.familyId, seed);
      persistSession(session);
      setLegacyMigrationPin('');
      setMigrationError('');
      return true;
    } catch (error) {
      setMigrationError(error instanceof Error ? error.message : '家庭安全工作階段建立失敗');
      return false;
    }
  };

  useEffect(() => {
    if (!legacyMigrationPin || familySession || migrationAttempted) return;
    setMigrationAttempted(true);
    void enterFamily(legacyMigrationPin);
    // One-time migration for legacy clear-text active PIN storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacyMigrationPin, familySession, migrationAttempted]);

  const refreshSession = (session: FamilySession) => persistSession(session);

  const switchFamily = () => {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    localStorage.removeItem(ACTIVE_PIN_KEY);
    localStorage.removeItem(LEGACY_ACTIVE_PIN_KEY);
    setLegacyMigrationPin('');
    setMigrationError('');
    setFamilySession(null);
  };

  if (legacyMigrationPin && !familySession) {
    return <div className="modal-scrim" role="status" aria-live="polite"><div className="game-modal admin-modal"><span className="eyebrow">SECURITY MIGRATION</span><h2>正在升級家庭安全登入</h2><p>舊版家庭資料仍完整保留；系統正在把明文 PIN 儲存方式轉成 signed family session。</p>{migrationError && <div className="pin-error">{migrationError}</div>}{migrationError && <button className="primary-button full" onClick={() => { setMigrationAttempted(false); setMigrationError(''); }}>重新驗證並升級</button>}</div></div>;
  }

  const familyKey = familySession?.familyId ?? LOCAL_FAMILY_KEY;
  return <FamilyApp key={familyKey} familySession={familySession} onSwitchFamily={switchFamily} onOpenFamily={enterFamily} onRefreshSession={refreshSession} />;
}

export default App;
