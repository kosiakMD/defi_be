import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { Web3ProviderService } from '@app/common/web3provider/web3.provider.service';

import { MetadataService } from '../../common/services/metadata/metadata.service';

import { AssetsController } from '../../controllers/assets.controller';
import { AssetsCategoryEntity } from '../assets-category/entities/assets-category.entity';
import { AssetsCategoryRepository } from '../assets-category/repositories/assets-category.repository';
import { IconsModule } from '../icons/icons.module';
import { AssetsProcessor } from './assets.processor';
import { AssetsInvalidAddressEntity } from './entities/assets-invalid-address.entity';
import { AssetUnderlyingEntity } from './entities/assets-underlying.entity';
import { AssetsEntity } from './entities/assets.entity';
import { AssetsRepository } from './repositories/assets.repository';
import { AssetsService } from './services/assets.service';
import { TokenService } from './services/token.service';
import { TrackedTokenPopulationProcessor } from './services/tracked-token-population.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'assets',
    }),
    TypeOrmModule.forFeature([
      AssetsCategoryEntity,
      AssetsCategoryRepository,
      AssetsEntity,
      AssetsRepository,
      AssetsInvalidAddressEntity,
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
    MulticallAggregator,
    TokenService,
    TrackedTokenPopulationProcessor,
    Web3ProviderService,
  ],
  exports: [AssetsService],
})
export class AssetsModule {}
