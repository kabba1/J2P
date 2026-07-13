import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { pairRepository } from '@/repositories/async-storage-pair-repository';
import {
  CreateBeforeAfterPairInput,
  pairingService,
} from '@/services/pairing-service';
import { BeforeAfterPair } from '@/types/pair';

type PairsContextValue = {
  pairs: BeforeAfterPair[];
  loadingJobIds: ReadonlySet<string>;
  error: string | undefined;
  refreshJobPairs: (jobId: string) => Promise<BeforeAfterPair[]>;
  refreshJobs: (jobIds: string[]) => Promise<void>;
  getPair: (id: string) => Promise<BeforeAfterPair | undefined>;
  findPairForBefore: (beforeMediaId: string) => Promise<BeforeAfterPair | undefined>;
  findPairForAfter: (afterMediaId: string) => Promise<BeforeAfterPair | undefined>;
  createPair: (input: CreateBeforeAfterPairInput) => Promise<BeforeAfterPair>;
  replaceAfterMedia: (
    pairId: string,
    afterMediaId: string,
  ) => Promise<BeforeAfterPair | undefined>;
  deletePair: (id: string) => Promise<boolean>;
  deletePairsForMedia: (mediaId: string) => Promise<number>;
  deletePairsForJob: (jobId: string) => Promise<number>;
  restorePairs: (records: BeforeAfterPair[]) => Promise<void>;
  pairsForJob: (jobId: string) => BeforeAfterPair[];
};

const PairsContext = createContext<PairsContextValue | undefined>(undefined);

function mergeJobPairs(
  current: BeforeAfterPair[],
  jobId: string,
  incoming: BeforeAfterPair[],
): BeforeAfterPair[] {
  return [...current.filter((pair) => pair.jobId !== jobId), ...incoming];
}

function userMessage(caughtError: unknown, fallback: string): string {
  return caughtError instanceof Error && caughtError.message ? caughtError.message : fallback;
}

function upsertPair(
  current: BeforeAfterPair[],
  incoming: BeforeAfterPair,
): BeforeAfterPair[] {
  return [incoming, ...current.filter((pair) => pair.id !== incoming.id)];
}

export function PairsProvider({ children }: PropsWithChildren) {
  const [pairs, setPairs] = useState<BeforeAfterPair[]>([]);
  const [loadingJobIds, setLoadingJobIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>();

  const setJobLoading = useCallback((jobId: string, loading: boolean) => {
    setLoadingJobIds((current) => {
      const next = new Set(current);
      if (loading) next.add(jobId);
      else next.delete(jobId);
      return next;
    });
  }, []);

  const refreshJobPairs = useCallback(
    async (jobId: string) => {
      setJobLoading(jobId, true);
      try {
        const records = await pairRepository.listPairsForJob(jobId);
        setPairs((current) => mergeJobPairs(current, jobId, records));
        setError(undefined);
        return records;
      } catch (caughtError) {
        const message = userMessage(
          caughtError,
          'Before and After pairs for this job could not be loaded.',
        );
        setError(message);
        throw new Error(message);
      } finally {
        setJobLoading(jobId, false);
      }
    },
    [setJobLoading],
  );

  const refreshJobs = useCallback(
    async (jobIds: string[]) => {
      const uniqueIds = [...new Set(jobIds)];
      const activeJobIds = new Set(uniqueIds);
      setPairs((current) => current.filter((pair) => activeJobIds.has(pair.jobId)));
      await Promise.all(uniqueIds.map(async (jobId) => refreshJobPairs(jobId)));
    },
    [refreshJobPairs],
  );

  const getPair = useCallback(async (id: string) => {
    const record = await pairRepository.getPair(id);
    if (record) {
      setPairs((current) => upsertPair(current, record));
    }
    return record;
  }, []);

  const findPairForBefore = useCallback(async (beforeMediaId: string) => {
    const record = await pairRepository.findPairForBefore(beforeMediaId);
    if (record) {
      setPairs((current) => upsertPair(current, record));
    }
    return record;
  }, []);

  const findPairForAfter = useCallback(async (afterMediaId: string) => {
    const record = await pairRepository.findPairForAfter(afterMediaId);
    if (record) {
      setPairs((current) => upsertPair(current, record));
    }
    return record;
  }, []);

  const createPair = useCallback(async (input: CreateBeforeAfterPairInput) => {
    const created = await pairingService.createPair(input);
    setPairs((current) => upsertPair(current, created));
    setError(undefined);
    return created;
  }, []);

  const replaceAfterMedia = useCallback(async (pairId: string, afterMediaId: string) => {
    const updated = await pairingService.replaceAfterMedia(pairId, afterMediaId);
    if (updated) {
      setPairs((current) => upsertPair(current, updated));
    }
    return updated;
  }, []);

  const deletePair = useCallback(async (id: string) => {
    const deleted = await pairRepository.deletePair(id);
    if (deleted) {
      setPairs((current) => current.filter((pair) => pair.id !== id));
    }
    return deleted;
  }, []);

  const deletePairsForMedia = useCallback(async (mediaId: string) => {
    const deletedCount = await pairRepository.deletePairsForMedia(mediaId);
    if (deletedCount > 0) {
      setPairs((current) =>
        current.filter(
          (pair) => pair.beforeMediaId !== mediaId && pair.afterMediaId !== mediaId,
        ),
      );
    }
    return deletedCount;
  }, []);

  const deletePairsForJob = useCallback(async (jobId: string) => {
    const deletedCount = await pairRepository.deletePairsForJob(jobId);
    if (deletedCount > 0) {
      setPairs((current) => current.filter((pair) => pair.jobId !== jobId));
    }
    return deletedCount;
  }, []);

  const restorePairs = useCallback(async (records: BeforeAfterPair[]) => {
    const restored: BeforeAfterPair[] = [];
    for (const record of records) {
      const existing = await pairRepository.getPair(record.id);
      if (existing) {
        restored.push(existing);
        continue;
      }
      restored.push(
        await pairRepository.createPair({
          id: record.id,
          jobId: record.jobId,
          beforeMediaId: record.beforeMediaId,
          afterMediaId: record.afterMediaId,
          createdAt: record.createdAt,
        }),
      );
    }
    setPairs((current) => restored.reduce(upsertPair, current));
  }, []);

  const pairsForJob = useCallback(
    (jobId: string) =>
      pairs
        .filter((pair) => pair.jobId === jobId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [pairs],
  );

  const value = useMemo(
    () => ({
      pairs,
      loadingJobIds,
      error,
      refreshJobPairs,
      refreshJobs,
      getPair,
      findPairForBefore,
      findPairForAfter,
      createPair,
      replaceAfterMedia,
      deletePair,
      deletePairsForMedia,
      deletePairsForJob,
      restorePairs,
      pairsForJob,
    }),
    [
      pairs,
      loadingJobIds,
      error,
      refreshJobPairs,
      refreshJobs,
      getPair,
      findPairForBefore,
      findPairForAfter,
      createPair,
      replaceAfterMedia,
      deletePair,
      deletePairsForMedia,
      deletePairsForJob,
      restorePairs,
      pairsForJob,
    ],
  );

  return <PairsContext.Provider value={value}>{children}</PairsContext.Provider>;
}

export function usePairs(): PairsContextValue {
  const context = useContext(PairsContext);
  if (!context) {
    throw new Error('usePairs must be used inside PairsProvider.');
  }
  return context;
}
