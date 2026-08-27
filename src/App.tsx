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
type ClickBurst = { id: number; x: number; y: number };

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

function lessonIllustrationFile(block: LessonBlock) {
  const tags = new Set(block.requiredVideoTopics ?? []);
  if (tags.has('numbers') || tags.has('counting') || block.subject === 'Math') return 'lesson-numbers-v23.webp';
  if (tags.has('food') || tags.has('fruit') || tags.has('vegetables') || tags.has('colors')) return 'lesson-food-v23.webp';
  if (tags.has('space') || tags.has('ocean') || tags.has('dinosaurs') || tags.has('nature')) return 'lesson-space-v23.webp';
  if (tags.has('listening') || tags.has('speaking') || block.subject === 'Review') return 'lesson-review-v23.webp';
  return 'lesson-helper-v23.webp';
}

function LessonIllustration({ block }: { block: LessonBlock }) {
  return <img className="v22-lesson-illustration" src={v23Asset(lessonIllustrationFile(block))} alt="本節原創教學插圖" loading="lazy" decoding="async" />;
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
  const [view, setView] = useState<'home' | 'semester' | 'achievements' | 'report' | 'shop' | 'settings'>('home');
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('loading');
  const [cloudMessage, setCloudMessage] = useState('正在辨識家庭 PIN…');
  const [cloudReady, setCloudReady] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState('');
  const [rewardToast, setRewardToast] = useState<RewardToast>(null);
  const [bursts, setBursts] = useState<ClickBurst[]>([]);
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

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lastTrail = 0;

    const onMove = (event: PointerEvent) => {
      if (!finePointer) return;
      const cursor = document.getElementById('adventure-cursor');
      if (cursor) {
        cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
        cursor.classList.add('is-visible');
        cursor.classList.toggle('is-hovering', Boolean((event.target as Element | null)?.closest?.('button, a, input, select, textarea, [role="button"]')));
      }
      if (reducedMotion || event.timeStamp - lastTrail < 44) return;
      lastTrail = event.timeStamp;
      const layer = document.getElementById('cursor-trail-layer');
      if (!layer) return;
      const particle = document.createElement('i');
      particle.className = 'cursor-trail-particle';
      particle.style.left = `${event.clientX}px`;
      particle.style.top = `${event.clientY}px`;
      layer.appendChild(particle);
      window.setTimeout(() => particle.remove(), 680);
    };

    const onPointer = (event: PointerEvent) => {
      const id = Date.now() + Math.random();
      setBursts((current) => [...current.slice(-8), { id, x: event.clientX, y: event.clientY }]);
      window.setTimeout(() => setBursts((current) => current.filter((item) => item.id !== id)), 760);
      const cursor = document.getElementById('adventure-cursor');
      if (cursor) {
        cursor.classList.add('is-pressed');
        window.setTimeout(() => cursor.classList.remove('is-pressed'), 150);
      }
    };

    const onLeave = () => document.getElementById('adventure-cursor')?.classList.remove('is-visible');
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onPointer);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
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
        <div id="cursor-trail-layer" className="cursor-trail-layer" aria-hidden="true" />
        <div id="adventure-cursor" className="adventure-cursor" aria-hidden="true"><span /></div>
        <ClickEffects bursts={bursts} />
        {rewardToast && <div className="reward-toast" key={rewardToast.id}><Sparkles size={22} /><div><strong>{rewardToast.title}</strong><span>{rewardToast.detail}</span></div></div>}
      </>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView('home')}>
          <span className="brand-mark v22-brand-art"><img src={v23Asset('hero-rocket.webp')} alt="" aria-hidden="true" /></span>
          <span><strong>小小探險隊</strong><small>Family Learning Mission · V2.3</small></span>
        </button>
        <nav className="game-main-nav" aria-label="主要功能">
          <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}><Rocket size={15} /> 首頁</button>
          <button onClick={() => openDay(featuredDay)}><BookOpen size={15} /> 今日課程</button>
          <button className={view === 'semester' ? 'active' : ''} onClick={() => setView('semester')}><CalendarDays size={15} /> 學期日曆</button>
          <button className={view === 'achievements' ? 'active' : ''} onClick={() => setView('achievements')}><Trophy size={15} /> 成就獎勵</button>
          <button className={view === 'report' ? 'active' : ''} onClick={() => setView('report')}><GraduationCap size={15} /> 學習報表</button>
          <button className={view === 'shop' ? 'active' : ''} onClick={() => setView('shop')}><Gift size={15} /> 寶物商店</button>
          <button className={view === 'settings' ? 'active' : ''} onClick={requestSettings}><SettingsIcon size={15} /> 家庭管理</button>
        </nav>
        <nav className="top-actions">
          <CloudPill status={cloudStatus} />
          <button className="active-user-chip" onClick={() => setUserPromptOpen(true)} title="切換家長／照顧者">{activeUser ? <><CaregiverAvatar user={activeUser} size={30} /><span><strong>{activeUser.name}</strong><small>{roleLabel(activeUser.role)} · 切換使用者</small></span></> : <><Users size={17} /><span><strong>尚未登入</strong><small>選擇家長／照顧者</small></span></>}</button>
          <button className="nav-button switch-family-button" onClick={onSwitchFamily} title="切換家庭"><LogOut size={17} /><span>切換家庭</span></button>
          <button className="nav-button" onClick={cycleTheme} title="切換顯示模式">
            {settings.theme === 'dark' ? <Moon size={18} /> : settings.theme === 'light' ? <Sun size={18} /> : <Monitor size={18} />}
          </button>
          <button className={`nav-button ${view === 'settings' ? 'active' : ''}`} onClick={requestSettings}><SettingsIcon size={18} /><span>管理</span></button>
        </nav>
      </header>

      <main>
        {view === 'home' && <HomeView settings={settings} progress={progress} featuredDay={featuredDay} todayDay={todayDay} completedDays={completedDays} completionPct={completionPct} isDayDone={isDayDone} isChildDayDone={isChildDayDone} openDay={openDay} goSemester={() => setView('semester')} cloudStatus={cloudStatus} />}
        {view === 'semester' && <SemesterView settings={settings} isDayDone={isDayDone} openDay={openDay} goHome={() => setView('home')} />}
        {view === 'achievements' && <AchievementsView settings={settings} progress={progress} completedDays={completedDays} goHome={() => setView('home')} />}
        {view === 'report' && <LearningReportView settings={settings} progress={progress} isChildDayDone={isChildDayDone} goHome={() => setView('home')} />}
        {view === 'shop' && <TreasureShopView settings={settings} progress={progress} goHome={() => setView('home')} />}
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
        <div className="asset-credit">介面、角色、角色進化、主題預覽、火箭、機器人、獎勵與課程插圖採 ChatGPT Image 視覺製作流程，並於 V2.3 重新裁切、去邊、調色、合成與壓縮為 WebP；正式素材位於 <code>public/assets/v23/</code>。功能圖示僅採 <a href="https://lucide.dev/" target="_blank" rel="noreferrer">Lucide（ISC）</a>。YouTube 影片以官方播放器嵌入，著作權歸原權利人所有。</div>
      </footer>
      <div id="cursor-trail-layer" className="cursor-trail-layer" aria-hidden="true" />
      <div id="adventure-cursor" className="adventure-cursor" aria-hidden="true"><span /></div>
      <ClickEffects bursts={bursts} />
      {rewardToast && <div className="reward-toast" key={rewardToast.id}><Sparkles size={22} /><div><strong>{rewardToast.title}</strong><span>{rewardToast.detail}</span></div></div>}
      {adminPromptOpen && <AdminPinDialog familyPin={familyPin} onUnlock={unlockAdmin} onClose={() => setAdminPromptOpen(false)} />}
      {userPromptOpen && <UserSwitchDialog users={settings.users} activeUserId={activeUserId} onActivate={activateUser} onClose={() => setUserPromptOpen(false)} />}
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
  const featuredDate = addCourseWeekdays(settings.semesterStart, featuredDay.index - 1);
  const monthItems = useMemo(() => curriculum
    .map((day) => ({ day, date: addCourseWeekdays(settings.semesterStart, day.index - 1) }))
    .filter(({ date }) => date.getFullYear() === featuredDate.getFullYear() && date.getMonth() === featuredDate.getMonth()), [settings.semesterStart, featuredDay.index]);
  const monthOffset = monthItems.length ? Math.max(0, monthItems[0].date.getDay() - 1) : 0;
  const activeChildren = settings.children.filter((child) => !child.disabled);

  return (
    <div className="page home-page v22-home">
      <section className="v22-space-hero">
        <div className="v22-hero-copy">
          <span className="v22-kicker"><Sparkles size={16} /> LITTLE EXPLORERS · V2.3</span>
          <h1>小小探險隊</h1>
          <h2>一起學習，一起長大</h2>
          <p>180 節家庭共學任務已重新編排。180 首唱跳暖身與 180 支正式課程影片全部零重複，照顧者控制節奏，孩子透過唱、說、找、動、問答與分齡挑戰累積 XP、金幣與角色進化。</p>
          <div className="hero-actions">
            <button className="primary-button v22-gold-cta" onClick={() => openDay(featuredDay)}><PlayCircle size={20} /> {todayDay ? '開始今日任務' : `繼續 Day ${featuredDay.index}`}</button>
            <button className="secondary-button v22-glass-button" onClick={goSemester}><CalendarDays size={19} /> 查看學習星圖</button>
          </div>
          <div className="v22-hero-status"><span><Cloud size={15} /> {cloudStatus === 'synced' ? '雲端已同步' : '家庭資料同步中'}</span><span><Trophy size={15} /> 學期完成 {completionPct}%</span><span><Rocket size={15} /> Level {level}</span></div>
        </div>
        <div className="v22-hero-art" aria-hidden="true">
          <img className="v22-hero-crew-image v23-hero-composite" src={v23Asset('hero-v23.webp')} alt="" />
        </div>
      </section>

      <section className="v22-command-grid">
        <aside className="v22-panel v22-crew-panel">
          <div className="v22-panel-heading"><div><span className="eyebrow">LEARNING CREW</span><h2>小小探險隊成員</h2></div><Users size={20} /></div>
          <div className="v22-crew-list">
            {settings.children.map((child) => {
              const rewards = calculateRewards(progress[child.id]);
              const childDays = curriculum.filter((day) => isChildDayDone(child.id, day)).length;
              return <article className={`v22-crew-card ${child.disabled ? 'is-disabled' : ''}`} key={child.id}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={66} /><div><span>學習者 · LV.{levelFromXp(rewards.xp)}</span><h3>{child.name}</h3><ProgressBar value={childDays} max={90} /><small>{rewards.xp} XP · {rewards.coins} 金幣</small></div></article>;
            })}
          </div>
          <div className="v22-reward-shelf"><div><AnimatedBadge art="xp" size={42} /><span>XP</span></div><div><AnimatedBadge art="treasure" size={42} /><span>寶箱</span></div><div><AnimatedBadge art="trophy" size={42} /><span>成就</span></div></div>
        </aside>

        <main className="v22-center-stack">
          <article className="v22-panel v22-calendar-panel">
            <div className="v22-panel-heading"><div><span className="eyebrow">SEMESTER CALENDAR</span><h2>學期日曆</h2></div><button className="text-button" onClick={goSemester}>完整 18 週 <ChevronRight size={17} /></button></div>
            <div className="v22-progress-summary"><div><strong>{completionPct}%</strong><span>{completedDays} / 90 學習日</span></div><ProgressBar value={completedDays} max={90} /><small>下一里程碑：{nextMilestone} 天</small></div>
            {monthItems.length > 0 && <div className="v22-month-card"><div className="month-title"><strong>{formatMonth(monthItems[0].date)}</strong><span>{monthItems.length} 個任務日</span></div><div className="month-weekdays"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span></div><div className="month-days">{Array.from({ length: monthOffset }, (_, i) => <span className="calendar-spacer" key={`s-${i}`} />)}{monthItems.map(({ day, date }) => { const done = isDayDone(day); const current = day.id === featuredDay.id; return <button key={day.id} className={`mini-calendar-day ${done ? 'done' : ''} ${current ? 'today' : ''}`} onClick={() => openDay(day)}><span className="mini-date">{date.getDate()}</span><span className="mini-emoji">{done ? <Check size={14} /> : <img src={v23Asset('hero-rocket.webp')} alt="" aria-hidden="true" />}</span><small>D{day.index}</small></button>; })}</div></div>}
          </article>

          <article className="v22-panel v22-growth-panel">
            <div className="v22-panel-heading"><div><span className="eyebrow">HERO EVOLUTION</span><h2>小小探險隊成長</h2></div><AnimatedBadge art="crystal" size={46} /></div>
            <div className="v22-growth-grid">{activeChildren.slice(0, 2).map((child) => { const rewards = calculateRewards(progress[child.id]); const stage = avatarStageFromXp(rewards.xp); const nextStage = nextAvatarStageXp(rewards.xp); return <div className="v22-growth-card" key={child.id}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={88} showStage /><div><span>{child.name} · 進化 {stage}/4</span><strong>{avatarName(child.avatar)}</strong><ProgressBar value={Math.min(4, stage)} max={4} /><small>{nextStage ? `再 ${Math.max(0, nextStage - rewards.xp)} XP 進化` : '已達最高進化'}</small></div></div>; })}</div>
            <div className="v22-achievements"><div className={completedDays >= 5 ? 'unlocked' : ''}><AnimatedBadge art="star" size={44} /><span>初航 5 天</span></div><div className={completedDays >= 30 ? 'unlocked' : ''}><AnimatedBadge art="xp" size={44} /><span>30 天連續成長</span></div><div className={completedDays >= 60 ? 'unlocked' : ''}><AnimatedBadge art="rocket" size={44} /><span>星際遠征</span></div><div className={completedDays >= 90 ? 'unlocked' : ''}><AnimatedBadge art="trophy" size={44} /><span>學期冠軍</span></div></div>
          </article>
        </main>

        <aside className="v22-panel v22-today-panel">
          <div className="v22-panel-heading"><div><span className="eyebrow">TODAY MISSION</span><h2>今日課程</h2></div><span className="date-chip">{formatCourseDate(featuredDate)}</span></div>
          <div className="v22-day-title"><span>DAY {featuredDay.index}</span><h3>{featuredDay.title}</h3><p>{featuredDay.bigIdea}</p></div>
          <div className="v22-lesson-stack">{featuredDay.blocks.map((block, index) => <article key={block.id}><LessonIllustration block={block} /><div><span>第 {index + 1} 節 · 約 {block.duration} 分鐘</span><SubjectBadge subject={block.subject} /></div><strong>{block.title}</strong><small>{block.vocabulary.slice(0, 4).join(' · ')}</small></article>)}</div>
          <button className="primary-button full v22-gold-cta" onClick={() => openDay(featuredDay)}>開始上課 <ChevronRight size={18} /></button>
          <div className="v22-secret-preview"><AnimatedBadge art="treasure" size={50} /><div><strong>隱藏彩蛋</strong><span>完成指定學習日會解鎖額外金幣與成就。</span></div></div>
        </aside>
      </section>
    </div>
  );
}

function AchievementsView({ settings, progress, completedDays, goHome }: { settings: AppSettings; progress: AppProgress; completedDays: number; goHome: () => void }) {
  const milestones = [
    { days: 5, title: '初航之星', art: 'star' as const },
    { days: 30, title: '成長核心', art: 'xp' as const },
    { days: 60, title: '星際遠征', art: 'rocket' as const },
    { days: 90, title: '學期冠軍', art: 'trophy' as const },
  ];
  return <div className="page v22-secondary-page"><div className="page-heading"><button className="icon-button" onClick={goHome}><ArrowLeft size={19} /></button><div><span className="eyebrow">ACHIEVEMENTS</span><h1>成就獎勵</h1><p>所有 XP、金幣、里程碑與彩蛋都從完成紀錄即時計算，不另外累加總額。</p></div></div><section className="v22-panel"><div className="v22-panel-heading"><div><span className="eyebrow">SEMESTER MILESTONES</span><h2>家庭里程碑</h2></div><AnimatedBadge art="trophy" size={54} /></div><div className="v22-achievement-page-grid">{milestones.map((item) => <article className={completedDays >= item.days ? 'unlocked' : ''} key={item.days}><AnimatedBadge art={item.art} size={62} /><div><span>{item.days} 學習日</span><strong>{item.title}</strong><small>{completedDays >= item.days ? '已解鎖' : `還差 ${Math.max(0, item.days - completedDays)} 天`}</small></div></article>)}</div></section><section className="v22-panel"><div className="v22-panel-heading"><div><span className="eyebrow">PLAYER REWARDS</span><h2>個人成就</h2></div><Users size={20} /></div><div className="v22-report-grid">{settings.children.map((child) => { const normalized = normalizeProgress(progress[child.id]); const rewards = calculateRewards(normalized); return <article key={child.id}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={72} /><div><span>學習者 · LV.{levelFromXp(rewards.xp)}</span><strong>{child.name}</strong><small>{rewards.xp} XP · {rewards.coins} 金幣 · 彩蛋 {normalized.claimedEggs.length}/{easterEggDays.size}</small></div></article>; })}</div></section></div>;
}

function LearningReportView({ settings, progress, isChildDayDone, goHome }: { settings: AppSettings; progress: AppProgress; isChildDayDone: (childId: string, day: CourseDay) => boolean; goHome: () => void }) {
  return <div className="page v22-secondary-page"><div className="page-heading"><button className="icon-button" onClick={goHome}><ArrowLeft size={19} /></button><div><span className="eyebrow">LEARNING REPORT</span><h1>學習報表</h1><p>依實際完成的任務、單元與學習日整理，不用額外維護第二套統計資料。</p></div></div><section className="v22-report-summary"><article><strong>18</strong><span>學習週</span></article><article><strong>90</strong><span>學習日</span></article><article><strong>180</strong><span>課程單元</span></article><article><strong>360</strong><span>互動任務</span></article></section><section className="v22-panel"><div className="v22-panel-heading"><div><span className="eyebrow">LEARNER PROGRESS</span><h2>學習者進度</h2></div><GraduationCap size={22} /></div><div className="v22-learning-report-list">{settings.children.map((child) => { const normalized = normalizeProgress(progress[child.id]); const rewards = calculateRewards(normalized); const days = curriculum.filter((day) => isChildDayDone(child.id, day)).length; return <article key={child.id}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={78} /><div className="report-main"><div><span>學習者</span><h3>{child.name}</h3></div><ProgressBar value={days} max={90} /><small>{days}/90 天 · {normalized.completedBlocks.length}/180 單元 · {normalized.completedMissions.length}/360 任務</small></div><div className="report-rewards"><strong>{rewards.xp}</strong><span>XP</span><strong>{rewards.coins}</strong><span>金幣</span></div></article>; })}</div></section></div>;
}

function TreasureShopView({ settings, progress, goHome }: { settings: AppSettings; progress: AppProgress; goHome: () => void }) {
  const familyCoins = settings.children.reduce((sum, child) => sum + calculateRewards(progress[child.id]).coins, 0);
  const items = [
    { coins: 80, title: '星光補給箱', detail: '家庭累積 80 金幣解鎖', art: 'treasure' as const },
    { coins: 180, title: '能量水晶', detail: '家庭累積 180 金幣解鎖', art: 'crystal' as const },
    { coins: 320, title: '火箭通行證', detail: '家庭累積 320 金幣解鎖', art: 'rocket' as const },
    { coins: 520, title: '冠軍展示座', detail: '家庭累積 520 金幣解鎖', art: 'trophy' as const },
  ];
  return <div className="page v22-secondary-page"><div className="page-heading"><button className="icon-button" onClick={goHome}><ArrowLeft size={19} /></button><div><span className="eyebrow">TREASURE SHOP</span><h1>寶物商店</h1><p>V2.3 採「累積達標即解鎖」而不是扣除金幣，因此不會破壞由完成紀錄即時計算的獎勵模型。</p></div></div><section className="v22-panel"><div className="v22-shop-wallet"><AnimatedBadge art="treasure" size={66} /><div><span>家庭目前累積</span><strong>{familyCoins} 金幣</strong></div></div><div className="v22-shop-grid">{items.map((item) => { const unlocked = familyCoins >= item.coins; return <article className={unlocked ? 'unlocked' : ''} key={item.title}><AnimatedBadge art={item.art} size={76} /><span>{unlocked ? '已解鎖' : `${item.coins} 金幣`}</span><h3>{item.title}</h3><p>{unlocked ? '已放入家庭收藏展示櫃。' : item.detail}</p></article>; })}</div></section></div>;
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
    <div className="lesson-page">
      <header className="lesson-header v2-lesson-header">
        <button className="icon-button glass" onClick={onBack}><ArrowLeft size={20} /></button>
        <div className="lesson-header-copy"><span>WEEK {day.week} · DAY {day.index} · {formatCourseDate(date)}</span><h1>{day.title}</h1><p>{day.bigIdea}</p></div>
        <div className="mission-badge"><Rocket size={20} /> Mission {day.index}/90</div>
        {easterEggDays.has(day.index) && <EasterEgg day={day} settings={settings} progress={progress} participants={participants} onClaim={onClaimEgg} />}
      </header>

      <main className="lesson-content">
        <section className="attendance-panel">
          <div><span className="eyebrow">TODAY'S CREW</span><h2><PhoneticText text="今天誰一起上課" />？</h2><p>每天都能重新選擇參與的學習者；哥哥、弟弟等孩子分開記錄任務、XP、金幣與角色進化。</p></div>
          <div className="attendance-chips">{settings.children.filter((child) => !child.disabled).map((child) => {
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
  const action = subjectAction(block.subject);
  return (
    <section className="lesson-block-card v2-lesson-block">
      <div className="block-heading"><div className="block-index">{blockIndex + 1}</div><div className="block-title-copy"><span className="eyebrow">第 {blockIndex + 1} 節 · 約 {block.duration} 分鐘</span><h2>{block.title}</h2></div><SubjectBadge subject={block.subject} /></div>

      <div className="lesson-media-grid"><VideoPlayer clip={block.warmup} compact warmup /><VideoPlayer clip={block.video} /></div>

      <div className="video-alignment-card" aria-label="影片對應檢查">
        <div className="video-alignment-title"><CheckCircle2 size={21} /><div><span className="eyebrow">VIDEO MATCH CHECK</span><strong>影片與本節內容已對應</strong></div></div>
        <div className="video-alignment-grid">
          <span><small>暖身歌曲</small><b>{block.warmup.title}</b><CheckCircle2 size={17} /></span>
          <span><small>主影片</small><b>{block.video.title}</b><CheckCircle2 size={17} /></span>
          <span><small>本節焦點</small><b>{block.videoFocus}</b><CheckCircle2 size={17} /></span>
        </div>
      </div>

      <div className="focus-deck">
        <div className="focus-heading"><div><span className="eyebrow">TODAY'S FOCUS</span><h3><PhoneticText text="今日重點" /></h3></div><span className="focus-hint">看得到 · 說得出 · 做得到</span></div>
        <div className="focus-grid">
          <div className="focus-card focus-words"><LessonIllustration block={block} /><strong>今天要認得</strong><div className="picture-word-grid v22-word-grid">{block.vocabulary.map((word) => <span key={word}><em>{word}</em></span>)}</div></div>
          <div className="focus-card focus-sentence"><strong><PhoneticText text="句型" /></strong><p>{block.sentence}</p><small>4 歲：能補最後一個字就很棒。<br />6 歲：試著自己說完整句。</small></div>
          <div className="focus-card focus-action"><strong>{action.label}</strong><p>{action.text}</p><small>把眼睛、嘴巴、手和身體都加入，記憶會比只看影片更牢。</small></div>
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
        <div className="mission-grid">{block.missions.map((mission, missionIndex) => <article className="mini-mission v2-mini-mission" key={mission.id}><div className="mission-top"><span className={`mission-kind kind-${mission.kind}`}>任務 {missionIndex + 1}｜{mission.title}</span><span className="reward">+{mission.xp} XP · +{mission.coins} 金幣</span></div><p className="mission-prompt">{mission.prompt}</p><div className="mission-criteria"><strong>✓ 完成標準</strong><span>{mission.criteria}</span></div><div className="mission-players">{settings.children.filter((child) => participants.includes(child.id)).map((child) => { const done = progress[child.id]?.completedMissions.includes(mission.id) ?? false; const rewards = calculateRewards(progress[child.id]); return <button key={child.id} className={`player-score reward-button ${done ? 'done' : ''}`} onClick={() => onToggleMission(child.id, mission)}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={34} /><span><strong>{child.name}</strong><small>{done ? '已領獎 · 再按可撤銷' : `完成了！領 +${mission.xp} XP`}</small></span>{done ? <CheckCircle2 size={18} /> : <Gift size={18} />}</button>; })}</div></article>)}</div>
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
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `小小探險隊-V2.3-學習紀錄-${ymd(new Date())}.json`; a.click(); URL.revokeObjectURL(url);
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
      <div className="page-heading"><button className="icon-button" onClick={goHome}><ArrowLeft size={19} /></button><div><span className="eyebrow">FAMILY CONTROL CENTER · V2.3</span><h1>星際家庭學習管理中心</h1><p>家庭管理者可管理成員、個人 PIN、視覺主題、雲端同步與高風險資料操作。一般使用者無法直接進入此頁。</p></div></div>
      <div className="admin-unlocked-banner"><div><strong>管理者 PIN 已解鎖</strong><span>目前為家庭最高管理權限；離開家庭或重新載入後需再次驗證。</span></div><KeyRound size={20} /></div>
      <section className="v22-family-hero" aria-label="星際家庭管理中心">
        <div><span className="eyebrow">FAMILY COMMAND DECK</span><h2>全家的學習基地，由管理者守護</h2><p>家長／照顧者登入帳號、學習者、個人 PIN、雲端同步與主題都集中在這裡管理；一般使用者不會看到這些高權限操作。</p></div>
        <div className="v22-family-hero-art" aria-hidden="true"><img src={v23Asset('avatar-father.webp')} alt="" /><img src={v23Asset('avatar-mother.webp')} alt="" /><img className="robot" src={v23Asset('robot-helper.webp')} alt="" /></div>
      </section>

      <section className="settings-card"><div className="setting-label"><span className="setting-icon"><Sun size={20} /></span><div><h3>顯示明暗</h3><p>亮色、暗色或跟隨裝置系統。</p></div></div><div className="segmented-control">{(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => <button key={mode} className={settings.theme === mode ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, theme: mode }))}>{mode === 'system' ? <Monitor size={17} /> : mode === 'light' ? <Sun size={17} /> : <Moon size={17} />}{mode === 'system' ? '隨系統' : mode === 'light' ? '明亮' : '暗黑'}</button>)}</div></section>

      <section className="settings-card vertical theme-settings-card">
        <div className="setting-label"><span className="setting-icon"><Sparkles size={20} /></span><div><h3>冒險主題風格</h3><p>五套主題全部使用 ChatGPT Image 產製素材作為預覽；套用後同步調整背景、面板、按鈕與點擊特效。</p></div></div>
        <div className="visual-theme-grid">{visualThemeOptions.map((option) => <button key={option.id} className={`visual-theme-option ${settings.visualTheme === option.id ? 'active' : ''}`} onClick={() => setSettings((current) => ({ ...current, visualTheme: option.id }))}><img className="visual-theme-art" src={v23Asset(option.art)} alt="" aria-hidden="true" /><div><strong>{option.title}</strong><small>{option.subtitle}</small></div>{settings.visualTheme === option.id && <CheckCircle2 size={18} />}</button>)}</div>
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
          <p className="cloud-security-note">管理者 PIN 同時作為目前 V2.3 介面所沿用的 V2.2 相容家庭 namespace 管理憑證。請使用不易猜測的 4–6 位數字，不要分享給一般使用者；一般成員應使用自己的個人 PIN。</p>
        </div>
      </section>

      <section className="settings-card vertical"><div className="setting-label"><span className="setting-icon"><BookOpen size={20} /></span><div><h3>資料備份與重設</h3><p>可另外匯出完整 V2.3 JSON（保留 V1／V2／V2.1／V2.2 相容欄位）。清除進度採兩次確認；若雲端同步開啟，清除後的新狀態也會同步到雲端。</p></div></div><div className="data-actions"><button className="secondary-button" onClick={exportData}>匯出完整學習紀錄 JSON</button><button className={`secondary-button danger-outline ${confirmReset ? 'confirming' : ''}`} onClick={resetProgress}>{confirmReset ? '再按一次確認清除' : '清除所有學習進度'}</button></div></section>
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
          <img className="pin-gate-crew" src={v23Asset('hero-crew.webp')} alt="" />
          <img className="pin-gate-robot" src={v23Asset('robot-helper.webp')} alt="" />
          <img className="pin-gate-rocket" src={v23Asset('hero-rocket.webp')} alt="" />
        </div>
        <div className="pin-gate-copy">
          <span className="eyebrow">FAMILY PROFILE · V2.3</span>
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
