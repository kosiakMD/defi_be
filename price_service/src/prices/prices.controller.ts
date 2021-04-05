import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiResponse, getSchemaPath } from '@nestjs/swagger';

import { AssetPriceService } from '../services/asset_price.service';
import { CurrentPrice, HistoricalPrice } from './interfaces/prices.interface';

interface PriceHistoricalRequest {
	addresses: string[];
	timestamps: number[];
	currency_id: number;
	platform_id: number;
}

@Controller('prices')
export class PricesController {
	constructor(private assetPriceService: AssetPriceService) {}

	@Get('/')
	@ApiResponse({ status: 200, schema: {} })
	async currentPrices(
		@Query('platformId') platform_id: number,
		@Query('currencyId') currency_id: number,
		@Query('addresses') addresses: string[],
	): Promise<CurrentPrice[]> {
		if (!platform_id) return [];
		if (!currency_id) return [];
		if (!addresses || !addresses.length) return [];

		return await this.assetPriceService.getCurrent(addresses, currency_id, platform_id);
	}

	// TODO Docs body response
	@Get('/historical')
	@Post('/historical')
	async historicalPrices(
		@Body() priceHistoricalRequest: PriceHistoricalRequest,
	): Promise<HistoricalPrice[]> {
		const { addresses, timestamps, currency_id, platform_id } = priceHistoricalRequest;
		if (
			!platform_id ||
			!currency_id ||
			!addresses ||
			!addresses.length ||
			!timestamps ||
			!timestamps.length
		)
			return [];

		return await this.assetPriceService.getHistorical(
			addresses,
			timestamps,
			currency_id,
			platform_id,
		);
	}
}
