import { Module } from '@nestjs/common';
import { ExamplesModule } from './examples/example.module';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health/health.controller';

@Module({
	controllers: [HealthController],
	imports: [TerminusModule, ExamplesModule],
})
export class AppModule {}
