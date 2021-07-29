import { Module } from '@nestjs/common';

import { ChainModule } from '../chain/chain.module';
import { StoreModule } from '../store/store.module';
import { MigrationController } from './migration.controller';
import { MigrationService } from './migration.service';

@Module({
  imports: [ChainModule, StoreModule],
  controllers: [MigrationController],
  providers: [MigrationService],
  exports: [MigrationService],
})
export class MigrationModule {}
