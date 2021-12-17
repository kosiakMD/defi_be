export const handlePromiseAllSettled = (promises) => {
  const data = [];
  const errors = [];
  promises.forEach((r) => {
    if (r.status === 'fulfilled') {
      data.push(r.value);
    } else {
      errors.push(r.reason.toString());
    }
  });

  return [data, errors];
}