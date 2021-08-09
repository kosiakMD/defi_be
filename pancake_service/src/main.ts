import * as dotenv from 'dotenv';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';

// config check
(() => {
  const result = dotenv.config();
  if (result.error) {
    throw result.error;
  } else {
    // eslint-disable-next-line no-console
    console.log(result.parsed);
  }
})();

const serviceName = 'Pancake Service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
  });

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

  const port = SERVICE_PORT || 3000;
  const host = SERVICE_HOST;
  await app.listen(port, host);

  // eslint-disable-next-line no-console
  console.log(`${serviceName}\nhost:${host}\nport:${port}`);
}

bootstrap();
