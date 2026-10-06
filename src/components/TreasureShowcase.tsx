import { useEffect, useRef, useState, type CSSProperties } from 'react';
import AvatarRenderer from './AvatarRenderer';
import PetCompanion from './PetCompanion';
import { cosmeticById, equippedCosmeticForSlot } from '../cosmetics';
import { shopItemById } from '../avatarShop';
import { equipmentPreviewAssetPath, previewModeForItem, previewModeLabels } from '../equipmentPreview';

import { roomSceneAssetPath } from '../worldArtAssets';
import { useRobotBlink } from '../useRobotBlink';

const cardRarityLabels = { common: '基本收藏', rare: '稀有收藏', epic: '史詩收藏', legendary: '傳奇收藏' };

function revealFocusedPreviewControl(button: HTMLButtonElement) {
  // Native focus scrolling cannot account for the fixed mobile navigation.
  const navigation = document.querySelector<HTMLElement>('.v4-main-navigation');
  if (!navigation || getComputedStyle(navigation).position !== 'fixed') return;
  const control = button.getBoundingClientRect();
  const nav = navigation.getBoundingClientRect();
  if (control.bottom > nav.top && control.top < nav.bottom && control.right > nav.left && control.left < nav.right) {
    button.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  }
}

function PreviewRetryButton({ onRetry }: { onRetry: () => void }) {
  const pointerFocus = useRef(false);
  return <button type="button"
    onPointerDown={() => { pointerFocus.current = true; }}
    onPointerUp={() => { pointerFocus.current = false; }}
    onPointerCancel={() => { pointerFocus.current = false; }}
    onBlur={() => { pointerFocus.current = false; }}
    onFocus={event => { if (!pointerFocus.current) revealFocusedPreviewControl(event.currentTarget); }}
    onClick={onRetry}
  >重新載入圖片</button>;
}

function RetryablePreviewImage({ src, alt, className, robotItemId }: { src: string; alt: string; className: string; robotItemId?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [decodedBlinkFrame, setDecodedBlinkFrame] = useState<string>();
  const retrySrc = attempt ? `${src}${src.includes('?') ? '&' : '?'}previewRetry=${attempt}` : src;
  const blink = useRobotBlink(ref, retrySrc, robotItemId);
  const showBlink = Boolean(robotItemId && blink.frame && decodedBlinkFrame === blink.frame && blink.src === blink.frame);
  if (failed) return <div className="v64-preview-load-error" role="status">
    <strong>預覽圖片暫時無法載入</strong>
    <span className="v64-preview-error-copy">可以再試一次，或先看看其他寶物。</span>
    <PreviewRetryButton onRetry={() => { setAttempt(value => value + 1); setFailed(false); }}/>
  </div>;
  if (!robotItemId) return <img ref={ref} className={className} src={retrySrc} alt={alt} loading="eager" decoding="async" onError={() => setFailed(true)} />;
  return <span className="v64-robot-blink-stack">
    <img ref={ref} className={className} src={retrySrc} alt={alt} loading="eager" decoding="async" style={showBlink ? { visibility: 'hidden' } : undefined} onError={() => setFailed(true)} />
    {blink.frame && <img
      className="v64-robot-blink-buffer"
      src={blink.frame}
      alt=""
      aria-hidden="true"
      data-robot-motion={showBlink ? 'blink' : undefined}
      decoding="sync"
      style={{ visibility: showBlink ? 'visible' : 'hidden' }}
      onLoad={event => {
        const element = event.currentTarget;
        const frame = blink.frame;
        void element.decode().then(() => { if (element.isConnected) setDecodedBlinkFrame(frame); }, blink.disableFrame);
      }}
      onError={blink.disableFrame}
    />}
  </span>;
}

function RetryableAvatarPreview({ avatarId, xp, equippedCosmetics, attempt, onRetry }: { avatarId?: string; xp: number; equippedCosmetics?: string[]; attempt: number; onRetry: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="v64-preview-load-error" role="status">
    <strong>這套造型暫時無法顯示</strong>
    <span className="v64-preview-error-copy">可以重新載入，或先試試其他裝備。收藏與穿搭紀錄都會保留。</span>
    <PreviewRetryButton onRetry={() => { onRetry(); setFailed(false); }}/>
  </div>;
  return <AvatarRenderer key={attempt} avatarId={avatarId} xp={xp} equippedCosmetics={equippedCosmetics} size={330} heroPreview imageRetry={attempt} onSkinError={() => setFailed(true)} onWearableError={() => setFailed(true)}/>;
}

export default function TreasureShowcase({ avatarId, xp, equippedCosmetics, learnerName, previewNames = [], focusItemId, previewing = false, confirmationKey, panelId, labelledBy }: {
  avatarId?: string;
  xp: number;
  equippedCosmetics?: string[];
  learnerName: string;
  previewNames?: string[];
  focusItemId?: string;
  previewing?: boolean;
  confirmationKey?: string;
  panelId?: string;
  labelledBy?: string;
}) {
  const stageRef = useRef<HTMLElement>(null);
  const settleAnimation = useRef<Animation | null>(null);
  const confirmAnimation = useRef<Animation | null>(null);
  const confirmTimer = useRef<number | null>(null);
  const decodeRun = useRef(0);
  const [decodePulse, setDecodePulse] = useState(0);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [effectReplay, setEffectReplay] = useState(0);
  const [cardEffectReplay, setCardEffectReplay] = useState(0);
  // Keep the recovered URL while comparing current and trial looks.
  const [avatarImageAttempt, setAvatarImageAttempt] = useState(0);
  const focusItem = focusItemId ? shopItemById.get(focusItemId) : undefined;
  const mode = previewModeForItem(focusItem);
  const ship = equippedCosmeticForSlot(equippedCosmetics, 'spaceship');
  const room = equippedCosmeticForSlot(equippedCosmetics, 'room');
  const robot = equippedCosmeticForSlot(equippedCosmetics, 'robot');
  const pet = equippedCosmeticForSlot(equippedCosmetics, 'pet');
  const card = equippedCosmeticForSlot(equippedCosmetics, 'card');
  const effect = equippedCosmeticForSlot(equippedCosmetics, 'effect');
  const focusLegacy = focusItem ? cosmeticById.get(focusItem.id) : undefined;
  const previewAsset = focusItem ? equipmentPreviewAssetPath(focusItem) : undefined;
  const scenePath = room ? roomSceneAssetPath(room.id) : undefined;
  const scene = scenePath ? new URL(scenePath, window.location.href).href : undefined;
  const sceneStyle = scene ? ({ '--showcase-scene': `url("${scene}")` } as CSSProperties) : undefined;

  const title = mode === 'ship' ? '我的飛船'
    : mode === 'robot' ? '我的機器夥伴'
    : mode === 'pet' ? '我的寵物'
      : mode === 'card' ? '我的收藏卡'
        : mode === 'effect' ? '我的冒險特效'
          : mode === 'world' ? '我的冒險基地'
            : `${learnerName}的新造型`;
  const instruction = focusItem
    ? `${previewing ? '正在試試' : '目前使用'}：${focusItem.name}`
    : previewNames.length ? `正在試穿：${previewNames.join('、')}` : '挑選喜歡的寶物，按「試穿看看」，這裡會顯示完整搭配。';

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !focusItemId || document.documentElement.dataset.motionEffects === 'false') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const run = ++decodeRun.current;
    let disposed = false;
    let settled = false;
    let frame = 0;
    const visibleImages = () => [...stage.querySelectorAll('img')].filter((image) => {
      const style = getComputedStyle(image);
      const rect = image.getBoundingClientRect();
      return (image.currentSrc || image.src)
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0;
    });
    const finish = () => {
      if (settled || disposed || run !== decodeRun.current || !stage.isConnected) return;
      settled = true;
      observer.disconnect();
      stage.removeEventListener('load', check, true);
      stage.removeEventListener('error', check, true);
      window.cancelAnimationFrame(frame);
      settleAnimation.current?.cancel();
      settleAnimation.current = stage.animate([
        { transform: 'translateY(4px)' },
        { transform: 'translateY(0)' },
      ], { duration: 220, easing: 'cubic-bezier(.2,.8,.25,1)' });
      setDecodePulse((value) => value + 1);
    };
    const focusIsMounted = () => {
      if (mode !== 'avatar') return true;
      const renderer = stage.querySelector<HTMLElement>('.avatar-renderer');
      if (!renderer?.dataset.renderedItems?.split(' ').includes(focusItemId)) return false;
      if (focusItem?.renderer === 'full-skin') return renderer.dataset.skin === focusItemId;
      const focusLayers = [...renderer.querySelectorAll<HTMLImageElement>('[data-wearable-item]')]
        .filter((image) => image.dataset.wearableItem === focusItemId);
      return focusLayers.length > 0 && focusLayers.every((image) => image.complete && image.naturalWidth > 0);
    };
    const check = () => {
      if (settled || disposed || run !== decodeRun.current || !stage.isConnected) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (!focusIsMounted()) return;
        const images = visibleImages();
        if (!images.length) return;
        if (images.some((image) => !image.complete)) return;
        if (images.some((image) => image.naturalWidth <= 0)) return;
        finish();
      });
    };
    const observer = new MutationObserver(check);
    observer.observe(stage, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'class', 'style'] });
    stage.addEventListener('load', check, true);
    stage.addEventListener('error', check, true);
    check();
    return () => {
      disposed = true;
      observer.disconnect();
      stage.removeEventListener('load', check, true);
      stage.removeEventListener('error', check, true);
      window.cancelAnimationFrame(frame);
      settleAnimation.current?.cancel();
    };
  }, [focusItemId, JSON.stringify(equippedCosmetics)]);

  useEffect(() => {
    if (confirmTimer.current !== null) { window.clearTimeout(confirmTimer.current); confirmTimer.current = null; }
    confirmAnimation.current?.cancel();
    if (!confirmationKey) { setConfirmationVisible(false); return; }
    setConfirmationVisible(true);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionDisabled = document.documentElement.dataset.motionEffects === 'false';
    const stage = stageRef.current;
    if (stage && mode !== 'avatar' && !motionDisabled && !reduced) {
      confirmAnimation.current = stage.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(1.018)', offset: .42 },
        { transform: 'scale(1)' },
      ], { duration: 480, easing: 'ease-out' });
    }
    // Reduced motion keeps the confirmation readable without leaving it on screen forever.
    confirmTimer.current = window.setTimeout(() => setConfirmationVisible(false), 560);
    return () => {
      if (confirmTimer.current !== null) { window.clearTimeout(confirmTimer.current); confirmTimer.current = null; }
      confirmAnimation.current?.cancel();
    };
  }, [confirmationKey, mode]);

  useEffect(() => () => {
    settleAnimation.current?.cancel(); confirmAnimation.current?.cancel(); if (confirmTimer.current !== null) window.clearTimeout(confirmTimer.current);
  }, []);

  return <section
    ref={stageRef}
    id={panelId}
    role={panelId ? 'tabpanel' : undefined}
    aria-labelledby={labelledBy}
    className={`v63-equipment-stage mode-${mode} ${focusItem ? 'has-focus-item' : ''}`}
    aria-label={`${learnerName}的${previewModeLabels[mode]}`}
    data-preview-mode={mode}
    data-preview-item={focusItem?.id ?? 'none'}
    data-room={room?.id ?? 'base'}
    data-effect={effect?.id ?? 'none'}
    style={sceneStyle}
  >
    <div className="v63-stage-backdrop" aria-hidden="true" />
    {decodePulse > 0 && <i key={`decode-${decodePulse}`} className="v64-preview-decode-ring" aria-hidden="true" />}
    <header className="v63-stage-heading">
      <span className={`v64-stage-mode ${confirmationVisible ? 'v64-shop-confirm-stamp' : ''}`.trim()} role={confirmationVisible ? 'status' : undefined}>{confirmationVisible ? '✓ 已更新收藏造型' : previewModeLabels[mode]}</span>
      <h2>{title}</h2>
      {mode !== 'avatar' && <p>{instruction}</p>}
    </header>

    {mode === 'ship' && focusItem && previewAsset && <div className="v63-hangar-stage">
      <div className="v63-hangar-orbit" aria-hidden="true" />
      <RetryablePreviewImage key={previewAsset} className="v63-ship-art" src={previewAsset} alt={`${focusItem.name}試乘預覽`}/>
      <div className="v63-pilot-avatar"><AvatarRenderer avatarId={avatarId} xp={xp} equippedCosmetics={equippedCosmetics} size={150}/><span>{learnerName}準備登艦</span></div>
    </div>}

    {mode === 'robot' && focusItem && previewAsset && <div className="v63-companion-stage">
      <div className="v65-robot-command-deck"><RetryablePreviewImage key={previewAsset} className="v63-robot-art" src={previewAsset} alt={`${focusItem.name}夥伴預覽`} robotItemId={focusItem.id}/><span className="v65-robot-command-label">AI 夥伴啟動</span></div>
      <div className="v63-companion-avatar"><AvatarRenderer avatarId={avatarId} xp={xp} equippedCosmetics={equippedCosmetics} size={118}/><span>{learnerName}的任務夥伴</span></div>
    </div>}

    {mode === 'card' && focusItem && previewAsset && <div className={`v63-card-viewer rarity-${focusLegacy?.rarity ?? 'common'}`}>
      <div className="v63-card-tilt" tabIndex={0} aria-label={`${focusItem.name} 卡片效果預覽`}>
        <RetryablePreviewImage key={previewAsset} className="v63-card-art" src={previewAsset} alt={`${focusItem.name}收藏卡預覽`}/>
        <div className="v63-card-copy"><span>{cardRarityLabels[focusLegacy?.rarity ?? 'common']}</span><strong>{focusItem.name}</strong></div>
        {cardEffectReplay > 0 && <i key={`card-sheen-${cardEffectReplay}`} className="v64-card-touch-sheen" aria-hidden="true" />}
      </div>
      <button type="button" className="v64-card-effect-replay" onClick={() => setCardEffectReplay((value) => value + 1)}>看看效果</button>
    </div>}

    {mode === 'pet' && <div className="v653-pet-stage">
      <PetCompanion key={pet?.id ?? focusItem?.id} itemId={pet?.id ?? focusItem?.id ?? ''} learnerName={learnerName} preview/>
      <div className="v653-pet-learner"><AvatarRenderer avatarId={avatarId} xp={xp} equippedCosmetics={equippedCosmetics} size={112}/><span>{learnerName}的冒險寵物</span></div>
    </div>}

    {mode === 'effect' && <div className={`v63-effect-stage effect-${effect?.id ?? focusItem?.id ?? 'stars'}`}>
      <div className={`v63-effect-aura effect-${effect?.id ?? focusItem?.id ?? 'stars'}`} aria-hidden="true">{Array.from({length:12},(_,index)=><i key={index}/>)}</div>
      <AvatarRenderer avatarId={avatarId} xp={xp} equippedCosmetics={equippedCosmetics} size={310} effectPreview effectReplay={effectReplay}/>
      <button type="button" className="v63-effect-replay" onClick={() => setEffectReplay((value) => value + 1)}>再看一次特效</button>
    </div>}

    {(mode === 'avatar' || mode === 'world') && <div className="v63-avatar-stage">
      <RetryableAvatarPreview key={JSON.stringify([avatarId, equippedCosmetics])} avatarId={avatarId} xp={xp} equippedCosmetics={equippedCosmetics} attempt={avatarImageAttempt} onRetry={() => setAvatarImageAttempt(value => value + 1)}/>
      {mode === 'avatar' && <span className="v63-avatar-platform" aria-hidden="true" />}
    </div>}

    {mode === 'avatar' && <p className="v63-avatar-instruction">{instruction}</p>}

    <div className="v63-stage-status" aria-label="目前收藏預覽狀態">
      <span className={ship ? 'active' : ''}>飛船</span>
      <span className={room ? 'active' : ''}>基地</span>
      <span className={robot ? 'active' : ''}>夥伴</span>
      <span className={pet ? 'active' : ''}>寵物</span>
      <span className={card ? 'active' : ''}>卡面</span>
      <span className={effect ? 'active' : ''}>特效</span>
    </div>
  </section>;
}
