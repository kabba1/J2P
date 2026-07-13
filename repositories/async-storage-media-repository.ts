import AsyncStorage from '@react-native-async-storage/async-storage';

import { MediaRepository } from '@/repositories/media-repository';
import {
  createEmptyMediaStageCounts,
  isMediaStage,
  JobMedia,
  JobMediaCreateInput,
  JobMediaUpdateInput,
  MediaCameraFacing,
  MediaOrientation,
  MediaStage,
  MediaStageCounts,
} from '@/types/media';

const STORAGE_KEY = '@jobtopost/media/v1';

type MediaMetadataStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'setItem'
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isNonEmptyString(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isOptionalPositiveInteger(value: unknown): value is number | undefined {
  return value === undefined || isPositiveInteger(value);
}

function isZoom(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isOptionalZoom(value: unknown): value is number | undefined {
  return value === undefined || isZoom(value);
}

function isOrientation(value: unknown): value is MediaOrientation {
  return value === 'portrait' || value === 'landscape' || value === 'square';
}

function isOptionalOrientation(value: unknown): value is MediaOrientation | undefined {
  return value === undefined || isOrientation(value);
}

function isCameraFacing(value: unknown): value is MediaCameraFacing {
  return value === 'front' || value === 'back';
}

function isOptionalCameraFacing(value: unknown): value is MediaCameraFacing | undefined {
  return value === undefined || isCameraFacing(value);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString() === value;
}

function isJobMedia(value: unknown): value is JobMedia {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.jobId) &&
    isMediaStage(value.stage) &&
    value.mediaType === 'photo' &&
    isNonEmptyString(value.localUri) &&
    isIsoDate(value.createdAt) &&
    isIsoDate(value.updatedAt) &&
    isOptionalString(value.shotName) &&
    isOptionalString(value.note) &&
    isOptionalPositiveInteger(value.width) &&
    isOptionalPositiveInteger(value.height) &&
    isOptionalOrientation(value.orientation) &&
    isOptionalCameraFacing(value.cameraFacing) &&
    isOptionalZoom(value.zoom)
  );
}

function requireNonEmptyString(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  return trimmed;
}

function trimOptional(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function requireIsoDate(value: string, label: string): string {
  if (!isIsoDate(value)) {
    throw new Error(`${label} must be a valid date.`);
  }
  return value;
}

function requirePositiveInteger(value: number, label: string): number {
  if (!isPositiveInteger(value)) {
    throw new Error(`${label} must be a positive whole number.`);
  }
  return value;
}

function requireZoom(value: number): number {
  if (!isZoom(value)) {
    throw new Error('Photo zoom must be between 0 and 1.');
  }
  return value;
}

function validateCreateInput(input: JobMediaCreateInput): JobMedia {
  const timestamp = new Date().toISOString();

  if (!isMediaStage(input.stage)) {
    throw new Error('Photo stage is invalid.');
  }
  if (input.orientation !== undefined && !isOrientation(input.orientation)) {
    throw new Error('Photo orientation is invalid.');
  }
  if (input.cameraFacing !== undefined && !isCameraFacing(input.cameraFacing)) {
    throw new Error('Camera facing is invalid.');
  }

  return {
    id: requireNonEmptyString(input.id, 'Photo ID'),
    jobId: requireNonEmptyString(input.jobId, 'Job ID'),
    stage: input.stage,
    mediaType: 'photo',
    localUri: requireNonEmptyString(input.localUri, 'Local photo URI'),
    createdAt:
      input.createdAt === undefined
        ? timestamp
        : requireIsoDate(input.createdAt, 'Capture date'),
    updatedAt: timestamp,
    shotName: trimOptional(input.shotName),
    note: trimOptional(input.note),
    width:
      input.width === undefined
        ? undefined
        : requirePositiveInteger(input.width, 'Photo width'),
    height:
      input.height === undefined
        ? undefined
        : requirePositiveInteger(input.height, 'Photo height'),
    orientation: input.orientation,
    cameraFacing: input.cameraFacing,
    zoom: input.zoom === undefined ? undefined : requireZoom(input.zoom),
  };
}

function applyUpdate(current: JobMedia, input: JobMediaUpdateInput): JobMedia {
  if (input.stage !== undefined && !isMediaStage(input.stage)) {
    throw new Error('Photo stage is invalid.');
  }
  if (
    input.orientation !== undefined &&
    input.orientation !== null &&
    !isOrientation(input.orientation)
  ) {
    throw new Error('Photo orientation is invalid.');
  }
  if (
    input.cameraFacing !== undefined &&
    input.cameraFacing !== null &&
    !isCameraFacing(input.cameraFacing)
  ) {
    throw new Error('Camera facing is invalid.');
  }

  return {
    ...current,
    stage: input.stage ?? current.stage,
    localUri:
      input.localUri === undefined
        ? current.localUri
        : requireNonEmptyString(input.localUri, 'Local photo URI'),
    shotName:
      input.shotName === undefined ? current.shotName : trimOptional(input.shotName),
    note: input.note === undefined ? current.note : trimOptional(input.note),
    width:
      input.width === undefined
        ? current.width
        : input.width === null
          ? undefined
          : requirePositiveInteger(input.width, 'Photo width'),
    height:
      input.height === undefined
        ? current.height
        : input.height === null
          ? undefined
          : requirePositiveInteger(input.height, 'Photo height'),
    orientation:
      input.orientation === undefined
        ? current.orientation
        : input.orientation === null
          ? undefined
          : input.orientation,
    cameraFacing:
      input.cameraFacing === undefined
        ? current.cameraFacing
        : input.cameraFacing === null
          ? undefined
          : input.cameraFacing,
    zoom:
      input.zoom === undefined
        ? current.zoom
        : input.zoom === null
          ? undefined
          : requireZoom(input.zoom),
    updatedAt: new Date().toISOString(),
  };
}

async function readMedia(storage: MediaMetadataStorage): Promise<JobMedia[]> {
  const raw = await storage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Saved photo information could not be read.');
  }

  if (!Array.isArray(parsed) || !parsed.every(isJobMedia)) {
    throw new Error('Saved photo information is not in the expected format.');
  }

  const ids = new Set(parsed.map((item) => item.id));
  if (ids.size !== parsed.length) {
    throw new Error('Saved photo information contains duplicate IDs.');
  }

  return parsed;
}

async function writeMedia(
  storage: MediaMetadataStorage,
  media: JobMedia[],
): Promise<void> {
  await storage.setItem(STORAGE_KEY, JSON.stringify(media));
}

function sortNewestFirst(media: JobMedia[]): JobMedia[] {
  return [...media].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export class AsyncStorageMediaRepository implements MediaRepository {
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(private readonly storage: MediaMetadataStorage = AsyncStorage) {}

  private enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationQueue.then(operation, operation);
    this.mutationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async waitForMutations(): Promise<void> {
    await this.mutationQueue;
  }

  async listMediaForJob(jobId: string): Promise<JobMedia[]> {
    await this.waitForMutations();
    const validJobId = requireNonEmptyString(jobId, 'Job ID');
    const media = await readMedia(this.storage);
    return sortNewestFirst(media.filter((item) => item.jobId === validJobId));
  }

  async listMediaForStage(jobId: string, stage: MediaStage): Promise<JobMedia[]> {
    await this.waitForMutations();
    const validJobId = requireNonEmptyString(jobId, 'Job ID');
    if (!isMediaStage(stage)) {
      throw new Error('Photo stage is invalid.');
    }
    const media = await readMedia(this.storage);
    return sortNewestFirst(
      media.filter((item) => item.jobId === validJobId && item.stage === stage),
    );
  }

  async getMedia(id: string): Promise<JobMedia | undefined> {
    await this.waitForMutations();
    const validId = requireNonEmptyString(id, 'Photo ID');
    const media = await readMedia(this.storage);
    return media.find((item) => item.id === validId);
  }

  createMedia(input: JobMediaCreateInput): Promise<JobMedia> {
    return this.enqueueMutation(async () => {
      const media = await readMedia(this.storage);
      const created = validateCreateInput(input);
      if (media.some((item) => item.id === created.id)) {
        throw new Error('A photo with this ID already exists.');
      }

      await writeMedia(this.storage, [created, ...media]);
      return created;
    });
  }

  updateMedia(id: string, input: JobMediaUpdateInput): Promise<JobMedia | undefined> {
    return this.enqueueMutation(async () => {
      const validId = requireNonEmptyString(id, 'Photo ID');
      const media = await readMedia(this.storage);
      const index = media.findIndex((item) => item.id === validId);
      if (index < 0) {
        return undefined;
      }

      const updated = applyUpdate(media[index], input);
      media[index] = updated;
      await writeMedia(this.storage, media);
      return updated;
    });
  }

  deleteMedia(id: string): Promise<boolean> {
    return this.enqueueMutation(async () => {
      const validId = requireNonEmptyString(id, 'Photo ID');
      const media = await readMedia(this.storage);
      const nextMedia = media.filter((item) => item.id !== validId);
      if (nextMedia.length === media.length) {
        return false;
      }

      await writeMedia(this.storage, nextMedia);
      return true;
    });
  }

  deleteMediaForJob(jobId: string): Promise<number> {
    return this.enqueueMutation(async () => {
      const validJobId = requireNonEmptyString(jobId, 'Job ID');
      const media = await readMedia(this.storage);
      const nextMedia = media.filter((item) => item.jobId !== validJobId);
      const deletedCount = media.length - nextMedia.length;
      if (deletedCount > 0) {
        await writeMedia(this.storage, nextMedia);
      }
      return deletedCount;
    });
  }

  async countMediaByStage(jobId: string): Promise<MediaStageCounts> {
    await this.waitForMutations();
    const validJobId = requireNonEmptyString(jobId, 'Job ID');
    const media = await readMedia(this.storage);
    const counts = createEmptyMediaStageCounts();

    for (const item of media) {
      if (item.jobId === validJobId) {
        counts[item.stage] += 1;
      }
    }

    return counts;
  }
}

export const mediaRepository: MediaRepository = new AsyncStorageMediaRepository();
