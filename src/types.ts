export type ThemeMode = 'system' | 'light' | 'dark';
export type AdventureTheme = 'hero' | 'mecha' | 'tank' | 'racing' | 'creature';
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
  criteria: string;
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

export type FamilyUserRole = 'father' | 'mother' | 'caregiver' | 'child' | 'other';

export type ChildProfile = {
  id: string;
  name: string;
  avatar: string;
  role?: FamilyUserRole;
  disabled?: boolean;
  userPinHash?: string;
  userPinSalt?: string;
  userPinIterations?: number;
};

export type ChildProgress = {
  /** Legacy V1 fields are accepted but ignored by V2's derived reward engine. */
  xp?: number;
  coins?: number;
  completedDays: string[];
  completedBlocks: string[];
  completedMissions: string[];
  claimedEggs: string[];
};

export type CloudSyncSettings = {
  enabled: boolean;
  familyCode: string;
};

export type AppSettings = {
  theme: ThemeMode;
  visualTheme: AdventureTheme;
  semesterStart: string;
  children: ChildProfile[];
  cloudSync: CloudSyncSettings;
};

export type AppProgress = Record<string, ChildProgress>;

export type ViewingStatus = 'full' | 'partial' | 'skip';
export type DayReflection = {
  engagement: '' | 'great' | 'ok' | 'tired';
  note: string;
  viewing: Record<string, ViewingStatus>;
};

export type ReflectionMap = Record<string, DayReflection>;
export type AttendanceMap = Record<string, string[]>;

export type CloudSnapshot = {
  version: 2;
  updatedAt: string;
  settings: AppSettings;
  progress: AppProgress;
  attendance: AttendanceMap;
  reflections: ReflectionMap;
};
