import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  private readonly cacheTTLInSeconds: number;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private configService: ConfigService,
    private readonly assetsStore: AssetsStore,
    private readonly assetsTransfersStore: AssetsTransfersStore,
    private readonly approvalsStore: ApprovalsStore,
    private readonly assetPublisherService: AssetPublisherService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.cacheTTLInSeconds = this.configService.get<number>('CACHE_TTL_IN_SECONDS') || 300;
  }

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
      await this.checkOfCacheAndSendAssetToPublish(event, entity);
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

  private getTokenCacheKey(address: string, chain: number): string {
    return `asset_${address}_${chain}`;
  }

  private async checkOfCacheAndSendAssetToPublish(
    event: MigrationEvent,
    entity: AssetTransfersEntity | ApprovalsEntity,
  ): Promise<void> {
    const cashKey = this.getTokenCacheKey(event.address.toLowerCase(), event.chainId);
    const cashedAsset = await this.cache.get(cashKey);
    if (!cashedAsset) {
      await this.cache.set(
        cashKey,
        {
          chainId: event.chainId,
          contractAddress: event.address.toLowerCase(),
        },
        { ttl: this.cacheTTLInSeconds },
      );

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
  }
}
