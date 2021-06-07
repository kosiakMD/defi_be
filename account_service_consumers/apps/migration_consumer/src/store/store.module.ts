import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsEntity } from './entities/assets.entity';
import { AssetsRepository } from './repositories/assets.repository';
import { AssetsStore } from './assets.store';
import { UtilsDatabase } from './utils.database';
import { AssetsTransfersStore } from './assettransfers.store';
import { AssetTransfersRepository } from './repositories/assettransfers.repository';
import { AssetTransfersEntity } from './entities/assettransfers.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AssetsEntity, AssetTransfersEntity])],
  providers: [AssetsRepository, AssetTransfersRepository, AssetsStore, UtilsDatabase, AssetsTransfersStore],
  exports: [AssetsStore, UtilsDatabase, AssetsTransfersStore],
})
export class StoreModule {}
