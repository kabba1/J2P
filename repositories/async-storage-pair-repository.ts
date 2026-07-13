import AsyncStorage from '@react-native-async-storage/async-storage';

import { PairRepository } from '@/repositories/pair-repository';
import {
  BeforeAfterPair,
  BeforeAfterPairCreateInput,
} from '@/types/pair';

const STORAGE_KEY = '@jobtopost/before-after-pairs/v1';

type PairMetadataStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString() === value;
}

function isBeforeAfterPair(value: unknown): value is BeforeAfterPair {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.jobId) &&
    isNonEmptyString(value.beforeMediaId) &&
    isNonEmptyString(value.afterMediaId) &&
    value.beforeMediaId !== value.afterMediaId &&
    isIsoDate(value.createdAt) &&
    isIsoDate(value.updatedAt)
  );
}

function requireNonEmptyString(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  return trimmed;
}

function requireIsoDate(value: string, label: string): string {
  if (!isIsoDate(value)) {
    throw new Error(`${label} must be a valid date.`);
  }
  return value;
}

function validateCreateInput(input: BeforeAfterPairCreateInput): BeforeAfterPair {
  const timestamp = new Date().toISOString();
  const beforeMediaId = requireNonEmptyString(input.beforeMediaId, 'Before photo ID');
  const afterMediaId = requireNonEmptyString(input.afterMediaId, 'After photo ID');

  if (beforeMediaId === afterMediaId) {
    throw new Error('Before and After photos must be different photos.');
  }

  return {
    id: requireNonEmptyString(input.id, 'Pair ID'),
    jobId: requireNonEmptyString(input.jobId, 'Job ID'),
    beforeMediaId,
    afterMediaId,
    createdAt:
      input.createdAt === undefined
        ? timestamp
        : requireIsoDate(input.createdAt, 'Pair creation date'),
    updatedAt: timestamp,
  };
}

async function readPairs(storage: PairMetadataStorage): Promise<BeforeAfterPair[]> {
  const raw = await storage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Saved Before and After pair information could not be read.');
  }

  if (!Array.isArray(parsed) || !parsed.every(isBeforeAfterPair)) {
    throw new Error('Saved Before and After pair information is not in the expected format.');
  }

  const ids = new Set(parsed.map((pair) => pair.id));
  if (ids.size !== parsed.length) {
    throw new Error('Saved Before and After pair information contains duplicate IDs.');
  }

  const beforeMediaIds = new Set(parsed.map((pair) => pair.beforeMediaId));
  if (beforeMediaIds.size !== parsed.length) {
    throw new Error('A Before photo is assigned to more than one saved pair.');
  }

  const afterMediaIds = new Set(parsed.map((pair) => pair.afterMediaId));
  if (afterMediaIds.size !== parsed.length) {
    throw new Error('An After photo is assigned to more than one saved pair.');
  }

  return parsed;
}

async function writePairs(
  storage: PairMetadataStorage,
  pairs: BeforeAfterPair[],
): Promise<void> {
  await storage.setItem(STORAGE_KEY, JSON.stringify(pairs));
}

function sortNewestFirst(pairs: BeforeAfterPair[]): BeforeAfterPair[] {
  return [...pairs].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export class AsyncStoragePairRepository implements PairRepository {
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(private readonly storage: PairMetadataStorage = AsyncStorage) {}

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

  async listPairsForJob(jobId: string): Promise<BeforeAfterPair[]> {
    await this.waitForMutations();
    const validJobId = requireNonEmptyString(jobId, 'Job ID');
    const pairs = await readPairs(this.storage);
    return sortNewestFirst(pairs.filter((pair) => pair.jobId === validJobId));
  }

  async getPair(id: string): Promise<BeforeAfterPair | undefined> {
    await this.waitForMutations();
    const validId = requireNonEmptyString(id, 'Pair ID');
    const pairs = await readPairs(this.storage);
    return pairs.find((pair) => pair.id === validId);
  }

  async findPairForBefore(beforeMediaId: string): Promise<BeforeAfterPair | undefined> {
    await this.waitForMutations();
    const validBeforeMediaId = requireNonEmptyString(beforeMediaId, 'Before photo ID');
    const pairs = await readPairs(this.storage);
    return pairs.find((pair) => pair.beforeMediaId === validBeforeMediaId);
  }

  async findPairForAfter(afterMediaId: string): Promise<BeforeAfterPair | undefined> {
    await this.waitForMutations();
    const validAfterMediaId = requireNonEmptyString(afterMediaId, 'After photo ID');
    const pairs = await readPairs(this.storage);
    return pairs.find((pair) => pair.afterMediaId === validAfterMediaId);
  }

  createPair(input: BeforeAfterPairCreateInput): Promise<BeforeAfterPair> {
    return this.enqueueMutation(async () => {
      const pairs = await readPairs(this.storage);
      const created = validateCreateInput(input);

      if (pairs.some((pair) => pair.id === created.id)) {
        throw new Error('A Before and After pair with this ID already exists.');
      }
      if (pairs.some((pair) => pair.beforeMediaId === created.beforeMediaId)) {
        throw new Error('This Before photo already has a matched After photo.');
      }
      if (pairs.some((pair) => pair.afterMediaId === created.afterMediaId)) {
        throw new Error('This After photo is already assigned to another pair.');
      }

      await writePairs(this.storage, [created, ...pairs]);
      return created;
    });
  }

  replaceAfterMedia(
    id: string,
    afterMediaId: string,
  ): Promise<BeforeAfterPair | undefined> {
    return this.enqueueMutation(async () => {
      const validId = requireNonEmptyString(id, 'Pair ID');
      const validAfterMediaId = requireNonEmptyString(afterMediaId, 'After photo ID');
      const pairs = await readPairs(this.storage);
      const index = pairs.findIndex((pair) => pair.id === validId);
      if (index < 0) {
        return undefined;
      }

      const current = pairs[index];
      if (current.beforeMediaId === validAfterMediaId) {
        throw new Error('Before and After photos must be different photos.');
      }
      if (current.afterMediaId === validAfterMediaId) {
        return current;
      }
      if (
        pairs.some(
          (pair) => pair.id !== validId && pair.afterMediaId === validAfterMediaId,
        )
      ) {
        throw new Error('This After photo is already assigned to another pair.');
      }

      const updated: BeforeAfterPair = {
        ...current,
        afterMediaId: validAfterMediaId,
        updatedAt: new Date().toISOString(),
      };
      pairs[index] = updated;
      await writePairs(this.storage, pairs);
      return updated;
    });
  }

  deletePair(id: string): Promise<boolean> {
    return this.enqueueMutation(async () => {
      const validId = requireNonEmptyString(id, 'Pair ID');
      const pairs = await readPairs(this.storage);
      const nextPairs = pairs.filter((pair) => pair.id !== validId);
      if (nextPairs.length === pairs.length) {
        return false;
      }

      await writePairs(this.storage, nextPairs);
      return true;
    });
  }

  deletePairsForMedia(mediaId: string): Promise<number> {
    return this.enqueueMutation(async () => {
      const validMediaId = requireNonEmptyString(mediaId, 'Photo ID');
      const pairs = await readPairs(this.storage);
      const nextPairs = pairs.filter(
        (pair) =>
          pair.beforeMediaId !== validMediaId && pair.afterMediaId !== validMediaId,
      );
      const deletedCount = pairs.length - nextPairs.length;
      if (deletedCount > 0) {
        await writePairs(this.storage, nextPairs);
      }
      return deletedCount;
    });
  }

  deletePairsForJob(jobId: string): Promise<number> {
    return this.enqueueMutation(async () => {
      const validJobId = requireNonEmptyString(jobId, 'Job ID');
      const pairs = await readPairs(this.storage);
      const nextPairs = pairs.filter((pair) => pair.jobId !== validJobId);
      const deletedCount = pairs.length - nextPairs.length;
      if (deletedCount > 0) {
        await writePairs(this.storage, nextPairs);
      }
      return deletedCount;
    });
  }
}

export const pairRepository: PairRepository = new AsyncStoragePairRepository();
