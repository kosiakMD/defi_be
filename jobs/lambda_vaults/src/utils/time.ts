export function toUTCSeconds(ts: Date): number {
  const UTCSeconds = Date.UTC(
    ts.getFullYear(),
    ts.getMonth(),
    ts.getDate(),
    ts.getHours(),
    ts.getMinutes(),
    ts.getSeconds(),
  );
  return Number((UTCSeconds / 1000).toFixed(0));
}

export function isTimeToDo(pastTs: Date, seconds: number): boolean {
  // temporary disable pools update
  return false;
  if (!pastTs) {
    return true;
  }
  const pastUTCts = toUTCSeconds(pastTs);
  const currentUTCts = toUTCSeconds(new Date());
  return currentUTCts - pastUTCts > seconds;
}
