import type { CSSProperties } from 'react';
import { shopItemById, shopItemCanRender } from '../avatarShop';
import { avatarStageFromXp, avatarStageName, levelFromXp } from '../rewards';
import { composedWardrobeLookAssetPath, wardrobeBaseAssetPath } from './AvatarWardrobe';

export const avatarOptions = [
  { id: 'brother', name: '哥哥探險家', short: '哥哥', colors: ['#2450d8', '#39c6e3', '#ffd166'] },
  { id: 'younger', name: '弟弟探險家', short: '弟弟', colors: ['#16a34a', '#14532d', '#bef264'] },
  { id: 'sister', name: '姐姐探險家', short: '姐姐', colors: ['#5b4cc7', '#55bde8', '#ffc85a'] },
  { id: 'younger-sister', name: '妹妹探險家', short: '妹妹', colors: ['#1fa884', '#70d8c1', '#f6a7c6'] },
] as const;

const legacyMap: Record<string, string> = {
  '🚀': 'brother', '🦖': 'younger', '🦈': 'younger', '🤖': 'brother', '🛸': 'brother',
  '🐯': 'brother', '🦁': 'brother', '🚗': 'brother', '🌟': 'brother', '⚡': 'brother',
  nova: 'brother', thunder: 'brother', titan: 'brother', turbo: 'brother', rex: 'younger', aqua: 'younger',
  luna: 'sister', stella: 'sister', mint: 'younger-sister', blossom: 'younger-sister',
};

export function normalizeAvatarId(value?: string) {
  if (!value) return 'brother';
  if (avatarOptions.some((option) => option.id === value)) return value;
  return legacyMap[value] ?? 'brother';
}

export function avatarName(value?: string) {
  const id = normalizeAvatarId(value);
  return avatarOptions.find((option) => option.id === id)?.name ?? '哥哥探險家';
}

export function avatarStageAssetPath(value: string | undefined, stage: number, thumbnail = true) {
  const id = normalizeAvatarId(value);
  const imageExtension = id === 'sister' || id === 'younger-sister' ? 'png' : 'webp';
  return `${import.meta.env.BASE_URL}assets/v5/characters/${id}/stage-${stage}${thumbnail ? '-thumb' : ''}.${imageExtension}`;
}

export default function AvatarRenderer({
  avatarId,
  xp = 0,
  size = 82,
  showStage = false,
  equippedCosmetics = [],
  className = '',
  stageOverride,
  eager = false,
}: {
  avatarId?: string;
  xp?: number;
  size?: number;
  showStage?: boolean;
  equippedCosmetics?: string[];
  className?: string;
  stageOverride?: number;
  eager?: boolean;
}) {
  const id = normalizeAvatarId(avatarId);
  const option = avatarOptions.find((item) => item.id === id) ?? avatarOptions[0];
  const stage = stageOverride ?? avatarStageFromXp(xp);
  const level = levelFromXp(xp);
  const [primary, secondary, accent] = option.colors;
  const style = {
    '--avatar-primary': primary,
    '--avatar-secondary': secondary,
    '--avatar-accent': accent,
    width: size,
    height: size,
  } as CSSProperties;

  const equippedItems = equippedCosmetics
    .map((itemId) => shopItemById.get(itemId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const skin = equippedItems.find((item) => item.kind === 'skin' && shopItemCanRender(item, id));
  const effect = equippedItems.find((item) => item.kind === 'accessory' && item.equipmentSlot === 'effect' && shopItemCanRender(item, id));
  const fullSkin = skin?.renderer === 'full-skin' ? composedWardrobeLookAssetPath(id, skin.id) : undefined;
  // Current avatars always use the fixed 1024×1536 wardrobe contract. Legacy
  // stage art is rendered only when an explicit evolution-preview stage is requested.
  const imageSrc = fullSkin ?? (stageOverride ? avatarStageAssetPath(id, stage, true) : wardrobeBaseAssetPath(id));
  const equipmentNames = equippedItems.map((item) => item.name);

  return (
    <div
      className={`avatar-renderer avatar-photo-hero avatar-${id} stage-${stage} ${fullSkin ? 'skin-active' : 'skin-default'} ${className}`.trim()}
      style={style}
      title={`${option.name} · Level ${level} · ${avatarStageName(xp)}`}
      data-stage={stage}
      data-skin={skin?.id ?? 'default'}
      data-cosmetics={equippedCosmetics.join(' ')}
    >
      {effect && <span className={`avatar-standard-effect effect-${effect.id}`} aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</span>}
      <img
        className="avatar-renderer-skin"
        src={imageSrc}
        alt={`${option.name}，${avatarStageName(xp)}`}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
      {showStage && <span className="avatar-stage-label">Stage {stage}/4 · {avatarStageName(xp)}</span>}
      {showStage && equipmentNames.length > 0 && <span className="avatar-cosmetic-summary" aria-label={`已裝備：${equipmentNames.join('、')}`}>{equipmentNames.length} 件裝備</span>}
    </div>
  );
}
