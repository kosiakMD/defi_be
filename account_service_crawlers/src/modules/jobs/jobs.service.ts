import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Agenda from 'agenda';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { EthTokenPriceService } from './ethTokenPrice.service';
import { EthTransactionPriceService } from './ethTransactionPrice.service';

@Injectable()
export class JobsService {
  private agenda;

  private ethTokenPriceUpdateJob(job: any, done: any): Promise<void> {
    this.logger.log(`Start ${'ETH token USD price update'} job`);
    return this.ethTokenPriceService.updateTokenPrices().then(() => {
      this.logger.log(`End ${'ETH token USD price update'} job`);
      done();
    });
  }

  private ethTransactionPriceUpdateJob(job: any, done: any): Promise<void> {
    this.logger.log(`Start ${'ETH transaction USD price update'} job`);
    return this.ethTransactionPriceService.updateTransactionPrices().then(() => {
      this.logger.log(`End ${'ETH transaction USD price update'} job`);
      done();
    });
  }

  constructor(
    private configService: ConfigService,
    private ethTokenPriceService: EthTokenPriceService,
    private ethTransactionPriceService: EthTransactionPriceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {
    this.agenda = new Agenda({
      db: { address: this.configService.get<string>('MONGO_CONNECTION_STRING') },
      processEvery: '30 seconds',
      lockLimit: 0,
      defaultLockLimit: 0,
    });

    this.agenda.on('ready', async () => {
      await this.agenda.start();

      await this.agenda.cancel({});

      this.logger.log(
        `agenda.define: ${this.configService.get<string>(
          'ETH_TOKEN_USD_PRICE_JOB_NAME',
        )}, agenda.every: ${this.configService.get<string>('AGENDA_EVERY_SECONDS')} seconds`,
        'Agenda',
      );
      await this.agenda.define(
        this.configService.get<string>('ETH_TOKEN_USD_PRICE_JOB_NAME'),
        this.ethTokenPriceUpdateJob.bind(this),
        this.ethTransactionPriceUpdateJob.bind(this),
      );
      await this.agenda.every(
        `${this.configService.get<string>('AGENDA_EVERY_SECONDS')} seconds`,
        this.configService.get<string>('ETH_TOKEN_USD_PRICE_JOB_NAME'),
      );
    });
  }
}
