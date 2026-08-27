import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  ArrowLeft,
  Award,
  BarChart3,
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
  Flame,
  Gamepad2,
  Gift,
  GraduationCap,
  Headphones,
  Home,
  Map,
  MessageCircle,
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
  UserRound,
  Users,
  Volume2,
  Zap,
} from 'lucide-react';
import { curriculum, semesterStats, weekSummaries } from './data/curriculum';
import { youtubeChannelLinks } from './data/videos';
import AvatarHero, { avatarName, avatarOptions, normalizeAvatarId } from './components/AvatarHero';
import AnimatedBadge from './components/AnimatedBadge';
import PhoneticText from './components/PhoneticText';
import { loadCloudSnapshot, normalizeFamilyPin, saveCloudSnapshot, validFamilyPin } from './cloud';
import { createUserPinCredential, verifyUserPin } from './security';
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
import { subjectAction, visualThemeOptions } from './uiData';
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
  FamilyUserProfile,
  FamilyUserRole,
  ThemeMode,
  VideoClip,
  ViewingStatus,
} from './types';

const SETTINGS_KEY = 'star-learning-settings-v1';
const PROGRESS_KEY = 'star-learning-progress-v1';
const ATTENDANCE_KEY = 'star-learning-attendance-v1';
const REFLECTION_KEY = 'star-learning-reflections-v1';
const ACTIVE_PIN_KEY = 'star-learning-active-family-pin-v22';
const LEGACY_ACTIVE_PIN_KEY = 'star-learning-active-family-pin-v21';

const familyStorageKey = (pin: string, kind: 'settings' | 'progress' | 'attendance' | 'reflections') =>
  `star-learning-v22:${pin}:${kind}`;
const legacyFamilyStorageKey = (pin: string, kind: 'settings' | 'progress' | 'attendance' | 'reflections') =>
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

const emptyReflection = (): DayReflection => ({ engagement: '', note: '', viewing: {} });
const emptyProgress = (): ChildProgress => normalizeProgress();

type CloudStatus = 'local' | 'loading' | 'saving' | 'synced' | 'error';
type RewardToast = { id: number; title: string; detail: string } | null;

const userRoleOptions: Array<{ id: FamilyUserRole; label: string }> = [
  { id: 'father', label: '爸爸' },
  { id: 'mother', label: '媽媽' },
  { id: 'caregiver', label: '其他照顧者' },
  { id: 'other', label: '其他' },
];

function normalizeUserRole(value?: string): FamilyUserRole {
  if (value === 'father' || value === 'mother' || value === 'caregiver' || value === 'other') return value;
  return 'caregiver';
}

function roleLabel(role?: FamilyUserRole) {
  return userRoleOptions.find((option) => option.id === normalizeUserRole(role))?.label ?? '照顧者';
}

function hasUserPin(user: FamilyUserProfile) {
  return Boolean(user.userPinHash && user.userPinSalt && (user.userPinIterations ?? 0) >= 100_000);
}

function caregiverArt(role: FamilyUserRole) {
  if (role === 'father') return 'avatar-father.webp';
  if (role === 'mother') return 'avatar-mother.webp';
  return 'avatar-robot.webp';
}

function CaregiverAvatar({ user, size = 64 }: { user: FamilyUserProfile; size?: number }) {
  return <img className="caregiver-avatar" src={v23Asset(caregiverArt(user.role))} alt={`${user.name}頭像`} width={size} height={size} loading="lazy" decoding="async" />;
}

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
    semesterStart: raw?.semesterStart || defaultSettings.semesterStart,
    users,
    children,
    cloudSync: {
      enabled: Boolean(raw?.cloudSync?.enabled),
      familyCode: String(raw?.cloudSync?.familyCode ?? '').slice(0, 24),
    },
  };
}

function loadFamilyValue<T>(pin: string, kind: 'settings' | 'progress' | 'attendance' | 'reflections', legacyKey: string, fallback: T): T {
  const v22Key = familyStorageKey(pin, kind);
  if (localStorage.getItem(v22Key)) return safeLoad<T>(v22Key, fallback);
  const v21Key = legacyFamilyStorageKey(pin, kind);
  if (localStorage.getItem(v21Key)) return safeLoad<T>(v21Key, fallback);
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
    English: 'English', Math: '數學', Zhuyin: '中文語音', Life: '生活', Science: '探索', Review: '複習',
  };
  return <span className={`subject-badge subject-${subject.toLowerCase()}`}>{labels[subject]}</span>;
}

const v23Asset = (file: string) => `${import.meta.env.BASE_URL}assets/v23/${file}`;
const v30Asset = (file: string) => `${import.meta.env.BASE_URL}assets/v30/${file}`;

const worldArtByTheme: Record<AppSettings['visualTheme'], string> = {
  hero: 'world-hello.webp',
  mecha: 'world-color.webp',
  tank: 'world-animal.webp',
  racing: 'world-food.webp',
  creature: 'world-ocean.webp',
};

function lessonWorldArt(block: LessonBlock) {
  const tags = new Set(block.requiredVideoTopics ?? []);
  if (tags.has('food') || tags.has('fruit') || tags.has('vegetables') || tags.has('preferences')) return 'world-food.webp';
  if (tags.has('colors') || tags.has('shapes')) return 'world-color.webp';
  if (tags.has('animals') || tags.has('pets') || tags.has('farm') || tags.has('zoo') || tags.has('wild-animals')) return 'world-animal.webp';
  if (tags.has('ocean')) return 'world-ocean.webp';
  if (tags.has('space') || tags.has('sky')) return 'world-space.webp';
  return 'world-hello.webp';
}

function speakWord(word: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word.replace(/[^A-Za-z' -]/g, '').trim() || word);
  utterance.lang = 'en-US';
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}

function VocabularyCard({ word, block }: { word: string; block: LessonBlock }) {
  return (
    <button className="v30-vocab-card" onClick={() => speakWord(word)} aria-label={`播放 ${word} 發音`}>
      <span className="v30-vocab-art"><img src={v30Asset(lessonWorldArt(block))} alt="" aria-hidden="true" /></span>
      <strong>{word}</strong>
      <span className="v30-audio-action"><Volume2 size={18} /> 聽發音</span>
    </button>
  );
}

function LessonIllustration({ block }: { block: LessonBlock }) {
  return <img className="v22-lesson-illustration" src={v30Asset(lessonWorldArt(block))} alt="本節 Storybook Adventure 教學插圖" loading="lazy" decoding="async" />;
}

function VideoPlayer({ clip, compact = false, warmup = false }: { clip: VideoClip; compact?: boolean; warmup?: boolean }) {
  return (
    <div className={`video-card ${compact ? 'compact' : ''} ${warmup ? 'food-warmup-card' : ''}`}>
      <div className="video-title-row">
        <div>
          <span className="eyebrow">{warmup ? '唱跳暖身 · 每節唯一' : clip.channel}</span>
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

function CloudPill({ status }: { status: CloudStatus }) {
  const label = status === 'synced' ? '雲端已同步' : status === 'saving' ? '同步中' : status === 'loading' ? '讀取雲端' : status === 'error' ? '雲端待重試' : '本機模式';
  return <span className={`cloud-pill cloud-${status}`}>{status === 'local' || status === 'error' ? <CloudOff size={14} /> : <Cloud size={14} />}{label}</span>;
}

function AdminPinDialog({ familyPin, onUnlock, onClose }: { familyPin: string; onUnlock: (pin: string) => boolean; onClose: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (!validFamilyPin(pin) || !onUnlock(pin)) {
      setError('管理者 PIN 不正確。');
      return;
    }
    setError('');
  };
  return <div className="modal-scrim" role="dialog" aria-modal="true" aria-label="管理者驗證"><div className="game-modal admin-modal"><div className="modal-icon"><KeyRound size={30} /></div><span className="eyebrow">ADMIN ACCESS</span><h2><PhoneticText text="管理者驗證" /></h2><p>只有家庭管理者可以新增、刪除使用者、設定個別 PIN 與變更家庭設定。</p><label>家庭管理者 PIN</label><div className="modal-pin-row"><input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(normalizeFamilyPin(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} autoFocus placeholder="輸入管理者 PIN" /><button className="primary-button" onClick={submit}>解鎖設定</button></div>{error && <div className="pin-error">{error}</div>}<button className="modal-close-link" onClick={onClose}>取消</button><small className="modal-family-hint">目前家庭識別：•••• · {familyPin.length} 位數</small></div></div>;
}

function UserSwitchDialog({ users, activeUserId, onActivate, onClose }: { users: FamilyUserProfile[]; activeUserId: string | null; onActivate: (id: string) => void; onClose: () => void }) {
  const availableUsers = users.filter((user) => !user.disabled);
  const [selectedId, setSelectedId] = useState(activeUserId ?? availableUsers[0]?.id ?? '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const selected = availableUsers.find((user) => user.id === selectedId);
  const submit = async () => {
    if (!selected) return;
    if (hasUserPin(selected)) {
      if (!validFamilyPin(pin)) { setError('請輸入 4–6 位使用者 PIN。'); return; }
      const ok = await verifyUserPin(pin, {
        hash: selected.userPinHash!,
        salt: selected.userPinSalt!,
        iterations: selected.userPinIterations!,
      });
      if (!ok) { setError('使用者 PIN 不正確。'); return; }
    }
    setError('');
    onActivate(selected.id);
  };
  return <div className="modal-scrim" role="dialog" aria-modal="true" aria-label="切換家長或照顧者"><div className="game-modal user-switch-modal"><span className="eyebrow">CAREGIVER SELECT</span><h2>選擇家長／照顧者</h2><p className="dialog-intro">這裡選的是操作網站的大人。哥哥、弟弟是學習者，會在課程與「小小探險隊成長」中分別記錄進度、XP 與金幣。</p><div className="user-select-grid">{availableUsers.map((user) => <button key={user.id} className={`user-select-card ${selectedId === user.id ? 'selected' : ''}`} onClick={() => { setSelectedId(user.id); setPin(''); setError(''); }}><CaregiverAvatar user={user} size={74} /><strong>{user.name}</strong><span>{roleLabel(user.role)}</span><small>{hasUserPin(user) ? '個人 PIN 已啟用' : '尚未設定個人 PIN'}</small></button>)}</div>{selected && hasUserPin(selected) && <div className="modal-pin-row"><input type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} value={pin} onChange={(e) => setPin(normalizeFamilyPin(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} placeholder="輸入個人 PIN" /><button className="primary-button" onClick={() => void submit()}>進入</button></div>}{selected && !hasUserPin(selected) && <button className="primary-button full" onClick={() => void submit()}>使用此帳號</button>}{!availableUsers.length && <div className="pin-error">目前沒有可登入的家長／照顧者帳號，請由家庭管理者重新啟用。</div>}{error && <div className="pin-error">{error}</div>}<button className="modal-close-link" onClick={onClose}>取消</button></div></div>;
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
  const [view, setView] = useState<'home' | 'semester' | 'achievements' | 'character' | 'report' | 'shop' | 'settings'>('home');
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('loading');
  const [cloudMessage, setCloudMessage] = useState('正在辨識家庭 PIN…');
  const [cloudReady, setCloudReady] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState('');
  const [rewardToast, setRewardToast] = useState<RewardToast>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPromptOpen, setAdminPromptOpen] = useState(false);
  const [userPromptOpen, setUserPromptOpen] = useState(() => !sessionStorage.getItem(`star-learning-v22:${familyPin}:active-user`));
  const [activeUserId, setActiveUserId] = useState<string | null>(() => sessionStorage.getItem(`star-learning-v22:${familyPin}:active-user`));
  const cloudUpdatedAtRef = useRef('');
  const rewardTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setProgress((current) => normalizeProgressMap(current, settings.children));
    if (activeUserId) {
      const currentUser = settings.users.find((user) => user.id === activeUserId);
      if (!currentUser || currentUser.disabled) {
        sessionStorage.removeItem(`star-learning-v22:${familyPin}:active-user`);
        setActiveUserId(null);
        setUserPromptOpen(true);
      }
    }
  }, [settings.children, settings.users, activeUserId, familyPin]);

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
  const enabledLearnerIds = settings.children.filter((child) => !child.disabled).map((child) => child.id);
  const participantIds = (day: CourseDay) => (attendance[day.id] ?? enabledLearnerIds).filter((id) => enabledLearnerIds.includes(id));
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
    setAttendance((current) => current[day.id] ? current : { ...current, [day.id]: enabledLearnerIds });
    setSelectedDayId(day.id);
  };

  const toggleAttendance = (day: CourseDay, childId: string) => {
    setAttendance((current) => {
      const currentIds = (current[day.id] ?? enabledLearnerIds).filter((id) => enabledLearnerIds.includes(id));
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

  const requestSettings = () => {
    if (adminUnlocked) {
      setView('settings');
      return;
    }
    setAdminPromptOpen(true);
  };

  const unlockAdmin = (pin: string) => {
    if (normalizeFamilyPin(pin) !== familyPin) return false;
    setAdminUnlocked(true);
    setAdminPromptOpen(false);
    setView('settings');
    return true;
  };

  const activateUser = (userId: string) => {
    setActiveUserId(userId);
    sessionStorage.setItem(`star-learning-v22:${familyPin}:active-user`, userId);
    setUserPromptOpen(false);
  };

  const activeUser = settings.users.find((user) => user.id === activeUserId) ?? null;

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
        {rewardToast && <div className="reward-toast v30-reward-toast" key={rewardToast.id}><img src={v23Asset('robot-helper.webp')} alt="小星" /><div><strong>{rewardToast.title}</strong><span>{rewardToast.detail}</span></div></div>}
      </>
    );
  }

  return (
    <div className={`app-shell v30-app-shell ${view === 'report' || view === 'settings' ? 'parent-presentation' : 'child-presentation'}`}>
      <header className="topbar v30-topbar">
        <button className="brand v30-brand" onClick={() => setView('home')}>
          <span className="v30-brand-mark"><Sparkles size={24} aria-hidden="true" /></span>
          <span><strong>小小探險隊</strong><small>Little Explorers · V3.0</small></span>
        </button>
        <nav className="game-main-nav v30-child-nav" aria-label="兒童主要功能">
          <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}><Home size={20} /><span>首頁</span></button>
          <button className={view === 'semester' ? 'active' : ''} onClick={() => setView('semester')}><Map size={20} /><span>冒險世界</span></button>
          <button className={view === 'achievements' || view === 'shop' ? 'active' : ''} onClick={() => setView('achievements')}><Award size={20} /><span>獎勵</span></button>
          <button className={view === 'character' ? 'active' : ''} onClick={() => setView('character')}><UserRound size={20} /><span>我的角色</span></button>
        </nav>
        <nav className="top-actions v30-utility-nav">
          <button className="active-user-chip" onClick={() => setUserPromptOpen(true)} title="切換家長／照顧者">{activeUser ? <><CaregiverAvatar user={activeUser} size={32} /><span><strong>{activeUser.name}</strong><small>{roleLabel(activeUser.role)}</small></span></> : <><Users size={18} /><span><strong>選擇照顧者</strong></span></>}</button>
          <button className={`v30-parent-entry ${view === 'report' || view === 'settings' ? 'active' : ''}`} onClick={() => setView('report')}><BarChart3 size={18} /><span>家長專區</span></button>
          <button className="nav-button v30-display-toggle" onClick={cycleTheme} title="切換顯示模式">{settings.theme === 'dark' ? <Moon size={18} /> : settings.theme === 'light' ? <Sun size={18} /> : <Monitor size={18} />}</button>
        </nav>
      </header>

      <main className="v30-main">
        {view === 'home' && <HomeView settings={settings} progress={progress} featuredDay={featuredDay} todayDay={todayDay} completedDays={completedDays} completionPct={completionPct} isChildDayDone={isChildDayDone} openDay={openDay} goSemester={() => setView('semester')} />}
        {view === 'semester' && <SemesterView settings={settings} isDayDone={isDayDone} openDay={openDay} goHome={() => setView('home')} />}
        {view === 'achievements' && <AchievementsView settings={settings} progress={progress} completedDays={completedDays} goHome={() => setView('home')} goShop={() => setView('shop')} />}
        {view === 'character' && <CharacterView settings={settings} progress={progress} goHome={() => setView('home')} />}
        {view === 'report' && <LearningReportView settings={settings} progress={progress} isChildDayDone={isChildDayDone} goHome={() => setView('home')} goSettings={requestSettings} cloudStatus={cloudStatus} />}
        {view === 'shop' && <TreasureShopView settings={settings} progress={progress} goHome={() => setView('achievements')} />}
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

      <footer className="footer v30-footer">
        <div><strong>教材來源</strong>{youtubeChannelLinks.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>)}</div>
        <div className="asset-credit">V3.0 採 Premium Storybook Adventure EdTech 視覺系統；品牌場景與 Adventure World 使用 ChatGPT Image 製作並裁切為 WebP，主要場景素材位於 <code>public/assets/v30/</code>，既有角色進化素材保留作可解鎖 Avatar／Costume。功能圖示統一採 <a href="https://lucide.dev/" target="_blank" rel="noreferrer">Lucide（ISC）</a>。</div>
      </footer>
      {rewardToast && <div className="reward-toast v30-reward-toast" key={rewardToast.id}><img src={v23Asset('robot-helper.webp')} alt="小星" /><div><strong>{rewardToast.title}</strong><span>{rewardToast.detail}</span></div></div>}
      {adminPromptOpen && <AdminPinDialog familyPin={familyPin} onUnlock={unlockAdmin} onClose={() => setAdminPromptOpen(false)} />}
      {userPromptOpen && <UserSwitchDialog users={settings.users} activeUserId={activeUserId} onActivate={activateUser} onClose={() => setUserPromptOpen(false)} />}
    </div>
  );
}

function HomeView({ settings, progress, featuredDay, todayDay, completedDays, completionPct, isChildDayDone, openDay, goSemester }: {
  settings: AppSettings;
  progress: AppProgress;
  featuredDay: CourseDay;
  todayDay?: CourseDay;
  completedDays: number;
  completionPct: number;
  isChildDayDone: (childId: string, day: CourseDay) => boolean;
  openDay: (day: CourseDay) => void;
  goSemester: () => void;
}) {
  const featuredDate = addCourseWeekdays(settings.semesterStart, featuredDay.index - 1);
  const activeChildren = settings.children.filter((child) => !child.disabled).slice(0, 2);
  const todayWords = featuredDay.blocks[0].vocabulary.slice(0, 3);
  const worldCards = [
    ...visualThemeOptions.map((option) => ({ title: option.title, subtitle: option.subtitle, art: worldArtByTheme[option.id] })),
    { title: 'Space Station', subtitle: '太空與科學探索', art: 'world-space.webp' },
  ];

  return (
    <div className="page home-page v30-home">
      <section className="v30-story-hero">
        <div className="v30-hero-copy">
          <span className="v30-overline">TODAY'S ADVENTURE · DAY {featuredDay.index}</span>
          <h1>今天一起去冒險！</h1>
          <h2>{featuredDay.title}</h2>
          <div className="v30-today-learning"><BookOpen size={20} /><span>今天要學</span><strong>{todayWords.join(' · ')}</strong></div>
          <div className="v30-hero-actions">
            <button className="v30-primary-cta" onClick={() => openDay(featuredDay)}><PlayCircle size={23} />開始今天的冒險</button>
            <button className="v30-secondary-cta" onClick={goSemester}><Map size={19} />看看冒險地圖</button>
          </div>
          <small>{todayDay ? formatCourseDate(featuredDate) : `下一個任務 · ${formatCourseDate(featuredDate)}`}</small>
        </div>
        <div className="v30-hero-illustration" aria-hidden="true"><img src={v30Asset('hero-storybook.webp')} alt="" /></div>
      </section>

      <section className="v30-section v30-world-section">
        <div className="v30-section-heading"><div><span className="v30-overline">ADVENTURE WORLDS</span><h2>選擇你的冒險世界</h2></div><button className="v30-text-link" onClick={goSemester}>查看全部課程 <ChevronRight size={18} /></button></div>
        <div className="v30-world-grid">{worldCards.map((world) => <button className="v30-world-card" key={world.title} onClick={goSemester}><img src={v30Asset(world.art)} alt="" /><span><strong>{world.title}</strong><small>{world.subtitle}</small></span></button>)}</div>
      </section>

      <section className="v30-section v30-journey-section">
        <div className="v30-section-heading"><div><span className="v30-overline">LEARNING JOURNEY</span><h2>今天只要走完四步</h2></div><span className="v30-progress-label">學期進度 {completionPct}%</span></div>
        <div className="v30-journey-grid">
          <article><span className="v30-step-number">1</span><Headphones size={28} /><strong>Listen</strong><small>先聽一聽</small></article>
          <article><span className="v30-step-number">2</span><MessageCircle size={28} /><strong>Repeat</strong><small>跟著說一說</small></article>
          <article><span className="v30-step-number">3</span><Gamepad2 size={28} /><strong>Play</strong><small>動手玩任務</small></article>
          <article><span className="v30-step-number">4</span><CheckCircle2 size={28} /><strong>Complete</strong><small>完成就領獎</small></article>
        </div>
      </section>

      <section className="v30-section v30-growth-section">
        <div className="v30-section-heading"><div><span className="v30-overline">MY CHARACTERS</span><h2>我們今天也長大了一點</h2></div><span className="v30-streak"><Flame size={18} /> 已完成 {completedDays} 個學習日</span></div>
        <div className="v30-character-strip">{activeChildren.map((child) => { const rewards = calculateRewards(progress[child.id]); const childDays = curriculum.filter((day) => isChildDayDone(child.id, day)).length; const nextStage = nextAvatarStageXp(rewards.xp); return <article key={child.id}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={104} showStage /><div><span>Lv.{levelFromXp(rewards.xp)}</span><h3>{child.name}</h3><ProgressBar value={childDays} max={90} /><small>{nextStage ? `再 ${Math.max(0, nextStage - rewards.xp)} XP 進化` : '已達最高進化'}</small></div></article>; })}</div>
      </section>
    </div>
  );
}

function AchievementsView({ settings, progress, completedDays, goHome, goShop }: { settings: AppSettings; progress: AppProgress; completedDays: number; goHome: () => void; goShop: () => void }) {
  const milestones = [
    { days: 5, title: '第一張冒險地圖', art: 'star' as const },
    { days: 30, title: '故事好朋友', art: 'xp' as const },
    { days: 60, title: '遠方探險家', art: 'rocket' as const },
    { days: 90, title: '學期故事王', art: 'trophy' as const },
  ];
  return (
    <div className="page v30-secondary-page v30-rewards-page">
      <div className="v30-page-heading"><button className="icon-button" onClick={goHome}><ArrowLeft size={20} /></button><div><span className="v30-overline">REWARDS</span><h1>我的獎勵</h1><p>完成學習後，獎勵才出場。角色成長比數字更重要。</p></div><button className="v30-secondary-cta" onClick={goShop}><Gift size={19} />打開寶物櫃</button></div>
      <section className="v30-section"><div className="v30-section-heading"><div><span className="v30-overline">MILESTONES</span><h2>冒險里程碑</h2></div></div><div className="v30-milestone-grid">{milestones.map((item) => <article className={completedDays >= item.days ? 'unlocked' : ''} key={item.days}><AnimatedBadge art={item.art} size={68} /><div><span>{item.days} 個學習日</span><strong>{item.title}</strong><small>{completedDays >= item.days ? '已解鎖，做得很好！' : `再完成 ${Math.max(0, item.days - completedDays)} 天`}</small></div></article>)}</div></section>
      <section className="v30-section"><div className="v30-section-heading"><div><span className="v30-overline">LEARNER GROWTH</span><h2>角色成長</h2></div></div><div className="v30-character-strip">{settings.children.filter((child) => !child.disabled).map((child) => { const normalized = normalizeProgress(progress[child.id]); const rewards = calculateRewards(normalized); return <article key={child.id}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={108} showStage /><div><span>Lv.{levelFromXp(rewards.xp)}</span><h3>{child.name}</h3><ProgressBar value={avatarStageFromXp(rewards.xp)} max={4} /><small>{rewards.xp} XP · {rewards.coins} 金幣 · 彩蛋 {normalized.claimedEggs.length}/{easterEggDays.size}</small></div></article>; })}</div></section>
    </div>
  );
}

function CharacterView({ settings, progress, goHome }: { settings: AppSettings; progress: AppProgress; goHome: () => void }) {
  return (
    <div className="page v30-secondary-page v30-character-page">
      <div className="v30-page-heading"><button className="icon-button" onClick={goHome}><ArrowLeft size={20} /></button><div><span className="v30-overline">MY CHARACTER</span><h1>我的角色</h1><p>每完成一次真實學習，角色就離下一階進化更近一步。</p></div></div>
      <div className="v30-character-gallery">{settings.children.filter((child) => !child.disabled).map((child) => { const rewards = calculateRewards(progress[child.id]); const stage = avatarStageFromXp(rewards.xp); const nextStage = nextAvatarStageXp(rewards.xp); return <article key={child.id}><div className="v30-character-stage"><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={190} showStage /></div><div><span className="v30-overline">{child.name} · LEVEL {levelFromXp(rewards.xp)}</span><h2>{avatarName(child.avatar)}</h2><p>{stage === 4 ? '已完成目前最高進化。' : `再累積 ${Math.max(0, (nextStage ?? rewards.xp) - rewards.xp)} XP，就會解鎖下一個造型。`}</p><ProgressBar value={stage} max={4} /><div className="v30-character-reward"><AnimatedBadge art="xp" size={42} /><strong>{rewards.xp} XP</strong><span>進化 {stage}/4</span></div></div></article>; })}</div>
      <div className="v30-mascot-note"><img src={v23Asset('robot-helper.webp')} alt="小星" /><div><strong>小星提醒</strong><p>角色造型是冒險獎勵，不會改變學習資料。每一點 XP 都來自你真正完成的任務。</p></div></div>
    </div>
  );
}

function LearningReportView({ settings, progress, isChildDayDone, goHome, goSettings, cloudStatus }: { settings: AppSettings; progress: AppProgress; isChildDayDone: (childId: string, day: CourseDay) => boolean; goHome: () => void; goSettings: () => void; cloudStatus: CloudStatus }) {
  return (
    <div className="page v30-parent-page">
      <div className="v30-parent-heading"><div><button className="icon-button" onClick={goHome}><ArrowLeft size={20} /></button><div><span className="v30-overline">PARENT MODE</span><h1>家長學習中心</h1><p>學習報表、家庭設定、PIN 與雲端資訊集中在這裡，不干擾兒童首頁。</p></div></div><div className="v30-parent-actions"><CloudPill status={cloudStatus} /><button className="v30-secondary-cta" onClick={goSettings}><SettingsIcon size={18} />家庭設定</button></div></div>
      <section className="v30-report-summary"><article><strong>18</strong><span>學習週</span></article><article><strong>90</strong><span>學習日</span></article><article><strong>180</strong><span>課程單元</span></article><article><strong>360</strong><span>互動任務</span></article></section>
      <section className="v30-parent-panel"><div className="v30-section-heading"><div><span className="v30-overline">LEARNER PROGRESS</span><h2>學習者進度</h2></div><GraduationCap size={24} /></div><div className="v30-report-list">{settings.children.map((child) => { const normalized = normalizeProgress(progress[child.id]); const rewards = calculateRewards(normalized); const days = curriculum.filter((day) => isChildDayDone(child.id, day)).length; return <article key={child.id}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={74} /><div className="report-main"><div><span>學習者</span><h3>{child.name}</h3></div><ProgressBar value={days} max={90} /><small>{days}/90 天 · {normalized.completedBlocks.length}/180 單元 · {normalized.completedMissions.length}/360 任務</small></div><div className="report-rewards"><strong>{rewards.xp}</strong><span>XP</span><strong>{rewards.coins}</strong><span>金幣</span></div></article>; })}</div></section>
    </div>
  );
}

function TreasureShopView({ settings, progress, goHome }: { settings: AppSettings; progress: AppProgress; goHome: () => void }) {
  const familyCoins = settings.children.reduce((sum, child) => sum + calculateRewards(progress[child.id]).coins, 0);
  const items = [
    { coins: 80, title: '故事貼紙包', detail: '家庭累積 80 金幣解鎖', art: 'treasure' as const },
    { coins: 180, title: '彩虹收藏石', detail: '家庭累積 180 金幣解鎖', art: 'crystal' as const },
    { coins: 320, title: '冒險旅行票', detail: '家庭累積 320 金幣解鎖', art: 'rocket' as const },
    { coins: 520, title: '故事皇冠展示座', detail: '家庭累積 520 金幣解鎖', art: 'trophy' as const },
  ];
  return <div className="page v22-secondary-page"><div className="page-heading"><button className="icon-button" onClick={goHome}><ArrowLeft size={19} /></button><div><span className="eyebrow">TREASURE SHOP</span><h1>獎勵寶箱</h1><p>V3.0 延續「累積達標即解鎖」而不是扣除金幣，因此不會破壞由完成紀錄即時計算的獎勵模型。</p></div></div><section className="v22-panel"><div className="v22-shop-wallet"><AnimatedBadge art="treasure" size={66} /><div><span>家庭目前累積</span><strong>{familyCoins} 金幣</strong></div></div><div className="v22-shop-grid">{items.map((item) => { const unlocked = familyCoins >= item.coins; return <article className={unlocked ? 'unlocked' : ''} key={item.title}><AnimatedBadge art={item.art} size={76} /><span>{unlocked ? '已解鎖' : `${item.coins} 金幣`}</span><h3>{item.title}</h3><p>{unlocked ? '已放入家庭收藏展示櫃。' : item.detail}</p></article>; })}</div></section></div>;
}

function SemesterView({ settings, isDayDone, openDay, goHome }: { settings: AppSettings; isDayDone: (day: CourseDay) => boolean; openDay: (day: CourseDay) => void; goHome: () => void }) {
  return (
    <div className="page">
      <div className="page-heading"><button className="icon-button" onClick={goHome}><ArrowLeft size={19} /></button><div><span className="eyebrow">FULL SEMESTER</span><h1>18 週完整學習地圖</h1><p>{semesterStats.days} 天 · {semesterStats.blocks} 節活動單元 · 約 {semesterStats.minutes / 60} 小時家庭共學</p></div></div>
      <div className="week-list">{weekSummaries.map((week) => {
        const days = curriculum.filter((day) => day.week === week.week);
        const doneCount = days.filter(isDayDone).length;
        return <section className="week-card" key={week.week}><div className="week-head"><div className="week-number">W{String(week.week).padStart(2, '0')}</div><div className="week-copy"><h2>{week.title}</h2><p>{week.bigIdea}</p></div><div className="week-progress"><strong>{doneCount}/5</strong><small>完成</small></div></div><div className="week-vocab">{week.vocab.slice(0, 7).map((word) => <span key={word}>{word}</span>)}</div><div className="week-days">{days.map((day) => { const date = addCourseWeekdays(settings.semesterStart, day.index - 1); const done = isDayDone(day); return <button key={day.id} onClick={() => openDay(day)} className={`week-day-button ${done ? 'done' : ''}`}><div><span>DAY {day.index}</span><strong>{day.title.split('｜')[1]}</strong><small>{formatCourseDate(date)}</small></div>{done ? <CheckCircle2 size={21} /> : <ChevronRight size={20} />}</button>; })}</div></section>;
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
    <div className="lesson-page v30-lesson-page">
      <header className="v30-lesson-header">
        <button className="icon-button" onClick={onBack}><ArrowLeft size={20} /></button>
        <div className="lesson-header-copy"><span>WEEK {day.week} · {formatCourseDate(date)}</span><h1>{day.title}</h1><p>{day.bigIdea}</p></div>
        <div className="mission-badge"><Map size={20} /> Day {day.index} / 90</div>
        {easterEggDays.has(day.index) && <EasterEgg day={day} settings={settings} progress={progress} participants={participants} onClaim={onClaimEgg} />}
      </header>

      <main className="lesson-content">
        <section className="attendance-panel v30-attendance-panel">
          <div><span className="v30-overline">TODAY'S LEARNERS</span><h2><PhoneticText text="今天誰一起上課" />？</h2><p>選好今天一起冒險的小朋友。</p></div>
          <div className="attendance-chips">{settings.children.filter((child) => !child.disabled).map((child) => {
            const active = participants.includes(child.id); const rewards = calculateRewards(progress[child.id]);
            return <button key={child.id} className={`attendance-chip ${active ? 'active' : ''}`} onClick={() => onToggleAttendance(child.id)}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={42} /><strong>{child.name}</strong>{active ? <Check size={17} /> : <Circle size={17} />}</button>;
          })}</div>
        </section>

        <details className="v30-parent-guide-quick">
          <summary><Users size={20} /> 家長帶課提醒 <ChevronRight size={18} /></summary>
          <div><h3>你是今天的節奏控制員</h3><p>孩子想說話、指畫面、笑出來或開始分心，就暫停。影片是教材，不是整堂課；4 歲只說單字也算成功，6 歲再往完整句推進。</p></div>
        </details>

        {day.blocks.map((block, blockIndex) => <LessonBlockView key={block.id} block={block} blockIndex={blockIndex} day={day} settings={settings} progress={progress} participants={participants} onToggleMission={onToggleMission} onToggleBlock={onToggleBlock} />)}

        <section className="bonus-card v30-bonus-card"><div className="bonus-icon rich-bonus-icon"><AnimatedBadge art="treasure" size={58} /></div><div><span className="v30-overline">BONUS</span><h3><PhoneticText text="今天還想再玩一下嗎" />？</h3><p>{day.bonus}</p></div></section>
        <details className="v30-parent-guide-quick v30-reflection-wrap"><summary><CalendarDays size={20} /> 家長課後紀錄 <ChevronRight size={18} /></summary><ReflectionPanel day={day} reflection={reflection} onUpdate={onUpdateReflection} /></details>
      </main>
    </div>
  );
}

function EasterEgg({ day, settings, progress, participants, onClaim }: { day: CourseDay; settings: AppSettings; progress: AppProgress; participants: string[]; onClaim: (childId: string) => void }) {
  const [revealed, setRevealed] = useState(false);
  const eggId = `egg-day-${day.index}`;
  return (
    <div className={`secret-egg ${revealed ? 'revealed' : ''}`}>
      {!revealed ? <button className="secret-egg-trigger" onClick={() => setRevealed(true)} title="這裡好像有東西…"><AnimatedBadge art="crystal" size={24} label="隱藏彩蛋" /></button> : (
        <div className="egg-popover"><strong>找到祕密彩蛋！</strong><span>今天上課的小朋友都可以各領一次。</span><div>{settings.children.filter((child) => participants.includes(child.id)).map((child) => {
          const claimed = normalizeProgress(progress[child.id]).claimedEggs.includes(eggId);
          return <button key={child.id} disabled={claimed} onClick={() => onClaim(child.id)}>{claimed ? '✓ 已領' : `${child.name} 領獎`}</button>;
        })}</div></div>
      )}
    </div>
  );
}

function ReflectionPanel({ day, reflection, onUpdate }: { day: CourseDay; reflection: DayReflection; onUpdate: (patch: Partial<DayReflection>) => void }) {
  const viewingLabels: Record<ViewingStatus, string> = { full: '完整看', partial: '片段看', skip: '跳過' };
  const engagementOptions = [{ value: 'great' as const, label: '很投入' }, { value: 'ok' as const, label: '普通' }, { value: 'tired' as const, label: '今天累了' }];
  const setViewing = (blockId: string, status: ViewingStatus) => onUpdate({ viewing: { ...reflection.viewing, [blockId]: status } });
  return (
    <section className="reflection-card enlarged-reflection">
      <div className="panel-heading"><CalendarDays size={22} /><div><span className="eyebrow">30-SECOND LOG</span><h3><PhoneticText text="課後紀錄" /></h3></div></div>
      <p className="reflection-help">只記「實際發生什麼」，不是替孩子打成績。影片只看片段完全可以；如果今天累了，也照實留下紀錄。</p>
      <div className="viewing-log-grid">{day.blocks.map((block, index) => <div className="viewing-log-row" key={block.id}><strong>第 {index + 1} 節影片看多少？</strong><div className="viewing-options">{(['full', 'partial', 'skip'] as ViewingStatus[]).map((status) => <button key={status} className={reflection.viewing[block.id] === status ? 'active' : ''} onClick={() => setViewing(block.id, status)}>{viewingLabels[status]}</button>)}</div></div>)}</div>
      <div className="engagement-row">{engagementOptions.map((option) => <button key={option.value} className={reflection.engagement === option.value ? 'active' : ''} onClick={() => onUpdate({ engagement: option.value })}>{option.label}</button>)}</div>
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
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const action = subjectAction(block.subject);
  const stageItems = [
    { label: 'Listen', note: '先聽一聽', icon: Headphones },
    { label: 'Repeat', note: '跟著說一說', icon: MessageCircle },
    { label: 'Play', note: '動手玩任務', icon: Gamepad2 },
    { label: 'Complete', note: '完成並領獎', icon: CheckCircle2 },
  ] as const;
  const participantChildren = settings.children.filter((child) => participants.includes(child.id));

  return (
    <section className="v30-lesson-block">
      <div className="v30-block-heading">
        <div><span className="v30-overline">LESSON {blockIndex + 1} · {block.duration} MIN</span><h2>{block.title}</h2></div>
        <SubjectBadge subject={block.subject} />
      </div>

      <div className="v30-stage-nav" aria-label="學習步驟">{stageItems.map((item, index) => { const Icon = item.icon; const active = stage === index; return <button key={item.label} className={active ? 'active' : ''} onClick={() => setStage(index as 0 | 1 | 2 | 3)}><span>{index + 1}</span><Icon size={22} /><strong>{item.label}</strong><small>{item.note}</small></button>; })}</div>

      {stage === 0 && <div className="v30-stage-panel v30-listen-stage">
        <div className="v30-stage-intro v30-listen-intro"><img className="v30-world-thumb" src={v30Asset(lessonWorldArt(block))} alt="本節冒險世界" /><div><span className="v30-overline">STEP 1 · LISTEN</span><h3>耳朵準備好了嗎？</h3><p>先走進今天的 Storybook 世界，跟著唱跳暖身，再看主影片。想說話、想指畫面，就可以暫停。</p></div><img className="v30-mascot-mini" src={v23Asset('robot-helper.webp')} alt="小星" /></div>
        <div className="v30-video-pair"><VideoPlayer clip={block.warmup} compact warmup /><VideoPlayer clip={block.video} /></div>
        <button className="v30-primary-cta v30-next-stage" onClick={() => setStage(1)}>聽完了，下一步 <ChevronRight size={20} /></button>
      </div>}

      {stage === 1 && <div className="v30-stage-panel v30-repeat-stage">
        <div className="v30-stage-intro"><img src={v23Asset('robot-helper.webp')} alt="小星" /><div><span className="v30-overline">STEP 2 · REPEAT</span><h3>看看、聽聽、跟著說</h3><p>點一下單字卡可以播放英文發音。每次只看一個字，不用一次全部記住。</p></div></div>
        <div className="v30-vocab-grid">{block.vocabulary.map((word) => <VocabularyCard key={word} word={word} block={block} />)}</div>
        <div className="v30-sentence-practice"><span>今天的句子</span><strong>{block.sentence}</strong><button onClick={() => speakWord(block.sentence)}><Volume2 size={19} /> 聽句子</button></div>
        <div className="v30-stage-actions"><button className="v30-secondary-cta" onClick={() => setStage(0)}><ArrowLeft size={18} />上一步</button><button className="v30-primary-cta" onClick={() => setStage(2)}>我會說了 <ChevronRight size={20} /></button></div>
      </div>}

      {stage === 2 && <div className="v30-stage-panel v30-play-stage">
        <div className="v30-stage-intro"><img src={v23Asset('robot-helper.webp')} alt="小星" /><div><span className="v30-overline">STEP 3 · PLAY</span><h3>現在來玩任務</h3><p>{action.text}</p></div></div>
        <div className="v30-mission-grid">{block.missions.map((mission, missionIndex) => <article className="v30-mission-card" key={mission.id}><div className="v30-mission-number">{missionIndex + 1}</div><div><span>{mission.title}</span><h4>{mission.prompt}</h4><p><strong>完成標準</strong>{mission.criteria}</p></div><div className="v30-mission-players">{participantChildren.map((child) => { const done = progress[child.id]?.completedMissions.includes(mission.id) ?? false; const rewards = calculateRewards(progress[child.id]); return <button key={child.id} className={done ? 'done' : ''} onClick={() => onToggleMission(child.id, mission)}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={38} /><span>{child.name}</span>{done ? <CheckCircle2 size={20} /> : <span className="v30-reward-chip">+{mission.xp} XP</span>}</button>; })}</div></article>)}</div>
        <div className="v30-stage-actions"><button className="v30-secondary-cta" onClick={() => setStage(1)}><ArrowLeft size={18} />上一步</button><button className="v30-primary-cta" onClick={() => setStage(3)}>任務完成了 <ChevronRight size={20} /></button></div>
      </div>}

      {stage === 3 && <div className="v30-stage-panel v30-complete-stage">
        <div className="v30-success-scene"><img src={v23Asset('robot-helper.webp')} alt="小星" /><div><span className="v30-overline">STEP 4 · COMPLETE</span><h3>最後一步，領取今天的成長！</h3><p>兩個任務完成後，就可以正式完成這一節。</p></div></div>
        <div className="v30-complete-buttons">{participantChildren.map((child) => { const childProgress = normalizeProgress(progress[child.id]); const done = childProgress.completedBlocks.includes(block.id); const ready = block.missions.every((mission) => childProgress.completedMissions.includes(mission.id)); const rewards = calculateRewards(childProgress); return <button key={child.id} disabled={!done && !ready} className={done ? 'done' : ready ? 'ready' : ''} onClick={() => onToggleBlock(child.id, block)}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={48} /><span><strong>{child.name}</strong><small>{done ? '這一節已完成' : ready ? `完成並獲得 +${BLOCK_REWARD.xp} XP` : '先完成前面的 2 個任務'}</small></span>{done ? <CheckCircle2 size={24} /> : <Award size={24} />}</button>; })}</div>
        <button className="v30-secondary-cta" onClick={() => setStage(2)}><ArrowLeft size={18} />回到任務</button>
      </div>}

      <details className="v30-parent-guide"><summary><Users size={19} /> 家長帶課指南 <ChevronRight size={18} /></summary><div className="v30-parent-guide-body"><div><span className="v30-overline">CAREGIVER SCRIPT</span><h3>照著做就能上課</h3><div className="timeline">{block.steps.map((step, index) => <div className="timeline-step" key={`${block.id}-${index}`}><div className="time-dot"><span>{step.minute}</span></div><div><h4>{step.title}</h4><p>{step.instruction}</p>{step.cue && <div className="pause-cue">暫停提示：{step.cue}</div>}</div></div>)}</div></div><aside><div className="tip-card"><strong>帶課提醒</strong><p>{block.caregiverTip}</p></div><div className="level-card"><div><span>初階</span><p>{block.younger}</p></div><div><span>進階</span><p>{block.older}</p></div></div></aside></div></details>
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
  const [userPinDrafts, setUserPinDrafts] = useState<Record<string, string>>({});
  const [userPinMessages, setUserPinMessages] = useState<Record<string, string>>({});
  const [nextFamilyPin, setNextFamilyPin] = useState('');
  const [pinSwitchError, setPinSwitchError] = useState('');

  const addUser = () => {
    const id = `user-${Date.now()}`;
    const user: FamilyUserProfile = { id, name: `照顧者 ${settings.users.length + 1}`, role: 'caregiver', disabled: false };
    setSettings((current) => ({ ...current, users: [...current.users, user] }));
  };
  const updateUser = (id: string, patch: Partial<FamilyUserProfile>) => setSettings((current) => ({ ...current, users: current.users.map((user) => user.id === id ? { ...user, ...patch } : user) }));
  const removeUser = (id: string) => {
    if (settings.users.length <= 1) return;
    const user = settings.users.find((item) => item.id === id);
    if (!user || !window.confirm(`確定要刪除「${user.name}」的登入帳號嗎？學習者進度不會受影響。`)) return;
    setSettings((current) => ({ ...current, users: current.users.filter((item) => item.id !== id) }));
  };

  const addChild = () => {
    const id = `child-${Date.now()}`;
    const child: ChildProfile = { id, name: `學習者 ${settings.children.length + 1}`, avatar: avatarOptions[settings.children.length % avatarOptions.length].id, role: 'child', disabled: false };
    setSettings((current) => ({ ...current, children: [...current.children, child] }));
  };
  const updateChild = (id: string, patch: Partial<ChildProfile>) => setSettings((current) => ({ ...current, children: current.children.map((child) => child.id === id ? { ...child, ...patch } : child) }));
  const removeChild = (id: string) => {
    if (settings.children.length <= 1) return;
    const child = settings.children.find((item) => item.id === id);
    if (!child || !window.confirm(`確定要刪除學習者「${child.name}」嗎？此操作會移除這位孩子的學習進度與出席紀錄。`)) return;
    setSettings((current) => ({ ...current, children: current.children.filter((item) => item.id !== id) }));
    setProgress((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setAttendance((current) => Object.fromEntries(Object.entries(current).map(([dayId, participants]) => [dayId, participants.filter((participant) => participant !== id)])));
  };

  const setUserPin = async (user: FamilyUserProfile) => {
    const pin = normalizeFamilyPin(userPinDrafts[user.id] ?? '');
    if (!validFamilyPin(pin)) {
      setUserPinMessages((current) => ({ ...current, [user.id]: '請輸入 4–6 位數字 PIN。' }));
      return;
    }
    const credential = await createUserPinCredential(pin);
    updateUser(user.id, {
      userPinHash: credential.hash,
      userPinSalt: credential.salt,
      userPinIterations: credential.iterations,
    });
    setUserPinDrafts((current) => ({ ...current, [user.id]: '' }));
    setUserPinMessages((current) => ({ ...current, [user.id]: '個人 PIN 已安全更新。' }));
  };

  const clearUserPin = (user: FamilyUserProfile) => {
    updateUser(user.id, { userPinHash: '', userPinSalt: '', userPinIterations: 0 });
    setUserPinMessages((current) => ({ ...current, [user.id]: '個人 PIN 已清除。' }));
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: 2, settings, progress, attendance, reflections }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `小小探險隊-V3.0-學習紀錄-${ymd(new Date())}.json`; a.click(); URL.revokeObjectURL(url);
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
    <div className="page settings-page v2-settings v30-parent-page">
      <div className="v30-parent-heading"><div><button className="icon-button" onClick={goHome}><ArrowLeft size={20} /></button><div><span className="v30-overline">PARENT MODE · V3.0</span><h1>家庭學習管理中心</h1><p>家庭管理者可管理成員、個人 PIN、Adventure World、雲端同步與高風險資料操作。</p></div></div></div>
      <div className="admin-unlocked-banner"><div><strong>管理者 PIN 已解鎖</strong><span>目前為家庭最高管理權限；離開家庭或重新載入後需再次驗證。</span></div><KeyRound size={20} /></div>
      <section className="v22-family-hero v30-family-summary" aria-label="家庭管理中心">
        <div><span className="v30-overline">FAMILY CONTROL</span><h2>全家的學習資料，由管理者守護</h2><p>照顧者帳號、學習者、個人 PIN、雲端同步與冒險世界都集中在這裡管理；兒童首頁不顯示這些系統資訊。</p></div>
        <div className="v22-family-hero-art" aria-hidden="true"><img src={v23Asset('avatar-father.webp')} alt="" /><img src={v23Asset('avatar-mother.webp')} alt="" /><img className="robot" src={v23Asset('robot-helper.webp')} alt="" /></div>
      </section>

      <section className="settings-card"><div className="setting-label"><span className="setting-icon"><Sun size={20} /></span><div><h3>顯示明暗</h3><p>亮色、暗色或跟隨裝置系統。</p></div></div><div className="segmented-control">{(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => <button key={mode} className={settings.theme === mode ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, theme: mode }))}>{mode === 'system' ? <Monitor size={17} /> : mode === 'light' ? <Sun size={17} /> : <Moon size={17} />}{mode === 'system' ? '隨系統' : mode === 'light' ? '明亮' : '暗黑'}</button>)}</div></section>

      <section className="settings-card vertical theme-settings-card">
        <div className="setting-label"><span className="setting-icon"><Map size={20} /></span><div><h3>Adventure World</h3><p>世界只改變學習環境與插畫情境；按鈕、導航、卡片、字體與品牌設計保持一致。</p></div></div>
        <div className="visual-theme-grid">{visualThemeOptions.map((option) => <button key={option.id} className={`visual-theme-option ${settings.visualTheme === option.id ? 'active' : ''}`} onClick={() => setSettings((current) => ({ ...current, visualTheme: option.id }))}><img className="visual-theme-art" src={v30Asset(option.art)} alt="" aria-hidden="true" /><div><strong>{option.title}</strong><small>{option.subtitle}</small></div>{settings.visualTheme === option.id && <CheckCircle2 size={18} />}</button>)}</div>
      </section>

      <section className="settings-card"><div className="setting-label"><span className="setting-icon"><CalendarDays size={20} /></span><div><h3>學期起始日</h3><p>改日期後，90 個平日課程會自動重新排程，首頁月份日曆也一起更新。</p></div></div><input className="date-input" type="date" value={settings.semesterStart} onChange={(e) => setSettings((current) => ({ ...current, semesterStart: e.target.value }))} /></section>

      <section className="settings-card vertical user-admin-card">
        <div className="setting-label"><span className="setting-icon"><Users size={20} /></span><div><h3>家長／照顧者登入帳號</h3><p>這些是操作網站的大人帳號，頂部「切換使用者」只會列出這裡的人。爸爸、媽媽或其他照顧者可各自設定 4–6 位 PIN；學習 XP 不會記在大人帳號上。</p></div></div>
        <div className="caregiver-settings-list">{settings.users.map((user) => (
          <div className={`child-setting-card caregiver-setting-card ${user.disabled ? 'is-disabled' : ''}`} key={user.id}>
            <div className="child-setting-head">
              <CaregiverAvatar user={user} size={88} />
              <div className="child-name-editor">
                <input value={user.name} onChange={(e) => updateUser(user.id, { name: e.target.value })} />
                <span>{roleLabel(user.role)} · 網站登入帳號</span>
              </div>
              <button className="icon-button danger" onClick={() => removeUser(user.id)} disabled={settings.users.length <= 1} title="刪除登入帳號"><Trash2 size={17} /></button>
            </div>
            <div className="user-admin-row">
              <label>身份<select value={user.role} onChange={(e) => updateUser(user.id, { role: e.target.value as FamilyUserRole })}>{userRoleOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
              <label className="status-toggle"><input type="checkbox" checked={!user.disabled} onChange={(e) => updateUser(user.id, { disabled: !e.target.checked })} /><span>{user.disabled ? '已停用' : '可登入'}</span></label>
            </div>
            <div className="user-pin-editor">
              <div><strong><KeyRound size={16} /> 個人 PIN</strong><small>{hasUserPin(user) ? 'PBKDF2 驗證已啟用；切換到這位家長／照顧者時會要求輸入。' : '尚未設定；管理者可建立 4–6 位個人 PIN。'}</small></div>
              <div className="user-pin-controls"><input type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={userPinDrafts[user.id] ?? ''} onChange={(e) => setUserPinDrafts((current) => ({ ...current, [user.id]: normalizeFamilyPin(e.target.value) }))} placeholder="輸入新 PIN" /><button className="secondary-button" onClick={() => void setUserPin(user)}>{hasUserPin(user) ? '重設 PIN' : '設定 PIN'}</button>{hasUserPin(user) && <button className="text-button danger-text" onClick={() => clearUserPin(user)}>清除</button>}</div>
              {userPinMessages[user.id] && <span className="user-pin-message">{userPinMessages[user.id]}</span>}
            </div>
          </div>
        ))}</div>
        <button className="secondary-button add-child" onClick={addUser}><Plus size={18} /> 新增家長／照顧者</button>
      </section>

      <section className="settings-card vertical learner-admin-card">
        <div className="setting-label"><span className="setting-icon"><GraduationCap size={20} /></span><div><h3>小小探險隊學習者</h3><p>哥哥、弟弟等孩子只存在於學習者名單；每人分開計算出席、任務、XP、金幣與角色進化，不會出現在頂部登入帳號選單。</p></div></div>
        <div className="children-settings-list v2-children-settings">{settings.children.map((child) => {
          const rewards = calculateRewards(progress[child.id]); const stage = avatarStageFromXp(rewards.xp);
          return (
            <div className={`child-setting-card ${child.disabled ? 'is-disabled' : ''}`} key={child.id}>
              <div className="child-setting-head">
                <AvatarHero avatarId={child.avatar} xp={rewards.xp} size={94} showStage />
                <div className="child-name-editor">
                  <input value={child.name} onChange={(e) => updateChild(child.id, { name: e.target.value })} />
                  <span>學習者 · {avatarName(child.avatar)} · Level {levelFromXp(rewards.xp)} · 進化 {stage}/4</span>
                  <div className="child-inline-stats"><span><Zap size={15} /> {rewards.xp} XP</span><span><Coins size={15} /> {rewards.coins}</span></div>
                </div>
                <button className="icon-button danger" onClick={() => removeChild(child.id)} disabled={settings.children.length <= 1} title="刪除學習者"><Trash2 size={17} /></button>
              </div>
              <div className="user-admin-row"><label className="status-toggle"><input type="checkbox" checked={!child.disabled} onChange={(e) => updateChild(child.id, { disabled: !e.target.checked })} /><span>{child.disabled ? '暫停參與' : '參與學習'}</span></label></div>
              <div className="avatar-choice-grid">{avatarOptions.map((option) => <button key={option.id} className={normalizeAvatarId(child.avatar) === option.id ? 'active' : ''} onClick={() => updateChild(child.id, { avatar: option.id })}><AvatarHero avatarId={option.id} xp={rewards.xp} size={46} /><span>{option.short}</span></button>)}</div>
            </div>
          );
        })}</div>
        <button className="secondary-button add-child" onClick={addChild}><Plus size={18} /> 新增學習者</button>
      </section>

      <section className="settings-card vertical cloud-settings-card pin-profile-card">
        <div className="setting-label"><span className="setting-icon"><KeyRound size={20} /></span><div><h3><PhoneticText text="家庭 PIN" /> 與雲端同步</h3><p>目前登入的家庭資料會自動存到 Vercel 私有雲端；同一組 PIN 在其他裝置登入，就會讀取同一份進度。</p></div></div>
        <div className="cloud-active-panel">
          <div className="cloud-code-box pin-code-box"><span>目前家庭管理者 PIN</span><strong>{familyPin}</strong><button className="icon-button" onClick={() => void copyCode()} title="複製管理者 PIN">{copied ? <Check size={18} /> : <Copy size={18} />}</button></div>
          <div className="family-pin-switcher">
            <div><strong>新增／切換家庭 PIN</strong><span>新 PIN 會建立新的家庭設定檔；已存在的 PIN 會載入原本那一家。</span></div>
            <div className="family-pin-switch-row"><input type="password" inputMode="numeric" maxLength={6} value={nextFamilyPin} onChange={(e) => { setNextFamilyPin(normalizeFamilyPin(e.target.value)); setPinSwitchError(''); }} onKeyDown={(e) => { if (e.key === 'Enter') openAnotherFamily(); }} placeholder="例如 0000" /><button className="secondary-button" disabled={!validFamilyPin(nextFamilyPin)} onClick={openAnotherFamily}><KeyRound size={17} /> 開啟家庭</button></div>
            {pinSwitchError && <div className="pin-error inline-pin-error">{pinSwitchError}</div>}
          </div>
          <div className={`cloud-status-box cloud-${cloudStatus}`}><CloudPill status={cloudStatus} /><p>{cloudMessage || '進度變更後會自動同步到這個家庭。'}</p>{lastCloudSync && <small>最近同步：{new Date(lastCloudSync).toLocaleString('zh-TW')}</small>}</div>
          <div className="cloud-actions"><button className="secondary-button" onClick={() => void onSyncNow()}><Cloud size={17} /> 立即儲存</button><button className="secondary-button" onClick={() => void onPullCloud()}><RefreshCw size={17} /> 重新讀取雲端</button><button className="secondary-button danger-outline" onClick={onSwitchFamily}><LogOut size={17} /> 切換家庭</button></div>
          <p className="cloud-security-note">管理者 PIN 同時作為V3.0 介面所沿用的 V2.2 相容家庭 namespace 管理憑證。請使用不易猜測的 4–6 位數字，不要分享給一般使用者；一般成員應使用自己的個人 PIN。</p>
        </div>
      </section>

      <section className="settings-card vertical"><div className="setting-label"><span className="setting-icon"><BookOpen size={20} /></span><div><h3>資料備份與重設</h3><p>可另外匯出完整 V3.0 JSON（保留 V1／V2／V2.1／V2.2 相容欄位）。清除進度採兩次確認；若雲端同步開啟，清除後的新狀態也會同步到雲端。</p></div></div><div className="data-actions"><button className="secondary-button" onClick={exportData}>匯出完整學習紀錄 JSON</button><button className={`secondary-button danger-outline ${confirmReset ? 'confirming' : ''}`} onClick={resetProgress}>{confirmReset ? '再按一次確認清除' : '清除所有學習進度'}</button></div></section>
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
        <div className="pin-gate-visual v30-pin-story" aria-hidden="true">
          <img className="v30-pin-story-image" src={v30Asset('hero-storybook.webp')} alt="" />
        </div>
        <div className="pin-gate-copy">
          <span className="v30-overline">FAMILY PROFILE · V3.0</span>
          <h1>歡迎回到小小探險隊</h1>
          <p>新裝置第一次由家庭管理者輸入管理者 PIN 來載入這一家人的資料；進入家庭後，每位成員再用自己的個人 PIN 切換角色。首頁不公開列出其他家庭設定檔。</p>
          {legacyDetected && <div className="legacy-pin-note"><Sparkles size={17} /><span>偵測到這台裝置有舊版學習資料，已為你預填家庭 PIN <strong>1234</strong>；第一次進入後會自動建立獨立雲端資料。</span></div>}
          <label className="pin-input-label" htmlFor="family-pin">家庭管理者 PIN</label>
          <div className="pin-input-row">
            <KeyRound size={21} />
            <input id="family-pin" type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} value={pin} onChange={(event) => setPin(normalizeFamilyPin(event.target.value))} onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} placeholder="例如 1234" autoFocus />
            <button className="primary-button" disabled={!validFamilyPin(pin)} onClick={submit}>進入家庭基地 <ChevronRight size={18} /></button>
          </div>
          {error && <div className="pin-error">{error}</div>}
          <div className="pin-privacy-note"><Cloud size={16} /><span>管理者 PIN 不會寫入 URL、Git 或公開 Blob 路徑；雲端 namespace 會先以伺服器端 FAMILY_PIN_PEPPER 做 HMAC 轉換。</span></div>
        </div>
      </section>
    </main>
  );
}

function App() {
  const [familyPin, setFamilyPin] = useState(() => {
    const saved = normalizeFamilyPin(localStorage.getItem(ACTIVE_PIN_KEY) ?? localStorage.getItem(LEGACY_ACTIVE_PIN_KEY) ?? '');
    return validFamilyPin(saved) ? saved : '';
  });

  const enterFamily = (pin: string) => {
    localStorage.setItem(ACTIVE_PIN_KEY, pin);
    localStorage.removeItem(LEGACY_ACTIVE_PIN_KEY);
    setFamilyPin(pin);
  };

  const switchFamily = () => {
    localStorage.removeItem(ACTIVE_PIN_KEY);
    localStorage.removeItem(LEGACY_ACTIVE_PIN_KEY);
    setFamilyPin('');
  };

  if (!familyPin) return <PinGate onEnter={enterFamily} />;
  return <FamilyApp key={familyPin} familyPin={familyPin} onSwitchFamily={switchFamily} onOpenFamily={enterFamily} />;
}

export default App;
