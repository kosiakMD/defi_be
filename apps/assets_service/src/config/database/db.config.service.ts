import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  public createTypeOrmOptions(): TypeOrmModuleOptions {
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
