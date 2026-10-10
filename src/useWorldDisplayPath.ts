import { useLayoutEffect, useState, type RefObject } from 'react';
import manifest from './data/worldArtManifest.json';
import { reviewedWorldAssetPath } from './worldArtAssets';

/** Select delivery resolution from painted size. Does not alter equipment or artwork. */
export function useWorldDisplayPath(itemId: string | undefined, slot: string,
  ref: RefObject<HTMLElement | null>, fit: 'contain' | 'cover' = 'contain', fullPreview = false) {
  const record = manifest.records.find(r => r.itemId === itemId && r.slot === slot);
  const variants = record && 'displayVariants' in record ? record.displayVariants : undefined;
  const full = itemId ? reviewedWorldAssetPath(itemId, slot) : undefined;
  const url = (path: string) => `${import.meta.env.BASE_URL}${path.slice('public/'.length)}`;
  // Wait for layout before issuing a derivative request; an initial guessed
  // source could be cancelled as soon as its actual size is known.
  const initial = !fullPreview && variants?.length ? '' : full;
  const key = `${itemId}:${slot}:${fullPreview}`;
  const [selection, setSelection] = useState<{ key: string; path: string | undefined }>();
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !variants?.length || fullPreview) return;
    const failedFrames = new Set<string>();
    let frameProbe: HTMLImageElement | undefined;
    let probedPath: string | undefined;
    const update = () => {
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      const ratio = variants[0].width / variants[0].height;
      const paintedWidth = fit === 'contain' ? Math.min(width, height * ratio) : Math.max(width, height * ratio);
      const required = Math.ceil(paintedWidth * window.devicePixelRatio * 1.02);
      const variant = variants.find(v => v.width >= required);
      const alternate = fit === 'cover' && variant && 'alternateDelivery' in variant
        ? variant.alternateDelivery : undefined;
      const alternatePath = alternate && typeof alternate === 'object' && 'path' in alternate && typeof alternate.path === 'string'
        ? url(alternate.path) : undefined;
      const candidates = [alternatePath, variant ? url(variant.path) : undefined, full];
      const path = candidates.find(candidate => candidate && !failedFrames.has(candidate));
      setSelection(previous => previous?.key === key && previous.path === path ? previous : { key, path });
      // CSS border images have no DOM error event. A coalesced request lets a
      // failed codec recover to its lossless display WebP, then full delivery.
      if (fit === 'cover' && path && path !== full && path !== probedPath) {
        if (frameProbe) frameProbe.onerror = null;
        probedPath = path; frameProbe = new Image();
        // The collected card border is secondary to the lesson and room content.
        frameProbe.fetchPriority = 'low';
        frameProbe.onerror = () => { failedFrames.add(path); update(); };
        frameProbe.src = path;
      }
    };
    update();
    const observer = new ResizeObserver(update);observer.observe(element);
    window.addEventListener('resize', update);
    return () => { observer.disconnect();window.removeEventListener('resize', update);if (frameProbe) frameProbe.onerror = null; };
  }, [key, variants, fullPreview, full, fit, ref]);
  return selection?.key === key ? selection.path : initial;
}
