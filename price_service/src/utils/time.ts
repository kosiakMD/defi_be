export const SECONDS_IN_HOUR = 60 * 60;
export const SECONDS_IN_DAY = 24 * SECONDS_IN_HOUR;

export const timestampMsToSeconds = (ms: number) => Math.floor(ms / 1000);

export const timestampNow = (): number => timestampMsToSeconds(Date.now());
