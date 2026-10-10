import { useEffect, useState } from 'react';
import { AVATAR_CANVAS_HEIGHT, AVATAR_CANVAS_WIDTH, isSupportedAvatarCanvasTopPadding } from './avatarCanvasGeometry';
import { loadAvatarMaskResource } from './avatarMaskResource';
import { decodeAvatarImage } from './avatarImageDecode';
export { decodeAvatarImage } from './avatarImageDecode';

type Detail = { itemId: string; overlay: string; hairVisibilityMask?: string; canvasTopPadding?: number };
type State = { key: string; ready: string[]; failed: string[]; masks: Record<string, string>; signal?: AbortSignal };

/** An overlay and its optional visibility mask become active together. */
export function useAvatarDetailReadiness(details: Detail[]) {
  const key = JSON.stringify(details);
  const [state, setState] = useState<State>({ key: '', ready: [], failed: [], masks: {} });
  useEffect(() => {
    const pending = JSON.parse(key) as Detail[];
    let cancelled = false;
    const controller = new AbortController();
    const emptyState: State = { key, ready: [], failed: [], masks: {}, signal: controller.signal };
    setState(emptyState);
    const maskResources: { url: string; release: () => void }[] = [];
    const probes: HTMLImageElement[] = [];
    const load = (url: string, expected?: { width: number; height: number }) => new Promise<void>((resolve, reject) => {
      const image = new Image();
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
          if (controller.signal.aborted) return previous;
          const current = previous.signal === controller.signal ? previous : emptyState;
          return { ...current, failed: [...current.failed, detail.itemId] };
        });
        return;
      }
      const extended = padding > 0;
      Promise.all([
        load(detail.overlay, extended ? { width: AVATAR_CANVAS_WIDTH, height: AVATAR_CANVAS_HEIGHT + padding } : undefined),
        detail.hairVisibilityMask ? loadAvatarMaskResource(detail.hairVisibilityMask, controller.signal,
          extended ? { width: AVATAR_CANVAS_WIDTH, height: AVATAR_CANVAS_HEIGHT } : undefined).then(resource => {
            if (cancelled) { resource.release(); return undefined; }
            maskResources.push(resource);
            return resource;
          }) : undefined,
      ]).then(([, mask]) => {
        if (cancelled) return;
        setState(previous => {
          if (controller.signal.aborted) return previous;
          const current = previous.signal === controller.signal ? previous : emptyState;
          return current.failed.includes(detail.itemId) ? current : { ...current, ready: [...current.ready, detail.itemId],
            masks: { ...current.masks, ...(mask && detail.hairVisibilityMask ? { [detail.hairVisibilityMask]: mask.url } : {}) } };
        });
      }).catch(() => {
        if (!cancelled) setState(previous => {
          if (controller.signal.aborted) return previous;
          const current = previous.signal === controller.signal ? previous : emptyState;
          return { ...current, failed: [...current.failed, detail.itemId] };
        });
      });
    });
    return () => {
      cancelled = true;
      controller.abort();
      probes.forEach(image => { image.onload = null; image.onerror = null; });
      maskResources.forEach(resource => resource.release());
    };
  }, [key]);
  const invalidate = (itemId: string) => setState(previous => {
    if (previous.key !== key || !previous.signal || previous.signal.aborted) return previous;
    return { ...previous, failed: [...previous.failed, itemId] };
  });
  // Returning A → B → A must not reuse A's already-revoked mask, even before
  // the new effect runs. The signal identifies the exact resource lifetime.
  const active = state.key === key && state.signal && !state.signal.aborted;
  const ready = new Set(active ? state.ready.filter(id => !state.failed.includes(id)) : []);
  const failed = new Set(active ? state.failed : []);
  const maskUrl = (source: string) => active ? state.masks[source] : undefined;
  return { ready, failed, invalidate, maskUrl };
}
