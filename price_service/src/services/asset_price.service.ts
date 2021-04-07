import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getManager, Repository } from 'typeorm';

import Asset from '../models/asset.entity';
import AssetPrice from '../models/asset_price.entity';
import { CurrentPrice, HistoricalPrice } from '../prices/interfaces/prices.interface';
@Injectable()
export class AssetPriceService {
	constructor(
		@InjectRepository(AssetPrice) private readonly repo: Repository<AssetPrice>,
		@InjectRepository(Asset) private readonly asset_repo: Repository<Asset>,
	) {}

	public async getAll() {
		return await this.repo.find();
	}

	public async getCurrent(
		address: string[],
		currencyId = 1,
		platformId = 1,
	): Promise<CurrentPrice> {
		const entityManager = getManager();
		const addressString = "('" + address.join("','") + "')";

		const response: CurrentPrice = {};
		const FOURS_HOURS = 4 * 60 * 60;

		const timeInSec = Math.round(Date.now() / 1000) - FOURS_HOURS;

		const querystr = `
		SELECT a.*, ap.*
		FROM prices.asset a
		JOIN prices.asset_price ap ON ap.timestamp > ${timeInSec} AND (a.id = ap.asset_id)
		LEFT OUTER JOIN prices.asset_price  ap2 ON (a.id = ap2.asset_id AND (ap.timestamp < ap2.timestamp ))
		WHERE ap2.timestamp IS NULL AND a.address IN ${addressString} AND a.platform_id = ${platformId} AND ap.currency_id = ${currencyId}
		`;

		const dbEntities = await entityManager.query(querystr);

		dbEntities.forEach((item) => {
			response[item.address] = item.value;
			return;
		});

		return response as CurrentPrice;
	}

	public async getHistoricalPrices(
		address: string[],
		timestamps: number[],
		currencyId = 1,
		platformId = 1,
	): Promise<HistoricalPrice> {
		const entityManager = getManager();

		const response = {};
		const sortedValues = [];
		address.forEach((item) => {
			response[item] = {};
			sortedValues[item] = [];
		});

		const addressString = "('" + address.join("','") + "')";
		const timestampsString = '(' + timestamps.join(',') + ')';

		const querystr = `
      SELECT a.*, ap.timestamp, ap.value
		  FROM prices.asset a
		  JOIN prices.asset_price ap ON (a.id = ap.asset_id)
		  WHERE  ap.timestamp IN ${timestampsString} AND  a.address IN ${addressString} AND a.platform_id = ${platformId} AND ap.currency_id = ${currencyId}
      ORDER BY ap.asset_id, ap.timestamp
    `;

		const dbEntities = await entityManager.query(querystr);
		dbEntities.forEach((item) => {
			response[item.address][item.timestamp + ''] = item.value;
			return;
		});

		return response as HistoricalPrice;
	}

	public async getLastDaysHistoricalPrices(
		address: string[],
		timestamps: number[],
		currencyId = 1,
		platformId = 1,
	): Promise<HistoricalPrice> {
		const entityManager = getManager();

		const response = {};
		const sortedValues = [];
		address.forEach((item) => {
			response[item] = {};
			sortedValues[item] = [];
		});

		const addressString = "('" + address.join("','") + "')";
		const SIDE_RANGE_SECONDS = 60 * 60 * 2;


		const getClosestValue = (list, current) => {
			return list.reduce(function(prev, curr) {
				return (Math.abs(Number(curr.timestamp) - current) < Math.abs(Number(prev.timestamp) - current) ? curr : prev);
			  });
		}

		let timestampsQueryString= '';
		timestamps.forEach((item) => {
			timestampsQueryString += '(ap.timestamp BETWEEN ' + (item - SIDE_RANGE_SECONDS) + ' AND ' + (item + SIDE_RANGE_SECONDS) +') OR ';
			return;
		});

		timestampsQueryString = timestampsQueryString.substring(0,timestampsQueryString.length -3);

		const querystr = `
      SELECT a.*, ap.timestamp, ap.value
		  FROM prices.asset a
		  JOIN prices.asset_price ap ON (a.id = ap.asset_id)
		  WHERE   (${timestampsQueryString}) AND  a.address IN ${addressString} AND a.platform_id = ${platformId} AND ap.currency_id = ${currencyId}
      ORDER BY ap.asset_id, ap.timestamp
    `;

		const dbEntities = await entityManager.query(querystr);
		dbEntities.forEach((item) => {
			sortedValues[item.address].push(item);
			return;
		});

		address.forEach((item) => {
			timestamps.forEach((tsItem) => {
				if(sortedValues[item].length)
					response[item][tsItem.toString()] = getClosestValue(sortedValues[item], Number(tsItem))['value'];
				else
					response[item][tsItem.toString()] = 0;
				return;
			});
			return;
		});

		return response as HistoricalPrice;
	}

	

}

