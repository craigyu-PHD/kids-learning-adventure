import { useEffect, useRef, useState } from 'react';
import { cosmeticById, cosmeticAssetPath } from '../cosmetics';
import { useWorldDisplayPath } from '../useWorldDisplayPath';
import '../styles/components/pet.css';

/** Pet ownership lives in the existing equipment ledger; only greeting UI is local. */
export default function PetCompanion({ itemId, learnerName, preview = false }: {
  itemId: string; learnerName: string; preview?: boolean;
}) {
  const item = cosmeticById.get(itemId);
  const image = useRef<HTMLImageElement>(null);
  const preferred = useWorldDisplayPath(itemId, 'pet', image);
  const fallback = item ? cosmeticAssetPath(item) : undefined;
  const [failed, setFailed] = useState<string>();
  const [greeting, setGreeting] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const src = failed === preferred ? fallback : preferred ?? fallback;
  const unavailable = !!fallback && failed === fallback;
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!item || item.slot !== 'pet') return null;
  const greet = () => {
    setGreeting(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setGreeting(false), 900);
  };
  return <section className={`v653-pet-companion ${preview ? 'is-preview' : 'v4-panel'} ${greeting ? 'is-greeting' : ''}`}
    data-pet-item={itemId} data-pet-status={unavailable ? 'unavailable' : 'ready'} data-pet-reaction={greeting ? 'playing' : 'resting'} aria-label={`${learnerName}的寵物`}>
    <button type="button" className="v653-pet-greet" onClick={greet} disabled={unavailable} aria-label={`和${item.name}打招呼`}>
      {!unavailable && <img ref={image} src={src || undefined} className="v653-pet-art" alt={item.name} width="120" height="140" decoding="async" onError={() => setFailed(src)}/>}
    </button>
    <div className="v653-pet-copy"><h3>{item.name}</h3><p aria-live="polite">{unavailable ? '寵物圖片暫時無法載入。' : greeting ? '嗨！一起去探險吧！' : `${learnerName}的冒險寵物`}</p>
      {unavailable ? <button type="button" className="v653-pet-retry" onClick={() => setFailed(undefined)}>重新載入圖片</button> : <small>點狐狸打招呼</small>}
    </div>
  </section>;
}
