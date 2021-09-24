import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AccountModule } from '../account/account.module';
import { AutofarmModule } from '../autofarm/autofarm.module';
import { ChainModule } from '../chain/chain.module';
import { Mapper } from '../mappers/mapper';
import { PangolinModule } from '../pangolin/pangolin.module';
import { PriceModule } from '../price/price.module';
import { QuickswapModule } from '../quickswap/quickswap.module';
import { SpookyswapModule } from '../spookyswap/spookyswap.module';
import { SushiswapModule } from '../sushiswap/sushiswap.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { ProtocolService } from './protocol.service';
import AaveProtocolV2 from './protocols/AaveProtocolV2';
import AutofarmProtocol from './protocols/autofarmProtocol';
import SpookySwapProtocol from './protocols/spookyswapProtocol';
import PangolinProtocol from './protocols/uniswapLike/pangolinProtocol';
import QuickswapProtocol from './protocols/uniswapLike/quickswapProtocol';
import SushiswapProtocolV2 from './protocols/uniswapLike/sushiswapProtocolV2';
import UniswapProtocolV2 from './protocols/uniswapLike/uniswapProtocolV2';
import UniswapProtocolV3 from './protocols/uniswapProtocolV3';

// TODO to add a new Protocol just add it here and at ProtocolService constructor
const ProtocolList = [
  AaveProtocolV2,
  AutofarmProtocol,
  PangolinProtocol,
  QuickswapProtocol,
  SpookySwapProtocol,
  SushiswapProtocolV2,
  UniswapProtocolV2,
  UniswapProtocolV3,
];

@Module({
  imports: [
    AccountModule,
    PriceModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get('REDIS_CACHE_TTL') || 300,
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        // eslint-disable-next-line camelcase
        auth_pass: configService.get('REDIS_AUTH'),
      }),
      inject: [ConfigService],
    }),
    // UniswapModule,
    ThegraphModule,
    PangolinModule,
    SushiswapModule,
    SpookyswapModule,
    // SushiswapModule,
    // SpookyswapModule,
    AutofarmModule,
    QuickswapModule,
    ThegraphModule,
    ChainModule,
  ],
  providers: [...ProtocolList, ProtocolService, Mapper],
  exports: [ProtocolService],
})
export class ProtocolModule {}
