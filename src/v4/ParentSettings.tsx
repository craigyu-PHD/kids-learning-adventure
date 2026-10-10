import '../styles/components/parent.css';
import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  ArrowLeft, BookOpen, CalendarDays, CheckCircle2, Cloud, CloudOff, Coins,
  GraduationCap, KeyRound, LogOut, Map, Mic, Monitor, Moon, MousePointer2, Plus, RefreshCw, ShieldCheck, Sparkles, Sun,
  Trash2, Users, Zap,
} from 'lucide-react';
import AvatarHero, { avatarName, avatarOptions, normalizeAvatarId } from '../components/AvatarHero';
import { normalizeFamilyPin, validFamilyPin } from '../cloud';
import { createUserPinCredential } from '../security';
import { avatarStageFromXp, calculateRewards, levelFromXp, normalizeProgress } from '../rewards';
import { visualThemeOptions } from '../uiData';
import { taipeiYmd } from '../dailyChallenge';
import { publishedSemesters, resolveSemester, selectSemester, setSelectedSemesterStart } from '../semesters';
import { contentHealthManifest } from '../generated/contentHealthManifest';
import { APP_VERSION } from '../generated/appVersion';
import type {
  AppProgress, AppSettings, AttendanceMap, ChildProfile, FamilyUserProfile, FamilyUserRole,
  ReflectionMap, ThemeMode,
} from '../types';
import { CaregiverAvatar, hasUserPin, roleLabel, userRoleOptions } from './caregivers';
import { availableEnglishVoices, cancelEnglishSpeech, speakEnglish, type EnglishVoiceOption } from './voice';

export type V4CloudStatus = 'local' | 'loading' | 'saving' | 'synced' | 'error';

type Props = {
  settings: AppSettings;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
  progress: AppProgress;
  attendance: AttendanceMap;
  reflections: ReflectionMap;
  setProgress: Dispatch<SetStateAction<AppProgress>>;
  setAttendance: Dispatch<SetStateAction<AttendanceMap>>;
  onResetProgress: (operationId: string) => Promise<void>;
  progressResetId: string;
  resetCompleted: boolean;
  familyId: string;
  cloudStatus: V4CloudStatus;
  cloudMessage: string;
  lastCloudSync: string;
  onSyncNow: () => Promise<void>;
  onPullCloud: () => Promise<boolean>;
  onSwitchFamily: () => void;
  onOpenFamily: (pin: string) => Promise<boolean>;
  goHome: () => void;
};

function CloudPill({ status }: { status: V4CloudStatus }) {
  const label = status === 'synced' ? '雲端已同步' : status === 'saving' ? '同步中' : status === 'loading' ? '讀取雲端' : status === 'error' ? '雲端待重試' : '本機模式';
  return <span className={`cloud-pill cloud-${status}`}>{status === 'local' || status === 'error' ? <CloudOff size={14} /> : <Cloud size={14} />}{label}</span>;
}

export default function ParentSettings({ settings, setSettings, progress, attendance, reflections, setProgress, setAttendance, onResetProgress, progressResetId, resetCompleted, familyId, cloudStatus, cloudMessage, lastCloudSync, onSyncNow, onPullCloud, onSwitchFamily, onOpenFamily, goHome }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const resetOperationId = useRef('');
  const [englishVoices, setEnglishVoices] = useState<EnglishVoiceOption[]>([]);
  const [userPinDrafts, setUserPinDrafts] = useState<Record<string, string>>({});
  const [userPinMessages, setUserPinMessages] = useState<Record<string, string>>({});
  const [nextFamilyPin, setNextFamilyPin] = useState('');
  const [pinSwitchError, setPinSwitchError] = useState('');
  const [compactSettings, setCompactSettings] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  const desktopSettingsOpen = () => !window.matchMedia('(max-width: 600px)').matches;
  const [advancedOpen, setAdvancedOpen] = useState(desktopSettingsOpen);
  const [membersOpen, setMembersOpen] = useState(desktopSettingsOpen);
  const [syncOpen, setSyncOpen] = useState(desktopSettingsOpen);
  const [backupOpen, setBackupOpen] = useState(desktopSettingsOpen);
  const [dangerOpen, setDangerOpen] = useState(desktopSettingsOpen);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)');
    const sync = () => {
      setCompactSettings(media.matches);
      if (!media.matches) { setAdvancedOpen(true); setMembersOpen(true); setSyncOpen(true); setBackupOpen(true); setDangerOpen(true); }
    };
    sync(); media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => () => cancelEnglishSpeech(), []);

  useEffect(() => {
    const refresh = () => setEnglishVoices(availableEnglishVoices());
    refresh();
    window.speechSynthesis?.addEventListener?.('voiceschanged', refresh);
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', refresh);
  }, []);

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
    setProgress((current) => { const next = { ...current }; delete next[id]; return next; });
    setAttendance((current) => Object.fromEntries(Object.entries(current).map(([dayId, participants]) => [dayId, participants.filter((participant) => participant !== id)])));
  };

  const setUserPin = async (user: FamilyUserProfile) => {
    const pin = normalizeFamilyPin(userPinDrafts[user.id] ?? '');
    if (!validFamilyPin(pin)) {
      setUserPinMessages((current) => ({ ...current, [user.id]: '請輸入 4–6 位數字 PIN。' }));
      return;
    }
    const credential = await createUserPinCredential(pin);
    updateUser(user.id, { userPinHash: credential.hash, userPinSalt: credential.salt, userPinIterations: credential.iterations });
    setUserPinDrafts((current) => ({ ...current, [user.id]: '' }));
    setUserPinMessages((current) => ({ ...current, [user.id]: '個人 PIN 已安全更新。' }));
  };
  const clearUserPin = (user: FamilyUserProfile) => {
    updateUser(user.id, { userPinHash: '', userPinSalt: '', userPinIterations: 0 });
    setUserPinMessages((current) => ({ ...current, [user.id]: '個人 PIN 已清除。' }));
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: 2, ...(progressResetId ? { progressResetId } : {}), settings, progress, attendance, reflections }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `小小探險隊-V${APP_VERSION}-學習紀錄-${taipeiYmd(new Date())}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const resetProgress = async () => {
    if (resetting) return;
    if (!confirmReset) { setConfirmReset(true); return; }
    resetOperationId.current ||= crypto.randomUUID();
    setResetting(true); setResetError('');
    try {
      await onResetProgress(resetOperationId.current);
      setConfirmReset(false); resetOperationId.current = '';
    } catch (error) { setResetError(error instanceof Error ? error.message : '清除未完成，請重新同步後再試一次。'); }
    finally { setResetting(false); }
  };
  const openAnotherFamily = async () => {
    const normalized = normalizeFamilyPin(nextFamilyPin);
    if (!validFamilyPin(normalized)) { setPinSwitchError('請輸入 4–6 位數字 PIN。'); return; }
    setPinSwitchError('');
    const ok = await onOpenFamily(normalized);
    if (!ok) { setPinSwitchError('無法開啟這個家庭，或目前就是同一個家庭。'); return; }
    setNextFamilyPin('');
  };

  return <div className="page settings-page v2-settings v4-settings-page">
    <div className="v30-parent-heading v4-settings-heading"><div><button className="icon-button" onClick={goHome}><ArrowLeft size={20} /></button><div><span className="v30-overline">PARENT CONTROL CENTER · V{APP_VERSION}</span><h1>家庭學習管理中心</h1><p>家庭管理者可管理成員、個人 PIN、冒險 Skin、學期日期、雲端同步與高風險資料操作。</p></div></div><ShieldCheck size={34} /></div>
    <div className="admin-unlocked-banner"><div><strong>管理者 PIN 已解鎖</strong><span>目前為家庭最高管理權限；離開家庭或重新載入後需再次驗證。</span></div><KeyRound size={20} /></div>
    <section className="v22-family-hero v30-family-summary v4-settings-family-hero" aria-label="家庭管理中心">
      <div><span className="v30-overline">FAMILY CONTROL</span><h2>全家的學習資料，由管理者守護</h2><p>照顧者帳號、學習者、個人 PIN、雲端同步與冒險 Skin 都集中在這裡管理；兒童首頁不顯示這些系統資訊。</p></div>
      <div className="v22-family-hero-art v4-settings-family-art" aria-hidden="true"><img src={`${import.meta.env.BASE_URL}assets/v5/characters/caregivers/avatar-father.webp`} alt="" /><img src={`${import.meta.env.BASE_URL}assets/v5/characters/caregivers/avatar-mother.webp`} alt="" /><img className="robot" src={`${import.meta.env.BASE_URL}assets/v5/characters/robot/avatar-256.webp`} alt="" /></div>
    </section>

    <section className="settings-card"><div className="setting-label"><span className="setting-icon"><Sun size={20} /></span><div><h3>顯示模式</h3><p>明亮、夜間冒險或跟隨裝置系統。</p></div></div><div className="segmented-control">{(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => <button key={mode} className={settings.theme === mode ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, theme: mode }))}>{mode === 'system' ? <Monitor size={17} /> : mode === 'light' ? <Sun size={17} /> : <Moon size={17} />}{mode === 'system' ? '隨系統' : mode === 'light' ? '明亮' : '夜間冒險'}</button>)}</div></section>

    <section className="settings-card vertical motion-settings-card" aria-label="互動效果設定">
      <div className="setting-label"><span className="setting-icon"><Sparkles size={20} /></span><div><h3>互動效果</h3><p>游標特效與一般動態可以分開控制；關閉後仍保留完整按鈕、文字、鍵盤焦點與學習功能。</p></div></div>
      <div className="motion-preference-grid">
        <div><span><MousePointer2 size={18}/> 主題游標效果</span><div className="segmented-control"><button className={settings.cursorEffects !== false ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, cursorEffects: true }))}>開啟</button><button className={settings.cursorEffects === false ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, cursorEffects: false }))}>關閉</button></div></div>
        <div><span><Sparkles size={18}/> 一般動態效果</span><div className="segmented-control"><button className={settings.motionEffects !== false ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, motionEffects: true }))}>開啟</button><button className={settings.motionEffects === false ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, motionEffects: false }))}>關閉</button></div></div>
      </div>
    </section>

    <section className="settings-card voice-settings-card">
      <div className="setting-label"><span className="setting-icon"><Mic size={20} /></span><div><h3>英文示範語音</h3><p>課程、題目與句型共用這裡的設定。課程音檔使用固定女聲；也可自行選擇裝置語音。</p></div></div>
      <div className="segmented-control voice-choice">
        <button className={settings.voiceSource !== 'device' ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, voiceSource: 'recorded' }))}>課程音檔</button>
        <button className={settings.voiceSource === 'device' ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, voiceSource: 'device' }))}>裝置語音</button>
        <button type="button" className="voice-preview-button" onClick={() => speakEnglish('Hello! Let us learn English together.', settings)}>試聽</button>
      </div>
      <div className="segmented-control voice-speed-choice"><button className={settings.voiceRate !== 0.9 ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, voiceRate: 0.78 }))}>慢速示範</button><button className={settings.voiceRate === 0.9 ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, voiceRate: 0.9 }))}>一般語速</button></div>
      {settings.voiceSource === 'device' ? <>
        <div className="segmented-control voice-choice"><button className={settings.voicePreference !== 'male' ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, voicePreference: 'female', voiceId: undefined }))}>裝置女聲</button><button className={settings.voicePreference === 'male' ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, voicePreference: 'male', voiceId: undefined }))}>裝置男聲</button></div>
        {englishVoices.length > 0 ? <label className="voice-select-label">指定裝置語音<select value={settings.voiceId ?? ''} onChange={(event) => setSettings((current) => ({ ...current, voiceId: event.target.value || undefined }))}><option value="">自動選擇{settings.voicePreference === 'male' ? '男聲' : '女聲'}</option>{englishVoices.map((voice) => <option key={voice.id} value={voice.id}>{voice.label}</option>)}</select></label> : <p className="voice-device-note">此裝置尚未提供可選聲線；播放時使用瀏覽器語音。</p>}
      </> : <p className="voice-device-note">優先播放課程音檔；音檔無法播放時使用裝置語音備援。</p>}
    </section>

    <details className="v65-settings-group advanced" open={advancedOpen} onToggle={(event)=>setAdvancedOpen(event.currentTarget.open)}>
      <summary><span>學期與冒險主題</span><small>{compactSettings?'點一下展開冒險主題與學期起始日':`冒險主題與 ${resolveSemester(settings).days.length} 天課程排程`}</small></summary>
    <section className="settings-card vertical theme-settings-card">
      <div className="setting-label"><span className="setting-icon"><Map size={20} /></span><div><h3>冒險主題</h3><p>五套原創主題會同步調整 Header、卡片、按鈕與共享世界裝飾；教材、日期與安全規則保持一致。</p></div></div>
      <div className="visual-theme-grid">{visualThemeOptions.map((option) => <button key={option.id} className={`visual-theme-option ${settings.visualTheme === option.id ? 'active' : ''}`} onClick={() => setSettings((current) => ({ ...current, visualTheme: option.id }))}><img className="visual-theme-art" src={`${import.meta.env.BASE_URL}assets/v5/themes/${option.art}`} alt="" aria-hidden="true" /><div><strong>{option.title}</strong><small>{option.subtitle}</small></div>{settings.visualTheme === option.id && <CheckCircle2 size={18} />}</button>)}</div>
    </section>

    <section className="settings-card"><div className="setting-label"><span className="setting-icon"><CalendarDays size={20} /></span><div><h3>目前學期</h3><p>只列出已開放的學期。切換學期會更新課表與報表，孩子的累積成長與收藏會保留。</p></div></div><select aria-label="目前學期" value={resolveSemester(settings).id} onChange={(event) => setSettings(current => selectSemester(current, event.target.value))}>{publishedSemesters.map(semester => <option key={semester.id} value={semester.id}>{semester.label}</option>)}</select></section>
    <section className="settings-card"><div className="setting-label"><span className="setting-icon"><CalendarDays size={20} /></span><div><h3>學期起始日</h3><p>{resolveSemester(settings).label} · 改日期後，本學期 {resolveSemester(settings).days.length} 個課程日會重新排程，首頁與日曆同步更新。</p></div></div><input className="date-input" aria-label="學期起始日" type="date" value={resolveSemester(settings).startDate} onChange={(event) => setSettings(current => setSelectedSemesterStart(current, event.target.value))} /></section>
    </details>

    <details className="v65-settings-group members" open={membersOpen} onToggle={(event)=>setMembersOpen(event.currentTarget.open)}>
      <summary><span>家庭成員</span><small>{compactSettings?'點一下管理家長帳號與學習者':'家長登入帳號與孩子學習者分開管理'}</small></summary>
    <section className="settings-card vertical user-admin-card">
      <div className="setting-label"><span className="setting-icon"><Users size={20} /></span><div><h3>家長／照顧者登入帳號</h3><p>這些是操作網站的大人帳號，頂部「切換使用者」只會列出這裡的人。爸爸、媽媽或其他照顧者可各自設定 4–6 位 PIN；學習 XP 不會記在大人帳號上。</p></div></div>
      <div className="caregiver-settings-list">{settings.users.map((user) => <div className={`child-setting-card caregiver-setting-card ${user.disabled ? 'is-disabled' : ''}`} key={user.id}>
        <div className="child-setting-head"><CaregiverAvatar user={user} size={88} /><div className="child-name-editor"><input value={user.name} onChange={(e) => updateUser(user.id, { name: e.target.value })} /><span>{roleLabel(user.role)} · 網站登入帳號</span></div><button className="icon-button danger" onClick={() => removeUser(user.id)} disabled={settings.users.length <= 1} title="刪除登入帳號"><Trash2 size={17} /></button></div>
        <div className="user-admin-row"><label>身份<select value={user.role} onChange={(e) => updateUser(user.id, { role: e.target.value as FamilyUserRole })}>{userRoleOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="status-toggle"><input type="checkbox" checked={!user.disabled} onChange={(e) => updateUser(user.id, { disabled: !e.target.checked })} /><span>{user.disabled ? '已停用' : '可登入'}</span></label></div>
        <div className="user-pin-editor"><div><strong><KeyRound size={16} /> 個人 PIN</strong><small>{hasUserPin(user) ? 'PBKDF2 驗證已啟用；切換到這位家長／照顧者時會要求輸入。' : '尚未設定；管理者可建立 4–6 位個人 PIN。'}</small></div><div className="user-pin-controls"><input type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={userPinDrafts[user.id] ?? ''} onChange={(e) => setUserPinDrafts((current) => ({ ...current, [user.id]: normalizeFamilyPin(e.target.value) }))} placeholder="輸入新 PIN" /><button className="secondary-button" onClick={() => void setUserPin(user)}>{hasUserPin(user) ? '重設 PIN' : '設定 PIN'}</button>{hasUserPin(user) && <button className="text-button danger-text" onClick={() => clearUserPin(user)}>清除</button>}</div>{userPinMessages[user.id] && <span className="user-pin-message">{userPinMessages[user.id]}</span>}</div>
      </div>)}</div>
      <button className="secondary-button add-child" onClick={addUser}><Plus size={18} /> 新增家長／照顧者</button>
    </section>

    <section className="settings-card vertical learner-admin-card">
      <div className="setting-label"><span className="setting-icon"><GraduationCap size={20} /></span><div><h3>小小探險隊學習者</h3><p>哥哥、弟弟等孩子只存在於學習者名單；每人分開計算出席、任務、XP、金幣與角色進化，不會出現在頂部登入帳號選單。</p></div></div>
      <div className="children-settings-list v2-children-settings">{settings.children.map((child) => { const rewards = calculateRewards(progress[child.id]); const stage = avatarStageFromXp(rewards.xp); return <div className={`child-setting-card ${child.disabled ? 'is-disabled' : ''}`} key={child.id}>
        <div className="child-setting-head"><AvatarHero avatarId={child.avatar} xp={rewards.xp} size={94} equippedCosmetics={normalizeProgress(progress[child.id]).equippedCosmetics} /><div className="child-name-editor"><input value={child.name} onChange={(e) => updateChild(child.id, { name: e.target.value })} /><span>學習者 · {avatarName(child.avatar)} · Level {levelFromXp(rewards.xp)} · 進化 {stage}/4</span><div className="child-inline-stats"><span><Zap size={15} /> {rewards.xp} XP</span><span><Coins size={15} /> {rewards.coins}</span></div></div><button className="icon-button danger" onClick={() => removeChild(child.id)} disabled={settings.children.length <= 1} title="刪除學習者"><Trash2 size={17} /></button></div>
        <div className="user-admin-row"><label className="status-toggle"><input type="checkbox" checked={!child.disabled} onChange={(e) => updateChild(child.id, { disabled: !e.target.checked })} /><span>{child.disabled ? '暫停參與' : '參與學習'}</span></label></div>
        <div className="avatar-choice-grid">{avatarOptions.map((option) => <button key={option.id} className={normalizeAvatarId(child.avatar) === option.id ? 'active' : ''} onClick={() => updateChild(child.id, { avatar: option.id })}><AvatarHero avatarId={option.id} xp={rewards.xp} size={46} /><span>{option.short}</span></button>)}</div>
      </div>; })}</div>
      <button className="secondary-button add-child" onClick={addChild}><Plus size={18} /> 新增學習者</button>
    </section>
    </details>

    <details className="v65-settings-group sync" open={syncOpen} onToggle={(event)=>setSyncOpen(event.currentTarget.open)}>
      <summary><span>家庭 PIN 與雲端同步</span><small>{compactSettings?'點一下查看同步狀態與家庭切換':'同步狀態、家庭 PIN 與內容健康度'}</small></summary>
    <section className="settings-card vertical cloud-settings-card pin-profile-card">
      <div className="setting-label"><span className="setting-icon"><KeyRound size={20} /></span><div><h3>家庭 PIN 與雲端同步</h3><p>目前登入的家庭資料會自動存到 Vercel 私有雲端；同一組 PIN 在其他裝置登入，就會讀取同一份進度。</p></div></div>
      <div className="cloud-active-panel">
        <div className="cloud-code-box pin-code-box"><span>家庭安全識別</span><strong>•••• {familyId.slice(-8).toUpperCase()}</strong><small>PIN 不會儲存在瀏覽器；此識別碼不可反推出 PIN。</small></div>
        <div className="family-pin-switcher"><div><strong>新增／切換家庭 PIN</strong><span>新 PIN 會建立新的家庭設定檔；已存在的 PIN 會載入原本那一家。</span></div><div className="family-pin-switch-row"><input type="password" inputMode="numeric" maxLength={6} value={nextFamilyPin} onChange={(e) => { setNextFamilyPin(normalizeFamilyPin(e.target.value)); setPinSwitchError(''); }} onKeyDown={(e) => { if (e.key === 'Enter') void openAnotherFamily(); }} placeholder="例如 0000" /><button className="secondary-button" disabled={!validFamilyPin(nextFamilyPin)} onClick={() => void openAnotherFamily()}><KeyRound size={17} /> 開啟家庭</button></div>{pinSwitchError && <div className="pin-error inline-pin-error">{pinSwitchError}</div>}</div>
        <div className={`cloud-status-box cloud-${cloudStatus}`}><CloudPill status={cloudStatus} /><p>{cloudMessage || '進度變更後會自動同步到這個家庭。'}</p>{lastCloudSync && <small>最近同步：{new Date(lastCloudSync).toLocaleString('zh-TW')}</small>}</div>
        <div className="cloud-actions"><button className="secondary-button" onClick={() => void onSyncNow()}><Cloud size={17} /> 立即儲存</button><button className="secondary-button" onClick={() => void onPullCloud()}><RefreshCw size={17} /> 重新讀取雲端</button><button className="secondary-button danger-outline" onClick={onSwitchFamily}><LogOut size={17} /> 切換家庭</button></div>
        <p className="cloud-security-note">管理者 PIN 僅用於登入驗證，不會以明文儲存在瀏覽器。登入狀態到期後需重新驗證；切換家庭時，各家的學習資料保持獨立。</p>
      </div>
    </section>

    <section className="settings-card vertical" aria-label="內容健康度">
      <div className="setting-label"><span className="setting-icon"><CheckCircle2 size={20} /></span><div><h3>內容健康度</h3><p>目前課程與學習素材的整理摘要；影片播放仍受影片平台與網路狀況影響。</p></div></div>
      <div className="content-health-grid">{contentHealthManifest.items.map((item) => <article className={item.status} key={item.id}><span>{item.label}</span><strong>{item.actual} / {item.expected}</strong><small>{item.status === 'pass' ? '已通過' : '需要修正'}</small></article>)}</div>
      <p className="content-health-note">最近整理：{contentHealthManifest.checkedOn} · 同一支影片可用於不同的複習活動。</p>
    </section>
    </details>

    <details className="v65-settings-group backup" open={backupOpen} onToggle={(event)=>setBackupOpen(event.currentTarget.open)}>
      <summary><span>資料備份</span><small>匯出完整學習紀錄，不會修改網站內資料</small></summary>
      <section className="settings-card vertical"><div className="setting-label"><span className="setting-icon"><BookOpen size={20} /></span><div><h3>匯出學習紀錄</h3><p>可另外匯出完整 V{APP_VERSION} JSON（保留 V1／V2／V2.1／V2.2／V3 相容欄位），方便家長自行保存備份。</p></div></div><div className="data-actions"><button className="secondary-button" onClick={exportData}>匯出完整學習紀錄 JSON</button></div></section>
    </details>

    <details className="v65-settings-group danger" open={dangerOpen} onToggle={(event)=>setDangerOpen(event.currentTarget.open)}>
      <summary><span>危險操作</span><small>清除所有學習進度需要再次確認</small></summary>
      <section className="settings-card vertical"><div className="setting-label"><span className="setting-icon"><Trash2 size={20} /></span><div><h3>清除所有學習進度</h3><p>此操作不會刪除家庭成員與設定；必須連續確認，雲端確認成功後才更新本機。</p></div></div><div className="data-actions"><button type="button" disabled={resetting} aria-busy={resetting} className={`secondary-button danger-outline ${confirmReset ? 'confirming' : ''}`} onClick={() => void resetProgress()}>{resetting ? '正在清除進度…' : confirmReset ? '再按一次確認清除' : '清除所有學習進度'}</button></div>{resetError && <p className="pin-error" role="alert">{resetError}</p>}{resetCompleted && !resetError && <p role="status">上次清除已完成，家庭成員與設定已保留。</p>}</section>
    </details>
  </div>;
}
