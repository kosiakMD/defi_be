import { HttpModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ApiVersionGuard } from '@nestjsx/api-version';
import { AppController } from './app/app.controller';
import { ServiceHealthIndicator } from './app/app.health';
import { AppService } from './app/app.service';
import { HealthController } from './health/health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { ServiceHealthIndicator } from './app/app.health';
import { APP_GUARD } from '@nestjs/core';
import { ApiVersionGuard } from '@nestjsx/api-version';
import { ApprovalsController } from './approvals/approvals.controller';
import { BalancesController } from './balances/balances.controller';
import { SwapController } from './swap/swap.controller';
import { UniswapController } from './uniswap/uniswap.controller';
import { CurveController } from './curve/curve.controller';
import { SushiswapController } from './sushiswap/sushiswap.controller';
import { BalancerController } from './balancer/balancer.controller';
import { PlatformController } from './platform/platform.controller';
import { TokensController } from './tokens/tokens.controller';
import { GasController } from './gas/gas.controller';
import { TransactionsController } from './transactions/transactions.controller';
import { TransfersController } from './transfers/transfers.controller';
import { PricesController } from './prices/prices.controller';
import { PoolsController } from './pool/pools.controller';
import { PoolsService } from './pool/pools.service';
import { PoolsModule } from './pool/pools.module';

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
		// PoolsController,
	],
	providers: [
		{
			provide: APP_GUARD,
			useClass: ApiVersionGuard,
		},
		ServiceHealthIndicator,
		AppService,
		// PoolsService,
	],
})
export class AppModule {}
