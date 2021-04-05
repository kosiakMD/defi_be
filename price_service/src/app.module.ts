import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';

import { configService } from './config/config.service';
import { ExamplesModule } from './examples/example.module';
import { HealthController } from './health/health.controller';
import { PricesModule } from './prices/prices.module';

@Module({
	controllers: [HealthController],
	imports: [
		TypeOrmModule.forRoot(configService.getTypeOrmConfig()),
		PricesModule,
		TerminusModule,
		ExamplesModule,
	],
})
export class AppModule {}
