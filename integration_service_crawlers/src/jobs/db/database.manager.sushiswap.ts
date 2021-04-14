import { DatabaseService } from './database.service';
import { ConfigService } from '@nestjs/config';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DatabaseManagerUniswap } from './database.manager.uniswap';

@Injectable()
export class DatabaseManagerSushiswap extends DatabaseManagerUniswap{
	protected mintsTableName: string = 'sushiswap_mints'
	protected burnsTableName: string = 'sushiswap_burns'
	protected swapsTableName: string = 'sushiswap_swaps'
	protected snapshotsTableName: string = 'sushiswap_snapshots'
	constructor(
		protected databaseService: DatabaseService,
		protected configService: ConfigService,
		@Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
	) {
		super(databaseService, configService, logger)
	}
}
