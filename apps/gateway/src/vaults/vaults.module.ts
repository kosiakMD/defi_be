import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HttpModule } from '@app/common';

import { VaultsController } from './vaults.controller';

@Module({
  imports: [ConfigModule, HttpModule, CacheModule.register()],
  providers: [],
  controllers: [VaultsController],
})
export class VaultsModule {}
