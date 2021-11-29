export function chunk<T>(array: T[], num: number): T[][] {
  return array.reduce((results, item, index) => {
    const chunkIndex = Math.floor(index / num);
    results[chunkIndex] = [].concat(results[chunkIndex] || [], item);
    return results;
  }, []);
}
