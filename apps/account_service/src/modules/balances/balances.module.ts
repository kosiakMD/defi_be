import * as redisStore from 'cache-manager-redis-store';

import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CosmosService } from '../../common/providers/3rdparty/cosmos.service';
import { CovalentService } from '../../common/providers/3rdparty/covalent.service';
import { PriceService } from '../../common/providers/microservices/price/price.service';

import { BalancesController } from '../../controllers/balances.controller';
import { AssetsModule } from '../assets/assets.module';
import { AssetsEntity } from '../assets/entities/assets.entity';
import { BlacklistModule } from '../blacklists/blacklist.module';
import { ChainsModule } from '../chains.module';
import { MulticallModule } from '../multicall/multicall.module';
import { BalancesService } from './balances.service';
import { CovalentBalancesStrategy } from './strategies/covalent.strategy';
import { NetworkBalancesStrategy } from './strategies/network.strategy';
import { SolanaBalancesStrategy } from './strategies/solana.balances.strategy';
import { TerraBalancesStrategy } from './strategies/terra.balances.strategy';
import { CardanoBalancesStrategy } from './strategies/cardano.balances.strategy';
import { CosmosBalancesStrategy } from './strategies/cosmos.balances.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssetsEntity]),
    HttpModule,
    ChainsModule,
    MulticallModule,
    AssetsModule,
    BlacklistModule,
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
  controllers: [BalancesController],
  providers: [
    PriceService,
    CosmosService,
    CovalentService,
    BalancesService,
    CovalentBalancesStrategy,
    NetworkBalancesStrategy,
    SolanaBalancesStrategy,
    TerraBalancesStrategy,
    CardanoBalancesStrategy,
    CosmosBalancesStrategy,
  ],
})
export class BalancesModule {}
