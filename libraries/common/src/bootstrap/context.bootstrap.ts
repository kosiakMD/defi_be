import { NestExpressApplication } from '@nestjs/platform-express';

import { withContext } from '@app/common/middlewares/with-context';

export function initContext(app: NestExpressApplication): NestExpressApplication {
  app.use(withContext);

  return app;
}
