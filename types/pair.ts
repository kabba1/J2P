export type BeforeAfterPair = {
  id: string;
  jobId: string;
  beforeMediaId: string;
  afterMediaId: string;
  createdAt: string;
  updatedAt: string;
};

export type BeforeAfterPairCreateInput = Omit<
  BeforeAfterPair,
  'createdAt' | 'updatedAt'
> & {
  createdAt?: string;
};

export type BeforeAfterPairUpdateInput = {
  afterMediaId: string;
};

export function createPairId(): string {
  return `pair-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
