import { badgeById, type BadgeDefinition } from '../badges';

export default function GameBadge({ badge, unlocked = false, earnedDate, size = 96, label = true }: {
  badge: BadgeDefinition | string;
  unlocked?: boolean;
  earnedDate?: string;
  size?: number;
  label?: boolean;
}) {
  const definition = typeof badge === 'string' ? badgeById.get(badge) : badge;
  if (!definition) return null;
  const src = `${import.meta.env.BASE_URL}assets/v40/badges/${definition.id}.webp`;
  return (
    <div className={`v30-game-badge ${unlocked ? 'unlocked' : 'locked'} ${definition.rare ? 'rare' : ''}`}>
      <img
        className="v30-game-badge-art"
        src={src}
        width={size}
        height={size}
        alt={`${definition.name}${unlocked ? '，已解鎖' : '，未解鎖'}`}
        loading="lazy"
        decoding="async"
      />
      {label && <span className="v30-game-badge-copy"><strong>{definition.name}</strong><small>{definition.description}</small>{unlocked && earnedDate && <em>{earnedDate}</em>}</span>}
    </div>
  );
}
