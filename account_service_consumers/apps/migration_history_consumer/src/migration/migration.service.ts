import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from '../logger/logger.service';
import { AssetsStore } from '../store/assets.store';
import { AssetsTransfersStore } from '../store/assettransfers.store';
import { HistoricalMigrationEvent } from './types/events';
import { AssetsEntity } from '../store/entities/assets.entity';

@Injectable()
export class MigrationService {

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly assetsStore: AssetsStore,
    private readonly assetsTransfersStore: AssetsTransfersStore,
  ) {}

  async migrateExistedEvents(migrationDto: HistoricalMigrationEvent): Promise<void> {
    let totalMigrated: number = await this.migrateExistedData(migrationDto, migrationDto.fromBlock, migrationDto.toBlock);
    this.logger.log(
      `transfers inserted in total [${totalMigrated}] between blocks [${migrationDto.fromBlock}] and [${migrationDto.toBlock}] for asset [${migrationDto.assetId}] (chain id [${migrationDto.chainId}])`,
      'migration.service',
    );
  }

  protected async migrateExistedData(migrationDto: HistoricalMigrationEvent, fromBlock, toBlock): Promise<number> {
    const asset: AssetsEntity = await this.assetsStore.findOne(migrationDto.assetId)
    return this.assetsTransfersStore.insertFromSelect(asset.address, asset.chainId, migrationDto.assetId, fromBlock, toBlock)
  }
}
