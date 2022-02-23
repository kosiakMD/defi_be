import * as redisStore from 'cache-manager-redis-store';

import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MicroservicesModule } from '../microservices/microservices.module';
import { MultifarmGraphqlService } from './adapters/multifarm/multifarm.graphql.service';
import { FarmEntity } from './entities/farm.entity';
import { OpportunityEntity } from './entities/opportunity.entity';
import { FarmRepository } from './repositories/farm.repository';
import { OpportunityRepository } from './repositories/opportunity.repository';
import { OpportunityAdapterService } from './services/opportunity.adapter.service';
import { OpportunityService } from './services/opportunity.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OpportunityEntity,
      OpportunityRepository,
      FarmEntity,
      FarmRepository,
    ]),
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        ttl: configService.get('redis.ttl'),
        host: configService.get('redis.host'),
        port: configService.get('redis.port'),
        // eslint-disable-next-line camelcase
        auth_pass: configService.get('redis.auth'),
      }),
      inject: [ConfigService],
    }),
    MicroservicesModule,
    HttpModule,
  ],
  controllers: [],
  providers: [
    OpportunityService,
    OpportunityAdapterService,
    // Adapter Helpers
    MultifarmGraphqlService,
  ],
  exports: [OpportunityService],
})
export class OpportunityModule {}
