import { LoggerService } from '@nestjs/common';
import { utilities, WinstonModule, WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

export const winstonParams = (
  logErrorFile: string,
  logCombineLog: string,
  serviceName: string,
  level = 'info',
): WinstonModuleOptions => ({
  // TODO: left for custom logger
  // LoggerModule.forRoot({
  // options
  level: level,
  format: winston.format.json(),
  defaultMeta: { service: serviceName },
  transports: [
    // NestJS console like logs
    new winston.transports.Console({
      format: winston.format.combine(winston.format.timestamp(), utilities.format.nestLike()),
    }),
    // - Write all logs with level `error` and below to `error.log`
    new winston.transports.File({ filename: logErrorFile, level: 'error' }),
    // - Write all logs with level `info` and below to `combined.log`
    new winston.transports.File({ filename: logCombineLog }),
  ],
});

export const createLogger = (
  logErrorFile: string,
  logCombineLog: string,
  serviceName: string,
  level?: string,
): LoggerService => {
  return WinstonModule.createLogger(winstonParams(logErrorFile, serviceName, logCombineLog, level));
};
