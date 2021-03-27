export const minBy = <T>(array: T[], lambda: (item: T) => number): T => {
	if (!array || !array.length) {
		return undefined;
	}

	let lambdaFn;
	if (typeof lambda === 'function') {
		lambdaFn = lambda;
	} else {
		lambdaFn = function (arg) {
			return arg[lambda];
		};
	}
	const mapped = array.map(lambdaFn);
	// TODO: fix
	// eslint-disable-next-line prefer-spread
	const minValue = Math.min.apply(Math, mapped);
	return array[mapped.indexOf(minValue)];
};
