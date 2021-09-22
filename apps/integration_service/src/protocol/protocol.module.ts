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
import AutofarmProtocol from './protocols/autofarmProtocol';
import PancakeProtocolV1 from './protocols/pancakeProtocolV1';
import PangolinProtocol from './protocols/pangolinProtocol';
import { QuickswapProtocol } from './protocols/quickswapProtocol';
import SpookySwapProtocol from './protocols/spookyswapProtocol';
import SushiswapProtocolV2 from './protocols/sushiswapProtocolV2';
import UniswapProtocolV2 from './protocols/uniswapProtocolV2';

// TODO to add a new Protocol just add it here and at ProtocolService constructor
const ProtocolList = [
  AutofarmProtocol,
  PancakeProtocolV1,
  PangolinProtocol,
  QuickswapProtocol,
  SpookySwapProtocol,
  SushiswapProtocolV2,
  UniswapProtocolV2,
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
