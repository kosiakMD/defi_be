import * as bodyParser from 'body-parser';
import { install } from 'source-map-support';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { addTimeLogFeature } from '@app/common';
import { createLogger } from '@app/common/Logger/winston';

import { AppModule } from './app.module';
import { logFileDir } from './config';

const logger = createLogger(logFileDir);
install({ environment: 'node' /*, hookRequire: process.env.NODE_ENV === 'development' */ });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bodyParser: true,
    abortOnError: false,
    logger,
  });

  const enhancedLogger = addTimeLogFeature(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.useLogger(enhancedLogger);

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

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
