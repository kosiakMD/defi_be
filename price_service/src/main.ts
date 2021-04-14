import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { createLogger } from './utils/winston';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  const configService = app.get<ConfigService>(ConfigService);
  const logger = createLogger(
    configService.get<string>('LOG_ERROR_FILE'),
    configService.get<string>('LOG_COMBINED_FILE'),
    configService.get<string>('SERVICE_NAME'),
    configService.get<string>('LOG_LEVEL'),
  );
  app.useLogger(logger);

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const serviceName = configService.get<string>('SERVICE_NAME');

  const config = new DocumentBuilder()
    .setTitle(serviceName)
    .setDescription(`${serviceName} description`)
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.SERVER_PORT || 3000;
  const host = process.env.HOST || '127.0.0.1';
  await app.listen(port, host);
}

bootstrap();
