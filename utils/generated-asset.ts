import {
  GeneratedAssetFormat,
  isGeneratedAssetFormat,
} from '@/types/generated-asset';

export type GeneratedAssetDimensions = {
  width: number;
  height: number;
};

export const GENERATED_ASSET_FOOTER_MAX_LENGTH = 60;

const SAFE_STORAGE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

const DIMENSIONS: Record<GeneratedAssetFormat, GeneratedAssetDimensions> = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
};

export function getGeneratedAssetDimensions(
  format: unknown,
): GeneratedAssetDimensions {
  if (!isGeneratedAssetFormat(format)) {
    throw new Error('Generated post format is invalid.');
  }
  return { ...DIMENSIONS[format] };
}

export function normalizeFooterText(
  value: string | null | undefined,
): string | undefined {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return undefined;
  }
  return normalized.slice(0, GENERATED_ASSET_FOOTER_MAX_LENGTH).trimEnd();
}

export function requireSafeGeneratedAssetStorageId(
  value: string,
  label: string,
): string {
  const trimmed = value.trim();
  if (!SAFE_STORAGE_ID.test(trimmed)) {
    throw new Error(`${label} contains characters that cannot be used for local storage.`);
  }
  return trimmed;
}

export function getGeneratedAssetRelativePath(
  jobId: string,
  assetId: string,
): string {
  const validJobId = requireSafeGeneratedAssetStorageId(jobId, 'Job ID');
  const validAssetId = requireSafeGeneratedAssetStorageId(assetId, 'Asset ID');
  return `jobs/${validJobId}/generated/${validAssetId}.png`;
}
