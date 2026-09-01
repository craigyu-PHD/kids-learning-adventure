import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Coins,
  Gamepad2,
  Gift,
  Headphones,
  MessageCircleQuestion,
  Mic,
  Play,
  Repeat2,
  Rocket,
  Sparkles,
  Star,
  Tags,
  Trophy,
  Users,
  Volume2,
  Zap,
} from "lucide-react";
import AvatarHero from "../components/AvatarHero";
import {
  BLOCK_REWARD,
  calculateRewards,
  normalizeProgress,
  SPECIAL_TASK_BONUS,
} from "../rewards";
import type {
  AppProgress,
  AppSettings,
  CourseDay,
  DayReflection,
  LessonBlock,
} from "../types";
import type { CourseDayAccess } from "../dailyChallenge";
import {
  adaptiveChoiceCount,
  adaptivePrompt,
  buildLearningProfile,
} from "../learningAnalytics";
import { subjectLabel } from "./model";
import GameImage from "./GameImage";
import { playV4Sound } from "./sound";
import { speakEnglish } from "./voice";

const STAGES = [
  { title: "家長備課", short: "Prepare", icon: ClipboardList },
  { title: "唱歌暖身", short: "Warm-up", icon: Headphones },
  { title: "單字預覽", short: "Words", icon: BookOpen },
  { title: "觀看影片", short: "Video", icon: Play },
  { title: "暫停提問", short: "Pause", icon: MessageCircleQuestion },
  { title: "複誦練習", short: "Repeat", icon: Repeat2 },
  { title: "互動遊戲", short: "Game", icon: Gamepad2 },
  { title: "分類活動", short: "Sort", icon: Tags },
  { title: "完成任務", short: "Finish", icon: CheckCircle2 },
  { title: "領取獎勵", short: "Reward", icon: Gift },
] as const;

// V6 inserts preparation before the historic nine child stages. The existing
// persisted keys 0–8 stay unchanged; key 9 records the new preparation stage.
const persistenceKey = (uiStage: number) => (uiStage === 0 ? 9 : uiStage - 1);

type Props = {
  day: CourseDay;
  lessonIndex: 0 | 1;
  dateKey: string;
  access: CourseDayAccess;
  trustedDateVerified: boolean;
  settings: AppSettings;
  progress: AppProgress;
  participants: string[];
  reflection: DayReflection;
  onUpdateReflection: (patch: Partial<DayReflection>) => void;
  onToggleMission: (
    childId: string,
    mission: LessonBlock["missions"][number],
  ) => void;
  onAnswer: (
    childId: string,
    target: string,
    answer: string,
    correct: boolean,
    stage: number,
    confidence?: number,
  ) => void;
  onToggleBlock: (childId: string, block: LessonBlock) => void;
  onClaimSpecialBonus: (childId: string, day: CourseDay) => void;
  onBack: () => void;
};

function videoSrc(videoId: string, start?: number, end?: number) {
  const params = new URLSearchParams({ rel: "0", playsinline: "1" });
  if (start) params.set("start", String(start));
  if (end) params.set("end", String(end));
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function LessonVideo({ videoId, start, end, title, channel }: { videoId: string; start?: number; end?: number; title: string; channel: string }) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const src = videoSrc(videoId, start, end);
  useEffect(() => {
    setStatus(navigator.onLine ? "loading" : "error");
    const timer = window.setTimeout(() => setStatus((current) => current === "loading" ? "error" : current), 10_000);
    const onOffline = () => setStatus("error");
    const onOnline = () => setStatus((current) => current === "error" ? "loading" : current);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [src, attempt]);
  const retry = () => { setStatus("loading"); setAttempt((value) => value + 1); };
  return <>
    <section className={`v4-video-embed-shell state-${status}`} aria-busy={status === "loading"}>
      <iframe
        key={`${videoId}-${attempt}`}
        src={src}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("error")}
      />
      {status !== "ready" && <div className="v4-video-load-state" role="status" aria-live="polite">
        <strong>{status === "error" ? "影片暫時無法載入" : "影片載入中…"}</strong>
        <span>{status === "error" ? "請檢查網路後重試；其他課程內容仍可繼續使用。" : "正在連線安全的 YouTube 教材來源。"}</span>
        {status === "error" && <button type="button" onClick={retry}>重新載入影片</button>}
      </div>}
    </section>
    <div className="v4-video-meta">
      <strong>{title}</strong>
      <span>{channel}</span>
      <button type="button" className="v4-video-retry" onClick={retry}>重新載入影片</button>
    </div>
  </>;
}

function speak(text: string) {
  speakEnglish(text, {
    voicePreference: document.documentElement.dataset.voicePreference === "male" ? "male" : "female",
    voiceId: document.documentElement.dataset.voiceId || undefined,
    voiceRate: document.documentElement.dataset.voiceRate === "0.9" ? 0.9 : 0.78,
  });
}

export default function LessonQuest(props: Props) {
  const block = props.day.blocks[props.lessonIndex];
  const formal = props.access === "today" && props.trustedDateVerified;
  const completedStages = props.reflection.lessonStages?.[block.id] ?? [];
  const initialStage = completedStages.includes(9) ? 1 : 0;
  const [stage, setStage] = useState(initialStage);
  const [rewardCeremony, setRewardCeremony] = useState(0);
  const learnerList = props.settings.children.filter(
    (child) => props.participants.includes(child.id) && !child.disabled,
  );
  const missionOne = block.missions[0];
  const missionTwo = block.missions[1];
  const allLearnersBlockDone =
    learnerList.length > 0 &&
    learnerList.every((child) =>
      props.progress[child.id]?.completedBlocks.includes(block.id),
    );
  const stagePct = Math.round(((stage + 1) / STAGES.length) * 100);

  const stageComplete = (index: number) =>
    completedStages.includes(persistenceKey(index)) ||
    (index === 8 && allLearnersBlockDone);
  const persistStage = (index: number) => {
    const key = persistenceKey(index);
    if (!formal || completedStages.includes(key)) return;
    const lessonStages = { ...(props.reflection.lessonStages ?? {}) };
    lessonStages[block.id] = Array.from(
      new Set([...(lessonStages[block.id] ?? []), key]),
    ).sort((a, b) => a - b);
    props.onUpdateReflection({ lessonStages });
  };
  const stageReady = (index: number) => {
    if (!formal) return true;
    if (index === 6 && missionOne)
      return learnerList.every((child) =>
        props.progress[child.id]?.completedMissions.includes(missionOne.id),
      );
    if (index === 7 && missionTwo)
      return learnerList.every((child) =>
        props.progress[child.id]?.completedMissions.includes(missionTwo.id),
      );
    if (index === 8) return allLearnersBlockDone;
    return true;
  };
  const next = () => {
    if (!stageReady(stage)) return;
    persistStage(stage);
    setStage((current) => Math.min(STAGES.length - 1, current + 1));
  };
  const prev = () => setStage((current) => Math.max(0, current - 1));

  const totalMissionReward = useMemo(
    () =>
      block.missions.reduce(
        (sum, mission) => ({
          xp: sum.xp + mission.xp,
          coins: sum.coins + mission.coins,
        }),
        { xp: BLOCK_REWARD.xp, coins: BLOCK_REWARD.coins },
      ),
    [block],
  );

  return (
    <div className="v4-quest-shell">
      <header className="v4-quest-header">
        <button className="v4-quest-back" onClick={props.onBack}>
          <ArrowLeft /> 返回課程總覽
        </button>
        <div className="v4-quest-title">
          <span>
            DAY {props.day.index} · LESSON {props.lessonIndex + 1} ·{" "}
            {subjectLabel(block.subject)}
          </span>
          <h1>{block.title}</h1>
          <p>{props.day.bigIdea}</p>
        </div>
        <div className={`v4-quest-mode ${formal ? "today" : "preview"}`}>
          {formal ? (
            <>
              <Rocket /> 今日挑戰
            </>
          ) : (
            <>
              <BookOpen />{" "}
              {props.access === "past"
                ? "歷史複習"
                : props.access === "future"
                  ? "課前預覽"
                  : "安全預覽"}
            </>
          )}
        </div>
      </header>

      <div className="v4-quest-progress">
        <div>
          <span>
            關卡 {stage + 1} / {STAGES.length}
          </span>
          <strong>{STAGES[stage].title}</strong>
        </div>
        <div className="v4-quest-track">
          <i style={{ width: `${stagePct}%` }} />
        </div>
        <b>{stagePct}%</b>
      </div>

      <nav className="v4-stage-map" aria-label="家長備課與孩子正式課程十關">
        {STAGES.map((item, index) => {
          const Icon = item.icon;
          const done = stageComplete(index);
          return (
            <button
              key={item.short}
              aria-current={stage === index ? "step" : undefined}
              className={`${stage === index ? "active" : ""} ${done ? "done" : ""}`}
              onClick={() => setStage(index)}
            >
              <span>{done ? <Check /> : index + 1}</span>
              <Icon />
              <small>{item.short}</small>
            </button>
          );
        })}
      </nav>

      {!formal && (
        <div className="v4-quest-lock-banner">
          <BookOpen />
          <div>
            <strong>
              {props.access === "past"
                ? "這是歷史複習：可完整查看內容與既有紀錄。"
                : props.access === "future"
                  ? "這是課前預覽：可先準備影片、單字與帶課提示。"
                  : "日期尚在確認中：目前僅提供安全預覽。"}
            </strong>
            <span>
              預覽與複習不會寫入任務、作答、完成紀錄或任何
              XP／Coins；只有台北時間當天完成兩個任務及整堂課才會結算。
            </span>
          </div>
        </div>
      )}

      <main className="v4-quest-stage-card">
        {stage === 0 && (
          <section className="v4-stage-content v6-preparation-stage">
            <StageHeading
              icon={<ClipboardList />}
              eyebrow="STAGE 1"
              title="家長備課課表"
              text="這一關只給家長看：先掌握 30 分鐘節奏、素材和提示，再讓孩子開始暖身。"
            />
            <section className="v4-lesson-preflight" aria-label="家長備課總覽">
              <div className="v4-lesson-preflight-heading">
                <BookOpen />
                <div>
                  <span>CAREGIVER PRE-FLIGHT</span>
                  <h2>本節 30 分鐘帶課地圖</h2>
                </div>
              </div>
              <section className="v4-lesson-brief">
                <div>
                  <span>家長帶課總覽</span>
                  <strong>暖身 15 分＋主課 15 分</strong>
                </div>
                <p>
                  先確認本節目標、影片、單字與句型。看完後按「下一關」，第 2
                  關才進入孩子的唱跳暖身。
                </p>
              </section>
              <div className="v4-teaching-timeline">
                {block.steps.map((step, index) => (
                  <article key={`${step.minute}-${index}`}>
                    <b>{step.minute}</b>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.instruction}</p>
                      {step.cue && (
                        <span>
                          <MessageCircleQuestion /> 帶課提醒：{step.cue}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              <CaregiverCallout block={block} />
            </section>
          </section>
        )}

        {stage === 1 && (
          <section className="v4-stage-content">
            <StageHeading
              icon={<Headphones />}
              eyebrow="STAGE 2"
              title="唱歌暖身"
              text="家長已看完課表，現在用動作與節奏把孩子帶進狀態。"
            />
            <DailyReviewPanel
              block={block}
              learners={learnerList}
              progress={props.progress}
              todayYmd={props.dateKey}
              formal={formal}
              onAnswer={props.onAnswer}
            />
            <div className="v4-video-frame">
              <LessonVideo videoId={block.warmup.videoId} start={block.warmup.start} end={block.warmup.end} title={block.warmup.title} channel={block.warmup.channel} />
            </div>
          </section>
        )}

        {stage === 2 && (
          <section className="v4-stage-content">
            <StageHeading
              icon={<BookOpen />}
              eyebrow="STAGE 3"
              title="單字預覽"
              text="每個單字都能直接播放英文發音。"
            />
            <div className="v4-word-grid">
              {block.vocabulary.map((word) => (
                <button key={word} onClick={() => speak(word)}>
                  <GameImage
                    src={`${import.meta.env.BASE_URL}assets/v5/vocab/${slug(word)}.webp`}
                    alt={word}
                    className="v4-vocab-image"
                  />
                  <strong>{word}</strong>
                  <span>
                    <Volume2 /> 聆聽
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {stage === 3 && (
          <section className="v4-stage-content">
            <StageHeading
              icon={<Play />}
              eyebrow="STAGE 4"
              title="觀看主課影片"
              text={`教學焦點：${block.videoFocus}`}
            />
            <div className="v4-video-frame main">
              <LessonVideo videoId={block.video.videoId} start={block.video.start} end={block.video.end} title={block.video.title} channel={block.video.channel} />
            </div>
          </section>
        )}

        {stage === 4 && (
          <section className="v4-stage-content v6-pause-stage">
            <StageHeading
              icon={<CircleHelp />}
              eyebrow="STAGE 5"
              title="暫停提問"
              text={`本節專屬問題：緊扣「${block.videoFocus}」和今天的單字。`}
            />
            <div className="v6-pause-grid">
              {block.pausePrompts.map((prompt, index) => (
                <article key={`${prompt.moment}-${index}`}>
                  <b>{index + 1}</b>
                  <div>
                    <span>{prompt.moment}</span>
                    <h3>{prompt.title}</h3>
                    <strong>
                      <MessageCircleQuestion />
                      {prompt.question}
                    </strong>
                    <p>回答後延伸：{prompt.followUp}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {stage === 5 && (
          <section className="v4-stage-content">
            <StageHeading
              icon={<Repeat2 />}
              eyebrow="STAGE 6"
              title="複誦練習"
              text={`這是本節「${block.videoFocus}」專屬句型；下一節會更換句子。`}
            />
            <div className="v4-repeat-hero">
              <div className="v6-sentence-panel">
                <span>本節句型</span>
                <strong>
                  <span className="v6-sentence-adventure">{block.sentence.match(/^Adventure\s*\d+/i)?.[0] ?? 'Adventure'}</span>
                  <span className="v6-sentence-copy">{block.sentence.replace(/^Adventure\s*\d+\s*:\s*/i, '')}</span>
                </strong>
                <button onClick={() => speak(block.sentence)}>
                  <Volume2 /> 播放句型
                </button>
              </div>
              <div className="v4-age-tips">
                <article>
                  <span>較小的孩子</span>
                  <p>{block.younger}</p>
                </article>
                <article>
                  <span>較大的孩子</span>
                  <p>{block.older}</p>
                </article>
              </div>
            </div>
            <SpeakingPractice
              target={block.vocabulary[0] ?? block.sentence}
              learners={learnerList}
              formal={formal}
              onAnswer={props.onAnswer}
            />
          </section>
        )}

        {stage === 6 && (
          <MissionStage
            mission={missionOne}
            number={1}
            stage={5}
            vocabulary={block.vocabulary}
            blockId={block.id}
            learners={learnerList}
            progress={props.progress}
            todayYmd={props.dateKey}
            formal={formal}
            onToggle={props.onToggleMission}
            onAnswer={props.onAnswer}
          />
        )}
        {stage === 7 && (
          <MissionStage
            mission={missionTwo}
            number={2}
            stage={6}
            vocabulary={block.vocabulary}
            blockId={block.id}
            learners={learnerList}
            progress={props.progress}
            todayYmd={props.dateKey}
            formal={formal}
            onToggle={props.onToggleMission}
            onAnswer={props.onAnswer}
          />
        )}

        {stage === 8 && (
          <section className="v4-stage-content">
            <StageHeading
              icon={<CheckCircle2 />}
              eyebrow="STAGE 9"
              title="完成任務"
              text={
                formal
                  ? "兩個互動任務都完成後，才可以正式完成本堂課並結算 XP／Coins。"
                  : "預覽模式可先閱讀完成標準；今天正式完成後才會結算 XP／Coins。"
              }
            />
            <div className="v4-finish-grid">
              {learnerList.map((child) => {
                const p = normalizeProgress(props.progress[child.id]);
                const ready = block.missions.every((mission) =>
                  p.completedMissions.includes(mission.id),
                );
                const done = p.completedBlocks.includes(block.id);
                const rewards = calculateRewards(p);
                return (
                  <button
                    key={child.id}
                    className={done ? "done" : ""}
                    disabled={!formal || !ready || done}
                    onClick={() => props.onToggleBlock(child.id, block)}
                  >
                    <AvatarHero
                      avatarId={child.avatar}
                      xp={rewards.xp}
                      size={72}
                    />
                    <div>
                      <strong>{child.name}</strong>
                      <span>
                        {done
                          ? "本堂課已完成"
                          : formal && ready
                            ? "完成後結算獎勵"
                            : formal
                              ? "還有任務未完成"
                              : "今天完成後可結算"}
                      </span>
                    </div>
                    {done ? <CheckCircle2 /> : <Trophy />}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {stage === 9 && (
          <section className="v4-stage-content v4-reward-stage">
            <StageHeading
              icon={
                <img
                  className="v4-reward-stage-icon"
                  src={`${import.meta.env.BASE_URL}assets/v5/badges/special-perfect-day-128.webp`}
                  alt=""
                />
              }
              eyebrow="STAGE 10"
              title="領取獎勵"
              text="完成紀錄是唯一發獎依據；重新整理或重進本頁不會再次領取。"
            />
            <div key={`reward-ceremony-${rewardCeremony}`} className="v4-reward-podium">
              <div className="v4-reward-orbit">
                <img
                  src={`${import.meta.env.BASE_URL}assets/v5/badges/learning-first-mission-128.webp`}
                  alt=""
                />
                <img
                  src={`${import.meta.env.BASE_URL}assets/v5/badges/special-super-explorer-128.webp`}
                  alt=""
                />
                <img
                  src={`${import.meta.env.BASE_URL}assets/v5/badges/special-perfect-day-128.webp`}
                  alt=""
                />
              </div>
              <h2>
                {!formal
                  ? "僅供預覽"
                  : allLearnersBlockDone
                    ? "任務全部完成！"
                    : "完成上一關後就能領獎"}
              </h2>
              <div className="v4-reward-values">
                <span>
                  <Zap /> +{totalMissionReward.xp} XP
                </span>
                <span>
                  <Coins /> +{totalMissionReward.coins} Coins
                </span>
                <span>
                  <Star /> Stars
                </span>
              </div>
              <p>
                {!formal
                  ? "這裡只展示今天正式完成後可取得的獎勵；目前不會寫入任何紀錄。"
                  : allLearnersBlockDone
                    ? "這堂課的完成紀錄已安全保存；正確率 Bonus 會在完成本堂時自動結算。"
                    : "獎勵按每位孩子自己的完成紀錄獨立計算。"}
              </p>
              <button type="button" className="v6-reward-replay" onClick={() => setRewardCeremony((value) => value + 1)}><Sparkles /> 再次播放通關彩帶</button>
            </div>
            <div className="v4-special-task">
              <div>
                <span>加碼獎勵</span>
                <h3>{props.day.bonus}</h3>
                <p>完成今天兩堂課後即可領取一次特殊任務獎勵。</p>
                <strong>
                  +{SPECIAL_TASK_BONUS.xp} XP · +{SPECIAL_TASK_BONUS.coins}{" "}
                  Coins · +{SPECIAL_TASK_BONUS.stars} Star · +
                  {SPECIAL_TASK_BONUS.gems} Gem
                </strong>
              </div>
              <div>
                {learnerList.map((child) => {
                  const p = normalizeProgress(props.progress[child.id]);
                  const dayDone = props.day.blocks.every((item) =>
                    p.completedBlocks.includes(item.id),
                  );
                  const claimed =
                    p.rewardTransactions?.some(
                      (transaction) =>
                        transaction.id ===
                        `v4-special:${props.day.id}:${child.id}`,
                    ) ?? false;
                  return (
                    <button
                      key={child.id}
                      type="button"
                      disabled={!formal || !dayDone || claimed}
                      className={claimed ? "done" : ""}
                      onClick={() =>
                        props.onClaimSpecialBonus(child.id, props.day)
                      }
                    >
                      <AvatarHero
                        avatarId={child.avatar}
                        xp={calculateRewards(p).xp}
                        size={48}
                      />
                      <span>{child.name}</span>
                      <strong>
                        {claimed
                          ? "已領取"
                          : dayDone && formal
                            ? "完成加碼任務"
                            : formal
                              ? "完成兩堂後解鎖"
                              : "今天完成兩堂後解鎖"}
                      </strong>
                      {claimed ? <Check /> : <Gift />}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>

      <div className="v4-quest-controls">
        <button onClick={prev} disabled={stage === 0}>
          <ChevronLeft /> 上一關
        </button>
        <div>
          <span>{STAGES[stage].short}</span>
          <strong>{STAGES[stage].title}</strong>
        </div>
        {stage < STAGES.length - 1 ? (
          <button
            className="primary"
            onClick={next}
            disabled={!stageReady(stage)}
          >
            {formal
              ? stageReady(stage)
                ? "下一關"
                : "先完成本關任務"
              : "下一關"}{" "}
            <ChevronRight />
          </button>
        ) : (
          <button className="primary" onClick={props.onBack}>
            回課程總覽 <Rocket />
          </button>
        )}
      </div>
    </div>
  );
}

function StageHeading({
  icon,
  eyebrow,
  title,
  text,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="v4-stage-heading">
      <span>{icon}</span>
      <div>
        <small>{eyebrow}</small>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

function CaregiverCallout({ block }: { block: LessonBlock }) {
  return (
    <aside className="v4-caregiver-callout">
      <Users />
      <div>
        <strong>家長帶課提示</strong>
        <p>{block.caregiverTip}</p>
      </div>
    </aside>
  );
}

type SpeechAlternative = { transcript: string; confidence: number };
type SpeechResult = { 0: SpeechAlternative };
type SpeechRecognitionEventLike = { results: { 0: SpeechResult } };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const normalizeSpeech = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function SpeakingPractice({
  target,
  learners,
  formal,
  onAnswer,
}: {
  target: string;
  learners: AppSettings["children"];
  formal: boolean;
  onAnswer: (
    childId: string,
    target: string,
    answer: string,
    correct: boolean,
    stage: number,
    confidence?: number,
  ) => void;
}) {
  const [listeningChildId, setListeningChildId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { correct: boolean; transcript: string; detail?: string }>>({});
  const recognitionConstructor =
    typeof window === "undefined"
      ? undefined
      : ((window as SpeechRecognitionWindow).SpeechRecognition ??
        (window as SpeechRecognitionWindow).webkitSpeechRecognition);
  if (!formal) return null;
  const confirmSpoken = (childId: string) => {
    const transcript = target;
    playV4Sound("success");
    onAnswer(childId, target, transcript, true, -2, 1);
    setFeedback((current) => ({
      ...current,
      [childId]: { correct: true, transcript: "照顧者已確認完成", detail: "已記入口說完成紀錄" },
    }));
  };
  const startListening = (childId: string) => {
    if (!recognitionConstructor) return;
    const recognition = new recognitionConstructor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    setListeningChildId(childId);
    recognition.onresult = (event) => {
      const alternative = event.results[0][0];
      const transcript = alternative.transcript.trim();
      const normalizedTarget = normalizeSpeech(target);
      const normalizedTranscript = normalizeSpeech(transcript);
      const correct = normalizedTranscript === normalizedTarget || normalizedTranscript.split(" ").includes(normalizedTarget);
      playV4Sound(correct ? "success" : "error");
      onAnswer(
        childId,
        target,
        transcript,
        correct,
        -2,
        alternative.confidence,
      );
      setFeedback((current) => ({
        ...current,
        [childId]: { correct, transcript, detail: correct ? "辨識到目標字詞，已記錄成功" : "辨識到的字詞尚未吻合，請放慢再說一次" },
      }));
    };
    recognition.onerror = (event) => {
      const detail = event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "麥克風尚未允許：請在瀏覽器網址列的鎖頭開啟麥克風後再試。"
        : event.error === "no-speech"
          ? "沒有收到聲音；請靠近麥克風並說完整個字詞。"
          : "辨識暫時無法完成，請再試一次或由照顧者確認。";
      setFeedback((current) => ({
        ...current,
        [childId]: { correct: false, transcript: "尚未完成辨識", detail },
      }));
    };
    recognition.onend = () => setListeningChildId(null);
    recognition.start();
  };
  return (
    <section className="speaking-practice" aria-label="英文口說練習">
      <header>
        <div>
          <span>口說練習</span>
          <h3>我來說：{target}</h3>
        </div>
        <small>辨識回饋・記入口說紀錄</small>
      </header>
      <p>先聽慢速示範，再按麥克風說出目標英文。系統會顯示實際辨識到的字詞；若裝置不支援，照顧者仍可確認孩子已開口。</p>
      <div className="speaking-practice-controls">
        <button type="button" onClick={() => speak(target)}>
          <Volume2 /> 再聽一次
        </button>
        <span className="speaking-practice-rate">目前示範語速：{document.documentElement.dataset.voiceRate === "0.9" ? "標準 0.9×" : "慢速 0.78×"}；可在家長設定切換。</span>
        {!recognitionConstructor && (
          <span>這台裝置暫不支援語音辨識，可用下方「照顧者確認」記下孩子已開口。</span>
        )}
      </div>
      <div className="speaking-practice-learners">
        {learners.map((child) => {
          const result = feedback[child.id];
          const listening = listeningChildId === child.id;
          return (
            <article
              key={child.id}
              className={result ? (result.correct ? "correct" : "wrong") : ""}
            >
              <div className="speaking-practice-child-copy"><strong>{child.name}</strong><span>目標：{target}</span></div>
              {recognitionConstructor ? <button
                type="button"
                disabled={listeningChildId !== null}
                onClick={() => startListening(child.id)}
              >
                <Mic /> {listening ? "正在聽你說…" : "開始錄音"}
              </button> : <button type="button" className="caregiver-confirm" onClick={() => confirmSpoken(child.id)}><Check /> 照顧者確認</button>}
              {recognitionConstructor && !result && <button type="button" className="caregiver-confirm" disabled={listeningChildId !== null} onClick={() => confirmSpoken(child.id)}><Check /> 照顧者確認</button>}
              <small>
                {result
                  ? result.correct
                    ? `很棒！辨識到「${result.transcript}」`
                    : `再試一次：${result.transcript}`
                  : listening ? "正在收音，說完後請稍候…" : "按下按鈕後開口說；完成後會立即顯示辨識回饋"}
                {result?.detail && <em>{result.detail}</em>}
              </small>
            </article>
          );
        })}
      </div>
      <footer>
        麥克風只會在你按下按鈕後啟用；本站不保存聲音檔。瀏覽器語音辨識目前評估「字詞是否被辨識到」，不是音素級發音檢定，因此也保留照顧者確認。
      </footer>
    </section>
  );
}

function DailyReviewPanel({
  block,
  learners,
  progress,
  todayYmd,
  formal,
  onAnswer,
}: {
  block: LessonBlock;
  learners: AppSettings["children"];
  progress: AppProgress;
  todayYmd: string;
  formal: boolean;
  onAnswer: (
    childId: string,
    target: string,
    answer: string,
    correct: boolean,
    stage: number,
    confidence?: number,
  ) => void;
}) {
  const [feedback, setFeedback] = useState<Record<string, "correct" | "wrong">>(
    {},
  );
  const reviewTargets = Array.from(
    new Set(
      learners.flatMap((child) =>
        buildLearningProfile(progress[child.id]?.answerEvents, todayYmd)
          .reviewTargets.filter((item) => item.nextReview <= todayYmd)
          .map((item) => item.target),
      ),
    ),
  ).slice(0, 3);
  if (!formal || !reviewTargets.length) return null;
  const choicesFor = (target: string) =>
    Array.from(
      new Set([
        target,
        ...reviewTargets.filter((word) => word !== target),
        ...block.vocabulary.filter((word) => word !== target),
      ]),
    ).slice(0, 3);
  const choose = (childId: string, target: string, answer: string) => {
    const correct = target === answer;
    playV4Sound(correct ? "success" : "error");
    onAnswer(childId, target, answer, correct, -1);
    setFeedback((current) => ({
      ...current,
      [`${childId}:${target}`]: correct ? "correct" : "wrong",
    }));
    if (correct) speak(answer);
  };
  return (
    <section className="daily-review-panel" aria-label="今日複習">
      <header>
        <div>
          <span>今日複習</span>
          <h3>先複習 3 個需要加強的單字</h3>
        </div>
        <small>不影響課堂獎勵</small>
      </header>
      {reviewTargets.map((target) => (
        <article key={target}>
          <button
            type="button"
            className="daily-review-listen"
            onClick={() => speak(target)}
          >
            <Volume2 /> 聽題目
          </button>
          <div>
            <strong>{target}</strong>
            {learners.map((child) => {
              const p = normalizeProgress(progress[child.id]);
              const alreadyCorrect = (p.answerEvents ?? []).some(
                (event) =>
                  event.stage === -1 &&
                  event.target === target &&
                  event.correct,
              );
              const state = alreadyCorrect
                ? "correct"
                : feedback[`${child.id}:${target}`];
              return (
                <div className="daily-review-learner" key={child.id}>
                  <span>{child.name}</span>
                  {choicesFor(target).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      disabled={alreadyCorrect}
                      onClick={() => choose(child.id, target, choice)}
                    >
                      {choice}
                    </button>
                  ))}
                  <small>
                    {alreadyCorrect || state === "correct"
                      ? "答對了！"
                      : state === "wrong"
                        ? "再聽一次看看"
                        : "聽完再選"}
                  </small>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </section>
  );
}

function MissionStage({
  mission,
  number,
  stage,
  vocabulary,
  blockId,
  learners,
  progress,
  todayYmd,
  formal,
  onToggle,
  onAnswer,
}: {
  mission: LessonBlock["missions"][number];
  number: number;
  stage: number;
  vocabulary: string[];
  blockId: string;
  learners: AppSettings["children"];
  progress: AppProgress;
  todayYmd: string;
  formal: boolean;
  onToggle: (childId: string, mission: LessonBlock["missions"][number]) => void;
  onAnswer: (
    childId: string,
    target: string,
    answer: string,
    correct: boolean,
    stage: number,
    confidence?: number,
  ) => void;
}) {
  const target =
    vocabulary[(number - 1) % Math.max(1, vocabulary.length)] ?? mission.title;
  const alternatives = vocabulary.filter((word) => word !== target);
  const choicePool = Array.from(
    new Set([
      alternatives[number % Math.max(1, alternatives.length)] ??
        alternatives[0],
      target,
      alternatives[(number + 1) % Math.max(1, alternatives.length)] ??
        alternatives[1],
      ...alternatives,
    ]),
  ).filter(Boolean);
  const [feedback, setFeedback] = useState<Record<string, "correct" | "wrong">>(
    {},
  );
  const missionPrompt = (() => {
    const marker = mission.prompt.indexOf("Adventure ");
    if (marker < 0) return { context: mission.prompt, sentence: undefined };
    return {
      context: mission.prompt.slice(0, marker).replace(/[：:\s]+$/, ""),
      sentence: mission.prompt.slice(marker),
    };
  })();
  const choose = (childId: string, answer: string) => {
    if (!formal) return;
    const correct = answer === target;
    playV4Sound(correct ? "success" : "error");
    onAnswer(childId, target, answer, correct, stage);
    setFeedback((current) => ({
      ...current,
      [childId]: correct ? "correct" : "wrong",
    }));
    if (correct) speak(answer);
  };
  return (
    <section className="v4-stage-content">
      <StageHeading
        icon={<Gamepad2 />}
        eyebrow={`STAGE ${number + 5}`}
        title={number === 1 ? "互動遊戲" : "分類活動"}
        text="依序看任務目標、聽題目作答，再替每位孩子標記完成。"
      />
      <div className="v4-mission-focus">
        <div className="v4-mission-number">
          <small>任務</small>
          {number}
        </div>
        <div>
          <span>{mission.title}</span>
          <h3 className="v6-mission-prompt"><span>{missionPrompt.context}</span>{missionPrompt.sentence && <strong>{missionPrompt.sentence}</strong>}</h3>
          <p>
            <strong>完成標準</strong>
            {mission.criteria}
          </p>
        </div>
      </div>
      <section className="v4-quick-check">
        <header>
          <div>
            <span>STEP 2 · 聽題作答</span>
            <h3>按播放，選出你聽見的單字</h3>
          </div>
          <button type="button" onClick={() => speak(target)}>
            <Volume2 /> 播放題目
          </button>
        </header>
        <div>
          {learners.map((child) => {
            const p = normalizeProgress(progress[child.id]);
            const vocabularyScore =
              buildLearningProfile(p.answerEvents, todayYmd).skills.find(
                (skill) => skill.id === "vocabulary",
              )?.score ?? null;
            const choices = choicePool.slice(
              0,
              Math.min(adaptiveChoiceCount(vocabularyScore), choicePool.length),
            );
            const alreadyCorrect = (p.answerEvents ?? []).some(
              (event) =>
                event.blockId === blockId &&
                event.stage === stage &&
                event.target === target &&
                event.correct,
            );
            const state = alreadyCorrect ? "correct" : feedback[child.id];
            return (
              <article key={child.id} className={state ?? ""}>
                <div className="v4-quick-check-learner">
                  <AvatarHero
                    avatarId={child.avatar}
                    xp={calculateRewards(p).xp}
                    size={96}
                  />
                  <strong>{child.name}</strong>
                  <span>{state === "correct" ? "答對了！" : "準備作答"}</span>
                </div>
                <div className="v4-quick-check-answer">
                  <div>
                    {choices.map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        disabled={!formal || alreadyCorrect}
                        onClick={() => choose(child.id, choice)}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                  <small className="adaptive-learning-hint">
                    {adaptivePrompt(vocabularyScore)}
                  </small>
                  <small>
                    {alreadyCorrect || state === "correct"
                      ? "答對了！"
                      : state === "wrong"
                        ? "再聽一次看看"
                        : "先聽題目再作答"}
                  </small>
                  {state === "correct" && <div className="v6-answer-win" aria-live="polite"><Sparkles /> 答對了！星星能量已收集</div>}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <div className="v4-mission-learners">
        {learners.map((child) => {
          const p = normalizeProgress(progress[child.id]);
          const done = p.completedMissions.includes(mission.id);
          const r = calculateRewards(p);
          return (
            <button
              key={child.id}
              disabled={!formal || done}
              className={done ? "done" : ""}
              onClick={() => onToggle(child.id, mission)}
            >
              <AvatarHero avatarId={child.avatar} xp={r.xp} size={82} />
              <span>
                <small>STEP 3 · {done ? "已完成" : "等待確認"}</small>
                <strong>{child.name}</strong>
              </span>
              {done ? (
                <Check />
              ) : (
                <>
                  <Zap />+{mission.xp}
                </>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function slug(word: string) {
  const value = word
    .toLowerCase()
    .trim()
    .replace(/[?!]/g, "")
    .replace(/\s+[\u4e00-\u9fff]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return value || "zh-audio";
}
