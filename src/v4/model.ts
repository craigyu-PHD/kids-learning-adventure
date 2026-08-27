import type { AppProgress, CourseDay, LessonBlock } from '../types';
import { calculateRewards, levelFromXp } from '../rewards';

export type DailyStatus = 'completed' | 'today' | 'locked' | 'missed' | 'special';

export type V4Lesson = {
  id: string;
  index: number;
  subject: LessonBlock['subject'];
  title: string;
  duration: number;
  warmup: LessonBlock['warmup'];
  video: LessonBlock['video'];
  vocabulary: string[];
  sentencePatterns: string[];
  activities: LessonBlock['steps'];
  missions: LessonBlock['missions'];
  younger: string;
  older: string;
  caregiverTip: string;
};

export type V4DailyChallenge = {
  date: string;
  dayNumber: number;
  status: DailyStatus;
  title: string;
  theme: string;
  bigIdea: string;
  lessons: [V4Lesson, V4Lesson];
  specialEvent: boolean;
};

export function toV4Lesson(block: LessonBlock, index: number): V4Lesson {
  return {
    id: block.id,
    index,
    subject: block.subject,
    title: block.title,
    duration: block.duration,
    warmup: block.warmup,
    video: block.video,
    vocabulary: block.vocabulary,
    sentencePatterns: [block.sentence],
    activities: block.steps,
    missions: block.missions,
    younger: block.younger,
    older: block.older,
    caregiverTip: block.caregiverTip,
  };
}

export function toV4DailyChallenge(day: CourseDay, date: string, status: DailyStatus, specialEvent = false): V4DailyChallenge {
  return {
    date,
    dayNumber: day.index,
    status,
    title: day.title,
    theme: day.theme,
    bigIdea: day.bigIdea,
    lessons: [toV4Lesson(day.blocks[0], 1), toV4Lesson(day.blocks[1], 2)],
    specialEvent,
  };
}

export function youtubeThumb(videoId: string, quality: 'hq' | 'max' = 'hq') {
  return `https://i.ytimg.com/vi/${videoId}/${quality === 'max' ? 'maxresdefault' : 'hqdefault'}.jpg`;
}

export function subjectLabel(subject: LessonBlock['subject']) {
  if (subject === 'Zhuyin') return '中文語音';
  if (subject === 'English') return 'English';
  if (subject === 'Math') return 'Math';
  if (subject === 'Life') return 'Life';
  if (subject === 'Science') return 'Science';
  return 'Review';
}

export function playerResources(progress: AppProgress[string] | undefined) {
  const reward = calculateRewards(progress);
  const legacyStars = (progress?.completedBlocks?.length ?? 0) + (progress?.completedDays?.length ?? 0) * 2;
  const legacyGems = Object.keys(progress?.badgeUnlocks ?? {}).length * 2 + (progress?.claimedEggs?.length ?? 0) * 3;
  return {
    xp: reward.xp,
    coins: reward.coins,
    stars: legacyStars + reward.stars,
    gems: legacyGems + reward.gems,
    level: Math.min(15, Math.max(1, levelFromXp(reward.xp))),
  };
}

export function levelTitle(level: number) {
  if (level >= 15) return '傳奇英雄';
  if (level >= 10) return '超級勇者';
  if (level >= 5) return '星際勇者';
  return '學習新手';
}

export function xpToNextLevel(xp: number) {
  const currentLevel = Math.min(15, Math.max(1, Math.floor(xp / 220) + 1));
  if (currentLevel >= 15) return 0;
  return currentLevel * 220 - xp;
}
