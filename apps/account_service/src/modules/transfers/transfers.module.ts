import * as redisStore from 'cache-manager-redis-store';

import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PriceService } from '../../common/providers/microservices/price/price.service';

import { TransfersController } from '../../controllers/transfers.controller';
import { WETHContract } from '../approvals/contracts/weth.contract';
import { AssetService } from '../assets/asset.service';
import { ChainsModule } from '../chains/chains.module';
import { ScansApiModule } from '../scans-api.module';
import { TransferEntityNew } from './entities/transfers.entity';
import { TransfersBlocksSubgraph } from './transfers-blocks.subgraph';
import { TransfersDbService } from './transfers-db.service';
import { TransfersService } from './transfers.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([TransferEntityNew]),
    ChainsModule,
    ScansApiModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get('REDIS_CACHE_TTL') || 30,
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        // eslint-disable-next-line camelcase
        auth_pass: configService.get('REDIS_AUTH'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TransfersController],
  providers: [
    PriceService,
    WETHContract,
    AssetService,
    TransfersDbService,
    TransfersBlocksSubgraph,
    TransfersService,
  ],
  exports: [TransfersService],
})
export class TransfersModule {}
