import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HttpModule } from '@app/common';

import { CommonModule } from '../../common/common.module';
import { QueueName } from '../../common/enum/queue-name.enum';

import { AssetsCategoryService } from '../assets-category/assets-category.service';
import { AssetsCategoryRepository } from '../assets-category/repositories/assets-category.repository';
import { AssetsCandidateRepository } from '../assets/repositories/assets-candidate.repository';
import { AssetsCachedRepository } from '../assets/repositories/assets.cached-repository';
import { AssetsRepository } from '../assets/repositories/assets.repository';
import { AssetHistoricalPriceEntity } from './entities/asset-historical-price.entity';
import { PriceSourceEntity } from './entities/price-source.entity';
import { PriceService } from './price.service';
import { AssetsHistoricalPricesProcessor } from './processors/assets-historical-prices.processor';
import { UpdateCurrentPricesFromSourceProcessor } from './processors/update-current-prices-from-source.processor';
import { UpdateCurrentPricesProcessor } from './processors/update-current-prices.processor';
import { AssetsHistoricalPriceRepository } from './repositories/asset-historical-price.repository';
import { PriceSourceRepository } from './repositories/price-source.repository';
import { CoingeckoStrategy } from './strategies/coingecko.strategy';
import { DebankStrategy } from './strategies/debank.strategy';
import { SolanaScanStrategy } from './strategies/solana-scan.strategy';
import { SundaeSwapStrategy } from './strategies/sundae-swap.strategy';
import { Univ2NetworkStrategy } from './strategies/univ2-network.strategy';
import { Univ2SubgraphStrategy } from './strategies/univ2-subgraph.strategy';

const entities = [PriceSourceEntity, AssetHistoricalPriceEntity];

const repositories = [
  AssetsRepository,
  AssetsCandidateRepository,
  AssetsCategoryRepository,
  AssetsHistoricalPriceRepository,
  PriceSourceRepository,
];

const processors = [
  AssetsHistoricalPricesProcessor,
  UpdateCurrentPricesProcessor,
  UpdateCurrentPricesFromSourceProcessor,
];

const priceStrategies = [
  CoingeckoStrategy,
  DebankStrategy,
  SolanaScanStrategy,
  SundaeSwapStrategy,
  Univ2SubgraphStrategy,
  Univ2NetworkStrategy,
];

@Module({
  controllers: [],
  imports: [
    HttpModule,
    CommonModule,
    BullModule.registerQueue({
      name: QueueName.PRICES,
      settings: {
        maxStalledCount: 0,
      },
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    TypeOrmModule.forFeature([...entities, ...repositories]),
  ],
  providers: [
    ...processors,
    ...priceStrategies,
    AssetsCachedRepository,
    AssetsCategoryService,
    PriceService,
  ],
  exports: [PriceService],
})
export class PricesModule {}
