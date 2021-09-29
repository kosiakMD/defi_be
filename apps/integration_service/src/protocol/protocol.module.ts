import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AccountModule } from '../account/account.module';
import { ChainModule } from '../chain/chain.module';
import { PriceModule } from '../price/price.module';
import { Web3Service } from '../quickswap/web3/web3.service';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { ProtocolService } from './protocol.service';
import AaveProtocolV2 from './protocols/aaveProtocolV2';
import AutofarmProtocol from './protocols/autofarmProtocol';
import { Mapper } from './protocols/mappers/mapper';
import { PancakeModule } from './protocols/pancake/pancake.module';
import PancakeProtocolV1 from './protocols/pancake/pancakeProtocolV1';
import QuickswapProtocol from './protocols/quickswapProtocol';
import SpookySwapProtocol from './protocols/spookyswapProtocol';
import PangolinProtocol from './protocols/uniswapLike/pangolinProtocol';
import SushiswapProtocolV2 from './protocols/uniswapLike/sushiswapProtocolV2';
import UniswapProtocolV2 from './protocols/uniswapLike/uniswapProtocolV2';
import UniswapProtocolV3 from './protocols/uniswapProtocolV3';

// TODO to add a new Protocol just add it here and at ProtocolService constructor
const ProtocolList = [
  AaveProtocolV2,
  AutofarmProtocol,
  PangolinProtocol,
  PancakeProtocolV1,
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
    ThegraphModule,
    // PangolinModule,
    // SushiswapModule,
    // SpookyswapModule,
    // AutofarmModule,
    // QuickswapModule,
    ThegraphModule,
    ChainModule,
    PancakeModule, // TODO: m.b. delete for pancakeV1
    Web3Service, // TODO: quickswap
  ],
  providers: [...ProtocolList, ProtocolService, Mapper, Web3Service],
  exports: [ProtocolService],
})
export class ProtocolModule {}
