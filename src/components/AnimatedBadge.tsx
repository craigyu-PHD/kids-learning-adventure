export type BadgeArt = 'rocket' | 'treasure' | 'star' | 'xp' | 'crystal' | 'trophy';

const badgeFiles: Record<BadgeArt, string> = {
  rocket: 'badge-rocket.webp',
  treasure: 'badge-treasure.webp',
  star: 'badge-star.webp',
  xp: 'badge-xp.webp',
  crystal: 'badge-crystal.webp',
  trophy: 'badge-star.webp',
};

const fallbackFiles: Record<BadgeArt, string> = {
  rocket: 'hero-rocket.webp',
  treasure: 'hero-rocket.webp',
  star: 'robot-helper.webp',
  xp: 'robot-helper.webp',
  crystal: 'avatar-robot.webp',
  trophy: 'brother-stage-4.webp',
};

export default function AnimatedBadge({ art, size = 42, label }: { art: BadgeArt; size?: number; label?: string }) {
  const base = `${import.meta.env.BASE_URL}assets/v23/`;
  const src = `${base}${badgeFiles[art]}`;
  const fallback = `${base}${fallbackFiles[art]}`;
  return (
    <img
      className="animated-badge-art v22-image-badge"
      src={src}
      width={size}
      height={size}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      loading="lazy"
      decoding="async"
      onError={(event) => {
        if (event.currentTarget.src === fallback) return;
        event.currentTarget.src = fallback;
      }}
    />
  );
}
