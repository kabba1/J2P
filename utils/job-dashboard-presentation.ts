import type { JobMedia, MediaStage, MediaStageCounts } from '@/types/media';

export function selectLatestJobMedia(
  media: readonly JobMedia[],
  jobId: string,
): JobMedia | undefined {
  return media.reduce<JobMedia | undefined>((latest, item) => {
    if (item.jobId !== jobId) {
      return latest;
    }
    if (!latest || item.createdAt > latest.createdAt) {
      return item;
    }
    return latest;
  }, undefined);
}

export function getNextCaptureStage(counts: MediaStageCounts): MediaStage {
  if (counts.before === 0) {
    return 'before';
  }
  if (counts.progress === 0) {
    return 'progress';
  }
  if (counts.after === 0) {
    return 'after';
  }
  return 'progress';
}
