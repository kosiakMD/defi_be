import os from 'os';
import * as winston from 'winston';
import CloudWatchTransport from 'winston-aws-cloudwatch';
import * as Transport from 'winston-transport';

import { LoggerService } from '@nestjs/common';
import { utilities, WinstonModule, WinstonModuleOptions } from 'nest-winston';

import { ensureDotEnvInitiated } from '../config/configuration';

type LogConfig = {
  logErrorFile: string;
  logCombineLog: string;
  serviceName: string;
  level?: string;
  meta?: Record<string, any>;
  env?: string;
  awsConfig: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
};

const formatLog = (item) =>
  item.message
    ? `${item.level}: ${item.message} ${JSON.stringify(item.meta)}`
    : `${item.level}: ${JSON.stringify(item.meta)}`;

export const winstonParams = ({
  logErrorFile,
  logCombineLog,
  serviceName,
  level = 'info',
  awsConfig,
  env,
  meta,
}: LogConfig): WinstonModuleOptions => ({
  level: level,
  format: winston.format.json(),
  defaultMeta: Object.assign({ service: serviceName }, meta),
  transports: [
    // NestJS console like logs
    new winston.transports.Console({
      format: winston.format.combine(winston.format.timestamp(), utilities.format.nestLike()),
    }),
    // - Write all logs with level `error` and below to `error.log`
    new winston.transports.File({ level: 'error', filename: logErrorFile }),
    // - Write all logs with level `info` and below to `combined.log`
    new winston.transports.File({ filename: logCombineLog }),
    new CloudWatchTransport({
      logGroupName: `dy-${env}-service/integrations`,
      logStreamName: `${os.hostname()}_${Date.now()}`,
      createLogGroup: true,
      createLogStream: true,
      submissionInterval: 2000,
      submissionRetryCount: 1,
      batchSize: 20,
      awsConfig,
      formatLog,
    }) as Transport,
  ],
});

export const createLogger = (): LoggerService => {
  // NOTE: We should use .env initialization for logger as config service is not yet available
  // We should have logger before config validation as otherwise we cannot log it to CW
  ensureDotEnvInitiated();

  const config: LogConfig = {
    logErrorFile: process.env.LOG_ERROR_FILE,
    logCombineLog: process.env.LOG_COMBINED_FILE,
    serviceName: process.env.SERVICE_NAME,
    level: process.env.LOG_LEVEL,
    env: process.env.NODE_ENV,
    meta: { env: process.env.ENV },
    awsConfig: {
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  };

  return WinstonModule.createLogger(winstonParams(config));
};
