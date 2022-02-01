import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IntegrationsController } from '../../controllers/integrations.controller';
import { IntegrationsControllerV2 } from '../../controllers/integrations.controller.v2';
import { ProtocolModule } from '../protocols/protocol.module';
import { ProjectsContractEntity } from './entities/projectsContract.entity';
import { ProjectsInfoEntity } from './entities/projectsInfo.entity';
import { TrackedVaultEntity } from './entities/trackedVault.entity';
import { FeaturesService } from './features.service';
import { IntegrationsService } from './integrations.service';
import { ProjectsContractRepository } from './repositories/projectsContract.repository';
import { TrackedVaultRepository } from './repositories/trackedVault.repository';

// TODO to add a new Protocol just add it here and at ProtocolService constructor

@Module({
  imports: [
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
    TypeOrmModule.forFeature([
      ProjectsContractRepository,
      TrackedVaultRepository,
      ProjectsContractEntity,
      ProjectsInfoEntity,
      TrackedVaultEntity,
    ]),
  ],
  providers: [IntegrationsService, FeaturesService],
  controllers: [IntegrationsController, IntegrationsControllerV2],
})
export class IntegrationsModule {}
