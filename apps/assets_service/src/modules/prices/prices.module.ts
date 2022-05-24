import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PriceJobEmitterController } from '../../controllers/price-job-emitter.controller';
import { AssetsCandidateRepository } from '../assets/repositories/assets-candidate.repository';
import { AssetsRepository } from '../assets/repositories/assets.repository';
import { AssetsService } from '../assets/services/assets.service';
import { AssetHistoricalPriceEntity } from './entities/asset-historical-price.entity';
import { AssetPriceEntity } from './entities/asset-price.entity';
import { PriceSourceEntity } from './entities/price-source.entity';
import { PriceJobEmitter } from './price-job.emitter';
import { AssetsCurrentPricesProcessor } from './processors/assets-current-prices.processor';
import { AssetsHistoricalPricesProcessor } from './processors/assets-historical-prices.processor';
import { AssetsHistoricalPriceRepository } from './repositories/asset-historical-price.repository';
import { AssetsPriceRepository } from './repositories/asset-price.repository';
import { PriceSourceRepository } from './repositories/price-source.repository';

@Module({
  controllers: [PriceJobEmitterController],
  imports: [
    BullModule.registerQueue({
      name: 'assets',
    }),
    TypeOrmModule.forFeature([
      AssetPriceEntity,
      AssetHistoricalPriceEntity,
      AssetsHistoricalPriceRepository,
      AssetsPriceRepository,
      PriceSourceEntity,
      AssetsRepository,
      AssetsCandidateRepository,
      PriceSourceRepository,
    ]),
  ],
  providers: [
    PriceJobEmitter,
    AssetsCurrentPricesProcessor,
    AssetsHistoricalPricesProcessor,
    AssetsService,
  ],
})
export class PricesModule {}
