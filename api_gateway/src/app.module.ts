import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ApiVersionGuard } from '@nestjsx/api-version';

import { AppController } from './app/app.controller';
import { ServiceHealthIndicator } from './app/app.health';
import { AppService } from './app/app.service';
import { HealthController } from './health/health.controller';

@Module({
	imports: [TerminusModule],
	controllers: [HealthController, AppController],
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
