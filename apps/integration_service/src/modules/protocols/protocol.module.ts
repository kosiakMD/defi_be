import * as redisStore from 'cache-manager-redis-store';

import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { ChainsModule } from '../chains/chains.module';
import { MicroservicesModule } from '../microservices/microservices.module';
import { ThegraphModule } from '../subgraphs/thegraph.module';
import { LiquidityPools } from './features/liquidity-pools';
import { Mapper } from './helpers/mappers/mapper';
import { ProtocolService } from './protocol.service';
import AaveProtocolV2 from './protocols/aaveProtocolV2';
import { AlpacaApiService } from './protocols/alpaca/alpaca.api.service';
import AlpacaProtocol from './protocols/alpacaProtocol';
import { AutofarmApiService } from './protocols/autofarm/autofarm.api.service';
import { AutofarmStaking } from './protocols/autofarm/autofarm.staking';
import AutofarmProtocol from './protocols/autofarmProtocol';
import BadgerProtocol from './protocols/badger/badger.protocol';
import { BadgerStaking } from './protocols/badger/badger.staking';
import { BeefyProtocol } from './protocols/beefyProtocol';
import { CompoundProtocol } from './protocols/compoundProtocol';
import { CurvePools } from './protocols/curve/curve.pools';
import CurveProtocol from './protocols/curve/curve.protocol';
import { CurveStaking } from './protocols/curve/curve.staking';
import { DefiKingdomsPools } from './protocols/defikingdoms/defikingdoms.pools';
import DefiKingdomsProtocol from './protocols/defikingdoms/defikingdoms.protocol';
import { DefiKingdomsStaking } from './protocols/defikingdoms/defikingdoms.staking';
import { DefiKingdomsLocked } from './protocols/defikingdoms/defikingdoms.locked';
import { EllipsisPools } from './protocols/ellipsis/ellipsis.pools';
import EllipsisProtocol from './protocols/ellipsis/ellipsis.protocol';
import { EllipsisStaking } from './protocols/ellipsis/ellipsis.staking';
import { MojitoswapPools } from './protocols/mojitoswap/mojitoswap.pools';
import MojitoswapProtocol from './protocols/mojitoswap/mojitoswap.protocol';
import { MojitoswapStaking } from './protocols/mojitoswap/mojitoswap.staking';
import { EtherscanService } from './protocols/pancake/etherscan.service';
import { PancakeV2Legacy } from './protocols/pancake/pancake-v2.legacy';
import { PancakeV2Staking } from './protocols/pancake/pancake-v2.staking';
import PancakeProtocol from './protocols/pancake/pancake.protocol';
import PancakeProtocolV1 from './protocols/pancake/pancake.protocol.v1';
import { PancakeService } from './protocols/pancake/pancake.service';
import { PoolsService } from './protocols/pancake/pools.service';
import { ScanApi } from './protocols/pancake/scan.api';
import { PangolinPools } from './protocols/pangolin/pangolin.pools';
import { PangolinStaking } from './protocols/pangolin/pangolin.staking';
import { PangolinV2Protocol } from './protocols/pangolin/pangolinV2.protocol';
import QuickswapProtocol from './protocols/quickswap/quickswapProtocol';
import RaydiumProtocol from './protocols/raydium/raydium.protocol';
import { RaydiumStaking } from './protocols/raydium/raydium.staking';
import SpookySwapProtocol from './protocols/spookyswap/spookyswapProtocol';
import SushiswapProtocolV2 from './protocols/sushiswapProtocolV2';
import { TraderJoeFarm } from './protocols/traderjoe/trader-joe.farm';
import { TraderJoeLending } from './protocols/traderjoe/trader-joe.lending';
import { TraderJoePools } from './protocols/traderjoe/trader-joe.pools';
import TraderJoeProtocol from './protocols/traderjoe/trader-joe.protocol';
import { TraderJoeStaking } from './protocols/traderjoe/trader-joe.staking';
import PangolinProtocol from './protocols/uniswapLike/pangolinProtocol';
import UniswapProtocolV2 from './protocols/uniswapLike/uniswapProtocolV2';
import UniswapProtocolV3 from './protocols/uniswapProtocolV3';
import VenusProtocol from './protocols/venusProtocol';
import { ViperswapPools } from './protocols/viperswap/viperswap.pools';
import ViperswapProtocol from './protocols/viperswap/viperswap.protocol';
import { ViperswapStaking } from './protocols/viperswap/viperswap.staking';
import { ViperswapLocked } from './protocols/viperswap/viperswap.locked';
import { VVSPools } from './protocols/vvs/vvs.pools';
import { VVSProtocol } from './protocols/vvs/vvs.protocol';
import { VVSStaking } from './protocols/vvs/vvs.staking';
import WePiggyProtocol from './protocols/wepiggyProtocol';
import YearnProtocolV1 from './protocols/yearnProtocolV1';
import YearnProtocolV2 from './protocols/yearnProtocolV2';
import SaberProtocol from './protocols/saber/saber.protocol'
import { SaberStaking } from './protocols/saber/saber.staking'

// TODO to add a new Protocol just add it here and at ProtocolService constructor
const ProtocolList = [
  AaveProtocolV2,
  AlpacaProtocol,
  BeefyProtocol,
  CompoundProtocol,
  PangolinProtocol,
  QuickswapProtocol,
  SpookySwapProtocol,
  SushiswapProtocolV2,
  UniswapProtocolV2,
  UniswapProtocolV3,
  YearnProtocolV1,
  YearnProtocolV2,
  RaydiumProtocol,
  VenusProtocol,
  WePiggyProtocol,
  SaberProtocol,
];

const Pangolin = [PangolinV2Protocol, PangolinStaking, PangolinPools];
const Ellipsis = [EllipsisProtocol, EllipsisStaking, EllipsisPools];
const TraderJoe = [
  TraderJoeProtocol,
  TraderJoePools,
  TraderJoeStaking,
  TraderJoeFarm,
  TraderJoeLending,
];
const Pancake = [
  PancakeProtocol,
  PancakeV2Staking,
  PancakeV2Legacy,
  PancakeProtocolV1,
  PancakeService,
  PoolsService,
  EtherscanService,
  ScanApi,
];
const Curve = [CurveProtocol, CurvePools, CurveStaking];
const Autofarm = [AutofarmProtocol, AutofarmStaking];
const Raydium = [RaydiumStaking];
const Saber = [SaberProtocol, SaberStaking];
const Viperswap = [
  ViperswapProtocol, 
  ViperswapStaking, 
  ViperswapPools,
  ViperswapLocked,
];
const Badger = [BadgerProtocol, BadgerStaking];
const DefiKingdoms = [
  DefiKingdomsProtocol, 
  DefiKingdomsPools, 
  DefiKingdomsStaking,
  DefiKingdomsLocked,
];
const Mojitoswap = [MojitoswapProtocol, MojitoswapStaking, MojitoswapPools];
const VVS = [VVSProtocol, VVSStaking, VVSPools];

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
    ChainsModule,
  ],
  providers: [
    ...ProtocolList,
    ...TraderJoe,
    ...Pancake,
    ...Ellipsis,
    ...Autofarm,
    ...Raydium,
    ...Viperswap,
    ...Badger,
    ...DefiKingdoms,
    ...VVS,
    ...Pangolin,
    ...Curve,
    ...Mojitoswap,
    ...Saber,
    ProtocolService,
    Mapper,
    AlpacaApiService,
    AutofarmApiService,
    Web3ProviderService,
    MulticallAggregator,
    LiquidityPools,
  ],
  exports: [ProtocolService],
})
export class ProtocolModule {}
