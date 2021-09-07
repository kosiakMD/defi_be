import Agenda from 'agenda';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PoolsService } from 'src/pools/pools.service';
import { VaultsService } from 'src/vaults/vaults.service';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { POOLS_JOB, VAULTS_JOB } from './jobs.setting';

@Injectable()
export class JobsService {
  private agenda;
  constructor(
    private configService: ConfigService,
    private poolsService: PoolsService,
    private vaultsService: VaultsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {
    this.agenda = new Agenda({
      db: { address: this.configService.get<string>('MONGO_CONNECTION_STRING') },
      processEvery: '30 seconds',
      lockLimit: 0,
      defaultLockLimit: 0,
      // lock time default is 1 month
      defaultLockLifetime: 1000 * 60 * 60 * 24 * 30,
    });

    this.agenda.on('ready', async () => {
      await this.agenda.start();
      await this.startPoolsJob();
      await this.startVaultsJob();
    });
  }

  async startPoolsJob() {
    await this.cancel(POOLS_JOB.name);
    this.logger.log(
      `agenda.define: [${POOLS_JOB.name}], agenda.every: [${POOLS_JOB.seconds}] seconds`,
      'Agenda',
    );
    await this.agenda.define(POOLS_JOB.name, (job, done) => {
      this.logger.log(`agenda.start [${POOLS_JOB.name}] job`, 'Agenda');
      this.poolsService.savePools().then(() => {
        this.logger.log(`agenda.complete [${POOLS_JOB.name}] job`, 'Agenda');
        done();
      });
    });
    await this.agenda.every(POOLS_JOB.seconds + ' seconds', POOLS_JOB.name);
  }

  async startVaultsJob() {
    await this.cancel(VAULTS_JOB.name);
    this.logger.log(
      `agenda.define: [${VAULTS_JOB.name}], agenda.every: [${VAULTS_JOB.seconds}] seconds`,
      'Agenda',
    );
    await this.agenda.define(VAULTS_JOB.name, (job, done) => {
      this.logger.log(`agenda.start [${VAULTS_JOB.name}] job`, 'Agenda');
      this.vaultsService.saveVaults().then(() => {
        this.logger.log(`agenda.complete [${VAULTS_JOB.name}] job`, 'Agenda');
        done();
      });
    });
    await this.agenda.every(VAULTS_JOB.seconds + ' seconds', VAULTS_JOB.name);
  }

  async cancel(jobName: string) {
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
