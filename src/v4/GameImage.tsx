import { useEffect, useState } from 'react';

type Props = {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
};

/** Image wrapper with an intrinsic skeleton so slow networks never show an empty card. */
export default function GameImage({ src, alt, className = '', eager = false }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState(src);

  useEffect(() => {
    setResolvedSrc(src);
    setLoaded(false);
  }, [src]);

  const handleError = () => {
    // YouTube's thumbnail host is not guaranteed to be reachable in a family
    // network. Keep the card intact with a local production illustration.
    if (resolvedSrc !== `${import.meta.env.BASE_URL}assets/v5/themes/space-hero-v2-thumb.webp`) {
      setResolvedSrc(`${import.meta.env.BASE_URL}assets/v5/themes/space-hero-v2-thumb.webp`);
      return;
    }
    setLoaded(true);
  };

  return <span className={`v4-smart-image ${loaded ? 'loaded' : 'loading'} ${className}`.trim()}>
    <span className="v4-image-skeleton" aria-hidden="true" />
    <img
      src={resolvedSrc}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={handleError}
    />
  </span>;
}
