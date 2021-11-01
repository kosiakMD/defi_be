import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SettingsService } from './service/settings.service';
import { Setting } from './setting.entity';
import { StoreService } from './store.service';
import { TrackedVault } from './tracked.vault.entity';
import { TrackedVaultItem } from './tracked.vault.item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TrackedVault, TrackedVaultItem, Setting])],
  providers: [StoreService, SettingsService],
  exports: [TypeOrmModule, StoreService, SettingsService],
})
export class StoreModule {}
