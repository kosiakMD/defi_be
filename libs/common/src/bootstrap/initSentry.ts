import * as Sentry from '@sentry/node';
// Importing @sentry/tracing patches the global hub for tracing to work.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as Tracing from '@sentry/tracing';

// arg sentryDSN for test reason only
export const initSentry = function (sentryDSN?: string): void {
  Sentry.init({
    dsn: sentryDSN || process.env.SENTRY_DSN, // will be read as config module use dotenv for sync .env reading

    // We recommend adjusting this value in production, or using tracesSampler
    // for finer control
    tracesSampleRate: 1.0,
  });
};
