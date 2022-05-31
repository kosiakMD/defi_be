import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommonModule } from '../../common/common.module';
import { QueueName } from '../../common/enum/queue-name.enum';

import { AssetsController } from '../../controllers/assets.controller';
import { AssetsCategoryModule } from '../assets-category/assets-category.module';
import { AssetCategoryEntity } from '../assets-category/entities/asset-category.entity';
import { AssetsCategoryRepository } from '../assets-category/repositories/assets-category.repository';
import { IconsModule } from '../icons/icons.module';
import { AssetHistoricalPriceEntity } from '../prices/entities/asset-historical-price.entity';
import { PriceService } from '../prices/price.service';
import { PricesModule } from '../prices/prices.module';
import { AssetsHistoricalPriceRepository } from '../prices/repositories/asset-historical-price.repository';
import { AssetCandidateEntity } from './entities/asset-candidate.entity';
import { AssetInvalidAddressEntity } from './entities/asset-invalid-address.entity';
import { AssetUnderlyingEntity } from './entities/asset-underlying.entity';
import { AssetEntity } from './entities/asset.entity';
import { AssetsProcessor } from './processors/assets.processor';
import { UpdateTrackedAssetsProcessor } from './processors/update-tracked-assets.processor';
import { AssetsCandidateRepository } from './repositories/assets-candidate.repository';
import { AssetsCachedRepository } from './repositories/assets.cached-repository';
import { AssetsRepository } from './repositories/assets.repository';
import { AssetsService } from './services/assets.service';
import { MetadataService } from './services/metadata/metadata.service';
import { CardanoMetadataStrategy } from './services/metadata/strategies/cardano.strategy';
import { CosmosMetadataStrategy } from './services/metadata/strategies/cosmos.strategy';
import { EVMMetaDataStrategy } from './services/metadata/strategies/evm.strategy';
import { SolanaMetadataStrategy } from './services/metadata/strategies/solana.strategy';
import { TerraMetadataStrategy } from './services/metadata/strategies/terra.strategy';
import { SaberAssetAnalyser } from './services/specific-assets/analysers/saber.asset-analyser';
import { UniswapV2AssetAnalyser } from './services/specific-assets/analysers/uniswapv2.asset-analyser';
import { SpecificAssetsService } from './services/specific-assets/specific-assets.service';
import { AaveStrategy } from './services/specific-assets/strategies/aave.strategy';
import { CompoundStrategy } from './services/specific-assets/strategies/compound.strategy';
import { CurveStrategy } from './services/specific-assets/strategies/curve.strategy';
import { ElipsisStrategy } from './services/specific-assets/strategies/elipsis.strategy';
import { StakedSohmStrategy } from './services/specific-assets/strategies/staked-sohm.strategy';
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

const assetAnalysers = [UniswapV2AssetAnalyser, SaberAssetAnalyser];

@Module({
  imports: [
    HttpModule,
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
      AssetHistoricalPriceEntity,
      AssetsHistoricalPriceRepository,
      AssetInvalidAddressEntity,
      AssetUnderlyingEntity,
    ]),
    IconsModule,
    PricesModule,
    AssetsCategoryModule,
  ],
  controllers: [AssetsController],
  providers: [
    ...trackedAssetsProviders,
    ...metadataStrategies,
    ...specificAssetsStrategies,
    ...assetAnalysers,
    AssetsCachedRepository,
    AssetsService,
    MetadataService,
    PriceService,
    SpecificAssetsService,
    AssetsProcessor,
    UpdateTrackedAssetsProcessor,
  ],
  exports: [AssetsService],
})
export class AssetsModule {}
