import * as Sentry from '@sentry/node';

// Importing @sentry/tracing patches the global hub for tracing to work.
// eslint-disable-next-line @typescript-eslint/no-unused-vars

// arg sentryDSN for test reason only
export const initSentry = function (sentryDSN?: string): void {
  Sentry.init({
    dsn: sentryDSN || process.env.SENTRY_DSN, // will be read as config module use dotenv for sync .env reading
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
