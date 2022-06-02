import { Logger as WinstonLoggerInterface } from 'winston';

import { Injectable, LoggerService, LoggerService as NestLoggerService } from '@nestjs/common';
import { WinstonLogger } from 'nest-winston';

export enum LogLevelEnum {
  error = 'error', // 0
  warn = 'warn', // 1
  info = 'info', // 2
  http = 'http', // 3
  verbose = 'verbose', // 4
  debug = 'debug', // 5
  silly = 'silly', // 6
}

export type LogMessage = Partial<{ message: string; level?: LogLevelEnum | number }>;

// @Injectable({ scope: Scope.REQUEST })
@Injectable()
export class Logger extends WinstonLogger implements NestLoggerService {
  static logger: WinstonLogger;
  // TODO: temporary need static for SingleTone
  private static times = new Map();
  private readonly times = new Map();

  constructor(logger: WinstonLoggerInterface) {
    super(logger);
  }

  static time(message: string): number {
    const start = new Date().getTime();
    Logger.times.set(message, start);
    return start;
  }

  static timeEnd(
    message: string | LogMessage,
    context?: string | Record<string, string | number>,
  ): number {
    const msg = (message as LogMessage)?.message || message;
    const start = Logger.times.get(msg);
    if (!start) {
      return Logger.logger.warn(`Timer ${msg} does not exist`);
    }
    const finish = new Date().getTime();
    Logger.times.delete(msg);
    const diff = finish - start;
    Logger.logger.debug(
      {
        ...(context as object),
        message: `${msg}: ${diff} ms (${diff / 1000} s)`,
      },
      'Time',
    );
    return diff;
  }

  public error(message: any, trace?: string, context?: string): any {
    // TODO: for all exception in the future
    return Logger.logger.error(message, trace, context);
  }

  public time(message: string): number {
    const start = new Date().getTime();
    this.times.set(message, start);
    return start;
  }

  public timeEnd(
    message: string | Partial<{ message: string }>,
    context?: string | Record<string, string | number>,
  ): number {
    const start = this.times.get(message);
    if (!start) {
      return this.warn(`Timer ${message} does not exist`);
    }
    const finish = new Date().getTime();
    this.times.delete(message);
    const diff = finish - start;
    super.debug('' + diff / 100 + context ? ` ${context}` : '', `Time: ${message}`);
    return diff;
  }
}

// TODO: temporary
export const addTimeLogFeature = (logger: WinstonLogger | LoggerService): Logger => {
  Object.assign(Logger, { logger: logger });
  Object.assign(logger, {
    time: Logger.time,
    timeEnd: Logger.timeEnd,
  });
  return logger as Logger;
};
