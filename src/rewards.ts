import { curriculum } from './data/curriculum';
import type { ChildProgress } from './types';

export const BLOCK_REWARD = { xp: 15, coins: 5 };
export const EGG_REWARD = { xp: 25, coins: 10 };

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
  return {
    completedDays: Array.from(new Set(progress?.completedDays ?? [])),
    completedBlocks: Array.from(new Set(progress?.completedBlocks ?? [])),
    completedMissions: Array.from(new Set(progress?.completedMissions ?? [])),
    claimedEggs: Array.from(new Set(progress?.claimedEggs ?? [])),
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

  return { xp, coins };
}

export function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(xp / 220) + 1);
}

export function avatarStageFromXp(xp: number) {
  if (xp >= 1800) return 4;
  if (xp >= 1000) return 3;
  if (xp >= 420) return 2;
  return 1;
}

export function nextAvatarStageXp(xp: number) {
  if (xp < 420) return 420;
  if (xp < 1000) return 1000;
  if (xp < 1800) return 1800;
  return null;
}

export function rewardForMission(id: string) {
  return missionRewards.get(id) ?? null;
}
