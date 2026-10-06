import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { validateVideoUsePolicy, type ReuseReview, type VideoUse } from './curriculum_video_policy';

const clip = { id: 'clip-1', title: 'Head Shoulders Knees And Toes', channel: 'Super Simple Songs', videoId: 'WX8HmogNyCY', topics: ['body'], sourceUrl: 'https://www.youtube.com/watch?v=WX8HmogNyCY' };
const uses: VideoUse[] = [{ key: 'w1d1b1:warmup', clip }, { key: 'w2d1b1:main', clip: { ...clip, id: 'clip-2' } }];
const reviews: ReuseReview = {
  'w1d1b1:warmup': { videoId: clip.videoId, publisherPage: 'https://supersimple.com/song/head-shoulders-knees-toes-speeding-up/', purpose: '暖身跟節奏指認 head 和 shoulders，先看成人動作再模仿。' },
  'w2d1b1:main': { videoId: clip.videoId, publisherPage: 'https://supersimple.com/song/head-shoulders-knees-toes-speeding-up/', purpose: '主課只聽口令指出 knees 和 toes，暫停畫面後從記憶提取身體位置。' },
};
const rows: { name: string; pass: boolean }[] = [];
function test(name: string, run: () => void) { run(); rows.push({ name, pass: true }); }
test('reviewed reuse passes with distinct slot identity; singleton absence does not certify semantics', () => {
  const result = validateVideoUsePolicy(uses, reviews);
  assert.equal(result.assignmentSlots, 2); assert.equal(result.uniqueVideoIds, 1);
  assert.equal(result.reviewedReuseSlots, 2); assert.equal(result.semanticApproval, false);
  const singleton = validateVideoUsePolicy([uses[0]], {});
  assert.equal(singleton.suppliedReviewSlots, 0); assert.equal(singleton.semanticApproval, false);
});
test('negative: new repeated use without its own lesson-role review fails', () => {
  const missing = { ...reviews }; delete missing['w2d1b1:main'];
  assert.throws(() => validateVideoUsePolicy(uses, missing), /w2d1b1:main: reused video .* requires its own/);
});
test('negative: stale video or lesson-role binding cannot be reused', () => {
  assert.throws(() => validateVideoUsePolicy(uses, { ...reviews, 'w2d1b1:main': { ...reviews['w2d1b1:main'], videoId: 'abcdefghijk' } }), /review videoId mismatch/);
  const wrongRole: ReuseReview = { ...reviews, 'w2d1b1:warmup': reviews['w2d1b1:main'] }; delete wrongRole['w2d1b1:main'];
  assert.throws(() => validateVideoUsePolicy(uses, wrongRole), /review has no current lesson\/role assignment/);
});
test('negative: Teaching Tips, MakingOf, Trailer are rejected even with review evidence', () => {
  for (const title of ['Head Shoulders | Teaching Tips', 'MakingOf the Song', 'Official Trailer']) {
    assert.throws(() => validateVideoUsePolicy(uses.map(use => ({ ...use, clip: { ...use.clip, title } })), reviews), /adult teaching\/production\/promotional clip/);
  }
});
test('reuse purpose and official page guards reject duplicated or unsupported evidence', () => {
  assert.throws(() => validateVideoUsePolicy(uses, { ...reviews, 'w2d1b1:main': { ...reviews['w2d1b1:main'], purpose: reviews['w1d1b1:warmup'].purpose } }), /differentiated teaching purposes/);
  assert.throws(() => validateVideoUsePolicy(uses, { ...reviews, 'w2d1b1:main': { ...reviews['w2d1b1:main'], publisherPage: 'https://supersimple.com.example.org/song/example/' } }), /official publisher content page missing/);
});
test('verified publisher series and affiliated channels retain strict source guards', () => {
  for (const channel of ["Carl's Car Wash", 'Super Simple ABCs', 'Noodle & Pals', 'Rhymington Square - Songs & Rhymes for Kids!']) {
    const affiliated = uses.map(use => ({ ...use, clip: { ...use.clip, channel } }));
    const phonics = Object.fromEntries(Object.entries(reviews).map(([key, review]) =>
      [key, { ...review, publisherPage: 'https://supersimple.com/phonics-fun/a-is-for-apple/' }]));
    assert.equal(validateVideoUsePolicy(affiliated, phonics).reviewedReuseSlots, 2);
    for (const publisherPage of ['http://supersimple.com/song/example/', 'https://supersimple.com.example.org/song/example/', 'https://name@supersimple.com/song/example/', 'https://supersimple.com/']) {
      assert.throws(() => validateVideoUsePolicy(affiliated, { ...phonics, 'w2d1b1:main': { ...phonics['w2d1b1:main'], publisherPage } }), /official publisher content page missing/);
    }
  }
  for (const channel of ["Carl's Car Wash fan channel", 'Unknown Music', 'Noodle & Pals fan channel', 'Rhymington Square unofficial']) {
    assert.throws(() => validateVideoUsePolicy(uses.map(use => ({ ...use, clip: { ...use.clip, channel } })), reviews), /official publisher content page missing/);
  }
});
// Exact author names and official single-song routes were verified in
// qa/v65/course-video-review/final20-official-evidence-astra.json.
const newPublishers = [
  { channel: 'Finny The Shark', videoId: 'R9wDQWJ_z_A', title: 'Down In The Deep Blue Sea', page: 'https://supersimple.com/song/down-in-the-deep-blue-sea/' },
  { channel: 'The Singing Walrus - English Songs For Kids', videoId: 'vcUyDAO1Fk0', title: 'Sun, Moon, and Stars', page: 'https://www.thesingingwalrus.com/songs/sun-moon-and-stars/' },
];
for (const publisher of newPublishers) {
  const publisherUses = uses.map(use => ({ ...use, clip: { ...use.clip, channel: publisher.channel, videoId: publisher.videoId, title: publisher.title } }));
  const publisherReviews = Object.fromEntries(Object.entries(reviews).map(([key], index) =>
    [key, { videoId: publisher.videoId, publisherPage: publisher.page, purpose: index === 0 ? 'Fixture: first lesson follows a model.' : 'Fixture: later lesson independently recalls and explains.' }]));
  test(`verified exact publisher: ${publisher.channel}`, () => {
    const result = validateVideoUsePolicy(publisherUses, publisherReviews);
    assert.equal(result.reviewedReuseSlots, 2);
    assert.equal(result.semanticApproval, false);
    // Equivalent official hosts and optional trailing slash are valid routes.
    const alternate = publisher.page.replace('www.', '').replace(/\/$/, '');
    assert.equal(validateVideoUsePolicy(publisherUses, { ...publisherReviews,
      'w2d1b1:main': { ...publisherReviews['w2d1b1:main'], publisherPage: alternate } }).reviewedReuseSlots, 2);
  });
  const page = new URL(publisher.page);
  const badPages = [
    publisher.page.replace('https:', 'http:'),
    `https://${page.hostname}.example.org${page.pathname}`,
    `https://fan.${page.hostname}${page.pathname}`,
    `https://name@${page.hostname}${page.pathname}`,
    `https://name:password@${page.hostname}${page.pathname}`,
    `https://${page.hostname}:8443${page.pathname}`,
    `https://${page.hostname}/`,
    `https://${page.hostname}/songs/`,
    `https://${page.hostname}/blog/sun-moon-and-stars/`,
    `https://${page.hostname}${page.pathname}fan/`,
    `https://${page.hostname}${page.pathname}lyrics.html`,
    `${publisher.page}?redirect=https://example.org`,
    `${publisher.page}#unverified-section`,
    `https://www.youtube.com/watch?v=${publisher.videoId}`,
    `https://youtu.be/${publisher.videoId}`,
    newPublishers.find(other => other.channel !== publisher.channel)!.page,
  ];
  for (const publisherPage of badPages) test(`negative publisher URL: ${publisher.channel} / ${publisherPage}`, () => {
    assert.throws(() => validateVideoUsePolicy(publisherUses, { ...publisherReviews,
      'w2d1b1:main': { ...publisherReviews['w2d1b1:main'], publisherPage } }), /official publisher content page missing/);
  });
  for (const channel of [publisher.channel.toLowerCase(), `${publisher.channel} fan channel`, `unofficial ${publisher.channel}`, 'Unknown Music']) {
    test(`negative exact publisher channel: ${channel}`, () => {
      assert.throws(() => validateVideoUsePolicy(publisherUses.map(use => ({ ...use, clip: { ...use.clip, channel } })), publisherReviews), /official publisher content page missing/);
    });
  }
}
const output = { status: 'PASS', rows, note: 'Policy unit fixtures only; no source page fetch or semantic certification. Singing Walrus publisher-page linkage does not assert that its Vimeo embed is the YouTube clip.' };
mkdirSync('qa/v65/video-policy', { recursive: true });
writeFileSync('qa/v65/video-policy/negative-controls.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
