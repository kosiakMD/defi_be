import { hostname } from 'os';
import { join } from 'path';
import * as winston from 'winston';
import CloudWatchTransport from 'winston-aws-cloudwatch';
import * as Transport from 'winston-transport';

import { LoggerService } from '@nestjs/common';
import { utilities, WinstonModule, WinstonModuleOptions } from 'nest-winston';

import { EnvEnum } from '@app/common';

import { ensureDotEnvInitiated } from '../config/configuration';

const AWS_CW_LOGS_ENVIRONMENTS: EnvEnum[] = [EnvEnum.development, EnvEnum.production];

export type LogConfig = {
  identifier: string;
  logErrorFile: string;
  logCombineLog: string;
  serviceName: string;
  environment: EnvEnum;
  level?: string;
  defaultMeta?: Record<string, any>;
  awsConfig: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
};

const formatLog = (item) => {
  // return JSON.stringify({ ...item, level: 'test' }); // for tests reason
  return JSON.stringify(item);
};

const createBaseTransports = (logErrorFile: string, logCombineLog: string): Transport[] => {
  return [
    // NestJS console like logs
    new winston.transports.Console({
      format: winston.format.combine(winston.format.timestamp(), utilities.format.nestLike()),
    }),
    // - Write all logs with level `error` and below to `error.log`
    new winston.transports.File({ level: 'error', filename: logErrorFile }),
    // - Write all logs with level `info` and below to `combined.log`
    new winston.transports.File({ filename: logCombineLog }),
  ];
};

export const winstonParams = ({
  identifier,
  logErrorFile,
  logCombineLog,
  serviceName,
  environment,
  level = 'info',
  awsConfig,
  defaultMeta,
}: LogConfig): WinstonModuleOptions => {
  const transports: Transport[] = createBaseTransports(logErrorFile, logCombineLog);

  if (AWS_CW_LOGS_ENVIRONMENTS.includes(environment)) {
    transports.push(
      new CloudWatchTransport({
        logGroupName: `dy-${environment}-service/${identifier}`,
        logStreamName: `${hostname()}_${Date.now()}`,
        createLogGroup: true,
        createLogStream: true,
        submissionInterval: 2000,
        submissionRetryCount: 1,
        batchSize: 20,
        awsConfig,
        formatLog,
      }) as Transport,
    );
  }

  return {
    level: level,
    format: winston.format.json(),
    defaultMeta: Object.assign({ service: serviceName }, defaultMeta),
    transports,
  };
};

export const createLogger = (workFolder: string): LoggerService => {
  // NOTE: We should use .env initialization for logger as config service is not yet available
  // We should have logger before config validation as otherwise we cannot log it to CW
  ensureDotEnvInitiated(workFolder);

  const config: LogConfig = {
    identifier: process.env.IDENTIFIER,
    logErrorFile: join(workFolder, process.env.LOG_ERROR_FILE),
    logCombineLog: join(workFolder, process.env.LOG_COMBINED_FILE),
    serviceName: process.env.SERVICE_NAME,
    level: process.env.LOG_LEVEL,
    environment: process.env.NODE_ENV as EnvEnum,
    defaultMeta: { env: process.env.ENV, service: process.env.SERVICE_NAME },
    awsConfig: {
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  };

  return WinstonModule.createLogger(winstonParams(config));
};

export const createJobLogger = (workFolder: string): LoggerService => {
  // NOTE: We should use .env initialization for logger as config service is not yet available
  // We should have logger before config validation as otherwise we cannot log it to CW
  ensureDotEnvInitiated(workFolder);

  const logErrorFile = join(workFolder, process.env.LOG_ERROR_FILE);
  const logCombineLog = join(workFolder, process.env.LOG_COMBINED_FILE);
  const transports = createBaseTransports(logErrorFile, logCombineLog);

  return WinstonModule.createLogger({
    // TODO: for custom logger
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.json(),
    defaultMeta: { env: process.env.ENV, service: process.env.SERVICE_NAME },
    transports: transports,
  });
};
