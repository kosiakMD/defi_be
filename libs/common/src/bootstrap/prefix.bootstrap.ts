import { NestExpressApplication } from '@nestjs/platform-express';

export function initPrefix(app: NestExpressApplication): NestExpressApplication {
  app.setGlobalPrefix('v1'); // temporary global as only 1 version
  return app;
}
