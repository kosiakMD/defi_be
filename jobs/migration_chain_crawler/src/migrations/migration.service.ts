import { getManager } from 'typeorm';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { BscService } from '../node/bsc.service';
import { EthService } from '../node/eth.service';
import { BSC_NETWORK, ETH_NETWORK, toField } from '../utils/utils';
import { AssetPublisherService } from './asset.publisher.service';
import { MigrationBlockResponse } from './interfaces/migration.block.response';
import {
  MigrationEventResponse,
  MigrationEventServiceResponse,
} from './interfaces/migration.event.interfaces';
import { MigrationEventService } from './migration.event.service';
import { MigrationEvent } from './types/events';

@Injectable()
export class MigrationService {
  constructor(
    private readonly ethService: EthService,
    private readonly bscService: BscService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private migrationEventService: MigrationEventService,
    private assetPublisherService: AssetPublisherService,
  ) {}

  private async sendAssetEventsToQueue(migrationEvents: MigrationEvent[]): Promise<void> {
    this.logger.log(`Start assetEvents migration - length: ${migrationEvents.length}`);
    const chunkSize = 100;
    for (let i = 0, j = migrationEvents.length; i < j; i += chunkSize) {
      const to = toField(i, migrationEvents.length, chunkSize);
      const sliceAssets = migrationEvents.slice(i, to);
      await Promise.all(
        sliceAssets.map(async (e) => {
          await this.assetPublisherService.publishTrackedAssetEvent(e);
        }),
      );
    }
    this.logger.log(`${migrationEvents.length} - events was sent to queue`);
  }

  private async sendTransactionEventsToQueue(
    ethResponse: MigrationEventServiceResponse,
  ): Promise<void> {
    this.logger.log(
      `Start TransactionEvents migration - length: ${ethResponse.migrationTransactions.length}`,
    );
    if (ethResponse?.migrationTransactions) {
      const chunkSize = 100;
      for (let i = 0, j = ethResponse.migrationTransactions.length; i < j; i += chunkSize) {
        const to = toField(i, ethResponse.migrationTransactions.length, chunkSize);
        const sliceAssets = ethResponse.migrationTransactions.slice(i, to);
        await Promise.all(
          sliceAssets.map(async (transaction) => {
            transaction.events = ethResponse.migrationEvents.filter(
              (event) => event.transactionHash === transaction.hash,
            );
            await this.assetPublisherService.publishTransactionWithEvents(transaction);
          }),
        );
      }
      this.logger.log(
        `${ethResponse.migrationTransactions.length} - transactionsEvents was sent to queue`,
      );
    }
  }

  async bscWeb3Migration(): Promise<void> {
    try {
      const bscResponse: MigrationEventServiceResponse =
        await this.migrationEventService.getSqlStringsForDataFromNetwork(
          this.bscService,
          BSC_NETWORK,
        );

      await this.sendAssetEventsToQueue(bscResponse.migrationEvents);
      await this.sendTransactionEventsToQueue(bscResponse);
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
      const ethResponse: MigrationEventServiceResponse =
        await this.migrationEventService.getSqlStringsForDataFromNetwork(
          this.ethService,
          ETH_NETWORK,
        );

      await this.sendAssetEventsToQueue(ethResponse.migrationEvents);
      await this.sendTransactionEventsToQueue(ethResponse);
      this.logger.log('ETH ----> Start saving data to DB!!!');
      await this.saveDataToDb(ethResponse.eventsResponse, ethResponse.blocksResponse);
      this.logger.log('ETH -----> Data successfully saved to DB!!!');
    } catch (e) {
      this.logger.error(e);
    }
  }

  async ethWeb3MigrationWithBlocks(fromBlock: number, toBlock: number): Promise<void> {
    try {
      const ethResponse: MigrationEventServiceResponse =
        await this.migrationEventService.getDataFromNetworkWithBlocksNum(
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
      const ethResponse: MigrationEventServiceResponse =
        await this.migrationEventService.getDataFromNetworkWithBlocksNum(
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
