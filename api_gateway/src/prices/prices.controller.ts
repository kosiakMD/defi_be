import { Controller, Get, Param, ParseArrayPipe, Query } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PlatformEnum } from '../enum';
import { Address } from '../interfaces';
import { HistoricalPrice } from './prices.interface';
import { PricesService } from './prices.service';

@ApiTags('Prices')
@Controller('prices')
export class PricesController {
	constructor(private service: PricesService) {}

	@Get('/')
	@ApiQuery({
		name: 'tokens',
		type: String,
		example:
			'0x0000000000000000000000000000000000000000,0x0000000000000000000000000000000000000000',
		description: 'comma-separated Array String',
	})
	@ApiResponse({ status: 200, type: String })
	async get(
		@Query('tokens', new ParseArrayPipe({ items: String, separator: ',' }))
		tokens: Address[],
	): Promise<any> {
		const currencyId = 1;
		const platformId = 1;
		return this.service.getPrices(tokens, currencyId, platformId);
	}

	@Get('/historical/:key')
	@ApiParam({
		name: 'platform',
		enum: PlatformEnum,
	})
	@ApiQuery({
		name: 'tokenAddress',
		type: String,
		description: 'Token address',
	})
	@ApiQuery({
		name: 'timestamps',
		type: String,
		isArray: true,
		description: 'DateString',
	})
	@ApiResponse({ status: 200, type: String, isArray: true })
	async getHistory(
		@Param('platform') platform: PlatformEnum = PlatformEnum.tokens,
		@Query('tokenAddress') tokenAddress: Address,
		@Query('timestamps', new ParseArrayPipe({ items: String, separator: ',' }))
		timestamps: string[],
	): Promise<HistoricalPrice[]> {
		const currencyId = 1;
		const platformId = 1;
		console.info(platform);
		return this.service.getHistorical(tokenAddress, timestamps, currencyId, platformId);
	}
}
