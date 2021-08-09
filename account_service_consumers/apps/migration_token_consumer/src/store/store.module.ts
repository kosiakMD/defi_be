import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApprovalsStore } from './approvals.store';
import { AssetsStore } from './assets.store';
import { AssetsTransfersStore } from './assettransfers.store';
import { ApprovalsEntity } from './entities/approvals.entity';
import { AssetsEntity } from './entities/assets.entity';
import { AssetTransfersEntity } from './entities/assettransfers.entity';
import { ApprovalsRepository } from './repositories/approvals.repository';
import { AssetsRepository } from './repositories/assets.repository';
import { AssetTransfersRepository } from './repositories/assettransfers.repository';
import { UtilsDatabase } from './utils.database';

@Module({
  imports: [TypeOrmModule.forFeature([AssetsEntity, AssetTransfersEntity, ApprovalsEntity])],
  providers: [
    UtilsDatabase,
    AssetsRepository,
    AssetTransfersRepository,
    ApprovalsRepository,
    AssetsStore,
    ApprovalsStore,
    AssetsTransfersStore,
  ],
  exports: [AssetsStore, AssetsTransfersStore, ApprovalsStore],
})
export class StoreModule {}
