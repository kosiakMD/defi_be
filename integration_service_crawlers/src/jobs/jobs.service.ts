import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Agenda from 'agenda';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PoolsService } from 'src/pools/pools.service';
import { VaultsService } from 'src/vaults/vaults.service';

import { CurveService } from './curve.service';
import {
  PANCAKE_JOB,
  PANCAKE_V2_JOB,
  POOLS_JOB,
  SUSHISWAP_JOB,
  UNISWAP_JOB,
  VAULTS_JOB,
} from './jobs.setting';
import { PancakeService } from './pancake.service';
import { SushiswapService } from './sushiswap.service';
import { UniswapService } from './uniswap.service';

@Injectable()
export class JobsService {
  private agenda;
  constructor(
    private configService: ConfigService,
    private uniswapService: UniswapService,
    private sushiswapService: SushiswapService,
    private pancakeService: PancakeService,
    private curveMigrationService: CurveService,
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
      await this.startUniswapJob();
      await this.startSushiswapJob();
      await this.startPancakeJob();
      await this.startPancakeV2Job();
      await this.startPoolsJob();
      await this.startVaultsJob();
    });
  }

  async startUniswapJob() {
    await this.cancel(UNISWAP_JOB.name);
    this.logger.log(
      `agenda.define: [${UNISWAP_JOB.name}], agenda.every: [${UNISWAP_JOB.seconds}] seconds`,
      'Agenda',
    );
    await this.agenda.define(UNISWAP_JOB.name, (job, done) => {
      this.logger.log(`agenda.start [${UNISWAP_JOB.name}] job`, 'Agenda');
      this.uniswapService.startMigration().then(() => {
        this.logger.log(`agenda.complete [${UNISWAP_JOB.name}] job`, 'Agenda');
        done();
      });
    });
    await this.agenda.every(UNISWAP_JOB.seconds + ' seconds', UNISWAP_JOB.name);
  }

  async startSushiswapJob() {
    await this.cancel(SUSHISWAP_JOB.name);
    this.logger.log(
      `agenda.define: [${SUSHISWAP_JOB.name}], agenda.every: [${SUSHISWAP_JOB.seconds}] seconds`,
      'Agenda',
    );
    await this.agenda.define(SUSHISWAP_JOB.name, (job, done) => {
      this.logger.log(`agenda.start [${SUSHISWAP_JOB.name}] job`, 'Agenda');
      this.sushiswapService.startMigration().then(() => {
        this.logger.log(`agenda.complete [${SUSHISWAP_JOB.name}] job`, 'Agenda');
        done();
      });
    });
    await this.agenda.every(SUSHISWAP_JOB.seconds + ' seconds', SUSHISWAP_JOB.name);
  }

  async startPancakeJob() {
    await this.cancel(PANCAKE_JOB.name);
    this.logger.log(
      `agenda.define: [${PANCAKE_JOB.name}], agenda.every: [${PANCAKE_JOB.seconds}] seconds`,
      'Agenda',
    );
    await this.agenda.define(PANCAKE_JOB.name, (job, done) => {
      this.logger.log(`agenda.start [${PANCAKE_JOB.name}] job`, 'Agenda');
      this.pancakeService.startMigration().then(() => {
        this.logger.log(`agenda.complete [${PANCAKE_JOB.name}] job`, 'Agenda');
        done();
      });
    });
    await this.agenda.every(PANCAKE_JOB.seconds + ' seconds', PANCAKE_JOB.name);
  }

  async startPancakeV2Job() {
    await this.cancel(PANCAKE_V2_JOB.name);
    this.logger.log(
      `agenda.define: [${PANCAKE_V2_JOB.name}], agenda.every: [${PANCAKE_V2_JOB.seconds}] seconds`,
      'Agenda',
    );
    await this.agenda.define(PANCAKE_V2_JOB.name, (job, done) => {
      this.logger.log(`agenda.start [${PANCAKE_V2_JOB.name}] job`, 'Agenda');
      this.poolsService.savePancakeV2Pols().then(() => {
        this.logger.log(`agenda.complete [${PANCAKE_V2_JOB.name}] job`, 'Agenda');
        done();
      });
    });
    await this.agenda.every(PANCAKE_V2_JOB.seconds + ' seconds', PANCAKE_V2_JOB.name);
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
