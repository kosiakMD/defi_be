import { Controller, Get, Query } from '@nestjs/common';

import { AssetPriceService } from '../services/asset_price.service';
import { CurrentPrice, HistoricalPrice } from './interfaces/prices.interface';

@Controller('prices')
export class PricesController {
	constructor(private assetPriceService: AssetPriceService) {}

	@Get('/')
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

	@Get('/historical')
	async historicalPrices(
		@Query('platformId') platform_id: number,
		@Query('currencyId') currency_id: number,
		@Query('timestamps') timestamps: number[],
		@Query('addresses') addresses: string[],
	): Promise<HistoricalPrice[]> {
		if (!platform_id || !currency_id || !addresses || !addresses.length || !timestamps || !timestamps.length) return [];

		return await this.assetPriceService.getHistorical(addresses, timestamps, currency_id, platform_id);
	}
}
