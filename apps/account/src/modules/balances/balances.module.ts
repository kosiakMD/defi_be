import * as redisStore from 'cache-manager-redis-store';
import { RequestContextModule } from 'nestjs-request-context';

import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HttpModule } from '@app/common';
import { CacheService } from '@app/common/services/cache.service';

import { CardanoService } from '../../common/providers/3rdparty/cardano.service';
import { CovalentService } from '../../common/providers/3rdparty/covalent.service';
import { RoninService } from '../../common/providers/3rdparty/ronin.service';
import { AssetService } from '../../common/providers/microservices/assets/asset.service';
import { PriceService } from '../../common/providers/microservices/price/price.service';
import { BlocktimeService } from '../../common/services/blocktime.service';

import { BalancesController } from '../../controllers/balances.controller';
import { BalancesV2Controller } from '../../controllers/balances.controller.v2';
import { AssetsModule } from '../assets/assets.module';
import { AssetsEntity } from '../assets/entities/assets.entity';
import { BlacklistModule } from '../blacklists/blacklist.module';
import { ChainsModule } from '../chains/chains.module';
import { MulticallModule } from '../multicall/multicall.module';
import { BalancesV2Service } from './balances-v2.service';
import { BalancesService } from './balances.service';
import { DelegationsService } from './delegations.service';
import { CardanoDelegationsStrategy } from './strategies/delegations/cardano-delegations.strategy';
import { SolanaDelegationsStrategy } from './strategies/delegations/solana-delegations.strategy';
import { TerraDelegationsStrategy } from './strategies/delegations/terra-delegations.strategy';
import { balanceStrategies } from './strategies/registry';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssetsEntity]),
    HttpModule,
    ChainsModule,
    MulticallModule,
    AssetsModule,
    BlacklistModule,
    RequestContextModule,
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
  controllers: [BalancesController, BalancesV2Controller],
  providers: [
    ...balanceStrategies,
    CacheService,
    PriceService,
    AssetService,
    CardanoService,
    CovalentService,
    BlocktimeService,
    BalancesService,
    BalancesV2Service,
    DelegationsService,
    RoninService,
    TerraDelegationsStrategy,
    CardanoDelegationsStrategy,
    SolanaDelegationsStrategy,
  ],
})
export class BalancesModule {}
