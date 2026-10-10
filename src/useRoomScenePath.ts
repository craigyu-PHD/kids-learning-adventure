import { useEffect, useState } from 'react';
import manifest from './data/worldArtManifest.json';
import { roomSceneAssetPath } from './worldArtAssets';

/** Same full-size room content, with the existing WebP as a decode/network fallback. */
export function useRoomScenePath(itemId?: string) {
  const record = manifest.records.find(r => r.slot === 'room' && r.itemId === itemId);
  const alternate = record && 'alternateDelivery' in record ? record.alternateDelivery : undefined;
  const expected = `public/assets/v6.4/world/room/${itemId}.avif`;
  const candidate = alternate?.path === expected
    ? `${import.meta.env.BASE_URL}${expected.slice('public/'.length)}` : undefined;
  const fallback = itemId ? roomSceneAssetPath(itemId) : undefined;
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (!candidate || failed.has(candidate)) return;
    // CSS backgrounds have no error event; this shares the preload request.
    const probe = new Image();
    probe.onerror = () => setFailed(previous => new Set(previous).add(candidate));
    probe.src = candidate;
    return () => { probe.onerror = null; };
  }, [candidate, failed]);
  return candidate && !failed.has(candidate) ? candidate : fallback;
}
