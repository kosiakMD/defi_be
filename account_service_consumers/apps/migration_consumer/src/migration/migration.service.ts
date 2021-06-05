import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from '../logger/logger.service';
import { AssetsStore } from '../store/assets.store';
import { AssetsTransfersStore } from '../store/assettransfers.store';
import { toTransfer } from '../templates/transfers.template';
import { MigrationEvent } from './types/events';

@Injectable()
export class MigrationService {

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly assetsStore: AssetsStore,
    private readonly assetsTransfersStore: AssetsTransfersStore,
  ) {}

  async migrateEvent(event: MigrationEvent): Promise<number> {
    const transfer = toTransfer(event)
    if (transfer) {
      this.logger.debug(
        `converted event to transfer, for asset [${event.assetId}], template [${event.template}]`,
        'migration.service',
      );

      await this.assetsTransfersStore.insert(transfer)
      await this.assetsStore.incrementTransfersCount(event.assetId, 1)
      return 1
    }
    return 0
  }
}
