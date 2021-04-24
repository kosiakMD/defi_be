import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { addTimeLogFeature } from './Logger/Logger.service';
import { AppModule } from './app.module';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bodyParser: false,
    logger: true,
  });
  // TODO: adding time logs features [HACK]
  const enhancedLogger = addTimeLogFeature(app.get(WINSTON_MODULE_NEST_PROVIDER));
  // TODO: left for custom logger
  // app.useLogger(app.get(Logger));
  app.useLogger(enhancedLogger);

  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('v1'); // temporary global as only 1 version

  const { SERVICE_NAME, SERVICE_PORT, SERVICE_HOST } = process.env;

  const config = new DocumentBuilder()
    .setTitle(SERVICE_NAME)
    .setDescription(`${SERVICE_NAME} service description`)
    .setVersion('1.0') // temporary global as only 1 version
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(SERVICE_PORT, SERVICE_HOST);
}

bootstrap();
