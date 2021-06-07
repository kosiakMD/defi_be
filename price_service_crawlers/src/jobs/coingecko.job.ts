import { Inject, Injectable } from '@nestjs/common';
import PromisePool from 'es6-promise-pool';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { Logger } from '../Logger/Logger.service';
import {
  getCurrentCoinPrices,
  getCurrentEthPrice,
  getCurrentBnbPrice,
  getCoinRangePrices,
  getCoins,
} from '../apis/coingecko.api';
import { DatabaseService } from '../services/database.service';
import { isBSC, isChainCurrency, isETH } from '../utils/common';
import { toTimestamp } from '../utils/common';
import {
  CURRENCY,
  CHAIN_CURRENCY_ADDRESS,
  CHAIN,
  SECONDS_IN_TEN_MINUTES,
  SECONDS_IN_HUNDRED_DAYS,
  TEST_TOKENS,
  PlatformEnum,
  SECONDS_IN_DAY,
  SECONDS_IN_WEEK,
} from '../utils/constants';
import { getRequiredHistoryStartDate, crawlCoinHistory } from '../utils/crawlCoin';

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
    const dbTokenAddresses = temparray.map((token) => {
      if (isChainCurrency(token['address'])) {
        if (token['chain_id'] === 1) return token['address'] + 'ETH';
        if (token['chain_id'] === 2) return token['address'] + 'BNB';
      }
      return token['address'];
    });
    result.push(dbTokenAddresses);
  }
  return result;
};

@Injectable()
export class CoingeckoJob {
  static readonly chainCurrencyAddress = CHAIN_CURRENCY_ADDRESS;
  private CURRENT_PRICE_SECONDS_INTERVAL;

  constructor(
    @Inject(NEST_PGPROMISE_CONNECTION)
    public pg: IDatabase<any>,
    private databaseService: DatabaseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.CURRENT_PRICE_SECONDS_INTERVAL = process.env.CURRENT_PRICE_SECONDS_INTERVAL
      ? parseInt(process.env.CURRENT_PRICE_SECONDS_INTERVAL)
      : SECONDS_IN_TEN_MINUTES;
  }

  static getEthPrice = async (): Promise<number> => {
    const { data } = await getCurrentEthPrice();
    return data[0]['current_price'];
  };

  static getBnbPrice = async (): Promise<number> => {
    const { data } = await getCurrentBnbPrice();
    return data[0]['current_price'];
  };

  static getCurrentTokenPrices = async (
    tokens: string[],
    databaseService,
  ): Promise<TokenPrices> => {
    if (!tokens.length) {
      return {};
    }

    const response: TokenPrices = {};

    // NOTE: Special handling of ETH
    if (tokens.includes(CoingeckoJob.chainCurrencyAddress + 'ETH')) {
      response[CoingeckoJob.chainCurrencyAddress + 'ETH'] = {
        value: await CoingeckoJob.getEthPrice(),
        ['db_id']: null,
      };
    }

    if (tokens.includes(CoingeckoJob.chainCurrencyAddress + 'BNB')) {
      response[CoingeckoJob.chainCurrencyAddress + 'BNB'] = {
        value: await CoingeckoJob.getBnbPrice(),
        ['db_id']: null,
      };
    }

    const addresses = tokens.filter((token) => !isChainCurrency(token)).join(',');
    const { data } = await getCurrentCoinPrices(addresses);

    tokens.map((token) => {
      if (!isChainCurrency(token) && !data[token])
        databaseService.removeTokenByAddressAndPlatform(
          token,
          'COINGECKO',
          'no data from recuest for current time',
        );
    });

    return Object.keys(data).reduce(
      (response, key) => ({
        ...response,
        [key]: { value: data[key].usd, ['db_id']: null },
      }),
      response,
    );
  };

  // public async checkHourlyPrices(
  //   dbAssets,
  //   lastPricesObj,
  //   currentTimestamp,
  //   currentCurrencyId,
  // ): Promise<void> {
  //   this.logger.log('check hourly prices');
  //   const beginOfDay = currentTimestamp - (currentTimestamp % SECONDS_IN_DAY);

  //   const delayValue = (
  //     index,
  //     coin,
  //     databaseService,
  //     beginOfDay,
  //     lastPricesObj,
  //     currentTimestamp,
  //     logger,
  //   ) => {
  //     return new Promise(async (resolve) => {
  //       const lastSavedTimestamp = lastPricesObj[coin.id] || 0;

  //       if (!lastSavedTimestamp || currentTimestamp - lastSavedTimestamp > SECONDS_IN_HOUR) {
  //         logger.log('coin: ' + coin.id + ' - ' + currentTimestamp + ' - ' + lastSavedTimestamp);
  //         try {
  //           const {
  //             data: { prices },
  //           } = await getCoinRangePrices(coin, lastSavedTimestamp, currentTimestamp);

  //           if (prices.length) {
  //             const tokenPrices = prices.filter(([timestamp]) => {
  //               const roundTimestamp =
  //                 Math.round(timestamp / 1000) - (Math.round(timestamp / 1000) % SECONDS_IN_HOUR);

  //               if (
  //                 roundTimestamp > lastSavedTimestamp &&
  //                 roundTimestamp > beginOfDay - SECONDS_IN_WEEK &&
  //                 roundTimestamp < currentTimestamp
  //               ) {
  //                 return true;
  //               }
  //               return false;
  //             });

  //             this.logger.log('tokenPrices');
  //             this.logger.log(tokenPrices);

  //             const preparedTimestamp = {};
  //             tokenPrices.forEach(([timestamp, price]) => {
  //               const roundTimestamp =
  //                 Math.round(timestamp / 1000) - (Math.round(timestamp / 1000) % SECONDS_IN_HOUR);
  //               if (!preparedTimestamp[roundTimestamp]) {
  //                 preparedTimestamp[roundTimestamp] = price;
  //               }
  //             });

  //             const preparedPrices = [];
  //             for (const property in preparedTimestamp) {
  //               preparedPrices.push([property, preparedTimestamp[property]]);
  //             }

  //             await crawlCoin(
  //               coin.id,
  //               coin,
  //               preparedPrices,
  //               currentCurrencyId,
  //               databaseService,
  //               logger,
  //               PlatformEnum.coingecko,
  //               false,
  //             );
  //           }
  //         } catch (e) {
  //           if (e?.response?.status === 404) {
  //             this.logger.log(`removing token ${coin.symbol}`);
  //             await this.databaseService.removeToken(coin.id);
  //           } else {
  //             this.logger.error(e);
  //           }
  //         }
  //       }

  //       resolve(index);
  //     });
  //   };

  //   let count = -1;
  //   const promiseProducer = () => {
  //     if (count < dbAssets.length - 1) {
  //       count++;
  //       return delayValue(
  //         count,
  //         dbAssets[count],
  //         this.databaseService,
  //         beginOfDay,
  //         lastPricesObj,
  //         currentTimestamp,
  //         this.logger,
  //       );
  //     } else {
  //       return null;
  //     }
  //   };

  //   const pool = new PromisePool(promiseProducer, 20);
  //   const poolPromise = pool.start();
  //   await poolPromise;
  // }

  public async getCurrentPrices(job: any, done: any): Promise<void> {
    this.logger.log('COINGECKO: Current Prices Job Sarted');
    this.logger.time('COINGECKO: Current Prices');
    try {
      this.logger.time('COINGECKO: Current Prices');
      const currentTimeStamp =
        toTimestamp(new Date()) - (toTimestamp(new Date()) % this.CURRENT_PRICE_SECONDS_INTERVAL);

      this.logger.log('this.CURRENT_PRICE_SECONDS_INTERVAL ', this.CURRENT_PRICE_SECONDS_INTERVAL);
      this.logger.log(`currentTimeStamp ${currentTimeStamp}`);
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
      await this.databaseService.checkBnbToken();
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
          await this.databaseService.addNewTokenToDb(
            remoteTokens[i],
            currentChainId,
            'COINGECKO',
            false,
          );
      }
      this.logger.log('new COINGECKO tokens checked');

      const dbAssets = await this.databaseService.getTokensByPlatform(
        PlatformEnum.coingecko,
        currentTimeStamp,
      );

      this.logger.log(`tokens total: ${dbAssets.length}`);

      // const lastPrices = await this.databaseService.getLastTokenPriceByPlatform(
      //   PlatformEnum.coingecko
      // );
      // const lastPricesObj = {};
      // lastPrices.forEach((price) => {
      //   lastPricesObj[price.asset_id] = price.timestamp;
      // });

      // await (this as any).coingeckoJob.checkHourlyPrices(
      //   dbAssets,
      //   lastPricesObj,
      //   currentTimestamp,
      //   currentCurrencyId,
      // );

      // get current price
      const totalCount = dbAssets.length;
      let currentCount = 0;

      if (dbAssets.length) {
        const dbTokenAddressesChunks = createAddressChunks(dbAssets);
        const chunksCount: number = dbTokenAddressesChunks.length;
        //NOTE: request str is too big, making chunks
        const promises = [];
        for (let i = 0; i < dbTokenAddressesChunks.length; i++) {
          promises.push(
            new Promise((resolve) => {
              CoingeckoJob.getCurrentTokenPrices(
                dbTokenAddressesChunks[i],
                this.databaseService,
              ).then(async (chunkResults) => {
                this.logger.log(`chunk ${i + 1}/${chunksCount}`);

                for (let i = 0; i < dbAssets.length; i++) {
                  if (chunkResults[dbAssets[i]['address']]) {
                    chunkResults[dbAssets[i]['address']]['db_id'] = dbAssets[i]['id'];
                  } else if (isETH(dbAssets[i])) {
                    if (chunkResults[dbAssets[i]['address'] + 'ETH']) {
                      chunkResults[dbAssets[i]['address'] + 'ETH']['db_id'] = dbAssets[i]['id'];
                    }
                  } else if (isBSC(dbAssets[i])) {
                    if (chunkResults[dbAssets[i]['address'] + 'BNB']) {
                      chunkResults[dbAssets[i]['address'] + 'BNB']['db_id'] = dbAssets[i]['id'];
                    }
                  }
                }

                this.databaseService.addHourlyPricesToDb(
                  chunkResults,
                  currentCurrencyId,
                  currentTimeStamp,
                );

                currentCount += dbTokenAddressesChunks[i].length;

                this.logger.log(
                  `GOT SUCCESS PRICES FOR ${Object.keys(chunkResults).length} OF ${
                    dbTokenAddressesChunks[i].length
                  } IN CHUNK  ${i} `,
                );
                this.logger.log(
                  `GOT CURRENT PRICES FOR ${currentCount} OF ${totalCount} COINGECKO TOKENS `,
                );
                resolve(chunkResults);
              });
            }),
          );
        }
        Promise.all(promises).then(() => {
          this.logger.log('ALL COINGECO CURRENT PRICES CHUNKS DONE');
          this.logger.timeEnd('COINGECKO: Current Prices');
          done();
        });
      } else {
        done();
      }
    } catch (e) {
      this.logger.error(e);
    }
  }

  public crawlNewTokensHistory = async (job: any, done: any): Promise<void> => {
    const hundredDaysTs = SECONDS_IN_HUNDRED_DAYS;
    this.logger.log('COINGECKO: Historical Prices Job Sarted');
    this.logger.time('COINGECKO: Historical Prices');

    const currentCurrencyId = await this.databaseService.getCurrentCurrency();
    if (!currentCurrencyId) {
      throw 'No current currency in DB: ' + CURRENCY;
    }

    const beginOfDay = toTimestamp(new Date()) - (toTimestamp(new Date()) % SECONDS_IN_DAY);
    const toTs = beginOfDay - SECONDS_IN_WEEK;

    this.logger.log(`beginOfDay ${beginOfDay}`);
    this.logger.log(`toTs toTs`);

    const dbAssets = await this.databaseService.getTokensByPlatformAndLastHistoryTimestamp(
      PlatformEnum.coingecko,
      toTs,
    );

    this.logger.log(`total dbAssets.length`);

    if (dbAssets.length) {
      const delayValue = (index, coin, logger) => {
        return new Promise((resolve) => {
          getRequiredHistoryStartDate(coin, toTs, this.databaseService, this.logger).then(
            async (fromTs) => {
              try {
                if (fromTs === toTs) {
                  logger.log(`fromTs === toTs for coin ${coin.address} => ${fromTs} - ${toTs}`);
                  this.databaseService.updateAssetHistoryTimestamp(coin.id, toTs);
                  return resolve(index);
                }

                logger.log(`STARTS ${coin.id} fromTs ${fromTs} toTs ${toTs}`);
                logger.log('coin.last_history_timestamp ', coin.last_history_timestamp);

                let allPrices = [];
                let chunkFromTs = fromTs;
                const chunkPrices = [];

                const crawlChunk = () => {
                  return new Promise((innerResolve) => {
                    //console.log('running ' + coin.id + ' for date ' + chunkFromTs);
                    getCoinRangePrices(
                      coin,
                      chunkFromTs,
                      toTs - chunkFromTs > hundredDaysTs ? chunkFromTs + hundredDaysTs : toTs,
                    ).then(async (response) => {
                      const {
                        data: { prices },
                      } = await response;
                      this.logger.log(`chunkFromTs ${chunkFromTs}`);
                      this.logger.log(`toTs ${toTs}`);
                      this.logger.log(
                        `chunkFromTs > hundredDaysTs ${
                          toTs - chunkFromTs > hundredDaysTs ? true : false
                        }`,
                      );
                      this.logger.log(
                        `from ${chunkFromTs} to ${
                          toTs - chunkFromTs > hundredDaysTs ? chunkFromTs + hundredDaysTs : toTs
                        } for token ${coin.address}`,
                      );
                      this.logger.log(prices);

                      chunkPrices.push(prices);
                      innerResolve(prices);
                    });
                  });
                };
                // const checkOneCoinHistory = (index, coin, logger) => {

                // }
                do {
                  await crawlChunk();
                  chunkPrices.push(await crawlChunk());
                  chunkFromTs =
                    toTs - chunkFromTs > hundredDaysTs ? chunkFromTs + hundredDaysTs : toTs;
                } while (chunkFromTs < toTs);

                //concating all prices to one array
                for (let p = 0; p < chunkPrices.length; p++) {
                  allPrices = [].concat(allPrices, chunkPrices[p]);
                }

                logger.log(`${allPrices.length} new prices for one coin ${coin.id}`);

                if (allPrices) {
                  await crawlCoinHistory(
                    coin.id,
                    coin,
                    allPrices,
                    currentCurrencyId,
                    this.databaseService,
                    this.logger,
                    PlatformEnum.coingecko,
                    true,
                    fromTs,
                    toTs,
                  );
                  return resolve(index);
                } else return resolve(index);
              } catch (err) {
                logger.error(
                  err,
                  `Token ${coin.id} price checking error. Setting is dead(just log)`,
                );
                return resolve(index);
              }
            },
          );
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
    this.logger.timeEnd('COINGECKO: Historical Prices');
    this.logger.log(`COINGECKO: Historical Prices Job Done`);
    done();
  };
}
