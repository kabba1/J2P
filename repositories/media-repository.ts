import {
  JobMedia,
  JobMediaCreateInput,
  JobMediaUpdateInput,
  MediaStage,
  MediaStageCounts,
} from '@/types/media';

export interface MediaRepository {
  listMediaForJob(jobId: string): Promise<JobMedia[]>;
  listMediaForStage(jobId: string, stage: MediaStage): Promise<JobMedia[]>;
  getMedia(id: string): Promise<JobMedia | undefined>;
  createMedia(input: JobMediaCreateInput): Promise<JobMedia>;
  updateMedia(id: string, input: JobMediaUpdateInput): Promise<JobMedia | undefined>;
  deleteMedia(id: string): Promise<boolean>;
  deleteMediaForJob(jobId: string): Promise<number>;
  countMediaByStage(jobId: string): Promise<MediaStageCounts>;
}
