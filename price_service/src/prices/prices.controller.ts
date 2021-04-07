import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { AssetPriceService } from '../services/asset_price.service';
import { CurrentPrice, HistoricalPrice } from './interfaces/prices.interface';

interface PriceHistoricalRequest {
	addresses: string[];
	timestamps: number[];
	currencyId: number;
	platformId: number;
}


@Controller('prices')
export class PricesController {
	constructor(private assetPriceService: AssetPriceService) {}

	@Get('/')
	@ApiResponse({ status: 200, schema: {} })
	async currentPrices(
		@Query('platformId') platformId: number,
		@Query('currencyId') currencyId: number,
		@Query('addresses') addresses: string[],
	): Promise<CurrentPrice> {
		if (!platformId) {
			return {};
		}
		if (!currencyId) {
			return {};
		}
		if (!addresses) {
			return {};
		}

		return await this.assetPriceService.getCurrent(addresses, currencyId, platformId);
	}

	// TODO Docs body response
	//@Get('/historical')
	@Post('/historical')
	async historicalPrices(
		@Body() priceHistoricalRequest: PriceHistoricalRequest,
	): Promise<HistoricalPrice> {
		const { addresses, timestamps, currencyId, platformId } = priceHistoricalRequest;
		if (
			!platformId ||
			!currencyId ||
			!addresses ||
			!addresses.length ||
			!timestamps ||
			!timestamps.length
		) {
			return {};
		}

		const response = {};

		const timeInSec = Math.round(Date.now() / 1000);
    const secondsInDay = 24 * 60 * 60;
		const secondsInWeek = timeInSec - secondsInDay * 7;

		// be sure that timesstamps has been sorted
		timestamps.sort((a, b) => a - b);

		const lastWeekTimestamps = [];
		const historicalTimestamps = [];

		for (let i = 0; i < timestamps.length; i++) {
			timestamps[i] = timestamps[i] - (timestamps[i] % secondsInDay);

			if (timestamps[i] > secondsInWeek) {
				lastWeekTimestamps.push(timestamps[i]);
			} else {
				historicalTimestamps.push(timestamps[i]);
			}
		}

		return Promise.all([
			this.assetPriceService.getLastDaysHistoricalPrices(
				addresses,
				lastWeekTimestamps,
				currencyId,
				platformId,
			),
			this.assetPriceService.getHistoricalPrices(
				addresses,
				historicalTimestamps,
				currencyId,
				platformId,
			)
		]).then(items => {

			addresses.forEach((item) => {
				response[item] = Object.assign({}, items[0][item] || {}, items[1][item] || {});
			});

			return response as HistoricalPrice;
			
		  })
		
	}
}
