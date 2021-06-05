export const emptyResult = (fromNum, toNum): string => {
  return `From ${fromNum} to ${toNum} blocks there are no log elements`;
};

export const successfulResult = (length): string => {
  return `Successfully saved to DB ${length} log elements`;
};

export const range = (start, stop, step): Array<number> =>
  Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);
