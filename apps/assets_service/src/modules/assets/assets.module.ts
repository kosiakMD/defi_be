import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { Web3ProviderService } from '@app/common/web3provider/web3-provider.service';

import { CommonModule } from '../../common/common.module';
import { QueueName } from '../../common/enum/queue-name.enum';

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
import { MetadataService } from './services/metadata/metadata.service';
import { CardanoMetadataStrategy } from './services/metadata/strategies/cardano.strategy';
import { CosmosMetadataStrategy } from './services/metadata/strategies/cosmos.strategy';
import { EVMMetaDataStrategy } from './services/metadata/strategies/evm.strategy';
import { SolanaMetadataStrategy } from './services/metadata/strategies/solana.strategy';
import { TerraMetadataStrategy } from './services/metadata/strategies/terra.strategy';
import { SpecificAssetsService } from './services/specific-assets/specific-assets.service';
import { AaveStrategy } from './services/specific-assets/strategies/aave.strategy';
import { CompoundStrategy } from './services/specific-assets/strategies/compound.strategy';
import { CurveStrategy } from './services/specific-assets/strategies/curve.strategy';
import { ElipsisStrategy } from './services/specific-assets/strategies/elipsis.strategy';
import { StakedSohmStrategy } from './services/specific-assets/strategies/staked-sOHM.strategy';
import { StakedSushiStrategy } from './services/specific-assets/strategies/staked-sushi.strategy';
import { TerraStrategy } from './services/specific-assets/strategies/terra.strategy';
import { UniswapStrategy } from './services/specific-assets/strategies/uniswap.strategy';
import { YearnStrategy } from './services/specific-assets/strategies/yearn.strategy';
import { CoingeckoAssetsProvider } from './services/tracked-assets/strategies/coingecko-assets.provider';
import { CoinmarketcapAssetsProvider } from './services/tracked-assets/strategies/coinmarketcap-assets.provider';

const trackedAssetsProviders = [CoingeckoAssetsProvider, CoinmarketcapAssetsProvider];

const metadataStrategies = [
  CardanoMetadataStrategy,
  CosmosMetadataStrategy,
  EVMMetaDataStrategy,
  SolanaMetadataStrategy,
  TerraMetadataStrategy,
];

const specificAssetsStrategies = [
  UniswapStrategy,
  CompoundStrategy,
  AaveStrategy,
  CurveStrategy,
  ElipsisStrategy,
  StakedSohmStrategy,
  StakedSushiStrategy,
  TerraStrategy,
  YearnStrategy,
];

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
    ...trackedAssetsProviders,
    ...metadataStrategies,
    ...specificAssetsStrategies,
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
    SpecificAssetsService,
    UpdateTrackedAssetsProcessor,
    Web3ProviderService,
  ],
  exports: [AssetsService, AssetsRepository],
})
export class AssetsModule {}
