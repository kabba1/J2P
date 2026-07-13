import {
  BeforeAfterPair,
  BeforeAfterPairCreateInput,
} from '@/types/pair';

export interface PairRepository {
  listPairsForJob(jobId: string): Promise<BeforeAfterPair[]>;
  getPair(id: string): Promise<BeforeAfterPair | undefined>;
  findPairForBefore(beforeMediaId: string): Promise<BeforeAfterPair | undefined>;
  findPairForAfter(afterMediaId: string): Promise<BeforeAfterPair | undefined>;
  createPair(input: BeforeAfterPairCreateInput): Promise<BeforeAfterPair>;
  replaceAfterMedia(id: string, afterMediaId: string): Promise<BeforeAfterPair | undefined>;
  deletePair(id: string): Promise<boolean>;
  deletePairsForMedia(mediaId: string): Promise<number>;
  deletePairsForJob(jobId: string): Promise<number>;
}
