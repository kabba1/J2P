import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { jobRepository } from '@/repositories/async-storage-job-repository';
import { mediaRepository } from '@/repositories/async-storage-media-repository';
import { mediaFileStorage } from '@/services/media-file-storage';
import { useGeneratedAssets } from '@/state/generated-assets-context';
import { usePairs } from '@/state/pairs-context';
import { Job, JobInput } from '@/types/job';

type JobsContextValue = {
  jobs: Job[];
  loading: boolean;
  error: string | undefined;
  refresh: () => Promise<void>;
  createJob: (input: JobInput) => Promise<Job>;
  updateJob: (id: string, input: JobInput) => Promise<Job | undefined>;
  archiveJob: (id: string) => Promise<Job | undefined>;
  restoreJob: (id: string) => Promise<Job | undefined>;
  deleteJob: (id: string) => Promise<boolean>;
};

const JobsContext = createContext<JobsContextValue | undefined>(undefined);

function sortJobs(jobs: Job[]): Job[] {
  return [...jobs].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function JobsProvider({ children }: PropsWithChildren) {
  const { deletePairsForJob, refreshJobPairs, restorePairs } = usePairs();
  const { deleteJobWithAssets } = useGeneratedAssets();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await jobRepository.listJobs());
      setError(undefined);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createJob = useCallback(async (input: JobInput) => {
    const created = await jobRepository.createJob(input);
    setJobs((current) => sortJobs([created, ...current]));
    return created;
  }, []);

  const updateJob = useCallback(async (id: string, input: JobInput) => {
    const updated = await jobRepository.updateJob(id, input);
    if (updated) {
      setJobs((current) =>
        sortJobs(current.map((job) => (job.id === updated.id ? updated : job))),
      );
    }
    return updated;
  }, []);

  const archiveJob = useCallback(async (id: string) => {
    const archived = await jobRepository.archiveJob(id);
    if (archived) {
      setJobs((current) =>
        sortJobs(current.map((job) => (job.id === archived.id ? archived : job))),
      );
    }
    return archived;
  }, []);

  const restoreJob = useCallback(async (id: string) => {
    const restored = await jobRepository.restoreJob(id);
    if (restored) {
      setJobs((current) =>
        sortJobs(current.map((job) => (job.id === restored.id ? restored : job))),
      );
    }
    return restored;
  }, []);

  const deleteJob = useCallback(async (id: string) => {
    const deleted = await deleteJobWithAssets(id, async () => {
      const removedPairs = await refreshJobPairs(id);
      await deletePairsForJob(id);
      let jobDeleted: boolean;
      try {
        jobDeleted = await jobRepository.deleteJob(id);
      } catch (caughtError) {
        if (removedPairs.length > 0 && (await jobRepository.getJob(id))) {
          await restorePairs(removedPairs);
        }
        throw caughtError;
      }
      if (
        !jobDeleted &&
        removedPairs.length > 0 &&
        (await jobRepository.getJob(id))
      ) {
        await restorePairs(removedPairs);
      }
      return jobDeleted;
    });
    if (deleted) {
      setJobs((current) => current.filter((job) => job.id !== id));
      await mediaRepository.deleteMediaForJob(id).catch((cleanupError) => {
        console.warn('Photo metadata cleanup did not fully complete.', cleanupError);
      });
      await mediaFileStorage.deleteJobMediaDirectory(id).catch((cleanupError) => {
        console.warn('Photo file cleanup did not fully complete.', cleanupError);
      });
    }
    return deleted;
  }, [deleteJobWithAssets, deletePairsForJob, refreshJobPairs, restorePairs]);

  const value = useMemo(
    () => ({
      jobs,
      loading,
      error,
      refresh,
      createJob,
      updateJob,
      archiveJob,
      restoreJob,
      deleteJob,
    }),
    [
      jobs,
      loading,
      error,
      refresh,
      createJob,
      updateJob,
      archiveJob,
      restoreJob,
      deleteJob,
    ],
  );

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs(): JobsContextValue {
  const context = useContext(JobsContext);
  if (!context) {
    throw new Error('useJobs must be used inside JobsProvider.');
  }
  return context;
}
