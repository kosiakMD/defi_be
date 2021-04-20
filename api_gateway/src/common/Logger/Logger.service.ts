import { LoggerService, LoggerService as NestLoggerService } from '@nestjs/common';
import { WinstonLogger } from 'nest-winston';
import { Logger as WinstonLoggerInterface } from 'winston';

// TODO: TBD?
// @Injectable({ scope: Scope.TRANSIENT })
export class Logger extends WinstonLogger implements NestLoggerService {
  // TODO: temporary need static for SingleTone
  private static times = new Map();
  static logger: WinstonLogger;

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
    Logger.logger.log(`${message}: ${diff / 100} ms`, 'Time');
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
    super.log(diff / 100, `Time: ${message}`);
    return diff;
  }
}

// TODO: temporary
export const addTimeLogFeature = (logger: WinstonLogger | LoggerService): Logger => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  Logger.logger = logger;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  logger.time = Logger.time;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  logger.timeEnd = Logger.timeEnd;

  return logger as Logger;
};
