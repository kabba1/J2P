export type AfterQueuePrimaryActionKind =
  | 'add-before'
  | 'start-next'
  | 'view-pair'
  | 'unavailable';

export type AfterQueuePrimaryAction = {
  kind: AfterQueuePrimaryActionKind;
  label: string;
  disabled: boolean;
};

type AfterQueuePrimaryActionInput = {
  total: number;
  remaining: number;
  hasNextUnmatched: boolean;
  hasSavedPair: boolean;
};

type CreatedRecord = {
  createdAt: string;
};

export function selectLatestPair<T extends CreatedRecord>(pairs: readonly T[]): T | undefined {
  return pairs.reduce<T | undefined>(
    (latest, pair) => (!latest || pair.createdAt > latest.createdAt ? pair : latest),
    undefined,
  );
}

export function getAfterQueuePrimaryAction({
  total,
  remaining,
  hasNextUnmatched,
  hasSavedPair,
}: AfterQueuePrimaryActionInput): AfterQueuePrimaryAction {
  if (total <= 0) {
    return {
      kind: 'add-before',
      label: 'Add Before Photos',
      disabled: false,
    };
  }

  if (remaining <= 0 && hasSavedPair) {
    return {
      kind: 'view-pair',
      label: 'View Latest Before & After',
      disabled: false,
    };
  }

  if (hasNextUnmatched) {
    return {
      kind: 'start-next',
      label: 'Start Next After Shot',
      disabled: false,
    };
  }

  return {
    kind: 'unavailable',
    label: 'After Shot Unavailable',
    disabled: true,
  };
}
