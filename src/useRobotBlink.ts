import { type RefObject } from 'react';
import { useReviewedImageBlink } from './useReviewedImageBlink';
import manifest from './data/worldArtManifest.json';

// Only sky's full-frame blink passed the current visual review. Mecha and
// legend retain their original open-eye art until coherent frames are approved.
const reviewedBlinkItems = new Set(['robot-sky']);

/** One short greeting using a reviewed full-frame image. */
export function useRobotBlink(ref: RefObject<HTMLImageElement | null>, base: string | undefined, itemId?: string) {
  const record = itemId && reviewedBlinkItems.has(itemId)
    ? manifest.records.find(r => r.itemId === itemId && r.slot === 'robot') : undefined;
  const blink = record && 'blink' in record ? record.blink : undefined;
  // Match the existing display resolution; a tiny Home companion does not
  // download a full-size animation frame.
  const variant = blink?.displayVariants.find(v => base?.split('?')[0].endsWith(`-${v.width}.webp`));
  const frame = variant ?? blink?.delivery;
  const candidate = frame ? `${import.meta.env.BASE_URL}${frame.path.slice('public/'.length)}` : undefined;
  return useReviewedImageBlink(ref, base, candidate);
}
