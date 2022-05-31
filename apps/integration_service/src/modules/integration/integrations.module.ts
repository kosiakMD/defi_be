import * as redisStore from 'cache-manager-redis-store';

import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Web3ProviderService, Web3SolanaProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { IntegrationsController } from '../../controllers/integrations.controller';
import { IntegrationsControllerV2 } from '../../controllers/integrations.controller.v2';
import { IntegrationsControllerV3 } from '../../controllers/integrations.controller.v3';
import { PlatformService } from '../../frameworks/services/platform.service';
import { CurveAssetsManager } from '../../frameworks/support/assets/curve-assets.manager';
import { AbiModule } from '../../frameworks/support/evm/abi-module/abi.module';
import { MicroservicesModule } from '../microservice/microservices.module';
import { ProtocolModule } from '../protocol/protocol.module';
import { ProjectsInfoEntity } from './entities/projects-info.entity';
import { FeaturesService } from './features.service';
import { IntegrationsService } from './integrations.service';
import { IntegrationsServiceV3Decorator } from './integrations.service.v3.decorator';

// TODO to add a new Protocol just add it here and at ProtocolService constructor

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
    ProtocolModule,
    AbiModule,
    TypeOrmModule.forFeature([ProjectsInfoEntity]),
  ].sort(),
  providers: [
    IntegrationsService,
    FeaturesService,
    PlatformService,
    MulticallAggregator,
    Web3ProviderService,
    Web3SolanaProviderService,
    IntegrationsServiceV3Decorator,
    CurveAssetsManager,
  ].sort(),
  controllers: [IntegrationsController, IntegrationsControllerV2, IntegrationsControllerV3],
})
export class IntegrationsModule {}
