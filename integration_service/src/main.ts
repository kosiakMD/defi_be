import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { install } from 'source-map-support';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { addTimeLogFeature } from './Logger/Logger.service';
import { AppModule } from './app.module';

install({ environment: 'node' /*, hookRequire: process.env.NODE_ENV === 'development' */ });

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bodyParser: false,
    logger: true,
  });

  app.enableShutdownHooks();

  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('v1'); // temporary global as only 1 version

  const logger = addTimeLogFeature(app.get(WINSTON_MODULE_NEST_PROVIDER));

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
