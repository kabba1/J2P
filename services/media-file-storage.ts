import { Directory, File, Paths } from 'expo-file-system';

import { isMediaStage, MediaStage } from '@/types/media';

export type MediaFileStorageErrorCode =
  | 'invalid-path'
  | 'source-missing'
  | 'copy-failed'
  | 'delete-failed';

export class MediaFileStorageError extends Error {
  constructor(
    readonly code: MediaFileStorageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MediaFileStorageError';
  }
}

export interface MediaFileStorage {
  persistCapturedPhoto(
    tempUri: string,
    jobId: string,
    stage: MediaStage,
    mediaId: string,
  ): Promise<string>;
  getPersistentMediaUri(
    jobId: string,
    stage: MediaStage,
    mediaId: string,
  ): Promise<string | undefined>;
  deleteMediaFile(uri: string): Promise<void>;
  deleteTemporaryCapture(uri: string): Promise<void>;
  deleteJobMediaDirectory(jobId: string): Promise<void>;
  fileExists(uri: string): Promise<boolean>;
}

const MANAGED_DIRECTORY_NAME = 'jobs';
const SUPPORTED_EXTENSIONS = ['.jpg', '.png'];

function requireSafePathId(value: string, label: string): string {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(trimmed)) {
    throw new MediaFileStorageError(
      'invalid-path',
      `${label} contains characters that cannot be used for local photo storage.`,
    );
  }
  return trimmed;
}

function requireStage(stage: MediaStage): MediaStage {
  if (!isMediaStage(stage)) {
    throw new MediaFileStorageError('invalid-path', 'Photo stage is invalid.');
  }
  return stage;
}

function getManagedRoot(): Directory {
  return new Directory(Paths.document, MANAGED_DIRECTORY_NAME);
}

function getStageDirectory(jobId: string, stage: MediaStage): Directory {
  return new Directory(
    getManagedRoot(),
    requireSafePathId(jobId, 'Job ID'),
    requireStage(stage),
  );
}

function extensionForSource(source: File): '.jpg' | '.png' {
  return source.extension.toLowerCase() === '.png' ? '.png' : '.jpg';
}

function isManagedFileUri(uri: string): boolean {
  const rootUri = Paths.normalize(getManagedRoot().uri);
  const normalizedUri = Paths.normalize(uri);
  const relativePath = Paths.relative(rootUri, normalizedUri);

  return (
    relativePath.length > 0 &&
    relativePath !== '..' &&
    !relativePath.startsWith('../') &&
    !relativePath.startsWith('..\\') &&
    !Paths.isAbsolute(relativePath)
  );
}

function isCacheFileUri(uri: string): boolean {
  const rootUri = Paths.normalize(Paths.cache.uri);
  const normalizedUri = Paths.normalize(uri);
  const relativePath = Paths.relative(rootUri, normalizedUri);

  return (
    relativePath.length > 0 &&
    relativePath !== '..' &&
    !relativePath.startsWith('../') &&
    !relativePath.startsWith('..\\') &&
    !Paths.isAbsolute(relativePath)
  );
}

function findPersistedFile(
  jobId: string,
  stage: MediaStage,
  mediaId: string,
): File | undefined {
  const directory = getStageDirectory(jobId, stage);
  if (!directory.exists) {
    return undefined;
  }

  const validMediaId = requireSafePathId(mediaId, 'Photo ID');
  for (const extension of SUPPORTED_EXTENSIONS) {
    const candidate = new File(directory, `${validMediaId}${extension}`);
    if (candidate.exists) {
      return candidate;
    }
  }
  return undefined;
}

export class ExpoMediaFileStorage implements MediaFileStorage {
  async persistCapturedPhoto(
    tempUri: string,
    jobId: string,
    stage: MediaStage,
    mediaId: string,
  ): Promise<string> {
    const validTempUri = tempUri.trim();
    if (!validTempUri) {
      throw new MediaFileStorageError('source-missing', 'The captured photo is missing.');
    }

    let source: File;
    try {
      source = new File(validTempUri);
    } catch {
      throw new MediaFileStorageError('source-missing', 'The captured photo is missing.');
    }

    if (!source.exists || source.size <= 0) {
      throw new MediaFileStorageError('source-missing', 'The captured photo is missing.');
    }

    const existing = findPersistedFile(jobId, stage, mediaId);
    if (existing) {
      return existing.uri;
    }

    const stageDirectory = getStageDirectory(jobId, stage);
    const validMediaId = requireSafePathId(mediaId, 'Photo ID');
    const destination = new File(
      stageDirectory,
      `${validMediaId}${extensionForSource(source)}`,
    );

    try {
      stageDirectory.create({ idempotent: true, intermediates: true });
      source.copy(destination);
      if (!destination.exists || destination.size <= 0) {
        if (destination.exists) {
          destination.delete();
        }
        throw new Error('The copied photo could not be verified.');
      }
      return destination.uri;
    } catch {
      throw new MediaFileStorageError(
        'copy-failed',
        'The photo could not be saved to this device. Please try again.',
      );
    }
  }

  async getPersistentMediaUri(
    jobId: string,
    stage: MediaStage,
    mediaId: string,
  ): Promise<string | undefined> {
    return findPersistedFile(jobId, stage, mediaId)?.uri;
  }

  async deleteMediaFile(uri: string): Promise<void> {
    const validUri = uri.trim();
    let isManaged = false;
    try {
      isManaged = validUri.length > 0 && isManagedFileUri(validUri);
    } catch {
      isManaged = false;
    }

    if (!isManaged) {
      throw new MediaFileStorageError(
        'invalid-path',
        'Only JobToPost-managed photo files can be deleted.',
      );
    }

    try {
      const file = new File(validUri);
      if (file.exists) {
        file.delete();
      }
    } catch {
      throw new MediaFileStorageError(
        'delete-failed',
        'The saved photo file could not be deleted.',
      );
    }
  }

  async deleteJobMediaDirectory(jobId: string): Promise<void> {
    const jobDirectory = new Directory(
      getManagedRoot(),
      requireSafePathId(jobId, 'Job ID'),
    );

    try {
      if (jobDirectory.exists) {
        jobDirectory.delete();
      }
    } catch {
      throw new MediaFileStorageError(
        'delete-failed',
        'Some saved photos for this job could not be removed.',
      );
    }
  }

  async deleteTemporaryCapture(uri: string): Promise<void> {
    const validUri = uri.trim();
    let isTemporary = false;
    try {
      isTemporary = validUri.length > 0 && isCacheFileUri(validUri);
    } catch {
      isTemporary = false;
    }

    if (!isTemporary) {
      return;
    }

    try {
      const file = new File(validUri);
      if (file.exists) {
        file.delete();
      }
    } catch {
      // Cache cleanup is best-effort and must not prevent navigation or saving.
    }
  }

  async fileExists(uri: string): Promise<boolean> {
    const validUri = uri.trim();
    if (!validUri) {
      return false;
    }

    try {
      return new File(validUri).exists;
    } catch {
      return false;
    }
  }
}

export const mediaFileStorage: MediaFileStorage = new ExpoMediaFileStorage();
