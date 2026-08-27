import { curriculum } from './data/curriculum';
import type { ChildProgress } from './types';

export type BadgeCategory = 'streak' | 'speaking' | 'listening' | 'learning' | 'adventure' | 'special';

export type BadgeDefinition = {
  id: string;
  category: BadgeCategory;
  name: string;
  description: string;
  rare?: boolean;
  atlasIndex: number;
};

export const badges: BadgeDefinition[] = [
  { id: 'streak-3', category: 'streak', name: '3 Days', description: '連續完成 3 個學習日。', atlasIndex: 0 },
  { id: 'streak-7', category: 'streak', name: '7 Days', description: '連續完成 7 個學習日。', atlasIndex: 1 },
  { id: 'streak-14', category: 'streak', name: '14 Days', description: '連續完成 14 個學習日。', rare: true, atlasIndex: 2 },
  { id: 'streak-30', category: 'streak', name: '30 Days', description: '連續完成 30 個學習日。', rare: true, atlasIndex: 3 },
  { id: 'speaking-first-word', category: 'speaking', name: 'First Word', description: '完成第一個開口說英文的任務。', atlasIndex: 4 },
  { id: 'speaking-brave', category: 'speaking', name: 'Brave Speaker', description: '完成 10 個 Speaking 任務。', atlasIndex: 5 },
  { id: 'speaking-sentence', category: 'speaking', name: 'Sentence Star', description: '完成 30 個 Speaking 任務。', rare: true, atlasIndex: 6 },
  { id: 'speaking-hero', category: 'speaking', name: 'Speaking Hero', description: '完成 80 個 Speaking 任務。', rare: true, atlasIndex: 7 },
  { id: 'listening-good', category: 'listening', name: 'Good Listener', description: '完成第一節正式學習。', atlasIndex: 8 },
  { id: 'listening-sound-hunter', category: 'listening', name: 'Sound Hunter', description: '完成 10 節正式學習。', atlasIndex: 9 },
  { id: 'listening-music-explorer', category: 'listening', name: 'Music Explorer', description: '完成 30 節正式學習。', rare: true, atlasIndex: 10 },
  { id: 'listening-master', category: 'listening', name: 'Listening Master', description: '完成 80 節正式學習。', rare: true, atlasIndex: 11 },
  { id: 'learning-first-mission', category: 'learning', name: 'First Mission', description: '完成第一個互動任務。', atlasIndex: 12 },
  { id: 'learning-10', category: 'learning', name: '10 Missions', description: '累積完成 10 個任務。', atlasIndex: 13 },
  { id: 'learning-50', category: 'learning', name: '50 Missions', description: '累積完成 50 個任務。', rare: true, atlasIndex: 14 },
  { id: 'learning-100', category: 'learning', name: '100 Missions', description: '累積完成 100 個任務。', rare: true, atlasIndex: 15 },
  { id: 'adventure-world-explorer', category: 'adventure', name: 'World Explorer', description: '完成 5 個不同的冒險日。', atlasIndex: 16 },
  { id: 'adventure-forest', category: 'adventure', name: 'Forest Hero', description: '完成 Animal Forest 主題挑戰。', atlasIndex: 17 },
  { id: 'adventure-ocean', category: 'adventure', name: 'Ocean Hero', description: '完成 Ocean Adventure 主題挑戰。', atlasIndex: 18 },
  { id: 'adventure-space', category: 'adventure', name: 'Space Hero', description: '完成 Space Station 主題挑戰。', rare: true, atlasIndex: 19 },
  { id: 'special-perfect-day', category: 'special', name: 'Perfect Day', description: '完整通關一個 Daily Challenge。', atlasIndex: 20 },
  { id: 'special-early-bird', category: 'special', name: 'Early Bird', description: '在上午 9 點前完成 Daily Challenge。', rare: true, atlasIndex: 21 },
  { id: 'special-comeback', category: 'special', name: 'Comeback Kid', description: '休息一段時間後重新完成一次挑戰。', atlasIndex: 22 },
  { id: 'special-super-explorer', category: 'special', name: 'Super Explorer', description: '完成全部 90 個學習日。', rare: true, atlasIndex: 23 },
];

export const badgeById = new Map(badges.map((badge) => [badge.id, badge]));

const missionKinds = new Map<string, string>();
const dayTopics = new Map<string, Set<string>>();
const dayIndexById = new Map<string, number>();

for (const day of curriculum) {
  dayIndexById.set(day.id, day.index);
  const topics = new Set<string>();
  for (const block of day.blocks) {
    for (const topic of block.requiredVideoTopics ?? []) topics.add(topic);
    for (const mission of block.missions) missionKinds.set(mission.id, mission.kind);
  }
  dayTopics.set(day.id, topics);
}

function longestCompletedRun(progress: ChildProgress) {
  const indexes = progress.completedDays
    .map((id) => dayIndexById.get(id))
    .filter((value): value is number => typeof value === 'number')
    .sort((a, b) => a - b);
  let longest = 0;
  let current = 0;
  let previous = -999;
  for (const index of indexes) {
    current = index === previous + 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = index;
  }
  return longest;
}

function hasTopicDay(progress: ChildProgress, topicSet: Set<string>) {
  return progress.completedDays.some((dayId) => {
    const topics = dayTopics.get(dayId);
    if (!topics) return false;
    return Array.from(topicSet).some((topic) => topics.has(topic));
  });
}

function hasComeback(progress: ChildProgress) {
  const indexes = progress.completedDays
    .map((id) => dayIndexById.get(id))
    .filter((value): value is number => typeof value === 'number')
    .sort((a, b) => a - b);
  return indexes.some((index, i) => i > 0 && index - indexes[i - 1] >= 6);
}

function hasEarlyBird(progress: ChildProgress) {
  return Object.values(progress.completionTimestamps ?? {}).some((iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return false;
    const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', hour: '2-digit', hour12: false }).format(date));
    return hour < 9;
  });
}

export function eligibleBadgeIds(progress: ChildProgress) {
  const result = new Set<string>();
  const streak = longestCompletedRun(progress);
  const speakingCount = progress.completedMissions.filter((id) => {
    const kind = missionKinds.get(id);
    return kind === 'repeat' || kind === 'roleplay';
  }).length;
  const missionCount = progress.completedMissions.length;
  const blockCount = progress.completedBlocks.length;
  const dayCount = progress.completedDays.length;

  if (streak >= 3) result.add('streak-3');
  if (streak >= 7) result.add('streak-7');
  if (streak >= 14) result.add('streak-14');
  if (streak >= 30) result.add('streak-30');

  if (speakingCount >= 1) result.add('speaking-first-word');
  if (speakingCount >= 10) result.add('speaking-brave');
  if (speakingCount >= 30) result.add('speaking-sentence');
  if (speakingCount >= 80) result.add('speaking-hero');

  if (blockCount >= 1) result.add('listening-good');
  if (blockCount >= 10) result.add('listening-sound-hunter');
  if (blockCount >= 30) result.add('listening-music-explorer');
  if (blockCount >= 80) result.add('listening-master');

  if (missionCount >= 1) result.add('learning-first-mission');
  if (missionCount >= 10) result.add('learning-10');
  if (missionCount >= 50) result.add('learning-50');
  if (missionCount >= 100) result.add('learning-100');

  if (dayCount >= 5) result.add('adventure-world-explorer');
  if (hasTopicDay(progress, new Set(['animals', 'pets', 'farm', 'zoo', 'wild-animals']))) result.add('adventure-forest');
  if (hasTopicDay(progress, new Set(['ocean']))) result.add('adventure-ocean');
  if (hasTopicDay(progress, new Set(['space', 'sky']))) result.add('adventure-space');

  if (dayCount >= 1) result.add('special-perfect-day');
  if (hasEarlyBird(progress)) result.add('special-early-bird');
  if (hasComeback(progress)) result.add('special-comeback');
  if (dayCount >= 90) result.add('special-super-explorer');

  return result;
}

export function applyNewBadgeUnlocks(previous: ChildProgress, next: ChildProgress, earnedDate: string) {
  const beforeEligible = eligibleBadgeIds(previous);
  const afterEligible = eligibleBadgeIds(next);
  const unlocks = { ...(previous.badgeUnlocks ?? {}), ...(next.badgeUnlocks ?? {}) };
  const newBadgeIds: string[] = [];

  for (const badgeId of afterEligible) {
    if (beforeEligible.has(badgeId) || unlocks[badgeId]) continue;
    unlocks[badgeId] = earnedDate;
    newBadgeIds.push(badgeId);
  }

  return {
    progress: { ...next, badgeUnlocks: unlocks },
    newBadgeIds,
  };
}
