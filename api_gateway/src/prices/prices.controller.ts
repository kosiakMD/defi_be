import { Body, Controller, Get, ParseArrayPipe, Post, Query } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import PriceHistoryRequestDTO from '../DTO/PriceHistoryReuqest.dto';
import { Address, PriceHistoricalRequest } from '../interfaces';
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

	// TODO: response interface
	@Post('/historical/:key')
	@ApiBody({
		type: PriceHistoryRequestDTO,
		description: 'Array of price tokens with requested times as array for each price',
	})
	@ApiResponse({ status: 200, type: Object, isArray: true })
	async getHistory(
		@Body() pricesHistoricalRequest: PriceHistoricalRequest,
	): Promise<HistoricalPrice[]> {
		const { addresses, timestamps } = pricesHistoricalRequest;
		const currencyId = 1;
		const platformId = 1;
		return this.service.getHistorical(addresses, timestamps, currencyId, platformId);
	}
}
