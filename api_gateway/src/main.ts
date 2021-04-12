import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  WINSTON_MODULE_NEST_PROVIDER,
  WinstonModule,
  utilities as nestWinstonModuleUtilities,
} from 'nest-winston';
import * as winston from 'winston';

import { AppModule } from './app.module';
import { addTimeLogFeature } from './common/Logger/Logger.service';

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

  // TODO: adding time logs features [HACK]
  const logger = addTimeLogFeature(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // TODO: left for custom logger
  // app.useLogger(app.get(Logger));
  app.useLogger(logger);

  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('v1'); // temporary global as only 1 version

  const { SERVICE_NAME, PORT, HOST } = process.env;

  const config = new DocumentBuilder()
    .setTitle(SERVICE_NAME)
    .setDescription(`${SERVICE_NAME} service description`)
    .setVersion('1.0') // temporary global as only 1 version
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(PORT, HOST);
}

bootstrap();
