import type { VideoClip } from '../src/types';

export type VideoUse = { key: string; clip: VideoClip };
export type ReuseReview = Record<string, { videoId: string; publisherPage: string; purpose: string }>;

function requirePolicy(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// This catches explicitly labelled adult/production material, not every possible
// unsuitable clip. Unlabelled content still needs per-slot semantic review.
export function assertChildClip(title: string, identity: string) {
  requirePolicy(!/\bteaching[\s_-]*tips?\b|\bmaking[\s_-]*of\b|\bbehind[\s_-]*the[\s_-]*scenes\b|\btrailer\b|教師教學|教學技巧|幕後|花絮|預告片/i.test(title),
    `${identity}: adult teaching/production/promotional clip is not child lesson material: ${title}`);
}

function publisherEvidencePage(value: string, channel: string) {
  try {
    const url = new URL(value);
    // Exact author names from the verified oEmbed records, not a substring/fan
    // channel match. These publishers accept only a single-song content route.
    // This validates evidence linkage, not the contents or an exact video embed:
    // Singing Walrus currently embeds Vimeo; its YouTube identity is separately
    // verified from the official watch-page description and oEmbed metadata.
    if (channel === 'Finny The Shark' || channel === 'The Singing Walrus - English Songs For Kids') {
      const finny = channel === 'Finny The Shark';
      const hosts = finny ? ['supersimple.com', 'www.supersimple.com']
        : ['thesingingwalrus.com', 'www.thesingingwalrus.com'];
      const songPath = finny ? /^\/song\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/
        : /^\/songs\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/;
      return url.protocol === 'https:' && hosts.includes(url.hostname)
        && songPath.test(url.pathname) && !url.username && !url.password
        && !url.port && !url.search && !url.hash;
    }
    // Add a publisher only with its independently verified official domain.
    // A URL on this allowlist is evidence linkage, not proof of page contents.
    const knownChannel = /super simple/i.test(channel)
      || channel === "Carl's Car Wash"
      || channel === 'Noodle & Pals'
      || channel === 'Rhymington Square - Songs & Rhymes for Kids!';
    return knownChannel && url.protocol === 'https:'
      && ['supersimple.com', 'www.supersimple.com'].includes(url.hostname)
      && /^\/(?:song|songs|super-simple-songs|super-simple-learning|finny-the-shark|treetop-family|caities-classroom|phonics-fun)\/[^/]+/.test(url.pathname)
      && !url.username && !url.password;
  } catch { return false; }
}

export function validateVideoUsePolicy(uses: VideoUse[], reviews: ReuseReview) {
  const useByKey = new Map<string, VideoUse>();
  const byVideo = new Map<string, VideoUse[]>();
  for (const use of uses) {
    requirePolicy(!useByKey.has(use.key), `Duplicate assignment identity: ${use.key}`);
    requirePolicy(/^.+:(warmup|main)$/.test(use.key), `Invalid lesson/role identity: ${use.key}`);
    requirePolicy(/^[A-Za-z0-9_-]{11}$/.test(use.clip.videoId), `${use.key}: invalid YouTube ID`);
    assertChildClip(use.clip.title, use.key);
    useByKey.set(use.key, use);
    byVideo.set(use.clip.videoId, [...(byVideo.get(use.clip.videoId) ?? []), use]);
  }
  // Validate supplied evidence even for singleton uses, so a changed assignment
  // cannot silently retain a now-stale review. Absence for a singleton is not PASS.
  for (const [key, review] of Object.entries(reviews)) {
    const use = useByKey.get(key);
    requirePolicy(use, `${key}: review has no current lesson/role assignment`);
    requirePolicy(review.videoId === use.clip.videoId, `${key}: review videoId mismatch`);
    requirePolicy(typeof review.purpose === 'string' && review.purpose.trim().length > 0, `${key}: reuse purpose missing`);
    requirePolicy(publisherEvidencePage(review.publisherPage, use.clip.channel), `${key}: official publisher content page missing or unsupported`);
  }
  let reusedVideos = 0;
  let reviewedReuseSlots = 0;
  for (const [videoId, group] of byVideo) {
    if (group.length < 2) continue;
    reusedVideos += 1;
    const purposes = new Set<string>();
    for (const use of group) {
      const review = reviews[use.key];
      requirePolicy(review, `${use.key}: reused video ${videoId} requires its own lesson/role review`);
      purposes.add(review.purpose.toLowerCase().replace(/\s+/g, '').replace(/[.,，。;；:：!！?？]/g, ''));
      reviewedReuseSlots += 1;
    }
    requirePolicy(purposes.size > 1, `${videoId}: repeated uses need differentiated teaching purposes`);
  }
  return { assignmentSlots: uses.length, uniqueVideoIds: byVideo.size, reusedVideos, reviewedReuseSlots,
    suppliedReviewSlots: Object.keys(reviews).length, semanticApproval: false as const };
}
