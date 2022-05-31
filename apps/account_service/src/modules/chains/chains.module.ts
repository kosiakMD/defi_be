import * as redisStore from 'cache-manager-redis-store';

import { HttpModule } from '@nestjs/axios';
import { CacheModule, forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Web3Provider } from '../../common/providers/chain-related/web3.provider';
import { PriceService } from '../../common/providers/microservices/price/price.service';

import { ChainsController } from '../../controllers/chains.controller';
import { AssetsModule } from '../assets/assets.module';
import { ChainsService } from './chains.service';
import { ChainsEntity } from './entities/chain.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([ChainsEntity]),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        ttl: configService.get('REDIS_CACHE_TTL') || 30,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        // eslint-disable-next-line camelcase
        auth_pass: configService.get('REDIS_AUTH'),
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => AssetsModule),
  ],
  controllers: [ChainsController],
  providers: [PriceService, Web3Provider, ChainsService],
  exports: [Web3Provider, ChainsService],
})
export class ChainsModule {}
