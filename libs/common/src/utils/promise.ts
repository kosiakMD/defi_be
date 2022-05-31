export async function getFulfilledPromises<T = any>(promises: Promise<T>[]): Promise<T[]> {
  const results = new Array<T>();

  for (const promise of await Promise.allSettled(promises)) {
    if (promise.status === 'fulfilled') {
      results.push(promise.value);
    }
  }

  return results;
}
