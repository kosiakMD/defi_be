import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { init1647287372738 } from './migrations/1647287372738-init';
import { addGithubFilesTable1648469052708 } from './migrations/1648469052708-add_github_files_table';

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
        entities: ['dist/**/*.entity{.ts,.js}'],
        synchronize: JSON.parse(configService.get('DB_SYNCHRONIZE')),
        logging: JSON.parse(configService.get('DB_LOGGING')),
        retryAttempts: 50,
        extra: {
          connectionLimit: 50,
        },
        migrations: [init1647287372738, addGithubFilesTable1648469052708],
      }),
    }),
  ],
})
export class DatabaseModule {}
