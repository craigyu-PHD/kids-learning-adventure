export type BadgeArt = 'rocket' | 'treasure' | 'star' | 'xp' | 'crystal' | 'trophy';

export default function AnimatedBadge({ art, size = 42, label }: { art: BadgeArt; size?: number; label?: string }) {
  const base = `${import.meta.env.BASE_URL}assets/v40/rewards/`;
  const fileMap: Record<BadgeArt, string> = { rocket:'xp.webp', treasure:'treasure.webp', star:'star.webp', xp:'xp.webp', crystal:'gem.webp', trophy:'star.webp' };
  const src = `${base}${fileMap[art]}`;
  const fallback = `${base}star.webp`;
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
