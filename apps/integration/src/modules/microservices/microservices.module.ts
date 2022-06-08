import * as redisStore from 'cache-manager-redis-store';

import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { CurveAssetsManager } from '../../framework/support/assets/curve.assets.manager';
import { CardanoService } from '../protocols/helpers/cardano/cardano.service';
import { MuesliSwapAccountService } from './MuesliSwapAccountService';
import { MuesliSwapPriceService } from './MuesliSwapPriceService';
import { AccountService } from './account.service';
import { EllipsisAssetService } from './ellipsis.asset.service';
// import { AssetService } from './asset.service';
import { FakeAssetService } from './fake.asset.service';
import { MuesliSwapAssetService } from './muesliswap.asset.service';
import { PriceService } from './price.service';
import { Puppeteer } from './puppeteer';
import { SolanaAssetService } from './solana.asset.service';
import { SonarAssetService } from './sonar.asset.service';
import { SynapseAssetService } from './synapse.asset.service';
import { UniswapV2AssetService } from './uniswap.asset.service';
import { YetiAssetService } from './yeti.asset.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(),
    HttpModule,
    CacheModule.registerAsync({
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
  ],
  providers: [
    // Asset Service
    // AssetService,
    FakeAssetService,
    MuesliSwapAssetService,
    EllipsisAssetService,
    SynapseAssetService,
    UniswapV2AssetService,
    SolanaAssetService,
    SonarAssetService,
    YetiAssetService,
    // Account Services
    AccountService,
    MuesliSwapAccountService,
    // Price Services
    PriceService,
    MuesliSwapPriceService,

    // Helpers
    Puppeteer,
    CardanoService,
    CurveAssetsManager, // Required For EllipsisAssetService
    MulticallAggregator, // Required For EllipsisAssetService
    Web3ProviderService, // Required For EllipsisAssetService
  ],
  exports: [
    // AssetService,
    FakeAssetService,
    AccountService,
    EllipsisAssetService,
    MuesliSwapAccountService,
    MuesliSwapAssetService,
    SolanaAssetService,
    SonarAssetService,
    YetiAssetService,
    SynapseAssetService,
    UniswapV2AssetService,
    PriceService,
    MuesliSwapPriceService,
    Puppeteer,
    CardanoService,
  ],
})
export class MicroservicesModule {}
