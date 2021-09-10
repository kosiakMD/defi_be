import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AssetPublisherService } from './asset.publisher.service';
import { AssetsEntity } from './entities/assets.entity';
import { SettingsEntity } from './entities/settings.entity';
import { Log } from './interfaces/migration.event.interfaces';
import { BlockTransactionObject } from './interfaces/web3.interfaces';
import { SqlService } from './sql.service';
import { MigrationEvent } from './types/events';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(AssetsEntity)
    private readonly assetsRepository: Repository<AssetsEntity>,
    @InjectRepository(SettingsEntity)
    private readonly settingsRepository: Repository<SettingsEntity>,
    private readonly assetPublisherService: AssetPublisherService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private sqlService: SqlService,
  ) {}

  async getAssetEventsArray(
    eventArray: Log[],
    blockTransactionObjects: BlockTransactionObject[],
    chainId: number,
  ): Promise<MigrationEvent[]> {
    const parsingEventSettings: SettingsEntity = await this.settingsRepository.findOne({
      where: { name: 'tracked_events' },
    });
    const isSettingsExists = parsingEventSettings?.value?.length > 0;
    // make sure setting is present in the database in other case return empty array
    if (!isSettingsExists) {
      this.logger.warn(`not found setting for events async parsing`);
      return [];
    }

    const migrationEvents: MigrationEvent[] = [];
    parsingEventSettings.value.map((eventHash) => {
      const events: Log[] = eventArray.filter((event) => {
        return event.topics[0] === eventHash;
      });
      if (events.length) {
        this.logger.log(`${events.length} events on hash - ${eventHash}`);
      }

      events.map((event) => {
        const currentBlock = blockTransactionObjects.find(
          (block) => block.number === event.blockNumber,
        );
        const otherTopicsString =
          event.topics && event.topics.length > 3 ? `'${event.topics.slice(3).join(', ')}'` : null;

        migrationEvents.push({
          transactionHash: event.transactionHash,
          address: event.address,
          topic1: event.topics[0],
          topic2: event.topics[1],
          topic3: event.topics[2],
          topics: otherTopicsString,
          data: event.data,
          blockNumber: event.blockNumber,
          blockTimestamp: Number(currentBlock.timestamp),
          chainId: chainId,
          logIndex: event.logIndex,
        });
      });
    });

    return migrationEvents;
  }
}
