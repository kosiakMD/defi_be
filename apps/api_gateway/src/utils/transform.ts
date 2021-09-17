export function splitToArray(value: string): string[] {
  if (!value) {
    return [];
  }

  return value.toLowerCase().split(',');
}

export function splitToNumberArray(value: string): number[] {
  return splitToArray(value).map((item) => Number(item));
}
