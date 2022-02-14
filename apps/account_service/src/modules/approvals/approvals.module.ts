import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalsEntity } from 'jobs/migration_events_consumer/src/store/entities/approvals.entity';
import { AssetsEntity } from 'jobs/migration_events_consumer/src/store/entities/assets.entity';
import { ApprovalsRepository } from 'jobs/migration_events_consumer/src/store/repositories/approvals.repository';
import { AssetsRepository } from 'jobs/migration_events_consumer/src/store/repositories/assets.repository';
import { StoreModule } from 'jobs/migration_events_consumer/src/store/store.module';

import { ApprovalsController } from '../../controllers/approvals.controller';
import { BlacklistModule } from '../blacklists/blacklist.module';
import { BlacklistService } from '../blacklists/blacklist.service';
import { AddressesRepository } from '../blacklists/repositories/addresses.repository';
import { ApprovalsService } from './approvals.service';

@Module({
  imports: [
    StoreModule,
    ConfigModule,
    HttpModule,
    BlacklistModule,
    TypeOrmModule.forFeature([AssetsEntity, ApprovalsEntity,ApprovalsRepository, AssetsRepository]),
    CacheModule.register(),
  ],
  providers: [ApprovalsService, BlacklistService, AddressesRepository, ApprovalsRepository, AssetsRepository],
  controllers: [ApprovalsController],
})
export class ApprovalsModule {}
