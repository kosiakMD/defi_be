import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Agenda from 'agenda';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CurveService } from './curve.service';
import { SushiswapService } from './sushiswap.service';
import { UniswapService } from './uniswap.service';

enum NetworkEnum {
	uniswap = 'uniswap',
	sushiswap = 'sushiswap',
	curve = 'curve',
}

@Injectable()
export class JobsService {
	static readonly services = {};

	private agenda;

	private readonly services;

	private uniswapJob(job: any, done: any): Promise<void> {
		this.logger.log(`Start ${'uniswap'} job`);
		return this.uniswapMigrationService.startMigration().then(() => {
			this.logger.log(`End ${'uniswap'} job`);
			done();
		});
	}

	private sushiswapJob(job: any, done: any): Promise<void> {
		this.logger.log(`Start ${'sushiswap'} job`);
		return this.sushiswapMigrationService.startMigration().then(() => {
			this.logger.log(`End ${'sushiswap'} job`);
			done();
		});
	}

	private curveJob(job: any, done: any): Promise<void> {
		this.logger.log(`Start ${'curve'} job`);
		return this.curveMigrationService.startJob().then(() => {
			this.logger.log(`End ${'curve'} job`);
			done();
		});
	}

	constructor(
		private configService: ConfigService,
		private uniswapMigrationService: UniswapService,
		private sushiswapMigrationService: SushiswapService,
		private curveMigrationService: CurveService,
		@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
	) {
		this.services = {
			[NetworkEnum.uniswap]: this.uniswapMigrationService,
			[NetworkEnum.sushiswap]: this.sushiswapMigrationService,
			[NetworkEnum.curve]: this.curveMigrationService,
		};

		this.agenda = new Agenda({
			db: { address: this.configService.get<string>('MONGO_CONNECTION_STRING') },
			processEvery: '30 seconds',
			lockLimit: 0,
		});

		this.agenda.on('ready', async () => {
			await this.agenda.start();

			await this.agenda.cancel({});

			this.logger.log('agenda.define: UNISWAP_JOB_NAME', 'Agenda');
			await this.agenda.define(
				this.configService.get<string>('UNISWAP_JOB_NAME'),
				this.uniswapJob.bind(this),
			);

			this.logger.log('agenda.every: UNISWAP_JOB_NAME', 'Agenda');
			await this.agenda.every(
				`${this.configService.get<string>('AGENDA_EVERY_SECONDS')} seconds`,
				this.configService.get<string>('UNISWAP_JOB_NAME'),
			);

			this.logger.log('agenda.define: SUSHISWAP_JOB_NAME', 'Agenda');
			await this.agenda.define(
				this.configService.get<string>('SUSHISWAP_JOB_NAME'),
				this.sushiswapJob.bind(this),
			);

			this.logger.log('agenda.every: SUSHISWAP_JOB_NAME', 'Agenda');
			await this.agenda.every(
				`${this.configService.get<string>('AGENDA_EVERY_SECONDS')} seconds`,
				this.configService.get<string>('SUSHISWAP_JOB_NAME'),
			);

			this.logger.log('agenda.define: CURVE_JOB_NAME', 'Agenda');
			await this.agenda.define(
				this.configService.get<string>('CURVE_JOB_NAME'),
				this.curveJob.bind(this),
			);

			this.logger.log('agenda.every: CURVE_JOB_NAME', 'Agenda');
			await this.agenda.every(
				`${this.configService.get<string>('AGENDA_EVERY_SECONDS')} seconds`,
				this.configService.get<string>('CURVE_JOB_NAME'),
			);
		});
	}
}
