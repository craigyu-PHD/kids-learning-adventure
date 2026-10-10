import manifest from './data/avatarHeroManifest.json';
import { cosmeticById } from './cosmetics';

export interface AvatarHeroAsset {
  avatarId: string;
  itemId: string;
  path: string;
  sourceSha256: string;
  deliverySha256: string;
}

const avatars = new Set(['brother', 'younger', 'sister', 'younger-sister']);
const wearableSlots = new Set(['outfit', 'hairstyle', 'hat', 'glasses', 'headphones', 'backpack', 'cape']);

/** The release manifest is empty until Local Art and author direction pass.
 * Match the full equipped wearable set BEFORE occlusion; hidden hair still
 * belongs to the look. This selector never edits equipment or loads images. */
export function selectExactAvatarHero(avatarId: string, equipped: readonly string[], records: readonly AvatarHeroAsset[] = manifest.records): AvatarHeroAsset | undefined {
  if (!avatars.has(avatarId) || new Set(equipped).size !== equipped.length) return undefined;
  const items = equipped.map(id => cosmeticById.get(id));
  if (items.some(item => !item)) return undefined;
  const wearables = items.filter(item => item && wearableSlots.has(item.slot));
  if (wearables.length !== 1) return undefined;
  const itemId = wearables[0]!.id;
  const matches = records.filter(record => record.avatarId === avatarId && record.itemId === itemId);
  if (matches.length !== 1) return undefined;
  const match = matches[0];
  if (match.path !== `assets/v6.4/hero-composites/${avatarId}/${itemId}.webp`
    || !/^[a-f0-9]{64}$/.test(match.sourceSha256) || !/^[a-f0-9]{64}$/.test(match.deliverySha256)) return undefined;
  return match;
}
