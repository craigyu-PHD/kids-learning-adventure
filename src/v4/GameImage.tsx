import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
  deferUntilNearViewport?: boolean;
  fallbackLabel?: string;
  showFallbackLabel?: boolean;
  onFallbackChange?: (unavailable: boolean) => void;
};

/** Image wrapper with an intrinsic skeleton so slow networks never show an empty card. */
export default function GameImage(props: Props) {
  return <ImageContent key={props.src} {...props} />;
}

function ImageContent({ src, alt, className = '', eager = false, deferUntilNearViewport = false, fallbackLabel, showFallbackLabel = true, onFallbackChange }: Props) {
  const container = useRef<HTMLSpanElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const shouldLoad = eager || !deferUntilNearViewport || nearViewport;
  const fallback = `${import.meta.env.BASE_URL}assets/v5/themes/space-hero-v2.webp`;
  const [loaded, setLoaded] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState(src);
  const unavailable = resolvedSrc === fallback && src !== fallback;

  useEffect(() => { onFallbackChange?.(unavailable); }, [unavailable, onFallbackChange]);

  useEffect(() => {
    if (shouldLoad) return;
    if (!('IntersectionObserver' in window)) { setNearViewport(true); return; }
    const node = container.current;
    if (!node) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: '200px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  const handleError = () => {
    // YouTube's thumbnail host is not guaranteed to be reachable in a family
    // network. Keep the card intact with a local production illustration.
    if (resolvedSrc !== fallback) {
      setResolvedSrc(fallback);
      return;
    }
    setLoaded(true);
  };

  useLayoutEffect(() => {
    const node = image.current;
    if (!node?.complete) return;
    if (node.naturalWidth > 0) setLoaded(true);
    else handleError();
  }, [resolvedSrc, shouldLoad]);

  return <span ref={container} className={`v4-smart-image ${loaded ? 'loaded' : 'loading'} ${className}`.trim()}>
    <span className="v4-image-skeleton" aria-hidden="true" />
    {shouldLoad && <img
      ref={image}
      src={resolvedSrc}
      alt={unavailable && fallbackLabel ? fallbackLabel : alt}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={handleError}
    />}
    {unavailable && showFallbackLabel && fallbackLabel && <span className="v64-image-fallback-label">{fallbackLabel}</span>}
  </span>;
}
