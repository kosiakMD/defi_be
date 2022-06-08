// import * as childProcess from 'child_process';
import { NestExpressApplication } from '@nestjs/platform-express';

import { withContext } from '@app/common/middlewares/withContext';

export function initContext(app: NestExpressApplication): NestExpressApplication {
  app.use(withContext);

  // const revision = childProcess.execSync('git rev-parse HEAD').toString().trim();
  // console.log(revision);

  return app;
}
