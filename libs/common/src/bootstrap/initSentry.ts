import * as Sentry from '@sentry/node';

// Importing @sentry/tracing patches the global hub for tracing to work.
// eslint-disable-next-line @typescript-eslint/no-unused-vars

const TEST_SENTRY = false;
// arg sentryDSN for test reason only
export const initSentry = function (sentryDSN = process.env.SENTRY_DSN as string): void {
  if (!TEST_SENTRY || !sentryDSN) return;
  Sentry.init({
    dsn: sentryDSN,
    environment: process.env.NODE_ENV,
    serverName: process.env.SERVICE_NAME,
    attachStacktrace: true, // TODO: disable in prod
    normalizeDepth: 10, // TODO: reduce in prod
    debug: process.env.LOG_LEVEL === 'debug',
    // We recommend adjusting this value in production, or using tracesSampler
    // for finer control
    tracesSampleRate: 1.0,
  });
};
