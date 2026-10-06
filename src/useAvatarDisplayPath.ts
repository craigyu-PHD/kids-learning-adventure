import { useLayoutEffect, useState, type RefObject } from 'react';
import { avatarBaseDisplayAssets } from './avatarAssetRegistry';

/** Match the painted fixed canvas, including device pixel ratio; no geometry changes. */
export function useAvatarDisplayPath(avatarId: string, ref: RefObject<HTMLElement | null>, enabled: boolean, full: string) {
  const candidates = avatarBaseDisplayAssets(avatarId);
  const key = `${avatarId}:${enabled}`;
  const [selection, setSelection] = useState<{ key: string; path: string }>();
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !candidates?.length || !element) return;
    const update = () => {
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      const paintedWidth = Math.min(width, height * candidates[0].width / candidates[0].height);
      // Leave room for the existing small hover scale without upscaling the delivery.
      const required = Math.ceil(paintedWidth * window.devicePixelRatio * 1.05);
      const candidate = candidates.find(option => required <= option.width && !failed.has(option.path));
      const path = candidate?.path ?? full;
      setSelection(old => old?.key === key && old.path === path ? old : { key, path });
    };
    update();
    const observer = new ResizeObserver(update); observer.observe(element);
    window.addEventListener('resize', update);
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, [key, enabled, candidates, failed, full, ref]);
  const path = !enabled || !candidates?.length ? full : selection?.key === key ? selection.path : undefined;
  return { path: path && failed.has(path) ? undefined : path,
    invalidate: () => { if (path && path !== full) setFailed(old => new Set(old).add(path)); } };
}
