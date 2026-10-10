import { useEffect, useRef, useState } from 'react';
import { useWorldDisplayPath } from '../useWorldDisplayPath';
import { reviewedWorldAssetPath } from '../worldArtAssets';

// One shared raster effect for preview and equipped avatars. Never writes equipment.
export default function AdventureEffect({ itemId, replay = 0, preview = false }: {
  itemId: string; replay?: number; preview?: boolean;
}) {
  const image = useRef<HTMLImageElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const full = reviewedWorldAssetPath(itemId, 'effect') ?? `${import.meta.env.BASE_URL}assets/v6.3/world/effects/${itemId}.webp`;
  const preferred = useWorldDisplayPath(itemId, 'effect', image, 'contain', preview) ?? full;
  const [failedDisplay, setFailedDisplay] = useState<string>();
  // Keep a valid fallback src while an offscreen avatar has not been measured
  // yet. Native lazy loading prevents an unnecessary full-size request, and
  // the measured display derivative replaces it before the image is visible.
  const source = !preferred || preferred === failedDisplay ? full : preferred;
  const src = attempt ? `${source}?previewRetry=${attempt}` : source;

  useEffect(() => {
    const node = image.current;
    if (!node || !loaded || failed) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animation: Animation | undefined;
    let visible = false;
    let played = false;
    const motionDisabled = () => media.matches || document.documentElement.dataset.motionEffects === 'false';
    const resting = () => { node.style.opacity = preview || motionDisabled() ? '0.85' : '0'; };
    const cancel = () => { animation?.cancel(); animation = undefined; resting(); };
    const play = () => {
      if (!visible || document.hidden || played || motionDisabled()) return;
      played = true;
      animation = node.animate([
        { opacity: 0, transform: 'translateY(6px) scale(.96)' },
        { opacity: .95, transform: 'translateY(0) scale(1)', offset: .25 },
        { opacity: .8, transform: 'translateY(-3px) scale(1.015)', offset: .7 },
        { opacity: preview ? .85 : 0, transform: 'translateY(0) scale(1)' },
      ], { duration: 1000, easing: 'ease-out' });
      animation.onfinish = resting;
    };
    const preference = () => { cancel(); if (motionDisabled()) played = true; };
    const visibility = () => { if (document.hidden) cancel(); else play(); };
    resting();
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) play(); else cancel();
    }, { threshold: .15 });
    observer.observe(node);
    media.addEventListener('change', preference);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); media.removeEventListener('change', preference); document.removeEventListener('visibilitychange', visibility); animation?.cancel(); };
  }, [loaded, failed, preview, replay, src]);

  if (failed) return preview ? <div className="v64-preview-load-error" role="status">
    <strong>特效圖片暫時無法載入</strong>
    <span className="v64-preview-error-copy">可以再試一次，或先看看其他寶物。</span>
    <button type="button" onClick={() => { setLoaded(false); setAttempt(value => value + 1); setFailed(false); }}>重新載入圖片</button>
  </div> : null;
  return <img ref={image} className="v64-effect-art" data-effect-item={itemId}
    src={src || undefined} alt="" aria-hidden="true" loading={preview ? 'eager' : 'lazy'} fetchPriority={preview ? 'auto' : 'low'} decoding="async"
    onLoad={() => setLoaded(true)} onError={() => { if (source !== full) { setLoaded(false); setFailedDisplay(source); } else setFailed(true); }} />;
}
