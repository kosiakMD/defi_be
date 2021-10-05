import * as redisStore from 'cache-manager-redis-store';
import { Web3Provider } from 'src/chain/web3.provider';
import { PangolinModule } from 'src/pangolin/pangolin.module';

import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AccountModule } from '../account/account.module';
import { AlpacaModule } from '../alpaca/alpaca.module';
import { AutofarmModule } from '../autofarm/autofarm.module';
import { ChainModule } from '../chain/chain.module';
import { Mapper } from '../mappers/mapper';
import { PancakeModule } from '../pancake/pancake.module';
import { PriceModule } from '../price/price.module';
import { QuickswapModule } from '../quickswap/quickswap.module';
import { SushiswapModule } from '../sushiswap/sushiswap.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { ProtocolService } from './protocol.service';
import AaveProtocolV2 from './protocols/aaveProtocolV2';
import AlpacaProtocol from './protocols/alpacaProtocol';
import AutofarmProtocol from './protocols/autofarmProtocol';
import PancakeProtocolV1 from './protocols/pancakeProtocolV1';
import PancakeProtocolV2 from './protocols/pancakeProtocolV2';
import PangolinProtocol from './protocols/pangolinProtocol';
import QuickswapProtocol from './protocols/quickswapProtocol';
import SpookySwapProtocol from './protocols/spookyswapProtocol';
import SushiswapProtocolV2 from './protocols/sushiswapProtocolV2';
import UniswapProtocolV2 from './protocols/uniswapProtocolV2';
import UniswapProtocolV3 from './protocols/uniswapProtocolV3';

// TODO to add a new Protocol just add it here and at ProtocolService constructor
const ProtocolList = [
  AaveProtocolV2,
  AutofarmProtocol,
  PancakeProtocolV1,
  PancakeProtocolV2,
  PangolinProtocol,
  QuickswapProtocol,
  SpookySwapProtocol,
  SushiswapProtocolV2,
  UniswapProtocolV2,
  UniswapProtocolV3,
  AlpacaProtocol,
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
    PancakeModule,
    ThegraphModule,
    PangolinModule,
    SushiswapModule,
    AutofarmModule,
    QuickswapModule,
    AlpacaModule,
    ThegraphModule,
    ChainModule,
  ],
  providers: [...ProtocolList, ProtocolService, Mapper, Web3Provider],
  exports: [ProtocolService],
})
export class ProtocolModule {}
