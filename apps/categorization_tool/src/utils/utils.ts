export function findSubText(string: string, find: string[]) {
  return find.some((word) => string?.includes(word));
}

export function nameFromUrl(url: string): string {
  return url.match(/^(?:https?:\/\/)?(?:www\.)?([^/]+)?(?:\.[a-z]){1,7}/)[1];
}
