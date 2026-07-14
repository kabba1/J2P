export type GeneratedAssetFormat = 'square' | 'portrait';

export type GeneratedAssetLayout = 'side-by-side' | 'stacked';

export type GeneratedAsset = {
  id: string;
  jobId: string;
  pairId: string;
  assetType: 'before-after-image';
  localUri: string;
  format: GeneratedAssetFormat;
  layout: GeneratedAssetLayout;
  width: number;
  height: number;
  labelsEnabled: boolean;
  footerText?: string;
  sourceShotName?: string;
  createdAt: string;
  updatedAt: string;
};

export type GeneratedAssetCreateInput = Omit<
  GeneratedAsset,
  'assetType' | 'createdAt' | 'updatedAt'
> & {
  createdAt?: string;
};

export type GeneratedAssetUpdateInput = Partial<
  Pick<
    GeneratedAsset,
    | 'localUri'
    | 'format'
    | 'layout'
    | 'width'
    | 'height'
    | 'labelsEnabled'
  >
> & {
  footerText?: string | null;
  sourceShotName?: string | null;
};

export function isGeneratedAssetFormat(
  value: unknown,
): value is GeneratedAssetFormat {
  return value === 'square' || value === 'portrait';
}

export function isGeneratedAssetLayout(
  value: unknown,
): value is GeneratedAssetLayout {
  return value === 'side-by-side' || value === 'stacked';
}

export function createGeneratedAssetId(): string {
  return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
