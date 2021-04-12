import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService {
	constructor(
		private configService: ConfigService,
		@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
	) {}
	public getClient(): Promise<any> {
		return this.getDatabaseConnectInstance().connect();
	}

	private getDatabaseConnectInstance(): any {
		this.logger.log('Connecting to DB...');
		return new Pool({
			host: this.configService.get<string>('DB_HOST'),
			user: this.configService.get<string>('DB_USER'),
			password: this.configService.get<string>('DB_PASS'),
			database: this.configService.get<string>('DB_DATABASE'),
			port: +this.configService.get<string>('DB_PORT'),
		});
	}
}
