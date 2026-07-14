import { JobRepository } from '@/repositories/job-repository';
import { MediaRepository } from '@/repositories/media-repository';
import { PairRepository } from '@/repositories/pair-repository';
import { GeneratedAssetRepository } from '@/repositories/generated-asset-repository';
import {
  BeforeAfterPostRenderer,
  RenderedAsset,
} from '@/services/before-after-post-renderer';
import { GeneratedAssetStorage } from '@/services/generated-asset-storage';
import {
  createGeneratedAssetId,
  GeneratedAsset,
  GeneratedAssetCreateInput,
  GeneratedAssetFormat,
  GeneratedAssetLayout,
  isGeneratedAssetFormat,
  isGeneratedAssetLayout,
} from '@/types/generated-asset';
import { JobMedia } from '@/types/media';
import { BeforeAfterPair } from '@/types/pair';
import {
  getGeneratedAssetDimensions,
  normalizeFooterText,
} from '@/utils/generated-asset';

export type GenerateGeneratedAssetInput = {
  jobId: string;
  pairId: string;
  format: GeneratedAssetFormat;
  layout: GeneratedAssetLayout;
  labelsEnabled: boolean;
  footerText?: string;
  renderer: BeforeAfterPostRenderer;
};

export type DeleteJobOperation = () => Promise<boolean>;

export type GeneratedAssetServiceErrorCode =
  | 'invalid-input'
  | 'job-not-found'
  | 'pair-not-found'
  | 'before-media-not-found'
  | 'after-media-not-found'
  | 'source-file-missing'
  | 'source-changed'
  | 'render-failed'
  | 'render-output-invalid'
  | 'persist-failed'
  | 'metadata-failed'
  | 'delete-failed';

export class GeneratedAssetServiceError extends Error {
  constructor(
    readonly code: GeneratedAssetServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GeneratedAssetServiceError';
  }
}

type GeneratedAssetServiceDependencies = {
  jobRepository: JobRepository;
  pairRepository: PairRepository;
  mediaRepository: MediaRepository;
  assetRepository: GeneratedAssetRepository;
  storage: GeneratedAssetStorage;
  createAssetId?: () => string;
  now?: () => string;
  warn?: (message: string, caughtError: unknown) => void;
};

type ValidatedSource = {
  pair: BeforeAfterPair;
  before: JobMedia;
  after: JobMedia;
};

function requireId(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new GeneratedAssetServiceError('invalid-input', `${label} is required.`);
  }
  return trimmed;
}

function requireFormat(value: GeneratedAssetFormat): GeneratedAssetFormat {
  if (!isGeneratedAssetFormat(value)) {
    throw new GeneratedAssetServiceError(
      'invalid-input',
      'Generated post format is invalid.',
    );
  }
  return value;
}

function requireLayout(value: GeneratedAssetLayout): GeneratedAssetLayout {
  if (!isGeneratedAssetLayout(value)) {
    throw new GeneratedAssetServiceError(
      'invalid-input',
      'Generated post layout is invalid.',
    );
  }
  return value;
}

function samePairSource(
  first: ValidatedSource,
  current: ValidatedSource,
): boolean {
  return (
    first.pair.id === current.pair.id &&
    first.pair.jobId === current.pair.jobId &&
    first.pair.beforeMediaId === current.pair.beforeMediaId &&
    first.pair.afterMediaId === current.pair.afterMediaId &&
    first.before.localUri === current.before.localUri &&
    first.after.localUri === current.after.localUri
  );
}

export class GeneratedAssetService {
  private readonly createAssetId: () => string;
  private readonly now: () => string;
  private readonly warn: (message: string, caughtError: unknown) => void;

  constructor(private readonly dependencies: GeneratedAssetServiceDependencies) {
    this.createAssetId = dependencies.createAssetId ?? createGeneratedAssetId;
    this.now = dependencies.now ?? (() => new Date().toISOString());
    this.warn = dependencies.warn ?? ((message, caughtError) => {
      console.warn(message, caughtError);
    });
  }

  private async validateSource(
    jobId: string,
    pairId: string,
  ): Promise<ValidatedSource> {
    const job = await this.dependencies.jobRepository.getJob(jobId);
    if (!job) {
      throw new GeneratedAssetServiceError(
        'job-not-found',
        'This job could not be found. Return to Jobs and try again.',
      );
    }

    const pair = await this.dependencies.pairRepository.getPair(pairId);
    if (!pair || pair.jobId !== jobId) {
      throw new GeneratedAssetServiceError(
        'pair-not-found',
        'This Before and After pair could not be found. Return to the job and try again.',
      );
    }

    const [before, after] = await Promise.all([
      this.dependencies.mediaRepository.getMedia(pair.beforeMediaId),
      this.dependencies.mediaRepository.getMedia(pair.afterMediaId),
    ]);
    if (!before || before.jobId !== jobId || before.stage !== 'before') {
      throw new GeneratedAssetServiceError(
        'before-media-not-found',
        'The saved Before photo is unavailable for this post.',
      );
    }
    if (!after || after.jobId !== jobId || after.stage !== 'after') {
      throw new GeneratedAssetServiceError(
        'after-media-not-found',
        'The saved After photo is unavailable for this post.',
      );
    }

    const [beforeExists, afterExists] = await Promise.all([
      this.dependencies.storage.fileExists(before.localUri),
      this.dependencies.storage.fileExists(after.localUri),
    ]);
    if (!beforeExists || !afterExists) {
      throw new GeneratedAssetServiceError(
        'source-file-missing',
        !beforeExists
          ? 'The Before photo file is missing from this device.'
          : 'The After photo file is missing from this device.',
      );
    }

    return { pair, before, after };
  }

  private async requireUnchangedSource(
    jobId: string,
    pairId: string,
    original: ValidatedSource,
  ): Promise<void> {
    const current = await this.validateSource(jobId, pairId);
    if (!samePairSource(original, current)) {
      throw new GeneratedAssetServiceError(
        'source-changed',
        'The Before and After pair changed while the post was being generated. Please try again.',
      );
    }
  }

  private requireRenderedAsset(
    rendered: RenderedAsset,
    expectedWidth: number,
    expectedHeight: number,
    beforeUri: string,
    afterUri: string,
  ): string {
    const uri = rendered.uri.trim();
    if (!uri || uri === beforeUri || uri === afterUri) {
      throw new GeneratedAssetServiceError(
        'render-output-invalid',
        'The generated post did not produce a separate temporary image.',
      );
    }
    if (
      rendered.width !== expectedWidth ||
      rendered.height !== expectedHeight
    ) {
      throw new GeneratedAssetServiceError(
        'render-output-invalid',
        `The generated post must be ${expectedWidth} x ${expectedHeight} pixels.`,
      );
    }
    return uri;
  }

  private async deletePersistentFileBestEffort(uri: string): Promise<void> {
    try {
      await this.dependencies.storage.deleteGeneratedAssetFile(uri);
    } catch (caughtError) {
      this.warn('A rolled-back generated post file could not be removed.', caughtError);
    }
  }

  private async deleteTemporaryFileBestEffort(uri: string): Promise<void> {
    try {
      await this.dependencies.storage.deleteTemporaryRenderedAsset(uri);
    } catch (caughtError) {
      this.warn('A temporary generated post file could not be removed.', caughtError);
    }
  }

  private async deleteGeneratedDirectoryBestEffort(jobId: string): Promise<void> {
    try {
      await this.dependencies.storage.deleteGeneratedAssetsDirectory(jobId);
    } catch (caughtError) {
      this.warn('Generated post files for the deleted job were not fully removed.', caughtError);
    }
  }

  private toCreateInput(asset: GeneratedAsset): GeneratedAssetCreateInput {
    return {
      id: asset.id,
      jobId: asset.jobId,
      pairId: asset.pairId,
      localUri: asset.localUri,
      format: asset.format,
      layout: asset.layout,
      width: asset.width,
      height: asset.height,
      labelsEnabled: asset.labelsEnabled,
      footerText: asset.footerText,
      sourceShotName: asset.sourceShotName,
      createdAt: asset.createdAt,
    };
  }

  private async restoreGeneratedAssetMetadata(
    snapshot: GeneratedAsset[],
  ): Promise<void> {
    if (snapshot.length === 0) {
      return;
    }

    try {
      const current = await this.dependencies.assetRepository.listAssetsForJob(
        snapshot[0].jobId,
      );
      const currentIds = new Set(current.map((asset) => asset.id));
      for (const asset of snapshot) {
        if (!currentIds.has(asset.id)) {
          await this.dependencies.assetRepository.createAsset(
            this.toCreateInput(asset),
          );
          currentIds.add(asset.id);
        }
      }
    } catch {
      throw new GeneratedAssetServiceError(
        'delete-failed',
        'The job was kept, but its generated post information could not be restored. Please try again.',
      );
    }
  }

  async generate(input: GenerateGeneratedAssetInput): Promise<GeneratedAsset> {
    const jobId = requireId(input.jobId, 'Job ID');
    const pairId = requireId(input.pairId, 'Pair ID');
    const format = requireFormat(input.format);
    const layout = requireLayout(input.layout);
    const footerText = normalizeFooterText(input.footerText);
    const dimensions = getGeneratedAssetDimensions(format);
    const assetId = this.createAssetId();
    const source = await this.validateSource(jobId, pairId);
    let temporaryUri: string | undefined;
    let persistentUri: string | undefined;
    let metadataCommitted = false;

    try {
      let rendered: RenderedAsset;
      try {
        rendered = await input.renderer.render({
          assetId,
          jobId,
          pairId,
          beforeUri: source.before.localUri,
          afterUri: source.after.localUri,
          format,
          layout,
          labelsEnabled: input.labelsEnabled,
          footerText,
        });
      } catch (caughtError) {
        throw new GeneratedAssetServiceError(
          'render-failed',
          caughtError instanceof GeneratedAssetServiceError
            ? caughtError.message
            : 'The post could not be rendered. Please try again.',
        );
      }

      const renderedUri = rendered.uri.trim();
      if (
        renderedUri &&
        renderedUri !== source.before.localUri &&
        renderedUri !== source.after.localUri
      ) {
        temporaryUri = renderedUri;
      }
      temporaryUri = this.requireRenderedAsset(
        rendered,
        dimensions.width,
        dimensions.height,
        source.before.localUri,
        source.after.localUri,
      );
      if (!(await this.dependencies.storage.fileExists(temporaryUri))) {
        throw new GeneratedAssetServiceError(
          'render-output-invalid',
          'The temporary generated image could not be found. Please try again.',
        );
      }

      await this.requireUnchangedSource(jobId, pairId, source);

      try {
        persistentUri = await this.dependencies.storage.persistRenderedAsset(
          temporaryUri,
          jobId,
          assetId,
        );
      } catch {
        throw new GeneratedAssetServiceError(
          'persist-failed',
          'The generated post could not be saved on this device. Please check available storage and try again.',
        );
      }

      if (!(await this.dependencies.storage.fileExists(persistentUri))) {
        throw new GeneratedAssetServiceError(
          'persist-failed',
          'The saved generated post could not be verified. Please try again.',
        );
      }

      await this.requireUnchangedSource(jobId, pairId, source);

      let created: GeneratedAsset;
      try {
        created = await this.dependencies.assetRepository.createAsset({
          id: assetId,
          jobId,
          pairId,
          localUri: persistentUri,
          format,
          layout,
          width: dimensions.width,
          height: dimensions.height,
          labelsEnabled: input.labelsEnabled,
          footerText,
          sourceShotName:
            source.before.shotName ?? source.after.shotName ?? 'Untitled shot',
          createdAt: this.now(),
        });
      } catch {
        throw new GeneratedAssetServiceError(
          'metadata-failed',
          'The generated post information could not be saved. Please try again.',
        );
      }

      metadataCommitted = true;
      return created;
    } finally {
      if (!metadataCommitted && persistentUri) {
        await this.deletePersistentFileBestEffort(persistentUri);
      }
      if (temporaryUri) {
        await this.deleteTemporaryFileBestEffort(temporaryUri);
      }
    }
  }

  async deleteAsset(id: string): Promise<boolean> {
    const assetId = requireId(id, 'Generated asset ID');
    const asset = await this.dependencies.assetRepository.getAsset(assetId);
    if (!asset) {
      return false;
    }

    const managedUri = await this.dependencies.storage.getExistingManagedAssetUri(
      asset.jobId,
      asset.id,
    );
    if (managedUri) {
      try {
        await this.dependencies.storage.deleteGeneratedAssetFile(managedUri);
      } catch (caughtError) {
        const remainingManagedUri =
          await this.dependencies.storage.getExistingManagedAssetUri(
            asset.jobId,
            asset.id,
          );
        if (remainingManagedUri) {
          throw new GeneratedAssetServiceError(
            'delete-failed',
            'The generated post file could not be deleted. Please try again.',
          );
        }
        this.warn('Generated post file cleanup reported an error after removal.', caughtError);
      }
    } else if (asset.localUri.trim()) {
      this.warn(
        'Generated post metadata referenced a missing or mismatched managed file.',
        new Error('Managed generated file not found.'),
      );
    }

    try {
      return await this.dependencies.assetRepository.deleteAsset(assetId);
    } catch {
      throw new GeneratedAssetServiceError(
        'delete-failed',
        'The generated post information could not be deleted. Please try again.',
      );
    }
  }

  async deleteAssetsForJob(jobId: string): Promise<number> {
    const validJobId = requireId(jobId, 'Job ID');
    const deletedCount = await this.dependencies.assetRepository.deleteAssetsForJob(
      validJobId,
    );
    await this.deleteGeneratedDirectoryBestEffort(validJobId);
    return deletedCount;
  }

  async deleteJobWithAssets(
    jobId: string,
    deleteJobOperation: DeleteJobOperation,
  ): Promise<boolean> {
    const validJobId = requireId(jobId, 'Job ID');
    if (typeof deleteJobOperation !== 'function') {
      throw new GeneratedAssetServiceError(
        'invalid-input',
        'A job deletion operation is required.',
      );
    }

    let existingJob;
    try {
      existingJob = await this.dependencies.jobRepository.getJob(validJobId);
    } catch {
      throw new GeneratedAssetServiceError(
        'delete-failed',
        'The job could not be checked before deletion. Please try again.',
      );
    }
    if (!existingJob) {
      return false;
    }

    let snapshot: GeneratedAsset[];
    try {
      snapshot = await this.dependencies.assetRepository.listAssetsForJob(validJobId);
    } catch {
      throw new GeneratedAssetServiceError(
        'delete-failed',
        'Generated post information could not be prepared for job deletion. Please try again.',
      );
    }

    try {
      await this.dependencies.assetRepository.deleteAssetsForJob(validJobId);
      const remaining = await this.dependencies.assetRepository.listAssetsForJob(
        validJobId,
      );
      if (remaining.length > 0) {
        throw new Error('Generated asset metadata remained after deletion.');
      }
    } catch {
      await this.restoreGeneratedAssetMetadata(snapshot);
      throw new GeneratedAssetServiceError(
        'delete-failed',
        'Generated post information could not be removed, so the job was kept. Please try again.',
      );
    }

    let deleteJobResult: boolean | undefined;
    let deleteJobError: unknown;
    try {
      deleteJobResult = await deleteJobOperation();
    } catch (caughtError) {
      deleteJobError = caughtError;
    }

    if (deleteJobResult === false) {
      await this.restoreGeneratedAssetMetadata(snapshot);
      return false;
    }

    let jobStillExists: boolean | undefined;
    try {
      jobStillExists = Boolean(
        await this.dependencies.jobRepository.getJob(validJobId),
      );
    } catch (caughtError) {
      if (deleteJobResult === true) {
        this.warn(
          'The deleted job could not be checked after its repository confirmed deletion.',
          caughtError,
        );
      } else {
        await this.restoreGeneratedAssetMetadata(snapshot);
        throw new GeneratedAssetServiceError(
          'delete-failed',
          'The job deletion result could not be verified. The generated post information was restored.',
        );
      }
    }

    if (jobStillExists) {
      await this.restoreGeneratedAssetMetadata(snapshot);
      if (deleteJobError) {
        throw deleteJobError;
      }
      return false;
    }

    await this.deleteGeneratedDirectoryBestEffort(validJobId);
    return true;
  }

  fileExists(uri: string): Promise<boolean> {
    return this.dependencies.storage.fileExists(uri);
  }
}
