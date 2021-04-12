import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { GasController } from './gas.controller';
import { GasService } from './gas.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5e3,
      maxRedirects: 2,
    }),
    CacheModule.register(),
    ConfigModule,
  ],
  providers: [GasService],
  controllers: [GasController],
})
export class GasModule {}
