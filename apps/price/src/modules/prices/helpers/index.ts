const secInMin = 60;
const minInHour = 60;
const hourInDay = 24;

export const getStepCount = (freqInMin: number, dayCount: number): number => {
  return (minInHour * hourInDay * dayCount) / freqInMin;
};

export const interpolation = (
  timestamp: number,
  stepInMinutes: number,
  stepsCount = 365,
): number[] => {
  const timestamps = [];
  for (let i = 0; i < stepsCount; i++) {
    timestamps.push(timestamp - i * stepInMinutes * secInMin);
  }
  return timestamps;
};
