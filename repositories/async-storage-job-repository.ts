import AsyncStorage from '@react-native-async-storage/async-storage';

import { JobRepository } from '@/repositories/job-repository';
import { Job, JobInput, JobUpdateInput } from '@/types/job';

const STORAGE_KEY = '@jobtopost/jobs/v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isJob(value: unknown): value is Job {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isOptionalString(value.customer) &&
    isOptionalString(value.address) &&
    isOptionalString(value.serviceType) &&
    isOptionalString(value.notes) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    isCount(value.beforeCount) &&
    isCount(value.progressCount) &&
    isCount(value.afterCount)
  );
}

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function requireName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Job name is required.');
  }
  return trimmed;
}

function createId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readJobs(): Promise<Job[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Saved jobs are not in the expected format.');
  }

  return parsed.filter(isJob);
}

async function writeJobs(jobs: Job[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

export class AsyncStorageJobRepository implements JobRepository {
  async listJobs(): Promise<Job[]> {
    const jobs = await readJobs();
    return jobs.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getJob(id: string): Promise<Job | undefined> {
    const jobs = await readJobs();
    return jobs.find((job) => job.id === id);
  }

  async createJob(input: JobInput): Promise<Job> {
    const jobs = await readJobs();
    const timestamp = new Date().toISOString();
    const job: Job = {
      id: createId(),
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

    await writeJobs([job, ...jobs]);
    return job;
  }

  async updateJob(id: string, input: JobUpdateInput): Promise<Job | undefined> {
    const jobs = await readJobs();
    const index = jobs.findIndex((job) => job.id === id);
    if (index < 0) {
      return undefined;
    }

    const current = jobs[index];
    const updated: Job = {
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

    jobs[index] = updated;
    await writeJobs(jobs);
    return updated;
  }

  async deleteJob(id: string): Promise<boolean> {
    const jobs = await readJobs();
    const nextJobs = jobs.filter((job) => job.id !== id);
    if (nextJobs.length === jobs.length) {
      return false;
    }

    await writeJobs(nextJobs);
    return true;
  }
}

export const jobRepository: JobRepository = new AsyncStorageJobRepository();
