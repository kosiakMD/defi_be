import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { Web3ProviderService } from '@app/common/web3provider/web3.provider.service';

import { CommonModule } from '../../common/common.module';
import { QueueName } from '../../common/enum/queue-name.enum';
import { MetadataService } from '../../common/services/metadata/metadata.service';

import { AssetsController } from '../../controllers/assets.controller';
import { AssetCategoryEntity } from '../assets-category/entities/asset-category.entity';
import { AssetsCategoryRepository } from '../assets-category/repositories/assets-category.repository';
import { IconsModule } from '../icons/icons.module';
import { AssetHistoricalPriceEntity } from '../prices/entities/asset-historical-price.entity';
import { AssetPriceEntity } from '../prices/entities/asset-price.entity';
import { PriceService } from '../prices/price.service';
import { AssetsHistoricalPriceRepository } from '../prices/repositories/asset-historical-price.repository';
import { AssetsPriceRepository } from '../prices/repositories/asset-price.repository';
import { AssetCandidateEntity } from './entities/asset-candidate.entity';
import { AssetInvalidAddressEntity } from './entities/asset-invalid-address.entity';
import { AssetUnderlyingEntity } from './entities/asset-underlying.entity';
import { AssetEntity } from './entities/asset.entity';
import { AssetsProcessor } from './processors/assets.processor';
import { UpdateTrackedAssetsProcessor } from './processors/update-tracked-assets.processor';
import { AssetsCandidateRepository } from './repositories/assets-candidate.repository';
import { AssetsRepository } from './repositories/assets.repository';
import { AssetsService } from './services/assets.service';
import { TokenService } from './services/token.service';
import { CoingeckoAssetsProvider } from './services/tracked-tokens/coingecko-assets.provider';
import { CoinmarketcapAssetsProvider } from './services/tracked-tokens/coinmarketcap-assets.provider';

const trackedTokensProviders = [CoingeckoAssetsProvider, CoinmarketcapAssetsProvider];

@Module({
  imports: [
    CommonModule,
    BullModule.registerQueue({
      name: QueueName.ASSETS,
      settings: {
        maxStalledCount: 0,
      },
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    TypeOrmModule.forFeature([
      AssetCandidateEntity,
      AssetsCandidateRepository,
      AssetCategoryEntity,
      AssetsCategoryRepository,
      AssetEntity,
      AssetsRepository,
      AssetPriceEntity,
      AssetsPriceRepository,
      AssetHistoricalPriceEntity,
      AssetsHistoricalPriceRepository,
      AssetInvalidAddressEntity,
      AssetUnderlyingEntity,
    ]),
    IconsModule,
    HttpModule,
  ],
  controllers: [AssetsController],
  providers: [
    ...trackedTokensProviders,
    AssetsProcessor,
    AssetsService,
    MetadataService,
    AssetsRepository,
    // TODO: It should not be in this module
    AssetsPriceRepository,
    // TODO: It should not be in this module
    AssetsHistoricalPriceRepository,
    // TODO: It should not be in this module
    PriceService,
    AssetsCandidateRepository,
    MulticallAggregator,
    TokenService,
    UpdateTrackedAssetsProcessor,
    Web3ProviderService,
  ],
  exports: [AssetsService, AssetsRepository],
})
export class AssetsModule {}
