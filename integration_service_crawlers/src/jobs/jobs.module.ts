import { Module } from '@nestjs/common';

import { DatabaseService } from '../DB/database.service';
import { CurveService } from './curve.service';
import { JobsService } from './jobs.service';
import { SushiswapService } from './sushiswap.service';
import { UniswapService } from './uniswap.service';

@Module({
	imports: [],
	providers: [UniswapService, SushiswapService, CurveService, DatabaseService, JobsService],
})
export class JobsModule {}
