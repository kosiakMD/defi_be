import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from '../logger/logger.service';
import { AssetsStore } from '../store/assets.store';
import { AssetsTransfersStore } from '../store/assettransfers.store';
import { toTransfer } from '../templates/transfers.template';
import { MigrationEvent } from './types/events';
import { AssetsEntity } from '../store/entities/assets.entity';
import { AssetTransfersEntity } from '../store/entities/assettransfers.entity';

@Injectable()
export class MigrationService {

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly assetsStore: AssetsStore,
    private readonly assetsTransfersStore: AssetsTransfersStore,
  ) {
  }

  async migrateEvent(event: MigrationEvent): Promise<number> {
    let assetTransfer: AssetTransfersEntity = toTransfer(event);
    if (!assetTransfer) {
      this.logger.debug(`skip transfer handling as parsed transfer is null [${JSON.stringify(event)}]`)
      return 0;
    }
    let asset: AssetsEntity = await this.assetsStore.findByAddressAndChainId(event.address, event.chainId);
    if (!asset) {
      asset = new AssetsEntity();
      asset.address = event.address;
      asset.name = null;
      asset.symbol = null;
      asset.decimals = null;
      asset.icon = null;
      asset.chainId = event.chainId;
      asset.template = null;
      asset.isLp = null;
      asset.projectId = null;
      asset = await this.assetsStore.save(asset);
    }

    assetTransfer.assetId = asset.id;
    await this.assetsTransfersStore.save(assetTransfer);
    return 1;
  }
}
