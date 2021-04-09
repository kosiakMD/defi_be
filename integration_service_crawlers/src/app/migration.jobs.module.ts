import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CurveMigrationService } from './curve.migration.service';
import { DatabaseService } from './database.service';
import { JobsService } from './jobs.service';
import { SushiswapMigrationService } from './sushiswap.migration.service';
import { UniswapMigrationService } from './uniswap.migration.service';

@Module({
	imports: [ConfigModule.forRoot()],
	providers: [
		UniswapMigrationService,
		SushiswapMigrationService,
		CurveMigrationService,
		DatabaseService,
		JobsService,
	],
})
export class JobsModule {}
