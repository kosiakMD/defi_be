import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ASSET_EVENT_MIGRATION_PATTERN, ASSET_HISTORICAL_MIGRATION_PATTERN } from '../config/queue/event.patterns';
import { HistoricalMigrationEvent, MigrationEvent } from './types/events';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export class AssetPublisherService {
  constructor(
    @Inject('ASSET_MIGRATION_CLIENT') private readonly client: ClientProxy,
    @Inject('ASSET_HISTORICAL_MIGRATION_CLIENT') private readonly historicalClient: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  async publishHistoricalMigrationEvent(event: HistoricalMigrationEvent): Promise<Observable<any>> {
    this.logger.log(
      `publishing historical asset migration event ${JSON.stringify(event)} to [${this.configService.get<string>('ASSET_HISTORICAL_MIGRATION_QUEUE')}]`,
      `asset.publisher.service`
      );
    return await this.historicalClient.emit<any>(ASSET_HISTORICAL_MIGRATION_PATTERN, event);
  }

  async publishTrackedAssetEvent(event: MigrationEvent): Promise<any> {
    // considered to use debug here in order to avoid to much logging
    this.logger.debug(
      `publishing asset event event ${JSON.stringify(event)} to [${this.configService.get<string>('ASSET_MIGRATION_QUEUE')}]`,
      `asset.publisher.service`
    );
    return await this.client.emit<any>(ASSET_EVENT_MIGRATION_PATTERN, event).toPromise();
  }
}
