import { mediaRepository } from '@/repositories/async-storage-media-repository';
import { pairRepository } from '@/repositories/async-storage-pair-repository';
import { MediaRepository } from '@/repositories/media-repository';
import { PairRepository } from '@/repositories/pair-repository';
import { BeforeAfterPair, createPairId } from '@/types/pair';

export type CreateBeforeAfterPairInput = {
  jobId: string;
  beforeMediaId: string;
  afterMediaId: string;
};

export interface PairingService {
  createPair(input: CreateBeforeAfterPairInput): Promise<BeforeAfterPair>;
  replaceAfterMedia(
    pairId: string,
    afterMediaId: string,
  ): Promise<BeforeAfterPair | undefined>;
}

function requireNonEmptyString(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  return trimmed;
}

export class LocalPairingService implements PairingService {
  constructor(
    private readonly media: MediaRepository = mediaRepository,
    private readonly pairs: PairRepository = pairRepository,
  ) {}

  async createPair(input: CreateBeforeAfterPairInput): Promise<BeforeAfterPair> {
    const jobId = requireNonEmptyString(input.jobId, 'Job ID');
    const beforeMediaId = requireNonEmptyString(input.beforeMediaId, 'Before photo ID');
    const afterMediaId = requireNonEmptyString(input.afterMediaId, 'After photo ID');
    const [before, after] = await Promise.all([
      this.media.getMedia(beforeMediaId),
      this.media.getMedia(afterMediaId),
    ]);

    if (!before) {
      throw new Error('The selected Before photo no longer exists.');
    }
    if (!after) {
      throw new Error('The captured After photo no longer exists.');
    }
    if (before.jobId !== jobId || after.jobId !== jobId || before.jobId !== after.jobId) {
      throw new Error('Before and After photos must belong to the same job.');
    }
    if (before.stage !== 'before') {
      throw new Error('The selected Before photo is no longer in the Before stage.');
    }
    if (after.stage !== 'after') {
      throw new Error('The matched photo must be saved in the After stage.');
    }

    const [existingBeforePair, existingAfterPair] = await Promise.all([
      this.pairs.findPairForBefore(beforeMediaId),
      this.pairs.findPairForAfter(afterMediaId),
    ]);
    if (existingBeforePair) {
      throw new Error('This Before photo already has a matched After photo.');
    }
    if (existingAfterPair) {
      throw new Error('This After photo is already assigned to another pair.');
    }

    return this.pairs.createPair({
      id: createPairId(),
      jobId,
      beforeMediaId,
      afterMediaId,
    });
  }

  async replaceAfterMedia(
    pairId: string,
    afterMediaId: string,
  ): Promise<BeforeAfterPair | undefined> {
    const validPairId = requireNonEmptyString(pairId, 'Pair ID');
    const validAfterMediaId = requireNonEmptyString(afterMediaId, 'After photo ID');
    const current = await this.pairs.getPair(validPairId);
    if (!current) {
      return undefined;
    }

    const [before, after] = await Promise.all([
      this.media.getMedia(current.beforeMediaId),
      this.media.getMedia(validAfterMediaId),
    ]);
    if (!before) {
      throw new Error('The paired Before photo no longer exists.');
    }
    if (!after) {
      throw new Error('The replacement After photo no longer exists.');
    }
    if (
      before.jobId !== current.jobId ||
      after.jobId !== current.jobId ||
      before.jobId !== after.jobId
    ) {
      throw new Error('Before and After photos must belong to the same job.');
    }
    if (before.stage !== 'before') {
      throw new Error('The paired Before photo is no longer in the Before stage.');
    }
    if (after.stage !== 'after') {
      throw new Error('The replacement photo must be saved in the After stage.');
    }

    const existingAfterPair = await this.pairs.findPairForAfter(validAfterMediaId);
    if (existingAfterPair && existingAfterPair.id !== validPairId) {
      throw new Error('This After photo is already assigned to another pair.');
    }

    return this.pairs.replaceAfterMedia(validPairId, validAfterMediaId);
  }
}

export const pairingService: PairingService = new LocalPairingService();
