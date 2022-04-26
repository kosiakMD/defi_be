import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssetsCandidateRepository } from '../assets/repositories/assets-candidate.repository';
import { AssetsRepository } from '../assets/repositories/assets.repository';
import { AssetsService } from '../assets/services/assets.service';
import { AssetsHistoricalPriceEntity } from './entities/assets-historical-price.entity';
import { AssetsPriceEntity } from './entities/assets-price.entity';
import { PriceSourceEntity } from './entities/price-sources.entity';
import { PriceJobEmitter } from './prices-job.emitter';
import { AssetsCurrentPricesProcessor } from './processors/assets-current-prices.processor';
import { AssetsHistoricalPricesProcessor } from './processors/assets-historical-prices.processor';
import { AssetsHistoricalPriceRepository } from './repositories/asset-historical-price.repository';
import { AssetsPriceRepository } from './repositories/asset-price.repository';
import { PriceSourceRepository } from './repositories/price-source.repository';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'assets',
    }),
    TypeOrmModule.forFeature([
      AssetsPriceEntity,
      AssetsHistoricalPriceEntity,
      AssetsHistoricalPriceRepository,
      AssetsPriceRepository,
      PriceSourceEntity,
      AssetsRepository,
      AssetsCandidateRepository,
      PriceSourceRepository,
    ]),
    ScheduleModule.forRoot(),
  ],
  providers: [
    PriceJobEmitter,
    AssetsCurrentPricesProcessor,
    AssetsHistoricalPricesProcessor,
    AssetsService,
  ],
})
export class PricesModule {}
