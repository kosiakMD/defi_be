import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Controller, Inject } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

import { TRANSACTION_EVENT_MIGRATION_PATTERN } from '../config/queues/event.patterns';
import { Logger } from '../logger/logger.service';
import { delay } from '../util/time';
import { MigrationTransaction } from './transactions.parsing.interfaces';
import { TransactionsParsingService } from './transactions.parsing.service';

@Controller()
export class MigrationTransactionController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly transactionsParsingService: TransactionsParsingService,
  ) {}

  @EventPattern(TRANSACTION_EVENT_MIGRATION_PATTERN)
  public async migrateTransactions(
    @Payload() data: MigrationTransaction,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    try {
      this.logger.debug(
        `consumed migration data for transaction: [hash: ${data.hash}], blockNumber: [${data.blockNumber}]`,
        'migration.controller',
      );
      await this.transactionsParsingService.parseTransactions(data);
      context.getChannelRef().ack(context.getMessage());
    } catch (e) {
      this.logger.error(e);
      this.logger.error('error during transaction data migration ' + JSON.stringify(data));
      // make delay in order to avoid next consumer overloading
      await delay(10);
      context.getChannelRef().nack(context.getMessage());
    }
  }
}
