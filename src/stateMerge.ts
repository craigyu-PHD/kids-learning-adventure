import { normalizeProgress } from './rewards';
import type { AppProgress, ChildProfile, ChildProgress } from './types';

function union(valuesA?: string[], valuesB?: string[]) {
  return Array.from(new Set([...(valuesA ?? []), ...(valuesB ?? [])]));
}

function immutableUnion<T extends { id: string }>(a?: T[], b?: T[]) {
  const map = new Map<string, T>();
  for (const item of [...(a ?? []), ...(b ?? [])]) {
    if (!item?.id) continue;
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return Array.from(map.values());
}

function earliestRecord(a?: Record<string, string>, b?: Record<string, string>) {
  const result: Record<string, string> = { ...(a ?? {}) };
  for (const [key, value] of Object.entries(b ?? {})) {
    const current = result[key];
    if (!current || value.localeCompare(current) < 0) result[key] = value;
  }
  return result;
}

export function mergeChildProgress(a?: Partial<ChildProgress> | null, b?: Partial<ChildProgress> | null): ChildProgress {
  return normalizeProgress({
    completedDays: union(a?.completedDays, b?.completedDays),
    completedBlocks: union(a?.completedBlocks, b?.completedBlocks),
    completedMissions: union(a?.completedMissions, b?.completedMissions),
    claimedEggs: union(a?.claimedEggs, b?.claimedEggs),
    unlockedCosmetics: union(a?.unlockedCosmetics, b?.unlockedCosmetics),
    equippedCosmetics: union(a?.equippedCosmetics, b?.equippedCosmetics),
    purchaseTransactions: immutableUnion(a?.purchaseTransactions, b?.purchaseTransactions),
    equipmentTransactions: immutableUnion(a?.equipmentTransactions, b?.equipmentTransactions),
    rewardTransactions: immutableUnion(a?.rewardTransactions, b?.rewardTransactions),
    answerEvents: immutableUnion(a?.answerEvents, b?.answerEvents),
    badgeUnlocks: earliestRecord(a?.badgeUnlocks, b?.badgeUnlocks),
    completionTimestamps: earliestRecord(a?.completionTimestamps, b?.completionTimestamps),
  });
}

export function mergeProgressMaps(a?: AppProgress | null, b?: AppProgress | null, children: ChildProfile[] = []): AppProgress {
  const result: AppProgress = {};
  const ids = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {}), ...children.map((child) => child.id)]);
  for (const id of ids) result[id] = mergeChildProgress(a?.[id], b?.[id]);
  return result;
}

export function progressEqual(a: AppProgress, b: AppProgress) {
  return JSON.stringify(a) === JSON.stringify(b);
}
