import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ApiVersionGuard } from '@nestjsx/api-version';

import { AppController } from './app/app.controller';
import { ServiceHealthIndicator } from './app/app.health';
import { AppService } from './app/app.service';
import { ApprovalsModule } from './approvals/approvals.module';
import { BalancerController } from './balancer/balancer.controller';
import { BalancesController } from './balances/balances.controller';
import configuration from './config/configuration';
import { CurveController } from './curve/curve.controller';
import { GasModule } from './gas/gas.module';
import { HealthController } from './health/health.controller';
import { PlatformController } from './platform/platform.controller';
import { PoolsModule } from './pool/pools.module';
import { PricesModule } from './prices/prices.module';
import { SushiswapController } from './sushiswap/sushiswap.controller';
import { SwapController } from './swap/swap.controller';
import { TokensModule } from './tokens/tokens.module';
import { TransactionsController } from './transactions/transactions.controller';
import { TransfersController } from './transfers/transfers.controller';
import { UniswapController } from './uniswap/uniswap.controller';

@Module({
	imports: [
		TerminusModule,
		HttpModule,
		PoolsModule,
		TokensModule,
		GasModule,
		ApprovalsModule,
		PricesModule,
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration],
			envFilePath: ['.env.development.local', '.env.development', '.env.production', '.env'],
		}),
	],
	controllers: [
		HealthController,
		AppController,
		BalancesController,
		SwapController,
		UniswapController,
		CurveController,
		SushiswapController,
		BalancerController,
		PlatformController,
		TransactionsController,
		TransfersController,
	],
	providers: [
		// TODO: for global auto caching
		// {
		// 	provide: APP_INTERCEPTOR,
		// 	useClass: CacheInterceptor,
		// },
		{
			provide: APP_GUARD,
			useClass: ApiVersionGuard,
		},
		ServiceHealthIndicator,
		AppService,
	],
})
export class AppModule {}
