import { HttpModule, Module } from '@nestjs/common';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { PoolsService } from './pools.service';
import { PoolsServiceSushiswap } from './pools.service.sushiswap';
import { PoolsServiceUniswap } from './pools.service.uniswap';
import { PoolsServiceBalancer } from './pools.service.balancer';
import { PoolsServiceCurve } from './pools.service.curve';
import { ConfigModule } from '@nestjs/config';
import { ApisModule } from '../apis/apis.module';
import { PoolsServicePancake } from './pools.service.pancake';
import { JobsModule } from '../jobs/jobs.module';

@Module({
	imports: [
		HttpModule.register({
			timeout: 60000,
			maxRedirects: 5,
		}),
		JobsModule,
		ConfigModule,
		ThegraphModule,
		ApisModule
	],
	providers: [PoolsService, PoolsServiceUniswap, PoolsServiceSushiswap, PoolsServiceBalancer, PoolsServiceCurve, PoolsServicePancake],
	exports: [PoolsService]
})
export class PoolsModule {
}
