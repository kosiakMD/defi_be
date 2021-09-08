import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CoingeckoApi } from './api/coingecko.api';

@Module({
  imports: [
    ConfigModule.forRoot(),
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  providers: [CoingeckoApi],
  exports: [CoingeckoApi],
})
export class ApisModule {}
