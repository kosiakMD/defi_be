import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';

const PRICE_TIMOUT = 60e3; // 60 sec

@Module({
	imports: [
		HttpModule.register({
			timeout: PRICE_TIMOUT,
			maxRedirects: 2,
		}),
		ConfigModule,
	],
	providers: [PricesService],
	controllers: [PricesController],
})
export class PricesModule {}
