import { adaptiveChoiceCount, buildLearningProfile, masteryScore } from '../src/learningAnalytics';
import type { AnswerEvent } from '../src/types';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const expect = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const events: AnswerEvent[] = [
  { id: 'a', dayId: 'd1', blockId: 'review:b1', stage: -1, target: 'apple', answer: 'banana', correct: false, createdAt: '2026-08-20T10:00:00.000Z' },
  { id: 'b', dayId: 'd1', blockId: 'b1', stage: 5, target: 'apple', answer: 'apple', correct: true, createdAt: '2026-08-20T10:01:00.000Z' },
  { id: 'c', dayId: 'd1', blockId: 'b2', stage: 6, target: 'orange', answer: 'orange', correct: true, createdAt: '2026-08-21T10:00:00.000Z' },
  { id: 'd', dayId: 'd2', blockId: 'b3', stage: 6, target: 'apple', answer: 'orange', correct: false, createdAt: '2026-08-22T10:00:00.000Z' },
];
const profile = buildLearningProfile(events, '2026-08-29');
const vocabulary = profile.skills.find((skill) => skill.id === 'vocabulary');
const listening = profile.skills.find((skill) => skill.id === 'listening');
const speaking = profile.skills.find((skill) => skill.id === 'speaking');

expect(masteryScore(1, 1) !== 100, 'a single correct response must not become mastery.');
expect(adaptiveChoiceCount(null) === 3, 'first exposure must remain neutral.');
expect(adaptiveChoiceCount(55) === 2 && adaptiveChoiceCount(77) === 3 && adaptiveChoiceCount(91) === 4, 'adaptive choice counts must follow evidence bands.');
expect(vocabulary?.attempts === 4 && vocabulary.correct === 2, 'vocabulary must use real Quick Check events.');
expect(listening?.attempts === 4 && listening.correct === 2, 'listening must use real Quick Check events.');
expect(speaking?.score === null && speaking.band === 'not-assessed', 'unobserved speaking must not be fabricated.');
expect(profile.reviewTargets[0]?.target === 'apple', 'incorrect targets must be prioritized for review.');
expect(profile.reviewTargets[0]?.nextReview === '2026-08-23', 'low-confidence target must receive a one-day interval from its last attempt.');
const spokenProfile = buildLearningProfile([...events, { id: 'spoken', dayId: 'd3', blockId: 'speaking:b4', stage: -2, target: 'banana', answer: 'banana', correct: true, confidence: .86, createdAt: '2026-08-28T10:00:00.000Z' }], '2026-08-29');
const observedSpeaking = spokenProfile.skills.find((skill) => skill.id === 'speaking');
expect(observedSpeaking?.attempts === 1 && observedSpeaking.correct === 1 && observedSpeaking.score !== 100, 'speaking must use isolated real speech telemetry without false mastery.');
const app = readFileSync(resolve(import.meta.dirname, '../src/App.tsx'), 'utf8');
const quest = readFileSync(resolve(import.meta.dirname, '../src/v4/LessonQuest.tsx'), 'utf8');
expect(app.includes('stage === -1 ? `review:${block.id}` : stage === -2 ? `speaking:${block.id}` : block.id'), 'review and speaking must have isolated reward sources.');
expect(quest.includes('<DailyReviewPanel') && quest.includes('onAnswer(childId, target, answer, correct, -1)'), 'daily review must record only isolated review telemetry.');
expect(quest.includes('<SpeakingPractice') && quest.includes('onAnswer(childId, target, transcript, correct, -2, alternative.confidence)'), 'speaking must record only isolated speech telemetry.');
expect(quest.includes('SpeechRecognition') && quest.includes('麥克風只會在你按下按鈕後啟用') && quest.includes('本站不保存聲音檔'), 'speaking practice must be user-initiated and must not claim to store raw audio.');
console.log('Learning analytics QA: PASS');
