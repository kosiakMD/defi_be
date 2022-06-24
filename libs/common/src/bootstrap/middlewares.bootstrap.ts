import { NestExpressApplication } from '@nestjs/platform-express';

import { headersMiddleware } from '@app/common/middlewares/headers.middleware';

export function initMiddlewares(app: NestExpressApplication): NestExpressApplication {
  app.use(headersMiddleware);
  return app;
}
