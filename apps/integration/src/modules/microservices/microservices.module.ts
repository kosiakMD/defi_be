import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HttpModule } from '@app/common';
import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AbiModule } from '../../framework/support/EVM/AbiModule/abi.module';
import { CurveAssetsManager } from '../../framework/support/assets/curve.assets.manager';
import { CardanoService } from '../protocols/helpers/cardano/cardano.service';
import { MuesliSwapAccountService } from './MuesliSwapAccountService';
import { MuesliSwapPriceService } from './MuesliSwapPriceService';
import { AccountService } from './account.service';
import { AssetService } from './asset.service';
import { EllipsisAssetService } from './ellipsis.asset.service';
import { FakeAssetService } from './fake.asset.service';
import { MuesliSwapAssetService } from './muesliswap.asset.service';
import { PriceService } from './price.service';
import { Puppeteer } from './puppeteer';
import { SolanaAssetService } from './solana.asset.service';
import { SonarAssetService } from './sonar.asset.service';
import { SynapseStrategy } from './strategies/synapse.asset.strategy';
import { UniswapV2LpStrategy } from './strategies/uniswap.v2.asset.strategy';
import { SynapseAssetService } from './synapse.asset.service';
import { UniswapV2AssetService } from './uniswap.asset.service';
import { YetiAssetService } from './yeti.asset.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(),
    HttpModule,
    AbiModule, // temp for fake asset service
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
    AssetService,
    // Fake Asset Service... externally sourced (account service or other)
    FakeAssetService,
    MuesliSwapAssetService,
    EllipsisAssetService,
    SynapseAssetService,
    UniswapV2AssetService,
    SolanaAssetService,
    SonarAssetService,
    YetiAssetService,
    // Strategies
    UniswapV2LpStrategy,
    SynapseStrategy,

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
    AssetService,
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
