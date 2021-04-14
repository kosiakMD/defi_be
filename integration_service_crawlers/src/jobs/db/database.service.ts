import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class DatabaseService {
	private static isConnected: boolean = false
	private connection
	constructor(
		private configService: ConfigService,
		@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
	) {}
	public getClient() {
		if (!DatabaseService.isConnected) {
			this.connection = this.getDatabaseConnectInstance().connect()
			DatabaseService.isConnected = true
		}
		return this.connection
	}

	private getDatabaseConnectInstance() {
		this.logger.log('Connecting to database with connection pool...');
		return new Pool({
			host: this.configService.get<string>('DB_HOST'),
			user: this.configService.get<string>('DB_USER'),
			password: this.configService.get<string>('DB_PASS'),
			database: this.configService.get<string>('DB_DATABASE'),
			port: +this.configService.get<string>('DB_PORT'),
		});
	}
}
