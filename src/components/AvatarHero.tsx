import type { CSSProperties } from 'react';
import { cosmeticById } from '../cosmetics';
import { avatarStageFromXp, avatarStageName, levelFromXp } from '../rewards';

export const avatarOptions = [
  { id: 'nova', name: '星光少年', short: '星光', colors: ['#5b5cf0', '#39c6e3', '#ffd166'] },
  { id: 'thunder', name: '雷霆少年', short: '雷霆', colors: ['#2450d8', '#7dd3fc', '#facc15'] },
  { id: 'titan', name: '銀河女孩', short: '銀河', colors: ['#d94878', '#a78bfa', '#fbbf24'] },
  { id: 'turbo', name: '極速隊長', short: '極速', colors: ['#ef4444', '#111827', '#f59e0b'] },
  { id: 'rex', name: '恐龍探險家', short: '恐龍', colors: ['#16a34a', '#14532d', '#bef264'] },
  { id: 'aqua', name: '海洋探險家', short: '海洋', colors: ['#0891b2', '#1d4ed8', '#67e8f9'] },
] as const;

const legacyMap: Record<string, string> = {
  '🚀': 'nova', '🦖': 'rex', '🦈': 'aqua', '🤖': 'titan', '🛸': 'nova',
  '🐯': 'thunder', '🦁': 'titan', '🚗': 'turbo', '🌟': 'nova', '⚡': 'thunder',
};

export function normalizeAvatarId(value?: string) {
  if (!value) return 'nova';
  if (avatarOptions.some((option) => option.id === value)) return value;
  return legacyMap[value] ?? 'nova';
}

export function avatarName(value?: string) {
  const id = normalizeAvatarId(value);
  return avatarOptions.find((option) => option.id === id)?.name ?? '星光少年';
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
  const stagedArt = `${id}-stage-${stage}.webp`;
  const imageSrc = `${import.meta.env.BASE_URL}assets/v40/characters/${stagedArt}`;
  const equippedItems = equippedCosmetics.map((cosmeticId) => cosmeticById.get(cosmeticId)).filter(Boolean) as Array<NonNullable<ReturnType<typeof cosmeticById.get>>>;
  const avatarSlots = new Set(['hairstyle','outfit','hat','glasses','backpack','cape','headphones']);
  const avatarItems = equippedItems.filter((item) => avatarSlots.has(item.slot));
  const cosmeticNames = equippedItems.map((item) => item.name);

  return (
    <div className={`avatar-hero avatar-photo-hero avatar-${id} stage-${stage}`} style={style} title={`${option.name} · Level ${level} · ${avatarStageName(xp)}`} data-stage={stage} data-cosmetics={equippedCosmetics.join(' ')}>
      <span className="avatar-photo-glow" aria-hidden="true" />
      <img src={imageSrc} alt={`${option.name}，${avatarStageName(xp)}`} loading="lazy" decoding="async" />
      {avatarItems.map((item) => <span key={item.id} className={`avatar-equipped-cosmetic cosmetic-${item.id} slot-${item.slot}`} aria-hidden="true" />)}
      {showStage && <span className="avatar-stage-label">Stage {stage}/5 · {avatarStageName(xp)}</span>}
      {showStage && cosmeticNames.length > 0 && <span className="avatar-cosmetic-summary" aria-label={`已裝備：${cosmeticNames.join('、')}`}>{cosmeticNames.length} 件裝備</span>}
    </div>
  );
}
