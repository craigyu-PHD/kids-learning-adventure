import { curriculum } from '../src/data/curriculum';
import { videos } from '../src/data/videos';
import type { VideoClip } from '../src/types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const days = curriculum;
const blocks = days.flatMap((day) => day.blocks);
const missions = blocks.flatMap((block) => block.missions);
const allClips: VideoClip[] = blocks.flatMap((block) => [block.warmup, block.video]);
const videoMap = new Map(Object.values(videos).map((video) => [video.videoId, video]));
let alignedBlocks = 0;

assert(days.length === 90, `Expected 90 course days, got ${days.length}`);
assert(new Set(days.map((day) => day.id)).size === 90, 'Course day IDs must be unique');
assert(new Set(days.map((day) => day.index)).size === 90, 'Course day indexes must be unique');
assert(Math.min(...days.map((day) => day.index)) === 1 && Math.max(...days.map((day) => day.index)) === 90, 'Course day indexes must cover 1..90');

for (let week = 1; week <= 18; week += 1) {
  const weekDays = days.filter((day) => day.week === week);
  assert(weekDays.length === 5, `Week ${week} must contain 5 days; got ${weekDays.length}`);
}

assert(blocks.length === 180, `Expected 180 lesson blocks, got ${blocks.length}`);
assert(new Set(blocks.map((block) => block.id)).size === blocks.length, 'Lesson block IDs must be unique');
assert(new Set(missions.map((mission) => mission.id)).size === missions.length, 'Mission IDs must be unique');

for (const day of days) {
  assert(day.blocks.length === 2, `Day ${day.index} must contain exactly 2 blocks`);
  assert(Boolean(day.title && day.bigIdea && day.bonus), `Day ${day.index} is missing title/big idea/bonus`);

  for (const block of day.blocks) {
    assert(block.duration >= 20 && block.duration <= 35, `${block.id}: duration ${block.duration} is outside 20–35 minutes`);
    assert(block.vocabulary.length >= 4, `${block.id}: needs at least 4 vocabulary items`);
    assert(Boolean(block.sentence.trim()), `${block.id}: sentence pattern is empty`);
    assert(block.steps.length >= 6, `${block.id}: needs at least 6 caregiver steps`);
    assert(block.missions.length >= 2, `${block.id}: needs at least 2 interactive missions`);
    assert(Boolean(block.caregiverTip && block.younger && block.older), `${block.id}: missing caregiver/age-level guidance`);
    assert(Boolean(block.videoFocus.trim()), `${block.id}: videoFocus is missing`);
    assert(block.requiredVideoTopics.length > 0, `${block.id}: requiredVideoTopics is empty`);
    assert(block.video.topics.length > 0, `${block.id}: main video has no audited topics`);
    const matchedTopics = block.requiredVideoTopics.filter((topic) => block.video.topics.includes(topic));
    assert(
      matchedTopics.length > 0,
      `${block.id}: main video "${block.video.title}" topics [${block.video.topics.join(', ')}] do not match required [${block.requiredVideoTopics.join(', ')}] for "${block.videoFocus}"`,
    );
    alignedBlocks += 1;

    for (const mission of block.missions) {
      assert(Boolean(mission.title && mission.prompt && mission.criteria), `${mission.id}: mission guidance is incomplete`);
      assert(mission.xp > 0 && mission.coins > 0, `${mission.id}: rewards must be positive`);
    }

    for (const clip of [block.warmup, block.video]) {
      assert(Boolean(clip.videoId && clip.channel && clip.title), `${block.id}: video metadata incomplete`);
      assert(Array.isArray(clip.topics) && clip.topics.length > 0, `${clip.id}: audited topic metadata missing`);
      assert(typeof clip.sourceUrl === 'string' && clip.sourceUrl.length > 0, `${block.id}: sourceUrl missing`);
      assert(videoMap.has(clip.videoId), `${block.id}: unknown video ID ${clip.videoId}`);
      assert(clip.sourceUrl.includes(clip.videoId), `${clip.id}: sourceUrl does not match videoId`);
      if (clip.start !== undefined) assert(clip.start >= 0, `${clip.id}: start must be >= 0`);
      if (clip.end !== undefined) assert(clip.end > (clip.start ?? 0), `${clip.id}: end must be greater than start`);
    }
  }
}

const foodWarmupIds = new Set(['fruit-yummy', 'apples-bananas', 'vegetables', 'counting-bananas', 'food']);
const nonFoodWarmups = blocks.filter((block) => !foodWarmupIds.has(block.warmup.id));
assert(nonFoodWarmups.length === 0, `${nonFoodWarmups.length} blocks do not use a food-oriented warmup`);

const subjects = new Map<string, number>();
for (const block of blocks) subjects.set(block.subject, (subjects.get(block.subject) ?? 0) + 1);
assert((subjects.get('English') ?? 0) > 0, 'Semester must include English blocks');
assert((subjects.get('Math') ?? 0) > 0, 'Semester must include Math blocks');
assert((subjects.get('Zhuyin') ?? 0) > 0, 'Semester must include Zhuyin blocks');

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 curriculum-validator/2.1' },
    signal: AbortSignal.timeout(25_000),
  });
  return { response, text: await response.text() };
}

async function validateYouTubeOnline() {
  const unique = [...new Set(allClips.map((clip) => clip.videoId))].sort();
  const failures: string[] = [];

  for (const videoId of unique) {
    try {
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const oembedUrl = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`;
      const oembed = await fetch(oembedUrl, { signal: AbortSignal.timeout(20_000) });
      if (!oembed.ok) throw new Error(`oEmbed HTTP ${oembed.status}`);
      const meta = await oembed.json() as { title?: string; author_name?: string };

      const { response, text } = await fetchText(watchUrl);
      if (!response.ok) throw new Error(`watch HTTP ${response.status}`);
      const duration = Number(text.match(/"lengthSeconds":"(\d+)"/)?.[1] ?? NaN);
      const embed = text.match(/"playableInEmbed":(true|false)/)?.[1];
      const status = text.match(/"playabilityStatus":\{"status":"([A-Z_]+)"/)?.[1];
      if (status !== 'OK') throw new Error(`playabilityStatus=${status ?? 'unknown'}`);
      if (embed !== 'true') throw new Error(`playableInEmbed=${embed ?? 'unknown'}`);
      if (!Number.isFinite(duration) || duration <= 0) throw new Error('duration unavailable');

      const clips = allClips.filter((clip) => clip.videoId === videoId);
      for (const clip of clips) {
        if (clip.end !== undefined && clip.end > duration) {
          throw new Error(`${clip.id} ends at ${clip.end}s but video duration is ${duration}s`);
        }
      }
      console.log(`YT OK  ${videoId}  ${duration}s  ${meta.author_name ?? ''} | ${meta.title ?? ''}`);
    } catch (error) {
      failures.push(`${videoId}: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`YT FAIL ${videoId}`, error);
    }
  }

  assert(failures.length === 0, `YouTube validation failed:\n${failures.join('\n')}`);
  return unique.length;
}

console.log(`STRUCTURE OK  ${days.length} days / ${blocks.length} blocks / ${missions.length} missions`);
console.log(`SUBJECTS      ${[...subjects.entries()].map(([key, value]) => `${key}:${value}`).join('  ')}`);
console.log(`VIDEOS        ${new Set(allClips.map((clip) => clip.videoId)).size} unique YouTube IDs`);
console.log(`ALIGNMENT     ${alignedBlocks}/${blocks.length} main lesson videos match audited lesson-topic tags`);

if (process.argv.includes('--online')) {
  const count = await validateYouTubeOnline();
  console.log(`ONLINE OK     ${count}/${count} YouTube videos playable and embeddable`);
}
