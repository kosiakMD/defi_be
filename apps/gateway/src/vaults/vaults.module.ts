import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { VaultsController } from './vaults.controller';

@Module({
  imports: [ConfigModule, HttpModule, CacheModule.register()],
  providers: [],
  controllers: [VaultsController],
})
export class VaultsModule {}
