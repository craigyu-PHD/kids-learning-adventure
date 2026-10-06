import type { ChildProgress, LessonBlock } from './types';

/**
 * V6.5 lesson completion contract.
 * UI stage 1 is caregiver preparation and persists as legacy-compatible key 9;
 * the historic child stages keep keys 0..8.
 */
export const LESSON_REQUIRED_STAGE_KEYS_BEFORE_BLOCK_COMPLETE = [9, 0, 1, 2, 3, 4, 5, 6] as const;

export function lessonStagePersistenceKey(uiStage: number) {
  return uiStage === 0 ? 9 : uiStage - 1;
}

export type LessonCompletionState = {
  canComplete: boolean;
  reason: string;
  missingMissionIds: string[];
  missingStageKeys: number[];
};

const REQUIRED_STAGE_KEYS_BEFORE_MISSION = [
  [9, 0, 1, 2, 3, 4],
  [9, 0, 1, 2, 3, 4, 5],
] as const;

export function lessonMissionCompletionState(completedStages: number[], missionIndex: number): LessonCompletionState {
  const required = REQUIRED_STAGE_KEYS_BEFORE_MISSION[missionIndex];
  if (!required) return { canComplete: false, reason: '找不到這個課堂任務。', missingMissionIds: [], missingStageKeys: [] };
  const missingStageKeys = required.filter((key) => !completedStages.includes(key));
  return missingStageKeys.length
    ? { canComplete: false, reason: '請先依序完成前面的正式課程關卡。', missingMissionIds: [], missingStageKeys }
    : { canComplete: true, reason: '可以確認這個任務完成。', missingMissionIds: [], missingStageKeys: [] };
}

export function lessonBlockCompletionState(
  progress: Pick<ChildProgress, 'completedMissions' | 'completedBlocks'>,
  block: LessonBlock,
  completedStages: number[],
): LessonCompletionState {
  if (progress.completedBlocks.includes(block.id)) {
    return { canComplete: false, reason: '本堂課已完成，不會重複結算。', missingMissionIds: [], missingStageKeys: [] };
  }
  const missingMissionIds = block.missions
    .map((mission) => mission.id)
    .filter((id) => !progress.completedMissions.includes(id));
  const missingStageKeys = LESSON_REQUIRED_STAGE_KEYS_BEFORE_BLOCK_COMPLETE
    .filter((key) => !completedStages.includes(key));
  if (missingMissionIds.length) {
    return {
      canComplete: false,
      reason: `還有 ${missingMissionIds.length} 個任務未完成。`,
      missingMissionIds,
      missingStageKeys,
    };
  }
  if (missingStageKeys.length) {
    return {
      canComplete: false,
      reason: '請先依序完成家長備課與前面的正式課程關卡。',
      missingMissionIds,
      missingStageKeys,
    };
  }
  return { canComplete: true, reason: '可以完成本堂課並結算一次獎勵。', missingMissionIds: [], missingStageKeys: [] };
}

export function lessonStageLabel(block: LessonBlock, uiStage: number) {
  if (uiStage === 6) return { title: block.missions[0]?.title || '任務一', short: '任務 1' };
  if (uiStage === 7) return { title: block.missions[1]?.title || '任務二', short: '任務 2' };
  return undefined;
}
