import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { IntegrationService } from '../integration/integration.service';
import { PoolsController } from './pools.controller';

@Module({
  imports: [ConfigModule, HttpModule, CacheModule.register()],
  providers: [IntegrationService],
  controllers: [PoolsController],
})
export class PoolsModule {}
