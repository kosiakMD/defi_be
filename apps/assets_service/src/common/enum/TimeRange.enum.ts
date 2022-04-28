const ONE_HOUR = 1000 * 60 * 60;

export enum TimeRange {
  'ONE_DAY' = ONE_HOUR * 24,
  '2_DAYS' = ONE_HOUR * 24 * 2,
  '7_DAYS' = ONE_HOUR * 24 * 7,
  '30_DAYS' = ONE_HOUR * 24 * 30,
}
