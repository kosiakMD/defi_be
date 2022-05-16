import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { Web3ProviderService } from '@app/common/web3provider/web3.provider.service';

import { MetadataService } from '../../common/services/metadata/metadata.service';

import { AssetsController } from '../../controllers/assets.controller';
import { AssetCategoryEntity } from '../assets-category/entities/asset-category.entity';
import { AssetsCategoryRepository } from '../assets-category/repositories/assets-category.repository';
import { IconsModule } from '../icons/icons.module';
import { AssetHistoricalPriceEntity } from '../prices/entities/asset-historical-price.entity';
import { AssetPriceEntity } from '../prices/entities/asset-price.entity';
import { AssetsHistoricalPriceRepository } from '../prices/repositories/asset-historical-price.repository';
import { AssetsPriceRepository } from '../prices/repositories/asset-price.repository';
import { AssetCandidateEntity } from './entities/asset-candidate.entity';
import { AssetInvalidAddressEntity } from './entities/asset-invalid-address.entity';
import { AssetUnderlyingEntity } from './entities/asset-underlying.entity';
import { AssetEntity } from './entities/asset.entity';
import { AssetsProcessor } from './processors/assets.processor';
import { TrackedTokenPopulationProcessor } from './processors/tracked-token-population.processor';
import { AssetsCandidateRepository } from './repositories/assets-candidate.repository';
import { AssetsRepository } from './repositories/assets.repository';
import { AssetsService } from './services/assets.service';
import { TokenService } from './services/token.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'assets',
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
    AssetsProcessor,
    AssetsService,
    MetadataService,
    AssetsRepository,
    AssetsCandidateRepository,
    MulticallAggregator,
    TokenService,
    TrackedTokenPopulationProcessor,
    Web3ProviderService,
  ],
  exports: [AssetsService],
})
export class AssetsModule {}
