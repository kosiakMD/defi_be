import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommonModule } from '../../common/common.module';
import { QueueName } from '../../common/enum/queue-name.enum';

import { AssetsCandidateRepository } from '../assets/repositories/assets-candidate.repository';
import { AssetsRepository } from '../assets/repositories/assets.repository';
import { AssetsService } from '../assets/services/assets.service';
import { AssetHistoricalPriceEntity } from './entities/asset-historical-price.entity';
import { AssetPriceEntity } from './entities/asset-price.entity';
import { PriceSourceEntity } from './entities/price-source.entity';
import { PriceJobEmitter } from './price-job.emitter';
import { PriceService } from './price.service';
import { AssetsCurrentPricesProcessor } from './processors/assets-current-prices.processor';
import { AssetsHistoricalPricesProcessor } from './processors/assets-historical-prices.processor';
import { UpdateCurrentPricesFromSourceProcessor } from './processors/update-current-prices-from-source.processor';
import { UpdateCurrentPricesProcessor } from './processors/update-current-prices.processor';
import { AssetsHistoricalPriceRepository } from './repositories/asset-historical-price.repository';
import { AssetsPriceRepository } from './repositories/asset-price.repository';
import { PriceSourceRepository } from './repositories/price-source.repository';
import { CoingeckoStrategy } from './strategies/coingecko.strategy';
import { DebankStrategy } from './strategies/debank.strategy';
import { SolanaScanStrategy } from './strategies/solana-scan.strategy';
import { SundaeSwapStrategy } from './strategies/sundae-swap.strategy';
import { Univ2SubgraphStrategy } from './strategies/univ2-subgraph.strategy';

const repositories = [
  AssetsRepository,
  AssetsCandidateRepository,
  AssetsPriceRepository,
  AssetsHistoricalPriceRepository,
  PriceSourceRepository,
];

const processors = [
  AssetsCurrentPricesProcessor,
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
];

@Module({
  controllers: [],
  imports: [
    CommonModule,
    HttpModule,
    BullModule.registerQueue({
      name: QueueName.ASSETS,
      settings: {
        maxStalledCount: 0,
      },
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    TypeOrmModule.forFeature([
      AssetPriceEntity,
      AssetHistoricalPriceEntity,
      PriceSourceEntity,
      ...repositories,
    ]),
  ],
  providers: [...processors, ...priceStrategies, PriceJobEmitter, AssetsService, PriceService],
})
export class PricesModule {}
