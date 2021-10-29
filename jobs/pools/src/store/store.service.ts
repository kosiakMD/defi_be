import { getConnection, Repository } from 'typeorm';

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
    // todo: temporary solution
    const connection = await getConnection();
    if (!connection.isConnected) {
      await connection.connect();
    }

    const itemWithId: TrackedVaultItem = await this.trackedVaultItemRepository.save(item);
    return await this.trackedVaultItemRepository.findOne(itemWithId.id);
  }

  async updateMapping(mapping: TrackedVault): Promise<TrackedVault> {
    // todo: temporary solution
    const connection = await getConnection();
    if (!connection.isConnected) {
      await connection.connect();
    }

    await this.trackedVaultRepository.update(mapping.id, mapping);
    return await this.trackedVaultRepository.findOne(mapping.id);
  }
}
