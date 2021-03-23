import { Module } from '@nestjs/common';
import { AppController } from './app/app.controller';
import { AppService } from './app/app.service';
import { HealthController } from './health/health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { ServiceHealthIndicator } from './app/app.health';
import { APP_GUARD } from '@nestjs/core';
import { ApiVersionGuard } from '@nestjsx/api-version';

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
