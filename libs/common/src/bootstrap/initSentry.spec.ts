// import * as Sentry from '@sentry/node';
import * as Sentry from '@sentry/minimal';

import { initSentry } from './initSentry';

// arg sentryDSN for test reason only
const sentryDSN = 'https://d3623ec62dd14dbe81d0b82391c95d5d@o1128743.ingest.sentry.io/6171835';
initSentry(sentryDSN);

describe('Test Sentry', () => {
  const transaction = Sentry.startTransaction({
    op: 'test',
    name: 'My First Test Transaction',
  });

  const errMsg = 'Sentry Test log error';
  const exception = () => {
    throw errMsg;
  };

  it('Test Exception', () => {
    expect(exception).toThrowError(errMsg);
  });

  it('Send Sentry error', () => {
    setTimeout(() => {
      try {
        exception();
      } catch (e) {
        console.error(e);
        console.log(Sentry.captureException(e));
      } finally {
        console.log(transaction.finish());
      }
    }, 0);
  });
});
