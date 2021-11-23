import os from 'os';
import * as winston from 'winston';
import CloudWatchTransport from 'winston-aws-cloudwatch';
import * as Transport from 'winston-transport';

import { LoggerService } from '@nestjs/common';
import { utilities, WinstonModule, WinstonModuleOptions } from 'nest-winston';

type LogConfig = {
  logErrorFile: string;
  logCombineLog: string;
  serviceName: string;
  level?: string;
  meta?: Record<string, any>;
  awsConfig: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
};

const formatLog = (item): string =>
  item.message
    ? `${item.level}: ${item.message} ${JSON.stringify(item.meta)}`
    : `${item.level}: ${JSON.stringify(item.meta)}`;

export const winstonParams = ({
  logErrorFile,
  logCombineLog,
  serviceName,
  level = 'info',
  awsConfig,
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
      logGroupName: 'services/safe-proxy',
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

export const createLogger = (config: LogConfig): LoggerService => {
  return WinstonModule.createLogger(winstonParams(config));
};
