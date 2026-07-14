import { Job } from '@/types/job';

export type JobStatusFilter = 'active' | 'archived' | 'all';

export type JobListFilterOptions = {
  status: JobStatusFilter;
  query: string;
};

function matchesStatus(job: Job, status: JobStatusFilter): boolean {
  if (status === 'all') {
    return true;
  }
  return status === 'archived'
    ? job.archivedAt !== undefined
    : job.archivedAt === undefined;
}

function matchesQuery(job: Job, normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return true;
  }

  return [job.name, job.customer, job.address, job.serviceType, job.notes].some(
    (value) => value?.toLocaleLowerCase().includes(normalizedQuery),
  );
}

export function filterJobs(
  jobs: readonly Job[],
  { status, query }: JobListFilterOptions,
): Job[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return jobs.filter(
    (job) => matchesStatus(job, status) && matchesQuery(job, normalizedQuery),
  );
}

function compareNewestCreated(left: Job, right: Job): number {
  const createdAtComparison = right.createdAt.localeCompare(left.createdAt);
  if (createdAtComparison !== 0) {
    return createdAtComparison;
  }
  return left.id.localeCompare(right.id);
}

export function selectMostRecentActiveJob(
  jobs: readonly Job[],
): Job | undefined {
  return jobs
    .filter((job) => job.archivedAt === undefined)
    .sort(compareNewestCreated)[0];
}
