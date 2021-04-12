export const timestampMsToSeconds = (ms: number) => Math.floor(ms / 1000);

export const timestampOfDate = (date: Date): number => timestampMsToSeconds(date.getTime());

export const timestampNow = (): number => timestampMsToSeconds(Date.now());

export const timestampToHourDate = (timestamp: number): Date => {
	const timestampDate = new Date(timestamp * 1000);
	return new Date(
		timestampDate.getFullYear(),
		timestampDate.getMonth(),
		timestampDate.getDate(),
		timestampDate.getHours(),
	);
};

export const getStartDayOfTimestamp = (timestamp: number) => {
	const timestampDate = new Date(timestamp * 1000);
	return new Date(timestampDate.getFullYear(), timestampDate.getMonth(), timestampDate.getDate());
};

export const getNextDayOfDate = (date: Date) => {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
};

export const getNextDayOfTimestamp = (timestamp: number) => {
	const timestampDate = new Date(timestamp * 1000);
	return getNextDayOfDate(timestampDate);
};

/**
 * @param timestamp in seconds
 * @return number
 */
export const getStartOfTheDayTimestamp = (timestamp?: number): number => {
	const dateOfTimestamp = new Date(timestamp * 1000);
	const startOfTheDayTimestamp = timestamp
		? new Date(
				Date.UTC(
					dateOfTimestamp.getFullYear(),
					dateOfTimestamp.getMonth(),
					dateOfTimestamp.getDate(),
					0,
					0,
				),
		  ).getTime()
		: new Date().setUTCHours(0, 0, 0, 0);
	return timestampMsToSeconds(startOfTheDayTimestamp);
};

export const getNextDayStart = (ts: number, day = 0) => {
	const secondsInDay = 86400;
	const dayId = Math.round(ts / secondsInDay);
	return (dayId + day) * secondsInDay;
};
