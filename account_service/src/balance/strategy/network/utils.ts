export function chunkArray<T extends any>(array: T[], chunkSize: number): T[][] {
  const arrayLength = array.length;
  const result: T[][] = [];

  for (let index = 0; index < arrayLength; index += chunkSize) {
    const myChunk = array.slice(index, index + chunkSize);
    result.push(myChunk);
  }

  return result;
}

export const insertAtPosition = <T extends any>(array: T[], index: number, newItem: T): T[] => [
  ...array.slice(0, index),
  newItem,
  ...array.slice(index),
];
