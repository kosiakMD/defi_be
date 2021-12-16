import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { IntegrationService } from '../integration/integration.service';
import { VaultsController } from './vaults.controller';

@Module({
  imports: [ConfigModule, HttpModule, CacheModule.register()],
  providers: [IntegrationService],
  controllers: [VaultsController],
})
export class VaultsModule {}
