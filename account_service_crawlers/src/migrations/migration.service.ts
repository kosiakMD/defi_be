import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { getManager } from 'typeorm';

import { BscService } from '../node/bsc.service';
import { EthService } from '../node/eth.service';
import { BSC_NETWORK, CHAIN_ID_BSC, CHAIN_ID_ETH, ETH_NETWORK } from '../utils/utils';
import { MigrationBlockResponse } from './interfaces/migration.block.response';
import {
  MigrationEventResponse,
  MigrationEventServiceResponse,
} from './interfaces/migration.event.interfaces';
import { MigrationEventService } from './migration.event.service';
import { AssetPublisherService } from './asset.publisher.service';
import { MigrationEvent } from './types/events';
import { AssetsService } from './assets.service';

@Injectable()
export class MigrationService {
  constructor(
    private readonly ethService: EthService,
    private readonly bscService: BscService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private migrationEventService: MigrationEventService,
    private assetPublisherService: AssetPublisherService,
    private assetsService: AssetsService
  ) {}

  private async sendAssetEventsToQueue(migrationEvents: MigrationEvent[]) {
    if (migrationEvents && migrationEvents.length) {
      for (const item of migrationEvents) {
        await this.assetPublisherService.publishTrackedAssetEvent(item);
      }
    }
    this.logger.log(`${migrationEvents.length} - events was sent to queue`);
  }

  async bscWeb3Migration(): Promise<void> {
    try {
      await this.assetsService.sendReadyForMigrationAssets(CHAIN_ID_BSC, this.bscService);

      const bscResponse: MigrationEventServiceResponse = await this.migrationEventService.getSqlStringsForDataFromNetwork(
        this.bscService,
        BSC_NETWORK,
      );

      this.logger.log('BSC ----> Start saving data to DB!!!');
      await this.saveDataToDb(bscResponse.eventsResponse, bscResponse.blocksResponse);
      this.logger.log('BSC -----> Data successfully saved to DB!!!');

      await this.sendAssetEventsToQueue(bscResponse.migrationEvents);
    } catch (e) {
      this.logger.error(e);
    }
  }

  async ethWeb3Migration(): Promise<void> {
    try {
      await this.assetsService.sendReadyForMigrationAssets(CHAIN_ID_ETH, this.ethService);
      const ethResponse: MigrationEventServiceResponse = await this.migrationEventService.getSqlStringsForDataFromNetwork(
        this.ethService,
        ETH_NETWORK,
      );

      this.logger.log('ETH ----> Start saving data to DB!!!');
      await this.saveDataToDb(ethResponse.eventsResponse, ethResponse.blocksResponse);
      this.logger.log('ETH -----> Data successfully saved to DB!!!');

      await this.sendAssetEventsToQueue(ethResponse.migrationEvents);
    } catch (e) {
      this.logger.error(e);
    }
  }

  async ethWeb3MigrationWithBlocks(fromBlock: number, toBlock: number): Promise<void> {
    try {
      const ethResponse: MigrationEventServiceResponse = await this.migrationEventService.getDataFromNetworkWithBlocksNum(
        this.ethService,
        ETH_NETWORK,
        fromBlock,
        toBlock,
      );
      this.logger.log('ETH ----> Start saving data to DB!!!');
      await this.saveDataToDb(ethResponse.eventsResponse, ethResponse.blocksResponse);
      this.logger.log('ETH -----> Data successfully saved to DB!!!');
    } catch (e) {
      this.logger.error(e);
    }
  }

  async bscMigrationWithBlocks(fromBlock: number, toBlock: number): Promise<void> {
    try {
      const ethResponse: MigrationEventServiceResponse = await this.migrationEventService.getDataFromNetworkWithBlocksNum(
        this.bscService,
        BSC_NETWORK,
        fromBlock,
        toBlock,
      );
      this.logger.log('ETH ----> Start saving data to DB!!!');
      await this.saveDataToDb(ethResponse.eventsResponse, ethResponse.blocksResponse);
      this.logger.log('ETH -----> Data successfully saved to DB!!!');
    } catch (e) {
      this.logger.error(e);
    }
  }

  private async saveDataToDb(
    eventsData?: MigrationEventResponse,
    blocksData?: MigrationBlockResponse,
  ): Promise<void> {
    await getManager().transaction(async (transactionalEntityManager) => {
      await Promise.all([
        transactionalEntityManager.query(
          eventsData && eventsData.eventsSql ? eventsData.eventsSql : '',
        ),
        transactionalEntityManager.query(
          eventsData && eventsData.blocksInfoSql ? eventsData.blocksInfoSql : '',
        ),
        transactionalEntityManager.query(
          blocksData && blocksData.blocksInsertSql ? blocksData.blocksInsertSql : '',
        ),
        transactionalEntityManager.query(
          blocksData && blocksData.transactionsInsertSql ? blocksData.transactionsInsertSql : '',
        ),
      ]);
    });
  }
}
