export type ThemeMode = 'system' | 'light' | 'dark';
export type AdventureTheme = 'hero' | 'mecha' | 'tank' | 'racing' | 'creature';
export type Subject = 'English' | 'Math' | 'Zhuyin' | 'Life' | 'Science' | 'Review';

export type VideoClip = {
  id: string;
  title: string;
  channel: string;
  videoId: string;
  /** Human-audited semantic tags used by curriculum QA to prevent topic/video drift. */
  topics: string[];
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
  /** Exact lesson focus that the selected main video must support. */
  videoFocus: string;
  /** At least one of these tags must be declared by the main video. */
  requiredVideoTopics: string[];
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

export type FamilyUserRole = 'father' | 'mother' | 'caregiver' | 'other';

/**
 * Adult/caregiver account used to enter the family learning console.
 * These accounts may have their own PIN, but they do not own learning XP/progress.
 */
export type FamilyUserProfile = {
  id: string;
  name: string;
  role: FamilyUserRole;
  disabled?: boolean;
  userPinHash?: string;
  userPinSalt?: string;
  userPinIterations?: number;
};

/**
 * Learner profile. Learning progress, XP, coins, attendance and evolution are keyed by this id.
 * Legacy V2.1/V2.2 fields remain optional so existing local/cloud payloads can be migrated safely.
 */
export type ChildProfile = {
  id: string;
  name: string;
  avatar: string;
  disabled?: boolean;
  role?: FamilyUserRole | 'child';
  userPinHash?: string;
  userPinSalt?: string;
  userPinIterations?: number;
};

export type RewardTransaction = {
  id: string;
  kind: 'stage' | 'lesson' | 'day' | 'treasure' | 'achievement' | 'shop' | 'bonus';
  sourceId: string;
  xp: number;
  coins: number;
  stars: number;
  gems: number;
  createdAt: string;
};

export type AnswerEvent = {
  id: string;
  dayId: string;
  blockId: string;
  stage: number;
  target: string;
  answer: string;
  correct: boolean;
  /** Browser speech recognition confidence when a speaking attempt is supported. */
  confidence?: number;
  createdAt: string;
};

export type ChildProgress = {
  /** Legacy V1 fields are accepted but ignored by V2's derived reward engine. */
  xp?: number;
  coins?: number;
  completedDays: string[];
  completedBlocks: string[];
  completedMissions: string[];
  claimedEggs: string[];
  /** Additive V3.0 game-loop fields. They store immutable unlock records, never a mutable XP/coin total. */
  unlockedCosmetics?: string[];
  equippedCosmetics?: string[];
  badgeUnlocks?: Record<string, string>;
  completionTimestamps?: Record<string, string>;
  /** V4.0 append-only idempotent reward ledger. Existing V1–V3 snapshots may omit it. */
  rewardTransactions?: RewardTransaction[];
  /** V4.0 append-only answer telemetry used for real accuracy and error analytics. */
  answerEvents?: AnswerEvent[];
};

export type CloudSyncSettings = {
  enabled: boolean;
  familyCode: string;
};

export type AppSettings = {
  theme: ThemeMode;
  visualTheme: AdventureTheme;
  semesterStart: string;
  /** Adult/caregiver login accounts such as 爸爸、媽媽. */
  users: FamilyUserProfile[];
  /** Learners such as 哥哥、弟弟. */
  children: ChildProfile[];
  cloudSync: CloudSyncSettings;
};

export type AppProgress = Record<string, ChildProgress>;

export type ViewingStatus = 'full' | 'partial' | 'skip';
export type DailyChallengeSteps = {
  warmup: boolean;
  learn: boolean;
};

export type DayReflection = {
  engagement: '' | 'great' | 'ok' | 'tired';
  note: string;
  viewing: Record<string, ViewingStatus>;
  /** Additive V3.0 field. Old V1–V2.3 snapshots may omit it and remain valid. */
  dailyChallenge?: DailyChallengeSteps;
  /** V4.0 stores idempotent per-lesson stage checkpoints without altering curriculum content. */
  lessonStages?: Record<string, number[]>;
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
