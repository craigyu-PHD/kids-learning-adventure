import type { CSSProperties } from 'react';
import { cosmeticById } from '../cosmetics';
import { avatarStageFromXp, avatarStageName, levelFromXp } from '../rewards';

export const avatarOptions = [
  { id: 'brother', name: '哥哥探險家', short: '哥哥', colors: ['#2450d8', '#39c6e3', '#ffd166'] },
  { id: 'younger', name: '弟弟探險家', short: '弟弟', colors: ['#16a34a', '#14532d', '#bef264'] },
] as const;

const legacyMap: Record<string, string> = {
  '🚀': 'brother', '🦖': 'younger', '🦈': 'younger', '🤖': 'brother', '🛸': 'brother',
  '🐯': 'brother', '🦁': 'brother', '🚗': 'brother', '🌟': 'brother', '⚡': 'brother',
  nova: 'brother', thunder: 'brother', titan: 'brother', turbo: 'brother', rex: 'younger', aqua: 'younger',
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

export default function AvatarHero({ avatarId, xp = 0, size = 82, showStage = false, equippedCosmetics = [] }: {
  avatarId?: string;
  xp?: number;
  size?: number;
  showStage?: boolean;
  equippedCosmetics?: string[];
}) {
  const id = normalizeAvatarId(avatarId);
  const option = avatarOptions.find((item) => item.id === id) ?? avatarOptions[0];
  const stage = avatarStageFromXp(xp);
  const level = levelFromXp(xp);
  const [primary, secondary, accent] = option.colors;
  const style = {
    '--avatar-primary': primary,
    '--avatar-secondary': secondary,
    '--avatar-accent': accent,
    width: size,
    height: size,
  } as CSSProperties;
  const imageSrc = `${import.meta.env.BASE_URL}assets/v5/characters/${id}/stage-${stage}-thumb.webp`;
  const equippedItems = equippedCosmetics.map((cosmeticId) => cosmeticById.get(cosmeticId)).filter(Boolean) as Array<NonNullable<ReturnType<typeof cosmeticById.get>>>;
  const avatarSlots = new Set(['hairstyle','outfit','hat','glasses','backpack','cape','headphones']);
  const avatarItems = equippedItems.filter((item) => avatarSlots.has(item.slot));
  const cosmeticNames = equippedItems.map((item) => item.name);

  return (
    <div className={`avatar-hero avatar-photo-hero avatar-${id} stage-${stage}`} style={style} title={`${option.name} · Level ${level} · ${avatarStageName(xp)}`} data-stage={stage} data-cosmetics={equippedCosmetics.join(' ')}>
      <span className="avatar-photo-glow" aria-hidden="true" />
      <img src={imageSrc} alt={`${option.name}，${avatarStageName(xp)}`} loading="lazy" decoding="async" />
      {avatarItems.map((item) => <span key={item.id} className={`avatar-equipped-cosmetic cosmetic-${item.id} slot-${item.slot}`} aria-hidden="true" />)}
      {showStage && <span className="avatar-stage-label">Stage {stage}/4 · {avatarStageName(xp)}</span>}
      {showStage && cosmeticNames.length > 0 && <span className="avatar-cosmetic-summary" aria-label={`已裝備：${cosmeticNames.join('、')}`}>{cosmeticNames.length} 件裝備</span>}
    </div>
  );
}
