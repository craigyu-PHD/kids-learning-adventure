import type { AnswerEvent } from './types';

export const learningSkillIds = ['vocabulary', 'listening', 'speaking', 'sentence', 'phonics', 'comprehension'] as const;
export type LearningSkillId = typeof learningSkillIds[number];
export type MasteryBand = 'not-assessed' | 'needs-review' | 'learning' | 'developing' | 'mastered';

type TargetStats = {
  target: string;
  attempts: number;
  correct: number;
  incorrect: number;
  lastSeen: string;
};

export type SkillMastery = {
  id: LearningSkillId;
  label: string;
  attempts: number;
  correct: number;
  accuracy: number | null;
  score: number | null;
  band: MasteryBand;
  nextReview: string | null;
};

export type LearningProfile = {
  skills: SkillMastery[];
  reviewTargets: Array<TargetStats & { nextReview: string; score: number }>;
  suggestion: string;
};

const skillLabels: Record<LearningSkillId, string> = {
  vocabulary: '單字辨識',
  listening: '聽力理解',
  speaking: '口說表達',
  sentence: '句型運用',
  phonics: '自然發音',
  comprehension: '整體理解',
};

const addDays = (ymd: string, days: number) => {
  const date = new Date(`${ymd}T12:00:00+08:00`);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
};

const taipeiYmdFromIso = (iso: string) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(iso));

const reviewInterval = (score: number) => score < 40 ? 1 : score < 70 ? 3 : score < 85 ? 7 : score < 95 ? 14 : 30;

const masteryBand = (score: number | null): MasteryBand => {
  if (score === null) return 'not-assessed';
  if (score < 40) return 'needs-review';
  if (score < 70) return 'learning';
  if (score < 85) return 'developing';
  return 'mastered';
};

/**
 * Scores are derived from append-only answer telemetry rather than written
 * back into ChildProgress. A perfect first answer therefore remains
 * "developing" until enough real attempts establish confidence.
 */
export const masteryScore = (correct: number, attempts: number) => {
  if (!attempts) return null;
  const accuracy = correct / attempts;
  const sampleConfidence = Math.min(attempts / 6, 1);
  return Math.round((accuracy * 80 + sampleConfidence * 20) * 100) / 100;
};

/** Keep first exposure neutral; only real evidence changes task support. */
export const adaptiveChoiceCount = (vocabularyScore: number | null) => {
  if (vocabularyScore === null) return 3;
  if (vocabularyScore < 70) return 2;
  if (vocabularyScore < 85) return 3;
  return 4;
};

export const adaptivePrompt = (vocabularyScore: number | null) => {
  if (vocabularyScore === null) return '標準挑戰';
  if (vocabularyScore < 70) return '學習提示：先聽一次，再從兩個選項中挑選';
  if (vocabularyScore < 85) return '標準挑戰：聽清楚後選出正確單字';
  return '進階挑戰：試著從更多選項中找出正確答案';
};

const skillsForEvent = (event: AnswerEvent): LearningSkillId[] => {
  // The current Quick Check asks learners to listen and identify a vocabulary
  // target. Future speaking/phonics activities can add their own stage mapping
  // without fabricating mastery from lesson completion.
  if (event.stage === -2) return ['speaking'];
  if (event.stage === -1 || event.stage === 5 || event.stage === 6) return ['vocabulary', 'listening'];
  return [];
};

export function buildLearningProfile(events: AnswerEvent[] | undefined, todayYmd: string): LearningProfile {
  const allEvents = events ?? [];
  const bySkill = new Map<LearningSkillId, AnswerEvent[]>();
  learningSkillIds.forEach((id) => bySkill.set(id, []));
  const targets = new Map<string, TargetStats>();

  allEvents.forEach((event) => {
    skillsForEvent(event).forEach((skill) => bySkill.get(skill)?.push(event));
    const existing = targets.get(event.target) ?? { target: event.target, attempts: 0, correct: 0, incorrect: 0, lastSeen: event.createdAt };
    existing.attempts += 1;
    if (event.correct) existing.correct += 1;
    else existing.incorrect += 1;
    if (event.createdAt > existing.lastSeen) existing.lastSeen = event.createdAt;
    targets.set(event.target, existing);
  });

  const skills = learningSkillIds.map((id) => {
    const attempts = bySkill.get(id) ?? [];
    const correct = attempts.filter((event) => event.correct).length;
    const score = masteryScore(correct, attempts.length);
    return {
      id,
      label: skillLabels[id],
      attempts: attempts.length,
      correct,
      accuracy: attempts.length ? Math.round(correct / attempts.length * 100) : null,
      score,
      band: masteryBand(score),
      nextReview: score === null ? null : addDays(todayYmd, reviewInterval(score)),
    };
  });

  const reviewTargets = [...targets.values()]
    .map((target) => {
      const score = masteryScore(target.correct, target.attempts) ?? 0;
      return { ...target, score, nextReview: addDays(taipeiYmdFromIso(target.lastSeen), reviewInterval(score)) };
    })
    .sort((left, right) => right.incorrect - left.incorrect || left.score - right.score || left.lastSeen.localeCompare(right.lastSeen))
    .slice(0, 6);

  const priority = reviewTargets[0];
  const suggestion = !allEvents.length
    ? '完成互動 Quick Check 後，系統才會依真實作答提供複習建議。'
    : priority && priority.incorrect > 0
      ? `建議先複習「${priority.target}」，目前有 ${priority.incorrect} 次答錯紀錄。`
      : '目前作答表現穩定；可在下次課前安排 3–5 題聽力單字複習。';

  return { skills, reviewTargets, suggestion };
}
