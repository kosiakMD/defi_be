export const SECONDS_IN_DAY = 86400;

export function getCurrentDate(): string {
  return new Date() //
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
}
