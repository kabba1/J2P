import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { mediaRepository } from '@/repositories/async-storage-media-repository';
import { mediaFileStorage } from '@/services/media-file-storage';
import {
  createEmptyMediaStageCounts,
  createMediaId,
  JobMedia,
  JobMediaUpdateInput,
  MediaStage,
  MediaStageCounts,
} from '@/types/media';
import { getOrientation } from '@/utils/media-stage';

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
  const [media, setMedia] = useState<JobMedia[]>([]);
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

  const updateMedia = useCallback(async (id: string, input: JobMediaUpdateInput) => {
    const updated = await mediaRepository.updateMedia(id, input);
    if (updated) {
      setMedia((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    }
    return updated;
  }, []);

  const deleteMedia = useCallback(async (id: string) => {
    const existing = await mediaRepository.getMedia(id);
    if (!existing) return false;

    const deleted = await mediaRepository.deleteMedia(id);
    if (!deleted) return false;

    setMedia((current) => current.filter((item) => item.id !== id));
    await mediaFileStorage.deleteMediaFile(existing.localUri).catch((cleanupError) => {
      console.warn('A deleted photo file could not be cleaned up.', cleanupError);
    });
    return true;
  }, []);

  const removeJobMedia = useCallback(async (jobId: string) => {
    await mediaRepository.deleteMediaForJob(jobId);
    setMedia((current) => current.filter((item) => item.jobId !== jobId));
    await mediaFileStorage.deleteJobMediaDirectory(jobId).catch((cleanupError) => {
      console.warn('Some deleted job photos could not be cleaned up.', cleanupError);
    });
  }, []);

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
