export type ThemeMode = "system" | "light" | "dark";
export type AdventureTheme = "hero" | "mecha" | "tank" | "racing" | "creature";
export type Subject =
  "English" | "Math" | "Zhuyin" | "Life" | "Science" | "Review";

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

export type LessonPausePrompt = {
  /** A concrete point in the current warm-up or main video. */
  moment: string;
  title: string;
  question: string;
  followUp: string;
  targetWord: string;
};

/**
 * The explicit bridge between a selected YouTube clip and the caregiver-led
 * activity.  It deliberately records only words/actions that the lesson
 * author has verified for that clip's topic; UI copy must not invent a word
 * merely because it appears elsewhere in the weekly plan.
 */
export type LessonVideoAnchor = {
  sourceTitle: string;
  focus: string;
  verifiedWords: string[];
  caregiverMove: string;
};

export type InteractiveMission = {
  id: string;
  title: string;
  prompt: string;
  criteria: string;
  kind:
    | "repeat"
    | "race"
    | "find"
    | "move"
    | "quiz"
    | "match"
    | "count"
    | "roleplay";
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
  videoAnchor: LessonVideoAnchor;
  vocabulary: string[];
  sentence: string;
  steps: LessonStep[];
  pausePrompts: LessonPausePrompt[];
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

export type FamilyUserRole = "father" | "mother" | "caregiver" | "other";

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
  role?: FamilyUserRole | "child";
  userPinHash?: string;
  userPinSalt?: string;
  userPinIterations?: number;
};

export type RewardTransaction = {
  id: string;
  kind:
    "stage" | "lesson" | "day" | "treasure" | "achievement" | "shop" | "bonus";
  sourceId: string;
  xp: number;
  coins: number;
  stars: number;
  gems: number;
  createdAt: string;
};

/** Production-grade shop/avatar model. Purchase and equipment are separate immutable ledgers. */
export type AvatarAccessorySlot = "head" | "face" | "back" | "hand" | "effect";
export type AvatarWorldSlot = "spaceship" | "room" | "robot" | "card";
export type AvatarEquipmentSlot = "skin" | AvatarAccessorySlot | AvatarWorldSlot;
export type ShopItemKind = "skin" | "accessory" | "world";
export type ShopItemAvailability = "available" | "unavailable" | "incompatible";

export type ShopItem = {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlockLevel: number;
  kind: ShopItemKind;
  equipmentSlot: AvatarEquipmentSlot;
  legacySlot: string;
  availability: ShopItemAvailability;
  renderer: "full-skin" | "standard-effect" | "world" | "unsupported-legacy";
};

export type PurchaseTransaction = {
  id: string;
  childId: string;
  itemId: string;
  /** Frozen price paid at purchase time. Future catalog price changes never rewrite history. */
  cost: number;
  createdAt: string;
  source: "purchase" | "legacy-migration";
};

export type EquipmentTransaction = {
  id: string;
  childId: string;
  itemId: string;
  slot: AvatarEquipmentSlot;
  action: "equip" | "unequip";
  createdAt: string;
};

export type Inventory = {
  itemIds: string[];
  purchases: PurchaseTransaction[];
};

export type EquippedAvatar = {
  skinId: string;
  accessories: Partial<Record<AvatarAccessorySlot, string>>;
  world: Partial<Record<AvatarWorldSlot, string>>;
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
  /** Legacy V3 compatibility mirrors. New writes are derived from the immutable shop ledgers below. */
  unlockedCosmetics?: string[];
  equippedCosmetics?: string[];
  /** V6.1 authoritative immutable shop purchase ledger. */
  purchaseTransactions?: PurchaseTransaction[];
  /** V6.1 authoritative immutable equip/unequip event ledger. */
  equipmentTransactions?: EquipmentTransaction[];
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
  /** Preferred natural English narration voice. The browser chooses a matching installed voice. */
  voicePreference?: "female" | "male";
  /** User-selected installed English voice URI; never a family credential. */
  voiceId?: string;
  /** Deliberately limited child-friendly narration speeds. */
  voiceRate?: 0.78 | 0.9;
  semesterStart: string;
  /** Adult/caregiver login accounts such as 爸爸、媽媽. */
  users: FamilyUserProfile[];
  /** Learners such as 哥哥、弟弟. */
  children: ChildProfile[];
  cloudSync: CloudSyncSettings;
};

export type AppProgress = Record<string, ChildProgress>;

export type ViewingStatus = "full" | "partial" | "skip";
export type DailyChallengeSteps = {
  warmup: boolean;
  learn: boolean;
};

export type DayReflection = {
  engagement: "" | "great" | "ok" | "tired";
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
