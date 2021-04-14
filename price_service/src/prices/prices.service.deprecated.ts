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
import { CurrentPricesRequest, HistoricalPricesRequest } from './interfaces';

interface TimestampMapper {
  [key: number]: number;
}

interface PriceFormat {
  timestamps: number[];
  timestampMapper: TimestampMapper;
}

const SECONDS_IN_HOUR = 60 * 60;
const SECONDS_IN_DAY = 24 * SECONDS_IN_HOUR;
const ALLOWED_PRICE_THRESHOLD = 4 * SECONDS_IN_HOUR;

/**
 * @deprecated This price service is deprecated and should not be used
 */
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

    const allowedTimeLimit = Math.round(Date.now() / 1000) - ALLOWED_PRICE_THRESHOLD;
    const queryString = `
      SELECT a.*, ap.*
      FROM prices.asset a
      JOIN prices.asset_price ap
        ON ap.timestamp > ${allowedTimeLimit} AND (a.id = ap.asset_id)
      LEFT OUTER JOIN prices.asset_price ap2
        ON (a.id = ap2.asset_id AND (ap.timestamp < ap2.timestamp ))
      WHERE 
        ap2.timestamp IS NULL AND
        a.address IN (${addresses.join("','")}) AND
        a.chain_id = ${chain} AND
        ap.currency_id = ${currency}
		`;

    const response: CurrentPricesPayload = {};
    const dbEntities = await this.entityManager.query(queryString);

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

    const { timestamps: roundedTimestamps, timestampMapper } = this.formatTimeStamps(timestamps);
    const queryString = `
      SELECT a.*, ap.timestamp, ap.value
		  FROM prices.asset a
		  JOIN prices.asset_price ap
		    ON (a.id = ap.asset_id)
		  WHERE
		    ap.timestamp IN ('${roundedTimestamps.join(',')}') AND
		    a.address IN ('${addresses.join("','")}') AND
		    a.chain_id = ${chain} AND
		    ap.currency_id = ${currency}
      ORDER BY ap.asset_id, ap.timestamp
    `;

    const dbEntities = await this.entityManager.query(queryString);
    dbEntities.forEach((item) => {
      response[item.address][timestampMapper[item.timestamp.toString()]] = +item.value;
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
    const weekAgoInSeconds = timeInSec - SECONDS_IN_DAY * 7;

    timestamps.sort((a, b) => a - b);

    const roundedTimestamps: number[] = [];
    const timestampMapper: TimestampMapper = {};
    for (let i = 0; i < timestamps.length; i++) {
      const timestamp =
        timestamps[i] > weekAgoInSeconds
          ? timestamps[i] - (timestamps[i] % SECONDS_IN_HOUR)
          : timestamps[i] - (timestamps[i] % SECONDS_IN_DAY);

      timestampMapper[timestamp] = timestamps[i];
      roundedTimestamps.push(timestamp);
    }

    return { timestamps: roundedTimestamps, timestampMapper };
  }
}
