import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigHostModule } from '@nestjs/config/dist/config-host.module';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HttpModule } from '@app/common';

import { CommonModule } from '../../common/common.module';
import { QueueName } from '../../common/enum/queue-name.enum';

import { AwsModule } from '../../aws/aws.module';
import { AssetsController } from '../../controllers/assets.controller';
import { AssetsCategoryModule } from '../assets-category/assets-category.module';
import { AssetCategoryEntity } from '../assets-category/entities/asset-category.entity';
import { AssetsCategoryRepository } from '../assets-category/repositories/assets-category.repository';
import { AssetHistoricalPriceEntity } from '../prices/entities/asset-historical-price.entity';
import { PricesModule } from '../prices/prices.module';
import { AssetsHistoricalPriceRepository } from '../prices/repositories/asset-historical-price.repository';
import { PriceSourceRepository } from '../prices/repositories/price-source.repository';
import { AssetCandidateEntity } from './entities/asset-candidate.entity';
import { AssetInvalidEntity } from './entities/asset-invalid.entity';
import { AssetUnderlyingEntity } from './entities/asset-underlying.entity';
import { AssetEntity } from './entities/asset.entity';
import { AssetsProcessor } from './processors/assets.processor';
import { ReprocessNoIconAssetsProcessor } from './processors/reprocess-no-icon-assets.processor';
import { Univ2LikeAssetsLPProcessor } from './processors/univ2-like-assets-lp.processor';
import { UpdateTrackedAssetsProcessor } from './processors/update-tracked-assets.processor';
import { AssetsCandidateRepository } from './repositories/assets-candidate.repository';
import { AssetsInvalidRepository } from './repositories/assets-invalid.repository';
import { AssetsCachedRepository } from './repositories/assets.cached-repository';
import { AssetsRepository } from './repositories/assets.repository';
import { assetAnalysers } from './services/analysers/registry';
import { AssetAnalyserService } from './services/asset-analyser.service';
import { AssetsService } from './services/assets.service';
import { CosmosHelper } from './services/helpers/cosmos.helper';
import { GithubService } from './services/helpers/github.helper';
import { IconsService } from './services/icons.service';
import { InvalidAssetService } from './services/invalid-asset.service';
import { trackedAssetsProviders } from './services/tracked-assets/registry';

const processors = [
  AssetsProcessor,
  UpdateTrackedAssetsProcessor,
  ReprocessNoIconAssetsProcessor,
  Univ2LikeAssetsLPProcessor,
];

@Module({
  imports: [
    AwsModule,
    HttpModule.registerAsync({
      imports: [ConfigHostModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get<number>('http.timeout'),
        maxRedirects: configService.get<number>('http.maxRedirects'),
      }),
      inject: [ConfigService],
    }),
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
      // TODO: Weird dependency
      PriceSourceRepository,
      AssetCandidateEntity,
      AssetsCandidateRepository,
      AssetCategoryEntity,
      AssetsCategoryRepository,
      AssetEntity,
      AssetsRepository,
      AssetHistoricalPriceEntity,
      AssetsHistoricalPriceRepository,
      AssetInvalidEntity,
      AssetsInvalidRepository,
      AssetUnderlyingEntity,
    ]),
    PricesModule,
    AssetsCategoryModule,
  ],
  controllers: [AssetsController],
  providers: [
    ...trackedAssetsProviders,
    ...assetAnalysers,
    ...processors,
    AssetsCachedRepository,
    IconsService,
    AssetsService,
    AssetAnalyserService,
    InvalidAssetService,
    GithubService,
    CosmosHelper,
  ],
  exports: [],
})
export class AssetsModule {}
