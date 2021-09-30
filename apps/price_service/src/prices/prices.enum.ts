export enum PriceRangePeriod {
  day = 'day',
  week = 'week',
  month = 'month',
  year = 'year',
  all = 'all',
}

export const TimeframeFrequentlyInMin: Record<PriceRangePeriod, number> = {
  [PriceRangePeriod.day]: 5, // 5 minutes = 288
  [PriceRangePeriod.week]: 30, // 30 minutes = 336
  [PriceRangePeriod.month]: 120, // 2 hours = 360 as TimePeriodInDays.month = 30
  [PriceRangePeriod.year]: 1440, // 1 day = 365
  [PriceRangePeriod.all]: 1440, // 1 day = 365
};

export const TimePeriodInDays = {
  [PriceRangePeriod.day]: 1,
  [PriceRangePeriod.week]: 7,
  [PriceRangePeriod.month]: 30, // TODO: TBD
  [PriceRangePeriod.year]: 365,
  [PriceRangePeriod.all]: 365,
};
