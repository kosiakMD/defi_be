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

export const notEmpty = <T = any>(arr): T[] => arr.filter((x) => x);

export async function chunkRunAsync<T, R>(
  array: T[],
  chunkSize: number,
  func: (input: T[]) => Promise<R>,
) {
  const responses: R[] = [];
  for (let index = 0; index < array.length; index += chunkSize) {
    const chunk = array.slice(index, index + chunkSize);
    const response = await func(chunk);
    responses.push(response);
  }
  return responses.flat();
}

export function first(array) {
  return array[0];
}

export function second(array) {
  return array[1];
}
