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
  rocket: 'star.webp',
  treasure: 'star.webp',
  star: 'star.webp',
  xp: 'star.webp',
  crystal: 'star.webp',
  trophy: 'star.webp',
};

export default function AnimatedBadge({ art, size = 42, label }: { art: BadgeArt; size?: number; label?: string }) {
  const base = `${import.meta.env.BASE_URL}assets/v30/rewards/`;
  const file = art === 'trophy' ? 'star.webp' : `${art}.webp`;
  const src = `${base}${file}`;
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
