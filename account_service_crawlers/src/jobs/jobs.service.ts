import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Agenda from 'agenda';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { MigrationService } from '../migrations/migration.service';
import { BSC_MIGRATION_JOB, ETH_MIGRATION_JOB } from './jobs.settings';

@Injectable()
export class JobsService {
  private agenda;
  private readonly mongoConnectionString: string;

  constructor(
    private configService: ConfigService,
    private migrationService: MigrationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {
    this.mongoConnectionString = this.configService.get<string>('MONGO_CONNECTION_STRING');

    this.agenda = new Agenda({
      db: { address: this.mongoConnectionString },
      processEvery: '30 seconds',
      lockLimit: 0,
      defaultLockLimit: 0,
      // lock time default is 1 month
      defaultLockLifetime: 1000 * 60 * 60 * 24 * 30,
    });

    // TODO will be uncommented when all data in the network is synchronized with db data
    this.agenda.on('ready', async () => {
      await this.agenda.start();
      await this.startEthMigrationJob();
      await this.startBscMigrationJob();
    });
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

  async startEthMigrationJob(): Promise<void> {
    await this.cancel(ETH_MIGRATION_JOB.name);
    this.logger.log(
      `agenda.define: [${ETH_MIGRATION_JOB.name}], agenda.every: [${ETH_MIGRATION_JOB.seconds}] seconds`,
      'Agenda',
    );
    await this.agenda.define(ETH_MIGRATION_JOB.name, (job, done) => {
      this.logger.log(`agenda.start [${ETH_MIGRATION_JOB.name}] job`, 'Agenda');
      this.migrationService.ethWeb3Migration().then(() => {
        this.logger.log(`agenda.complete [${ETH_MIGRATION_JOB.name}] job`, 'Agenda');
        done();
      });
    });
    await this.agenda.every(ETH_MIGRATION_JOB.seconds + ' seconds', ETH_MIGRATION_JOB.name);
  }

  async startBscMigrationJob(): Promise<void> {
    await this.cancel(BSC_MIGRATION_JOB.name);
    this.logger.log(
      `agenda.define: [${BSC_MIGRATION_JOB.name}], agenda.every: [${BSC_MIGRATION_JOB.seconds}] seconds`,
      'Agenda',
    );
    await this.agenda.define(BSC_MIGRATION_JOB.name, (job, done) => {
      this.logger.log(`agenda.start [${BSC_MIGRATION_JOB.name}] job`, 'Agenda');
      this.migrationService.bscWeb3Migration().then(() => {
        this.logger.log(`agenda.complete [${BSC_MIGRATION_JOB.name}] job`, 'Agenda');
        done();
      });
    });
    await this.agenda.every(BSC_MIGRATION_JOB.seconds + ' seconds', BSC_MIGRATION_JOB.name);
  }
}
