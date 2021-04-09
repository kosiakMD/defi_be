import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';

import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { PoolsModule } from './pools/pools.module';
import { ThegraphModule } from './thegraph/thegraph.module';
import { UniswapModule } from './uniswap/uniswap.module';

@Module({
	imports: [
		TerminusModule,
		UniswapModule,
		PoolsModule,
		ThegraphModule,
		DatabaseModule,
		ConfigModule.forRoot({
			isGlobal: true,
		}),
	],
	controllers: [HealthController],
})
export class AppModule {
}
