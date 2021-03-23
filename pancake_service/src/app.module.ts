import { Module } from '@nestjs/common';
import { PancakesModule } from './app/pancake.module';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health/health.controller';

@Module({
	controllers: [HealthController],
	imports: [TerminusModule, PancakesModule],
})
export class AppModule {}
