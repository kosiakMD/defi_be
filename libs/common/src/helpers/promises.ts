export const handlePromiseAllSettled = <T = any>(promiseResults): [T[], string[]] => {
  const data: T[] = [];
  const errors: string[] = [];
  promiseResults.forEach((r) => {
    if (r.status === 'fulfilled') {
      data.push(r.value);
    } else {
      errors.push(r.reason.toString());
    }
  });

  return [data, errors];
};
