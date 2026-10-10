import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type SyntheticEvent } from 'react';
import { avatarAccessoryLayerSet } from '../avatarAssetRegistry';
import { shopItemById, shopItemCanRender } from '../avatarShop';
import { avatarStageFromXp, avatarStageName, levelFromXp } from '../rewards';
import { composedWardrobeLookAssetPath, wardrobeBaseAssetPath } from './AvatarWardrobe';
import AdventureEffect from './AdventureEffect';
import { selectExactAvatarHero } from '../avatarHeroAssets';
import { useAvatarDisplayPath } from '../useAvatarDisplayPath';
import { decodeAvatarImage, useAvatarDetailReadiness } from '../useAvatarDetailReadiness';
import { useAvatarRigFrame } from '../useAvatarRigFrame';
import { AVATAR_SUPPORTED_TOP_PADDING } from '../avatarCanvasGeometry';
import { avatarBodyOffsetY } from '../avatarBodyAlignment';
import { useCharacterBlink } from '../useCharacterBlink';
import { loadAvatarMaskResource } from '../avatarMaskResource';

export const avatarOptions = [
  { id: 'brother', name: '哥哥探險家', short: '哥哥', colors: ['#2450d8', '#39c6e3', '#ffd166'] },
  { id: 'younger', name: '弟弟探險家', short: '弟弟', colors: ['#16a34a', '#14532d', '#bef264'] },
  { id: 'sister', name: '姐姐探險家', short: '姐姐', colors: ['#5b4cc7', '#55bde8', '#ffc85a'] },
  { id: 'younger-sister', name: '妹妹探險家', short: '妹妹', colors: ['#1fa884', '#70d8c1', '#f6a7c6'] },
] as const;

const legacyMap: Record<string, string> = {
  '🚀': 'brother', '🦖': 'younger', '🦈': 'younger', '🤖': 'brother', '🛸': 'brother',
  '🐯': 'brother', '🦁': 'brother', '🚗': 'brother', '🌟': 'brother', '⚡': 'brother',
  nova: 'brother', thunder: 'brother', titan: 'brother', turbo: 'brother', rex: 'younger', aqua: 'younger',
  luna: 'sister', stella: 'sister', mint: 'younger-sister', blossom: 'younger-sister',
};

export function normalizeAvatarId(value?: string) {
  if (!value) return 'brother';
  if (avatarOptions.some((option) => option.id === value)) return value;
  return legacyMap[value] ?? 'brother';
}

export function avatarName(value?: string) {
  const id = normalizeAvatarId(value);
  return avatarOptions.find((option) => option.id === id)?.name ?? '哥哥探險家';
}

export function avatarStageAssetPath(value: string | undefined, stage: number, thumbnail = true) {
  const id = normalizeAvatarId(value);
  const imageExtension = id === 'sister' || id === 'younger-sister' ? 'png' : 'webp';
  return `${import.meta.env.BASE_URL}assets/v5/characters/${id}/stage-${stage}${thumbnail ? '-thumb' : ''}.${imageExtension}`;
}

function SafeWearableLayer({ itemId, src, className, eager, visible = true, style, onReady, onFailure, onDecoded, expectedHeight }: { itemId: string; src: string; className: string; eager: boolean; visible?: boolean; style?: CSSProperties; onReady?: () => void; onFailure?: () => void; onDecoded?: (image: HTMLImageElement) => void; expectedHeight?: number }) {
  const [failed, setFailed] = useState(false);
  const callbacks = useRef({ onDecoded, onFailure, onReady });
  callbacks.current = { onDecoded, onFailure, onReady };
  const fail = () => { setFailed(true); callbacks.current.onFailure?.(); };
  const loaded = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (expectedHeight !== undefined && (image.naturalWidth !== 1024 || image.naturalHeight !== expectedHeight)) { fail(); return; }
    if (!callbacks.current.onDecoded && !callbacks.current.onReady) return;
    const source = image.src;
    const current = () => image.isConnected && image.src === source;
    void decodeAvatarImage(image, current).then(() => {
      if (current()) { callbacks.current.onReady?.(); callbacks.current.onDecoded?.(image); }
    }, () => { if (current()) fail(); });
  };
  if (failed) return null;
  return <img data-wearable-item={itemId} className={className} style={visible ? style : { ...style, visibility: 'hidden' }} src={src} alt="" aria-hidden="true" loading={eager ? 'eager' : 'lazy'} decoding="async" onLoad={loaded} onError={fail} />;
}

export default function AvatarRenderer({
  avatarId,
  xp = 0,
  size = 82,
  showStage = false,
  equippedCosmetics = [],
  className = '',
  stageOverride,
  eager = false,
  heroPreview = false,
  greet = false,
  effectPreview = false,
  effectReplay = 0,
  onSkinError,
  onWearableError,
  imageRetry = 0,
}: {
  avatarId?: string;
  xp?: number;
  size?: number;
  showStage?: boolean;
  equippedCosmetics?: string[];
  className?: string;
  stageOverride?: number;
  eager?: boolean;
  heroPreview?: boolean;
  greet?: boolean;
  effectPreview?: boolean;
  effectReplay?: number;
  onSkinError?: () => void;
  onWearableError?: () => void;
  imageRetry?: number;
}) {
  const [hoverReplay, setHoverReplay] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const characterImage = useRef<HTMLImageElement>(null);
  const id = normalizeAvatarId(avatarId);
  const option = avatarOptions.find((item) => item.id === id) ?? avatarOptions[0];
  const stage = stageOverride ?? avatarStageFromXp(xp);
  const level = levelFromXp(xp);
  const [primary, secondary, accent] = option.colors;
  const style = {
    '--avatar-primary': primary,
    '--avatar-secondary': secondary,
    '--avatar-accent': accent,
    '--avatar-default-size': `${size}px`,
    width: 'var(--avatar-renderer-size, var(--avatar-default-size))',
    height: 'var(--avatar-renderer-size, var(--avatar-default-size))',
  } as CSSProperties;

  const equippedItems = equippedCosmetics
    .map((itemId) => shopItemById.get(itemId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const skin = equippedItems.find((item) => item.kind === 'skin' && shopItemCanRender(item, id));
  const effect = equippedItems.find((item) => item.renderer === 'standard-effect' && shopItemCanRender(item, id));
  const activeOcclusions = new Set(equippedItems.flatMap((item) => item.occludes ?? []));
  const wearableItems = stageOverride
    ? []
    : equippedItems
      .filter((item) => (item.renderer === 'aligned-overlay' || item.renderer === 'split-overlay') && shopItemCanRender(item, id))
      .filter((item) => !item.visualSlot || !activeOcclusions.has(item.visualSlot))
      .sort((a, b) => (a.zLayer ?? 50) - (b.zLayer ?? 50));
  const wearableLayers = wearableItems.flatMap((item) => {
    const layers = avatarAccessoryLayerSet(item.id, id, skin?.id, wearableItems.find(wearable => wearable.visualSlot === 'headwear')?.id, wearableItems.find(wearable => wearable.visualSlot === 'hair')?.id);
    const retryPath = (path: string | undefined) => path && imageRetry
      ? `${path}${path.includes('?') ? '&' : '?'}previewRetry=${imageRetry}` : path;
    return layers ? [{ item, layers: { ...layers, overlay: retryPath(layers.overlay), back: retryPath(layers.back), front: retryPath(layers.front),
      ...(layers.defaultSkinDetail ? { defaultSkinDetail: { ...layers.defaultSkinDetail,
        overlay: retryPath(layers.defaultSkinDetail.overlay)!,
        hairVisibilityMask: retryPath(layers.defaultSkinDetail.hairVisibilityMask),
        underHeadwearVisibilityMask: retryPath(layers.defaultSkinDetail.underHeadwearVisibilityMask),
      } } : {}),
    } }] : [];
  });
  const fullSkin = skin?.renderer === 'full-skin' ? composedWardrobeLookAssetPath(id, skin.id) : undefined;
  // Current avatars always use the fixed 1024×1536 wardrobe contract. Legacy
  // stage art is rendered only when an explicit evolution-preview stage is requested.
  const baseSkinSrc = wardrobeBaseAssetPath(id);
  const requestedFullSkin = fullSkin && imageRetry ? `${fullSkin}${fullSkin.includes('?') ? '&' : '?'}previewRetry=${imageRetry}` : fullSkin;
  const [failedDetailSkinPath, setFailedDetailSkinPath] = useState<string>();
  const runtimeImageSrc = requestedFullSkin ?? (stageOverride ? avatarStageAssetPath(id, stage, true) : baseSkinSrc);
  const [failedHeroPath, setFailedHeroPath] = useState<string>();
  const candidateHero = heroPreview && stageOverride === undefined ? selectExactAvatarHero(id, equippedCosmetics) : undefined;
  const hero = candidateHero?.path !== failedHeroPath ? candidateHero : undefined;
  const details = wearableLayers.flatMap(({ item, layers }) => layers.defaultSkinDetail && !hero
    && (!requestedFullSkin || requestedFullSkin !== failedDetailSkinPath)
    ? [{ itemId: item.id, ...layers.defaultSkinDetail }] : []);
  const detailReadiness = useAvatarDetailReadiness(details);
  // Keep the runtime body scale and foot anchor stable when equipment changes.
  // Each overlay still uses its own native 0/256 canvas inside this shared frame.
  // Evolution previews and accepted whole-look Hero art keep their own contract.
  const readyDetails = details.filter(detail => detailReadiness.ready.has(detail.itemId));
  const reserveRuntimeHeadroom = stageOverride === undefined && !hero;
  const rigFrame = useAvatarRigFrame(container, reserveRuntimeHeadroom ? AVATAR_SUPPORTED_TOP_PADDING : 0);
  // The frame and extended detail activate atomically. Missing geometry retains
  // the ordinary 1024×1536 overlay and the exact legacy DOM geometry.
  const candidateDetails = readyDetails.filter(detail => !detail.canvasTopPadding || rigFrame);
  const detailByItem = new Map(details.map(detail => [detail.itemId, detail]));
  const detailKey = (detail: typeof details[number]) => JSON.stringify([id, requestedFullSkin, detail]);
  const [mountedDetails, setMountedDetails] = useState<Record<string, HTMLImageElement>>({});
  const [mountedAligned, setMountedAligned] = useState<Record<string, HTMLImageElement>>({});
  const alignedKey = (itemId: string, path: string) => `${id}:${itemId}:aligned:${path}`;
  const hasCoveredLayer = wearableLayers.some(({ item, layers }) =>
    item.visualSlot === 'hair' || (item.visualSlot === 'earwear' && (layers.renderer === 'split-overlay' || !layers.foreground)));
  const hasFacewear = wearableLayers.some(({ item }) => item.visualSlot === 'face');
  const hatDetail = candidateDetails.find(detail => detail.underHeadwearVisibilityMask);
  const underHeadwearMaskPath = hasCoveredLayer && hatDetail?.underHeadwearVisibilityMask;
  const maskPadding = hatDetail?.canvasTopPadding ?? 0;
  const maskKey = underHeadwearMaskPath ? `${underHeadwearMaskPath}:${maskPadding}` : '';
  const [decodedHeadwearMask, setDecodedHeadwearMask] = useState<{ key: string; url: string; signal?: AbortSignal }>({ key: '', url: '' });
  const headwearMaskUrl = decodedHeadwearMask.key === maskKey && decodedHeadwearMask.signal
    && !decodedHeadwearMask.signal.aborted ? decodedHeadwearMask.url : '';
  const wearableError = useRef(onWearableError);
  wearableError.current = onWearableError;
  const missingEarwear = wearableItems.filter(item => item.visualSlot === 'earwear'
    && !wearableLayers.some(layer => layer.item.id === item.id)).map(item => item.id);
  const missingEarwearKey = JSON.stringify([id, skin?.id, wearableItems.find(item => item.visualSlot === 'hair')?.id, imageRetry, missingEarwear]);
  useEffect(() => {
    const missing = (JSON.parse(missingEarwearKey) as [string, string | null, string | null, number, string[]])[4];
    if (missing.length) wearableError.current?.();
  }, [missingEarwearKey]);
  const failedDetailsKey = JSON.stringify([...detailReadiness.failed]);
  useEffect(() => {
    if ((JSON.parse(failedDetailsKey) as string[]).length) wearableError.current?.();
  }, [failedDetailsKey]);
  useEffect(() => {
    setDecodedHeadwearMask({ key: '', url: '' });
    if (!underHeadwearMaskPath) return;
    let cancelled = false;
    const controller = new AbortController();
    let resource: { release: () => void } | undefined;
    const fail = () => {
      if (!cancelled) { setDecodedHeadwearMask({ key: '', url: '' }); wearableError.current?.(); }
    };
    void loadAvatarMaskResource(underHeadwearMaskPath, controller.signal, { width: 1024, height: 1536 + maskPadding })
      .then(loaded => {
        if (cancelled) { loaded.release(); return; }
        resource = loaded;
        setDecodedHeadwearMask({ key: maskKey, url: loaded.url, signal: controller.signal });
      }, fail);
    return () => { cancelled = true; controller.abort(); resource?.release(); };
  }, [underHeadwearMaskPath, maskPadding, maskKey]);
  // A detached preload probe cannot promise that the mounted layer has decoded.
  // Gate the overlay and both kinds of masks in this same React render. A URL
  // revisited after unmount must decode its new element, not reuse stale readiness.
  const activeDetails = candidateDetails.filter(detail => mountedDetails[detailKey(detail)]?.isConnected
    && (detail !== hatDetail || !underHeadwearMaskPath || Boolean(headwearMaskUrl)));
  const activeDetail = activeDetails.at(-1);
  const activeDetailIds = new Set(activeDetails.map(detail => detail.itemId));
  const canvasTopPadding = Math.max(0, ...activeDetails.map(detail => detail.canvasTopPadding ?? 0),
    ...wearableLayers.map(({ layers }) => layers.canvasTopPadding ?? 0));
  const bodyOffsetY = requestedFullSkin !== failedDetailSkinPath ? avatarBodyOffsetY(fullSkin) : 0;
  const activeRigFrame = reserveRuntimeHeadroom && rigFrame ? {
    ...rigFrame,
    bodyTop: rigFrame.bodyTop + bodyOffsetY * rigFrame.scale,
    sceneTop: rigFrame.sceneTop + bodyOffsetY * rigFrame.scale,
  } : undefined;
  const bodyFrameStyle: CSSProperties | undefined = activeRigFrame ? {
    inset: 'auto', left: activeRigFrame.bodyLeft, top: activeRigFrame.bodyTop,
    width: activeRigFrame.bodyWidth, height: activeRigFrame.bodyHeight,
  } : undefined;
  const detailFrameStyle = (padding: number): CSSProperties | undefined => activeRigFrame ? {
    inset: 'auto', left: activeRigFrame.bodyLeft,
    top: activeRigFrame.bodyTop - padding * activeRigFrame.scale,
    width: activeRigFrame.bodyWidth, height: activeRigFrame.bodyHeight + padding * activeRigFrame.scale,
  } : undefined;
  const underHeadwearLayerMask = (padding: number): CSSProperties | undefined =>
    hatDetail && activeDetailIds.has(hatDetail.itemId) && headwearMaskUrl ? {
      maskImage: `url("${headwearMaskUrl}")`, maskMode: 'luminance', maskRepeat: 'no-repeat',
      maskPosition: 'center bottom',
      maskSize: activeRigFrame ? `100% ${(1536 + maskPadding) / (1536 + padding) * 100}%` : 'contain',
    } : undefined;
  const rendererStyle = activeRigFrame ? {
    ...style,
    '--avatar-rig-body-left': `${activeRigFrame.bodyLeft}px`,
    '--avatar-rig-body-top': `${activeRigFrame.bodyTop}px`,
    '--avatar-rig-body-width': `${activeRigFrame.bodyWidth}px`,
    '--avatar-rig-body-height': `${activeRigFrame.bodyHeight}px`,
    '--avatar-rig-scene-left': `${activeRigFrame.sceneLeft}px`,
    '--avatar-rig-scene-top': `${activeRigFrame.sceneTop}px`,
    '--avatar-rig-scene-width': `${activeRigFrame.sceneWidth}px`,
    '--avatar-rig-scene-height': `${activeRigFrame.sceneHeight}px`,
  } as CSSProperties : style;
  const bodyMasks = [...new Set(activeDetails.flatMap(detail => {
    const mask = detail.hairVisibilityMask && detailReadiness.maskUrl(detail.hairVisibilityMask);
    return mask ? [mask] : [];
  }))];
  const hairMaskStyle: CSSProperties | undefined = bodyMasks.length ? {
    maskImage: `url("${bodyMasks.at(-1)}")`, maskMode: 'luminance',
    maskSize: 'contain', maskPosition: 'center', maskRepeat: 'no-repeat', filter: 'none',
  } : undefined;
  const nestedBodyMasks = bodyMasks.length > 1;
  const innerBodyFrame: CSSProperties = { inset: 0, left: 0, top: 0, width: '100%', height: '100%' };
  const bodyImageFrameStyle = nestedBodyMasks ? innerBodyFrame : bodyFrameStyle;
  // WebKit can clear a body when multiple luminance masks are intersected on
  // one element. Nested single masks preserve the same intersection and bytes.
  // Only the outer wrapper owns the rig frame; inner images fill that frame.
  const maskBody = (image: ReactNode, kind = 'body') => bodyMasks.slice(0, -1).reduceRight<ReactNode>((child, mask, index) => (
    <span key={`${kind}-mask-${index}`} className="avatar-body-mask-wrapper"
      style={{ position: 'absolute', display: 'block', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 2, ...(index === 0 ? bodyFrameStyle : innerBodyFrame),
        maskImage: `url("${mask}")`, maskMode: 'luminance', maskRepeat: 'no-repeat', maskSize: 'contain', maskPosition: 'center' }}>
      {child}
    </span>
  ), image);
  // Body-hair masks describe the original silhouette, not the newly selected
  // haircut. Applying them to that haircut cuts holes through valid artwork.
  // A separately reviewed hat-brim mask hides hair and ordinary headphone bands above closed hats.
  // Open crowns omit that mask and retain hair above the band.
  const useDisplay = !fullSkin && stageOverride === undefined && !hero;
  const display = useAvatarDisplayPath(id, container, useDisplay, baseSkinSrc);
  const imageSrc = hero ? `${import.meta.env.BASE_URL}${hero.path}` : useDisplay ? display.path : runtimeImageSrc;
  const bodyMountKey = JSON.stringify([imageSrc, nestedBodyMasks]);
  const [decodedBody, setDecodedBody] = useState<{ key: string; image: HTMLImageElement }>();
  const bodyIsReady = Boolean(imageSrc && decodedBody?.key === bodyMountKey
    && decodedBody.image === characterImage.current && decodedBody.image.isConnected);
  // Image.decode() does not finish the separate CSS-mask paint. Keep the full
  // body visible while the mounted masked layer gets its first paint, then
  // reveal the matching accessories and masked body in one frame.
  const maskPaintKey = bodyMasks.length || underHeadwearMaskPath
    ? JSON.stringify([imageSrc, bodyIsReady, bodyMasks, headwearMaskUrl]) : '';
  const [paintedMaskKey, setPaintedMaskKey] = useState('');
  const masksPainted = !maskPaintKey || paintedMaskKey === maskPaintKey;
  useLayoutEffect(() => {
    if (!maskPaintKey) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setPaintedMaskKey(maskPaintKey));
    });
    return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, [maskPaintKey]);
  // Full-skin outfits stay static: legacy blink frames contain the entire old
  // outfit, so swapping them would replace the newly equipped appearance.
  const blink = useCharacterBlink(characterImage, imageSrc, id, skin?.id ?? 'default', (greet || heroPreview) && stageOverride === undefined && !hero && !fullSkin, bodyMountKey);
  const [decodedBlinkFrame, setDecodedBlinkFrame] = useState<{ frame: string; image: HTMLImageElement }>();
  const showBlink = !!blink.frame && decodedBlinkFrame?.frame === blink.frame
    && decodedBlinkFrame.image.isConnected && blink.src !== imageSrc;
  // A haircut requiring its own base-hair mask appears only after both images
  // decode. Pending/failed delivery leaves the original hairstyle intact.
  const isWearableVisible = (item: { id: string }) => {
    if (!bodyIsReady) return false;
    if (hero) return true;
    if (detailByItem.has(item.id)) return masksPainted && activeDetailIds.has(item.id);
    const layer = wearableLayers.find(entry => entry.item.id === item.id)?.layers;
    return layer?.renderer !== 'aligned-overlay' || Boolean(layer.overlay
      && mountedAligned[alignedKey(item.id, layer.overlay)]?.isConnected);
  };
  const visibleLayers = hero ? [] : wearableLayers;
  const [splitLayerReady, setSplitLayerReady] = useState<Record<string, boolean>>({});
  const splitPathsKey = JSON.stringify(visibleLayers.filter(({ layers }) => layers.renderer === 'split-overlay').flatMap(({ layers }) => [layers.back, layers.front]));
  useEffect(() => {
    const activePaths = new Set(JSON.parse(splitPathsKey) as string[]);
    setSplitLayerReady(current => Object.keys(current).every(path => activePaths.has(path)) ? current
      : Object.fromEntries(Object.entries(current).filter(([path]) => activePaths.has(path))));
  }, [splitPathsKey]);
  const markSplitLayer = (path: string, ready: boolean) => setSplitLayerReady(current => current[path] === ready ? current : { ...current, [path]: ready });
  // A split accessory is one object: its body and straps must appear together.
  // Observe the existing lazy images; do not preload every equipped asset.
  const splitReady = (back?: string, front?: string, padding = 0) => Boolean(bodyIsReady && masksPainted && (!padding || activeRigFrame) && back && front && splitLayerReady[back] && splitLayerReady[front]);
  const equipmentNames = equippedItems.map((item) => item.name);
  const restoreBaseSkin = (event: SyntheticEvent<HTMLImageElement>) => {
    if (blink.recoverBlink()) return;
    // A failed Hero must restore the complete runtime look, including layers.
    if (hero) { setFailedHeroPath(hero.path); return; }
    // A shop trial must report a missing outfit instead of showing ordinary clothes.
    if (fullSkin) {
      // A skin-specific hair mask must never remain on the fallback base body.
      setFailedDetailSkinPath(requestedFullSkin);
      event.currentTarget.style.maskImage = 'none';
      if (onSkinError) { onSkinError(); return; }
    }
    if (useDisplay && display.path && display.path !== baseSkinSrc) { display.invalidate(); return; }
    if (event.currentTarget.dataset.fallbackApplied === 'true') return;
    event.currentTarget.dataset.fallbackApplied = 'true';
    event.currentTarget.src = baseSkinSrc;
  };
  const renderedIds = [bodyIsReady && requestedFullSkin !== failedDetailSkinPath ? skin?.id : undefined, ...wearableLayers.filter(({ item, layers }) => isWearableVisible(item) && (hero || layers.renderer !== 'split-overlay' || splitReady(layers.back, layers.front, layers.canvasTopPadding))).map(({ item }) => item.id), effect?.id].filter(Boolean);

  return (
    <div
      ref={container}
      className={`avatar-renderer avatar-photo-hero avatar-${id} stage-${stage} ${fullSkin ? 'skin-active' : 'skin-default'} ${activeRigFrame ? 'avatar-headroom-active' : ''} ${className}`.trim()}
      style={rendererStyle}
      title={`${option.name} · Level ${level} · ${avatarStageName(xp)}`}
      onPointerEnter={() => { if (effect) setHoverReplay(value => value + 1); }}
      data-stage={stage}
      data-skin={skin?.id ?? 'default'}
      data-cosmetics={equippedCosmetics.join(' ')}
      data-rendered-items={renderedIds.join(' ')}
      data-art-mode={hero ? 'accepted-hero' : 'runtime'}
      data-runtime-detail={activeDetail?.itemId}
      data-runtime-details={activeDetails.map(detail => detail.itemId).join(' ') || undefined}
      data-mask-paint={masksPainted ? 'ready' : 'preparing'}
      data-body-ready={bodyIsReady ? 'true' : 'false'}
      data-mask-sources={[...new Set(activeDetails.flatMap(detail => detail.hairVisibilityMask ? [detail.hairVisibilityMask] : [])),
        ...(headwearMaskUrl && underHeadwearMaskPath ? [underHeadwearMaskPath] : [])].join(' ') || undefined}
      data-canvas-top-padding={activeRigFrame ? canvasTopPadding : undefined}
      data-rig-top-padding={activeRigFrame ? AVATAR_SUPPORTED_TOP_PADDING : undefined}
      data-rig-scene={activeRigFrame ? 'extended-detail' : undefined}
    >
      {visibleLayers.map(({ item, layers }) => layers.renderer === 'split-overlay' && layers.back ? (
        <SafeWearableLayer key={`${item.id}:back:${layers.back}`} itemId={item.id} className={`avatar-wearable-layer avatar-wearable-back${activeRigFrame ? layers.canvasTopPadding ? ' avatar-rig-extended-layer' : ' avatar-rig-body-layer' : ''}`} style={{ ...detailFrameStyle(layers.canvasTopPadding ?? 0), ...(item.visualSlot === 'earwear' ? underHeadwearLayerMask(layers.canvasTopPadding ?? 0) : {}) }} src={layers.back} eager={eager} visible={splitReady(layers.back, layers.front, layers.canvasTopPadding)} expectedHeight={layers.canvasTopPadding !== undefined ? 1536 + layers.canvasTopPadding : undefined} onReady={() => markSplitLayer(layers.back!, true)} onFailure={() => { markSplitLayer(layers.back!, false); onWearableError?.(); }} />
      ) : null)}
      {imageSrc && maskBody(<img
        key={bodyMountKey}
        ref={characterImage}
        className={`avatar-renderer-skin${hairMaskStyle ? ' avatar-hair-mask-active' : ''}${activeRigFrame ? ' avatar-rig-body-layer' : ''}`}
        style={showBlink ? { ...bodyImageFrameStyle, ...hairMaskStyle, visibility: 'hidden' } : { ...bodyImageFrameStyle, ...hairMaskStyle }}
        src={imageSrc}
        alt={`${option.name}，${avatarStageName(xp)}`}
        loading={eager ? 'eager' : 'lazy'}
        decoding={blink.decoding}
        onLoad={event => {
          const image = event.currentTarget;
          const sourceKey = bodyMountKey;
          void decodeAvatarImage(image, () => image.isConnected && image === characterImage.current).then(() => {
            setDecodedBody({ key: sourceKey, image });
          }, () => { if (image === characterImage.current) onSkinError?.(); });
          if (requestedFullSkin && event.currentTarget === characterImage.current
            && event.currentTarget.getAttribute('src') === requestedFullSkin) {
            setFailedDetailSkinPath(previous => previous === requestedFullSkin ? undefined : previous);
          }
        }}
        onError={restoreBaseSkin}
      />)}
      {imageSrc && !masksPainted && <img
        className={`avatar-renderer-mask-fallback${activeRigFrame ? ' avatar-rig-body-layer' : ''}`}
        src={imageSrc} alt="" aria-hidden="true" decoding="sync"
        style={{ position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%', objectFit: 'contain',
          pointerEvents: 'none', zIndex: 2, ...bodyFrameStyle }}
      />}
      {blink.frame && maskBody(<img
        key={blink.frame}
        className={`avatar-renderer-blink-frame${hairMaskStyle ? ' avatar-hair-mask-active' : ''}${activeRigFrame ? ' avatar-rig-body-layer' : ''}`}
        src={blink.frame}
        style={{ ...bodyImageFrameStyle, ...hairMaskStyle, visibility: showBlink ? 'visible' : 'hidden' }}
        alt=""
        aria-hidden="true"
        data-character-motion={showBlink ? 'blink' : undefined}
        decoding="sync"
        onLoad={event => {
          const element = event.currentTarget;
          const frame = blink.frame;
          void element.decode().then(() => {
            if (frame && element.isConnected) setDecodedBlinkFrame({ frame, image: element });
          }, () => { if (element.isConnected) blink.disableFrame(); });
        }}
        onError={blink.disableFrame}
      />, 'blink')}
      {visibleLayers.map(({ item, layers }) => {
        if (layers.renderer !== 'aligned-overlay' || !layers.overlay) return null;
        const detail = detailByItem.get(item.id);
        const padding = detail?.canvasTopPadding ?? 0;
        const simpleKey = alignedKey(item.id, layers.overlay);
        return <SafeWearableLayer key={detail ? detailKey(detail) : simpleKey} itemId={item.id}
          className={`avatar-wearable-layer ${layers.foreground ? 'avatar-wearable-front' : 'avatar-wearable-aligned'} slot-${item.equipmentSlot}${activeRigFrame ? padding ? ' avatar-rig-extended-layer' : ' avatar-rig-body-layer' : ''}`}
          style={{ ...(detail ? detailFrameStyle(padding) : bodyFrameStyle),
            // Closed brims sit in front of glasses' high temples. Native split
            // fronts are drawn later at this same depth and keep earcups outside.
            ...(item.visualSlot === 'headwear' && detail?.underHeadwearVisibilityMask && hasFacewear ? { zIndex: 4 } : {}),
            ...((item.visualSlot === 'hair' || (item.visualSlot === 'earwear' && !layers.foreground)) && hatDetail && activeDetailIds.has(hatDetail.itemId) && headwearMaskUrl ? {
              maskImage: `url("${headwearMaskUrl}")`, maskMode: 'luminance', maskRepeat: 'no-repeat',
              maskPosition: 'center bottom',
              // Both masks and overlays keep their native 0/256 padding; align their body origins.
              maskSize: activeRigFrame ? `100% ${(1536 + maskPadding) / (1536 + padding) * 100}%` : 'contain',
            } as CSSProperties : {}),
          }}
          // Detail probes already load these assets. The hidden mounted image
          // must decode even when a compact Home avatar uses ordinary lazy layers.
          src={detail?.overlay ?? layers.overlay} eager={eager || Boolean(detail)}
          visible={isWearableVisible(item)}
          onDecoded={detail ? image => setMountedDetails(current => current[detailKey(detail)] === image ? current
            : { ...Object.fromEntries(Object.entries(current).filter(([, element]) => element.isConnected)), [detailKey(detail)]: image })
            : image => setMountedAligned(current => current[simpleKey] === image ? current
              : { ...Object.fromEntries(Object.entries(current).filter(([, element]) => element.isConnected)), [simpleKey]: image })}
          onFailure={detail ? () => detailReadiness.invalidate(item.id) : () => {
            setMountedAligned(current => Object.fromEntries(Object.entries(current).filter(([key]) => key !== simpleKey)));
            onWearableError?.();
          }} />;
      })}
      {visibleLayers.map(({ item, layers }) => layers.renderer === 'split-overlay' && layers.front ? (
        <SafeWearableLayer key={`${item.id}:front:${layers.front}`} itemId={item.id} className={`avatar-wearable-layer avatar-wearable-front${activeRigFrame ? layers.canvasTopPadding ? ' avatar-rig-extended-layer' : ' avatar-rig-body-layer' : ''}`} style={detailFrameStyle(layers.canvasTopPadding ?? 0)} src={layers.front} eager={eager} visible={splitReady(layers.back, layers.front, layers.canvasTopPadding)} expectedHeight={layers.canvasTopPadding !== undefined ? 1536 + layers.canvasTopPadding : undefined} onReady={() => markSplitLayer(layers.front!, true)} onFailure={() => { markSplitLayer(layers.front!, false); onWearableError?.(); }} />
      ) : null)}
      {effect && <AdventureEffect key={effect.id} itemId={effect.id} replay={effectReplay + hoverReplay} preview={effectPreview} />}
      {showStage && <span className="avatar-stage-label">Stage {stage}/4 · {avatarStageName(xp)}</span>}
      {showStage && equipmentNames.length > 0 && <span className="avatar-cosmetic-summary" aria-label={`已裝備：${equipmentNames.join('、')}`}>{equipmentNames.length} 件裝備</span>}
    </div>
  );
}
