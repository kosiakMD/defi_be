import { NestExpressApplication } from '@nestjs/platform-express';

export async function initListening(app: NestExpressApplication): Promise<NestExpressApplication> {
  const { SERVICE_PORT, SERVICE_HOST } = process.env;
  await app.listen(SERVICE_PORT, SERVICE_HOST);

  return app;
}
