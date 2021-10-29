import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StoreService } from './store.service';
import { TrackedVault } from './tracked.vault.entity';
import { TrackedVaultItem } from './tracked.vault.item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TrackedVault, TrackedVaultItem])],
  providers: [StoreService],
  exports: [TypeOrmModule, StoreService],
})
export class StoreModule {}
