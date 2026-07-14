export class KeyedOperationQueue {
  private readonly queues = new Map<string, Promise<void>>();

  run<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(key) ?? Promise.resolve();
    const result = previous.then(operation, operation);
    const barrier = result.then(
      () => undefined,
      () => undefined,
    );
    this.queues.set(key, barrier);
    void barrier.finally(() => {
      if (this.queues.get(key) === barrier) {
        this.queues.delete(key);
      }
    });
    return result;
  }
}
