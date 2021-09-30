import { PriceRangePeriod, TimeframeFrequentlyInMin, TimePeriodInDays } from '../prices.enum';
import { getStepCount, interpolation } from './index';

describe('Price Helpers', () => {
  const tests = {
    [PriceRangePeriod.day]: 288,
    [PriceRangePeriod.week]: 336,
    [PriceRangePeriod.month]: 360,
    [PriceRangePeriod.year]: 365,
    [PriceRangePeriod.all]: 365,
  };

  describe('getStepCount', () => {
    for (const range in PriceRangePeriod) {
      const freqInMin = Number(TimeframeFrequentlyInMin[range]);
      const dayCount = Number(TimePeriodInDays[range]);
      test(`count for '${range}' should be equal ${tests[range]}`, () => {
        const stepsCount = getStepCount(freqInMin, dayCount);
        console.log('result', stepsCount);
        expect(stepsCount).toEqual(tests[range]);
      });
    }
  });

  describe('interpolation', () => {
    const timestamp = 600;
    const step = 1;
    const stepCount = 10;
    const result = interpolation(timestamp, step, stepCount);
    console.log('result', result);
    test(`interpolation ${timestamp}, ${step}, ${stepCount}`, () => {
      expect(result).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((x) => x * 60));
    });
    const timestamp2 = 1630510700;
    const step2 = TimeframeFrequentlyInMin[PriceRangePeriod.day]; // 5
    const result2 = interpolation(timestamp2, step2, stepCount);
    console.log('result', result2);
    test(`interpolation ${timestamp2}, ${step2}, ${stepCount}`, () => {
      expect(result2).toEqual([
        1630510700, 1630510400, 1630510100, 1630509800, 1630509500, 1630509200, 1630508900,
        1630508600, 1630508300, 1630508000,
      ]);
    });
    const timestamp3 = 1630510700;
    const step3 = TimeframeFrequentlyInMin[PriceRangePeriod.week]; // 30
    const result3 = interpolation(timestamp3, step3, stepCount);
    console.log('result', result3);
    test(`interpolation ${timestamp3}, ${step3}, ${stepCount}`, () => {
      expect(result3).toEqual([
        1630510700, 1630508900, 1630507100, 1630505300, 1630503500, 1630501700, 1630499900,
        1630498100, 1630496300, 1630494500,
      ]);
    });
  });
});
