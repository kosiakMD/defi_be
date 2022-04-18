import { NestExpressApplication } from '@nestjs/platform-express';

export const startApp = (app: NestExpressApplication): Promise<NestExpressApplication> => {
  const { SERVICE_PORT, SERVICE_HOST } = process.env;
  return app.listen(SERVICE_PORT, SERVICE_HOST);
};
