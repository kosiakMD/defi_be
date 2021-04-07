import {
	HttpModule,
	Inject,
	MiddlewareConsumer,
	Module,
	NestModule,
	OnModuleInit,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ApiVersionGuard } from '@nestjsx/api-version';
import {
	utilities as nestWinstonModuleUtilities,
	WINSTON_MODULE_NEST_PROVIDER,
	WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';

import { AppController } from './app/app.controller';
import { ServiceHealthIndicator } from './app/app.health';
import { AppService } from './app/app.service';
import { ApprovalsModule } from './approvals/approvals.module';
import { BalancerController } from './balancer/balancer.controller';
import { BalancesController } from './balances/balances.controller';
import { Logger } from './common/Logger/Logger.service';
import { LoggerMiddleware } from './common/middlewares/logger.middleware';
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
import { VaultsModule } from './vaults/vaults.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration],
			envFilePath: ['.env.development.local', '.env.development', '.env.production', '.env'],
		}),
		WinstonModule.forRoot({
			// TODO: left for custom logger
			// LoggerModule.forRoot({
			// options
			level: process.env.LOG_LEVEL || 'info',
			format: winston.format.json(),
			defaultMeta: { service: process.env.SERVICE_NAME },
			transports: [
				// NestJS console like logs
				new winston.transports.Console({
					format: winston.format.combine(
						winston.format.timestamp(),
						nestWinstonModuleUtilities.format.nestLike(),
					),
				}),
				// - Write all logs with level `error` and below to `error.log`
				new winston.transports.File({ filename: process.env.LOG_ERROR_FILE, level: 'error' }),
				// - Write all logs with level `info` and below to `combined.log`
				new winston.transports.File({ filename: process.env.LOG_COMBINED_FILE }),
			],
		}),
		TerminusModule,
		HttpModule,
		ApprovalsModule,
		PoolsModule,
		VaultsModule,
		TokensModule,
		GasModule,
		PricesModule,
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
		// TODO: left for custom logger
		// {
		// 	provide: WINSTON_MODULE_NEST_PROVIDER,
		// 	useClass: Logger,
		// },
		// {
		// 	provide: 'Logger',
		// 	useClass: Logger,
		// },
		ServiceHealthIndicator,
		AppService,
	],
})
export class AppModule implements NestModule, OnModuleInit {
	configure(consumer: MiddlewareConsumer): void {
		consumer.apply(LoggerMiddleware).forRoutes('/');
		// consumer.apply(ProxyMiddleware).forRoutes('/vaults');
	}

	onModuleInit(): void {
		const { SERVICE_NAME, PORT, HOST } = process.env;
		this.logger.log(
			{
				name: SERVICE_NAME,
				host: HOST,
				port: PORT,
			},
			'SERVICE',
		);
		this.logger.verbose(this.configService, SERVICE_NAME);
	}

	constructor(
		// TODO: left for custom logger
		// private readonly logger: Logger,
		@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
		private configService: ConfigService,
	) {}
}
