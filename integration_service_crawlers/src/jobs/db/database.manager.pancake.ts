import { DatabaseService } from './database.service';
import { ConfigService } from '@nestjs/config';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DatabaseManagerUniswap } from './database.manager.uniswap';

@Injectable()
export class DatabaseManagerPancake extends DatabaseManagerUniswap {
	protected mintsTableName: string = 'pancake_mints'
	protected burnsTableName: string = 'pancake_burns'
	protected swapsTableName: string = 'pancake_swaps'
	protected snapshotsTableName: string = 'pancake_snapshots'
	constructor(
		protected databaseService: DatabaseService,
		protected configService: ConfigService,
		@Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
	) {
		super(databaseService, configService, logger)
	}
}
