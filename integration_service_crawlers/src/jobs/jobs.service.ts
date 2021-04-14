import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Agenda from 'agenda';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CurveService } from './curve.service';
import { PoolsService } from 'src/pools/pools.service';
import { VaultsService } from 'src/vaults/vaults.service';
import { UniswapService } from './uniswap.service';
import { SushiswapService } from './sushiswap.service';
import { PancakeService } from './pancake.service';

@Injectable()
export class JobsService {
	private agenda;

	private uniswapJob(job: any, done: any): Promise<void> {
		this.logger.log(`Start ${'uniswap'} job`);
		return this.uniswapService.startMigration().then(() => {
			this.logger.log(`End ${'uniswap'} job`);
			done();
		});
	}

	private sushiswapJob(job: any, done: any): Promise<void> {
		this.logger.log(`Start ${'sushiswap'} job`);
		return this.sushiswapService.startMigration().then(() => {
			this.logger.log(`End ${'sushiswap'} job`);
			done();
		});
	}

	private pancakeJob(job: any, done: any): Promise<void> {
		return this.pancakeService.startMigration().then(() => {
			this.logger.log(`End ${'pancake'} job`);
			done();
		});
	}

	private poolsJob(job: any, done: any): Promise<void> {
		this.logger.log(`Start ${'pools'} job`);
		return this.poolsService.savePools().then(() => {
			this.logger.log(`End ${'pools'} job`);
			done();
		});
	}

	private vaultsJob(job: any, done: any): Promise<void> {
		this.logger.log(`Start ${'vaults'} job`);
		return this.vaultsService.saveVaults().then(() => {
			this.logger.log(`End ${'vaults'} job`);
			done();
		});
	}

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
			db: {address: this.configService.get<string>('MONGO_CONNECTION_STRING')},
			processEvery: '30 seconds',
			lockLimit: 0,
			defaultLockLimit: 0
		});

		this.agenda.on('ready', async () => {
			await this.agenda.start();

			await this.agenda.cancel({});

			this.logger.log(`agenda.define: ${this.configService.get<string>('UNISWAP_JOB_NAME')}, agenda.every: ${this.configService.get<string>('AGENDA_EVERY_SECONDS')} seconds`, 'Agenda');
			await this.agenda.define(
				this.configService.get<string>('UNISWAP_JOB_NAME'),
				this.uniswapJob.bind(this),
			);
			await this.agenda.every(
				`${this.configService.get<string>('AGENDA_EVERY_SECONDS')} seconds`,
				this.configService.get<string>('UNISWAP_JOB_NAME'),
			);

			this.logger.log(`agenda.define: ${this.configService.get<string>('SUSHISWAP_JOB_NAME')}, agenda.every: ${this.configService.get<string>('AGENDA_EVERY_SECONDS')}`, 'Agenda');
			await this.agenda.define(
				this.configService.get<string>('SUSHISWAP_JOB_NAME'),
				this.sushiswapJob.bind(this),
			);
			await this.agenda.every(
				`${this.configService.get<string>('AGENDA_EVERY_SECONDS')} seconds`,
				this.configService.get<string>('SUSHISWAP_JOB_NAME'),
			);

			this.logger.log(`agenda.define: ${this.configService.get<string>('PANCAKE_JOB_NAME')}, agenda.every: ${this.configService.get<string>('AGENDA_EVERY_SECONDS')} seconds`, 'Agenda');
			await this.agenda.define(
				this.configService.get<string>('PANCAKE_JOB_NAME'),
				this.pancakeJob.bind(this),
			);
			await this.agenda.every(
				`${this.configService.get<string>('AGENDA_EVERY_SECONDS')} seconds`,
				this.configService.get<string>('PANCAKE_JOB_NAME'),
			);

			this.logger.log(`agenda.define: ${this.configService.get<string>('POOLS_JOB_NAME')}, agenda.every: ${this.configService.get<string>('POOLS_EVERY_SECONDS')} seconds`, 'Agenda');
			await this.agenda.define(
				this.configService.get<string>('POOLS_JOB_NAME'),
				this.poolsJob.bind(this),
			);
			await this.agenda.every(
				`${this.configService.get<string>('POOLS_EVERY_SECONDS')} seconds`,
				this.configService.get<string>('POOLS_JOB_NAME'),
			);

			this.logger.log(`agenda.define: ${this.configService.get<string>('VAULTS_JOB_NAME')}, agenda.every ${this.configService.get<string>('VAULTS_EVERY_SECONDS')} seconds`, 'Agenda');
			await this.agenda.define(
				this.configService.get<string>('VAULTS_JOB_NAME'),
				this.vaultsJob.bind(this),
			);
			await this.agenda.every(
				`${this.configService.get<string>('VAULTS_EVERY_SECONDS')} seconds`,
				this.configService.get<string>('VAULTS_JOB_NAME'),
			);
		});
	}
}
