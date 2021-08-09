import axios from 'axios';
import rateLimit from 'axios-rate-limit';
import PromisePool from 'es6-promise-pool';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { Inject, Injectable } from '@nestjs/common';

import { Logger } from '../Logger/Logger.service';
import {
  getCurrentEthPrice,
  getCurrentBtcPrice,
  getCoinHistoricalRangePrices,
} from '../apis/coingecko.api';
import { DatabaseService } from '../services/database.service';
import { Api } from '../thegraph/api';
import { toTimestamp } from '../utils/common';
import {
  SECONDS_IN_TEN_MINUTES,
  PlatformEnum,
  CHAIN,
  CURRENCY,
  SECONDS_IN_DAY,
  SECONDS_IN_WEEK,
} from '../utils/constants';
import { getRequiredHistoryStartDate } from '../utils/crawlCoin';

const http = rateLimit(axios.create(), { maxRPS: 1, perMilliseconds: 5000 });

// TODO: clean file
export type TokenPrices = { [key: string]: { value: number; ['db_id']: any } };

@Injectable()
export class CurveJob {
  constructor(
    @Inject(NEST_PGPROMISE_CONNECTION)
    public pg: IDatabase<any>,
    private databaseService: DatabaseService,
    private theGraphService: Api,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  public async getCurrentPrices(job: any, done: any): Promise<void> {
    try {
      const currentPlatfromId = await this.databaseService.getCurrentChain();
      if (!currentPlatfromId) {
        throw 'No current chain in DB: ' + CHAIN;
      }

      const currentCurrencyId = await this.databaseService.getCurrentCurrency();
      if (!currentCurrencyId) {
        throw 'No current currency in DB: ' + CURRENCY;
      }

      const currentTimeStamp =
        toTimestamp(new Date()) - (toTimestamp(new Date()) % SECONDS_IN_TEN_MINUTES);

      this.logger.log('request prepared');
      const poolsRequest = await this.theGraphService.getCurvePoolsTokens();

      const pools = poolsRequest['data']['data']['pools'];
      this.logger.log(pools, 'tokens');
      for (let i = 0; i < pools.length; i++) {
        const { virtualPrice, name, poolToken } = pools[i];

        let poolLpTokenPrice;

        if (poolToken.name.toLowerCase().indexOf('usd') > -1) {
          this.logger.log('usd');
          poolLpTokenPrice = Number(virtualPrice);
        } else if (poolToken.name.toLowerCase().indexOf('btc') > -1) {
          this.logger.log('btc');
          const { data } = await getCurrentBtcPrice();
          poolLpTokenPrice = Number(virtualPrice) * data[0].current_price;
        } else if (poolToken.name.toLowerCase().indexOf('eth') > -1) {
          this.logger.log('eth');
          const { data } = await getCurrentEthPrice();
          poolLpTokenPrice = Number(virtualPrice) * data[0].current_price;
        } else {
          this.logger.log(' No current value, skipping... ' + poolToken.name);
          continue;
        }

        this.logger.log(poolLpTokenPrice, 'LP Price');

        let dbPool = await this.databaseService.getTokenByAddress(poolToken.id);
        this.logger.log(dbPool, 'dbPool');
        if (!dbPool.length) {
          await this.databaseService.addTokenToDb(
            poolToken.id,
            name,
            name,
            CHAIN,
            PlatformEnum.curve,
            currentPlatfromId,
          );

          dbPool = await this.databaseService.getTokenByAddress(poolToken.id);
        }
        try {
          await this.databaseService.addOnePrice(
            dbPool[0]['id'],
            currentTimeStamp,
            poolLpTokenPrice,
            currentCurrencyId,
          );
        } catch (addItemError) {
          this.logger.log('duplicate error, skipping...');
        }
      }
    } catch (e) {
      this.logger.error(e);
    }
    this.logger.log('Jot current curve prices done!');
    done();
  }

  public crawlNewTokensHistory = async (job: any, done: any): Promise<void> => {
    this.logger.log('sushiswap new tokens history started');
    const currentCurrencyId = await this.databaseService.getCurrentCurrency();
    if (!currentCurrencyId) {
      throw 'No current currency in DB: ' + CURRENCY;
    }

    const beginOfDay = toTimestamp(new Date()) - (toTimestamp(new Date()) % SECONDS_IN_DAY);
    const toTs = beginOfDay - SECONDS_IN_WEEK;

    this.logger.log(`toTs ${toTs}`);

    const dbAssets = await this.databaseService.getTokensByPlatformAndLastHistoryTimestamp(
      PlatformEnum.curve,
      toTs,
    );
    const prices = [];

    const delayValue = (index, coin, logger, databaseService, currentCurrencyId) => {
      return new Promise((resolve) => {
        const startParseTime = toTimestamp(new Date());
        getRequiredHistoryStartDate(coin, toTs, this.databaseService, this.logger).then(
          async (fromTs) => {
            try {
              if (fromTs === toTs) {
                await this.databaseService.updateAssetHistoryTimestamp(coin.id, toTs);
                return resolve(index);
              }

              do {
                logger.log(`making for timestamp ${fromTs} with coin ${coin.id}`);

                const firstDayBlockQuery = await this.theGraphService.getCurvefirstBlockQuery(
                  fromTs,
                );
                const blockNumber = firstDayBlockQuery['data']['data']['blocks'][0]['block'];

                const dailyPriceQuery = await this.theGraphService.getCurveDailyBlockPricesQuery(
                  parseInt(blockNumber),
                  coin['address'],
                );

                if (dailyPriceQuery['data']['data']['pools'].length) {
                  const { virtualPrice, poolToken } = dailyPriceQuery['data']['data']['pools'][0];

                  let poolLpTokenPrice;

                  if (poolToken.name.toLowerCase().indexOf('usd') > -1) {
                    this.logger.log('usd');

                    poolLpTokenPrice = Number(virtualPrice);
                  } else if (poolToken.name.toLowerCase().indexOf('btc') > -1) {
                    this.logger.log('btc');
                    //const { data } = await getCurrentBtcPrice();
                    try {
                      const {
                        data: { prices },
                      } = await getCoinHistoricalRangePrices(
                        http,
                        'bitcoin',
                        fromTs,
                        fromTs + SECONDS_IN_DAY,
                      );
                      poolLpTokenPrice = Number(virtualPrice) * prices[0][1];
                    } catch (e) {
                      this.logger.error(e);
                    }
                  } else if (poolToken.name.toLowerCase().indexOf('eth') > -1) {
                    this.logger.log('eth');
                    try {
                      const {
                        data: { prices },
                      } = await getCoinHistoricalRangePrices(
                        http,
                        'ethereum',
                        fromTs,
                        fromTs + SECONDS_IN_DAY,
                      );
                      poolLpTokenPrice = Number(virtualPrice) * prices[0][1];
                    } catch (e) {
                      this.logger.error(e);
                    }
                  } else {
                    this.logger.log(' No current value, skipping... ' + poolToken.name);
                    continue;
                  }

                  this.logger.log(poolLpTokenPrice, 'LP Price');

                  try {
                    await this.databaseService.updateAssetHistoryTimestamp(coin.id, fromTs);
                    this.logger.log(
                      coin.id + ' ' + fromTs + ' ' + poolLpTokenPrice + ' ' + currentCurrencyId,
                    );
                    await this.databaseService.addOnePrice(
                      coin.id,
                      fromTs,
                      poolLpTokenPrice,
                      currentCurrencyId,
                    );
                  } catch (e) {
                    this.logger.error(e);
                  }
                  this.logger.log('added new price');
                }

                this.logger.log(fromTs);
                fromTs += SECONDS_IN_DAY;
              } while (fromTs <= toTs);

              //logger.log(prices)
              logger.log(
                `${prices.length} new prices for coin ${coin.address} with asset_id ${coin.id}`,
              );

              if (prices.length === 0)
                await databaseService.updateAssetHistoryTimestamp(coin.id, fromTs);
            } catch (err) {
              logger.error(err, `Token ${coin.id} price checking error`);
              return resolve(null);
            }

            logger.log(
              `Historical coin ${coin.id} parsed in ${
                toTimestamp(new Date()) - startParseTime
              } seconds`,
            );
            resolve(index);
          },
        );
      });
    };

    let count = -1;
    const promiseProducer = () => {
      if (count < dbAssets.length - 1) {
        count++;
        return delayValue(
          count,
          dbAssets[count],
          this.logger,
          this.databaseService,
          currentCurrencyId,
        );
      } else {
        return null;
      }
    };

    const pool = new PromisePool(promiseProducer, 20);
    const poolPromise = pool.start();
    await poolPromise;

    this.logger.log(`Curve new tokens history finished`);
    done();
  };
}
