import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../logger/logger.service';
import { ApprovalsStore } from '../store/approvals.store';
import { AssetsStore } from '../store/assets.store';
import { AssetsTransfersStore } from '../store/assettransfers.store';
import { ApprovalsEntity } from '../store/entities/approvals.entity';
import { AssetsEntity } from '../store/entities/assets.entity';
import { AssetTransfersEntity } from '../store/entities/assettransfers.entity';
import { toEntity, TYPE_APPROVAL, TYPE_TRANSFER } from '../templates/events.template';
import { ETH_ADDRESS } from '../util/util';
import { AssetPublisherService } from './asset.publisher.service';
import { MigrationEvent } from './types/events';

@Injectable()
export class MigrationService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly assetsStore: AssetsStore,
    private readonly assetsTransfersStore: AssetsTransfersStore,
    private readonly approvalsStore: ApprovalsStore,
    private readonly assetPublisherService: AssetPublisherService,
  ) {}

  async migrateEvent(event: MigrationEvent): Promise<number> {
    const { entity, type } = toEntity(event);
    if (!entity) {
      this.logger.debug(
        `skip transfer handling as parsed transfer is null [${JSON.stringify(event)}]`,
      );
      return 0;
    }

    let asset: AssetsEntity = await this.assetsStore.findByAddressAndChainId(
      event.address.toLowerCase(),
      event.chainId,
    );

    if (!asset) {
      asset = new AssetsEntity();
      asset.address = event.address.toLowerCase();
      asset.name = null;
      asset.symbol = null;
      asset.decimals = null;
      asset.icon = null;
      asset.chainId = event.chainId;
      asset.isLp = null;
      asset.projectId = null;
      asset = await this.assetsStore.save(asset);
    }

    // send event to update token with information from COVALENT
    if (type === TYPE_TRANSFER && !asset?.isDataPresent) {
      const userAddress =
        (entity as AssetTransfersEntity).to && (entity as AssetTransfersEntity).to !== ETH_ADDRESS
          ? (entity as AssetTransfersEntity).to
          : (entity as AssetTransfersEntity).from;

      await this.assetPublisherService.publishNewAssetAddedWithEvents({
        userAddress: userAddress,
        chainId: event.chainId,
        contractAddress: event.address.toLowerCase(), // (entity as AssetTransfersEntity).tokenAddress,
      });
    }

    if (type === TYPE_TRANSFER) {
      entity.assetId = asset.id;
      await this.assetsTransfersStore.save(entity as AssetTransfersEntity);
    }
    if (type === TYPE_APPROVAL) {
      entity.assetId = asset.id;
      await this.approvalsStore.save(entity as ApprovalsEntity);
    }

    return 1;
  }
}
