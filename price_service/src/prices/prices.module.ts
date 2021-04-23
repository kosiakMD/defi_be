import { CacheModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LookupModule } from '../lookup/lookup.module';
import { Asset, AssetPrice } from './models';
import { PricesController } from './prices.controller';
import { PriceService } from './prices.service';

@Module({
  imports: [
    CacheModule.register({
      max: 100 * 1000,
    }),
    TypeOrmModule.forFeature([AssetPrice, Asset]),
    LookupModule,
  ],
  controllers: [PricesController],
  providers: [PriceService],
  exports: [TypeOrmModule],
})
export class PricesModule {}
