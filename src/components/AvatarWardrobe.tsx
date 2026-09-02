import type { CSSProperties } from "react";
import { avatarSkinAssetPath, hasAvatarSkinContract } from "../avatarAssetRegistry";
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

/** Every full-skin outfit is resolved from the authoritative avatar asset
 * manifest. Product thumbnails never qualify as wearable layers. */
export function hasComposedWardrobeLook(avatarId?: string, outfitId?: string) {
  return Boolean(outfitId && hasAvatarSkinContract(outfitId, normalizeWardrobeAvatarId(avatarId)));
}

export function composedWardrobeLookAssetPath(avatarId?: string, outfitId?: string) {
  return outfitId ? avatarSkinAssetPath(outfitId, normalizeWardrobeAvatarId(avatarId)) : undefined;
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
