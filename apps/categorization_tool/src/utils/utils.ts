export function findSubText(string: string, find: string[]) {
  return find.some((word) => string?.includes(word));
}

export function nameFromUrl(url: string): string {
  return url.match(/^(?:https?:\/\/)?(?:www\.)?([^/]+)?(?:\.[a-z]){1,7}/)[1];
}

export function safeJsonParse(text: string): object | null {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

export function checkingGithubUrl(url: string): boolean {
  return url.match(/^http?(s)?([:])?([//]+)(?:www\.)?github\.\w{2,5}([/])([A-z\-_]+[/]?){1,2}?$/)
    ? true
    : false;
}
