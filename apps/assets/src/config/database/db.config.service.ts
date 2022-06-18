import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  public createTypeOrmOptions(): TypeOrmModuleOptions {
    this.logger.log(`Database user used: ${this.configService.get<string>('database.username')}`);
    return {
      autoLoadEntities: true,
      type: 'postgres',
      schema: this.configService.get<string>('database.schema'),
      host: this.configService.get<string>('database.host'),
      port: this.configService.get<number>('database.port'),
      username: this.configService.get<string>('database.username'),
      password: this.configService.get<string>('database.password'),
      database: this.configService.get<string>('database.name'),
      synchronize: this.configService.get<boolean>('database.synchronize'),
      logging: false,
      namingStrategy: new SnakeNamingStrategy(),
    };
  }
}
