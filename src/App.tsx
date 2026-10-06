import { useSharedLessonStorage } from './useSharedLessonStorage';
import { dailyExcludedLearners, dailyParticipantIds } from './dailyParticipants';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { canEarnSemesterDay, courseEggId, normalizeSemesterSettings, resolveSemester, resolveSemesterRoute, selectSemester, semesterCourseDate } from './semesters';
import { normalizeAvatarId } from './components/AvatarHero';
import AdventureDashboard from './v4/Dashboard';
import PageLoadBoundary from './components/PageLoadBoundary';
import type { RewardMoment } from './v4/RewardModal';
import { playV4Sound } from './v4/sound';
const LessonQuest = lazy(() => import('./v4/LessonQuest'));
const ParentSettings = lazy(() => import('./v4/ParentSettings'));
const SemesterPage = lazy(() => import('./v4/SecondaryViews').then(m => ({ default: m.SemesterPage })));
const AchievementsPage = lazy(() => import('./v4/SecondaryViews').then(m => ({ default: m.AchievementsPage })));
const ShopPage = lazy(() => import('./v4/SecondaryViews').then(m => ({ default: m.ShopPage })));
const ReportPage = lazy(() => import('./v4/SecondaryViews').then(m => ({ default: m.ReportPage })));
const SecondaryPageShell = lazy(() => import('./v4/SecondaryViews').then(m => ({ default: m.SecondaryPageShell })));
import { AdminPinDialog, FamilySetupDialog, UserSwitchDialog } from './v4/ParentAccess';
import { normalizeUserRole } from './v4/caregivers';
import type { DashboardViewKey } from './v4/Dashboard';
import { CloudConflictError, createFamilySession, loadCloudSnapshot, normalizeFamilyPin, resetCloudProgress, saveCloudSnapshot, validFamilyPin } from './cloud';
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
import { mergeLoadedAttendance, mergeLoadedReflections } from './lessonStateMerge';
import { lessonBlockCompletionState, lessonMissionCompletionState } from './lessonCompletionPolicy';
import { purchaseShopItem, toggleShopItem, type ShopActionResult } from './shopService';
import { visualThemeOptions } from './uiData';
import {
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

const familyStorageKey = (familyId: string, kind: 'settings' | 'progress' | 'attendance' | 'reflections', resetId = '') => {
  const legacyKey = `star-learning-v40:${familyId}:${kind}`;
  return resetId && kind !== 'settings' ? `${legacyKey}:reset:${encodeURIComponent(resetId)}` : legacyKey;
};
const progressResetKey = (familyId: string) => `star-learning-v40:${familyId}:progress-reset`;
function readProgressResetMarker(familyId: string): { id: string; updatedAt: string } {
  const raw = localStorage.getItem(progressResetKey(familyId));
  if (!raw) return { id: '', updatedAt: '' };
  try {
    const marker = JSON.parse(raw) as { id?: unknown; updatedAt?: unknown };
    if (typeof marker.id === 'string' && typeof marker.updatedAt === 'string'
      && /^[a-f0-9-]{36}$/.test(marker.id) && Number.isFinite(Date.parse(marker.updatedAt))) return { id: marker.id, updatedAt: marker.updatedAt };
  } catch { /* A corrupt marker must not reactivate the pre-reset cache. */ }
  return { id: 'invalid', updatedAt: '' };
}
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
  cursorEffects: true,
  motionEffects: true,
  homeDisplayLearnerId: 'child-1',
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
  const marker = readProgressResetMarker(familyId);
  const resetId = snapshot.progressResetId ?? '';
  if (marker.id && marker.id !== resetId && (!resetId || (marker.updatedAt && Date.parse(snapshot.updatedAt) <= Date.parse(marker.updatedAt)))) {
    throw new Error('這個家庭已有較新的進度版本；未匯入清除前的舊資料，請重新開啟家庭。');
  }
  const secureSettings = { ...snapshot.settings, cloudSync: { enabled: true, familyCode: familyId } };
  localStorage.setItem(familyStorageKey(familyId, 'settings'), JSON.stringify(secureSettings));
  localStorage.setItem(familyStorageKey(familyId, 'progress', resetId), JSON.stringify(snapshot.progress ?? {}));
  localStorage.setItem(familyStorageKey(familyId, 'attendance', resetId), JSON.stringify(snapshot.attendance ?? {}));
  localStorage.setItem(familyStorageKey(familyId, 'reflections', resetId), JSON.stringify(snapshot.reflections ?? {}));
  // Publish the revision only after the complete cache has been written.
  if (snapshot.progressResetId) localStorage.setItem(progressResetKey(familyId), JSON.stringify({ id: snapshot.progressResetId, updatedAt: snapshot.updatedAt }));
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
    cursorEffects: raw?.cursorEffects !== false,
    motionEffects: raw?.motionEffects !== false,
    homeDisplayLearnerId: children.some((child) => !child.disabled && child.id === raw?.homeDisplayLearnerId)
      ? raw?.homeDisplayLearnerId
      : children.find((child) => !child.disabled)?.id,
    ...normalizeSemesterSettings(raw),
    users,
    children,
    cloudSync: {
      enabled: Boolean(raw?.cloudSync?.enabled),
      familyCode: String(raw?.cloudSync?.familyCode ?? '').slice(0, 64),
    },
  };
}

function loadFamilyValue<T>(familyId: string, kind: 'settings' | 'progress' | 'attendance' | 'reflections', legacyKey: string, fallback: T, resetId = ''): T {
  const currentKey = familyStorageKey(familyId, kind, resetId);
  if (localStorage.getItem(currentKey)) return safeLoad<T>(currentKey, fallback);
  if (resetId) return fallback;
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

function snapshotNow(settings: AppSettings, progress: AppProgress, attendance: AttendanceMap, reflections: ReflectionMap, resetId = ''): CloudSnapshot {
  const cloudSafeSettings = { ...settings, cloudSync: { enabled: true, familyCode: '' } };
  return { version: 2, updatedAt: new Date().toISOString(), ...(resetId ? { progressResetId: resetId } : {}), settings: cloudSafeSettings, progress, attendance, reflections };
}

function blockAccuracyReward(progress: ChildProgress, blockId: string) {
  const answers = (progress.answerEvents ?? []).filter((event) => event.blockId === blockId);
  return accuracyBonus(answers.filter((event) => event.correct).length, answers.length);
}

type OpenFamily = (pin: string, seed?: CloudSnapshot, isCurrent?: () => boolean) => Promise<boolean>;

function FamilyApp({ familySession, onSwitchFamily, onOpenFamily, onRefreshSession, progressResetId, resumeAdminSettings, onAdoptResetSnapshot }: {
  familySession: FamilySession | null;
  onSwitchFamily: () => void;
  onOpenFamily: OpenFamily;
  onRefreshSession: (session: FamilySession) => void;
  progressResetId: string;
  resumeAdminSettings: boolean;
  onAdoptResetSnapshot: (snapshot: CloudSnapshot, initiatedHere: boolean) => Promise<void>;
}) {
  const familyId = familySession?.familyId ?? LOCAL_FAMILY_KEY;
  const isLocalFamily = !familySession;
  const initialSettings = useMemo(() => {
    const raw = loadFamilyValue<Partial<AppSettings>>(familyId, 'settings', SETTINGS_KEY, defaultSettings);
    const normalized = normalizeSettings(raw);
    return { ...normalized, cloudSync: { enabled: !isLocalFamily, familyCode: isLocalFamily ? '' : familyId } };
  }, [familyId, isLocalFamily]);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [progress, setProgress] = useState<AppProgress>(() => normalizeProgressMap(loadFamilyValue<AppProgress>(familyId, 'progress', PROGRESS_KEY, {}, progressResetId), initialSettings.children));
  const [attendance, setAttendance] = useSharedLessonStorage<AttendanceMap>(familyId, familyStorageKey(familyId, 'attendance', progressResetId), () => loadFamilyValue<AttendanceMap>(familyId, 'attendance', ATTENDANCE_KEY, {}, progressResetId), withFamilyProgressLock);
  const [reflections, setReflections] = useSharedLessonStorage<ReflectionMap>(familyId, familyStorageKey(familyId, 'reflections', progressResetId), () => loadFamilyValue<ReflectionMap>(familyId, 'reflections', REFLECTION_KEY, {}, progressResetId), withFamilyProgressLock);
  const [view, setView] = useState<'home' | 'semester' | 'achievements' | 'report' | 'shop' | 'settings'>(resumeAdminSettings ? 'settings' : 'home');
  const [homeSection, setHomeSection] = useState<'home' | 'today'>(() => window.location.hash === '#today-course' ? 'today' : 'home');
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<0 | 1 | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('little-explorers-v4-sound') !== 'off');
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(() => isLocalFamily ? 'local' : 'loading');
  const [cloudMessage, setCloudMessage] = useState(() => isLocalFamily ? '目前使用本機家庭模式；Child Mode 不需要 PIN。' : '正在驗證家庭安全工作階段…');
  const [cloudReady, setCloudReady] = useState(isLocalFamily);
  const [lastCloudSync, setLastCloudSync] = useState('');
  const [rewardMoment, setRewardMoment] = useState<RewardMoment | null>(null);
  const closeReward = useCallback(() => setRewardMoment(null), []);
  const [adminUnlocked, setAdminUnlocked] = useState(resumeAdminSettings);
  const [adminPromptOpen, setAdminPromptOpen] = useState(false);
  const parentAccessAttempt = useRef(0);
  const [adminDestination, setAdminDestination] = useState<'report' | 'settings'>('report');
  const [familySetupOpen, setFamilySetupOpen] = useState(false);
  const activeUserKey = `star-learning-v40:${familyId}:active-user`;
  // V6.2: Child Experience is never blocked by caregiver selection on first run.
  // Adult identity is requested only when the user explicitly enters Parent/Report/Settings flows.
  const [userPromptOpen, setUserPromptOpen] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null>(() => sessionStorage.getItem(activeUserKey));
  useEffect(() => {
    const syncHomeHash = () => {
      if (view !== 'home') return;
      const next = window.location.hash === '#today-course' ? 'today' : 'home';
      setHomeSection(next);
      if (next === 'today') window.requestAnimationFrame(() => document.getElementById('today-course')?.focus({ preventScroll: true }));
    };
    window.addEventListener('hashchange', syncHomeHash);
    return () => window.removeEventListener('hashchange', syncHomeHash);
  }, [view]);
  const [trustedDate, setTrustedDate] = useState<TrustedTaipeiDate>(() => ({
    ymd: taipeiYmd(),
    verified: false,
    source: 'device-fallback',
  }));
  const cloudUpdatedAtRef = useRef('');
  const cloudConflictRetryRef = useRef(false);
  const progressStorageKey = familyStorageKey(familyId, 'progress', progressResetId);
  const mounted = useRef(true);
  const pendingResetOperation = useRef('');
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const progressRef = useRef(progress);
  // Compare local edits with the last acknowledged cloud values, including across failed reads.
  const cloudLessonBaseRef = useRef({ attendance, reflections });

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
      document.querySelectorAll('.v5-ai-bot,.v5-hero-character,.v5-rocket-flyby,.v4-chest-visual,.v4-reward-orbit').forEach((element) => {
        // Flybys begin outside the viewport. Pause them with their stationary
        // header, so an offscreen starting position can still fly into view.
        const target = element.matches('.v5-rocket-flyby')
          ? element.closest('.v5-cinematic-header') ?? element : element;
        observer.observe(target);
      });
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
  useEffect(() => {
    if (!isLocalFamily) return;
    // Remove legacy copies only after the queued family-cache writes have completed.
    void withFamilyProgressLock(familyId, () => {
      if (!mounted.current) return;
      const entries = [[SETTINGS_KEY, 'settings'], [PROGRESS_KEY, 'progress'], [ATTENDANCE_KEY, 'attendance'], [REFLECTION_KEY, 'reflections']] as const;
      for (const [legacyKey, kind] of entries) {
        const target = familyStorageKey(familyId, kind, kind === 'settings' ? '' : progressResetId);
        if (localStorage.getItem(target) !== null) localStorage.removeItem(legacyKey);
      }
    });
  }, [isLocalFamily, familyId, progressResetId]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.adventureTheme = settings.visualTheme;
    root.dataset.voicePreference = settings.voicePreference ?? 'female';
    root.dataset.voiceId = settings.voiceId ?? '';
    root.dataset.voiceRate = String(settings.voiceRate ?? 0.78);
    root.dataset.cursorEffects = settings.cursorEffects === false ? 'false' : 'true';
    root.dataset.motionEffects = settings.motionEffects === false ? 'false' : 'true';
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && media.matches);
      root.classList.toggle('dark', dark);
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [settings.theme, settings.visualTheme, settings.voicePreference, settings.voiceId, settings.voiceRate, settings.cursorEffects, settings.motionEffects]);

  const applyCloudSnapshot = async (snapshot: CloudSnapshot, readBase: { attendance: AttendanceMap; reflections: ReflectionMap }) => {
    if (!mounted.current) return;
    if ((snapshot.progressResetId ?? '') !== progressResetId) {
      setCloudReady(false);
      await onAdoptResetSnapshot(snapshot, adminUnlocked && pendingResetOperation.current === snapshot.progressResetId);
      return;
    }
    const remoteSettings = normalizeSettings(snapshot.settings);
    const nextSettings = { ...remoteSettings, cloudSync: { enabled: true, familyCode: familyId } };
    setCloudReady(false);
    setSettings(nextSettings);
    setProgress((current) => mergeProgressMaps(current, normalizeProgressMap(snapshot.progress, nextSettings.children), nextSettings.children));
    setAttendance((current) => mergeLoadedAttendance(readBase.attendance, current, snapshot.attendance ?? {}));
    setReflections((current) => mergeLoadedReflections(readBase.reflections, current, snapshot.reflections ?? {}));
    cloudLessonBaseRef.current = { attendance: snapshot.attendance ?? {}, reflections: snapshot.reflections ?? {} };
    cloudUpdatedAtRef.current = snapshot.updatedAt;
    setLastCloudSync(snapshot.updatedAt);
    window.setTimeout(() => setCloudReady(true), 0);
  };

  const pullCloud = async (force = true) => {
    if (!familySession) return false;
    setCloudStatus('loading');
    setCloudMessage('正在讀取這個家庭的雲端進度…');
    const readBase = cloudLessonBaseRef.current;
    try {
      const snapshot = await loadCloudSnapshot(familySession);
      if (!snapshot) {
        setCloudReady(true);
        setCloudStatus('saving');
        setCloudMessage('雲端尚無資料，將建立第一份安全副本。');
        return false;
      }
      const olderThanAcknowledged = cloudUpdatedAtRef.current && new Date(snapshot.updatedAt) < new Date(cloudUpdatedAtRef.current);
      if (!olderThanAcknowledged && (force || !cloudUpdatedAtRef.current || new Date(snapshot.updatedAt) > new Date(cloudUpdatedAtRef.current))) await applyCloudSnapshot(snapshot, readBase);
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
      const readBase = cloudLessonBaseRef.current;
      try {
        const snapshot = await loadCloudSnapshot(familySession);
        if (snapshot) {
          await applyCloudSnapshot(snapshot, readBase);
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

  const recoverCloudConflict = async (error: unknown) => {
    if (!(error instanceof CloudConflictError)) return false;
    setCloudReady(false);
    if (cloudConflictRetryRef.current) {
      setCloudStatus('error');
      setCloudMessage('另一個裝置仍在更新資料。本機進度已保留，請稍後在家長設定重新同步。');
      return true;
    }
    cloudConflictRetryRef.current = true;
    // The normal save effect uploads the merged state after a successful read.
    // A second conflict pauses uploads instead of repeatedly fetching and writing.
    await pullCloud(true);
    return true;
  };

  useEffect(() => {
    if (!familySession || !cloudReady) return;
    const timer = window.setTimeout(async () => {
      setCloudStatus('saving');
      setCloudMessage('正在儲存最新進度…');
      try {
        const response = await saveCloudSnapshot(familySession, snapshotNow(settings, progress, attendance, reflections, progressResetId), cloudUpdatedAtRef.current);
        cloudLessonBaseRef.current = { attendance, reflections };
        cloudUpdatedAtRef.current = response.updatedAt;
        cloudConflictRetryRef.current = false;
        setLastCloudSync(response.updatedAt);
        setCloudStatus('synced');
        setCloudMessage('所有裝置可讀取這份最新進度。');
      } catch (error) {
        if (await recoverCloudConflict(error)) return;
        setCloudStatus('error');
        setCloudMessage(error instanceof Error ? error.message : '雲端儲存失敗；本機資料仍安全保留。');
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [settings, progress, attendance, reflections, cloudReady, familySession, progressResetId]);

  useEffect(() => {
    if (!familySession) return;
    const onVisible = () => { if (document.visibilityState === 'visible') void pullCloud(false); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [familySession]);

  const syncNow = async () => {
    if (!familySession) return;
    cloudConflictRetryRef.current = false;
    if (!cloudReady) {
      await pullCloud();
      return;
    }
    setCloudStatus('saving');
    try {
      const response = await saveCloudSnapshot(familySession, snapshotNow(settings, progress, attendance, reflections, progressResetId), cloudUpdatedAtRef.current);
      cloudLessonBaseRef.current = { attendance, reflections };
      cloudUpdatedAtRef.current = response.updatedAt;
      cloudConflictRetryRef.current = false;
      setLastCloudSync(response.updatedAt);
      setCloudReady(true);
      setCloudStatus('synced');
      setCloudMessage('手動同步完成，已恢復自動同步。');
    } catch (error) {
      if (await recoverCloudConflict(error)) return;
      setCloudStatus('error');
      setCloudMessage(error instanceof Error ? error.message : '手動同步失敗');
    }
  };

  const resetAllProgress = async (operationId: string) => {
    if (!adminUnlocked || !familySession) throw new Error('請先以管理者 PIN 解鎖家庭管理。');
    if (!cloudReady || !cloudUpdatedAtRef.current) throw new Error('請先完成雲端同步，再確認清除進度。');
    pendingResetOperation.current = operationId;
    setCloudReady(false);
    try {
      const snapshot = await resetCloudProgress(familySession, operationId, cloudUpdatedAtRef.current);
      if (mounted.current) await onAdoptResetSnapshot(snapshot, true);
    } catch (error) {
      // The server may have committed before a response was lost. Read it
      // before resuming uploads, and keep the same operation ID for retry.
      if (mounted.current) await pullCloud(true);
      if (error instanceof CloudConflictError) throw new Error('另一個裝置有新進度；已保留資料並重新同步，請再次確認清除。');
      throw new Error('尚未確認清除結果；本機資料已保留，請重新同步後再試一次。');
    }
  };

  const semester = resolveSemester(settings);
  const curriculum = semester.days;
  const selectedDay = selectedDayId ? curriculum.find((day) => day.id === selectedDayId) ?? null : null;
  const enabledLearnerIds = settings.children.filter((child) => !child.disabled).map((child) => child.id);
  // Daily exclusions are explicit. Legacy attendance never controls visibility.
  const participantIds = (day: CourseDay) => dailyParticipantIds(settings.children, reflections[day.id]);
  const isChildBlockDone = (childId: string, blockId: string) => Boolean(progress[childId]?.completedBlocks.includes(blockId));
  const isChildDayDone = (childId: string, day: CourseDay) => day.blocks.every((block) => isChildBlockDone(childId, block.id));
  const isDayDone = (day: CourseDay) => {
    const ids = participantIds(day);
    return ids.length > 0 && ids.every((id) => isChildDayDone(id, day));
  };

  const todayKey = trustedDate.ymd;
  const courseDateKey = (day: CourseDay) => semesterCourseDate(semester, day);
  const accessForDay = (day: CourseDay): CourseDayAccess => courseDayAccess(courseDateKey(day), todayKey);
  const canEarnToday = (day: CourseDay) => canEarnSemesterDay(semester, day, trustedDate);
  const selectDailyParticipant = (day: CourseDay, childId: string, selected: boolean) => {
    if (!canEarnToday(day) || !enabledLearnerIds.includes(childId)) return;
    setReflections(current => {
      const reflection = current[day.id] ?? emptyReflection();
      const excluded = new Set(dailyExcludedLearners(reflection));
      if (selected) excluded.delete(childId); else excluded.add(childId);
      return { ...current, [day.id]: { ...reflection, excludedLearnerIds: [...excluded].sort() } };
    });
    if (selected) setAttendance(current => current[day.id] && !current[day.id].includes(childId) ? { ...current, [day.id]: [...current[day.id], childId] } : current);
  };
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
    const route = resolveSemesterRoute(settings, routeDayId, params.get('semester'));
    const routeDay = route?.day;
    if (route && route.semester.id !== semester.id) {
      setSettings(current => selectSemester(current, route.semester.id));
      return;
    }
    const validLesson = routeLesson === 1 || routeLesson === 2;
    if (!routeDay || !validLesson || (trustedDate.verified && accessForDay(routeDay) !== 'today' && !adminUnlocked)) {
      window.history.replaceState({}, '', window.location.pathname);
      setSelectedDayId(null);
      setSelectedLessonIndex(null);
      return;
    }
    // Keep a valid deep link pending until the date service answers. An
    // unverified device date cannot authorize attendance or discard the route.
    if (!trustedDate.verified) return;
    if (accessForDay(routeDay) === 'today' && participantIds(routeDay).length) {
      setAttendance((current) => { const ids = [...new Set([...(current[routeDay.id] ?? []), ...participantIds(routeDay)])]; return JSON.stringify(ids) === JSON.stringify(current[routeDay.id]) ? current : { ...current, [routeDay.id]: ids }; });
    }
    setSelectedDayId(routeDay.id);
    setSelectedLessonIndex((routeLesson - 1) as 0 | 1);
  }, [trustedDate.verified, trustedDate.ymd, semester.id, semester.startDate, adminUnlocked]);

  const openLesson = (day: CourseDay, lessonIndex: 0 | 1) => {
    if (!curriculum.includes(day)) return;
    const access = accessForDay(day);
    if (access !== 'today' && !adminUnlocked) return;
    if (canEarnToday(day) && participantIds(day).length) {
      setAttendance((current) => { const ids = [...new Set([...(current[day.id] ?? []), ...participantIds(day)])]; return JSON.stringify(ids) === JSON.stringify(current[day.id]) ? current : { ...current, [day.id]: ids }; });
    }
    window.history.pushState({}, '', `${window.location.pathname}?day=${encodeURIComponent(day.id)}&lesson=${lessonIndex + 1}`);
    setSelectedLessonIndex(lessonIndex);
    setSelectedDayId(day.id);
  };

  const recordAnswer = (childId: string, day: CourseDay, block: LessonBlock, stage: number, target: string, answer: string, correct: boolean, confidence?: number) => {
    if (!canEarnToday(day) || !participantIds(day).includes(childId)) return;
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
    if (!parentDay || !canEarnToday(parentDay) || !participantIds(parentDay).includes(childId)) return;
    const parentBlock = parentDay.blocks.find((block) => block.missions.some((item) => item.id === mission.id));
    const missionIndex = parentBlock?.missions.findIndex((item) => item.id === mission.id) ?? -1;
    const lessonStages = parentBlock ? reflections[parentDay.id]?.lessonStages?.[parentBlock.id] ?? [] : [];
    if (!lessonMissionCompletionState(lessonStages, missionIndex).canComplete) return;
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
      id: Date.now(), childId, childName: name, kind: 'mission', xp: mission.xp, coins: mission.coins, stars: 0, gems: 0,
      badgeIds: preview.newBadgeIds,
      levelUp: afterLevel > beforeLevel ? afterLevel : undefined,
    });
  };

  const toggleBlock = (childId: string, day: CourseDay, block: LessonBlock) => {
    if (!canEarnToday(day) || !participantIds(day).includes(childId)) return;
    const lessonStages = reflections[day.id]?.lessonStages?.[block.id] ?? [];
    const before = normalizeProgress(progress[childId]);
    if (!lessonBlockCompletionState(before, block, lessonStages).canComplete) return;

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
      childId,
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
    setRewardMoment({ id: Date.now(), childId, childName: name, kind: 'bonus', ...SPECIAL_TASK_BONUS, levelUp: afterLevel > beforeLevel ? afterLevel : undefined });
  };

  const claimEgg = (childId: string, day: CourseDay) => {
    if (!canEarnToday(day) || !easterEggDays.has(day.index)) return;
    const eggId = courseEggId(day);
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
    setRewardMoment({ id: Date.now(), childId, childName: name, kind: 'treasure', xp: EGG_REWARD.xp, coins: EGG_REWARD.coins, stars: 0, gems: 3, levelUp: afterLevel > beforeLevel ? afterLevel : undefined });
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

  const requestParentDestination = (destination: 'report' | 'settings') => {
    parentAccessAttempt.current += 1;
    setAdminDestination(destination);
    if (!activeUserId) { setUserPromptOpen(true); return; }
    if (isLocalFamily) { setFamilySetupOpen(true); return; }
    if (adminUnlocked) { setView(destination); return; }
    setAdminPromptOpen(true);
  };
  const requestParentArea = () => requestParentDestination('settings');
  const logoutParent = () => {
    parentAccessAttempt.current += 1;
    setAdminUnlocked(false);
    setActiveUserId(null);
    sessionStorage.removeItem(activeUserKey);
    setAdminPromptOpen(false);
    setUserPromptOpen(false);
    setFamilySetupOpen(false);
    setSelectedDayId(null);
    setSelectedLessonIndex(null);
    setHomeSection('home');
    setView('home');
    window.history.replaceState({}, '', window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const promoteLocalFamily = async (pin: string) => {
    if (!isLocalFamily || !validFamilyPin(pin)) return false;
    const attempt = parentAccessAttempt.current;
    const isCurrent = () => attempt === parentAccessAttempt.current;
    const ok = await onOpenFamily(pin, snapshotNow(settings, progress, attendance, reflections), isCurrent);
    if (ok && isCurrent()) setFamilySetupOpen(false);
    return ok;
  };

  const unlockAdmin = async (pin: string) => {
    if (!familySession || !validFamilyPin(pin)) return false;
    const attempt = parentAccessAttempt.current;
    try {
      const refreshed = await createFamilySession(pin);
      if (attempt !== parentAccessAttempt.current || refreshed.familyId !== familyId) return false;
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
    {adminPromptOpen && !isLocalFamily && <AdminPinDialog onUnlock={unlockAdmin} onClose={() => { parentAccessAttempt.current += 1; setAdminPromptOpen(false); }} />}
    {familySetupOpen && isLocalFamily && <FamilySetupDialog onSetPin={promoteLocalFamily} onClose={() => { parentAccessAttempt.current += 1; setFamilySetupOpen(false); }} />}
    {userPromptOpen && <UserSwitchDialog users={settings.users} activeUserId={activeUserId} onActivate={activateUser} onClose={() => setUserPromptOpen(false)} />}
  </>;

  const navigateDashboard = (nextView: DashboardViewKey) => {
    if (nextView === 'parent-logout') { logoutParent(); return; }
    if (nextView === 'report' || nextView === 'settings') {
      window.history.replaceState({}, '', window.location.pathname);
      setHomeSection('home');
      requestParentDestination(nextView);
      return;
    }
    if (nextView === 'today') {
      setView('home');
      setHomeSection('today');
      window.history.replaceState({}, '', `${window.location.pathname}#today-course`);
      window.requestAnimationFrame(() => {
        const target = document.getElementById('today-course');
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target?.focus({ preventScroll: true });
      });
      return;
    }
    if (nextView === 'home') {
      setView('home');
      setHomeSection('home');
      window.history.replaceState({}, '', window.location.pathname);
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      return;
    }
    setHomeSection('home');
    window.history.replaceState({}, '', window.location.pathname);
    setView(nextView);
  };

  const returnFromLoading = () => {
    window.history.replaceState({}, '', window.location.pathname);
    setHomeSection('home');
    setSelectedLessonIndex(null); setSelectedDayId(null); setView('home');
  };

  const rewardChild = rewardMoment ? settings.children.find(child => child.id === rewardMoment.childId) : undefined;
  const rewardProgress = rewardChild ? normalizeProgress(progress[rewardChild.id]) : undefined;
  const rewardAvatar = rewardChild && rewardProgress ? { id: rewardChild.avatar, xp: calculateRewards(rewardProgress).xp, equippedCosmetics: rewardProgress.equippedCosmetics ?? [] } : undefined;

  if (selectedDay && selectedLessonIndex !== null) {
    return (
      <>
        {networkRecovery}
        <PageLoadBoundary onHome={returnFromLoading}><LessonQuest
          day={selectedDay}
          lessonIndex={selectedLessonIndex}
          dateKey={courseDateKey(selectedDay)}
          settings={settings}
          progress={progress}
          participants={participantIds(selectedDay)}
          onSelectParticipant={(childId, selected) => selectDailyParticipant(selectedDay, childId, selected)}
          access={accessForDay(selectedDay)}
          trustedDateVerified={trustedDate.verified}
          reflection={reflections[selectedDay.id] ?? emptyReflection()}
          onUpdateReflection={(patch) => { if (canEarnToday(selectedDay) && participantIds(selectedDay).length) setReflections((current) => mergeLoadedReflections(reflections, { ...reflections, [selectedDay.id]: { ...(reflections[selectedDay.id] ?? emptyReflection()), ...patch } }, current)); }}
          onToggleMission={toggleMission}
          onAnswer={(childId, target, answer, correct, stage, confidence) => recordAnswer(childId, selectedDay, selectedDay.blocks[selectedLessonIndex], stage, target, answer, correct, confidence)}
          onToggleBlock={(childId, block) => toggleBlock(childId, selectedDay, block)}
          onClaimSpecialBonus={claimSpecialBonus}
          onBack={() => { window.history.replaceState({}, '', window.location.pathname); setSelectedLessonIndex(null); setSelectedDayId(null); }}
        /></PageLoadBoundary>
        {rewardMoment && <Suspense fallback={null}><RewardModal moment={rewardMoment} avatar={rewardAvatar} onClose={closeReward} /></Suspense>}
      </>
    );
  }

  if (view === 'home' || ((view === 'report' || view === 'settings') && !adminUnlocked)) {
    return (
      <>
        <AdventureDashboard
          activeView={homeSection}
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
          participantIds={participantIds}
          onSelectParticipant={selectDailyParticipant}
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
          onDisplayLearnerChange={(homeDisplayLearnerId) => setSettings((current) => ({ ...current, homeDisplayLearnerId }))}
          onClaimTreasure={claimEgg}
          activeUser={activeUser}
          parentPreviewUnlocked={adminUnlocked}
        />
        {rewardMoment && <Suspense fallback={null}><RewardModal moment={rewardMoment} avatar={rewardAvatar} onClose={closeReward} /></Suspense>}
        {accessDialogs}
      </>
    );
  }

  if (view === 'semester') return <><PageLoadBoundary key={`semester-${semester.id}`} onHome={returnFromLoading}><SemesterPage settings={settings} progress={progress} trustedDate={trustedDate} cloudStatus={cloudStatus} courseDateKey={courseDateKey} accessForDay={accessForDay} isDayDone={isDayDone} onOpenLesson={openLesson} onNavigate={navigateDashboard} onParentArea={requestParentArea} parentPreviewUnlocked={adminUnlocked} activeUser={activeUser} /></PageLoadBoundary>{accessDialogs}</>;
  if (view === 'achievements') return <><PageLoadBoundary key="achievements" onHome={returnFromLoading}><AchievementsPage settings={settings} progress={progress} trustedDate={trustedDate} cloudStatus={cloudStatus} onNavigate={navigateDashboard} onParentArea={requestParentArea} activeUser={activeUser} parentPreviewUnlocked={adminUnlocked} /></PageLoadBoundary>{accessDialogs}</>;
  if (view === 'shop') return <><PageLoadBoundary key="shop" onHome={returnFromLoading}><ShopPage settings={settings} progress={progress} trustedDate={trustedDate} cloudStatus={cloudStatus} onNavigate={navigateDashboard} onParentArea={requestParentArea} onUnlock={unlockCosmetic} onToggle={toggleCosmetic} activeUser={activeUser} parentPreviewUnlocked={adminUnlocked} /></PageLoadBoundary>{accessDialogs}</>;
  if (view === 'report') return <><PageLoadBoundary key="report" onHome={returnFromLoading}><ReportPage settings={settings} progress={progress} trustedDate={trustedDate} cloudStatus={cloudStatus} isChildDayDone={isChildDayDone} onNavigate={navigateDashboard} onParentArea={requestParentArea} activeUser={activeUser} parentPreviewUnlocked={adminUnlocked} /></PageLoadBoundary>{accessDialogs}</>;

  return (
    <><PageLoadBoundary key="settings" onHome={returnFromLoading}><SecondaryPageShell settings={settings} progress={progress} active="settings" trustedDate={trustedDate} cloudStatus={cloudStatus} onNavigate={navigateDashboard} onParentArea={requestParentArea} activeUser={activeUser} parentPreviewUnlocked={adminUnlocked}>
      <ParentSettings
        settings={settings}
        setSettings={setSettings}
        progress={progress}
        attendance={attendance}
        reflections={reflections}
        setProgress={setProgress}
        setAttendance={setAttendance}
        onResetProgress={resetAllProgress}
        resetCompleted={resumeAdminSettings}
        progressResetId={progressResetId}
        familyId={familyId}
        cloudStatus={cloudStatus}
        cloudMessage={cloudMessage}
        lastCloudSync={lastCloudSync}
        onSyncNow={syncNow}
        onPullCloud={() => { cloudConflictRetryRef.current = false; return pullCloud(true); }}
        onSwitchFamily={onSwitchFamily}
        onOpenFamily={onOpenFamily}
        goHome={() => setView('home')}
      />
    </SecondaryPageShell></PageLoadBoundary>{accessDialogs}</>
  );
}

function App() {
  const [familySession, setFamilySession] = useState<FamilySession | null>(() => readStoredFamilySession());
  const [legacyMigrationPin, setLegacyMigrationPin] = useState(() => familySession ? '' : readLegacyActivePin());
  const [migrationError, setMigrationError] = useState('');
  const [migrationAttempted, setMigrationAttempted] = useState(false);
  const familyKey = familySession?.familyId ?? LOCAL_FAMILY_KEY;
  const activeFamily = useRef(familyKey);
  activeFamily.current = familyKey;
  const [cacheRevision, setCacheRevision] = useState(() => ({ familyId: familyKey, id: readProgressResetMarker(familyKey).id, resumeAdminSettings: false }));
  const resetId = cacheRevision.familyId === familyKey ? cacheRevision.id : readProgressResetMarker(familyKey).id;
  useEffect(() => {
    setCacheRevision({ familyId: familyKey, id: readProgressResetMarker(familyKey).id, resumeAdminSettings: false });
    const onStorage = (event: StorageEvent) => {
      if (event.key === progressResetKey(familyKey)) {
        setCacheRevision({ familyId: familyKey, id: readProgressResetMarker(familyKey).id, resumeAdminSettings: false });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [familyKey]);

  const adoptResetSnapshot = async (snapshot: CloudSnapshot, initiatedHere: boolean) => {
    if (!snapshot.progressResetId || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(snapshot.progressResetId)
      || !Number.isFinite(Date.parse(snapshot.updatedAt))) throw new Error('家庭進度版本無法確認；未套用舊資料。');
    await withFamilyProgressLock(familyKey, () => {
      const marker = readProgressResetMarker(familyKey);
      if (marker.id !== snapshot.progressResetId) {
        if (marker.updatedAt && Date.parse(snapshot.updatedAt) <= Date.parse(marker.updatedAt)) throw new Error('較舊的家庭資料未套用；請重新同步。');
        writeFamilySnapshotCache(familyKey, snapshot);
      }
      if (activeFamily.current === familyKey) setCacheRevision({ familyId: familyKey, id: snapshot.progressResetId!, resumeAdminSettings: initiatedHere });
    });
  };

  const persistSession = (session: FamilySession) => {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem(ACTIVE_PIN_KEY);
    localStorage.removeItem(LEGACY_ACTIVE_PIN_KEY);
    setFamilySession(session);
  };

  const enterFamily: OpenFamily = async (pin, seed, isCurrent = () => true) => {
    try {
      const session = await createFamilySession(pin);
      // A dismissed setup must not migrate data or persist a late session.
      if (!isCurrent()) return false;
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
      if (!isCurrent()) return false;
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

  return <FamilyApp key={`${familyKey}:${resetId}`} familySession={familySession} onSwitchFamily={switchFamily} onOpenFamily={enterFamily} onRefreshSession={refreshSession} progressResetId={resetId} resumeAdminSettings={cacheRevision.familyId === familyKey && cacheRevision.resumeAdminSettings} onAdoptResetSnapshot={adoptResetSnapshot} />;
}

export default App;
