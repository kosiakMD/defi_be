import * as winston from 'winston';

import { DynamicModule, Global, LoggerService, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { WinstonLogger } from 'nest-winston/dist/winston.classes';
import { WinstonModuleOptions } from 'nest-winston/dist/winston.interfaces';

import { LogRequestMiddleware } from '@app/common/middlewares';

import { Logger } from './Logger.service';

@Global()
@Module({
  providers: [Logger, LogRequestMiddleware],
  exports: [Logger],
})
export class LoggerModule extends WinstonModule {
  static forRoot(options: WinstonModuleOptions): DynamicModule {
    const returnObj = WinstonModule.forRoot(options);
    returnObj.module = LoggerModule;
    return returnObj;
  }

  static createLogger(options: WinstonModuleOptions): LoggerService {
    return LoggerModule.createNestWinstonLogger(options);
  }

  static createNestWinstonLogger(loggerOpts): WinstonLogger {
    const logger = winston.createLogger(loggerOpts);
    return new Logger(logger, null);
  }
}
