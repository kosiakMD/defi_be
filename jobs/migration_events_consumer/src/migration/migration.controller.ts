import { Controller, Inject } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ASSET_EVENT_MIGRATION_PATTERN } from '../config/queues/event.patterns';
import { Logger } from '../logger/logger.service';
import { delay } from '../util/time';
import { MigrationService } from './migration.service';
import { MigrationEvent } from './types/events';

@Controller()
export class MigrationController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly migrationService: MigrationService,
  ) {}

  @EventPattern(ASSET_EVENT_MIGRATION_PATTERN)
  public async handleEvent(@Payload() data: MigrationEvent, @Ctx() context: RmqContext) {
    try {
      this.logger.debug(
        `consumed migration data for event has [${data.topic1}]`,
        'migration.controller',
      );
      await this.migrationService.migrateEvent(data);
      context.getChannelRef().ack(context.getMessage());
    } catch (e) {
      this.logger.error(e);
      this.logger.error('error during event migration ' + JSON.stringify(data));
      // make delay in order to avoid next consumer overloading
      await delay(10);
      context.getChannelRef().nack(context.getMessage());
    }
  }
}
