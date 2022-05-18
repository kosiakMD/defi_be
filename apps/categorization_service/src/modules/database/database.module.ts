import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { init1647287372738 } from './migrations/1647287372738-init';
import { addGithubFilesTable1648469052708 } from './migrations/1648469052708-add_github_files_table';
import { addContractAnalysisTable1648707974543 } from './migrations/1648707974543-add_contract_analysis_table';
import { insertMasterchefTemplateContract1649335021487 } from './migrations/1649335021487-insert-masterchef-template-contract';
import { insertCompoundTemplateContract1649760170586 } from './migrations/1649760170586-insert-compound-template-contract';
import { contractAnalysisUniqueKey1651230074616 } from './migrations/1651230074616-contract_analysis_unique_key';
import { removeColumnAbiDiff1652691673678 } from './migrations/1652691673678-remove-column-abi_diff';

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
        migrations: [
          init1647287372738,
          addGithubFilesTable1648469052708,
          addContractAnalysisTable1648707974543,
          insertMasterchefTemplateContract1649335021487,
          insertCompoundTemplateContract1649760170586,
          contractAnalysisUniqueKey1651230074616,
          removeColumnAbiDiff1652691673678,
        ],
      }),
    }),
  ],
})
export class DatabaseModule {}
