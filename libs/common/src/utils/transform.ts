export function splitToArray(value: string): string[] {
  if (!value) {
    return [];
  }

  return value.toLowerCase().split(',');
}

export function splitToNumberArray(value: string): number[] {
  return splitToArray(value).map((item) => Number(item));
}

export function toChunkedArray(array: any[], chunkSize: number): any[][] {
  return array.reduce((array, one, index) => {
    const chunk = Math.floor(index / chunkSize);
    array[chunk] = [].concat(array[chunk] || [], one);
    return array;
  }, []);
}
