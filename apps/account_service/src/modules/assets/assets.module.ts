import { CacheModule, forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AssetsController } from '../../controllers/assets.controller';
import { WETH } from '../approvals/contracts/WETH';
import { ChainsModule } from '../chains/chains.module';
import { AssetsPoolsService } from './assets.pools.service';
import { AssetsService } from './assets.service';
import { AssetsEntity } from './entities/assets.entity';
import { AssetsPoolsEntity } from './entities/assets.pools.entity';
import { AssetsRepository } from './repositories/assets.repository';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get('REDIS_ASSETS_CACHE_TTL') || 900,
      }),
      inject: [ConfigService],
    }),
    ChainsModule,
    TypeOrmModule.forFeature([AssetsEntity, AssetsRepository, AssetsPoolsEntity]),
    forwardRef(() => ChainsModule),
  ],
  controllers: [AssetsController],
  providers: [WETH, AssetsService, AssetsPoolsService, MulticallAggregator, Web3ProviderService],
  exports: [AssetsService],
})
export class AssetsModule {}
