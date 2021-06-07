import { Controller, Inject } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { HistoricalMigrationEvent } from './types/events';
import { MigrationService } from './migration.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from '../logger/logger.service';
import { delay } from '../util/time';
import { ASSET_HISTORICAL_MIGRATION_PATTERN } from '../config/queues/event.patterns';
import { UtilsDatabase } from '../store/utils.database';

@Controller()
export class MigrationController {

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly migrationService: MigrationService,
    private readonly utilsDatabase: UtilsDatabase,
  ) {
  }

  @EventPattern(ASSET_HISTORICAL_MIGRATION_PATTERN)
  public async migrateAssetHistoricalData(
    @Payload() data: HistoricalMigrationEvent, @Ctx() context: RmqContext
  ) {
    try {
      this.logger.debug(
        `consumed migration data for asset: [${data.assetId}], chain: [${data.chainId}], from block: [${data.fromBlock}], to block: [${data.toBlock}]`,
        'migration.controller'
      )
      await this.utilsDatabase.dbTransactionBegin()
      await this.migrationService.migrateExistedEvents(data)
      context.getChannelRef().ack(context.getMessage())
      await this.utilsDatabase.dbTransactionCommit()
    } catch (e) {
      this.logger.error(e)
      this.logger.error('error during asset data migration ' + JSON.stringify(data))
      // make delay in order to avoid next consumer overloading
      await delay(10)
      context.getChannelRef().nack(context.getMessage())
    }
  }
}


