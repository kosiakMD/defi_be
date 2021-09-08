import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PoolsModule } from '../pools/pools.module';
import { TheGraphModule } from '../thegraph/theGraphModule';
import { VaultsModule } from '../vaults/vaults.module';
import { DatabaseService } from './db/database.service';
import { DatabaseTransactionManager } from './db/database.transaction.manager';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TheGraphModule,
    forwardRef(() => PoolsModule),
    forwardRef(() => VaultsModule),
  ],
  providers: [
    DatabaseService,
    JobsService,
    DatabaseTransactionManager,
  ],
  exports: [DatabaseService],
})
export class JobsModule {}
