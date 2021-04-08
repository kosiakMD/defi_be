import { Controller, Get, Query } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { AssetPriceService } from '../services/asset_price.service';
import { CurrentPrice, HistoricalPrice } from './interfaces/prices.interface';

@Controller('prices')
export class PricesController {
	constructor(private assetPriceService: AssetPriceService) {}

	@Get('/')
	@ApiResponse({ status: 200, schema: {} })
	async currentPrices(
		@Query('chainId') chainId: number,
		@Query('currencyId') currencyId: number,
		@Query('addresses') addresses: string[],
		@Query('timestamps') timestamps: number[],
	): Promise<CurrentPrice | HistoricalPrice> {
		if (!chainId) {
			return {};
		}
		if (!currencyId) {
			return {};
		}
		if (!addresses || !addresses.length) {
			return {};
		}

    if (timestamps && timestamps.length) {
      return await this.assetPriceService.getHistoricalPrices(
        addresses,
        timestamps,
        currencyId,
        chainId,
      ) as HistoricalPrice;
    }

		return await this.assetPriceService.getCurrent(addresses, currencyId, chainId);
	}
}
