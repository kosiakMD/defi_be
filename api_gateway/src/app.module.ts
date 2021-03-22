import { Module } from '@nestjs/common';
import { AppController } from './app/app.controller';
import { AppService } from './app/app.service';
import { HealthController } from './health/health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { ServiceHealthIndicator } from './app/app.health';
import { APP_GUARD } from '@nestjs/core';
import { ApiVersionGuard } from '@nestjsx/api-version';
import { ApprovalsController } from './approvals/approvals.controller';
import { BalancesController } from './balances/balances.controller';

@Module({
	imports: [TerminusModule],
	controllers: [
		HealthController,
		AppController,
		ApprovalsController,
		BalancesController,
	],
	providers: [
		{
			provide: APP_GUARD,
			useClass: ApiVersionGuard,
		},
		ServiceHealthIndicator,
		AppService,
	],
})
export class AppModule {}
