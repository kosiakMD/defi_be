import { DatabaseService } from './database.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class DatabaseTransactionManager {
	constructor(
		protected databaseService: DatabaseService,
		@Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
	) {}

	async begin(): Promise<any> {
		const databaseClient = await this.databaseService.getClient();
		return databaseClient.query('begin')
	}

	async commit(): Promise<any> {
		const databaseClient = await this.databaseService.getClient();
		return databaseClient.query('commit')
	}

	async rollback(): Promise<any> {
		const databaseClient = await this.databaseService.getClient();
		return databaseClient.query('rollback')
	}
}
