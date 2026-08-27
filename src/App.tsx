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
  Lock,
  LogOut,
  ExternalLink,
  Flame,
  Footprints,
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
import GameBadge from './components/GameBadge';
import PhoneticText from './components/PhoneticText';
import { loadCloudSnapshot, normalizeFamilyPin, saveCloudSnapshot, validFamilyPin } from './cloud';
import { createUserPinCredential, verifyUserPin } from './security';
import {
  avatarStageFromXp,
  avatarStageName,
  BLOCK_REWARD,
  calculateRewards,
  easterEggDays,
  EGG_REWARD,
  levelFromXp,
  nextAvatarStageXp,
  normalizeProgress,
} from './rewards';
import { badges, badgeById, applyNewBadgeUnlocks } from './badges';
import { cosmeticById, cosmetics } from './cosmetics';
import { visualThemeOptions } from './uiData';
import {
  addCourseWeekdaysYmd,
  courseDayAccess,
  fetchTrustedTaipeiDate,
  formatTaipeiCourseDate,
  shortUnlockDate,
  taipeiYmd,
  ymdToTaipeiDate,
} from './dailyChallenge';
import type { CourseDayAccess, TrustedTaipeiDate } from './dailyChallenge';
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

const emptyReflection = (): DayReflection => ({ engagement: '', note: '', viewing: {}, dailyChallenge: { warmup: false, learn: false } });
const emptyProgress = (): ChildProgress => normalizeProgress();

type CloudStatus = 'local' | 'loading' | 'saving' | 'synced' | 'error';
type CelebrationMoment = { id: number; childName: string; xp: number; coins: number; newBadgeIds: string[]; kind: 'mission' | 'block' | 'day' | 'bonus' } | null;
const LOCAL_FAMILY_KEY = '__local__';

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
  return 'avatar-caregiver.webp';
}

function CaregiverAvatar({ user, size = 64 }: { user: FamilyUserProfile; size?: number }) {
  return <img className="caregiver-avatar" src={`${import.meta.env.BASE_URL}assets/v30/characters/${caregiverArt(user.role)}`} alt={`${user.name}頭像`} width={size} height={size} loading="lazy" decoding="async" />;
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

function ymd(date: Date) {
  return taipeiYmd(date);
}

function addCourseWeekdays(start: string, offset: number) {
  return ymdToTaipeiDate(addCourseWeekdaysYmd(start, offset));
}

function formatCourseDate(date: Date) {
  return formatTaipeiCourseDate(taipeiYmd(date));
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
  if (tags.has('dinosaurs')) return 'world-dino.webp';
  if (tags.has('ocean')) return 'world-ocean.webp';
  if (tags.has('space') || tags.has('weather')) return 'world-space.webp';
  if (tags.has('family') || tags.has('home')) return 'world-family.webp';
  if (tags.has('numbers')) return 'world-number.webp';
  if (tags.has('food')) return 'world-food.webp';
  if (tags.has('animals')) return 'world-animal.webp';
  if (tags.has('colors') || tags.has('shapes')) return 'world-color.webp';
  return 'world-hello.webp';
}

const learningWorlds = [
  { id: 'hello', name: 'Hello Town', accent: 'purple', art: 'world-hello.webp', npc: 'Milo' },
  { id: 'color', name: 'Color Garden', accent: 'sky', art: 'world-color.webp', npc: 'Pip' },
  { id: 'animal', name: 'Animal Forest', accent: 'mint', art: 'world-animal.webp', npc: 'Coco' },
  { id: 'family', name: 'Family Village', accent: 'coral', art: 'world-family.webp', npc: 'Lulu' },
  { id: 'number', name: 'Number Mountain', accent: 'orange', art: 'world-number.webp', npc: 'Rocky' },
  { id: 'food', name: 'Food Market', accent: 'yellow', art: 'world-food.webp', npc: 'Berry' },
  { id: 'ocean', name: 'Ocean Adventure', accent: 'sky', art: 'world-ocean.webp', npc: 'Finn' },
  { id: 'dino', name: 'Dino Island', accent: 'mint', art: 'world-dino.webp', npc: 'Dino' },
  { id: 'space', name: 'Space Station', accent: 'purple', art: 'world-space.webp', npc: 'Nova' },
] as const;

function worldForDay(day: CourseDay) {
  const tags = new Set(day.blocks.flatMap((block) => block.requiredVideoTopics ?? []));
  const id = tags.has('dinosaurs') ? 'dino'
    : tags.has('ocean') ? 'ocean'
      : tags.has('space') || tags.has('weather') ? 'space'
        : tags.has('family') || tags.has('home') ? 'family'
          : tags.has('numbers') ? 'number'
            : tags.has('food') ? 'food'
              : tags.has('animals') ? 'animal'
                : tags.has('colors') || tags.has('shapes') ? 'color'
                  : 'hello';
  return learningWorlds.find((world) => world.id === id) ?? learningWorlds[0];
}

function speakWord(word: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word.replace(/[^A-Za-z' -]/g, '').trim() || word);
  utterance.lang = 'en-US';
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}

function vocabularyAssetFile(word: string) {
  const normalized = word
    .toLowerCase()
    .trim()
    .replace(/[?!]/g, '')
    .replace(/\s+[\u4e00-\u9fff]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${normalized || 'zh-audio'}.webp`;
}

function VocabularyCard({ word }: { word: string; block: LessonBlock }) {
  const [reacted, setReacted] = useState(false);
  const play = () => {
    speakWord(word);
    setReacted(true);
    window.setTimeout(() => setReacted(false), 520);
  };
  return (
    <button className={`v30-vocab-card ${reacted ? 'reacted' : ''}`} onClick={play} aria-label={`播放 ${word} 發音`}>
      <span className="v30-vocab-art"><img src={v30Asset(`vocab/${vocabularyAssetFile(word)}`)} alt={`${word} 教材插畫`} loading="lazy" decoding="async" /></span>
      <strong>{word}</strong>
      <span className="v30-audio-action"><Volume2 size={18} /> Listen</span>
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

function CelebrationOverlay({ moment, onClose }: { moment: Exclude<CelebrationMoment, null>; onClose: () => void }) {
  const newBadge = moment.newBadgeIds.map((id) => badgeById.get(id)).find(Boolean);
  const isDay = moment.kind === 'day';
  const labels = moment.kind === 'mission'
    ? { overline: 'MISSION COMPLETE', title: 'Great!', detail: '任務完成' }
    : moment.kind === 'block'
      ? { overline: 'MISSION SET COMPLETE', title: 'Awesome!', detail: '完成一組挑戰' }
      : moment.kind === 'bonus'
        ? { overline: 'SECRET REWARD', title: 'Surprise!', detail: '找到祕密獎勵' }
        : { overline: 'DAILY CHALLENGE COMPLETE', title: 'Amazing!', detail: '完成今天的冒險' };
  useEffect(() => {
    const timer = window.setTimeout(onClose, isDay ? 2000 : 1600);
    return () => window.clearTimeout(timer);
  }, [isDay, moment.id, onClose]);
  return (
    <div className={`v30-celebration reward-${moment.kind}`} role="dialog" aria-modal="true" aria-label={`${labels.detail}獎勵`}>
      <button className="v30-celebration-skip" onClick={onClose}>Skip</button>
      <div className="v30-celebration-burst" aria-hidden="true"><span /><span /><span /><span /><span /></div>
      <div className="v30-celebration-character"><img src={v30Asset('characters/mascot-helper.webp')} alt="小星" /></div>
      <span className="v30-overline">{labels.overline}</span>
      <h2>{labels.title}</h2>
      <p>{moment.childName} {labels.detail}</p>
      <div className="v30-celebration-rewards"><strong>+{moment.xp} XP</strong><strong>+{moment.coins} Coins</strong></div>
      {newBadge && <div className="v30-celebration-badge"><GameBadge badge={newBadge} unlocked size={88} label={false} /><div><span>NEW BADGE!</span><strong>{newBadge.name}</strong><small>{newBadge.description}</small></div></div>}
      <button className="v30-primary-cta v30-celebration-continue" onClick={onClose}>Continue Adventure <ChevronRight size={20} /></button>
    </div>
  );
}

function AdminPinDialog({ familyPin, onUnlock, onClose }: { familyPin: string; onUnlock: (pin: string) => boolean; onClose: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  const submit = () => {
    if (!validFamilyPin(pin) || !onUnlock(pin)) {
      setError('PIN 還沒有對上，再確認一次即可。');
      return;
    }
    setError('');
  };
  return <div className="modal-scrim" role="dialog" aria-modal="true" aria-label="管理者驗證"><div className="game-modal admin-modal"><button className="v30-modal-x" onClick={onClose} aria-label="關閉">×</button><div className="modal-icon"><KeyRound size={30} /></div><span className="eyebrow">ADMIN ACCESS</span><h2><PhoneticText text="管理者驗證" /></h2><p>只有家庭管理者可以進入敏感設定；若是不小心點到，可以直接關閉回到孩子的冒險。</p><label>家庭管理者 PIN</label><div className="modal-pin-row"><input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => { setPin(normalizeFamilyPin(e.target.value)); setError(''); }} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} autoFocus placeholder="輸入管理者 PIN" /><button className="primary-button" onClick={submit}>解鎖設定</button></div>{error && <div className="pin-error">{error}</div>}<button className="modal-close-link" onClick={onClose}>取消</button><small className="modal-family-hint">目前家庭識別：•••• · {familyPin.length} 位數 · Esc 可關閉</small></div></div>;
}

function FamilySetupDialog({ onSetPin, onClose }: { onSetPin: (pin: string) => void; onClose: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  const submit = () => {
    const normalized = normalizeFamilyPin(pin);
    if (!validFamilyPin(normalized)) { setError('請設定 4–6 位數字 PIN。'); return; }
    setError('');
    onSetPin(normalized);
  };
  return <div className="modal-scrim" role="dialog" aria-modal="true" aria-label="設定家庭 PIN"><div className="game-modal admin-modal v30-family-setup-modal"><button className="v30-modal-x" onClick={onClose} aria-label="關閉">×</button><div className="modal-icon"><KeyRound size={30} /></div><span className="eyebrow">PARENT AREA</span><h2>先保護家長專區</h2><p>孩子可以繼續使用首頁、冒險世界、獎勵與角色。只有進入家長專區、雲端同步或敏感設定時才需要家庭 PIN。</p><label>設定家庭管理者 PIN</label><div className="modal-pin-row"><input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(event) => { setPin(normalizeFamilyPin(event.target.value)); setError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} autoFocus placeholder="4–6 位數字"/><button className="primary-button" onClick={submit}>設定 PIN</button></div>{error && <div className="pin-error">{error}</div>}<div className="v30-pin-cancel-row"><button className="secondary-button" onClick={onClose}>稍後再說</button><button className="modal-close-link" onClick={onClose}>取消</button></div><small className="modal-family-hint">Esc 可關閉。設定後會把目前本機進度搬入這個家庭並啟用私有雲端同步。</small></div></div>;
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
  const isLocalFamily = familyPin === LOCAL_FAMILY_KEY;
  const initialSettings = useMemo(() => {
    const raw = loadFamilyValue<Partial<AppSettings>>(familyPin, 'settings', SETTINGS_KEY, defaultSettings);
    const normalized = normalizeSettings(raw);
    return { ...normalized, cloudSync: { enabled: !isLocalFamily, familyCode: isLocalFamily ? '' : familyPin } };
  }, [familyPin, isLocalFamily]);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [progress, setProgress] = useState<AppProgress>(() => normalizeProgressMap(loadFamilyValue<AppProgress>(familyPin, 'progress', PROGRESS_KEY, {}), initialSettings.children));
  const [attendance, setAttendance] = useState<AttendanceMap>(() => loadFamilyValue<AttendanceMap>(familyPin, 'attendance', ATTENDANCE_KEY, {}));
  const [reflections, setReflections] = useState<ReflectionMap>(() => loadFamilyValue<ReflectionMap>(familyPin, 'reflections', REFLECTION_KEY, {}));
  const [view, setView] = useState<'home' | 'semester' | 'achievements' | 'character' | 'report' | 'shop' | 'settings'>('home');
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(() => isLocalFamily ? 'local' : 'loading');
  const [cloudMessage, setCloudMessage] = useState(() => isLocalFamily ? '目前使用本機家庭模式；Child Mode 不需要 PIN。' : '正在辨識家庭 PIN…');
  const [cloudReady, setCloudReady] = useState(isLocalFamily);
  const [lastCloudSync, setLastCloudSync] = useState('');
  const [celebration, setCelebration] = useState<CelebrationMoment>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPromptOpen, setAdminPromptOpen] = useState(false);
  const [adminDestination, setAdminDestination] = useState<'report' | 'settings'>('report');
  const [familySetupOpen, setFamilySetupOpen] = useState(false);
  const [userPromptOpen, setUserPromptOpen] = useState(() => !sessionStorage.getItem(`star-learning-v22:${familyPin}:active-user`));
  const [activeUserId, setActiveUserId] = useState<string | null>(() => sessionStorage.getItem(`star-learning-v22:${familyPin}:active-user`));
  const [trustedDate, setTrustedDate] = useState<TrustedTaipeiDate>(() => ({
    ymd: taipeiYmd(),
    verified: false,
    source: 'device-fallback',
  }));
  const cloudUpdatedAtRef = useRef('');

  useEffect(() => {
    let cancelled = false;
    const syncTrustedDate = async () => {
      const next = await fetchTrustedTaipeiDate();
      if (!cancelled) setTrustedDate(next);
    };
    void syncTrustedDate();
    const onVisible = () => { if (document.visibilityState === 'visible') void syncTrustedDate(); };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => void syncTrustedDate(), 60 * 60 * 1000);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, []);

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
  const todayKey = trustedDate.ymd;
  const courseDateKey = (day: CourseDay) => addCourseWeekdaysYmd(settings.semesterStart, day.index - 1);
  const accessForDay = (day: CourseDay): CourseDayAccess => courseDayAccess(courseDateKey(day), todayKey);
  const canEarnToday = (day: CourseDay) => trustedDate.verified && accessForDay(day) === 'today';
  const challengeSteps = (day: CourseDay) => reflections[day.id]?.dailyChallenge ?? { warmup: false, learn: false };
  const todayDay = curriculum.find((day) => courseDateKey(day) === todayKey);
  const nextDay = curriculum.find((day) => courseDateKey(day) >= todayKey) ?? curriculum[curriculum.length - 1];
  const nextUnlockDay = curriculum.find((day) => courseDateKey(day) > todayKey) ?? null;
  const featuredDay = todayDay ?? nextDay;

  const openDay = (day: CourseDay) => {
    const access = accessForDay(day);
    if (access === 'future') return;
    if (access === 'today') {
      setAttendance((current) => current[day.id] ? current : { ...current, [day.id]: enabledLearnerIds });
    }
    setSelectedDayId(day.id);
  };

  const toggleAttendance = (day: CourseDay, childId: string) => {
    if (!canEarnToday(day)) return;
    setAttendance((current) => {
      const currentIds = (current[day.id] ?? enabledLearnerIds).filter((id) => enabledLearnerIds.includes(id));
      if (currentIds.includes(childId) && currentIds.length === 1) return current;
      const nextIds = currentIds.includes(childId) ? currentIds.filter((id) => id !== childId) : [...currentIds, childId];
      return { ...current, [day.id]: nextIds };
    });
  };

  const completeChallengeStep = (day: CourseDay, step: 'warmup' | 'learn') => {
    if (!canEarnToday(day)) return;
    const currentSteps = challengeSteps(day);
    if (currentSteps[step]) return;
    if (step === 'learn' && !currentSteps.warmup) return;
    setReflections((current) => {
      const previous = current[day.id] ?? emptyReflection();
      const previousSteps = previous.dailyChallenge ?? { warmup: false, learn: false };
      return {
        ...current,
        [day.id]: {
          ...previous,
          dailyChallenge: { ...previousSteps, [step]: true },
        },
      };
    });
  };

  const toggleMission = (childId: string, mission: LessonBlock['missions'][number]) => {
    const before = normalizeProgress(progress[childId]);
    if (before.completedMissions.includes(mission.id)) return;
    const parentDay = curriculum.find((day) => day.blocks.some((block) => block.missions.some((item) => item.id === mission.id)));
    if (!parentDay || !canEarnToday(parentDay)) return;
    const steps = challengeSteps(parentDay);
    if (!steps.warmup || !steps.learn) return;
    const preview = applyNewBadgeUnlocks(before, { ...before, completedMissions: [...before.completedMissions, mission.id] }, todayKey);
    setProgress((current) => {
      const child = normalizeProgress(current[childId]);
      if (child.completedMissions.includes(mission.id)) return current;
      const rawNext = { ...child, completedMissions: [...child.completedMissions, mission.id] };
      const awarded = applyNewBadgeUnlocks(child, rawNext, todayKey);
      return { ...current, [childId]: awarded.progress };
    });
    const name = settings.children.find((child) => child.id === childId)?.name ?? '小朋友';
    setCelebration({ id: Date.now(), childName: name, xp: mission.xp, coins: mission.coins, newBadgeIds: preview.newBadgeIds, kind: 'mission' });
  };

  const toggleBlock = (childId: string, day: CourseDay, block: LessonBlock) => {
    if (!canEarnToday(day)) return;
    const steps = challengeSteps(day);
    if (!steps.warmup || !steps.learn) return;
    const before = normalizeProgress(progress[childId]);
    if (before.completedBlocks.includes(block.id)) return;
    const allMissionsDone = block.missions.every((mission) => before.completedMissions.includes(mission.id));
    if (!allMissionsDone) return;
    const nextBlocksPreview = Array.from(new Set([...before.completedBlocks, block.id]));
    const willFinishDay = day.blocks.every((item) => nextBlocksPreview.includes(item.id));
    const completionIso = new Date().toISOString();
    const previewRaw: ChildProgress = {
      ...before,
      completedBlocks: nextBlocksPreview,
      completedDays: willFinishDay ? Array.from(new Set([...before.completedDays, day.id])) : before.completedDays,
      completionTimestamps: willFinishDay ? { ...(before.completionTimestamps ?? {}), [day.id]: before.completionTimestamps?.[day.id] ?? completionIso } : before.completionTimestamps,
    };
    const preview = applyNewBadgeUnlocks(before, previewRaw, todayKey);

    setProgress((current) => {
      const child = normalizeProgress(current[childId]);
      if (child.completedBlocks.includes(block.id)) return current;
      const nextBlocks = Array.from(new Set([...child.completedBlocks, block.id]));
      const dayDone = day.blocks.every((item) => nextBlocks.includes(item.id));
      const rawNext: ChildProgress = {
        ...child,
        completedBlocks: nextBlocks,
        completedDays: dayDone ? Array.from(new Set([...child.completedDays, day.id])) : child.completedDays,
        completionTimestamps: dayDone ? { ...(child.completionTimestamps ?? {}), [day.id]: child.completionTimestamps?.[day.id] ?? completionIso } : child.completionTimestamps,
      };
      const awarded = applyNewBadgeUnlocks(child, rawNext, todayKey);
      return { ...current, [childId]: awarded.progress };
    });
    const name = settings.children.find((child) => child.id === childId)?.name ?? '小朋友';
    if (willFinishDay) {
      const missionReward = day.blocks.flatMap((item) => item.missions).reduce((sum, mission) => ({ xp: sum.xp + mission.xp, coins: sum.coins + mission.coins }), { xp: 0, coins: 0 });
      setCelebration({ id: Date.now(), childName: name, xp: missionReward.xp + BLOCK_REWARD.xp * day.blocks.length, coins: missionReward.coins + BLOCK_REWARD.coins * day.blocks.length, newBadgeIds: preview.newBadgeIds, kind: 'day' });
    } else {
      setCelebration({ id: Date.now(), childName: name, xp: BLOCK_REWARD.xp, coins: BLOCK_REWARD.coins, newBadgeIds: preview.newBadgeIds, kind: 'block' });
    }
  };

  const claimEgg = (childId: string, day: CourseDay) => {
    if (!canEarnToday(day)) return;
    const eggId = `egg-day-${day.index}`;
    const child = normalizeProgress(progress[childId]);
    if (child.claimedEggs.includes(eggId)) return;
    setProgress((current) => {
      const item = normalizeProgress(current[childId]);
      if (item.claimedEggs.includes(eggId)) return current;
      return { ...current, [childId]: { ...item, claimedEggs: [...item.claimedEggs, eggId] } };
    });
    const name = settings.children.find((item) => item.id === childId)?.name ?? '小朋友';
    setCelebration({ id: Date.now(), childName: name, xp: EGG_REWARD.xp, coins: EGG_REWARD.coins, newBadgeIds: [], kind: 'bonus' });
  };

  const unlockCosmetic = (childId: string, cosmeticId: string) => {
    const item = cosmeticById.get(cosmeticId);
    if (!item) return;
    setProgress((current) => {
      const child = normalizeProgress(current[childId]);
      const rewards = calculateRewards(child);
      if (child.unlockedCosmetics?.includes(cosmeticId) || rewards.coins < item.cost || levelFromXp(rewards.xp) < item.unlockLevel) return current;
      return { ...current, [childId]: { ...child, unlockedCosmetics: [...(child.unlockedCosmetics ?? []), cosmeticId] } };
    });
  };

  const toggleCosmetic = (childId: string, cosmeticId: string) => {
    const item = cosmeticById.get(cosmeticId);
    if (!item) return;
    setProgress((current) => {
      const child = normalizeProgress(current[childId]);
      if (!child.unlockedCosmetics?.includes(cosmeticId)) return current;
      const equipped = child.equippedCosmetics ?? [];
      const isEquipped = equipped.includes(cosmeticId);
      const withoutSameSlot = equipped.filter((id) => cosmeticById.get(id)?.slot !== item.slot);
      return { ...current, [childId]: { ...child, equippedCosmetics: isEquipped ? withoutSameSlot : [...withoutSameSlot, cosmeticId] } };
    });
  };

  const cycleTheme = () => {
    const order: ThemeMode[] = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(settings.theme) + 1) % order.length];
    setSettings((current) => ({ ...current, theme: next }));
  };

  const requestParentArea = () => {
    if (isLocalFamily) {
      setFamilySetupOpen(true);
      return;
    }
    if (adminUnlocked) {
      setView('report');
      return;
    }
    setAdminDestination('report');
    setAdminPromptOpen(true);
  };

  const requestSettings = () => {
    if (isLocalFamily) {
      setFamilySetupOpen(true);
      return;
    }
    if (adminUnlocked) {
      setView('settings');
      return;
    }
    setAdminDestination('settings');
    setAdminPromptOpen(true);
  };

  const promoteLocalFamily = (pin: string) => {
    if (!isLocalFamily || !validFamilyPin(pin)) return;
    const nextSettings = { ...settings, cloudSync: { enabled: true, familyCode: pin } };
    localStorage.setItem(familyStorageKey(pin, 'settings'), JSON.stringify(nextSettings));
    localStorage.setItem(familyStorageKey(pin, 'progress'), JSON.stringify(progress));
    localStorage.setItem(familyStorageKey(pin, 'attendance'), JSON.stringify(attendance));
    localStorage.setItem(familyStorageKey(pin, 'reflections'), JSON.stringify(reflections));
    setFamilySetupOpen(false);
    onOpenFamily(pin);
  };

  const unlockAdmin = (pin: string) => {
    if (isLocalFamily || normalizeFamilyPin(pin) !== familyPin) return false;
    setAdminUnlocked(true);
    setAdminPromptOpen(false);
    setView(adminDestination);
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
          access={accessForDay(selectedDay)}
          trustedDateVerified={trustedDate.verified}
          onBack={() => setSelectedDayId(null)}
          onToggleAttendance={(childId) => toggleAttendance(selectedDay, childId)}
          onToggleMission={toggleMission}
          onToggleBlock={(childId, block) => toggleBlock(childId, selectedDay, block)}
          onCompleteChallengeStep={(step) => completeChallengeStep(selectedDay, step)}
          reflection={reflections[selectedDay.id] ?? emptyReflection()}
          onUpdateReflection={(patch) => setReflections((current) => ({ ...current, [selectedDay.id]: { ...(current[selectedDay.id] ?? emptyReflection()), ...patch } }))}
          onClaimEgg={(childId) => claimEgg(childId, selectedDay)}
        />
        {celebration && <CelebrationOverlay moment={celebration} onClose={() => setCelebration(null)} />}
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
          <button className={`v30-parent-entry ${view === 'report' || view === 'settings' ? 'active' : ''}`} onClick={requestParentArea}><BarChart3 size={18} /><span>家長專區</span></button>
          <button className="nav-button v30-display-toggle" onClick={cycleTheme} title="切換顯示模式">{settings.theme === 'dark' ? <Moon size={18} /> : settings.theme === 'light' ? <Sun size={18} /> : <Monitor size={18} />}</button>
        </nav>
      </header>

      <main className="v30-main">
        {view === 'home' && <HomeView settings={settings} progress={progress} featuredDay={featuredDay} todayDay={todayDay} nextUnlockDay={nextUnlockDay} trustedDate={trustedDate} todayChallengeSteps={todayDay ? challengeSteps(todayDay) : { warmup: false, learn: false }} completedDays={completedDays} completionPct={completionPct} isChildDayDone={isChildDayDone} openDay={openDay} goSemester={() => setView('semester')} />}
        {view === 'semester' && <SemesterView settings={settings} trustedDate={trustedDate} isDayDone={isDayDone} openDay={openDay} goHome={() => setView('home')} />}
        {view === 'achievements' && <AchievementsView settings={settings} progress={progress} completedDays={completedDays} goHome={() => setView('home')} goShop={() => setView('character')} />}
        {view === 'character' && <CharacterView settings={settings} progress={progress} goHome={() => setView('home')} onUnlockCosmetic={unlockCosmetic} onToggleCosmetic={toggleCosmetic} />}
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
      {adminPromptOpen && !isLocalFamily && <AdminPinDialog familyPin={familyPin} onUnlock={unlockAdmin} onClose={() => setAdminPromptOpen(false)} />}
      {familySetupOpen && isLocalFamily && <FamilySetupDialog onSetPin={promoteLocalFamily} onClose={() => setFamilySetupOpen(false)} />}
      {userPromptOpen && <UserSwitchDialog users={settings.users} activeUserId={activeUserId} onActivate={activateUser} onClose={() => setUserPromptOpen(false)} />}
    </div>
  );
}

function HomeView({ settings, progress, featuredDay, todayDay, nextUnlockDay, trustedDate, todayChallengeSteps, completedDays, completionPct, isChildDayDone, openDay, goSemester }: {
  settings: AppSettings;
  progress: AppProgress;
  featuredDay: CourseDay;
  todayDay?: CourseDay;
  nextUnlockDay: CourseDay | null;
  trustedDate: TrustedTaipeiDate;
  todayChallengeSteps: { warmup: boolean; learn: boolean };
  completedDays: number;
  completionPct: number;
  isChildDayDone: (childId: string, day: CourseDay) => boolean;
  openDay: (day: CourseDay) => void;
  goSemester: () => void;
}) {
  const activeChildren = settings.children.filter((child) => !child.disabled).slice(0, 2);
  const todayCompleted = Boolean(todayDay && activeChildren.length && activeChildren.every((child) => isChildDayDone(child.id, todayDay)));
  const featuredDateKey = addCourseWeekdaysYmd(settings.semesterStart, featuredDay.index - 1);
  const nextUnlockKey = nextUnlockDay ? addCourseWeekdaysYmd(settings.semesterStart, nextUnlockDay.index - 1) : null;
  const vocabulary = Array.from(new Set(featuredDay.blocks.flatMap((block) => block.vocabulary))).slice(0, 5);
  const missionCount = featuredDay.blocks.reduce((sum, block) => sum + block.missions.length, 0);
  const worldArt = lessonWorldArt(featuredDay.blocks[0]);
  const worldName = worldArt === 'world-animal.webp' ? 'Animal Forest'
    : worldArt === 'world-color.webp' ? 'Color Garden'
      : worldArt === 'world-food.webp' ? 'Food Market'
        : worldArt === 'world-ocean.webp' ? 'Ocean Adventure'
          : worldArt === 'world-space.webp' ? 'Space Station'
            : 'Hello Town';
  const challengeDone = todayCompleted;
  const challengeProgress = [todayChallengeSteps.warmup, todayChallengeSteps.learn, challengeDone];
  const formalToday = Boolean(todayDay && trustedDate.verified);
  const heroState = !trustedDate.verified ? 'checking' : todayDay ? (todayCompleted ? 'complete' : 'today') : 'locked';

  return (
    <div className="page home-page v30-home v30-game-home">
      <section className={`v30-story-hero v30-daily-hero state-${heroState}`}>
        <div className="v30-hero-copy">
          <div className="v30-hero-date-row">
            <span className="v30-overline">DAILY CHALLENGE · DAY {featuredDay.index}</span>
            <span className={`v30-time-trust ${trustedDate.verified ? 'verified' : ''}`}>{trustedDate.verified ? `台北時間 · ${formatTaipeiCourseDate(trustedDate.ymd)}` : '正在確認台北日期…'}</span>
          </div>
          <h1>Hi, 小小探險家！</h1>
          <div className="v30-adventure-title"><span>今天的冒險</span><h2>{worldName}</h2></div>
          <ul className="v30-daily-goals" aria-label="今日挑戰目標">
            <li><BookOpen size={19} /><span>Learn {vocabulary.length} words</span></li>
            <li><Headphones size={19} /><span>Sing 1 song</span></li>
            <li><Gamepad2 size={19} /><span>Complete {missionCount} missions</span></li>
          </ul>
          <div className="v30-hero-actions">
            {heroState === 'today' && <button className="v30-primary-cta" onClick={() => openDay(featuredDay)}><PlayCircle size={23} />開始今天的冒險</button>}
            {heroState === 'complete' && <button className="v30-primary-cta is-complete" disabled><CheckCircle2 size={23} />今天完成了！</button>}
            {heroState === 'checking' && <button className="v30-primary-cta" disabled><RefreshCw size={22} />正在確認今天</button>}
            {heroState === 'locked' && <button className="v30-primary-cta" disabled><Lock size={22} />{shortUnlockDate(featuredDateKey)}</button>}
          </div>
          <div className="v30-daily-progress" aria-label="Daily Challenge 三階段進度">
            <div>{challengeProgress.map((done, index) => <span key={index} className={done ? 'done' : index === challengeProgress.findIndex((item) => !item) ? 'current' : ''} />)}</div>
            <strong>{challengeProgress.filter(Boolean).length} / 3 missions</strong>
          </div>
          {todayCompleted && nextUnlockKey && <small className="v30-next-unlock">下一個冒險 · {shortUnlockDate(nextUnlockKey)}</small>}
          {!todayDay && trustedDate.verified && <small className="v30-next-unlock">今天沒有正式挑戰 · 下一關 {shortUnlockDate(featuredDateKey)}</small>}
          {!formalToday && !trustedDate.verified && <small className="v30-next-unlock">日期尚未由伺服器確認前，只能瀏覽，不會發放 XP 或金幣。</small>}
        </div>
        <div className="v30-hero-illustration" aria-hidden="true"><img src={v30Asset(worldArt)} alt="" /></div>
      </section>

      <section className="v30-home-quick-row" aria-label="冒險摘要">
        <button className="v30-quick-card" onClick={goSemester}><Map size={24} /><span><strong>冒險地圖</strong><small>查看 18 週關卡</small></span><ChevronRight size={18} /></button>
        <div className="v30-quick-card is-progress"><Trophy size={24} /><span><strong>學期進度 {completionPct}%</strong><small>已完成 {completedDays} 個學習日</small></span></div>
      </section>

      <section className="v30-section v30-growth-section v30-home-growth">
        <div className="v30-section-heading"><div><span className="v30-overline">MY EXPLORERS</span><h2>角色成長</h2></div></div>
        <div className="v30-character-strip">{activeChildren.map((child) => { const normalized = normalizeProgress(progress[child.id]); const rewards = calculateRewards(normalized); const nextStage = nextAvatarStageXp(rewards.xp); return <article key={child.id}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={96} showStage equippedCosmetics={normalized.equippedCosmetics}/><div><span>Lv.{levelFromXp(rewards.xp)} · {avatarStageName(rewards.xp)}</span><h3>{child.name}</h3><ProgressBar value={rewards.xp % 220} max={220} /><small>{nextStage ? `再 ${Math.max(0, nextStage - rewards.xp)} XP 進化` : 'Legendary Explorer'}</small></div></article>; })}</div>
      </section>
    </div>
  );
}

function AchievementsView({ settings, progress, goHome, goShop }: { settings: AppSettings; progress: AppProgress; completedDays: number; goHome: () => void; goShop: () => void }) {
  const categories = [
    ['streak', 'Streak'], ['speaking', 'Speaking'], ['listening', 'Listening'], ['learning', 'Learning'], ['adventure', 'Adventure'], ['special', 'Special'],
  ] as const;
  return (
    <div className="page v30-secondary-page v30-rewards-page">
      <div className="v30-page-heading"><button className="icon-button" onClick={goHome}><ArrowLeft size={20} /></button><div><span className="v30-overline">BADGE COLLECTION</span><h1>我的徽章收藏</h1><p>24 枚原創徽章都由正式學習紀錄解鎖；未解鎖徽章保留低飽和剪影。</p></div><button className="v30-secondary-cta" onClick={goShop}><Gift size={19} />角色裝備</button></div>
      {settings.children.filter((child) => !child.disabled).map((child) => {
        const normalized = normalizeProgress(progress[child.id]);
        const rewards = calculateRewards(normalized);
        const unlocks = normalized.badgeUnlocks ?? {};
        const unlockedCount = Object.keys(unlocks).filter((id) => badgeById.has(id)).length;
        return <section className="v30-badge-learner" key={child.id}>
          <div className="v30-badge-learner-head"><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={86} showStage equippedCosmetics={normalized.equippedCosmetics}/><div><span className="v30-overline">{child.name} · {avatarStageName(rewards.xp)}</span><h2>{unlockedCount} / 24 Badges</h2><p>{rewards.xp} XP · {rewards.coins} 可用金幣</p></div><ProgressBar value={unlockedCount} max={24}/></div>
          {categories.map(([category, label]) => <div className="v30-badge-category" key={category}><div className="v30-badge-category-title"><strong>{label}</strong><span>{badges.filter((badge) => badge.category === category && unlocks[badge.id]).length}/4</span></div><div className="v30-badge-grid">{badges.filter((badge) => badge.category === category).map((badge) => <GameBadge key={badge.id} badge={badge} unlocked={Boolean(unlocks[badge.id])} earnedDate={unlocks[badge.id]} size={92}/>)}</div></div>)}
        </section>;
      })}
    </div>
  );
}

function CharacterView({ settings, progress, goHome, onUnlockCosmetic, onToggleCosmetic }: {
  settings: AppSettings;
  progress: AppProgress;
  goHome: () => void;
  onUnlockCosmetic: (childId: string, cosmeticId: string) => void;
  onToggleCosmetic: (childId: string, cosmeticId: string) => void;
}) {
  return (
    <div className="page v30-secondary-page v30-character-page">
      <div className="v30-page-heading"><button className="icon-button" onClick={goHome}><ArrowLeft size={20} /></button><div><span className="v30-overline">MY CHARACTER</span><h1>我的角色</h1><p>XP 決定 Level 與五階進化；金幣可以解鎖裝備，不需要任何付費功能。</p></div></div>
      <div className="v30-character-gallery">{settings.children.filter((child) => !child.disabled).map((child) => {
        const normalized = normalizeProgress(progress[child.id]);
        const rewards = calculateRewards(normalized);
        const stage = avatarStageFromXp(rewards.xp);
        const nextStage = nextAvatarStageXp(rewards.xp);
        const level = levelFromXp(rewards.xp);
        const unlocked = new Set(normalized.unlockedCosmetics ?? []);
        const equipped = new Set(normalized.equippedCosmetics ?? []);
        return <article key={child.id} className="v30-character-growth-card">
          <div className="v30-character-stage"><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={210} showStage equippedCosmetics={normalized.equippedCosmetics} /></div>
          <div className="v30-character-growth-copy"><span className="v30-overline">{child.name} · LEVEL {level}</span><h2>{avatarStageName(rewards.xp)}</h2><p>{stage === 5 ? 'Legendary Explorer 已解鎖。接下來的 XP 仍會累積在學習紀錄。' : `再累積 ${Math.max(0, (nextStage ?? rewards.xp) - rewards.xp)} XP，解鎖下一階角色造型。`}</p><ProgressBar value={stage} max={5} /><div className="v30-character-reward"><AnimatedBadge art="xp" size={42} /><strong>{rewards.xp} XP</strong><span>Stage {stage}/5</span><span className="v30-coin-wallet"><Coins size={16}/>{rewards.coins} 可用</span></div>
            <div className="v30-stage-road" aria-label="五階角色成長">{['Little Explorer','Adventure Rookie','Star Explorer','Adventure Master','Legendary Explorer'].map((name, index) => <span key={name} className={stage >= index + 1 ? 'unlocked' : ''}><b>{index + 1}</b><small>{name}</small></span>)}</div>
          </div>
          <div className="v30-cosmetic-section"><div><span className="v30-overline">COSMETICS</span><h3>冒險裝備</h3><p>解鎖紀錄會保存；可用金幣由「學習所得 − 已解鎖裝備成本」即時計算。</p></div><div className="v30-cosmetic-grid">{cosmetics.map((item) => {
            const owned = unlocked.has(item.id);
            const active = equipped.has(item.id);
            const levelReady = level >= item.unlockLevel;
            const affordable = rewards.coins >= item.cost;
            const disabled = !owned && (!levelReady || !affordable);
            return <button key={item.id} disabled={disabled} className={`${owned ? 'owned' : ''} ${active ? 'equipped' : ''}`} onClick={() => owned ? onToggleCosmetic(child.id, item.id) : onUnlockCosmetic(child.id, item.id)}><span className={`v30-cosmetic-symbol slot-${item.slot}`} aria-hidden="true"/><strong>{item.name}</strong><small>{active ? '已裝備' : owned ? '點一下裝備' : !levelReady ? `Lv.${item.unlockLevel} 解鎖` : affordable ? `${item.cost} 金幣解鎖` : `還差 ${item.cost - rewards.coins} 金幣`}</small></button>;
          })}</div></div>
        </article>;
      })}</div>
      <div className="v30-mascot-note"><img src={v30Asset('characters/mascot-helper.webp')} alt="小星" /><div><strong>每一階都要看得出成長</strong><p>五階造型使用同一角色 Art Bible；裝備只改外觀，不會改動 XP、課程或完成紀錄。</p></div></div>
    </div>
  );
}

function ParentCalendar({ settings, isChildDayDone }: { settings: AppSettings; isChildDayDone: (childId: string, day: CourseDay) => boolean }) {
  const activeChildren = settings.children.filter((child) => !child.disabled);
  const monthGroups = new globalThis.Map<string, CourseDay[]>();
  curriculum.forEach((day) => {
    const key = addCourseWeekdaysYmd(settings.semesterStart, day.index - 1).slice(0, 7);
    monthGroups.set(key, [...(monthGroups.get(key) ?? []), day]);
  });
  return <section className="v30-parent-panel v30-parent-calendar-panel"><div className="v30-section-heading"><div><span className="v30-overline">PARENT CALENDAR</span><h2>課程月曆</h2><p>孩子看 Adventure Map；日期、排程與完成概況留在家長區。</p></div><CalendarDays size={24}/></div><div className="v30-parent-months">{Array.from(monthGroups.entries()).map(([monthKey, days]) => {
    const monthDate = ymdToTaipeiDate(`${monthKey}-01`);
    const label = new Intl.DateTimeFormat('zh-TW',{ timeZone:'Asia/Taipei', year:'numeric', month:'long' }).format(monthDate);
    return <article className="v30-parent-month" key={monthKey}><h3>{label}</h3><div className="v30-parent-calendar-weekdays">{['日','一','二','三','四','五','六'].map((day) => <span key={day}>{day}</span>)}</div><div className="v30-parent-calendar-grid">{days.map((day) => {
      const dateKey = addCourseWeekdaysYmd(settings.semesterStart, day.index - 1);
      const date = ymdToTaipeiDate(dateKey);
      const completedLearners = activeChildren.filter((child) => isChildDayDone(child.id, day)).length;
      const allDone = activeChildren.length > 0 && completedLearners === activeChildren.length;
      return <div key={day.id} className={`v30-parent-calendar-day ${allDone ? 'done' : completedLearners ? 'partial' : ''}`} style={{ gridColumnStart: date.getUTCDay() + 1 }} title={`Day ${day.index} · ${completedLearners}/${activeChildren.length} 位完成`}><strong>{Number(dateKey.slice(-2))}</strong><small>D{day.index}</small><span>{allDone ? '完成' : completedLearners ? `${completedLearners}/${activeChildren.length}` : '—'}</span></div>;
    })}</div></article>;
  })}</div></section>;
}

function LearningReportView({ settings, progress, isChildDayDone, goHome, goSettings, cloudStatus }: { settings: AppSettings; progress: AppProgress; isChildDayDone: (childId: string, day: CourseDay) => boolean; goHome: () => void; goSettings: () => void; cloudStatus: CloudStatus }) {
  return (
    <div className="page v30-parent-page">
      <div className="v30-parent-heading"><div><button className="icon-button" onClick={goHome}><ArrowLeft size={20} /></button><div><span className="v30-overline">PARENT MODE</span><h1>家長學習中心</h1><p>學習報表、課程月曆、家庭設定、PIN 與雲端資訊集中在這裡，不干擾兒童首頁。</p></div></div><div className="v30-parent-actions"><CloudPill status={cloudStatus} /><button className="v30-secondary-cta" onClick={goSettings}><SettingsIcon size={18} />家庭設定</button></div></div>
      <section className="v30-report-summary"><article><strong>18</strong><span>學習週</span></article><article><strong>90</strong><span>學習日</span></article><article><strong>180</strong><span>課程單元</span></article><article><strong>360</strong><span>互動任務</span></article></section>
      <section className="v30-parent-panel"><div className="v30-section-heading"><div><span className="v30-overline">LEARNER PROGRESS</span><h2>學習者進度</h2></div><GraduationCap size={24} /></div><div className="v30-report-list">{settings.children.map((child) => { const normalized = normalizeProgress(progress[child.id]); const rewards = calculateRewards(normalized); const days = curriculum.filter((day) => isChildDayDone(child.id, day)).length; return <article key={child.id}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={74} equippedCosmetics={normalized.equippedCosmetics}/><div className="report-main"><div><span>學習者</span><h3>{child.name}</h3></div><ProgressBar value={days} max={90} /><small>{days}/90 天 · {normalized.completedBlocks.length}/180 單元 · {normalized.completedMissions.length}/360 任務</small></div><div className="report-rewards"><strong>{rewards.xp}</strong><span>XP</span><strong>{rewards.coins}</strong><span>可用金幣</span></div></article>; })}</div></section>
      <ParentCalendar settings={settings} isChildDayDone={isChildDayDone}/>
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

function SemesterView({ settings, trustedDate, isDayDone, openDay, goHome }: { settings: AppSettings; trustedDate: TrustedTaipeiDate; isDayDone: (day: CourseDay) => boolean; openDay: (day: CourseDay) => void; goHome: () => void }) {
  return (
    <div className="page v30-semester-page v30-adventure-map-page">
      <div className="page-heading"><button className="icon-button" onClick={goHome}><ArrowLeft size={19} /></button><div><span className="eyebrow">ADVENTURE MAP</span><h1>我的學期冒險地圖</h1><p>完成 = 綠色星星；今天 = 紫色發光；過去未完成 = 灰色足跡；未來 = 鎖定。</p></div></div>
      <div className="v30-date-rule-note"><span className={trustedDate.verified ? 'verified' : ''}>{trustedDate.verified ? `Asia/Taipei · ${formatTaipeiCourseDate(trustedDate.ymd)}` : '正在確認台北日期，正式獎勵暫時鎖定'}</span><small>{semesterStats.days} 個關卡 · {semesterStats.blocks} 節學習</small></div>
      <div className="v30-map-world-strip">{learningWorlds.map((world) => <article key={world.id} className={`world-${world.accent}`}><img src={v30Asset(world.art)} alt=""/><div><strong>{world.name}</strong><small>朋友 {world.npc}</small></div></article>)}</div>
      <div className="v30-adventure-map">{weekSummaries.map((week) => {
        const days = curriculum.filter((day) => day.week === week.week);
        const doneCount = days.filter(isDayDone).length;
        const weekWorld = worldForDay(days[0]);
        return <section className={`v30-adventure-map-week world-${weekWorld.accent}`} key={week.week}>
          <div className="v30-map-week-head"><img src={v30Asset(weekWorld.art)} alt=""/><div><span>WEEK {String(week.week).padStart(2,'0')} · {weekWorld.name}</span><h2>{week.title}</h2><p>{week.bigIdea}</p></div><strong>{doneCount}/5</strong></div>
          <div className="v30-map-path">{days.map((day) => {
            const dateKey = addCourseWeekdaysYmd(settings.semesterStart, day.index - 1);
            const access = courseDayAccess(dateKey, trustedDate.ymd);
            const done = isDayDone(day);
            const status = done ? 'done' : access === 'today' ? 'today' : access === 'future' ? 'locked' : 'missed';
            const world = worldForDay(day);
            const special = easterEggDays.has(day.index);
            return <button key={day.id} disabled={status === 'locked'} onClick={() => openDay(day)} className={`v30-map-node ${status} world-${world.accent}`} aria-label={`Day ${day.index} ${status}`}>
              <span className="v30-map-node-orb">{done ? <Check size={23}/> : status === 'today' ? <Star size={23}/> : status === 'locked' ? <Lock size={21}/> : <Footprints size={22}/>}</span>
              <strong>Day {day.index}</strong><small>{formatTaipeiCourseDate(dateKey)}</small><em>{status === 'today' ? '今日挑戰' : status === 'locked' ? shortUnlockDate(dateKey) : done ? '完成' : '回顧'}</em>{special && <span className="v30-map-treasure" title="Treasure Day"><Gift size={18}/></span>}
            </button>;
          })}</div>
        </section>;
      })}</div>
    </div>
  );
}

function DayView({ day, date, settings, progress, participants, access, trustedDateVerified, onBack, onToggleAttendance, onToggleMission, onToggleBlock, onCompleteChallengeStep, reflection, onUpdateReflection, onClaimEgg }: {
  day: CourseDay;
  date: Date;
  settings: AppSettings;
  progress: AppProgress;
  participants: string[];
  access: CourseDayAccess;
  trustedDateVerified: boolean;
  onBack: () => void;
  onToggleAttendance: (childId: string) => void;
  onToggleMission: (childId: string, mission: LessonBlock['missions'][number]) => void;
  onToggleBlock: (childId: string, block: LessonBlock) => void;
  onCompleteChallengeStep: (step: 'warmup' | 'learn') => void;
  reflection: DayReflection;
  onUpdateReflection: (patch: Partial<DayReflection>) => void;
  onClaimEgg: (childId: string) => void;
}) {
  const dailySteps = reflection.dailyChallenge ?? { warmup: false, learn: false };
  const formalChallenge = access === 'today' && trustedDateVerified;
  const reviewMode = access === 'past' || !formalChallenge;
  const participantChildren = settings.children.filter((child) => participants.includes(child.id));
  const challengeComplete = participantChildren.length > 0 && participantChildren.every((child) => day.blocks.every((block) => progress[child.id]?.completedBlocks.includes(block.id)));
  const [stage, setStage] = useState<0 | 1 | 2>(() => dailySteps.learn ? 2 : dailySteps.warmup ? 1 : 0);
  const canOpenStage = (index: 0 | 1 | 2) => reviewMode || index === 0 || (index === 1 && dailySteps.warmup) || (index === 2 && dailySteps.warmup && dailySteps.learn);
  const moveAfterStep = (step: 'warmup' | 'learn') => {
    if (formalChallenge) onCompleteChallengeStep(step);
    setStage(step === 'warmup' ? 1 : 2);
  };
  const dailyStageItems = [
    { label: 'Warm-up', note: '唱跳暖身', icon: Headphones, done: dailySteps.warmup },
    { label: 'Learn', note: '影片與單字', icon: BookOpen, done: dailySteps.learn },
    { label: 'Challenge', note: '任務闖關', icon: Trophy, done: challengeComplete },
  ] as const;

  return (
    <div className={`lesson-page v30-lesson-page v30-daily-challenge-page mode-${access}`}>
      <header className="v30-lesson-header">
        <button className="icon-button" onClick={onBack}><ArrowLeft size={20} /></button>
        <div className="lesson-header-copy"><span>WEEK {day.week} · {formatCourseDate(date)}</span><h1>{day.title}</h1><p>{day.bigIdea}</p></div>
        <div className={`mission-badge v30-challenge-status ${formalChallenge ? 'today' : 'review'}`}>{formalChallenge ? <><Sparkles size={19} /> 今日挑戰</> : <><BookOpen size={19} /> 回顧模式</>}</div>
        {formalChallenge && easterEggDays.has(day.index) && <EasterEgg day={day} settings={settings} progress={progress} participants={participants} onClaim={onClaimEgg} />}
      </header>

      <main className="lesson-content">
        {!trustedDateVerified && access === 'today' && <div className="v30-trusted-time-warning"><Lock size={18} /><span>正在向伺服器確認 Asia/Taipei 日期。確認前可以複習內容，但不會發放 XP、金幣或徽章。</span></div>}
        {access === 'past' && <div className="v30-review-banner"><BookOpen size={20} /><div><strong>這是回顧模式</strong><span>可以重播教材、複習單字與句子；過去課程不能重新挑戰，也不會再次取得獎勵。</span></div></div>}

        <section className="attendance-panel v30-attendance-panel">
          <div><span className="v30-overline">LEARNERS</span><h2>{formalChallenge ? '今天誰一起上課？' : '本次回顧的學習者'}</h2><p>{formalChallenge ? '選好今天一起冒險的小朋友。' : '回顧模式不會修改出席或進度。'}</p></div>
          <div className="attendance-chips">{settings.children.filter((child) => !child.disabled).map((child) => {
            const active = participants.includes(child.id); const rewards = calculateRewards(progress[child.id]);
            return <button key={child.id} disabled={!formalChallenge} className={`attendance-chip ${active ? 'active' : ''}`} onClick={() => onToggleAttendance(child.id)}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={42} /><strong>{child.name}</strong>{active ? <Check size={17} /> : <Circle size={17} />}</button>;
          })}</div>
        </section>

        <nav className="v30-stage-nav v30-daily-stage-nav" aria-label="Daily Challenge 三階段">{dailyStageItems.map((item, index) => { const Icon = item.icon; const idx = index as 0 | 1 | 2; const enabled = canOpenStage(idx); return <button key={item.label} disabled={!enabled} className={`${stage === idx ? 'active' : ''} ${item.done ? 'done' : ''}`} onClick={() => enabled && setStage(idx)}><span>{item.done ? <Check size={14} /> : index + 1}</span><Icon size={23} /><strong>{item.label}</strong><small>{item.note}</small></button>; })}</nav>

        {stage === 0 && <section className="v30-stage-panel v30-daily-stage-panel v30-warmup-stage">
          <div className="v30-stage-intro"><img src={v30Asset(lessonWorldArt(day.blocks[0]))} alt="今日冒險世界" /><div><span className="v30-overline">STEP 1 · WARM-UP</span><h2>先唱、先動，準備開始！</h2><p>兩節課的暖身素材集中在這裡。跟著唱、拍手、做動作即可，不需要一次看完整支影片。</p></div></div>
          <div className="v30-video-pair">{day.blocks.map((block) => <VideoPlayer key={block.id} clip={block.warmup} compact warmup />)}</div>
          <button className="v30-primary-cta v30-next-stage" onClick={() => moveAfterStep('warmup')}>{formalChallenge && !dailySteps.warmup ? 'Warm-up 完成' : '前往 Learn'} <ChevronRight size={20} /></button>
        </section>}

        {stage === 1 && <section className="v30-stage-panel v30-daily-stage-panel v30-learn-stage">
          <div className="v30-stage-intro"><img src={v30Asset(lessonWorldArt(day.blocks[0]))} alt="學習世界" /><div><span className="v30-overline">STEP 2 · LEARN</span><h2>看、聽、說，學會今天的英文</h2><p>主影片、Vocabulary 與句型都在這一步。點單字卡即可播放英文發音。</p></div></div>
          <div className="v30-daily-learn-grid">{day.blocks.map((block, index) => <article className="v30-daily-learn-card" key={block.id}><div className="v30-block-heading"><div><span className="v30-overline">LESSON {index + 1}</span><h3>{block.title}</h3></div><SubjectBadge subject={block.subject} /></div><VideoPlayer clip={block.video} /><div className="v30-vocab-grid">{block.vocabulary.map((word) => <VocabularyCard key={word} word={word} block={block} />)}</div><div className="v30-sentence-practice"><span>Say it</span><strong>{block.sentence}</strong><button onClick={() => speakWord(block.sentence)}><Volume2 size={19} /> Listen</button></div></article>)}</div>
          <div className="v30-stage-actions"><button className="v30-secondary-cta" onClick={() => setStage(0)}><ArrowLeft size={18} />Warm-up</button><button className="v30-primary-cta" onClick={() => moveAfterStep('learn')}>{formalChallenge && !dailySteps.learn ? 'Learn 完成' : '前往 Challenge'} <ChevronRight size={20} /></button></div>
        </section>}

        {stage === 2 && <section className="v30-stage-panel v30-daily-stage-panel v30-challenge-stage">
          <div className="v30-stage-intro"><img src={v30Asset(lessonWorldArt(day.blocks[1]))} alt="挑戰世界" /><div><span className="v30-overline">STEP 3 · CHALLENGE</span><h2>{formalChallenge ? '完成任務，取得今天的獎勵！' : '回顧今天的任務內容'}</h2><p>{formalChallenge ? '完成每節的兩個任務，再完成兩節課，才算今天正式通關。' : '過去日期只顯示內容，不會變更完成紀錄。'}</p></div></div>
          <div className="v30-daily-challenge-blocks">{day.blocks.map((block, blockIndex) => <article className="v30-challenge-block" key={block.id}><div className="v30-block-heading"><div><span className="v30-overline">MISSION SET {blockIndex + 1}</span><h3>{block.title}</h3></div><SubjectBadge subject={block.subject} /></div><div className="v30-mission-grid">{block.missions.map((mission, missionIndex) => <article className="v30-mission-card" key={mission.id}><div className="v30-mission-number">{missionIndex + 1}</div><div><span>{mission.title}</span><h4>{mission.prompt}</h4><p><strong>完成標準</strong>{mission.criteria}</p></div><div className="v30-mission-players">{participantChildren.map((child) => { const done = progress[child.id]?.completedMissions.includes(mission.id) ?? false; const rewards = calculateRewards(progress[child.id]); return <button key={child.id} disabled={!formalChallenge || done} className={done ? 'done' : ''} onClick={() => onToggleMission(child.id, mission)}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={38} /><span>{child.name}</span>{done ? <CheckCircle2 size={20} /> : <span className="v30-reward-chip">+{mission.xp} XP</span>}</button>; })}</div></article>)}</div><div className="v30-complete-buttons">{participantChildren.map((child) => { const childProgress = normalizeProgress(progress[child.id]); const done = childProgress.completedBlocks.includes(block.id); const ready = block.missions.every((mission) => childProgress.completedMissions.includes(mission.id)); const rewards = calculateRewards(childProgress); return <button key={child.id} disabled={!formalChallenge || done || !ready} className={done ? 'done' : ready ? 'ready' : ''} onClick={() => onToggleBlock(child.id, block)}><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={46} /><span><strong>{child.name}</strong><small>{done ? '這一節已完成' : ready ? `完成這節 · +${BLOCK_REWARD.xp} XP` : '先完成兩個任務'}</small></span>{done ? <CheckCircle2 size={23} /> : <Award size={23} />}</button>; })}</div></article>)}</div>
          {challengeComplete && <div className="v30-day-complete-inline"><Trophy size={26} /><div><strong>Daily Challenge 完成！</strong><span>今天的正式進度已記錄，同一天不會再次發放獎勵。</span></div></div>}
          <button className="v30-secondary-cta" onClick={() => setStage(1)}><ArrowLeft size={18} />回到 Learn</button>
        </section>}

        <details className="v30-parent-guide-quick v30-parent-guide-merged"><summary><Users size={20} /> Parent Guide <ChevronRight size={18} /></summary><div>{day.blocks.map((block, blockIndex) => <section key={block.id}><span className="v30-overline">LESSON {blockIndex + 1}</span><h3>{block.title}</h3><p>{block.caregiverTip}</p><div className="timeline">{block.steps.map((step, index) => <div className="timeline-step" key={`${block.id}-${index}`}><div className="time-dot"><span>{step.minute}</span></div><div><h4>{step.title}</h4><p>{step.instruction}</p>{step.cue && <div className="pause-cue">暫停提示：{step.cue}</div>}</div></div>)}</div></section>)}</div></details>

        <section className="bonus-card v30-bonus-card"><div className="bonus-icon rich-bonus-icon"><AnimatedBadge art="treasure" size={58} /></div><div><span className="v30-overline">BONUS</span><h3>今天還想再玩一下嗎？</h3><p>{day.bonus}</p></div></section>
        {formalChallenge && <details className="v30-parent-guide-quick v30-reflection-wrap"><summary><CalendarDays size={20} /> 家長課後紀錄 <ChevronRight size={18} /></summary><ReflectionPanel day={day} reflection={reflection} onUpdate={onUpdateReflection} /></details>}
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
        <div className="v22-family-hero-art" aria-hidden="true"><img src={v30Asset('characters/avatar-father.webp')} alt="" /><img src={v30Asset('characters/avatar-mother.webp')} alt="" /><img className="robot" src={v30Asset('characters/mascot-helper.webp')} alt="" /></div>
      </section>

      <section className="settings-card"><div className="setting-label"><span className="setting-icon"><Sun size={20} /></span><div><h3>顯示模式</h3><p>明亮、夜間冒險或跟隨裝置系統。</p></div></div><div className="segmented-control">{(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => <button key={mode} className={settings.theme === mode ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, theme: mode }))}>{mode === 'system' ? <Monitor size={17} /> : mode === 'light' ? <Sun size={17} /> : <Moon size={17} />}{mode === 'system' ? '隨系統' : mode === 'light' ? '明亮' : '夜間冒險'}</button>)}</div></section>

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
                <AvatarHero avatarId={child.avatar} xp={rewards.xp} size={94} showStage equippedCosmetics={normalizeProgress(progress[child.id]).equippedCosmetics} />
                <div className="child-name-editor">
                  <input value={child.name} onChange={(e) => updateChild(child.id, { name: e.target.value })} />
                  <span>學習者 · {avatarName(child.avatar)} · Level {levelFromXp(rewards.xp)} · 進化 {stage}/5</span>
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

function App() {
  const [familyPin, setFamilyPin] = useState(() => {
    const saved = normalizeFamilyPin(localStorage.getItem(ACTIVE_PIN_KEY) ?? localStorage.getItem(LEGACY_ACTIVE_PIN_KEY) ?? '');
    if (validFamilyPin(saved)) return saved;
    return hasLegacyLocalData() ? '1234' : LOCAL_FAMILY_KEY;
  });

  const enterFamily = (pin: string) => {
    localStorage.setItem(ACTIVE_PIN_KEY, pin);
    localStorage.removeItem(LEGACY_ACTIVE_PIN_KEY);
    setFamilyPin(pin);
  };

  const switchFamily = () => {
    localStorage.removeItem(ACTIVE_PIN_KEY);
    localStorage.removeItem(LEGACY_ACTIVE_PIN_KEY);
    setFamilyPin(LOCAL_FAMILY_KEY);
  };

  return <FamilyApp key={familyPin} familyPin={familyPin} onSwitchFamily={switchFamily} onOpenFamily={enterFamily} />;
}

export default App;
