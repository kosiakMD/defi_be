import { NestExpressApplication } from '@nestjs/platform-express';

import { withContext } from '@app/common/middlewares/withContext';

export function initContext(app: NestExpressApplication): NestExpressApplication {
  app.use(withContext);

  return app;
}
