import { Inject, Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

import { ChainService } from '../lookup/services/chain.service';
import { CurrencyService } from '../lookup/services/currency.service';
import {
  CurrentPricesPayload,
  HistoricalPricesPayload,
  PriceResponseDto,
} from './dto/price.response.dto';
import {
  CurrentPricesRequest,
  HistoricalPricesRequest,
  PriceFormat,
  TimestampMapper,
} from './interfaces';

@Injectable()
export class PriceService {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    @Inject(ChainService) private readonly chainService: ChainService,
    @Inject(CurrencyService) private readonly currencyService: CurrencyService,
  ) {}

  public async getCurrentPrices(
    query: CurrentPricesRequest,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    const { chain, currency, addresses } = query;

    const addressString = "('" + addresses.join("','") + "')";

    const response: CurrentPricesPayload = {};
    const FOURS_HOURS = 4 * 60 * 60;

    const timeInSec = Math.round(Date.now() / 1000) - FOURS_HOURS;

    const querystr = `
      SELECT a.*, ap.*
      FROM prices.asset a
      JOIN prices.asset_price ap ON ap.timestamp > ${timeInSec} AND (a.id = ap.asset_id)
      LEFT OUTER JOIN prices.asset_price  ap2 ON (a.id = ap2.asset_id AND (ap.timestamp < ap2.timestamp ))
      WHERE ap2.timestamp IS NULL AND a.address IN ${addressString} AND a.chain_id = ${chain} AND ap.currency_id = ${currency}
		`;

    const dbEntities = await this.entityManager.query(querystr);

    dbEntities.forEach((item) => {
      response[item.address] = +item.value;
      return;
    });

    return {
      prices: response,
      chain: await this.chainService.getById(chain),
      currency: await this.currencyService.getById(currency),
    };
  }

  public async getHistoricalPrices(
    query: HistoricalPricesRequest,
  ): Promise<PriceResponseDto<HistoricalPricesPayload>> {
    const { chain, currency, addresses, timestamps } = query;

    const response = {};
    const sortedValues = [];
    addresses.forEach((item) => {
      response[item] = {};
      sortedValues[item] = [];
    });

    // prepare timestamp in needed format
    const { timestamps: roundedTimestamps, timestampMapper } = this.formatTimeStamps(timestamps);
    const addressString = `('${addresses.join("','")}')`;
    const timestampsString = `(${roundedTimestamps.join(',')})`;

    const querystr = `
      SELECT a.*, ap.timestamp, ap.value
		  FROM prices.asset a
		  JOIN prices.asset_price ap ON (a.id = ap.asset_id)
		  WHERE  ap.timestamp IN ${timestampsString} AND  a.address IN ${addressString} AND a.chain_id = ${chain} AND ap.currency_id = ${currency}
      ORDER BY ap.asset_id, ap.timestamp
    `;

    const dbEntities = await this.entityManager.query(querystr);
    dbEntities.forEach((item) => {
      response[item.address][timestampMapper[item.timestamp]] = +item.value;
      return;
    });

    return {
      prices: response,
      chain: await this.chainService.getById(chain),
      currency: await this.currencyService.getById(currency),
    };
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
