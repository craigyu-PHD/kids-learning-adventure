import assert from 'node:assert/strict';
import {
  LESSON_REQUIRED_STAGE_KEYS_BEFORE_BLOCK_COMPLETE,
  lessonBlockCompletionState,
  lessonMissionCompletionState,
  lessonStageLabel,
  lessonStagePersistenceKey,
} from '../src/lessonCompletionPolicy';
import type { ChildProgress, LessonBlock } from '../src/types';

const block = {
  id: 'qa-block',
  missions: [
    { id: 'qa-mission-1', title: '找出今天的交通工具' },
    { id: 'qa-mission-2', title: '把單字送回正確星球' },
  ],
} as unknown as LessonBlock;
const progress = (missions: string[] = [], blocks: string[] = []) => ({
  completedMissions: missions,
  completedBlocks: blocks,
}) as Pick<ChildProgress, 'completedMissions' | 'completedBlocks'>;

assert.equal(lessonStagePersistenceKey(0), 9, 'preparation must retain compatibility key 9');
assert.equal(lessonStagePersistenceKey(1), 0);
assert.deepEqual(LESSON_REQUIRED_STAGE_KEYS_BEFORE_BLOCK_COMPLETE, [9,0,1,2,3,4,5,6]);

assert.equal(lessonMissionCompletionState([9,0,1,2,3], 0).canComplete, false, 'mission 1 must reject missing prior stage');
assert.equal(lessonMissionCompletionState([9,0,1,2,3,4], 0).canComplete, true, 'mission 1 must accept exact prior stages');
assert.equal(lessonMissionCompletionState([9,0,1,2,3,4], 1).canComplete, false, 'mission 2 must require mission-1 stage persistence');
assert.equal(lessonMissionCompletionState([9,0,1,2,3,4,5], 1).canComplete, true);

let state = lessonBlockCompletionState(progress(['qa-mission-1']), block, [9,0,1,2,3,4,5,6]);
assert.equal(state.canComplete, false);
assert.match(state.reason, /任務未完成/);
state = lessonBlockCompletionState(progress(['qa-mission-1','qa-mission-2']), block, [9,0,1,2,3,4,5]);
assert.equal(state.canComplete, false);
assert.match(state.reason, /前面的正式課程關卡/);
state = lessonBlockCompletionState(progress(['qa-mission-1','qa-mission-2']), block, [9,0,1,2,3,4,5,6]);
assert.equal(state.canComplete, true);
state = lessonBlockCompletionState(progress(['qa-mission-1','qa-mission-2'], ['qa-block']), block, [9,0,1,2,3,4,5,6]);
assert.equal(state.canComplete, false, 'completed block must never be completable twice');
assert.match(state.reason, /不會重複結算/);

assert.equal(lessonStageLabel(block, 6)?.title, '找出今天的交通工具');
assert.equal(lessonStageLabel(block, 7)?.title, '把單字送回正確星球');
assert.equal(lessonStageLabel(block, 6)?.short, '任務 1');
assert.equal(lessonStageLabel(block, 7)?.short, '任務 2');

console.log('PASS qa_v65_lesson_policy: shared mission/block completion policy, no silent UI/App divergence, dynamic mission labels');
