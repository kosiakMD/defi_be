export function filterByEnum<T = Array<string | number>>(value: Array<T>, enumName: any): Array<T> {
  return value.filter((_) => enumName[_]);
}

export const getUniqList = <T = string | number>(values: T[]): T[] => {
  return Array.from(new Set(values));
};
