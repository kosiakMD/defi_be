import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { IntegrationService } from '../integration/integration.service';
import { PoolsController } from './pools.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5e3,
      maxRedirects: 2,
    }),
    CacheModule.register(),
    ConfigModule,
  ],
  providers: [IntegrationService],
  controllers: [PoolsController],
})
export class PoolsModule {}
