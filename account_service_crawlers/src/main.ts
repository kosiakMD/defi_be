import {
  WINSTON_MODULE_NEST_PROVIDER,
  WinstonModule,
  utilities as nestWinstonModuleUtilities,
} from 'nest-winston';
import * as winston from 'winston';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('v1'); // temporary global as only 1 version

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  app.useLogger(logger);

  const { NODE_ENV, SERVICE_NAME, SERVICE_PORT, SERVICE_HOST } = process.env;

  if (NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle(SERVICE_NAME)
      .setDescription(`${SERVICE_NAME} service description`)
      .setVersion('1.0') // temporary global as only 1 version
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  await app.listen(SERVICE_PORT, SERVICE_HOST);
}

bootstrap();
