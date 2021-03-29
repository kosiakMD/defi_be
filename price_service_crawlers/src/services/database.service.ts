import { Inject, Injectable } from '@nestjs/common';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { toTimestamp } from '../utils/common';
import { CURRENCY, PLATFORM } from '../utils/constants';

export type TokenPrices = { [key: string]: number };
export type TokenAddreses = { [key: string]: number };

@Injectable()
export class DatabaseService {
	constructor(@Inject(NEST_PGPROMISE_CONNECTION) public pg: IDatabase<any>) {}

	public getTokenByAddress = (address: string) => this.pg.any('SELECT * FROM prices.asset WHERE address = $1', address);

	public getAllTokens = () => this.pg.any('SELECT * FROM prices.asset WHERE $1', '1');

	public getSushiTokens = () => this.pg.any('SELECT * FROM prices.asset WHERE resource = $1', 'SUSHISWAP');

	public getUniTokens = () => this.pg.any('SELECT * FROM prices.asset WHERE resource = $1', 'UNISWAP');

	public getNewTokens = () => this.pg.any('SELECT * FROM prices.asset WHERE is_new = true');

	public getNewTokensByResource = (resource: string) =>
		this.pg.any('SELECT * FROM prices.asset WHERE is_new = true AND resource = $1', resource);

	public getTokensByPlatform = (current_platfrom_id) =>
		this.pg.any('SELECT * FROM prices.asset WHERE platform_id = $1', current_platfrom_id);

	public getCurrentPlatform = async () => {
		const platforms = await this.pg.any('SELECT * FROM prices.platform WHERE name = $1', PLATFORM);
		if (!platforms.length) return null;
		return platforms[0].id;
	};

	public getCurrentCurrency = async () => {
		const curencies = await this.pg.any('SELECT * FROM prices.currency WHERE name = $1', CURRENCY);
		if (!curencies.length) return null;
		return curencies[0].id;
	};

	public addNewTokenToDb = (token: any, platform_id) =>
		this.pg.any(
			'INSERT INTO prices.asset(address, symbol, name, type, platform_id, is_new) VALUES ($1, $2, $3, $4, $5, true); ',
			[token['platforms'][PLATFORM], token['symbol'], token['name'], PLATFORM, platform_id, true],
		);

	public addNewSushiTokenToDb = (address, name, symbol, type, resource, platform_id) =>
		this.pg.any(
			'INSERT INTO prices.asset(address, symbol, name, type, resource, platform_id, is_new) VALUES ($1, $2, $3, $4, $5, $6, true); ',
			[address, symbol, name, type, resource, platform_id, true],
		);

	public saveTokenPrices = async (coin_id, prices) => {
		let values;
		try {
			values = prices
				.map(({ id, timestamp, price, currency_id }) => `('${id}',${currency_id},${timestamp},${price})`)
				.join(',');

			if (values) {
				await this.pg.any(
					'INSERT INTO prices.asset_price(asset_id, currency_id, "timestamp", value) VALUES ' + values + '',
				);
				await this.pg.any('UPDATE prices.asset SET is_new = false WHERE id = $1', coin_id + '');
			}

			return true;
		} catch (e) {
			console.error('coin error ' + coin_id + ' ', values);
			console.error('Token save error:', e);
			return false;
		}
	};

	public addHourlyPricesToDb = async (prices: TokenPrices[], currency_id: any) => {
		const current_timestamp = toTimestamp(new Date());
		try {
			for (const address in prices) {
				if (prices[address].db_id && (prices[address].value || prices[address]['value'] === 0)) {
					await this.pg.any(
						'INSERT INTO prices.asset_price(asset_id, currency_id, "timestamp", value) VALUES ($1, $2, $3, $4); ',
						[prices[address].db_id, currency_id, current_timestamp, prices[address].value],
					);
				} else console.error('some error with ', prices[address]);
			}
		} catch (e) {
			console.error(e);
		}
		return;
	};
}
