import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { mediaRepository } from '@/repositories/async-storage-media-repository';
import {
  MatchedAfterService,
  SaveMatchedAfterInput,
  SaveMatchedAfterResult,
} from '@/services/matched-after-service';
import { mediaFileStorage } from '@/services/media-file-storage';
import { usePairs } from '@/state/pairs-context';
import {
  createEmptyMediaStageCounts,
  createMediaId,
  JobMedia,
  JobMediaUpdateInput,
  MediaStage,
  MediaStageCounts,
} from '@/types/media';
import { BeforeAfterPair } from '@/types/pair';
import { getOrientation } from '@/utils/media-stage';

export type {
  SaveMatchedAfterInput,
  SaveMatchedAfterResult,
} from '@/services/matched-after-service';

type SaveCapturedPhotoInput = {
  tempUri: string;
  jobId: string;
  stage: MediaStage;
  capturedAt?: string;
  shotName?: string;
  note?: string;
  width?: number;
  height?: number;
  cameraFacing?: 'front' | 'back';
  zoom?: number;
};

type MediaContextValue = {
  media: JobMedia[];
  loadingJobIds: ReadonlySet<string>;
  error: string | undefined;
  refreshJob: (jobId: string) => Promise<JobMedia[]>;
  refreshJobs: (jobIds: string[]) => Promise<void>;
  getMedia: (id: string) => Promise<JobMedia | undefined>;
  saveCapturedPhoto: (input: SaveCapturedPhotoInput) => Promise<JobMedia>;
  saveMatchedAfter: (input: SaveMatchedAfterInput) => Promise<SaveMatchedAfterResult>;
  updateMedia: (id: string, input: JobMediaUpdateInput) => Promise<JobMedia | undefined>;
  deleteMedia: (id: string) => Promise<boolean>;
  removeJobMedia: (jobId: string) => Promise<void>;
  fileExists: (uri: string) => Promise<boolean>;
  discardTemporaryCapture: (uri: string) => Promise<void>;
  countsForJob: (jobId: string) => MediaStageCounts;
};

const MediaContext = createContext<MediaContextValue | undefined>(undefined);

function mergeJobMedia(current: JobMedia[], jobId: string, incoming: JobMedia[]): JobMedia[] {
  return [...current.filter((item) => item.jobId !== jobId), ...incoming];
}

function userMessage(caughtError: unknown, fallback: string): string {
  return caughtError instanceof Error && caughtError.message ? caughtError.message : fallback;
}

export function MediaProvider({ children }: PropsWithChildren) {
  const {
    getPair,
    findPairForBefore,
    findPairForAfter,
    createPair,
    replaceAfterMedia,
    deletePairsForMedia,
    deletePairsForJob,
    refreshJobPairs,
    restorePairs,
  } = usePairs();
  const [media, setMedia] = useState<JobMedia[]>([]);
  const [loadingJobIds, setLoadingJobIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>();
  const matchedAfterInFlight = useRef<Set<string>>(new Set());

  const setJobLoading = useCallback((jobId: string, loading: boolean) => {
    setLoadingJobIds((current) => {
      const next = new Set(current);
      if (loading) next.add(jobId);
      else next.delete(jobId);
      return next;
    });
  }, []);

  const refreshJob = useCallback(
    async (jobId: string) => {
      setJobLoading(jobId, true);
      try {
        const records = await mediaRepository.listMediaForJob(jobId);
        setMedia((current) => mergeJobMedia(current, jobId, records));
        setError(undefined);
        return records;
      } catch (caughtError) {
        const message = userMessage(caughtError, 'Photos for this job could not be loaded.');
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
      setMedia((current) => current.filter((item) => activeJobIds.has(item.jobId)));
      await Promise.all(uniqueIds.map(async (jobId) => refreshJob(jobId)));
    },
    [refreshJob],
  );

  const getMedia = useCallback(async (id: string) => {
    const record = await mediaRepository.getMedia(id);
    if (record) {
      setMedia((current) => {
        const withoutRecord = current.filter((item) => item.id !== record.id);
        return [...withoutRecord, record];
      });
    }
    return record;
  }, []);

  const saveCapturedPhoto = useCallback(async (input: SaveCapturedPhotoInput) => {
    const mediaId = createMediaId();
    const persistentUri = await mediaFileStorage.persistCapturedPhoto(
      input.tempUri,
      input.jobId,
      input.stage,
      mediaId,
    );

    try {
      const created = await mediaRepository.createMedia({
        id: mediaId,
        jobId: input.jobId,
        stage: input.stage,
        localUri: persistentUri,
        shotName: input.shotName,
        note: input.note,
        createdAt: input.capturedAt,
        width: input.width,
        height: input.height,
        orientation: getOrientation(input.width, input.height),
        cameraFacing: input.cameraFacing,
        zoom: input.zoom,
      });
      setMedia((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      await mediaFileStorage.deleteTemporaryCapture(input.tempUri);
      return created;
    } catch (caughtError) {
      await mediaFileStorage.deleteMediaFile(persistentUri).catch(() => undefined);
      throw new Error(userMessage(caughtError, 'The photo information could not be saved.'));
    }
  }, []);

  const saveMatchedAfter = useCallback(async (input: SaveMatchedAfterInput) => {
    const transactionKey = input.replacePairId ?? input.beforeMediaId;
    if (matchedAfterInFlight.current.has(transactionKey)) {
      throw new Error('This After photo is already being saved.');
    }

    matchedAfterInFlight.current.add(transactionKey);

    try {
      const service = new MatchedAfterService({
        mediaRepository,
        mediaFileStorage,
        getPair,
        createPair,
        replaceAfterMedia,
        warn: (message, cleanupError) => console.warn(message, cleanupError),
      });
      const result = await service.save(input);
      setMedia((current) => [
        result.after,
        ...current.filter((item) => item.id !== result.after.id),
      ]);
      return result;
    } finally {
      matchedAfterInFlight.current.delete(transactionKey);
    }
  }, [createPair, getPair, replaceAfterMedia]);

  const pairsForMedia = useCallback(async (mediaId: string) => {
    const records = await Promise.all([
      findPairForBefore(mediaId),
      findPairForAfter(mediaId),
    ]);
    return [...new Map(records.filter((pair) => pair !== undefined).map((pair) => [pair.id, pair])).values()];
  }, [findPairForAfter, findPairForBefore]);

  const updateMedia = useCallback(async (id: string, input: JobMediaUpdateInput) => {
    let removedPairs: BeforeAfterPair[] = [];
    if (input.stage !== undefined) {
      const existing = await mediaRepository.getMedia(id);
      if (existing && input.stage !== existing.stage) {
        removedPairs = await pairsForMedia(id);
        await deletePairsForMedia(id);
      }
    }
    let updated: JobMedia | undefined;
    try {
      updated = await mediaRepository.updateMedia(id, input);
    } catch (caughtError) {
      if (removedPairs.length > 0 && (await mediaRepository.getMedia(id))) {
        await restorePairs(removedPairs);
      }
      throw caughtError;
    }
    if (!updated && removedPairs.length > 0 && (await mediaRepository.getMedia(id))) {
      await restorePairs(removedPairs);
    }
    if (updated) {
      setMedia((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    }
    return updated;
  }, [deletePairsForMedia, pairsForMedia, restorePairs]);

  const deleteMedia = useCallback(async (id: string) => {
    const existing = await mediaRepository.getMedia(id);
    if (!existing) return false;

    const removedPairs = await pairsForMedia(id);
    await deletePairsForMedia(id);
    let deleted: boolean;
    try {
      deleted = await mediaRepository.deleteMedia(id);
    } catch (caughtError) {
      if (removedPairs.length > 0 && (await mediaRepository.getMedia(id))) {
        await restorePairs(removedPairs);
      }
      throw caughtError;
    }
    if (!deleted) {
      if (removedPairs.length > 0 && (await mediaRepository.getMedia(id))) {
        await restorePairs(removedPairs);
      }
      return false;
    }

    setMedia((current) => current.filter((item) => item.id !== id));
    await mediaFileStorage.deleteMediaFile(existing.localUri).catch((cleanupError) => {
      console.warn('A deleted photo file could not be cleaned up.', cleanupError);
    });
    return true;
  }, [deletePairsForMedia, pairsForMedia, restorePairs]);

  const removeJobMedia = useCallback(async (jobId: string) => {
    const removedPairs = await refreshJobPairs(jobId);
    await deletePairsForJob(jobId);
    try {
      await mediaRepository.deleteMediaForJob(jobId);
    } catch (caughtError) {
      const remaining = await mediaRepository.listMediaForJob(jobId);
      const remainingIds = new Set(remaining.map((item) => item.id));
      const validPairs = removedPairs.filter(
        (pair) => remainingIds.has(pair.beforeMediaId) && remainingIds.has(pair.afterMediaId),
      );
      if (validPairs.length > 0) await restorePairs(validPairs);
      throw caughtError;
    }
    setMedia((current) => current.filter((item) => item.jobId !== jobId));
    await mediaFileStorage.deleteJobMediaDirectory(jobId).catch((cleanupError) => {
      console.warn('Some deleted job photos could not be cleaned up.', cleanupError);
    });
  }, [deletePairsForJob, refreshJobPairs, restorePairs]);

  const countsForJob = useCallback(
    (jobId: string) => {
      const counts = createEmptyMediaStageCounts();
      for (const item of media) {
        if (item.jobId === jobId) counts[item.stage] += 1;
      }
      return counts;
    },
    [media],
  );

  const fileExists = useCallback((uri: string) => mediaFileStorage.fileExists(uri), []);
  const discardTemporaryCapture = useCallback(
    (uri: string) => mediaFileStorage.deleteTemporaryCapture(uri),
    [],
  );

  const value = useMemo(
    () => ({
      media,
      loadingJobIds,
      error,
      refreshJob,
      refreshJobs,
      getMedia,
      saveCapturedPhoto,
      saveMatchedAfter,
      updateMedia,
      deleteMedia,
      removeJobMedia,
      fileExists,
      discardTemporaryCapture,
      countsForJob,
    }),
    [
      media,
      loadingJobIds,
      error,
      refreshJob,
      refreshJobs,
      getMedia,
      saveCapturedPhoto,
      saveMatchedAfter,
      updateMedia,
      deleteMedia,
      removeJobMedia,
      fileExists,
      discardTemporaryCapture,
      countsForJob,
    ],
  );

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
}

export function useMedia(): MediaContextValue {
  const context = useContext(MediaContext);
  if (!context) throw new Error('useMedia must be used inside MediaProvider.');
  return context;
}
