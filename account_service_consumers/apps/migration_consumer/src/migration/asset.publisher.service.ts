import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';

import { NEW_ASSET_ADDED_EVENT_PATTERN } from '../config/queues/event.patterns';
import { MigrationAddNewAsset } from './types/events';

@Injectable()
export class AssetPublisherService {
  constructor(
    @Inject('TRANSACTION_NEW_ASSET_ADDED_CLIENT') private readonly addNewAssetClient: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  async publishNewAssetAddedWithEvents(transaction: MigrationAddNewAsset): Promise<void> {
    this.logger.debug(
      `publishing transaction and events ${JSON.stringify(
        transaction,
      )} to [${this.configService.get<string>('TRANSACTION_NEW_ASSET_ADDED')}]`,
      `asset.publisher.service`,
    );
    return await this.addNewAssetClient
      .emit<any>(NEW_ASSET_ADDED_EVENT_PATTERN, transaction)
      .toPromise();
  }
}
