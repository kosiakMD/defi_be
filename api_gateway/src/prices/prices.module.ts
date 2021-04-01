import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';

@Module({
	imports: [
		HttpModule.register({
			timeout: 5e3,
			maxRedirects: 2,
		}),
		ConfigModule,
	],
	providers: [PricesService],
	controllers: [PricesController],
})
export class PricesModule {}
