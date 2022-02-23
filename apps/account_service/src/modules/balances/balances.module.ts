import * as redisStore from 'cache-manager-redis-store';

import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CosmosService } from '../../common/providers/3rdparty/cosmos/cosmos.service';
import { CosmostationProvider } from '../../common/providers/3rdparty/cosmos/cosmostation.provider';
import { KeplrProvider } from '../../common/providers/3rdparty/cosmos/keplr.provider';
import { CovalentService } from '../../common/providers/3rdparty/covalent.service';
import { RoninService } from '../../common/providers/3rdparty/ronin.service';
import { PriceService } from '../../common/providers/microservices/price/price.service';

import { BalancesController } from '../../controllers/balances.controller';
import { AssetsModule } from '../assets/assets.module';
import { AssetsEntity } from '../assets/entities/assets.entity';
import { BlacklistModule } from '../blacklists/blacklist.module';
import { ChainsModule } from '../chains.module';
import { MulticallModule } from '../multicall/multicall.module';
import { BalancesService } from './balances.service';
import { CardanoBalancesStrategy } from './strategies/cardano.balances.strategy';
import { CosmosBalancesStrategy } from './strategies/cosmos.balances.strategy';
import { CovalentBalancesStrategy } from './strategies/covalent.strategy';
import { NetworkBalancesStrategy } from './strategies/network.strategy';
import { RoninBalancesStrategy } from './strategies/ronin.balances.strategy';
import { SolanaBalancesStrategy } from './strategies/solana.balances.strategy';
import { TerraBalancesStrategy } from './strategies/terra.balances.strategy';

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
    KeplrProvider,
    CosmostationProvider,
    CovalentService,
    BalancesService,
    RoninService,
    CovalentBalancesStrategy,
    NetworkBalancesStrategy,
    SolanaBalancesStrategy,
    TerraBalancesStrategy,
    CardanoBalancesStrategy,
    CosmosBalancesStrategy,
    RoninBalancesStrategy,
  ],
})
export class BalancesModule {}
