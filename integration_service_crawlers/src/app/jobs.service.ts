import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Agenda from 'agenda';

import { CurveMigrationService } from './curve.migration.service';
import { SushiswapMigrationService } from './sushiswap.migration.service';
import { UniswapMigrationService } from './uniswap.migration.service';

@Injectable()
export class JobsService {
	private agenda;
	constructor(
		private configService: ConfigService,
		private uniswapMigrationService: UniswapMigrationService,
		private sushiswapMigrationService: SushiswapMigrationService,
		private curveMigrationService: CurveMigrationService,
	) {
		this.agenda = new Agenda({
			db: { address: this.configService.get<string>('MONGO_CONNECTION_STRING') },
			processEvery: '30 seconds',
			lockLimit: 0,
		});

		this.agenda.on('ready', async () => {
			await this.agenda.start();
			await this.agenda.cancel({});

			await this.agenda.define(
				this.configService.get<string>('UNISWAP_JOB_NAME'),
				this.uniswapMigrationJob.bind(this),
			);
			await this.agenda.every(
				`${this.configService.get<string>('AGENDA_EVERY_SECONDS')} seconds`,
				this.configService.get<string>('UNISWAP_JOB_NAME'),
			);

			await this.agenda.define(
				this.configService.get<string>('SUSHISWAP_JOB_NAME'),
				this.sushiswapMigrationJob.bind(this),
			);
			await this.agenda.every(
				`${this.configService.get<string>('AGENDA_EVERY_SECONDS')} seconds`,
				this.configService.get<string>('SUSHISWAP_JOB_NAME'),
			);

			await this.agenda.define(
				this.configService.get<string>('CURVE_JOB_NAME'),
				this.curveMigrationJob.bind(this),
			);
			await this.agenda.every(
				`${this.configService.get<string>('AGENDA_EVERY_SECONDS')} seconds`,
				this.configService.get<string>('CURVE_JOB_NAME'),
			);
		});
	}

	private uniswapMigrationJob(job: any, done: any): Promise<void> {
		return this.uniswapMigrationService.startMigration().then(() => {
			done();
		});
	}
	private sushiswapMigrationJob(job: any, done: any): Promise<void> {
		return this.sushiswapMigrationService.startMigration().then(() => {
			done();
		});
	}
	private curveMigrationJob(job: any, done: any): Promise<void> {
		return this.curveMigrationService.startMigration().then(() => {
			done();
		});
	}
}
