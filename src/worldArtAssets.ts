import manifest from './data/worldArtManifest.json';

// Asset selection only: ownership and equipment still come from the existing ledger.
export function reviewedWorldAssetPath(itemId: string, slot: string) {
  const record = manifest.records.find((entry) => entry.itemId === itemId && entry.slot === slot);
  if (!record) return undefined;
  // New reviewed deliveries keep the same slot and SKU. Retained V6.4 bytes
  // stay immutable; a later workpack can select its own admitted rendition.
  const versions = ['v6.4', 'v6.5.2', 'v6.5.3'];
  const path = record.delivery.path;
  if (!versions.some(version => path === `public/assets/${version}/world/${slot}/${itemId}.webp`)) return undefined;
  return `${import.meta.env?.BASE_URL ?? '/'}${path.slice('public/'.length)}`;
}

// Shared by Shop and Home; BASE_URL also supports the GitHub Pages subdirectory.
export function roomSceneAssetPath(itemId: string) {
  const reviewed = reviewedWorldAssetPath(itemId, 'room');
  if (reviewed) return reviewed;
  if (!['room-starlab', 'room-ocean', 'room-legend'].includes(itemId)) return undefined;
  return `${import.meta.env?.BASE_URL ?? '/'}assets/v5/scenes/${itemId}-v2.png`;
}

export function cardFrameAssetPath(itemId: string) {
  if (!['card-sky', 'card-nebula', 'card-legend'].includes(itemId)) return undefined;
  return reviewedWorldAssetPath(itemId, 'card')
    ?? `${import.meta.env?.BASE_URL ?? '/'}assets/v5/items/${itemId}.webp`;
}
