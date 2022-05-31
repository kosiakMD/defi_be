import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { EnvEnum } from '@app/common';

const defaultVersion = '1.0'; // temporary global as only 1 version

export function initSwagger(
  app: NestExpressApplication,
  version = defaultVersion,
): NestExpressApplication {
  const { NODE_ENV, SERVICE_NAME } = process.env;

  if (NODE_ENV !== EnvEnum.production) {
    const config = new DocumentBuilder()
      .setTitle(SERVICE_NAME)
      .setDescription(`${SERVICE_NAME} description`)
      .setVersion(version)
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  return app;
}
