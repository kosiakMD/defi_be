import {
  utilities as nestWinstonModuleUtilities,
  WINSTON_MODULE_NEST_PROVIDER,
  WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bodyParser: false,
    logger: WinstonModule.createLogger({
      // TODO: for custom logger
      // logger: LoggerModule.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.json(),
      defaultMeta: { service: process.env.SERVICE_NAME },
      transports: [
        // NestJS console like logs
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            nestWinstonModuleUtilities.format.nestLike(),
          ),
        }),
      ],
    }),
  });

  app.enableShutdownHooks();

  const configService = app.get<ConfigService>(ConfigService);

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  app.setGlobalPrefix('v1'); // temporary global as only 1 version

  const port = configService.get<string>('SERVICE_PORT') || 3000;
  const host = configService.get<string>('SERVICE_HOST');
  await app.listen(port, host);
}

bootstrap();
