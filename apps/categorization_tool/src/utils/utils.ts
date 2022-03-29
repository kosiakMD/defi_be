export function findSubText(string: string, find: string[]) {
  return find.some((word) => string?.includes(word));
}
