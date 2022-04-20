import { RewriteFrames } from '@sentry/integrations';
import * as Sentry from '@sentry/node';

// This allows TypeScript to detect our global value
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace NodeJS {
    interface Global {
      __rootdir__: string;
    }
  }
}

// eslint-disable-next-line no-underscore-dangle
global.__rootdir__ = __dirname || process.cwd();

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
    integrations: [
      new RewriteFrames({
        // eslint-disable-next-line no-underscore-dangle
        root: global.__rootdir__,
      }),
    ],
    // We recommend adjusting this value in production, or using tracesSampler
    // for finer control
    tracesSampleRate: 1.0,
  });
};
