import {
  GeneratedAsset,
  GeneratedAssetCreateInput,
  GeneratedAssetUpdateInput,
} from '@/types/generated-asset';

export interface GeneratedAssetRepository {
  listAssets(): Promise<GeneratedAsset[]>;
  listAssetsForJob(jobId: string): Promise<GeneratedAsset[]>;
  getAsset(id: string): Promise<GeneratedAsset | undefined>;
  createAsset(input: GeneratedAssetCreateInput): Promise<GeneratedAsset>;
  updateAsset(
    id: string,
    input: GeneratedAssetUpdateInput,
  ): Promise<GeneratedAsset | undefined>;
  deleteAsset(id: string): Promise<boolean>;
  deleteAssetsForJob(jobId: string): Promise<number>;
}
