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
  className,
  deferPlayback = false,
}: {
  webm?: string;
  poster: string;
  alt: string;
  size?: number;
  loop?: boolean;
  className?: string;
  /** Keep the poster as the first paint, then load/play WebM after that paint. */
  deferPlayback?: boolean;
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
    let delayedStart: number | undefined;
    const play = () => {
      if (deferPlayback) {
        window.clearTimeout(delayedStart);
        delayedStart = window.setTimeout(() => v.play().catch(() => {}), 1200);
      } else {
        v.play().catch(() => {});
      }
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) play();
        else {
          window.clearTimeout(delayedStart);
          v.pause();
        }
      });
    });
    io.observe(v);
    return () => {
      window.clearTimeout(delayedStart);
      io.disconnect();
    };
  }, [deferPlayback]);
  if (!webm) {
    return <img className={className} src={poster} alt={alt} width={size} height={size} loading="lazy" style={{ width: size, height: size, objectFit: 'contain' }} />;
  }
  return (
    <video
      ref={ref}
      className={className}
      autoPlay={!deferPlayback}
      muted
      loop={loop}
      playsInline
      preload={deferPlayback ? "none" : "metadata"}
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
