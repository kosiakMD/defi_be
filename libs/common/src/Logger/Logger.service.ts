import { Logger as WinstonLoggerInterface } from 'winston';

import { LoggerService, LoggerService as NestLoggerService } from '@nestjs/common';
import { WinstonLogger } from 'nest-winston';

// TODO: TBD?
// @Injectable({ scope: Scope.TRANSIENT })
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

  static timeEnd(message: string): number {
    const start = Logger.times.get(message);
    if (!start) {
      return Logger.logger.warn(`Timer ${message} does not exist`);
    }
    const finish = new Date().getTime();
    Logger.times.delete(message);
    const diff = finish - start;
    Logger.logger.debug(`${message}: ${diff} ms (${diff / 1000} s)`, 'Time');
    return diff;
  }

  public time(message: string): number {
    const start = new Date().getTime();
    this.times.set(message, start);
    return start;
  }

  public timeEnd(message: string): number {
    const start = this.times.get(message);
    if (!start) {
      return this.warn(`Timer ${message} does not exist`);
    }
    const finish = new Date().getTime();
    this.times.delete(message);
    const diff = finish - start;
    super.debug(diff / 100, `Time: ${message}`);
    // console.log(this.reflector.getAll());
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
