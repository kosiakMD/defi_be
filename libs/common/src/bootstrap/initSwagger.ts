import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { EnvEnum } from '@app/common';

const ALLOW_SWAGGER_ENV = [EnvEnum.development, EnvEnum.local, EnvEnum.test, EnvEnum.provision];

export const initSwagger = (app: NestExpressApplication): NestExpressApplication => {
  const { NODE_ENV, SERVICE_NAME } = process.env;
  if (ALLOW_SWAGGER_ENV.includes(NODE_ENV as EnvEnum)) {
    const config = new DocumentBuilder()
      .setTitle(SERVICE_NAME)
      .setDescription(`${SERVICE_NAME} Description`)
      .setVersion('1.0') // temporary global as only 1 version
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }
  return app;
};
