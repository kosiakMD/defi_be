import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsEntity } from './entities/assets.entity';
import { AssetsRepository } from './repositories/assets.repository';
import { AssetsStore } from './assets.store';
import { UtilsDatabase } from './utils.database';
import { AssetsTransfersStore } from './assettransfers.store';
import { AssetTransfersRepository } from './repositories/assettransfers.repository';
import { AssetTransfersEntity } from './entities/assettransfers.entity';
import { ApprovalsEntity } from './entities/approvals.entity';
import { ApprovalsRepository } from './repositories/approvals.repository';
import { ApprovalsStore } from './approvals.store';

@Module({
  imports: [TypeOrmModule.forFeature([AssetsEntity, AssetTransfersEntity, ApprovalsEntity])],
  providers: [UtilsDatabase, AssetsRepository, AssetTransfersRepository, ApprovalsRepository, AssetsStore, ApprovalsStore, AssetsTransfersStore],
  exports: [AssetsStore, AssetsTransfersStore, ApprovalsStore],
})
export class StoreModule {}
