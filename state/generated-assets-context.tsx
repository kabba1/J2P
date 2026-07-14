import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { jobRepository } from '@/repositories/async-storage-job-repository';
import { mediaRepository } from '@/repositories/async-storage-media-repository';
import { pairRepository } from '@/repositories/async-storage-pair-repository';
import { generatedAssetRepository } from '@/repositories/async-storage-generated-asset-repository';
import {
  DeleteJobOperation,
  GeneratedAssetService,
  GeneratedAssetServiceError,
  GenerateGeneratedAssetInput,
} from '@/services/generated-asset-service';
import { generatedAssetStorage } from '@/services/generated-asset-storage';
import { GeneratedAsset } from '@/types/generated-asset';
import { KeyedOperationQueue } from '@/utils/keyed-operation-queue';

export type { GenerateGeneratedAssetInput } from '@/services/generated-asset-service';

type GeneratedAssetsContextValue = {
  assets: GeneratedAsset[];
  loading: boolean;
  error: string | undefined;
  generatingPairIds: ReadonlySet<string>;
  refresh: () => Promise<GeneratedAsset[]>;
  listAssets: () => Promise<GeneratedAsset[]>;
  refreshJob: (jobId: string) => Promise<GeneratedAsset[]>;
  listAssetsForJob: (jobId: string) => Promise<GeneratedAsset[]>;
  assetsForJob: (jobId: string) => GeneratedAsset[];
  getAsset: (id: string) => Promise<GeneratedAsset | undefined>;
  generateAsset: (input: GenerateGeneratedAssetInput) => Promise<GeneratedAsset>;
  deleteAsset: (id: string) => Promise<boolean>;
  deleteAssetsForJob: (jobId: string) => Promise<number>;
  deleteJobWithAssets: (
    jobId: string,
    deleteJobOperation: DeleteJobOperation,
  ) => Promise<boolean>;
  deleteForJob: (jobId: string) => Promise<number>;
  fileExists: (uri: string) => Promise<boolean>;
};

const GeneratedAssetsContext = createContext<GeneratedAssetsContextValue | undefined>(
  undefined,
);

const generatedAssetService = new GeneratedAssetService({
  jobRepository,
  pairRepository,
  mediaRepository,
  assetRepository: generatedAssetRepository,
  storage: generatedAssetStorage,
});

function sortNewestFirst(assets: GeneratedAsset[]): GeneratedAsset[] {
  return [...assets].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

function upsertAsset(
  current: GeneratedAsset[],
  incoming: GeneratedAsset,
): GeneratedAsset[] {
  return sortNewestFirst([
    incoming,
    ...current.filter((asset) => asset.id !== incoming.id),
  ]);
}

function mergeJobAssets(
  current: GeneratedAsset[],
  jobId: string,
  incoming: GeneratedAsset[],
): GeneratedAsset[] {
  return sortNewestFirst([
    ...current.filter((asset) => asset.jobId !== jobId),
    ...incoming,
  ]);
}

function userMessage(caughtError: unknown, fallback: string): string {
  return caughtError instanceof Error && caughtError.message
    ? caughtError.message
    : fallback;
}

export function GeneratedAssetsProvider({ children }: PropsWithChildren) {
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [generatingPairIds, setGeneratingPairIds] = useState<Set<string>>(
    new Set(),
  );
  const generationInFlight = useRef<Set<string>>(new Set());
  const jobOperations = useRef(new KeyedOperationQueue()).current;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const records = await generatedAssetRepository.listAssets();
      setAssets(records);
      setError(undefined);
      return records;
    } catch (caughtError) {
      const message = userMessage(
        caughtError,
        'Generated posts could not be loaded.',
      );
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  const listAssetsForJob = useCallback(async (jobId: string) => {
    try {
      const records = await generatedAssetRepository.listAssetsForJob(jobId);
      setAssets((current) => mergeJobAssets(current, jobId, records));
      setError(undefined);
      return records;
    } catch (caughtError) {
      const message = userMessage(
        caughtError,
        'Generated posts for this job could not be loaded.',
      );
      setError(message);
      throw new Error(message);
    }
  }, []);

  const assetsForJob = useCallback(
    (jobId: string) =>
      assets.filter((asset) => asset.jobId === jobId),
    [assets],
  );

  const getAsset = useCallback(async (id: string) => {
    try {
      const record = await generatedAssetRepository.getAsset(id);
      setAssets((current) =>
        record
          ? upsertAsset(current, record)
          : current.filter((asset) => asset.id !== id),
      );
      setError(undefined);
      return record;
    } catch (caughtError) {
      const message = userMessage(caughtError, 'The generated post could not be loaded.');
      setError(message);
      throw new Error(message);
    }
  }, []);

  const generateAsset = useCallback(async (input: GenerateGeneratedAssetInput) => {
    const pairId = input.pairId.trim();
    if (generationInFlight.current.has(pairId)) {
      const duplicateError = new GeneratedAssetServiceError(
        'invalid-input',
        'A post for this pair is already being generated.',
      );
      setError(duplicateError.message);
      throw duplicateError;
    }

    generationInFlight.current.add(pairId);
    setGeneratingPairIds((current) => new Set(current).add(pairId));
    setError(undefined);
    try {
      const created = await jobOperations.run(input.jobId.trim(), () =>
        generatedAssetService.generate(input),
      );
      setAssets((current) => upsertAsset(current, created));
      return created;
    } catch (caughtError) {
      const message = userMessage(
        caughtError,
        'The generated post could not be created. Please try again.',
      );
      setError(message);
      throw caughtError instanceof Error ? caughtError : new Error(message);
    } finally {
      generationInFlight.current.delete(pairId);
      setGeneratingPairIds((current) => {
        const next = new Set(current);
        next.delete(pairId);
        return next;
      });
    }
  }, [jobOperations]);

  const deleteAsset = useCallback(async (id: string) => {
    try {
      const deleted = await generatedAssetService.deleteAsset(id);
      setAssets((current) => current.filter((asset) => asset.id !== id));
      setError(undefined);
      return deleted;
    } catch (caughtError) {
      const message = userMessage(
        caughtError,
        'The generated post could not be deleted.',
      );
      setError(message);
      throw caughtError instanceof Error ? caughtError : new Error(message);
    }
  }, []);

  const deleteAssetsForJob = useCallback(async (jobId: string) => {
    try {
      const deletedCount = await jobOperations.run(jobId.trim(), () =>
        generatedAssetService.deleteAssetsForJob(jobId),
      );
      setAssets((current) => current.filter((asset) => asset.jobId !== jobId));
      setError(undefined);
      return deletedCount;
    } catch (caughtError) {
      const message = userMessage(
        caughtError,
        'Generated post information for this job could not be removed.',
      );
      setError(message);
      throw caughtError instanceof Error ? caughtError : new Error(message);
    }
  }, [jobOperations]);

  const deleteJobWithAssets = useCallback(async (
    jobId: string,
    deleteJobOperation: DeleteJobOperation,
  ) => {
    const validJobId = jobId.trim();
    try {
      const deleted = await jobOperations.run(validJobId, () =>
        generatedAssetService.deleteJobWithAssets(jobId, deleteJobOperation),
      );
      if (deleted) {
        setAssets((current) =>
          current.filter((asset) => asset.jobId !== validJobId),
        );
      } else {
        const records = await generatedAssetRepository.listAssetsForJob(validJobId);
        setAssets((current) => mergeJobAssets(current, validJobId, records));
      }
      setError(undefined);
      return deleted;
    } catch (caughtError) {
      try {
        const records = await generatedAssetRepository.listAssetsForJob(validJobId);
        setAssets((current) => mergeJobAssets(current, validJobId, records));
      } catch {
        // Preserve the transaction error; a later refresh can recover UI state.
      }
      const message = userMessage(
        caughtError,
        'The job could not be deleted safely. Please try again.',
      );
      setError(message);
      throw caughtError instanceof Error ? caughtError : new Error(message);
    }
  }, [jobOperations]);

  const fileExists = useCallback(
    (uri: string) => generatedAssetService.fileExists(uri),
    [],
  );

  const value = useMemo<GeneratedAssetsContextValue>(
    () => ({
      assets,
      loading,
      error,
      generatingPairIds,
      refresh,
      listAssets: refresh,
      refreshJob: listAssetsForJob,
      listAssetsForJob,
      assetsForJob,
      getAsset,
      generateAsset,
      deleteAsset,
      deleteAssetsForJob,
      deleteJobWithAssets,
      deleteForJob: deleteAssetsForJob,
      fileExists,
    }),
    [
      assets,
      loading,
      error,
      generatingPairIds,
      refresh,
      listAssetsForJob,
      assetsForJob,
      getAsset,
      generateAsset,
      deleteAsset,
      deleteAssetsForJob,
      deleteJobWithAssets,
      fileExists,
    ],
  );

  return (
    <GeneratedAssetsContext.Provider value={value}>
      {children}
    </GeneratedAssetsContext.Provider>
  );
}

export function useGeneratedAssets(): GeneratedAssetsContextValue {
  const context = useContext(GeneratedAssetsContext);
  if (!context) {
    throw new Error('useGeneratedAssets must be used inside GeneratedAssetsProvider.');
  }
  return context;
}
