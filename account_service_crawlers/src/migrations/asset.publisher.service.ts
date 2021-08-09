import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Observable } from 'rxjs';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';

import {
  ASSET_EVENT_MIGRATION_PATTERN,
  ASSET_HISTORICAL_MIGRATION_PATTERN,
  TRANSACTION_EVENT_MIGRATION_PATTERN,
} from '../config/queue/event.patterns';
import { MigrationTransaction } from './interfaces/migration.event.interfaces';
import { HistoricalMigrationEvent, MigrationEvent } from './types/events';

@Injectable()
export class AssetPublisherService {
  constructor(
    @Inject('ASSET_MIGRATION_CLIENT') private readonly client: ClientProxy,
    @Inject('ASSET_HISTORICAL_MIGRATION_CLIENT') private readonly historicalClient: ClientProxy,
    @Inject('TRANSACTION_EVENTS_MIGRATION_CLIENT') private readonly transactionClient: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  async publishHistoricalMigrationEvent(event: HistoricalMigrationEvent): Promise<Observable<any>> {
    this.logger.log(
      `publishing historical asset migration event ${JSON.stringify(
        event,
      )} to [${this.configService.get<string>('ASSET_HISTORICAL_MIGRATION_QUEUE')}]`,
      `asset.publisher.service`,
    );
    return await this.historicalClient.emit<any>(ASSET_HISTORICAL_MIGRATION_PATTERN, event);
  }

  async publishTrackedAssetEvent(event: MigrationEvent): Promise<any> {
    // considered to use debug here in order to avoid to much logging
    this.logger.debug(
      `publishing asset event event ${JSON.stringify(event)} to [${this.configService.get<string>(
        'ASSET_MIGRATION_QUEUE',
      )}]`,
      `asset.publisher.service`,
    );
    return await this.client.emit<any>(ASSET_EVENT_MIGRATION_PATTERN, event).toPromise();
  }

  async publishTransactionWithEvents(transaction: MigrationTransaction): Promise<void> {
    this.logger.debug(
      `publishing transaction and events ${JSON.stringify(
        transaction,
      )} to [${this.configService.get<string>('TRANSACTION_EVENTS_MIGRATION_QUEUE')}]`,
      `asset.publisher.service`,
    );
    return await this.transactionClient
      .emit<any>(TRANSACTION_EVENT_MIGRATION_PATTERN, transaction)
      .toPromise();
  }
}
