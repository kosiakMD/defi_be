import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getManager, Repository } from 'typeorm';

import Asset from '../models/asset.entity';
import AssetPrice from '../models/asset_price.entity';
import {
  CurrentPrice,
  HistoricalPrice,
  PriceFormat,
  TimestampMapper,
} from '../prices/interfaces/prices.interface';

@Injectable()
export class AssetPriceService {
  constructor(
    @InjectRepository(AssetPrice) private readonly repo: Repository<AssetPrice>,
    @InjectRepository(Asset) private readonly assetRepo: Repository<Asset>,
  ) {}

  public async getAll() {
    return await this.repo.find();
  }

  public async getCurrent(address: string[], currencyId = 1, chainId = 1): Promise<CurrentPrice> {
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
      WHERE ap2.timestamp IS NULL AND a.address IN ${addressString} AND a.chain_id = ${chainId} AND ap.currency_id = ${currencyId}
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
    chainId = 1,
  ): Promise<HistoricalPrice> {
    const entityManager = getManager();

    const response = {};
    const sortedValues = [];
    address.forEach((item) => {
      response[item] = {};
      sortedValues[item] = [];
    });

    // prepare timestamp in needed format
    const { timestamps: roundedTimestamps, timestampMapper } = this.formatTimeStamps(timestamps);

    const addressString = `('${address.join("','")}')`;
    const timestampsString = `(${roundedTimestamps.join(',')})`;

    const querystr = `
      SELECT a.*, ap.timestamp, ap.value
		  FROM prices.asset a
		  JOIN prices.asset_price ap ON (a.id = ap.asset_id)
		  WHERE  ap.timestamp IN ${timestampsString} AND  a.address IN ${addressString} AND a.chain_id = ${chainId} AND ap.currency_id = ${currencyId}
      ORDER BY ap.asset_id, ap.timestamp
    `;

    const dbEntities = await entityManager.query(querystr);
    dbEntities.forEach((item) => {
      response[item.address][timestampMapper[item.timestamp.toString()]] = item.value;
      return;
    });

    return response as HistoricalPrice;
  }

  formatTimeStamps(timestamps: number[]): PriceFormat {
    const timeInSec = Math.round(Date.now() / 1000);
    const dayInSeconds = 24 * 60 * 60;
    const hourInSeconds = 60 * 60;
    const weekAgoInSeconds = timeInSec - dayInSeconds * 7;

    // be sure that timesstamps has been sorted
    timestamps.sort((a, b) => a - b);

    const roundedTimestamps: number[] = [];
    const timestampMapper: TimestampMapper = {};
    for (let i = 0; i < timestamps.length; i++) {
      const timestamp =
        timestamps[i] > weekAgoInSeconds
          ? timestamps[i] - (timestamps[i] % hourInSeconds)
          : timestamps[i] - (timestamps[i] % dayInSeconds);

      timestampMapper[timestamp] = timestamps[i];
      roundedTimestamps.push(timestamp);
    }

    return { timestamps: roundedTimestamps, timestampMapper };
  }
}
