export type MediaStage = 'before' | 'progress' | 'after';

export type MediaOrientation = 'portrait' | 'landscape' | 'square';

export type MediaCameraFacing = 'front' | 'back';

export type JobMedia = {
  id: string;
  jobId: string;
  stage: MediaStage;
  mediaType: 'photo';
  localUri: string;
  createdAt: string;
  updatedAt: string;
  shotName?: string;
  note?: string;
  width?: number;
  height?: number;
  orientation?: MediaOrientation;
  cameraFacing?: MediaCameraFacing;
  zoom?: number;
};

export type JobMediaCreateInput = Omit<
  JobMedia,
  'createdAt' | 'mediaType' | 'updatedAt'
> & {
  createdAt?: string;
};

export type JobMediaUpdateInput = {
  stage?: MediaStage;
  localUri?: string;
  shotName?: string | null;
  note?: string | null;
  width?: number | null;
  height?: number | null;
  orientation?: MediaOrientation | null;
  cameraFacing?: MediaCameraFacing | null;
  zoom?: number | null;
};

export type MediaStageCounts = {
  before: number;
  progress: number;
  after: number;
};

export function isMediaStage(value: unknown): value is MediaStage {
  return value === 'before' || value === 'progress' || value === 'after';
}

export function createMediaId(): string {
  return `media-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyMediaStageCounts(): MediaStageCounts {
  return { before: 0, progress: 0, after: 0 };
}
