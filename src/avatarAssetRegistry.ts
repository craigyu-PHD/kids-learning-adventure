import manifest from './data/avatarAssetManifest.json';
import type { AvatarAccessorySlot } from './types';

const supportedAvatarIds = new Set(['brother', 'younger', 'sister', 'younger-sister']);

export type AvatarAccessoryLayerSet = {
  renderer: 'aligned-overlay' | 'split-overlay' | 'standard-effect';
  slot: AvatarAccessorySlot;
  overlay?: string;
  back?: string;
  front?: string;
};

type ManifestSkin = {
  skinId: string;
  avatarId: string;
  path: string;
};

type ManifestAccessory = {
  id: string;
  slot: AvatarAccessorySlot;
  renderer: AvatarAccessoryLayerSet['renderer'];
  supportedAvatars?: string[];
  variants?: Record<string, string>;
  backVariants?: Record<string, string>;
  frontVariants?: Record<string, string>;
};

const skinByAvatarAndId = new Map(
  (manifest.skins as ManifestSkin[]).map((entry) => [`${entry.avatarId}:${entry.skinId}`, entry]),
);
const accessoryById = new Map(
  (manifest.accessories as ManifestAccessory[]).map((entry) => [entry.id, entry]),
);

function normalizeAvatar(value?: string) {
  return value && supportedAvatarIds.has(value) ? value : 'brother';
}

function publicAssetPath(path?: string) {
  if (!path) return undefined;
  const relative = path.replace(/^public\//, '');
  return `${import.meta.env?.BASE_URL ?? '/'}${relative}`;
}

export function avatarSkinAssetPath(itemId: string, avatarId?: string) {
  const avatar = normalizeAvatar(avatarId);
  return publicAssetPath(skinByAvatarAndId.get(`${avatar}:${itemId}`)?.path);
}

export function hasAvatarSkinContract(itemId: string, avatarId?: string) {
  return Boolean(avatarSkinAssetPath(itemId, avatarId));
}

export function avatarAccessoryLayerSet(itemId: string, avatarId?: string): AvatarAccessoryLayerSet | undefined {
  const entry = accessoryById.get(itemId);
  if (!entry) return undefined;
  const avatar = normalizeAvatar(avatarId);
  if (entry.supportedAvatars && !entry.supportedAvatars.includes(avatar)) return undefined;
  if (entry.renderer === 'aligned-overlay') {
    const overlay = publicAssetPath(entry.variants?.[avatar]);
    return overlay ? { renderer: entry.renderer, slot: entry.slot, overlay } : undefined;
  }
  if (entry.renderer === 'split-overlay') {
    const back = publicAssetPath(entry.backVariants?.[avatar]);
    const front = publicAssetPath(entry.frontVariants?.[avatar]);
    return back && front ? { renderer: entry.renderer, slot: entry.slot, back, front } : undefined;
  }
  return { renderer: 'standard-effect', slot: entry.slot };
}

export function hasAvatarAccessoryContract(itemId: string, avatarId?: string) {
  return Boolean(avatarAccessoryLayerSet(itemId, avatarId));
}

export function avatarAccessoryManifestIds() {
  return new Set(accessoryById.keys());
}
