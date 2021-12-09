export function chunk<T>(array: T[], num: number): T[][] {
  return array.reduce((results, item, index) => {
    const chunkIndex = Math.floor(index / num);
    results[chunkIndex] = [].concat(results[chunkIndex] || [], item);
    return results;
  }, []);
}

export const getUniqList = <T = string | number>(values: T[]): T[] => {
  return Array.from(new Set(values));
};

export function filterByEnum<T = Array<string | number>>(value: Array<T>, enumName: any): Array<T> {
  return value.filter((_) => enumName[_]);
}
