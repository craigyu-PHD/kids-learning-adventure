import '../styles/components/review.css';
import '../styles/components/speaking.css';
import '../styles/components/lesson.css';
import '../styles/components/reward.css';
import DailyParticipants from './DailyParticipants';
import { useEffect, useMemo, useRef, useState } from "react";
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
  Volume2,
  Zap,
} from "lucide-react";
import AvatarHero from "../components/AvatarHero";
import LessonPreparation from "./LessonPreparation";
import { lessonInstructionText, lessonSpeakingTarget } from "../lessonInstructionText";
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
import { cancelEnglishSpeech, speakEnglish } from "./voice";
import { RecorderController, RecorderControllerError, type RecordedClip } from "../speech/recorder";
import {
  lessonBlockCompletionState,
  lessonMissionCompletionState,
  lessonStageLabel,
  lessonStagePersistenceKey,
  type LessonCompletionState,
} from "../lessonCompletionPolicy";

const STAGES = [
  { title: "家長備課", short: "備課", icon: ClipboardList },
  { title: "唱歌暖身", short: "暖身", icon: Headphones },
  { title: "單字預覽", short: "單字", icon: BookOpen },
  { title: "觀看影片", short: "影片", icon: Play },
  { title: "暫停提問", short: "提問", icon: MessageCircleQuestion },
  { title: "複誦練習", short: "複誦", icon: Repeat2 },
  { title: "任務一", short: "任務 1", icon: Gamepad2 },
  { title: "任務二", short: "任務 2", icon: Tags },
  { title: "完成任務", short: "完成", icon: CheckCircle2 },
  { title: "領取獎勵", short: "獎勵", icon: Gift },
] as const;

type Props = {
  day: CourseDay;
  lessonIndex: 0 | 1;
  dateKey: string;
  access: CourseDayAccess;
  trustedDateVerified: boolean;
  settings: AppSettings;
  progress: AppProgress;
  participants: string[];
  onSelectParticipant: (childId: string, selected: boolean) => void;
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
  speakEnglish(lessonInstructionText(text), {
    voiceSource: document.documentElement.dataset.voiceSource === "device" ? "device" : "recorded",
    voicePreference: document.documentElement.dataset.voicePreference === "male" ? "male" : "female",
    voiceId: document.documentElement.dataset.voiceId || undefined,
    voiceRate: document.documentElement.dataset.voiceRate === "0.9" ? 0.9 : 0.78,
  });
}

export default function LessonQuest(props: Props) {
  const block = props.day.blocks[props.lessonIndex];
  const canSelectToday = props.access === "today" && props.trustedDateVerified;
  const formal = canSelectToday && props.participants.length > 0;
  const completedStages = props.reflection.lessonStages?.[block.id] ?? [];
  const stageMeta = (index: number) => ({ ...STAGES[index], ...(lessonStageLabel(block, index) ?? {}) });
  const firstUnfinishedStage = STAGES.findIndex((_, index) => !completedStages.includes(lessonStagePersistenceKey(index)));
  const [stage, setStage] = useState(firstUnfinishedStage < 0 ? STAGES.length - 1 : firstUnfinishedStage);
  useEffect(() => () => cancelEnglishSpeech(), [block.id, stage]);
  const [preparationExpanded, setPreparationExpanded] = useState(() => window.matchMedia('(min-width: 1180px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1180px)');
    const update = () => setPreparationExpanded(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [rewardCeremony, setRewardCeremony] = useState(0);
  const [revealedWords, setRevealedWords] = useState<Set<string>>(() => new Set());
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
    completedStages.includes(lessonStagePersistenceKey(index)) ||
    (index === 8 && allLearnersBlockDone);
  const persistStage = (index: number) => {
    const key = lessonStagePersistenceKey(index);
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
          <p>本堂重點：{block.videoFocus}</p>
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
          <strong>{stageMeta(stage).title}</strong>
        </div>
        <div className="v4-quest-track">
          <i style={{ width: `${stagePct}%` }} />
        </div>
        <b>{stagePct}%</b>
      </div>

      <nav className="v4-stage-map" aria-label="家長備課與孩子正式課程十關">
        {STAGES.map((item, index) => {
          const meta = stageMeta(index);
          const Icon = item.icon;
          const done = stageComplete(index);
          return (
            <button
              key={`${index}:${meta.short}`}
              aria-label={`${index + 1}. ${meta.title}`}
              aria-current={stage === index ? "step" : undefined}
              className={`${stage === index ? "active" : ""} ${done ? "done" : ""}`}
              onClick={() => setStage(index)}
            >
              <span>{done ? <Check /> : index + 1}</span>
              <Icon />
              <small>{meta.short}</small>
            </button>
          );
        })}
      </nav>

      {!formal && (
        <div className="v4-quest-lock-banner">
          <BookOpen />
          <div>
            <strong>
              {canSelectToday && !props.participants.length
                ? "尚未選擇參與孩子：可先看教材，回家長備課勾選後再記錄學習。"
                : props.access === "past"
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
          <section className="v4-stage-content v653-preparation-stage">
            <StageHeading
              icon={<ClipboardList />}
              eyebrow="STAGE 1"
              title="家長備課課表"
              text="這一關只給家長看：先掌握 30 分鐘節奏、素材和提示，再讓孩子開始暖身。"
            />
            <section className="v4-lesson-preflight" aria-label="家長備課總覽">
              <div className="v653-preparation-heading">
                <div><span>30 分鐘帶課地圖</span><h2>今天怎麼帶孩子學</h2></div>
                <p><b>15 分鐘</b> 唱跳暖身 <span>＋</span> <b>15 分鐘</b> 主課與任務</p>
              </div>
              <DailyParticipants children={props.settings.children} selectedIds={props.participants} editable={canSelectToday} onChange={props.onSelectParticipant} />
              <LessonPreparation day={props.day} block={block} onInspect={setStage} expanded={preparationExpanded} />
              <section className="v653-teaching-plan" aria-label="本節帶課時間表">
                <h3>帶課時間表</h3>
                <div className="v653-teaching-timeline">
                {block.steps.map((step, index) => (
                  <details key={`${step.minute}-${index}`} open={preparationExpanded || index === 0}>
                    <summary><b>{step.minute}</b><strong>{step.title}</strong></summary>
                    <div>
                      <p>{lessonInstructionText(step.instruction)}</p>
                      {step.cue && (
                        <span>
                          <MessageCircleQuestion /> 帶課提醒：{lessonInstructionText(step.cue)}
                        </span>
                      )}
                    </div>
                  </details>
                ))}
                </div>
              </section>
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
            <div className="v4-word-grid v653-word-grid">
              {block.vocabulary.map((word) => {
                const revealed = revealedWords.has(word);
                return <button key={word} className={`v64-word-flip ${revealed ? 'revealed' : ''}`} aria-pressed={revealed} onClick={() => { setRevealedWords((current) => { const next = new Set(current); if (next.has(word)) next.delete(word); else next.add(word); return next; }); speak(word); }}>
                  <span className="v64-word-flip-stage v653-word-stage" aria-hidden="true">
                    <span className="v64-word-face image-face"><GameImage src={`${import.meta.env.BASE_URL}assets/v5/vocab/${slug(word)}.webp`} alt="" className="v4-vocab-image" /></span>
                    <span className="v64-word-face word-face"><strong>{lessonInstructionText(word)}</strong></span>
                  </span>
                  <strong className="v64-word-accessible-copy">{lessonInstructionText(word)}</strong>
                  <span className="v653-word-action"><Volume2 /> {revealed ? '看圖片並聆聽' : '翻卡並聆聽'}</span>
                </button>;
              })}
            </div>
            <button type="button" className="v65-recording-entry" onClick={() => setStage(5)}>
              <span><Mic/></span><div><strong>錄音模式在這裡</strong><small>錄下孩子的聲音、立即回放，再選用 AI 字詞辨識確認是否說到目標詞。</small></div><ChevronRight/>
            </button>
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
                    <span>{lessonInstructionText(prompt.moment)}</span>
                    <h3>{lessonInstructionText(prompt.title)}</h3>
                    <div className="v653-question-box">
                      <span><MessageCircleQuestion /> 問孩子</span>
                      <strong>{lessonInstructionText(prompt.question)}</strong>
                    </div>
                    <p><b>接著一起做</b>{lessonInstructionText(prompt.followUp)}</p>
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
                  <span className="v6-sentence-copy">{lessonInstructionText(block.sentence)}</span>
                </strong>
                <button onClick={() => speak(block.sentence)}>
                  <Volume2 /> 播放句型
                </button>
              </div>
              <div className="v4-age-tips">
                <article>
                  <span>較小的孩子</span>
                  <p>{lessonInstructionText(block.younger)}</p>
                </article>
                <article>
                  <span>較大的孩子</span>
                  <p>{lessonInstructionText(block.older)}</p>
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
            guidance={block}
            learners={learnerList}
            progress={props.progress}
            todayYmd={props.dateKey}
            formal={formal}
            completionState={lessonMissionCompletionState(completedStages, 0)}
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
            guidance={block}
            learners={learnerList}
            progress={props.progress}
            todayYmd={props.dateKey}
            formal={formal}
            completionState={lessonMissionCompletionState(completedStages, 1)}
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
                const completion = lessonBlockCompletionState(p, block, completedStages);
                const done = p.completedBlocks.includes(block.id);
                const rewards = calculateRewards(p);
                return (
                  <button
                    key={child.id}
                    className={done ? "done" : ""}
                    disabled={!formal || !completion.canComplete}
                    onClick={() => props.onToggleBlock(child.id, block)}
                  >
                    <AvatarHero
                      avatarId={child.avatar}
                      xp={rewards.xp}
                      equippedCosmetics={p.equippedCosmetics}
                      size={72}
                    />
                    <div>
                      <strong>{child.name}</strong>
                      <span>
                        {done
                          ? "本堂課已完成"
                          : formal
                            ? completion.reason
                            : "今天正式上課時，完成前面關卡與兩個任務後即可結算。"}
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
            <div key={`reward-ceremony-${rewardCeremony}`} className="v4-reward-podium v653-reward-podium">
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
              <button type="button" className="v6-reward-replay" onClick={() => setRewardCeremony((value) => value + 1)}><Sparkles /> 再看一次獎勵</button>
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
                        equippedCosmetics={p.equippedCosmetics}
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
          <span>{stageMeta(stage).short}</span>
          <strong>{stageMeta(stage).title}</strong>
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

type SpeechAlternative = { transcript: string; confidence: number };
type SpeechResult = { 0: SpeechAlternative; isFinal: boolean };
type SpeechRecognitionEventLike = { resultIndex: number; results: { [index: number]: SpeechResult } };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  abort?: () => void;
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
  lessonInstructionText(value)
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
  const activeSession = useRef<{ recognition?: SpeechRecognitionLike } | null>(null);
  const recorderControllers = useRef(new Map<string, RecorderController>());
  const recordingStopTimer = useRef<number | null>(null);
  const [activeRecording, setActiveRecording] = useState<{ childId: string; phase: "permission" | "recording" | "stopping" } | null>(null);
  const [recordings, setRecordings] = useState<Record<string, { clip?: RecordedClip; detail?: string }>>({});
  useEffect(() => () => {
    const session = activeSession.current;
    activeSession.current = null;
    try { session?.recognition?.abort?.(); } catch { /* An unavailable recognizer may already be closed. */ }
    if (recordingStopTimer.current !== null) window.clearTimeout(recordingStopTimer.current);
    recorderControllers.current.forEach((controller) => controller.dispose());
    recorderControllers.current.clear();
  }, []);
  const [feedback, setFeedback] = useState<Record<string, { correct: boolean; transcript: string; detail?: string; confirmedByCaregiver?: boolean }>>({});
  const recognitionConstructor =
    typeof window === "undefined"
      ? undefined
      : ((window as SpeechRecognitionWindow).SpeechRecognition ??
        (window as SpeechRecognitionWindow).webkitSpeechRecognition);
  const spokenTarget = lessonSpeakingTarget(target);
  const recordingSupported = typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
  if (!formal) return null;
  const recorderFor = (childId: string) => {
    const existing = recorderControllers.current.get(childId);
    if (existing) return existing;
    const controller = new RecorderController();
    recorderControllers.current.set(childId, controller);
    return controller;
  };
  const stopRecording = async (childId: string) => {
    const controller = recorderControllers.current.get(childId);
    if (!controller || controller.state !== "recording") return;
    if (recordingStopTimer.current !== null) {
      window.clearTimeout(recordingStopTimer.current);
      recordingStopTimer.current = null;
    }
    setActiveRecording({ childId, phase: "stopping" });
    try {
      const clip = await controller.stop();
      const detail = clip.durationMs < 500
        ? "這段錄音太短，建議再錄一次；你仍可先播放確認。"
        : `錄音完成（${Math.max(1, Math.round(clip.durationMs / 1000))} 秒）。先聽回放，再決定是否重錄。`;
      setRecordings((current) => ({ ...current, [childId]: { clip, detail } }));
    } catch (error) {
      const detail = error instanceof RecorderControllerError
        ? error.message
        : "錄音停止時發生問題，請再試一次。";
      setRecordings((current) => ({ ...current, [childId]: { detail } }));
    } finally {
      setActiveRecording(null);
    }
  };
  const startRecording = async (childId: string) => {
    if (!recordingSupported || activeRecording !== null || listeningChildId !== null || activeSession.current !== null) return;
    cancelEnglishSpeech();
    const controller = recorderFor(childId);
    setActiveRecording({ childId, phase: "permission" });
    setRecordings((current) => ({ ...current, [childId]: { detail: "正在取得麥克風權限…" } }));
    try {
      await controller.start();
      setActiveRecording({ childId, phase: "recording" });
      setRecordings((current) => ({ ...current, [childId]: { detail: "正在錄音；說完就按「停止錄音」。" } }));
      recordingStopTimer.current = window.setTimeout(() => { void stopRecording(childId); }, 15_000);
    } catch (error) {
      const detail = error instanceof RecorderControllerError
        ? error.code === "denied"
          ? "麥克風尚未允許。請在瀏覽器網址列或系統設定開啟麥克風後再試；也可以直接略過錄音。"
          : error.message
        : "錄音無法開始，請檢查麥克風後再試。";
      setRecordings((current) => ({ ...current, [childId]: { detail } }));
      setActiveRecording(null);
    }
  };
  const deleteRecording = (childId: string) => {
    const controller = recorderControllers.current.get(childId);
    controller?.releaseClip();
    setRecordings((current) => ({ ...current, [childId]: { detail: "這段錄音已從記憶體移除。" } }));
  };
  const confirmSpoken = (childId: string) => {
    if (activeSession.current !== null || listeningChildId !== null || activeRecording !== null || feedback[childId]?.correct) return;
    playV4Sound("success");
    // Record the caregiver's attestation, not an invented transcript or confidence.
    onAnswer(childId, target, "照顧者確認已說出目標英文", true, -2);
    setFeedback((current) => ({
      ...current,
      [childId]: { correct: true, transcript: "", confirmedByCaregiver: true, detail: "人工確認已記錄，未產生語音辨識結果" },
    }));
  };
  const startListening = (childId: string) => {
    if (!recognitionConstructor || activeSession.current !== null || activeRecording !== null) return;
    const session: { recognition?: SpeechRecognitionLike } = {};
    activeSession.current = session;
    let answerRecorded = false;
    const finish = () => {
      if (activeSession.current !== session) return;
      activeSession.current = null;
      setListeningChildId(null);
    };
    const fail = (error?: string) => {
      if (activeSession.current !== session) return;
      finish();
      try { session.recognition?.abort?.(); } catch { /* Recovery must remain available if abort also fails. */ }
      if (answerRecorded) return;
      const detail = error === "not-allowed" || error === "service-not-allowed" || error === "NotAllowedError"
        ? "麥克風尚未允許：請在瀏覽器網址列的鎖頭開啟麥克風後再試。"
        : error === "no-speech"
          ? "沒有收到聲音；請靠近麥克風並說完整個字詞。"
          : "辨識暫時無法完成，請再試一次或由照顧者確認。";
      setFeedback((current) => ({
        ...current,
        [childId]: { correct: false, transcript: "", detail: `目前無法判斷。${detail}` },
      }));
    };
    try {
      const recognition = new recognitionConstructor();
      session.recognition = recognition;
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      setListeningChildId(childId);
      // Only the current recording may contribute one final answer or release its controls.
      recognition.onresult = (event) => {
        if (activeSession.current !== session || answerRecorded) return;
        const result = event.results[event.resultIndex];
        if (!result?.isFinal) return;
        const alternative = result[0];
        if (!alternative.transcript.trim()) return;
        answerRecorded = true;
        const transcript = alternative.transcript.trim();
        const normalizedTarget = normalizeSpeech(spokenTarget);
        const normalizedTranscript = normalizeSpeech(transcript);
        const correct = normalizedTranscript === normalizedTarget || normalizedTranscript.split(" ").includes(normalizedTarget);
        if (correct) playV4Sound("success");
        onAnswer(childId, target, transcript, correct, -2, alternative.confidence);
        setFeedback((current) => ({
          ...current,
          [childId]: {
            correct,
            transcript,
            detail: correct
              ? "辨識到目標詞；這只代表字詞辨識相符，不代表發音標準或音素正確。"
              : "請再試一次；目前只確認是否辨識到目標詞，不判斷發音標準。",
          },
        }));
      };
      recognition.onerror = (event) => fail(event.error);
      recognition.onend = finish;
      recognition.start();
    } catch (error) {
      fail(error instanceof Error ? error.name : undefined);
    }
  };
  return (
    <section className="speaking-practice" aria-label="英文口說練習">
      <header>
        <div>
          <span>口說練習</span>
          <h3>我來說：{lessonInstructionText(target)}</h3>
        </div>
        <small>錄音回放・安全辨識回饋</small>
      </header>
      <p>{spokenTarget !== target && <>先說 {spokenTarget}；也可以一起念字母和單字。 </>}先聽示範，再用「換我說」錄下孩子的聲音；停止後可以立即回放、重錄或刪除。錄音只暫存在這個頁面的記憶體，不會自動上傳或保存。瀏覽器字詞辨識是選用輔助，只回報是否辨識到目標詞，不能用來判定發音是否標準。</p>
      <div className="speaking-practice-controls">
        <button type="button" onClick={() => speak(target)}>
          <Volume2 /> 再聽一次
        </button>
        <span className="speaking-practice-rate">目前示範語速：{document.documentElement.dataset.voiceRate === "0.9" ? "標準語速" : "慢速示範"}；可在家長設定切換。語音設定：{document.documentElement.dataset.voiceSource === "device" ? "裝置語音" : "課程音檔優先"}。</span>
        {!recognitionConstructor && (
          <span>這台裝置暫不支援語音辨識，可用下方「照顧者確認」記下孩子已開口。</span>
        )}
      </div>
      <div className="speaking-practice-learners">
        {learners.map((child) => {
          const result = feedback[child.id];
          const listening = listeningChildId === child.id;
          const recording = recordings[child.id];
          const recordingHere = activeRecording?.childId === child.id;
          const recordingPhase = recordingHere ? activeRecording.phase : null;
          const recordingBusy = activeRecording !== null && !recordingHere;
          return (
            <article
              key={child.id}
              className={result ? (result.correct ? "correct" : "wrong") : ""}
            >
              <div className="speaking-practice-child-copy"><strong>{child.name}</strong><span>目標：{lessonInstructionText(target)}</span></div>
              <div className="speaking-practice-actions">
                {recordingSupported ? <button
                  type="button"
                  className={recordingHere ? "recording" : ""}
                  disabled={recordingBusy || listeningChildId !== null || recordingPhase === "permission" || recordingPhase === "stopping"}
                  onClick={() => recordingHere && recordingPhase === "recording" ? void stopRecording(child.id) : void startRecording(child.id)}
                >
                  <Mic /> {recordingPhase === "permission" ? "等待麥克風…" : recordingPhase === "recording" ? "停止錄音" : recordingPhase === "stopping" ? "正在完成錄音…" : recording?.clip ? "再錄一次" : "換我說"}
                </button> : <span className="speaking-practice-recording-unavailable">這台裝置暫不支援本機錄音。</span>}
                {recognitionConstructor && <button
                  type="button"
                  className="speech-recognition-optional"
                  disabled={listeningChildId !== null || activeRecording !== null}
                  onClick={() => startListening(child.id)}
                >
                  <Mic /> {listening ? "AI 正在辨識字詞…" : "AI 字詞辨識（選用）"}
                </button>}
                {!result?.correct && <button type="button" className="caregiver-confirm" disabled={listeningChildId !== null || activeRecording !== null} onClick={() => confirmSpoken(child.id)}><Check /> 照顧者確認</button>}
              </div>
              {(recording?.clip || recording?.detail) && <div className="speaking-practice-recording">
                {recording.clip && <audio controls preload="metadata" src={recording.clip.objectUrl}>你的瀏覽器無法播放這段錄音。</audio>}
                <div>
                  {recording.detail && <span>{recording.detail}</span>}
                  {recording.clip && <button type="button" onClick={() => deleteRecording(child.id)}>刪除此段</button>}
                </div>
              </div>}
              <small>
                {result
                  ? result.correct
                    ? result.confirmedByCaregiver
                      ? "照顧者已確認完成這次口說練習"
                      : `辨識到目標詞：「${result.transcript}」`
                    : result.transcript
                      ? `請再試一次：我聽到「${result.transcript}」`
                      : "目前無法判斷"
                  : listening ? "正在辨識字詞，說完後請稍候…" : "先錄音並回放；需要時再使用選用的字詞辨識。"}
                {result?.detail && <em>{result.detail}</em>}
              </small>
            </article>
          );
        })}
      </div>
      <footer>
        麥克風只會在你按下錄音或字詞辨識後啟用；錄音預設只留在本頁記憶體，離頁即釋放。瀏覽器字詞辨識可能使用瀏覽器供應商的語音服務，因此不宣稱為純本機處理；它只檢查是否辨識到目標詞，不是音素級發音檢定，也不顯示發音分數。
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
            <strong>{lessonInstructionText(target)}</strong>
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
                      {lessonInstructionText(choice)}
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
  guidance,
  number,
  stage,
  vocabulary,
  blockId,
  learners,
  progress,
  todayYmd,
  formal,
  completionState,
  onToggle,
  onAnswer,
}: {
  mission: LessonBlock["missions"][number];
  guidance: Pick<LessonBlock, "steps" | "caregiverTip" | "younger" | "older">;
  number: number;
  stage: number;
  vocabulary: string[];
  blockId: string;
  learners: AppSettings["children"];
  progress: AppProgress;
  todayYmd: string;
  formal: boolean;
  completionState: LessonCompletionState;
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
  const choose = (childId: string, answer: string, choiceButton?: HTMLButtonElement) => {
    if (!formal) return;
    const correct = answer === target;
    playV4Sound(correct ? "success" : "error");
    onAnswer(childId, target, answer, correct, stage);
    setFeedback((current) => ({
      ...current,
      [childId]: correct ? "correct" : "wrong",
    }));
    if (correct && choiceButton && document.documentElement.dataset.motionEffects !== "false" && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      choiceButton.animate([
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(2px) scale(.97)', offset: .38 },
        { transform: 'translateY(0) scale(1.035)', offset: .72 },
        { transform: 'translateY(0) scale(1)' },
      ], { duration: 200, easing: 'ease-out' });
    }
    if (!correct && document.documentElement.dataset.motionEffects !== "false" && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`[data-quick-child="${childId}"]`)?.animate(
          [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-3px)', offset: .28 },
            { transform: 'translateX(3px)', offset: .64 },
            { transform: 'translateX(0)' },
          ],
          { duration: 180, easing: 'ease-out' },
        );
      });
    }
    if (correct) speak(answer);
  };
  return (
    <section className="v4-stage-content">
      <StageHeading
        icon={<Gamepad2 />}
        eyebrow={`STAGE ${number + 6}`}
        title={mission.title}
        text="先照任務目標帶活動，再聽題作答，最後替每位孩子確認完成。"
      />
      <div className="v4-mission-focus">
        <div className="v4-mission-number">
          <small>任務</small>
          {number}
        </div>
        <div>
          <span>{mission.title}</span>
          <h3 className="v6-mission-prompt"><span>{lessonInstructionText(missionPrompt.context)}</span>{missionPrompt.sentence && <strong>{lessonInstructionText(missionPrompt.sentence)}</strong>}</h3>
          <p>
            <strong>完成標準</strong>
            {lessonInstructionText(mission.criteria)}
          </p>
        </div>
      </div>
      <details className="v64-mission-guidance" key={`${blockId}:${number}`}>
        <summary>查看實作與分齡帶法</summary>
        <div className="v64-mission-guidance-body">
          <section>
            <h3>先準備</h3>
            <p>{lessonInstructionText(guidance.caregiverTip)}</p>
          </section>
          <section>
            <h3>帶孩子做活動</h3>
            <ol>
              {guidance.steps.slice(-2).map((step) => (
                <li key={step.minute}>{lessonInstructionText(step.instruction)}</li>
              ))}
            </ol>
          </section>
          <section>
            <h3>較小的孩子</h3>
            <p>{lessonInstructionText(guidance.younger)}</p>
          </section>
          <section>
            <h3>較大的孩子</h3>
            <p>{lessonInstructionText(guidance.older)}</p>
          </section>
        </div>
      </details>
      <section className="v4-quick-check v653-quick-check">
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
              <div key={child.id} className={`v653-answer-card ${state ?? ""}`} data-quick-child={child.id}>
                <div className="v4-quick-check-learner">
                  <AvatarHero
                    avatarId={child.avatar}
                    xp={calculateRewards(p).xp}
                    equippedCosmetics={p.equippedCosmetics}
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
                        onClick={(event) => choose(child.id, choice, event.currentTarget)}
                      >
                        {lessonInstructionText(choice)}
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
                  {state === "correct" && <div className="v6-answer-win" aria-live="polite"><Sparkles /> 答對了！星星能量已收集<span className="v64-answer-stars" aria-hidden="true"><i/><i/><i/></span></div>}
                </div>
              </div>
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
              disabled={!formal || done || !completionState.canComplete}
              className={done ? "done" : ""}
              onClick={() => onToggle(child.id, mission)}
            >
              <AvatarHero avatarId={child.avatar} xp={r.xp} equippedCosmetics={p.equippedCosmetics} size={82} />
              <span>
                <small>STEP 3 · {done ? "已完成" : !formal ? "正式上課時確認" : completionState.canComplete ? "等待確認" : completionState.reason}</small>
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
