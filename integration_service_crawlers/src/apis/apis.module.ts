import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CoingeckoApi } from './api/coingecko.api';
import { CurveApi } from './api/curve.api';

@Module({
  imports: [
    ConfigModule.forRoot(),
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  providers: [CoingeckoApi, CurveApi],
  exports: [CoingeckoApi, CurveApi],
})
export class ApisModule {}
