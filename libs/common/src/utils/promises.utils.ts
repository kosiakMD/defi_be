type Callback<R = any> = (any: R) => void;

export const eachPromiseAllSettled = <Result = any, Reason = Error | string>(
  resolvedProtocols: PromiseSettledResult<any>[],
  callbackFulfilled: Callback<Result>,
  callbackRejected: Callback<Reason>,
) => {
  resolvedProtocols.forEach((data) => {
    if (data.status === 'fulfilled') {
      callbackFulfilled(data.value);
    } else {
      callbackRejected(data.reason);
    }
  });
};
