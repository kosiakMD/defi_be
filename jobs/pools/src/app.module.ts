import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';

import environment from './config/environment';
import { winstonParams } from './config/winston';
import { LiquidityPoolModule } from './liquiditypool/liquidity.pool.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        synchronize: false,
        logging: false,
      }),
    }),
    HttpModule.register({
      timeout: 5000,
    }),
    ConfigModule.forRoot({
      load: [environment],
      cache: true,
      isGlobal: true,
      ignoreEnvFile: true,
    }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async () => winstonParams('error.log', 'combined.log', 'pools', 'info'),
    }),
    LiquidityPoolModule,
  ],
})
export class AppModule {}
