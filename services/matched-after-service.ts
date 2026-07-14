import type { MediaFileStorage } from '@/services/media-file-storage';
import type { MediaRepository } from '@/repositories/media-repository';
import {
  createMediaId,
  JobMedia,
  MediaCameraFacing,
} from '@/types/media';
import type { BeforeAfterPair } from '@/types/pair';
import { getOrientation } from '@/utils/media-stage';

export type SaveMatchedAfterInput = {
  tempUri: string;
  jobId: string;
  beforeMediaId: string;
  replacePairId?: string;
  capturedAt?: string;
  shotName?: string;
  note?: string;
  width?: number;
  height?: number;
  cameraFacing?: MediaCameraFacing;
  zoom?: number;
};

export type SaveMatchedAfterResult = {
  after: JobMedia;
  pair: BeforeAfterPair;
};

export type CreatePairForMatchedAfter = (input: {
  jobId: string;
  beforeMediaId: string;
  afterMediaId: string;
}) => Promise<BeforeAfterPair>;

export type ReplacePairAfterMedia = (
  pairId: string,
  afterMediaId: string,
) => Promise<BeforeAfterPair | undefined>;

export type GetPairForMatchedAfter = (
  pairId: string,
) => Promise<BeforeAfterPair | undefined>;

export type MatchedAfterServiceDependencies = {
  mediaRepository: Pick<
    MediaRepository,
    'getMedia' | 'createMedia' | 'deleteMedia'
  >;
  mediaFileStorage: Pick<
    MediaFileStorage,
    'persistCapturedPhoto' | 'deleteMediaFile' | 'deleteTemporaryCapture'
  >;
  getPair: GetPairForMatchedAfter;
  createPair: CreatePairForMatchedAfter;
  replaceAfterMedia: ReplacePairAfterMedia;
  createMediaId?: () => string;
  warn?: (message: string, error: unknown) => void;
};

function userMessage(caughtError: unknown, fallback: string): string {
  return caughtError instanceof Error && caughtError.message ? caughtError.message : fallback;
}

export class MatchedAfterService {
  private readonly generateMediaId: () => string;
  private readonly warn: (message: string, error: unknown) => void;

  constructor(private readonly dependencies: MatchedAfterServiceDependencies) {
    this.generateMediaId = dependencies.createMediaId ?? createMediaId;
    this.warn = dependencies.warn ?? ((message, error) => console.warn(message, error));
  }

  async save(input: SaveMatchedAfterInput): Promise<SaveMatchedAfterResult> {
    let created: JobMedia | undefined;
    let persistentUri: string | undefined;

    try {
      const before = await this.dependencies.mediaRepository.getMedia(input.beforeMediaId);
      if (!before) {
        throw new Error('The selected Before photo no longer exists.');
      }
      if (before.jobId !== input.jobId || before.stage !== 'before') {
        throw new Error('The selected photo is no longer a valid Before photo for this job.');
      }

      if (input.replacePairId) {
        const existingPair = await this.dependencies.getPair(input.replacePairId);
        if (!existingPair) {
          throw new Error('The Before and After pair no longer exists.');
        }
        if (
          existingPair.beforeMediaId !== input.beforeMediaId ||
          existingPair.jobId !== input.jobId
        ) {
          throw new Error('The selected Before photo does not belong to this pair.');
        }
      }

      const mediaId = this.generateMediaId();
      persistentUri = await this.dependencies.mediaFileStorage.persistCapturedPhoto(
        input.tempUri,
        input.jobId,
        'after',
        mediaId,
      );
      created = await this.dependencies.mediaRepository.createMedia({
        id: mediaId,
        jobId: input.jobId,
        stage: 'after',
        localUri: persistentUri,
        shotName: input.shotName ?? before.shotName,
        note: input.note,
        createdAt: input.capturedAt,
        width: input.width,
        height: input.height,
        orientation: getOrientation(input.width, input.height),
        cameraFacing: input.cameraFacing,
        zoom: input.zoom,
      });

      const pair = input.replacePairId
        ? await this.dependencies.replaceAfterMedia(input.replacePairId, created.id)
        : await this.dependencies.createPair({
            jobId: input.jobId,
            beforeMediaId: before.id,
            afterMediaId: created.id,
          });

      if (!pair) {
        throw new Error('The Before and After pair no longer exists.');
      }

      try {
        await this.dependencies.mediaFileStorage.deleteTemporaryCapture(input.tempUri);
      } catch (cleanupError) {
        this.warn('The temporary matched photo could not be cleaned up.', cleanupError);
      }

      return { after: created, pair };
    } catch (caughtError) {
      if (created) {
        const metadataRemoved = await this.dependencies.mediaRepository
          .deleteMedia(created.id)
          .catch(() => false);
        if (metadataRemoved && persistentUri) {
          await this.dependencies.mediaFileStorage
            .deleteMediaFile(persistentUri)
            .catch(() => undefined);
        }
      } else if (persistentUri) {
        await this.dependencies.mediaFileStorage
          .deleteMediaFile(persistentUri)
          .catch(() => undefined);
      }

      throw new Error(userMessage(caughtError, 'The matched After photo could not be saved.'));
    }
  }
}
