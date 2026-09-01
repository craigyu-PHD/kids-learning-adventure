import { useEffect, useRef, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { normalizeFamilyPin, validFamilyPin } from '../cloud';
import { verifyUserPin } from '../security';
import type { FamilyUserProfile } from '../types';
import { playV4Sound } from './sound';
import { CaregiverAvatar, hasUserPin, roleLabel } from './caregivers';
import GameIcon from './GameIcon';

function useDialogFocusTrap() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')).filter((element) => element.getClientRects().length > 0);
    window.requestAnimationFrame(() => (root.querySelector<HTMLElement>('[autofocus]') ?? focusables()[0])?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) { event.preventDefault(); root.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !root.contains(active))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (active === last || !root.contains(active))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, []);
  return ref;
}

export function NumericPinPad({ value, onChange, onSubmit, maxLength = 6, busy = false }: { value: string; onChange: (value: string) => void; onSubmit: () => void; maxLength?: number; busy?: boolean }) {
  const append = (digit: string) => { if (value.length < maxLength) onChange(`${value}${digit}`); };
  return <div className="v4-pin-pad" aria-label="PIN 數字鍵盤">
    <div className="v4-pin-dots" aria-label={`已輸入 ${value.length} 位`}>{Array.from({ length: maxLength }, (_, index) => <i key={index} className={index < value.length ? 'filled' : ''} />)}</div>
    <div className="v4-pin-grid">{['1','2','3','4','5','6','7','8','9'].map((digit) => <button key={digit} type="button" onClick={() => append(digit)}>{digit}</button>)}<button type="button" className="clear" onClick={() => onChange('')}>清除</button><button type="button" onClick={() => append('0')}>0</button><button type="button" className="backspace" onClick={() => onChange(value.slice(0, -1))}>⌫</button></div>
    <button type="button" className="v4-pin-submit" disabled={value.length < 4 || busy} onClick={onSubmit}>{busy ? '驗證中…' : '解鎖家長專區'}</button>
  </div>;
}

export function AdminPinDialog({ onUnlock, onClose }: { onUnlock: (pin: string) => Promise<boolean>; onClose: () => void }) {
  const dialogRef = useDialogFocusTrap();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  const submit = async () => {
    if (!validFamilyPin(pin) || busy) {
      playV4Sound('error');
      setError('PIN 還沒有對上，再確認一次即可。');
      return;
    }
    setBusy(true);
    try {
      if (!await onUnlock(pin)) {
        playV4Sound('error');
        setError('PIN 還沒有對上，再確認一次即可。');
        return;
      }
      setError('');
    } finally {
      setBusy(false);
    }
  };
  return <div ref={dialogRef} className="modal-scrim v4-pin-scrim" role="dialog" aria-modal="true" aria-label="管理者驗證"><div className={`game-modal admin-modal v4-pin-modal ${error ? 'has-error' : ''}`}><button className="v30-modal-x" onClick={onClose} aria-label="關閉">×</button><div className="modal-icon"><GameIcon size="lg"><KeyRound /></GameIcon></div><span className="eyebrow">PARENT LOCK</span><h2>家長保護</h2><p>只有家長可以修改課程、學期、YouTube 來源、個人資料與獎勵規則。誤點時可直接取消。</p><label>輸入家庭管理者 PIN</label><NumericPinPad value={pin} onChange={(value) => { setPin(normalizeFamilyPin(value)); setError(''); }} onSubmit={() => void submit()} busy={busy} />{error && <div className="pin-error">{error}</div>}<button className="modal-close-link" onClick={onClose}>取消</button><small className="modal-family-hint">支援既有 4–6 位家庭 PIN · Esc 可關閉 · PIN 不顯示在畫面上</small></div></div>;
}

export function FamilySetupDialog({ onSetPin, onClose }: { onSetPin: (pin: string) => Promise<boolean>; onClose: () => void }) {
  const dialogRef = useDialogFocusTrap();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  const submit = async () => {
    const normalized = normalizeFamilyPin(pin);
    if (!validFamilyPin(normalized) || busy) { setError('請設定 4–6 位數字 PIN。'); return; }
    setBusy(true);
    try {
      const ok = await onSetPin(normalized);
      if (!ok) { setError('目前無法建立安全家庭工作階段，請確認網路後再試。'); return; }
      setError('');
    } finally {
      setBusy(false);
    }
  };
  return <div ref={dialogRef} className="modal-scrim" role="dialog" aria-modal="true" aria-label="設定家庭 PIN"><div className="game-modal admin-modal v30-family-setup-modal"><button className="v30-modal-x" onClick={onClose} aria-label="關閉">×</button><div className="modal-icon"><GameIcon size="lg"><KeyRound /></GameIcon></div><span className="eyebrow">PARENT AREA</span><h2>先保護家長專區</h2><p>孩子可以繼續使用首頁、冒險世界、獎勵與角色。只有進入家長專區、雲端同步或敏感設定時才需要家庭 PIN。</p><label>設定家庭管理者 PIN</label><div className="modal-pin-row"><input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(event) => { setPin(normalizeFamilyPin(event.target.value)); setError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') void submit(); }} autoFocus placeholder="4–6 位數字"/><button className="primary-button" disabled={busy} onClick={() => void submit()}>{busy ? '建立中…' : '設定 PIN'}</button></div>{error && <div className="pin-error">{error}</div>}<div className="v30-pin-cancel-row"><button className="secondary-button" onClick={onClose}>稍後再說</button><button className="modal-close-link" onClick={onClose}>取消</button></div><small className="modal-family-hint">Esc 可關閉。設定後會把目前本機進度搬入這個家庭並啟用私有雲端同步。</small></div></div>;
}

export function UserSwitchDialog({ users, activeUserId, onActivate, onClose }: { users: FamilyUserProfile[]; activeUserId: string | null; onActivate: (id: string) => void; onClose: () => void }) {
  const dialogRef = useDialogFocusTrap();
  const availableUsers = users.filter((user) => !user.disabled);
  const [selectedId, setSelectedId] = useState(activeUserId ?? availableUsers[0]?.id ?? '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const selected = availableUsers.find((user) => user.id === selectedId);
  const submit = async () => {
    if (!selected) return;
    if (hasUserPin(selected)) {
      if (!validFamilyPin(pin)) { setError('請輸入 4–6 位使用者 PIN。'); return; }
      const ok = await verifyUserPin(pin, { hash: selected.userPinHash!, salt: selected.userPinSalt!, iterations: selected.userPinIterations! });
      if (!ok) { setError('使用者 PIN 不正確。'); return; }
    }
    setError('');
    onActivate(selected.id);
  };
  return <div ref={dialogRef} className="modal-scrim" role="dialog" aria-modal="true" aria-label="切換家長或照顧者"><div className="game-modal user-switch-modal"><header className="user-switch-heading"><span className="eyebrow">CAREGIVER SELECT</span><h2>選擇家長／照顧者</h2><p className="dialog-intro">這裡選的是操作網站的大人；哥哥、弟弟則在課程與「小小探險隊成長」中各自保存進度、XP 與金幣。</p></header><div className="user-select-grid">{availableUsers.map((user) => { const selectedUser = selectedId === user.id; const pinEnabled = hasUserPin(user); return <button key={user.id} type="button" aria-pressed={selectedUser} className={`user-select-card ${selectedUser ? 'selected' : ''}`} onClick={() => { setSelectedId(user.id); setPin(''); setError(''); }}><span className="user-select-art"><CaregiverAvatar user={user} size={96} /></span><span className="user-select-copy"><strong>{user.name}</strong><span>{roleLabel(user.role)}</span><small>{pinEnabled ? '個人 PIN 已啟用' : '尚未設定個人 PIN'}</small></span><span className="user-select-state">{selectedUser ? '目前選擇' : '點選選擇'}</span></button>; })}</div>{selected && hasUserPin(selected) && <div className="modal-pin-row user-switch-pin-row"><input type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} value={pin} onChange={(e) => setPin(normalizeFamilyPin(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} placeholder="輸入個人 PIN" /><button className="primary-button" onClick={() => void submit()}>進入</button></div>}<div className="user-switch-actions">{selected && !hasUserPin(selected) && <button className="primary-button full" onClick={() => void submit()}>使用此帳號</button>}{!availableUsers.length && <div className="pin-error">目前沒有可登入的家長／照顧者帳號，請由家庭管理者重新啟用。</div>}{error && <div className="pin-error">{error}</div>}<button className="modal-close-link" onClick={onClose}>取消並留在目前頁面</button></div></div></div>;
}
