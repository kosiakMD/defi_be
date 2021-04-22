import { Inject, Injectable, LoggerService } from '@nestjs/common';
import PromisePool from 'es6-promise-pool';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

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
    const dbTokenAddresses = temparray.map((token) => {
      if(isChainCurrency(token['address'])){
        if(token['chain_id'] === 1)
          return token['address']+'ETH';
        if(token['chain_id'] === 2)
          return token['address']+'BNB';
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

  static getBnbPrice = async (): Promise<number> => {
    const { data } = await getCurrentBnbPrice();
    return data[0]['current_price'];
  };

  public getCurrentTokenPrices = async (tokens: string[]): Promise<TokenPrices> => {
    if (!tokens.length) {
      return {};
    }

    const response: TokenPrices = {};

    // NOTE: Special handling of ETH
    if (tokens.includes(CoingeckoJob.chainCurrencyAddress+'ETH')) {
      response[CoingeckoJob.chainCurrencyAddress+'ETH'] = {
        value: await CoingeckoJob.getEthPrice(),
        ['db_id']: null,
      };
    }

    if (tokens.includes(CoingeckoJob.chainCurrencyAddress+'BNB')) {
      response[CoingeckoJob.chainCurrencyAddress+'BNB'] = {
        value: await CoingeckoJob.getBnbPrice(),
        ['db_id']: null,
      };
    }

    const addresses = tokens.filter((token) => !isChainCurrency(token)).join(',');
    const { data } = await getCurrentCoinPrices(addresses);
    
    tokens.map((token)=>{
      if(!isChainCurrency(token) && !data[token])
          this.databaseService.removeTokenByAddressAndPlatform(token, 'COINGECKO', 'no data from recuest for current time');
    })

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
            } = await getCoinRangePrices(coin, lastSavedTimestamp, currentTimestamp);

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
        toTimestamp(new Date()) - (toTimestamp(new Date()) % SECONDS_IN_TEN_MINUTES);

      this.logger.log(`currentTimeStamp ${currentTimeStamp}`)
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
          await this.databaseService.addNewTokenToDb(remoteTokens[i], currentChainId);
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
            new Promise(async (resolve) => {
              const chunkResults = await CoingeckoJob.getCurrentTokenPrices(
                dbTokenAddressesChunks[i],
              );
              this.logger.log(`chunk ${i + 1}/${chunksCount}`);

              for (let i = 0; i < dbAssets.length; i++) {
                if (chunkResults[dbAssets[i]['address']]) {
                  chunkResults[dbAssets[i]['address']]['db_id'] = dbAssets[i]['id'];
                } 
                else 
                if(isETH(dbAssets[i])){
                  if (chunkResults[dbAssets[i]['address']+'ETH']) {
                    chunkResults[dbAssets[i]['address']+'ETH']['db_id'] = dbAssets[i]['id'];
                  } 
                }
                else
                if(isBSC(dbAssets[i])){
                  if (chunkResults[dbAssets[i]['address']+'BNB']) {
                    chunkResults[dbAssets[i]['address']+'BNB']['db_id'] = dbAssets[i]['id'];
                  } 
                }
              }

              await this.databaseService.addHourlyPricesToDb(
                chunkResults,
                currentCurrencyId,
                currentTimeStamp,
              );

              currentCount += dbTokenAddressesChunks[i].length;
              
              this.logger.log(`GOT SUCCESS PRICES FOR ${Object.keys(chunkResults).length} OF ${dbTokenAddressesChunks[i].length} IN CHUNK  ${i} `)
              this.logger.log(`GOT CURRENT PRICES FOR ${currentCount} OF ${totalCount} COINGECKO TOKENS `)
              resolve(chunkResults);
            }),
          );
        }
        Promise.all(promises).then(async () => {
          this.logger.log('ALL COINGECO CURRENT PRICES CHUNKS DONE');
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
            let allPrices = [];
            let chunkFromTs = fromTs;
            do {
              const hundredDaysTs = SECONDS_IN_HOUR * 24 * 100;
              const {
                data: { prices },
              } = await getCoinRangePrices(coin, chunkFromTs, (toTs - chunkFromTs > hundredDaysTs) ? (chunkFromTs + hundredDaysTs) : toTs );
              
              this.logger.log(`from ${chunkFromTs} to ${(toTs - chunkFromTs > hundredDaysTs) ? (chunkFromTs + hundredDaysTs) : toTs} for token ${coin.address}`)
              this.logger.log(prices)
              chunkFromTs = (toTs - chunkFromTs > hundredDaysTs) ? (chunkFromTs + hundredDaysTs) : toTs;

              allPrices = [].concat(allPrices, prices);
            }while( chunkFromTs < toTs )
            // const {
            //   data: { prices },
            // } = await getCoinRangePrices(coin, fromTs, toTs);

            logger.log(`${allPrices.length} new prices`);
            await crawlCoinHistory(
              coin.id,
              coin,
              allPrices,
              currentCurrencyId,
              this.databaseService,
              this.logger,
              PlatformEnum.coingecko,
              true,
              toTs,
            );
          } catch (err) {
            logger.error(err, `Token ${coin.id} price checking error. Setting is dead`);
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
