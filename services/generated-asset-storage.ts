import { Directory, File, Paths } from 'expo-file-system';

import { requireSafeGeneratedAssetStorageId } from '@/utils/generated-asset';

export type GeneratedAssetStorageErrorCode =
  | 'invalid-path'
  | 'source-missing'
  | 'copy-failed'
  | 'delete-failed';

export class GeneratedAssetStorageError extends Error {
  constructor(
    readonly code: GeneratedAssetStorageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GeneratedAssetStorageError';
  }
}

export interface GeneratedAssetStorage {
  persistRenderedAsset(
    tempUri: string,
    jobId: string,
    assetId: string,
  ): Promise<string>;
  getExistingManagedAssetUri(
    jobId: string,
    assetId: string,
  ): Promise<string | undefined>;
  deleteGeneratedAssetFile(uri: string): Promise<void>;
  deleteTemporaryRenderedAsset(uri: string): Promise<void>;
  deleteGeneratedAssetsDirectory(jobId: string): Promise<void>;
  fileExists(uri: string): Promise<boolean>;
}

const MANAGED_DIRECTORY_NAME = 'jobs';
const GENERATED_DIRECTORY_NAME = 'generated';

function safeId(value: string, label: string): string {
  try {
    return requireSafeGeneratedAssetStorageId(value, label);
  } catch (caughtError) {
    throw new GeneratedAssetStorageError(
      'invalid-path',
      caughtError instanceof Error
        ? caughtError.message
        : `${label} cannot be used for local storage.`,
    );
  }
}

function getManagedRoot(): Directory {
  return new Directory(Paths.document, MANAGED_DIRECTORY_NAME);
}

function getGeneratedDirectory(jobId: string): Directory {
  return new Directory(
    getManagedRoot(),
    safeId(jobId, 'Job ID'),
    GENERATED_DIRECTORY_NAME,
  );
}

function getGeneratedFile(jobId: string, assetId: string): File {
  return new File(
    getGeneratedDirectory(jobId),
    `${safeId(assetId, 'Asset ID')}.png`,
  );
}

function isManagedGeneratedFileUri(uri: string): boolean {
  const rootUri = Paths.normalize(getManagedRoot().uri);
  const normalizedUri = Paths.normalize(uri);
  const relativePath = Paths.relative(rootUri, normalizedUri).replace(/\\/g, '/');
  const segments = relativePath.split('/');

  if (
    segments.length !== 3 ||
    segments[1] !== GENERATED_DIRECTORY_NAME ||
    Paths.isAbsolute(relativePath)
  ) {
    return false;
  }

  const [jobId, , fileName] = segments;
  if (!fileName.endsWith('.png')) {
    return false;
  }
  const assetId = fileName.slice(0, -4);
  try {
    return safeId(jobId, 'Job ID') === jobId && safeId(assetId, 'Asset ID') === assetId;
  } catch {
    return false;
  }
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

export class ExpoGeneratedAssetStorage implements GeneratedAssetStorage {
  async persistRenderedAsset(
    tempUri: string,
    jobId: string,
    assetId: string,
  ): Promise<string> {
    const validTempUri = tempUri.trim();
    if (!validTempUri) {
      throw new GeneratedAssetStorageError(
        'source-missing',
        'The rendered post file is missing.',
      );
    }

    let source: File;
    try {
      source = new File(validTempUri);
    } catch {
      throw new GeneratedAssetStorageError(
        'source-missing',
        'The rendered post file is missing.',
      );
    }
    if (!source.exists || source.size <= 0) {
      throw new GeneratedAssetStorageError(
        'source-missing',
        'The rendered post file is missing.',
      );
    }

    const destination = getGeneratedFile(jobId, assetId);
    if (destination.exists) {
      throw new GeneratedAssetStorageError(
        'copy-failed',
        'A generated post file with this ID already exists.',
      );
    }

    try {
      getGeneratedDirectory(jobId).create({ idempotent: true, intermediates: true });
      source.copy(destination);
      if (!destination.exists || destination.size <= 0) {
        if (destination.exists) destination.delete();
        throw new Error('The copied generated post could not be verified.');
      }
      return destination.uri;
    } catch {
      try {
        if (destination.exists) destination.delete();
      } catch {
        // The service will surface the copy failure; partial cleanup is best-effort.
      }
      throw new GeneratedAssetStorageError(
        'copy-failed',
        'The generated post could not be saved to this device. Please try again.',
      );
    }
  }

  async getExistingManagedAssetUri(
    jobId: string,
    assetId: string,
  ): Promise<string | undefined> {
    const file = getGeneratedFile(jobId, assetId);
    return file.exists ? file.uri : undefined;
  }

  async deleteGeneratedAssetFile(uri: string): Promise<void> {
    const validUri = uri.trim();
    let isManaged = false;
    try {
      isManaged = validUri.length > 0 && isManagedGeneratedFileUri(validUri);
    } catch {
      isManaged = false;
    }
    if (!isManaged) {
      throw new GeneratedAssetStorageError(
        'invalid-path',
        'Only JobToPost-managed generated post files can be deleted.',
      );
    }

    try {
      const file = new File(validUri);
      if (file.exists) file.delete();
    } catch {
      throw new GeneratedAssetStorageError(
        'delete-failed',
        'The generated post file could not be deleted.',
      );
    }
  }

  async deleteTemporaryRenderedAsset(uri: string): Promise<void> {
    const validUri = uri.trim();
    let isTemporary = false;
    try {
      isTemporary = validUri.length > 0 && isCacheFileUri(validUri);
    } catch {
      isTemporary = false;
    }
    if (!isTemporary) return;

    try {
      const file = new File(validUri);
      if (file.exists) file.delete();
    } catch {
      // Temporary rendering cleanup is best-effort after a successful commit.
    }
  }

  async deleteGeneratedAssetsDirectory(jobId: string): Promise<void> {
    const directory = getGeneratedDirectory(jobId);
    try {
      if (directory.exists) directory.delete();
    } catch {
      throw new GeneratedAssetStorageError(
        'delete-failed',
        'Some generated posts for this job could not be removed.',
      );
    }
  }

  async fileExists(uri: string): Promise<boolean> {
    const validUri = uri.trim();
    if (!validUri) return false;
    try {
      const file = new File(validUri);
      return file.exists && file.size > 0;
    } catch {
      return false;
    }
  }
}

export const generatedAssetStorage: GeneratedAssetStorage =
  new ExpoGeneratedAssetStorage();
