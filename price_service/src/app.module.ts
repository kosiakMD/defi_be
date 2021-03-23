import { Module } from '@nestjs/common';
import { ExamplesModule } from './examples/example.module';
import { PricesModule } from './prices/prices.module';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health/health.controller';
import { PricesController } from './prices/prices.controller';


import { TypeOrmModule } from '@nestjs/typeorm';
import { configService } from './config/config.service';

@Module({
	controllers: [HealthController],
	imports: [TypeOrmModule.forRoot(configService.getTypeOrmConfig()),
		PricesModule,
		TerminusModule, ExamplesModule
		],
})
export class AppModule {}
