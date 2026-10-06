import { useLayoutEffect, useState, type RefObject } from 'react';
import manifest from './data/characterMotionManifest.json';
import { useReviewedImageBlink } from './useReviewedImageBlink';

/**
 * One reviewed blink frame for the exact avatar + skin. Default rows retain
 * native-generation lineage; P10 full-skin rows are reviewed same-rig native
 * eye-motion derivatives. Missing avatar/skin records remain static.
 */
export function useCharacterBlink(
  ref: RefObject<HTMLImageElement | null>,
  base: string | undefined,
  avatarId: string,
  skin: string,
  enabled: boolean,
) {
  const record = enabled
    ? manifest.records.find(r => r.avatarId === avatarId && r.skin === skin && r.motion === 'blink')
    : undefined;
  const [selectedWidth, setSelectedWidth] = useState<number>();

  useLayoutEffect(() => {
    const element = ref.current;
    if (!record || !element) {
      setSelectedWidth(undefined);
      return;
    }
    const update = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;
      const paintedWidth = Math.min(width, height * 2 / 3);
      const required = Math.ceil(paintedWidth * window.devicePixelRatio * 1.05);
      const variants = [...record.displayVariants].sort((a, b) => a.width - b.width);
      const candidate = variants.find(option => required <= option.width) ?? variants.at(-1);
      if (candidate) setSelectedWidth(old => old === candidate.width ? old : candidate.width);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  // AvatarRenderer keys the image by its source; reattach after initial display
  // selection or responsive delivery changes replace the DOM image.
  }, [avatarId, skin, record, ref, base]);

  const hintedWidth = base?.split('?')[0].endsWith('-192.webp') ? 192
    : base?.split('?')[0].endsWith('-384.webp') ? 384
      : undefined;
  const width = selectedWidth ?? hintedWidth;
  const variant = width ? record?.displayVariants.find(v => v.width === width) : undefined;
  const candidate = variant ? `${import.meta.env.BASE_URL}${variant.path.slice('public/'.length)}` : undefined;
  return useReviewedImageBlink(ref, base, candidate);
}
