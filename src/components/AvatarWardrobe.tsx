import type { CSSProperties } from "react";
import { equippedCosmeticForSlot } from "../cosmetics";
const wardrobeAvatarIds = new Set([
  "brother",
  "younger",
  "sister",
  "younger-sister",
]);

function normalizeWardrobeAvatarId(value?: string) {
  if (value && wardrobeAvatarIds.has(value)) return value;
  if (value === "luna" || value === "stella") return "sister";
  if (value === "mint" || value === "blossom") return "younger-sister";
  if (value === "rex" || value === "aqua" || value === "🦖" || value === "🦈")
    return "younger";
  return "brother";
}

export function wardrobeBaseAssetPath(avatarId?: string) {
  return `${import.meta.env.BASE_URL}assets/v5/characters/${normalizeWardrobeAvatarId(avatarId)}/wardrobe/base-body.webp`;
}

/**
 * A wearable image is accepted only if it is a complete, same-pose render of
 * this exact avatar. Product thumbnails never qualify: they are catalog art,
 * not clothes. The map intentionally starts small and grows asset-by-asset
 * after visual QA, rather than falling back to an ugly overlay.
 */
const composedLookAssets: Record<string, Partial<Record<string, string>>> = {
  brother: {
    "outfit-racer": "outfit-racer-v1.webp",
  },
  younger: {
    "outfit-racer": "outfit-racer-v1.webp",
  },
  sister: {
    "outfit-racer": "outfit-racer-v1.webp",
  },
  "younger-sister": {
    "outfit-racer": "outfit-racer-v1.webp",
  },
};

export function hasComposedWardrobeLook(avatarId?: string, outfitId?: string) {
  return Boolean(outfitId && composedLookAssets[normalizeWardrobeAvatarId(avatarId)]?.[outfitId]);
}

export function composedWardrobeLookAssetPath(avatarId?: string, outfitId?: string) {
  const normalizedAvatarId = normalizeWardrobeAvatarId(avatarId);
  const file = outfitId ? composedLookAssets[normalizedAvatarId]?.[outfitId] : undefined;
  return file
    ? `${import.meta.env.BASE_URL}assets/v5/characters/${normalizedAvatarId}/wardrobe/looks/${file}`
    : undefined;
}

/**
 * Product thumbnails are deliberately never rendered over this avatar. A
 * wardrobe asset must already contain the exact avatar, pose, body occlusion
 * and garment; this eliminates the old cutout-collage failure mode.
 */
export default function AvatarWardrobe({
  avatarId,
  equippedCosmetics = [],
  size = 320,
  name = "學習者",
}: {
  avatarId?: string;
  equippedCosmetics?: string[];
  size?: number;
  name?: string;
}) {
  const id = normalizeWardrobeAvatarId(avatarId);
  const outfit = equippedCosmeticForSlot(equippedCosmetics, "outfit");
  const look = composedWardrobeLookAssetPath(id, outfit?.id);

  return (
    <div
      className={`wardrobe-avatar wardrobe-${id}`}
      style={{ width: size, height: size } as CSSProperties}
      data-avatar={id}
      data-outfit={outfit?.id ?? "base"}
      data-composed={look ? "ready" : "base"}
      aria-label={`${name}的換裝預覽`}
    >
      <img
        className="wardrobe-base-body"
        src={look ?? wardrobeBaseAssetPath(id)}
        alt={look && outfit ? `${name}已穿上${outfit.name}` : `${name}的換裝素體`}
        draggable={false}
      />
    </div>
  );
}
