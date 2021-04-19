import { Inject, Injectable, LoggerService } from '@nestjs/common';
import PromisePool from 'es6-promise-pool';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import {
  getCurrentCoinPrices,
  getCurrentEthPrice,
  getCoinRangePrices,
  getCoins,
} from '../apis/coingecko.api';
import { DatabaseService } from '../services/database.service';
import { isETH } from '../utils/common';
import { toTimestamp } from '../utils/common';
import {
  CURRENCY,
  ETH_ADDRESS,
  CHAIN,
  SECONDS_IN_HOUR,
  TEST_TOKENS,
  PlatformEnum,
} from '../utils/constants';
import { crawlCoin, getRequiredHistoryStartDate, crawlCoinHistory } from '../utils/crawlCoin';

export type TokenPrices = { [key: string]: { value: number; ['db_id']: any } };
export type TokenPricesShort = { [key: string]: number };
const tokens: string[] = TEST_TOKENS;

const getEtherTokens = async (): Promise<TokenPricesShort> => {
  if (!tokens.length) {
    return {};
  }
  const { data } = await getCoins();
  return data;
};

const createAddressChunks = (addresses: any[]): string[][] => {
  let i, j, temparray;
  const chunk = 100;
  const result = [];
  for (i = 0, j = addresses.length; i < j; i += chunk) {
    temparray = addresses.slice(i, i + chunk);
    const dbTokenAddresses = temparray.map((token) => token['address']);
    result.push(dbTokenAddresses);
  }
  return result;
};

@Injectable()
export class CoingeckoJob {
  static readonly ethAddress = ETH_ADDRESS;

  constructor(
    @Inject(NEST_PGPROMISE_CONNECTION)
    public pg: IDatabase<any>,
    private databaseService: DatabaseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  static getEthPrice = async (): Promise<number> => {
    const { data } = await getCurrentEthPrice();
    return data[0]['current_price'];
  };

  static getCurrentTokenPrices = async (tokens: string[]): Promise<TokenPrices> => {
    if (!tokens.length) {
      return {};
    }

    const response: TokenPrices = {};

    // NOTE: Special handling of ETH
    if (tokens.includes(CoingeckoJob.ethAddress)) {
      response[CoingeckoJob.ethAddress] = {
        value: await CoingeckoJob.getEthPrice(),
        ['db_id']: null,
      };
    }

    const addresses = tokens.filter((token) => !isETH(token)).join(',');
    const { data } = await getCurrentCoinPrices(addresses);

    return Object.keys(data).reduce(
      (response, key) => ({
        ...response,
        [key]: { value: data[key].usd, ['db_id']: null },
      }),
      response,
    );
  };

  public async checkHourlyPrices(
    dbAssets,
    lastPricesObj,
    currentTimestamp,
    currentCurrencyId,
  ): Promise<void> {
    this.logger.log('check hourly prices');
    const beginOfDay = currentTimestamp - (currentTimestamp % 86400);

    const delayValue = (
      index,
      coin,
      databaseService,
      beginOfDay,
      lastPricesObj,
      currentTimestamp,
      logger,
    ) => {
      return new Promise(async (resolve) => {
        const lastSavedTimestamp = lastPricesObj[coin.id] || 0;

        if (!lastSavedTimestamp || currentTimestamp - lastSavedTimestamp > SECONDS_IN_HOUR) {
          logger.log('coin: ' + coin.id + ' - ' + currentTimestamp + ' - ' + lastSavedTimestamp);
          try {
            const {
              data: { prices },
            } = await getCoinRangePrices(coin.address, lastSavedTimestamp, currentTimestamp);

            if (prices.length) {
              const tokenPrices = prices.filter(([timestamp]) => {
                const roundTimestamp =
                  Math.round(timestamp / 1000) - (Math.round(timestamp / 1000) % SECONDS_IN_HOUR);

                if (
                  roundTimestamp > lastSavedTimestamp &&
                  roundTimestamp > beginOfDay - 7 * 24 * SECONDS_IN_HOUR &&
                  roundTimestamp < currentTimestamp
                ) {
                  return true;
                }
                return false;
              });

              this.logger.log('tokenPrices');
              this.logger.log(tokenPrices);

              const preparedTimestamp = {};
              tokenPrices.forEach(([timestamp, price]) => {
                const roundTimestamp =
                  Math.round(timestamp / 1000) - (Math.round(timestamp / 1000) % SECONDS_IN_HOUR);
                if (!preparedTimestamp[roundTimestamp]) {
                  preparedTimestamp[roundTimestamp] = price;
                }
              });

              const preparedPrices = [];
              for (const property in preparedTimestamp) {
                preparedPrices.push([property, preparedTimestamp[property]]);
              }

              await crawlCoin(
                coin.id,
                coin,
                preparedPrices,
                currentCurrencyId,
                databaseService,
                logger,
                PlatformEnum.coingecko,
                false,
              );
            }
          } catch (e) {
            if (e?.response?.status === 404) {
              this.logger.log(`removing token ${coin.symbol}`);
              await this.databaseService.removeToken(coin.id);
            } else {
              this.logger.error(e);
            }
          }
        }

        resolve(index);
      });
    };

    let count = -1;
    const promiseProducer = () => {
      if (count < dbAssets.length - 1) {
        count++;
        return delayValue(
          count,
          dbAssets[count],
          this.databaseService,
          beginOfDay,
          lastPricesObj,
          currentTimestamp,
          this.logger,
        );
      } else {
        return null;
      }
    };

    const pool = new PromisePool(promiseProducer, 20);
    const poolPromise = pool.start();
    await poolPromise;
  }

  public async getCurrentPrices(job: any, done: any): Promise<void> {
    this.logger.log('Current Prices Job Sarted');
    try {
      const currentTimeStamp =
        toTimestamp(new Date()) - (toTimestamp(new Date()) % SECONDS_IN_HOUR);

      const currentChainId = await this.databaseService.getCurrentChain();
      if (!currentChainId) {
        throw 'No current platform in DB: ' + CHAIN;
      }

      const currentCurrencyId = await this.databaseService.getCurrentCurrency();
      if (!currentCurrencyId) {
        throw 'No current currency in DB: ' + CURRENCY;
      }
      //cheking existing tokens in DB and adding new
      this.logger.log('checking for new COINGECKO tokens');
      await this.databaseService.checkEthToken();
      const coingeckoTokensAssets = await this.databaseService.getTokensByChainAndPlatform(
        currentChainId,
        PlatformEnum.coingecko,
      );
      const dbTokenAddresses = coingeckoTokensAssets.map((token) => token['address']);
      const remoteTokens = await getEtherTokens();

      for (let i = 0; i < remoteTokens.length; i++) {
        if (!remoteTokens[i]['platforms'] || !remoteTokens[i]['platforms'][CHAIN]) {
          continue;
        }
        if (dbTokenAddresses.indexOf(remoteTokens[i]['platforms'][CHAIN]) === -1)
          await this.databaseService.addNewTokenToDb(remoteTokens[i], currentChainId);
      }
      this.logger.log('new COINGECKO tokens checked');

      const currentTimestamp =
        toTimestamp(new Date()) - (toTimestamp(new Date()) % SECONDS_IN_HOUR);
      const dbAssets = await this.databaseService.getTokensByChainAndPlatform(
        currentChainId,
        PlatformEnum.coingecko,
        currentTimestamp,
      );
      this.logger.log(`tokens total: ${dbAssets.length}`);

      const lastPrices = await this.databaseService.getLastTokenPriceByChainAndPlatform(
        currentChainId,
        PlatformEnum.coingecko,
      );
      const lastPricesObj = {};
      lastPrices.forEach((price) => {
        lastPricesObj[price.asset_id] = price.timestamp;
      });

      await (this as any).coingeckoJob.checkHourlyPrices(
        dbAssets,
        lastPricesObj,
        currentTimestamp,
        currentCurrencyId,
      );

      // get current price
      if (dbAssets.length) {
        const dbTokenAddressesChunks = createAddressChunks(dbAssets);
        const chunksCount: number = dbTokenAddressesChunks.length;
        //NOTE: request str is too big, making chunks
        const promises = [];
        for (let i = 0; i < dbTokenAddressesChunks.length; i++) {
          promises.push(
            new Promise(async (resolve) => {
              const chunkResults = await CoingeckoJob.getCurrentTokenPrices(
                dbTokenAddressesChunks[i],
              );
              this.logger.log(`chunk ${i + 1}/${chunksCount}`);

              for (let i = 0; i < dbAssets.length; i++) {
                if (chunkResults[dbAssets[i]['address']]) {
                  chunkResults[dbAssets[i]['address']]['db_id'] = dbAssets[i]['id'];
                }
              }

              await this.databaseService.addHourlyPricesToDb(
                chunkResults,
                currentCurrencyId,
                currentTimeStamp,
              );
              resolve(chunkResults);
            }),
          );
        }
        Promise.all(promises).then(async () => {
          this.logger.log('ALL CHUNKS DONE');
          done();
        });
      } else {
        done();
      }
    } catch (e) {
      this.logger.error(e);
    }
    this.logger.log('Add Current Prices Job done');
  }

  public crawlNewTokensHistory = async (job: any, done: any): Promise<void> => {
    this.logger.log('coingecko new tokens history started');
    const currentCurrencyId = await this.databaseService.getCurrentCurrency();
    if (!currentCurrencyId) {
      throw 'No current currency in DB: ' + CURRENCY;
    }

    const beginOfDay = toTimestamp(new Date()) - (toTimestamp(new Date()) % 86400);
    const toTs = beginOfDay - 7 * 24 * SECONDS_IN_HOUR;

    this.logger.log(`beginOfDay ${beginOfDay}`);
    this.logger.log(`toTs toTs`);

    const dbAssets = await this.databaseService.getTokensByPlatformAndLastHistoryTimestamp(
      PlatformEnum.coingecko,
      toTs,
    );

    this.logger.log(`total dbAssets.length`);

    if (dbAssets.length) {
      const delayValue = (index, coin, logger) => {
        return new Promise(async (resolve) => {
          logger.log('coin ? : ' + coin.id + ' - ');
          try {
            logger.log('coin.last_history_timestamp ', coin.last_history_timestamp);
            const fromTs = await getRequiredHistoryStartDate(
              coin,
              toTs,
              this.databaseService,
              this.logger,
            );
            if (fromTs === toTs) {
              logger.log(`fromTs === toTs for coin ${coin.address}`);
              await this.databaseService.updateAssetHistoryTimestamp(coin.id, toTs);
              resolve(index);
            }

            logger.log(`fromTs ${fromTs}`);
            const {
              data: { prices },
            } = await getCoinRangePrices(coin.address, fromTs, toTs);
            logger.log(`${prices.length} new prices`);
            await crawlCoinHistory(
              coin.id,
              coin,
              prices,
              currentCurrencyId,
              this.databaseService,
              this.logger,
              PlatformEnum.coingecko,
              true,
              toTs,
            );
          } catch (err) {
            logger.error(err, `Token ${coin.id} price checking error`);
            this.databaseService.setTokenIsDead(coin.id);
          }
          resolve(index);
        });
      };

      let count = -1;
      const promiseProducer = () => {
        if (count < dbAssets.length - 1) {
          count++;
          return delayValue(count, dbAssets[count], this.logger);
        } else {
          return null;
        }
      };

      const pool = new PromisePool(promiseProducer, 20);
      const poolPromise = pool.start();
      await poolPromise;
    }

    this.logger.log(`coingecko new tokens history finished`);
    done();
  };
}
