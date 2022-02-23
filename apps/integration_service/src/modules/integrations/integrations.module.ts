import * as redisStore from 'cache-manager-redis-store';

import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SettingsEntity } from '../../../../../jobs/migration_chain_crawler/src/migrations/entities/settings.entity';
import { IntegrationsController } from '../../controllers/integrations.controller';
import { IntegrationsControllerV2 } from '../../controllers/integrations.controller.v2';
import { ProtocolModule } from '../protocols/protocol.module';
import { AbisEntity } from './entities/abis.entity';
import { ContractsEntity } from './entities/contracts.entity';
import { ProjectsEntity } from './entities/projects.entity';
import { ProjectsContractEntity } from './entities/projectsContract.entity';
import { ProjectsInfoEntity } from './entities/projectsInfo.entity';
import { TrackedVaultEntity } from './entities/trackedVault.entity';
import { FeaturesService } from './features.service';
import { IntegrationsService } from './integrations.service';
import { IntegrationsServiceV2 } from './integrations.service.v2';
import { ProjectsContractRepository } from './repositories/projectsContract.repository';
import { TrackedVaultRepository } from './repositories/trackedVault.repository';
import { AbiFetcherService } from './services/abi-fetcher.service';
import { AbisService } from './services/abis.service';
import { ContractsService } from './services/contracts.service';
import { ProjectsService } from './services/projects.service';
import { SettingsService } from './services/settings.service';
import { VaultLoaderDemo } from './services/vault-loader-demo';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { Web3ProviderService } from '@app/common/web3provider';
import { ChiefLoader } from './data/templates/chief/loader';
import { VaultLoader } from './data/templates/vault-loader';
import { MasterchiefLoader } from './fr/chief/masterchief.loader';

const demoServices = [VaultLoaderDemo];

@Module({
  imports: [
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
        entities: ['dist/**/*.entity{.ts,.js}'],
      }),
      inject: [ConfigService],
    }),
    ProtocolModule,
    TypeOrmModule.forFeature([
      ProjectsContractRepository,
      TrackedVaultRepository,
      ProjectsContractEntity,
      ProjectsInfoEntity,
      TrackedVaultEntity,
      SettingsEntity,
      ContractsEntity,
      ProjectsEntity,
      AbisEntity,
    ]),
  ],
  providers: [
    ...demoServices,
    IntegrationsService,
    IntegrationsServiceV2,
    FeaturesService,
    SettingsService,
    ContractsService,
    ProjectsService,
    VaultLoaderDemo,
    AbiFetcherService,
    AbisService,
    ChiefLoader,
    MulticallAggregator,
    Web3ProviderService,
    VaultLoader,
    MasterchiefLoader
  ],
  controllers: [IntegrationsController, IntegrationsControllerV2],
  exports: [TypeOrmModule, IntegrationsServiceV2],
})
export class IntegrationsModule {}
