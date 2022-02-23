function getTimeDifferenceInMs(start: Date, end: Date) {
  return end.getTime() - start.getTime();
}
export async function time(callback: (t?: () => number) => Promise<void>) {
  const start = new Date();
  const getTime = (): number => getTimeDifferenceInMs(start, new Date());
  return await callback(getTime);
}
