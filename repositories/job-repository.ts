import { Job, JobInput, JobUpdateInput } from '@/types/job';

export interface JobRepository {
  listJobs(): Promise<Job[]>;
  getJob(id: string): Promise<Job | undefined>;
  createJob(input: JobInput): Promise<Job>;
  updateJob(id: string, input: JobUpdateInput): Promise<Job | undefined>;
  deleteJob(id: string): Promise<boolean>;
}
