import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Agenda from 'agenda';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ETH_TOKEN_JOB, BSC_TRANSFER_JOB } from './jobs.settings';
import { BscTransferUpdateService } from './transfers/bsc/bscTransfersUpdate.service';
import { EthTransferUpdateService } from './transfers/eth/ethTransfersUpdate.service';

@Injectable()
export class JobsService {
  private agenda;
  private readonly mongoConnectionString: string;

  constructor(
    private configService: ConfigService,
    private bscTransferUpdateService: BscTransferUpdateService,
    private ethTransferUpdateService: EthTransferUpdateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {
    this.mongoConnectionString = this.configService.get<string>('MONGO_CONNECTION_STRING');

    this.agenda = new Agenda({
      db: { address: this.mongoConnectionString },
      processEvery: '240 seconds',
      lockLimit: 0,
      defaultLockLimit: 0,
      defaultLockLifetime: 300000,
    });

    this.agenda.on('ready', async () => {
      await this.agenda.start();
      await this.startEthTokenPriceJob();
      await this.startBscTransferPriceJob();
    });
  }

  async startEthTokenPriceJob(): Promise<void> {
    await this.cancel(ETH_TOKEN_JOB.name);
    this.logger.log(
      `agenda.define: [${ETH_TOKEN_JOB.name}], agenda.every: [${ETH_TOKEN_JOB.seconds}] seconds`,
      'Agenda',
    );
    await this.agenda.define(ETH_TOKEN_JOB.name, (job, done) => {
      this.logger.log(`agenda.start [${ETH_TOKEN_JOB.name}] job`, 'Agenda');
      this.ethTransferUpdateService.updateTransferPrices().then(() => {
        this.logger.log(`agenda.complete [${ETH_TOKEN_JOB.name}] job`, 'Agenda');
        done();
      });
    });
    await this.agenda.every(ETH_TOKEN_JOB.seconds + ' seconds', ETH_TOKEN_JOB.name);
  }

  async startBscTransferPriceJob(): Promise<void> {
    await this.cancel(BSC_TRANSFER_JOB.name);
    this.logger.log(
      `agenda.define: [${BSC_TRANSFER_JOB.name}], agenda.every: [${BSC_TRANSFER_JOB.seconds}] seconds`,
      'Agenda',
    );
    await this.agenda.define(BSC_TRANSFER_JOB.name, (job, done) => {
      this.logger.log(`agenda.start [${BSC_TRANSFER_JOB.name}] job`, 'Agenda');
      this.bscTransferUpdateService.updateTransferPrices().then(() => {
        this.logger.log(`agenda.complete [${BSC_TRANSFER_JOB.name}] job`, 'Agenda');
        done();
      });
    });
    await this.agenda.every(BSC_TRANSFER_JOB.seconds + ' seconds', BSC_TRANSFER_JOB.name);
  }

  async cancel(jobName: string): Promise<void> {
    const cancelResult = await this.agenda.cancel({ name: jobName });
    this.logger.log(
      `agenda.cancel: [${jobName}], result: [${
        cancelResult === 1 ? 'cancelled' : 'not cancelled'
      }]`,
      'Agenda',
    );
    return cancelResult;
  }
}
