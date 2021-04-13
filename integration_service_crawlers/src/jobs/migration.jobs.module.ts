import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseService } from './database.service';
import { JobsService } from './jobs.service';
import { PoolsModule } from '../pools/pools.module';
import { VaultsModule } from '../vaults/vaults.module';
import { UniswapService } from './uniswap.service';
import { SushiswapService } from './sushiswap.service';
import { CurveService } from './curve.service';

@Module({
	imports: [
		ConfigModule.forRoot(),
		forwardRef(() => PoolsModule),
		forwardRef(() => VaultsModule),
	],
	providers: [
		UniswapService,
		SushiswapService,
		CurveService,
		DatabaseService,
		JobsService
	],
	exports: [DatabaseService]
})
export class JobsModule {}
