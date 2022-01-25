import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { TrackedVault } from './tracked.vault.entity';
import { TrackedVaultItem } from './tracked.vault.item.entity';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(TrackedVaultItem)
    private trackedVaultItemRepository: Repository<TrackedVaultItem>,
    @InjectRepository(TrackedVault)
    private trackedVaultRepository: Repository<TrackedVault>,
  ) {}

  async saveItem(item: TrackedVaultItem): Promise<TrackedVaultItem> {
    const itemWithId: TrackedVaultItem = await this.trackedVaultItemRepository.save(item);
    return await this.trackedVaultItemRepository.findOne(itemWithId.id);
  }

  async updateMapping(trackedVault: TrackedVault): Promise<TrackedVault> {
    trackedVault.updatedAt = new Date();

    await this.trackedVaultRepository.update(trackedVault.id, trackedVault);
    return await this.trackedVaultRepository.findOne(trackedVault.id);
  }
}
