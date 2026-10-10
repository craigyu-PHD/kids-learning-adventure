import manifest from './data/avatarAssetManifest.json';
import type { AvatarAccessorySlot } from './types';
import { isSupportedAvatarCanvasTopPadding } from './avatarCanvasGeometry';

const supportedAvatarIds = new Set(['brother', 'younger', 'sister', 'younger-sister']);

export type AvatarAccessoryDetail = { overlay: string; hairVisibilityMask?: string; underHeadwearVisibilityMask?: string; canvasTopPadding?: 0 | 256 };

export type AvatarAccessoryLayerSet = {
  renderer: 'aligned-overlay' | 'split-overlay' | 'standard-effect';
  slot: AvatarAccessorySlot;
  overlay?: string;
  back?: string;
  front?: string;
  /** Native split renders share the same body origin, including reserved headroom. */
  canvasTopPadding?: 0 | 256;
  foreground?: boolean;
  defaultSkinDetail?: AvatarAccessoryDetail;
};

type ManifestSkin = {
  skinId: string;
  avatarId: string;
  path: string;
};

type ManifestAccessoryDetail = { overlay: string; hairVisibilityMask?: string; underHeadwearVisibilityMask?: string; canvasTopPadding?: number };

type ManifestAccessory = {
  id: string;
  /** Reviewed catalog rendition from the same master as the wearable. */
  catalogPath?: string;
  /** The product rendition actually fitted to the selected learner. */
  catalogVariants?: Record<string, string>;
  slot: AvatarAccessorySlot;
  renderer: AvatarAccessoryLayerSet['renderer'];
  supportedAvatars?: string[];
  variants?: Record<string, string>;
  /** Optional full-skin overlay variants. Missing entries always retain variants[avatar]. */
  skinVariants?: Record<string, Record<string, string>>;
  /** Explicit reviewed detail pair per avatar/outfit; never inherits a base mask. */
  skinDetails?: Record<string, Record<string, ManifestAccessoryDetail>>;
  /** Same hairstyle without integrated ornaments, reviewed only when a separate hat is worn. */
  headwearHairDetails?: Record<string, Record<string, ManifestAccessoryDetail>>;
  backVariants?: Record<string, string>;
  frontVariants?: Record<string, string>;
  /** Explicit paired full-skin split renders; never combine a base half with a skin half. */
  skinBackVariants?: Record<string, Record<string, string>>;
  skinFrontVariants?: Record<string, Record<string, string>>;
  /** Reviewed complete split pair for one hairstyle, learner, and body pose. */
  requiredHairstyleFits?: string[];
  hairstyleSplitVariants?: Record<string, Record<string, Record<string, { back: string; front: string }>>>;
  canvasTopPadding?: number;
  headwearVariants?: Record<string, Record<string, { overlay: string; foreground: boolean }>>;
  defaultSkinDetails?: Record<string, ManifestAccessoryDetail>;
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

export function publicAssetPath(path?: string, baseUrl = import.meta.env?.BASE_URL ?? '/') {
  if (!path) return undefined;
  const relative = path.replace(/^public\//, '');
  return `${baseUrl}${relative}`;
}

export function avatarSkinAssetPath(itemId: string, avatarId?: string) {
  const avatar = normalizeAvatar(avatarId);
  return publicAssetPath(skinByAvatarAndId.get(`${avatar}:${itemId}`)?.path);
}

export function avatarAccessoryCatalogAssetPath(itemId: string, avatarId?: string) {
  const entry = accessoryById.get(itemId);
  const variant = avatarId ? entry?.catalogVariants?.[normalizeAvatar(avatarId)] : undefined;
  return publicAssetPath(variant ?? entry?.catalogPath);
}

export function hasAvatarSkinContract(itemId: string, avatarId?: string) {
  return Boolean(avatarSkinAssetPath(itemId, avatarId));
}

export function avatarAccessoryLayerSet(itemId: string, avatarId?: string, skinId?: string, headwearId?: string, hairstyleId?: string): AvatarAccessoryLayerSet | undefined {
  const entry = accessoryById.get(itemId);
  if (!entry) return undefined;
  const avatar = normalizeAvatar(avatarId);
  if (entry.supportedAvatars && !entry.supportedAvatars.includes(avatar)) return undefined;
  if (entry.renderer === 'aligned-overlay') {
    // A reviewed hat-specific cup layer must never apply to other hats or bodies.
    const headwear = !skinId && headwearId ? entry.headwearVariants?.[avatar]?.[headwearId] : undefined;
    // A reviewed full-skin overlay is opt-in per avatar and skin. All other skins
    // deliberately retain the base-avatar asset, without inheriting detail/mask layers.
    const skinOverlay = skinId ? entry.skinVariants?.[avatar]?.[skinId] : undefined;
    const overlay = publicAssetPath(skinOverlay ?? headwear?.overlay ?? entry.variants?.[avatar]);
    if (!overlay) return undefined;
    const headwearHairDetail = entry.slot === 'hair' && headwearId
      ? entry.headwearHairDetails?.[avatar]?.[skinId ?? 'default'] : undefined;
    const detail = headwearHairDetail ?? (skinId ? entry.skinDetails?.[avatar]?.[skinId] : entry.defaultSkinDetails?.[avatar]);
    const detailOverlay = publicAssetPath(detail?.overlay);
    const hairVisibilityMask = publicAssetPath(detail?.hairVisibilityMask);
    // Separate brim visibility for selected hair/headphone bands; never reuse the original body-hair mask.
    const underHeadwearVisibilityMask = entry.slot === 'headwear' ? publicAssetPath(detail?.underHeadwearVisibilityMask) : undefined;
    const detailGeometryIsValid = detail?.canvasTopPadding === undefined
      || isSupportedAvatarCanvasTopPadding(detail.canvasTopPadding);
    return { renderer: entry.renderer, slot: entry.slot, overlay, foreground: headwear?.foreground,
      ...(detailOverlay && detailGeometryIsValid ? { defaultSkinDetail: { overlay: detailOverlay, hairVisibilityMask, underHeadwearVisibilityMask,
        ...(detail?.canvasTopPadding !== undefined ? { canvasTopPadding: detail.canvasTopPadding as 0 | 256 } : {}),
      } } : {}),
    };
  }
  if (entry.renderer === 'split-overlay') {
    if (entry.canvasTopPadding !== undefined && !isSupportedAvatarCanvasTopPadding(entry.canvasTopPadding)) return undefined;
    const hairstylePairs = hairstyleId ? entry.hairstyleSplitVariants?.[hairstyleId] : undefined;
    if (hairstylePairs || (hairstyleId && entry.requiredHairstyleFits?.includes(hairstyleId))) {
      const pair = hairstylePairs?.[avatar]?.[skinId ?? 'default'];
      const back = publicAssetPath(pair?.back);
      const front = publicAssetPath(pair?.front);
      // A declared hairstyle fit is exact: a missing half/pose must not reuse a different fit.
      return back && front ? { renderer: entry.renderer, slot: entry.slot, back, front,
        ...(entry.canvasTopPadding !== undefined ? { canvasTopPadding: entry.canvasTopPadding as 0 | 256 } : {}),
      } : undefined;
    }
    const skinBack = skinId ? entry.skinBackVariants?.[avatar]?.[skinId] : undefined;
    const skinFront = skinId ? entry.skinFrontVariants?.[avatar]?.[skinId] : undefined;
    const hasSkinPair = Boolean(skinBack && skinFront);
    const back = publicAssetPath(hasSkinPair ? skinBack : entry.backVariants?.[avatar]);
    const front = publicAssetPath(hasSkinPair ? skinFront : entry.frontVariants?.[avatar]);
    return back && front ? { renderer: entry.renderer, slot: entry.slot, back, front,
      ...(entry.canvasTopPadding !== undefined ? { canvasTopPadding: entry.canvasTopPadding as 0 | 256 } : {}),
    } : undefined;
  }
  return { renderer: 'standard-effect', slot: entry.slot };
}

export function hasAvatarAccessoryContract(itemId: string, avatarId?: string) {
  return Boolean(avatarAccessoryLayerSet(itemId, avatarId));
}

export function avatarAccessoryManifestIds() {
  return new Set(accessoryById.keys());
}

/** Optional display delivery for the existing original body; never a full-skin replacement. */
export function avatarBaseDisplayAsset(avatarId: string) {
  const entry = manifest.baseDisplayVariants.find(record => record.avatarId === avatarId);
  return entry ? { path: publicAssetPath(entry.path)!, width: entry.width, height: entry.height } : undefined;
}

const baseDisplays = new Map(manifest.baseDisplayVariants.map(entry => [entry.avatarId,
  [entry.smallDisplay, entry].map(variant => ({ path: publicAssetPath(variant.path)!, width: variant.width, height: variant.height })),
]));
export function avatarBaseDisplayAssets(avatarId: string) {
  return baseDisplays.get(avatarId);
}
