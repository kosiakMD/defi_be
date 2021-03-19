import { Module } from '@nestjs/common';
import { AppController } from './app/app.controller';
import { AppService } from './app/app.service';
import { HealthController } from './health/health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { ServiceHealthIndicator } from './app/app.health';
import { ApprovalsController } from './approvals/approvals.controller';

@Module({
	imports: [TerminusModule],
	controllers: [HealthController, AppController, ApprovalsController],
	providers: [ServiceHealthIndicator, AppService],
})
export class AppModule {}
