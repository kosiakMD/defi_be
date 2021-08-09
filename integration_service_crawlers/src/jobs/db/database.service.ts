import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Pool } from 'pg';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService {
  private static isConnected = false;
  private connection;
  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}
  public getClient() {
    if (!DatabaseService.isConnected) {
      this.connection = this.getDatabaseConnectInstance().connect();
      DatabaseService.isConnected = true;
    }
    return this.connection;
  }

  private getDatabaseConnectInstance() {
    this.logger.log('Connecting to database with connection pool...');
    return new Pool({
      host: this.configService.get<string>('DB_HOST'),
      port: +this.configService.get<string>('DB_PORT'),
      user: this.configService.get<string>('DB_USERNAME'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: this.configService.get<string>('DB_DATABASE'),
    });
  }
}
