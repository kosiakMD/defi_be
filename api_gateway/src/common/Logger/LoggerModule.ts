import * as winston from 'winston';

import { DynamicModule, Global, LoggerService, Module } from '@nestjs/common';
import { WinstonModule as WinstonModule1 } from 'nest-winston';
import { WinstonLogger } from 'nest-winston/dist/winston.classes';
import { WinstonModuleOptions } from 'nest-winston/dist/winston.interfaces';

import { Logger } from './Logger.service';

@Global()
@Module({
  providers: [Logger],
  exports: [Logger],
})
export class LoggerModule extends WinstonModule1 {
  static forRoot(options: WinstonModuleOptions): DynamicModule {
    const returnObj = WinstonModule1.forRoot(options);
    returnObj.module = LoggerModule;
    return returnObj;
  }

  static createLogger(options: WinstonModuleOptions): LoggerService {
    return LoggerModule.createNestWinstonLogger(options);
  }

  static createNestWinstonLogger(loggerOpts): WinstonLogger {
    const logger = winston.createLogger(loggerOpts);
    return new Logger(logger);
  }
}
