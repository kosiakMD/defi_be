import { NestExpressApplication } from '@nestjs/platform-express';

export async function initListening(app: NestExpressApplication): Promise<NestExpressApplication> {
  const { SERVICE_PORT, SERVICE_HOST, NODE_ENV } = process.env;
  await app.listen(SERVICE_PORT, SERVICE_HOST);
  // eslint-disable-next-line no-console
  if (NODE_ENV === 'development') process.on('warning', (e) => console.warn(e.stack));
  return app;
}
