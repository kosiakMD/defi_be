const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function retry<T = any>(
  action: () => Promise<T>,
  delayInMilliseconds: number = 1000,
  maxRetries: number = 3,
): Promise<T> {
  try {
    return await action();
  } catch (e) {
    if (maxRetries <= 0) {
      throw e;
    }
    await delay(delayInMilliseconds);
    return retry(action, delayInMilliseconds, maxRetries - 1);
  }
}