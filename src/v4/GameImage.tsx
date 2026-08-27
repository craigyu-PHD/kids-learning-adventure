import { useState } from 'react';

type Props = {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
};

/** Image wrapper with an intrinsic skeleton so slow networks never show an empty card. */
export default function GameImage({ src, alt, className = '', eager = false }: Props) {
  const [loaded, setLoaded] = useState(false);
  return <span className={`v4-smart-image ${loaded ? 'loaded' : 'loading'} ${className}`.trim()}>
    <span className="v4-image-skeleton" aria-hidden="true" />
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}
    />
  </span>;
}
