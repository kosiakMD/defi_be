import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PancakesModule } from './app/pancake.module';
import { HealthController } from './health/health.controller';

@Module({
	controllers: [HealthController],
	imports: [TerminusModule, PancakesModule],
})
export class AppModule {}
