import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { urlencoded, json } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AppModule } from './app.module';
import { addTimeLogFeature } from './common/Logger/Logger.service';
import { createLogger } from './utils/winston';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  app.enableShutdownHooks();

  const configService = app.get<ConfigService>(ConfigService);

  const logger = createLogger({
    logErrorFile: configService.get<string>('LOG_ERROR_FILE'),
    logCombineLog: configService.get<string>('LOG_COMBINED_FILE'),
    serviceName: configService.get<string>('SERVICE_NAME'),
    level: configService.get<string>('LOG_LEVEL'),
    meta: { env: configService.get<string>('ENV') },
    awsConfig: {
      region: configService.get<string>('AWS_REGION'),
      accessKeyId: configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: configService.get<string>('AWS_SECRET_ACCESS_KEY'),
    },
  });
  app.useLogger(logger);

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
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

  const enhancedLogger = addTimeLogFeature(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.useLogger(enhancedLogger);

  const port = configService.get<string>('SERVICE_PORT') || 3000;
  const host = configService.get<string>('SERVICE_HOST');
  await app.listen(port, host);
}

bootstrap();
