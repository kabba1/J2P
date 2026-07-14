import AsyncStorage from '@react-native-async-storage/async-storage';
import { Paths } from 'expo-file-system';

import { GeneratedAssetRepository } from '@/repositories/generated-asset-repository';
import {
  GeneratedAsset,
  GeneratedAssetCreateInput,
  GeneratedAssetUpdateInput,
  isGeneratedAssetFormat,
  isGeneratedAssetLayout,
} from '@/types/generated-asset';
import {
  GENERATED_ASSET_FOOTER_MAX_LENGTH,
  getGeneratedAssetRelativePath,
  getGeneratedAssetDimensions,
  normalizeFooterText,
  requireSafeGeneratedAssetStorageId,
} from '@/utils/generated-asset';

const STORAGE_KEY = '@jobtopost/generated-assets/v1';
const SOURCE_SHOT_NAME_MAX_LENGTH = 120;

type GeneratedAssetMetadataStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'setItem'
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function isSafeStorageId(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  try {
    return requireSafeGeneratedAssetStorageId(value, 'Storage ID') === value;
  } catch {
    return false;
  }
}

function isManagedGeneratedAssetUri(
  value: unknown,
  jobId: unknown,
  assetId: unknown,
): value is string {
  if (
    !isNonEmptyString(value) ||
    !isSafeStorageId(jobId) ||
    !isSafeStorageId(assetId) ||
    !value.startsWith('file://') ||
    value.includes('?') ||
    value.includes('#')
  ) {
    return false;
  }

  try {
    const documentRoot = Paths.document.uri.replace(/\/+$/, '');
    const expectedUri = Paths.normalize(
      `${documentRoot}/${getGeneratedAssetRelativePath(jobId, assetId)}`,
    );
    return Paths.normalize(value) === expectedUri;
  } catch {
    return false;
  }
}

function isOptionalFooterText(value: unknown): value is string | undefined {
  return (
    value === undefined ||
    (isNonEmptyString(value) &&
      value.length <= GENERATED_ASSET_FOOTER_MAX_LENGTH &&
      normalizeFooterText(value) === value)
  );
}

function isOptionalSourceShotName(value: unknown): value is string | undefined {
  return (
    value === undefined ||
    (isNonEmptyString(value) && value.length <= SOURCE_SHOT_NAME_MAX_LENGTH)
  );
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString() === value;
}

function hasExpectedDimensions(
  format: unknown,
  width: unknown,
  height: unknown,
): boolean {
  if (
    !isGeneratedAssetFormat(format) ||
    typeof width !== 'number' ||
    !Number.isInteger(width) ||
    typeof height !== 'number' ||
    !Number.isInteger(height)
  ) {
    return false;
  }
  const expected = getGeneratedAssetDimensions(format);
  return width === expected.width && height === expected.height;
}

function isGeneratedAsset(value: unknown): value is GeneratedAsset {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isSafeStorageId(value.id) &&
    isSafeStorageId(value.jobId) &&
    isNonEmptyString(value.pairId) &&
    value.assetType === 'before-after-image' &&
    isManagedGeneratedAssetUri(value.localUri, value.jobId, value.id) &&
    isGeneratedAssetFormat(value.format) &&
    isGeneratedAssetLayout(value.layout) &&
    hasExpectedDimensions(value.format, value.width, value.height) &&
    typeof value.labelsEnabled === 'boolean' &&
    isOptionalFooterText(value.footerText) &&
    isOptionalSourceShotName(value.sourceShotName) &&
    isIsoDate(value.createdAt) &&
    isIsoDate(value.updatedAt)
  );
}

function requireNonEmptyString(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  return trimmed;
}

function requireStorageId(value: string, label: string): string {
  const trimmed = requireNonEmptyString(value, label);
  return requireSafeGeneratedAssetStorageId(trimmed, label);
}

function requireManagedGeneratedAssetUri(
  value: string,
  jobId: string,
  assetId: string,
): string {
  const trimmed = requireNonEmptyString(value, 'Generated asset URI');
  if (!isManagedGeneratedAssetUri(trimmed, jobId, assetId)) {
    throw new Error('Generated asset URI must match its managed job and asset path.');
  }
  return trimmed;
}

function requireIsoDate(value: string, label: string): string {
  if (!isIsoDate(value)) {
    throw new Error(`${label} must be a valid date.`);
  }
  return value;
}

function requireBoolean(value: boolean, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be on or off.`);
  }
  return value;
}

function normalizeOptionalFooterText(
  value: string | null | undefined,
): string | undefined {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new Error('Footer text must be plain text.');
  }
  return normalizeFooterText(value);
}

function trimSourceShotName(value: string | null | undefined): string | undefined {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new Error('Source shot name must be plain text.');
  }
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, SOURCE_SHOT_NAME_MAX_LENGTH).trimEnd();
}

function requireFormatDimensions(
  format: GeneratedAsset['format'],
  width: number,
  height: number,
): void {
  const expected = getGeneratedAssetDimensions(format);
  if (width !== expected.width || height !== expected.height) {
    throw new Error(
      `${format === 'square' ? 'Square' : 'Portrait'} posts must be ${expected.width} x ${expected.height} pixels.`,
    );
  }
}

function validateCreateInput(input: GeneratedAssetCreateInput): GeneratedAsset {
  if (!isGeneratedAssetFormat(input.format)) {
    throw new Error('Generated post format is invalid.');
  }
  if (!isGeneratedAssetLayout(input.layout)) {
    throw new Error('Generated post layout is invalid.');
  }
  requireFormatDimensions(input.format, input.width, input.height);

  const timestamp = new Date().toISOString();
  return {
    id: requireStorageId(input.id, 'Generated asset ID'),
    jobId: requireStorageId(input.jobId, 'Job ID'),
    pairId: requireNonEmptyString(input.pairId, 'Pair ID'),
    assetType: 'before-after-image',
    localUri: requireManagedGeneratedAssetUri(
      input.localUri,
      requireStorageId(input.jobId, 'Job ID'),
      requireStorageId(input.id, 'Generated asset ID'),
    ),
    format: input.format,
    layout: input.layout,
    width: input.width,
    height: input.height,
    labelsEnabled: requireBoolean(input.labelsEnabled, 'Label visibility'),
    footerText: normalizeOptionalFooterText(input.footerText),
    sourceShotName: trimSourceShotName(input.sourceShotName),
    createdAt:
      input.createdAt === undefined
        ? timestamp
        : requireIsoDate(input.createdAt, 'Asset creation date'),
    updatedAt: timestamp,
  };
}

function applyUpdate(
  current: GeneratedAsset,
  input: GeneratedAssetUpdateInput,
): GeneratedAsset {
  const format = input.format ?? current.format;
  const layout = input.layout ?? current.layout;
  if (!isGeneratedAssetFormat(format)) {
    throw new Error('Generated post format is invalid.');
  }
  if (!isGeneratedAssetLayout(layout)) {
    throw new Error('Generated post layout is invalid.');
  }

  const width = input.width ?? current.width;
  const height = input.height ?? current.height;
  requireFormatDimensions(format, width, height);

  return {
    ...current,
    localUri:
      input.localUri === undefined
        ? current.localUri
        : requireManagedGeneratedAssetUri(input.localUri, current.jobId, current.id),
    format,
    layout,
    width,
    height,
    labelsEnabled:
      input.labelsEnabled === undefined
        ? current.labelsEnabled
        : requireBoolean(input.labelsEnabled, 'Label visibility'),
    footerText:
      input.footerText === undefined
        ? current.footerText
        : normalizeOptionalFooterText(input.footerText),
    sourceShotName:
      input.sourceShotName === undefined
        ? current.sourceShotName
        : trimSourceShotName(input.sourceShotName),
    updatedAt: new Date().toISOString(),
  };
}

async function readAssets(
  storage: GeneratedAssetMetadataStorage,
): Promise<GeneratedAsset[]> {
  const raw = await storage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Saved generated post information could not be read.');
  }

  if (!Array.isArray(parsed) || !parsed.every(isGeneratedAsset)) {
    throw new Error('Saved generated post information is not in the expected format.');
  }

  const ids = new Set(parsed.map((asset) => asset.id));
  if (ids.size !== parsed.length) {
    throw new Error('Saved generated post information contains duplicate IDs.');
  }

  return parsed;
}

async function writeAssets(
  storage: GeneratedAssetMetadataStorage,
  assets: GeneratedAsset[],
): Promise<void> {
  await storage.setItem(STORAGE_KEY, JSON.stringify(assets));
}

function sortNewestFirst(assets: GeneratedAsset[]): GeneratedAsset[] {
  return [...assets].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export class AsyncStorageGeneratedAssetRepository
implements GeneratedAssetRepository {
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly storage: GeneratedAssetMetadataStorage = AsyncStorage,
  ) {}

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

  async listAssets(): Promise<GeneratedAsset[]> {
    await this.waitForMutations();
    return sortNewestFirst(await readAssets(this.storage));
  }

  async listAssetsForJob(jobId: string): Promise<GeneratedAsset[]> {
    await this.waitForMutations();
    const validJobId = requireNonEmptyString(jobId, 'Job ID');
    const assets = await readAssets(this.storage);
    return sortNewestFirst(assets.filter((asset) => asset.jobId === validJobId));
  }

  async getAsset(id: string): Promise<GeneratedAsset | undefined> {
    await this.waitForMutations();
    const validId = requireNonEmptyString(id, 'Generated asset ID');
    const assets = await readAssets(this.storage);
    return assets.find((asset) => asset.id === validId);
  }

  createAsset(input: GeneratedAssetCreateInput): Promise<GeneratedAsset> {
    return this.enqueueMutation(async () => {
      const assets = await readAssets(this.storage);
      const created = validateCreateInput(input);
      if (assets.some((asset) => asset.id === created.id)) {
        throw new Error('A generated post with this ID already exists.');
      }
      await writeAssets(this.storage, [created, ...assets]);
      return created;
    });
  }

  updateAsset(
    id: string,
    input: GeneratedAssetUpdateInput,
  ): Promise<GeneratedAsset | undefined> {
    return this.enqueueMutation(async () => {
      const validId = requireNonEmptyString(id, 'Generated asset ID');
      const assets = await readAssets(this.storage);
      const index = assets.findIndex((asset) => asset.id === validId);
      if (index < 0) {
        return undefined;
      }
      const updated = applyUpdate(assets[index], input);
      assets[index] = updated;
      await writeAssets(this.storage, assets);
      return updated;
    });
  }

  deleteAsset(id: string): Promise<boolean> {
    return this.enqueueMutation(async () => {
      const validId = requireNonEmptyString(id, 'Generated asset ID');
      const assets = await readAssets(this.storage);
      const nextAssets = assets.filter((asset) => asset.id !== validId);
      if (nextAssets.length === assets.length) {
        return false;
      }
      await writeAssets(this.storage, nextAssets);
      return true;
    });
  }

  deleteAssetsForJob(jobId: string): Promise<number> {
    return this.enqueueMutation(async () => {
      const validJobId = requireNonEmptyString(jobId, 'Job ID');
      const assets = await readAssets(this.storage);
      const nextAssets = assets.filter((asset) => asset.jobId !== validJobId);
      const deletedCount = assets.length - nextAssets.length;
      if (deletedCount > 0) {
        await writeAssets(this.storage, nextAssets);
      }
      return deletedCount;
    });
  }
}

export const generatedAssetRepository: GeneratedAssetRepository =
  new AsyncStorageGeneratedAssetRepository();
