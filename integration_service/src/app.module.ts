import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { ExamplesModule } from './examples/example.module';
import { HealthController } from './health/health.controller';

@Module({
	controllers: [HealthController],
	imports: [TerminusModule, ExamplesModule],
})
export class AppModule {}
