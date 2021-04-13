import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService {
	constructor(private configService: ConfigService) {}
	public getClient(): Promise<any> {
		return this.getDatabaseConnectInstance().connect();
	}

	private getDatabaseConnectInstance(): any {
		return new Pool({
			host: this.configService.get<string>('DB_HOST'),
			user: this.configService.get<string>('DB_USER'),
			password: this.configService.get<string>('DB_PASS'),
			database: this.configService.get<string>('DB_DATABASE'),
			port: +this.configService.get<string>('DB_PORT'),
		});
	}
}
