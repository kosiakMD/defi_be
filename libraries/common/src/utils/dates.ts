export function roundToNearestHour(date: Date): Date {
  date.setHours(date.getHours() + Math.round(date.getMinutes() / 60));
  date.setMinutes(0, 0, 0);
  return date;
}

export function dateToTimestamp(date: Date): number {
  return (date.getTime() / 1000) >> 0;
}
