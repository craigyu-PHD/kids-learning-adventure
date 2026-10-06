import { useEffect, useState } from 'react';
import { AVATAR_CANVAS_HEIGHT, AVATAR_CANVAS_WIDTH, isSupportedAvatarCanvasTopPadding } from './avatarCanvasGeometry';

type Detail = { itemId: string; overlay: string; hairVisibilityMask?: string; canvasTopPadding?: number };
type State = { key: string; ready: string[]; failed: string[] };

/** Require a successful decode of this exact image; recover one transient rejection. */
export async function decodeAvatarImage(image: HTMLImageElement, isCurrent: () => boolean) {
  const source = image.src;
  const current = () => isCurrent() && image.src === source;
  const requireCurrent = () => {
    if (!current()) throw new DOMException('Avatar image was replaced or cancelled', 'AbortError');
  };
  requireCurrent();
  try {
    await image.decode();
  } catch (error) {
    const transient = error instanceof DOMException
      && (error.name === 'EncodingError' || error.name === 'AbortError');
    if (!current() || !transient || !image.complete
      || image.naturalWidth <= 0 || image.naturalHeight <= 0) throw error;
    // Yield once so a cached image can finish decoding. A second rejection fails
    // normally; complete/natural dimensions alone never activate a layer.
    await new Promise<void>(resume => setTimeout(resume, 0));
    requireCurrent();
    await image.decode();
  }
  requireCurrent();
}

/** An overlay and its optional visibility mask become active together. */
export function useAvatarDetailReadiness(details: Detail[]) {
  const key = JSON.stringify(details);
  const [state, setState] = useState<State>({ key: '', ready: [], failed: [] });
  useEffect(() => {
    const pending = JSON.parse(key) as Detail[];
    let cancelled = false;
    const probes: HTMLImageElement[] = [];
    const load = (url: string, expected?: { width: number; height: number }, cssMask = false) => new Promise<void>((resolve, reject) => {
      const image = new Image();
      // CSS masks use CORS fetches; match that mode so the decoded probe is reused.
      if (cssMask) image.crossOrigin = 'anonymous';
      probes.push(image);
      image.onload = () => {
        if (image.naturalWidth <= 0 || (expected
          && (image.naturalWidth !== expected.width || image.naturalHeight !== expected.height))) { reject(); return; }
        void decodeAvatarImage(image, () => !cancelled).then(resolve, reject);
      };
      image.onerror = () => reject();
      image.src = url;
    });
    pending.forEach(detail => {
      const padding = detail.canvasTopPadding ?? 0;
      if (!isSupportedAvatarCanvasTopPadding(padding)) {
        setState(previous => {
          const current = previous.key === key ? previous : { key, ready: [], failed: [] };
          return { ...current, failed: [...current.failed, detail.itemId] };
        });
        return;
      }
      const extended = padding > 0;
      Promise.all([
        load(detail.overlay, extended ? { width: AVATAR_CANVAS_WIDTH, height: AVATAR_CANVAS_HEIGHT + padding } : undefined),
        ...(detail.hairVisibilityMask ? [load(detail.hairVisibilityMask,
          extended ? { width: AVATAR_CANVAS_WIDTH, height: AVATAR_CANVAS_HEIGHT } : undefined, true)] : []),
      ]).then(() => {
        if (cancelled) return;
        setState(previous => {
          const current = previous.key === key ? previous : { key, ready: [], failed: [] };
          return current.failed.includes(detail.itemId) ? current : { ...current, ready: [...current.ready, detail.itemId] };
        });
      }).catch(() => {
        if (!cancelled) setState(previous => {
          const current = previous.key === key ? previous : { key, ready: [], failed: [] };
          return { ...current, failed: [...current.failed, detail.itemId] };
        });
      });
    });
    return () => { cancelled = true; probes.forEach(image => { image.onload = null; image.onerror = null; }); };
  }, [key]);
  const invalidate = (itemId: string) => setState(previous => {
    const current = previous.key === key ? previous : { key, ready: [], failed: [] };
    return { ...current, failed: [...current.failed, itemId] };
  });
  const ready = new Set(state.key === key ? state.ready.filter(id => !state.failed.includes(id)) : []);
  const failed = new Set(state.key === key ? state.failed : []);
  return { ready, failed, invalidate };
}
