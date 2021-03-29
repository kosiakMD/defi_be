import { HttpModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ApiVersionGuard } from '@nestjsx/api-version';

import { AppController } from './app/app.controller';
import { ServiceHealthIndicator } from './app/app.health';
import { AppService } from './app/app.service';
import { ApprovalsController } from './approvals/approvals.controller';
import { BalancerController } from './balancer/balancer.controller';
import { BalancesController } from './balances/balances.controller';
import { CurveController } from './curve/curve.controller';
import { GasController } from './gas/gas.controller';
import { HealthController } from './health/health.controller';
import { PlatformController } from './platform/platform.controller';
import { PoolsModule } from './pool/pools.module';
import { PricesController } from './prices/prices.controller';
import { SushiswapController } from './sushiswap/sushiswap.controller';
import { SwapController } from './swap/swap.controller';
import { TokensController } from './tokens/tokens.controller';
import { TransactionsController } from './transactions/transactions.controller';
import { TransfersController } from './transfers/transfers.controller';
import { UniswapController } from './uniswap/uniswap.controller';

@Module({
	imports: [TerminusModule, HttpModule, PoolsModule],
	controllers: [
		HealthController,
		AppController,
		ApprovalsController,
		BalancesController,
		SwapController,
		UniswapController,
		CurveController,
		SushiswapController,
		BalancerController,
		PlatformController,
		TokensController,
		GasController,
		TransactionsController,
		TransfersController,
		PricesController,
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
