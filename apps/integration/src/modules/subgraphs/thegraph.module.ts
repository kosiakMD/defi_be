import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { HttpModule } from '@app/common';

import { AlpacaSubgraph } from './subgraphs/alpaca.subgraph';
import { BlocksSubgraph } from './subgraphs/blocks.subgraph';
import { MinswapSubgraph } from './subgraphs/minswap.subgraph';
import { PancakeSubgraph } from './subgraphs/pancake.subgraph';
import { Pancakev2MainStakingSubgraph } from './subgraphs/pancakev2.main.staking.subgraph';
import { PangolinSubgraph } from './subgraphs/pangolin.subgraph';
import { QuickswapSubgraph } from './subgraphs/quickswap.subgraph';
import { SpookyswapAceLabSubgraph } from './subgraphs/spookyswap.acelab.subgraph';
import { SpookyswapFarmSubgraph } from './subgraphs/spookyswap.farm.subgraph';
import { SundaeSwapSubgraph } from './subgraphs/sundaeswap.subgraph';
import { SushiSwapBentoBoxSubgraph } from './subgraphs/sushiswap.bentobox.subgraph';
import { SushiSwapExchangeSubgraph } from './subgraphs/sushiswap.exchange.subgraph';
import { SushiSwapMasterChefSubgraph } from './subgraphs/sushiswap.masterchef.subgraph';
import { SushiSwapMasterChefV2Subgraph } from './subgraphs/sushiswap.masterchef.v2.subgraph';
import { SushiSwapMiniChefSubgraph } from './subgraphs/sushiswap.minichef.subgraph';
import { SushiSwapSushiBarSubgraph } from './subgraphs/sushiswap.sushibar.subgraph';
import { UniswapSubgraph } from './subgraphs/uniswap.subgraph';
import { UniswapV3Subgraph } from './subgraphs/uniswap.v3.subgraph';
import { YearnV1Subgraph } from './subgraphs/yearn.v1.subgraph';
import { YearnV2Subgraph } from './subgraphs/yearn.v2.subgraph';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get('REDIS_CACHE_TTL') || 150,
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        // eslint-disable-next-line camelcase
        auth_pass: configService.get('REDIS_AUTH'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    BlocksSubgraph,
    PancakeSubgraph,
    PangolinSubgraph,
    QuickswapSubgraph,
    SpookyswapAceLabSubgraph,
    SpookyswapFarmSubgraph,
    SushiSwapMasterChefSubgraph,
    SushiSwapMasterChefV2Subgraph,
    SushiSwapMiniChefSubgraph,
    SushiSwapExchangeSubgraph,
    SushiSwapSushiBarSubgraph,
    SushiSwapBentoBoxSubgraph,
    UniswapSubgraph,
    UniswapV3Subgraph,
    AlpacaSubgraph,
    YearnV1Subgraph,
    YearnV2Subgraph,
    Pancakev2MainStakingSubgraph,
    SundaeSwapSubgraph,
    MinswapSubgraph,
  ],
  exports: [
    AlpacaSubgraph,
    BlocksSubgraph,
    PancakeSubgraph,
    PangolinSubgraph,
    QuickswapSubgraph,
    SpookyswapAceLabSubgraph,
    SpookyswapFarmSubgraph,
    SushiSwapMasterChefSubgraph,
    SushiSwapMasterChefV2Subgraph,
    SushiSwapMiniChefSubgraph,
    SushiSwapExchangeSubgraph,
    SushiSwapSushiBarSubgraph,
    SushiSwapBentoBoxSubgraph,
    UniswapSubgraph,
    UniswapV3Subgraph,
    AlpacaSubgraph,
    YearnV1Subgraph,
    YearnV2Subgraph,
    Pancakev2MainStakingSubgraph,
    SundaeSwapSubgraph,
    MinswapSubgraph,
  ],
})
export class ThegraphModule {}
