import { splitToArray } from '@app/common/utils/string';

export function splitToNumberArray(value: string): number[] {
  return splitToArray(value).map(Number);
}

export function toChunkedArray<T>(array: T[], chunkSize: number): T[][] {
  const result = [];
  for (let i = 0, j = array.length; i < j; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
}
