import { LoggerService } from '@nestjs/common';

export async function crawlCoin(
	coinId,
	coin,
	prices,
	currencyId,
	db,
	logger: LoggerService,
	platform: string,
) {
	if (!coin.address) {
		logger.log(`Coin ${coin.id} ${coin.symbol} address not found, skipping`);
		return;
	}

	logger.log(`${platform} ${prices.length} prices found`);
	if (prices.length) {
		const tokenPrices = prices.map(([timestamp, price]) => ({
			id: coin.id,
			address: coin.address,
			timestamp: Math.round(timestamp / 1000),
			price: price,
			['currency_id']: currencyId,
		}));

		return await db.saveTokenPrices(coinId, tokenPrices);
	}
	return true;
}
