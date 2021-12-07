import * as redisStore from 'cache-manager-redis-store';

import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Web3ProviderService } from '@app/common/web3provider';

import { ChainModule } from '../chain/chain.module';
import { MicroservicesModule } from '../microservices/microservices.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { ProtocolService } from './protocol.service';
import AaveProtocolV2 from './protocols/aaveProtocolV2';
import { AlpacaApiService } from './protocols/alpaca/services/alpaca.api.service';
import AlpacaProtocol from './protocols/alpacaProtocol';
import { AutofarmStaking } from './protocols/autofarm/autofarm.staking';
import { AutofarmApiService } from './protocols/autofarm/services/autofarm.api.service';
import AutofarmProtocol from './protocols/autofarmProtocol';
import { EllipsisPools } from './protocols/ellipsis/ellipsis.pools';
import EllipsisProtocol from './protocols/ellipsis/ellipsis.protocol';
import { EllipsisStaking } from './protocols/ellipsis/ellipsis.staking';
import { LiquidityPools } from './protocols/features/liquidity-pools';
import { Mapper } from './protocols/mappers/mapper';
import { PancakeV2Legacy } from './protocols/pancake/pancake-v2.legacy';
import { PancakeV2Staking } from './protocols/pancake/pancake-v2.staking';
import PancakeProtocol from './protocols/pancake/pancake.protocol';
import QuickswapProtocol from './protocols/quickswap/quickswapProtocol';
import RaydiumProtocol from './protocols/raydium/raydium.protocol';
import SpookySwapProtocol from './protocols/spookyswapProtocol';
import SushiswapProtocolV2 from './protocols/sushiswapProtocolV2';
import { TraderJoePools } from './protocols/traderjoe/trader-joe.pools';
import TraderJoeProtocol from './protocols/traderjoe/trader-joe.protocol';
import { TraderJoeStaking } from './protocols/traderjoe/trader-joe.staking';
import PangolinProtocol from './protocols/uniswapLike/pangolinProtocol';
import UniswapProtocolV2 from './protocols/uniswapLike/uniswapProtocolV2';
import UniswapProtocolV3 from './protocols/uniswapProtocolV3';
import YearnProtocolV1 from './protocols/yearnProtocolV1';
import YearnProtocolV2 from './protocols/yearnProtocolV2';

// TODO to add a new Protocol just add it here and at ProtocolService constructor
const ProtocolList = [
  AaveProtocolV2,
  AlpacaProtocol,
  PangolinProtocol,
  QuickswapProtocol,
  SpookySwapProtocol,
  SushiswapProtocolV2,
  UniswapProtocolV2,
  UniswapProtocolV3,
  YearnProtocolV1,
  YearnProtocolV2,
  RaydiumProtocol,
];

const Ellipsis = [EllipsisProtocol, EllipsisStaking, EllipsisPools];
const TraderJoe = [TraderJoeProtocol, TraderJoePools, TraderJoeStaking];
const Pancake = [PancakeProtocol, PancakeV2Staking, PancakeV2Legacy];
const Autofarm = [AutofarmProtocol, AutofarmStaking];

@Module({
  imports: [
    MicroservicesModule,
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
    ChainModule,
  ],
  providers: [
    ...ProtocolList,
    ...TraderJoe,
    ...Pancake,
    ...Ellipsis,
    ...Autofarm,
    ProtocolService,
    Mapper,
    AlpacaApiService,
    AutofarmApiService,
    Web3ProviderService,
    LiquidityPools,
  ],
  exports: [ProtocolService],
})
export class ProtocolModule {}
