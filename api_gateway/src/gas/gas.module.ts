import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { GasController } from './gas.controller';
import { GasService } from './gas.service';

@Module({
  imports: [ConfigModule, HttpModule, CacheModule.register()],
  providers: [GasService],
  controllers: [GasController],
})
export class GasModule {}
