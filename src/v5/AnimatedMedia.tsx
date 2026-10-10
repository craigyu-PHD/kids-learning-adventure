import { useEffect, useRef, useState } from 'react';

/**
 * V5 Animated Media — WebM Alpha > Rive > Animated WebP > Lottie > GIF fallback
 * P43 structure: autoplay muted loop playsinline poster + IntersectionObserver + reduced-motion
 */
export default function AnimatedMedia({
  webm,
  poster,
  posterFallback,
  alt,
  size = 512,
  loop = true,
  className,
  fitContainer = false,
  deferPlayback = false,
  deferUntilNearViewport = false,
  onEnded,
  onPlaybackError,
}: {
  webm?: string;
  poster: string;
  /** Original poster used if a smaller delivery image fails to load. */
  posterFallback?: string;
  alt: string;
  size?: number;
  loop?: boolean;
  className?: string;
  /** Fit a sized control while retaining the media's intrinsic dimensions. */
  fitContainer?: boolean;
  /** Keep the poster as the first paint, then load/play WebM after that paint. */
  deferPlayback?: boolean;
  /** Do not request poster/video bytes until the media is near the viewport. */
  deferUntilNearViewport?: boolean;
  onEnded?: () => void;
  onPlaybackError?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failedPoster, setFailedPoster] = useState<string>();
  const [nearViewport, setNearViewport] = useState(!deferUntilNearViewport);
  const posterSrc = failedPoster === poster ? (posterFallback ?? poster) : poster;
  const mediaReady = !deferUntilNearViewport || nearViewport;
  useEffect(() => {
    if (!deferUntilNearViewport || nearViewport) return;
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) { setNearViewport(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: '320px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [deferUntilNearViewport, nearViewport]);
  useEffect(() => {
    if (!mediaReady || !posterFallback || posterFallback === poster) return;
    // Video does not emit an error when its poster fails. The image request
    // shares the browser cache with the poster and gives it a fallback path.
    const probe = new Image();
    probe.onerror = () => setFailedPoster(poster);
    probe.src = poster;
    return () => { probe.onerror = null; };
  }, [mediaReady, poster, posterFallback]);
  useEffect(() => {
    const v = ref.current;
    if (!v || !mediaReady) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let delayedStart: number | undefined;
    const pause = () => {
      window.clearTimeout(delayedStart);
      v.pause();
    };
    const play = () => {
      pause();
      if (motion.matches || !visible) return;
      if (deferPlayback) {
        delayedStart = window.setTimeout(() => {
          if (!motion.matches && visible) v.play().catch(() => {});
        }, 1200);
      } else {
        v.play().catch(() => {});
      }
    };
    motion.addEventListener('change', play);
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        visible = e.isIntersecting;
        play();
      });
    }) : undefined;
    if (io) io.observe(v);
    else {
      visible = true;
      play();
    }
    return () => {
      pause();
      motion.removeEventListener('change', play);
      io?.disconnect();
    };
  }, [deferPlayback, webm, mediaReady]);
  if (!webm) {
    return <img className={className} src={mediaReady ? posterSrc : undefined} alt={alt} width={size} height={size} loading="lazy" style={{ width: fitContainer ? '100%' : size, height: fitContainer ? '100%' : size, objectFit: 'contain' }} />;
  }
  return (
    <video
      ref={ref}
      className={className}
      muted
      onEnded={onEnded}
      onError={onPlaybackError}
      loop={loop}
      playsInline
      preload={deferPlayback || !mediaReady ? "none" : "metadata"}
      poster={mediaReady ? posterSrc : undefined}
      aria-label={alt}
      width={size}
      height={size}
      style={{ width: fitContainer ? '100%' : size, height: fitContainer ? '100%' : size, objectFit: 'contain' }}
    >
      {mediaReady && <source src={webm} type="video/webm" onError={onPlaybackError} />}
      {mediaReady && <img src={posterSrc} alt={alt} />}
    </video>
  );
}
