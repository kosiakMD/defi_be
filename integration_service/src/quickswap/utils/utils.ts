export function toChunkedArray(array: any[], chunkSize: number): any[][] {
  return array.reduce((array, one, index) => {
    const chunk = Math.floor(index / chunkSize);
    array[chunk] = [].concat(array[chunk] || [], one);
    return array;
  }, []);
}
