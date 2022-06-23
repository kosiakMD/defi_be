type ObjectType<T> = T extends true ? Error : string;

export const handlePromiseAllSettled = <T = any, U extends boolean = false>(
  promiseResults: PromiseSettledResult<T>[],
  returnRawErrors?: U,
): [T[], ObjectType<U>[]] => {
  const data: T[] = [];
  const errors: ObjectType<U>[] = [];
  promiseResults.forEach((r) => {
    if (r.status === 'fulfilled') {
      data.push(r.value);
    } else {
      // TODO: This looses all stack traces, and sometimes serializes errors as '[Object object]'
      if (!returnRawErrors) {
        errors.push(r.reason.toString());
      } else {
        errors.push(r.reason);
      }
    }
  });

  return [data, errors];
};
