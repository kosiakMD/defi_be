import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

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
        entities: ['dist/apps/rpc_nodes_service/src/**/*.entity{.ts,.js}'],
        migrations: ['dist/apps/rpc_nodes_service/src/modules/database/migrations/*{.ts,.js}'],
        synchronize: false,
        logging: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
