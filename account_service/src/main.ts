import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { addTimeLogFeature } from './Logger/Logger.service';
import { AppModule } from './app.module';
import { createLogger } from './utils/winston';

const logger = createLogger();

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bodyParser: true,
    abortOnError: false,
    logger,
  });

  const enhancedLogger = addTimeLogFeature(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.useLogger(enhancedLogger);

  app.enableShutdownHooks();

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.setGlobalPrefix('v1'); // temporary global as only 1 version

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

bootstrap().catch((e) => {
  logger.error(e, null, 'Bootstrap');
});
