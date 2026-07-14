import AsyncStorage from '@react-native-async-storage/async-storage';

import { JobRepository } from '@/repositories/job-repository';
import { Job, JobInput, JobUpdateInput } from '@/types/job';

const STORAGE_KEY = '@jobtopost/jobs/v1';
const SAFE_JOB_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

type JobMetadataStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function isSafeJobId(value: unknown): value is string {
  return isNonEmptyString(value) && SAFE_JOB_ID.test(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isNonEmptyString(value);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString() === value;
}

function isOptionalIsoDate(value: unknown): value is string | undefined {
  return value === undefined || isIsoDate(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isJob(value: unknown): value is Job {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isSafeJobId(value.id) &&
    isNonEmptyString(value.name) &&
    isOptionalString(value.customer) &&
    isOptionalString(value.address) &&
    isOptionalString(value.serviceType) &&
    isOptionalString(value.notes) &&
    isOptionalIsoDate(value.archivedAt) &&
    isIsoDate(value.createdAt) &&
    isIsoDate(value.updatedAt) &&
    isCount(value.beforeCount) &&
    isCount(value.progressCount) &&
    isCount(value.afterCount)
  );
}

function requireNonEmptyString(value: string, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be plain text.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  return trimmed;
}

function requireJobId(value: string): string {
  const trimmed = requireNonEmptyString(value, 'Job ID');
  if (!SAFE_JOB_ID.test(trimmed)) {
    throw new Error('Job ID contains characters that cannot be used for local storage.');
  }
  return trimmed;
}

function trimOptional(value: string | undefined): string | undefined {
  if (value !== undefined && typeof value !== 'string') {
    throw new Error('Optional job details must be plain text.');
  }
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function requireName(value: string): string {
  return requireNonEmptyString(value, 'Job name');
}

function createId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readJobs(storage: JobMetadataStorage): Promise<Job[]> {
  const raw = await storage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Saved job information could not be read.');
  }

  if (!Array.isArray(parsed) || !parsed.every(isJob)) {
    throw new Error('Saved job information is not in the expected format.');
  }

  const ids = new Set(parsed.map((job) => job.id));
  if (ids.size !== parsed.length) {
    throw new Error('Saved job information contains duplicate IDs.');
  }

  return parsed;
}

async function writeJobs(
  storage: JobMetadataStorage,
  jobs: Job[],
): Promise<void> {
  await storage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

function sortNewestFirst(jobs: Job[]): Job[] {
  return [...jobs].sort((left, right) => {
    const createdAtComparison = right.createdAt.localeCompare(left.createdAt);
    return createdAtComparison || left.id.localeCompare(right.id);
  });
}

function applyUpdate(current: Job, input: JobUpdateInput): Job {
  return {
    ...current,
    name: input.name === undefined ? current.name : requireName(input.name),
    customer:
      input.customer === undefined ? current.customer : trimOptional(input.customer),
    address: input.address === undefined ? current.address : trimOptional(input.address),
    serviceType:
      input.serviceType === undefined
        ? current.serviceType
        : trimOptional(input.serviceType),
    notes: input.notes === undefined ? current.notes : trimOptional(input.notes),
    updatedAt: new Date().toISOString(),
  };
}

export class AsyncStorageJobRepository implements JobRepository {
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(private readonly storage: JobMetadataStorage = AsyncStorage) {}

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

  async listJobs(): Promise<Job[]> {
    await this.waitForMutations();
    return sortNewestFirst(await readJobs(this.storage));
  }

  async getJob(id: string): Promise<Job | undefined> {
    await this.waitForMutations();
    const validId = requireJobId(id);
    const jobs = await readJobs(this.storage);
    return jobs.find((job) => job.id === validId);
  }

  createJob(input: JobInput): Promise<Job> {
    return this.enqueueMutation(async () => {
      const jobs = await readJobs(this.storage);
      const timestamp = new Date().toISOString();
      let id = createId();
      while (jobs.some((job) => job.id === id)) {
        id = createId();
      }
      const job: Job = {
        id,
        name: requireName(input.name),
        customer: trimOptional(input.customer),
        address: trimOptional(input.address),
        serviceType: trimOptional(input.serviceType),
        notes: trimOptional(input.notes),
        createdAt: timestamp,
        updatedAt: timestamp,
        beforeCount: 0,
        progressCount: 0,
        afterCount: 0,
      };

      await writeJobs(this.storage, [job, ...jobs]);
      return job;
    });
  }

  updateJob(id: string, input: JobUpdateInput): Promise<Job | undefined> {
    return this.enqueueMutation(async () => {
      const validId = requireJobId(id);
      const jobs = await readJobs(this.storage);
      const index = jobs.findIndex((job) => job.id === validId);
      if (index < 0) {
        return undefined;
      }

      const updated = applyUpdate(jobs[index], input);
      jobs[index] = updated;
      await writeJobs(this.storage, jobs);
      return updated;
    });
  }

  archiveJob(id: string): Promise<Job | undefined> {
    return this.enqueueMutation(async () => {
      const validId = requireJobId(id);
      const jobs = await readJobs(this.storage);
      const index = jobs.findIndex((job) => job.id === validId);
      if (index < 0) {
        return undefined;
      }

      const current = jobs[index];
      if (current.archivedAt !== undefined) {
        return current;
      }

      const timestamp = new Date().toISOString();
      const archived: Job = {
        ...current,
        archivedAt: timestamp,
        updatedAt: timestamp,
      };
      jobs[index] = archived;
      await writeJobs(this.storage, jobs);
      return archived;
    });
  }

  restoreJob(id: string): Promise<Job | undefined> {
    return this.enqueueMutation(async () => {
      const validId = requireJobId(id);
      const jobs = await readJobs(this.storage);
      const index = jobs.findIndex((job) => job.id === validId);
      if (index < 0) {
        return undefined;
      }

      const current = jobs[index];
      if (current.archivedAt === undefined) {
        return current;
      }

      const { archivedAt: _archivedAt, ...active } = current;
      const restored: Job = {
        ...active,
        updatedAt: new Date().toISOString(),
      };
      jobs[index] = restored;
      await writeJobs(this.storage, jobs);
      return restored;
    });
  }

  deleteJob(id: string): Promise<boolean> {
    return this.enqueueMutation(async () => {
      const validId = requireJobId(id);
      const jobs = await readJobs(this.storage);
      const nextJobs = jobs.filter((job) => job.id !== validId);
      if (nextJobs.length === jobs.length) {
        return false;
      }

      await writeJobs(this.storage, nextJobs);
      return true;
    });
  }
}

export const jobRepository: JobRepository = new AsyncStorageJobRepository();
