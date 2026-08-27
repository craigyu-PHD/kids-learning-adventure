import { cosmeticSpend, normalizeEquippedCosmetics } from './cosmetics';
import { curriculum } from './data/curriculum';
import type { ChildProgress } from './types';

export const BLOCK_REWARD = { xp: 15, coins: 5 };
export const EGG_REWARD = { xp: 25, coins: 10 };
export const DAILY_COMPLETE_BONUS = { xp: 10, coins: 5, stars: 3, gems: 1 };
export const FIRST_DAILY_BONUS = { xp: 5, coins: 2, stars: 1, gems: 0 };
export const SPECIAL_TASK_BONUS = { xp: 8, coins: 4, stars: 1, gems: 1 };

export function accuracyBonus(correct: number, total: number) {
  if (total <= 0) return { rate: 0, xp: 0, coins: 0, stars: 0, gems: 0 };
  const rate = Math.round((correct / total) * 100);
  if (rate === 100) return { rate, xp: 8, coins: 3, stars: 2, gems: 0 };
  if (rate >= 80) return { rate, xp: 5, coins: 2, stars: 1, gems: 0 };
  if (rate >= 50) return { rate, xp: 2, coins: 1, stars: 1, gems: 0 };
  return { rate, xp: 0, coins: 0, stars: 0, gems: 0 };
}

export const easterEggDays = new Set([7, 18, 36, 54, 72, 90]);
const validEggIds = new Set(Array.from(easterEggDays, (day) => `egg-day-${day}`));

const missionRewards = new Map<string, { xp: number; coins: number }>();
const knownBlocks = new Set<string>();

curriculum.forEach((day) => {
  day.blocks.forEach((block) => {
    knownBlocks.add(block.id);
    block.missions.forEach((mission) => missionRewards.set(mission.id, { xp: mission.xp, coins: mission.coins }));
  });
});

export function normalizeProgress(progress?: Partial<ChildProgress> | null): ChildProgress {
  const unlockedCosmetics = Array.from(new Set(progress?.unlockedCosmetics ?? []));
  return {
    completedDays: Array.from(new Set(progress?.completedDays ?? [])),
    completedBlocks: Array.from(new Set(progress?.completedBlocks ?? [])),
    completedMissions: Array.from(new Set(progress?.completedMissions ?? [])),
    claimedEggs: Array.from(new Set(progress?.claimedEggs ?? [])),
    unlockedCosmetics,
    equippedCosmetics: normalizeEquippedCosmetics(unlockedCosmetics, progress?.equippedCosmetics),
    badgeUnlocks: { ...(progress?.badgeUnlocks ?? {}) },
    completionTimestamps: { ...(progress?.completionTimestamps ?? {}) },
    rewardTransactions: Array.from(new Map((progress?.rewardTransactions ?? []).map((item) => [item.id, item])).values()),
    answerEvents: Array.from(new Map((progress?.answerEvents ?? []).map((item) => [item.id, item])).values()),
  };
}

export function calculateRewards(progress?: Partial<ChildProgress> | null) {
  const normalized = normalizeProgress(progress);
  let xp = 0;
  let coins = 0;

  normalized.completedMissions.forEach((id) => {
    const reward = missionRewards.get(id);
    if (!reward) return;
    xp += reward.xp;
    coins += reward.coins;
  });

  normalized.completedBlocks.forEach((id) => {
    if (!knownBlocks.has(id)) return;
    xp += BLOCK_REWARD.xp;
    coins += BLOCK_REWARD.coins;
  });

  normalized.claimedEggs.forEach((id) => {
    if (!validEggIds.has(id)) return;
    xp += EGG_REWARD.xp;
    coins += EGG_REWARD.coins;
  });

  normalized.rewardTransactions?.forEach((transaction) => {
    xp += transaction.xp;
    coins += transaction.coins;
  });

  const earnedCoins = coins;
  const spentCoins = cosmeticSpend(normalized.unlockedCosmetics);
  coins = Math.max(0, earnedCoins - spentCoins);

  const stars = normalized.rewardTransactions?.reduce((sum, transaction) => sum + transaction.stars, 0) ?? 0;
  const gems = normalized.rewardTransactions?.reduce((sum, transaction) => sum + transaction.gems, 0) ?? 0;
  return { xp, coins, earnedCoins, spentCoins, stars, gems };
}

export function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(xp / 220) + 1);
}

export const avatarStageNames = ['Little Explorer', 'Adventure Rookie', 'Star Explorer', 'Adventure Master', 'Legendary Explorer'] as const;
// V4 visual evolution aligns major transformations with Lv.1 / Lv.5 / Lv.10 / Lv.15.
// Stage 4 is an additional late-game upgrade before the Lv.15 Legendary form.
export const avatarStageThresholds = [0, 880, 1980, 2640, 3080] as const;

export function avatarStageFromXp(xp: number) {
  if (xp >= avatarStageThresholds[4]) return 5;
  if (xp >= avatarStageThresholds[3]) return 4;
  if (xp >= avatarStageThresholds[2]) return 3;
  if (xp >= avatarStageThresholds[1]) return 2;
  return 1;
}

export function nextAvatarStageXp(xp: number) {
  return avatarStageThresholds.find((threshold) => threshold > xp) ?? null;
}

export function avatarStageName(xp: number) {
  return avatarStageNames[avatarStageFromXp(xp) - 1];
}

export function rewardForMission(id: string) {
  return missionRewards.get(id) ?? null;
}
