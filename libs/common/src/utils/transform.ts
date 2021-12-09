// TODO: could be validation added
export function splitToArray(value: string, toLowerCase = true): string[] {
  if (!value) {
    return [];
  }

  return toLowerCase ? value.toLowerCase().split(',') : value.split(',');
}

export function splitToNumberArray(value: string): number[] {
  return splitToArray(value).map(Number);
}

export function toChunkedArray(array: any[], chunkSize: number): any[][] {
  const result = [];
  for (let i = 0, j = array.length; i < j; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
}
