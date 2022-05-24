import { AWSLambda } from '@sentry/serverless';
import { Handler } from 'aws-lambda/handler';

AWSLambda.init({
  // production only by default
  enabled:
    Boolean(process.env.SENTRY_ENABLED) ||
    process.env.NODE_ENV.toLocaleLowerCase() === 'production' ||
    process.env.NODE_ENV.toLocaleLowerCase() === 'staging',
  environment: process.env.NODE_ENV,
  debug:
    Boolean(process.env.SENTRY_DEBUG) || process.env.NODE_ENV.toLocaleLowerCase() !== 'production',
  dsn: process.env.SENTRY_DSN,
  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: Number(process.env.TRACER_RATE) || 1.0,
  // ignoreErrors: [],
  // transport?: TransportClass<Transport>;
});

const errorHandler = async function (lambdaHandler: Handler): Promise<Handler> {
  return AWSLambda.wrapHandler(
    async (event, context, callback) => await lambdaHandler(event, context, callback),
    {
      captureAllSettledReasons: true,
    },
  );
};

export default errorHandler;
