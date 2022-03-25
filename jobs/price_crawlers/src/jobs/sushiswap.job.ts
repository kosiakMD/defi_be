import PromisePool from 'es6-promise-pool';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../Logger/Logger.service';
import { DatabaseService } from '../services/database.service';
import { Api } from '../thegraph/api';
import { toTimestamp } from '../utils/common';
import {
  CHAIN,
  CURRENCY,
  PlatformEnum,
  SECONDS_IN_DAY,
  SECONDS_IN_TEN_MINUTES,
  SECONDS_IN_WEEK,
} from '../utils/constants';
import { getRequiredHistoryStartDate } from '../utils/crawlCoin';
import { getNextDayStart } from '../utils/time';

// TODO: clean file
export type TokenPrices = { [key: string]: { value: number; ['db_id']: any } };

@Injectable()
export class SushiswapJob {
  private CURRENT_PRICE_SECONDS_INTERVAL;

  constructor(
    @Inject(NEST_PGPROMISE_CONNECTION)
    public pg: IDatabase<any>,
    private databaseService: DatabaseService,
    private theGraphService: Api,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.CURRENT_PRICE_SECONDS_INTERVAL = process.env.CURRENT_PRICE_SECONDS_INTERVAL
      ? parseInt(process.env.CURRENT_PRICE_SECONDS_INTERVAL)
      : SECONDS_IN_TEN_MINUTES;
  }

  // public async checkHourlyPrices(
  //   dbAssets,
  //   lastPricesObj,
  //   currentTimestamp,
  //   currentCurrencyId,
  // ): Promise<void> {
  //   this.logger.log('check hourly prices');
  //   const beginOfDay = currentTimestamp - (currentTimestamp % SECONDS_IN_DAY);

  //   const getCoinRangePrices = async (
  //     token: string,
  //     lastSavedTimestamp: number,
  //     currentTimestamp: number,
  //     beginOfDay: number,
  //   ) => {
  //     const prices = [];
  //     let hourNum = 0;
  //     if (!lastSavedTimestamp) lastSavedTimestamp = beginOfDay - SECONDS_IN_WEEK;
  //     this.logger.log(`lastSavedTimestamp ${lastSavedTimestamp}`);
  //     const firstTimestamp = lastSavedTimestamp;
  //     do {
  //       const firstDayBlockQuery = await this.theGraphService.getSushiswapfirstBlockQuery(
  //         lastSavedTimestamp,
  //       );
  //       const blockNumber = firstDayBlockQuery['data']['data']['blocks'][0]['blockNumber'];
  //       this.logger.log(blockNumber, 'blockNumber');

  //       const dailyPriceQuery = await this.theGraphService.getSushiswapDailyBlockPricesQuery(
  //         parseInt(blockNumber),
  //         token,
  //       );
  //       this.logger.log(dailyPriceQuery['data']['data']);
  //       if (dailyPriceQuery['data']['data']['pairs'].length) {
  //         const { reserveUSD, totalSupply } = dailyPriceQuery['data']['data']['pairs'][0];

  //         if (reserveUSD && totalSupply) {
  //           prices.push([
  //             lastSavedTimestamp,
  //             Number(reserveUSD) === 0 || Number(totalSupply) === 0
  //               ? 0
  //               : Number(reserveUSD) / Number(totalSupply),
  //           ]);
  //         }
  //       }

  //       hourNum++;
  //       this.logger.log(lastSavedTimestamp);
  //       lastSavedTimestamp = getNextHourStart(firstTimestamp, hourNum);
  //     } while (lastSavedTimestamp <= currentTimestamp);

  //     this.logger.log('current range prices for ' + token);
  //     this.logger.log(prices);

  //     return prices;
  //   };

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
  //       const startParseTime = toTimestamp(new Date());
  //       const lastSavedTimestamp = lastPricesObj[coin.id] || 0;

  //       if (!lastSavedTimestamp || currentTimestamp - lastSavedTimestamp > SECONDS_IN_HOUR) {
  //         logger.log('coin ? : ' + coin.id + ' - ' + currentTimestamp + ' - ' + lastSavedTimestamp);
  //         try {
  //           const prices = await getCoinRangePrices(
  //             coin.address,
  //             lastSavedTimestamp,
  //             currentTimestamp,
  //             beginOfDay,
  //           );
  //           //logger.log("prices")
  //           //logger.log(prices)
  //           if (prices.length) {
  //             const tokenPrices = prices.filter(([timestamp]) => {
  //               const roundTimestamp = Math.round(timestamp);
  //               if (
  //                 roundTimestamp > lastSavedTimestamp &&
  //                 roundTimestamp > beginOfDay - SECONDS_IN_WEEK &&
  //                 roundTimestamp < currentTimestamp
  //               ) {
  //                 return true;
  //               }
  //               return false;
  //             });
  //             logger.log('tokenPrices');
  //             logger.log(tokenPrices);
  //             const preparedTimestamp = {};
  //             tokenPrices.forEach(([timestamp, price]) => {
  //               const roundTimestamp =
  //                 Math.round(timestamp) - (Math.round(timestamp) % SECONDS_IN_HOUR);
  //               if (!preparedTimestamp[roundTimestamp]) {
  //                 preparedTimestamp[roundTimestamp] = price;
  //               }
  //             });
  //             logger.log('preparedTimestamp');
  //             logger.log(preparedTimestamp);

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
  //               PlatformEnum.sushiswap,
  //               false,
  //             );
  //           }
  //         } catch (e: any) {
  //           logger.log(e);
  //           if (e?.response?.status === 404) {
  //             logger.log(`removing token ${coin.symbol}`);
  //             await this.databaseService.removeToken(coin.id);
  //           }
  //         }
  //       }
  //       logger.log(
  //         `Last 7 days check coin ${coin.id} parsed in ${
  //           toTimestamp(new Date()) - startParseTime
  //         } seconds`,
  //       );
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
    this.logger.log(`SUSHI: Current Prices Job Started`);
    this.logger.time('SUSHI: Current Prices');
    try {
      const currentChainId = await this.databaseService.getCurrentChain();
      if (!currentChainId) {
        throw 'No current platform in DB: ' + CHAIN;
      }

      const currentCurrencyId = await this.databaseService.getCurrentCurrency();
      if (!currentCurrencyId) {
        throw 'No current currency in DB: ' + CURRENCY;
      }
      //cheking existing tokens in DB and adding new
      this.logger.log('checking for new tokens');
      await this.databaseService.checkEthToken();
      const sushiswapTokensAssets = await this.databaseService.getTokensByChainAndPlatform(
        currentChainId,
        PlatformEnum.sushiswap,
      );

      const dbTokenAddresses = sushiswapTokensAssets.map((token) => token['address']);
      // adding new tokens
      let iteration = 0;
      let tokens = [];
      do {
        const tokenRequest = await this.theGraphService.getSushiSwapPoolsTokens(iteration);
        tokens = tokenRequest['data']['data']['dataPairs'];

        for (let i = 0; i < tokens.length; i++) {
          this.logger.log(tokens[i]['id']);
          if (dbTokenAddresses.indexOf(tokens[i]['id']) === -1)
            await this.databaseService.addTokenToDb(
              tokens[i]['id'],
              tokens[i]['token0']['name'] + '-' + tokens[i]['token1']['name'],
              tokens[i]['token0']['symbol'] + '-' + tokens[i]['token1']['symbol'],
              CHAIN,
              PlatformEnum.sushiswap,
              currentChainId,
            );
        }

        iteration++;
        this.logger.log(tokens.length, 'new tokens.length');
      } while (iteration < 5 && tokens.length);

      this.logger.log('new sushi tokens checked');

      const currentTimestamp =
        toTimestamp(new Date()) - (toTimestamp(new Date()) % this.CURRENT_PRICE_SECONDS_INTERVAL);

      this.logger.log(`SUSHI currentTimestamp ${currentTimestamp}`);

      const dbAssets = await this.databaseService.getTokensByChainAndPlatform(
        currentChainId,
        PlatformEnum.sushiswap,
        currentTimestamp,
      );
      this.logger.log(`token total: ${dbAssets.length}`);

      // const lastPrices = await this.databaseService.getLastTokenPriceByChainAndPlatform(
      //   currentChainId,
      //   PlatformEnum.sushiswap,
      // );
      // const lastPricesObj = {};
      // lastPrices.forEach((price) => {
      //   lastPricesObj[price.asset_id] = price.timestamp;
      // });

      // this.logger.log(lastPricesObj);

      // await (this as any).sushiswapJob.checkHourlyPrices(
      //   dbAssets,
      //   lastPricesObj,
      //   currentTimestamp,
      //   currentCurrencyId,
      // );

      // get current price
      if (dbAssets.length) {
        this.logger.log(`dbAssets.length ${dbAssets.length}`);
        const results: any = {};

        const delayValue = (index, coin, logger) => {
          return new Promise((resolve) => {
            logger.log('coin ? : ' + coin.id + ' - ');
            try {
              logger.log(coin['address']);
              this.theGraphService
                .getCurrentSushiTokenPrices(coin['address'])
                .then((oneResults) => {
                  if (oneResults['data']['data']['dataPairs'].length) {
                    const { reserveUSD, totalSupply } = oneResults['data']['data']['dataPairs'][0];

                    //this.logger.log("reserveUSD "+reserveUSD+" totalSupply "+totalSupply+" res ",(Number(reserveUSD) / Number(totalSupply)))
                    results[coin['address']] = {
                      ['db_id']: dbAssets[index]['id'],
                      value:
                        Number(reserveUSD) === 0 || Number(totalSupply) === 0
                          ? 0
                          : Number(reserveUSD) / Number(totalSupply),
                    };
                    resolve(index);
                  }
                });
            } catch (e: any) {
              logger.log(e);
              resolve(index);
            }
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
        // result is collected here
        await this.databaseService.addHourlyPricesToDb(results, currentCurrencyId);
        this.logger.timeEnd('SUSHI: Current Prices');
        done();
      } else {
        this.logger.timeEnd('SUSHI: Current Prices');
        done();
      }
    } catch (e: any) {
      this.logger.error(e);
    }
    this.logger.log(`SUSHI: Current Prices Job Done`);
  }

  public crawlNewTokensHistory = async (job: any, done: any): Promise<void> => {
    this.logger.log('SUSHI: Historical Prices Job Sarted');
    this.logger.time('SUSHI: Historical Prices');

    const currentCurrencyId = await this.databaseService.getCurrentCurrency();
    if (!currentCurrencyId) {
      throw 'No current currency in DB: ' + CURRENCY;
    }

    const firstTxData = await this.theGraphService.getSushiSwapFirstTxTimestamp();
    const firstTimestamp = parseInt(firstTxData['data']['data']['transactions'][0]['timestamp']);

    const beginOfDay = toTimestamp(new Date()) - (toTimestamp(new Date()) % SECONDS_IN_DAY);
    const toTs = beginOfDay - SECONDS_IN_WEEK;

    this.logger.log(`toTs ${toTs}`);

    const dbAssets = await this.databaseService.getTokensByPlatformAndLastHistoryTimestamp(
      PlatformEnum.sushiswap,
      toTs,
    );
    const prices = [];

    const delayValue = (index, coin, logger, databaseService, currentCurrencyId) => {
      return new Promise((resolve) => {
        const startParseTime = toTimestamp(new Date());

        getRequiredHistoryStartDate(coin, toTs, this.databaseService, this.logger).then(
          async (fromTs) => {
            try {
              let dayNum = 0;

              if (fromTs === toTs) {
                //this.logger.log('fromTs === toTs');
                this.databaseService.updateAssetHistoryTimestamp(coin.id, toTs);
                return resolve(index);
              }

              do {
                logger.log(`making for timestamp ${fromTs} with coin ${coin.id}`);

                const firstDayBlockQuery = await this.theGraphService.getSushiSwapFirstBlockQuery(
                  fromTs,
                );
                const blockNumber = firstDayBlockQuery['data']['data']['blocks'][0]['blockNumber'];
                //logger.log(blockNumber, `blockNumber ${coin.id}` );

                const dailyPriceQuery =
                  await this.theGraphService.getSushiSwapDailyBlockPricesQuery(
                    parseInt(blockNumber),
                    coin['address'],
                  );
                //this.logger.log(dailyPriceQuery['data']['data']);
                if (dailyPriceQuery['data']['data']['pairs'].length) {
                  const { reserveUSD, totalSupply } = dailyPriceQuery['data']['data']['pairs'][0];

                  if (reserveUSD && totalSupply) {
                    // this.databaseService
                    prices.push([
                      fromTs,
                      Number(reserveUSD) === 0 || Number(totalSupply) === 0
                        ? 0
                        : Number(reserveUSD) / Number(totalSupply),
                    ]);

                    await databaseService.updateAssetHistoryTimestamp(coin.id, fromTs);
                    await databaseService.addOnePrice(
                      coin.id,
                      fromTs,
                      Number(reserveUSD) === 0 || Number(totalSupply) === 0
                        ? 0
                        : Number(reserveUSD) / Number(totalSupply),
                      currentCurrencyId,
                    );
                  }
                }

                dayNum++;
                this.logger.log(fromTs);
                fromTs = getNextDayStart(firstTimestamp, dayNum);
              } while (fromTs <= toTs);

              logger.log(
                `${prices.length} new prices for coin ${coin.address} with asset_id ${coin.id}`,
              );

              if (prices.length === 0)
                await databaseService.updateAssetHistoryTimestamp(coin.id, fromTs);
            } catch (err: any) {
              logger.error(err, `Token ${coin.id} price checking error`);
              return resolve(null);
            }
            logger.log(
              `Historical coin ${coin.id} parsed in ${
                toTimestamp(new Date()) - startParseTime
              } seconds`,
            );
            return resolve(index);
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

    this.logger.timeEnd('SUSHI: Historical Prices');
    this.logger.log(`SUSHI: Historical Prices Job Done`);
    done();
  };
}
