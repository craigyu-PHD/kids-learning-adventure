import type { CSSProperties } from 'react';
import { avatarStageFromXp, levelFromXp } from '../rewards';

export const avatarOptions = [
  { id: 'nova', name: '星光勇者', short: '星勇', symbol: '★', colors: ['#5b5cf0', '#39c6e3', '#ffd166'] },
  { id: 'thunder', name: '雷霆守衛', short: '雷衛', symbol: '⚡', colors: ['#2450d8', '#7dd3fc', '#facc15'] },
  { id: 'titan', name: '鋼甲巨衛', short: '鋼衛', symbol: '◆', colors: ['#d9485f', '#64748b', '#fbbf24'] },
  { id: 'turbo', name: '極速騎士', short: '速騎', symbol: '➤', colors: ['#ef4444', '#111827', '#f59e0b'] },
  { id: 'rex', name: '暴龍機兵', short: '龍兵', symbol: '▲', colors: ['#16a34a', '#14532d', '#bef264'] },
  { id: 'aqua', name: '深海先鋒', short: '海鋒', symbol: '✦', colors: ['#0891b2', '#1d4ed8', '#67e8f9'] },
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
  return avatarOptions.find((option) => option.id === id)?.name ?? '星光勇者';
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

  return (
    <div className={`avatar-hero avatar-${id} stage-${stage}`} style={style} title={`${option.name} · Level ${level}`}>
      <svg viewBox="0 0 120 120" role="img" aria-label={`${option.name}，第 ${stage} 階`}>
        {stage >= 3 && <circle className="avatar-aura" cx="60" cy="60" r="54" />}
        {stage >= 2 && <path className="avatar-wing left" d="M30 53 7 43l12 23-10 10 28 4z" />}
        {stage >= 2 && <path className="avatar-wing right" d="m90 53 23-10-12 23 10 10-28 4z" />}
        <path className="avatar-shoulder" d="M25 102c3-20 16-30 35-30s32 10 35 30z" />
        <path className="avatar-helmet" d="M28 58c0-25 13-41 32-41s32 16 32 41v12c0 18-14 31-32 31S28 88 28 70z" />
        <path className="avatar-face" d="M37 60c5-11 15-17 23-17s18 6 23 17l-5 24c-5 7-11 11-18 11s-13-4-18-11z" />
        <path className="avatar-visor" d="M38 57c7-8 14-11 22-11s15 3 22 11l-4 13H42z" />
        <path className="avatar-mouth" d="M51 82h18" />
        <path className="avatar-brow left" d="m43 54 12-3" />
        <path className="avatar-brow right" d="m77 54-12-3" />
        <circle className="avatar-core" cx="60" cy="30" r={stage >= 4 ? 9 : 7} />
        <text className="avatar-symbol" x="60" y="34" textAnchor="middle">{option.symbol}</text>
        {stage >= 2 && <path className="avatar-fin" d="M49 20 60 4l11 16-11-5z" />}
        {stage >= 3 && <><circle className="avatar-spark s1" cx="17" cy="27" r="3" /><circle className="avatar-spark s2" cx="103" cy="24" r="4" /></>}
        {stage >= 4 && <path className="avatar-crown" d="m39 15 8-12 13 10L73 3l8 12-21 7z" />}
      </svg>
      {showStage && <span className="avatar-stage-label">進化 {stage}/4</span>}
    </div>
  );
}
