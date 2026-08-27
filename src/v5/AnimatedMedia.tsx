import { useEffect, useRef } from 'react';

/**
 * V5 Animated Media — WebM Alpha > Rive > Animated WebP > Lottie > GIF fallback
 * P43 structure: autoplay muted loop playsinline poster + IntersectionObserver + reduced-motion
 */
export default function AnimatedMedia({
  webm,
  poster,
  alt,
  size = 512,
  loop = true,
}: {
  webm?: string;
  poster: string;
  alt: string;
  size?: number;
  loop?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.pause();
      return;
    }
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()));
    });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  if (!webm) {
    return <img src={poster} alt={alt} width={size} height={size} loading="lazy" style={{ width: size, height: size, objectFit: 'contain' }} />;
  }
  return (
    <video
      ref={ref}
      autoPlay
      muted
      loop={loop}
      playsInline
      poster={poster}
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain' }}
    >
      <source src={webm} type="video/webm" />
      <img src={poster} alt={alt} />
    </video>
  );
}
