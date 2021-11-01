import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Settings } from './settings.entity';
import { StoreService } from './store.service';
import { TrackedVault } from './tracked.vault.entity';
import { TrackedVaultItem } from './tracked.vault.item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TrackedVault, TrackedVaultItem, Settings])],
  providers: [StoreService],
  exports: [TypeOrmModule, StoreService],
})
export class StoreModule {}
