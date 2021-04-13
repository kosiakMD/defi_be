import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { createLogger } from './utils/winston';

const serviceName = 'Price Service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    logger: createLogger(),
  });

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

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

  // eslint-disable-next-line no-console
  console.log(`${serviceName} running: http://${host}:${port}/api`);
}

bootstrap();
