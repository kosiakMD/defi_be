import * as redisStore from 'cache-manager-redis-store';

import { HttpModule, Module, CacheModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AlpacaSubgraph } from '../protocol/protocols/alpaca/services/alpaca.subgraph';
import { AutofarmSubgraph } from '../protocol/protocols/autofarm/services/autofarm.subgraph';
import { YearnV1Subgraph } from '../protocol/protocols/yearn/services/yearn.v1.subgraph';
import { YearnV2Subgraph } from '../protocol/protocols/yearn/services/yearn.v2.subgraph';
import { AmmPlgSubgraph } from '../sushiswap/ammPlgSubgraph';
import { AaveSubgraph } from './aave.subgraph';
import { BlocksSubgraph } from './blocks.subgraph';
import { PancakeSubgraph } from './pancake.subgraph';
import { Pancakev2MainStakingSubgraph } from './pancakev2.main.staking.subgraph';
import { PangolinSubgraph } from './pangolin.subgraph';
import { QuickswapSubgraph } from './quickswap.subgraph';
import { SpookyswapAceLabSubgraph } from './spookyswap.acelab.subgraph';
import { SpookyswapFarmSubgraph } from './spookyswap.farm.subgraph';
import { SushiswapSubgraph } from './sushiswap.subgraph';
import { UniswapSubgraph } from './uniswap.subgraph';
import { UniswapV3Subgraph } from './uniswap.v3.subgraph';

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
    AaveSubgraph,
    BlocksSubgraph,
    PancakeSubgraph,
    PangolinSubgraph,
    QuickswapSubgraph,
    SpookyswapAceLabSubgraph,
    SpookyswapFarmSubgraph,
    SushiswapSubgraph,
    UniswapSubgraph,
    UniswapV3Subgraph,
    AutofarmSubgraph,
    AlpacaSubgraph,
    YearnV1Subgraph,
    YearnV2Subgraph,
    Pancakev2MainStakingSubgraph,
    AmmPlgSubgraph,
  ],
  exports: [
    AaveSubgraph,
    BlocksSubgraph,
    PancakeSubgraph,
    PangolinSubgraph,
    QuickswapSubgraph,
    SpookyswapAceLabSubgraph,
    SpookyswapFarmSubgraph,
    SushiswapSubgraph,
    UniswapSubgraph,
    UniswapV3Subgraph,
    AutofarmSubgraph,
    AlpacaSubgraph,
    YearnV1Subgraph,
    YearnV2Subgraph,
    Pancakev2MainStakingSubgraph,
    AmmPlgSubgraph,
  ],
})
export class ThegraphModule {}
