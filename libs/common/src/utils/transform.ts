export function splitToArray(value: string): string[] {
  if (!value) {
    return [];
  }

  return value.toLowerCase().split(',');
}

export function splitToNumberArray(value: string): number[] {
  return splitToArray(value).map(Number);
}

export function toChunkedArray(array: any[], chunkSize: number): any[][] {
  // TODO: tet new approach, then delete older
  // return array.reduce((array, one, index) => {
  //   const chunk = Math.floor(index / chunkSize);
  //   array[chunk] = [].concat(array[chunk] || [], one);
  //   return array;
  // }, []);
  const result = [];
  for (let i = 0, j = array.length; i < j; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
}
