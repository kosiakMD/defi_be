import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Web3ProviderService } from '@app/common/web3provider';

import { AccountModule } from '../account/account.module';
import { ChainModule } from '../chain/chain.module';
import { PriceModule } from '../price/price.module';
import { Web3Service } from '../quickswap/web3/web3.service';
import { AmmPlgSubgraph } from '../sushiswap/ammPlgSubgraph';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { ProtocolService } from './protocol.service';
import AaveProtocolV2 from './protocols/aaveProtocolV2';
import { AlpacaApiService } from './protocols/alpaca/services/alpaca.api.service';
import AlpacaProtocol from './protocols/alpacaProtocol';
import { AutofarmApiService } from './protocols/autofarm/services/autofarm.api.service';
import AutofarmProtocol from './protocols/autofarmProtocol';
import { Mapper } from './protocols/mappers/mapper';
import { PancakeModule } from './protocols/pancake/pancake.module';
import PancakeProtocolV2 from './protocols/pancake/pancake.protocol.v2';
import PancakeProtocolV1 from './protocols/pancake/pancakeProtocolV1';
import QuickswapProtocol from './protocols/quickswapProtocol';
import SpookySwapProtocol from './protocols/spookyswapProtocol';
import SushiswapProtocolV2 from './protocols/sushiswapProtocolV2';
import PangolinProtocol from './protocols/uniswapLike/pangolinProtocol';
import UniswapProtocolV2 from './protocols/uniswapLike/uniswapProtocolV2';
import UniswapProtocolV3 from './protocols/uniswapProtocolV3';
import YearnProtocolV1 from './protocols/yearnProtocolV1';
import YearnProtocolV2 from './protocols/yearnProtocolV2';

// TODO to add a new Protocol just add it here and at ProtocolService constructor
const ProtocolList = [
  AaveProtocolV2,
  AlpacaProtocol,
  AutofarmProtocol,
  PancakeProtocolV1,
  PancakeProtocolV2,
  PangolinProtocol,
  QuickswapProtocol,
  SpookySwapProtocol,
  SushiswapProtocolV2,
  UniswapProtocolV2,
  UniswapProtocolV3,
  YearnProtocolV1,
  YearnProtocolV2,
];

@Module({
  imports: [
    AccountModule,
    PriceModule,
    HttpModule,
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
    ChainModule,
    PancakeModule, // TODO: m.b. delete for pancakeV1
  ],
  providers: [
    ...ProtocolList,
    ProtocolService,
    Mapper,
    Web3Service,
    AlpacaApiService,
    AutofarmApiService,
    Web3ProviderService,
    AmmPlgSubgraph,
  ],
  exports: [ProtocolService],
})
export class ProtocolModule {}
