import type { CSSProperties } from 'react';
import { avatarStageFromXp, levelFromXp } from '../rewards';

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

export default function AvatarHero({ avatarId, xp = 0, size = 82, showStage = false }: {
  avatarId?: string;
  xp?: number;
  size?: number;
  showStage?: boolean;
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
  const v22BaseArt: Record<string, string> = {
    nova: 'avatar-brother.webp',
    thunder: 'avatar-brother.webp',
    titan: 'avatar-mother.webp',
    turbo: 'avatar-father.webp',
    rex: 'avatar-younger.webp',
    aqua: 'avatar-robot.webp',
  };
  const stagedArt = id === 'nova'
    ? `brother-stage-${stage}.webp`
    : id === 'rex'
      ? `younger-stage-${stage}.webp`
      : v22BaseArt[id];
  const imageSrc = `${import.meta.env.BASE_URL}assets/v23/${showStage ? stagedArt : v22BaseArt[id]}`;

  return (
    <div className={`avatar-hero avatar-photo-hero avatar-${id} stage-${stage}`} style={style} title={`${option.name} · Level ${level}`}>
      <span className="avatar-photo-glow" aria-hidden="true" />
      <img src={imageSrc} alt={option.name} loading="lazy" decoding="async" />
      {showStage && <span className="avatar-stage-label">進化 {stage}/4</span>}
    </div>
  );
}
