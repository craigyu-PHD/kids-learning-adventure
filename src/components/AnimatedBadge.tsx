export type BadgeArt = 'rocket' | 'treasure' | 'star' | 'xp' | 'crystal' | 'trophy';

export default function AnimatedBadge({ art, size = 42, label }: { art: BadgeArt; size?: number; label?: string }) {
  const src = `${import.meta.env.BASE_URL}assets/generated/badge-${art}.gif`;
  return <img className="animated-badge-art" src={src} width={size} height={size} alt={label ?? ''} aria-hidden={label ? undefined : true} loading="lazy" decoding="async" />;
}
