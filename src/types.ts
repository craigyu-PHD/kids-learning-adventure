export type ThemeMode = 'system' | 'light' | 'dark';
export type Subject = 'English' | 'Math' | 'Zhuyin' | 'Life' | 'Science' | 'Review';

export type VideoClip = {
  id: string;
  title: string;
  channel: string;
  videoId: string;
  start?: number;
  end?: number;
  sourceUrl?: string;
};

export type LessonStep = {
  minute: string;
  title: string;
  instruction: string;
  cue?: string;
};

export type InteractiveMission = {
  id: string;
  title: string;
  prompt: string;
  kind: 'repeat' | 'race' | 'find' | 'move' | 'quiz' | 'match' | 'count' | 'roleplay';
  xp: number;
  coins: number;
};

export type LessonBlock = {
  id: string;
  title: string;
  subject: Subject;
  duration: number;
  warmup: VideoClip;
  video: VideoClip;
  vocabulary: string[];
  sentence: string;
  steps: LessonStep[];
  missions: InteractiveMission[];
  younger: string;
  older: string;
  caregiverTip: string;
};

export type CourseDay = {
  id: string;
  index: number;
  week: number;
  weekday: number;
  title: string;
  theme: string;
  emoji: string;
  bigIdea: string;
  blocks: [LessonBlock, LessonBlock];
  bonus: string;
};

export type ChildProfile = {
  id: string;
  name: string;
  avatar: string;
};

export type ChildProgress = {
  xp: number;
  coins: number;
  completedDays: string[];
  completedBlocks: string[];
  completedMissions: string[];
};

export type AppSettings = {
  theme: ThemeMode;
  semesterStart: string;
  children: ChildProfile[];
};

export type AppProgress = Record<string, ChildProgress>;
