import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Controller, Inject } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

import { TRANSACTION_FIX_PATTERN } from '../config/queues/event.patterns';
import { Logger } from '../logger/logger.service';
import { delay } from '../util/time';
import { TransactionFixData } from './transaction.fix.interface';
import { TransactionFixService } from './transaction.fix.service';

@Controller()
export class TransactionFixController {
  constructor(
    private readonly fixService: TransactionFixService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  @EventPattern(TRANSACTION_FIX_PATTERN)
  public async migrateTransactions(
    @Payload() data: TransactionFixData,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    try {
      this.logger.debug(
        `consumed migration data for fix transaction: [fromBlock: ${data.fromBlock}], toBlock: [${data.toBlock}]`,
        'migration.controller',
      );
      await this.fixService.fixTransactions(data.fromBlock, data.toBlock);
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
