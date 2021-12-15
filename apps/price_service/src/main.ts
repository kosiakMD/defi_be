import { json, urlencoded } from 'express';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { addTimeLogFeature } from '@app/common/Logger/Logger.service';
import { createLogger } from '@app/common/Logger/winston';

import { AppModule } from './app.module';
import { logFileDir } from './config';

const logger = createLogger(logFileDir);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    abortOnError: false,
    logger: logger,
  });

  const enhancedLogger = addTimeLogFeature(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.useLogger(enhancedLogger);

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const configService = app.get<ConfigService>(ConfigService);

  app.use(json({ limit: configService.get<string>('BODY_LIMIT') }));
  app.use(urlencoded({ extended: true, limit: configService.get<string>('URL_LIMIT') }));

  const SERVICE_NAME = configService.get<string>('SERVICE_NAME');
  const NODE_ENV = configService.get<string>('NODE_ENV');

  if (NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle(SERVICE_NAME)
      .setDescription(`${SERVICE_NAME} service description`)
      .setVersion('1.0') // temporary global as only 1 version
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  const port = configService.get<string>('SERVICE_PORT') || 3000;
  const host = configService.get<string>('SERVICE_HOST');
  await app.listen(port, host);
}

bootstrap().catch((e) => {
  logger.error(e, undefined, 'Bootstrap');
});
