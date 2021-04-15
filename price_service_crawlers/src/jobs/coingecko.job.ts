import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';
import  PromisePool  from 'es6-promise-pool';
import {
  getCurrentCoinPrices,
  getCurrentEthPrice,
  getCoinRangePrices,
  getCoins,
} from '../apis/coingecko.api';
import { DatabaseService } from '../services/database.service';
import { isETH } from '../utils/common';
import { toTimestamp } from '../utils/common';
import { CURRENCY, ETH_ADDRESS, CHAIN, SECONDS_IN_HOUR, TEST_TOKENS, PlatformEnum } from '../utils/constants';
import { crawlCoin, getRequiredHistoryStartDate, crawlCoinHistory} from '../utils/crawlCoin';

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
    return data[0].currentPrice;
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
    this.logger.log("check hourly prices")
    const beginOfDay = currentTimestamp - (currentTimestamp % 86400);

    let count = 0
    var promiseProducer =  () => {
      if (count < dbAssets.length) {
        return new Promise(async (resolve) => {
          let coin = dbAssets[count];
          const lastSavedTimestamp = lastPricesObj[coin.id] || 0;
          if (!lastSavedTimestamp || currentTimestamp - lastSavedTimestamp > SECONDS_IN_HOUR) {
            this.logger.log('coin: ' + coin.id + ' - ' + currentTimestamp + ' - ' + lastSavedTimestamp);
            try {
              const {
                data: { prices },
              } = await getCoinRangePrices(coin.address, lastSavedTimestamp, currentTimestamp);
    
              if (prices.length) {
                const tokenPrices = prices.filter(([timestamp]) => {
                  const roundTimestamp = Math.round(timestamp / 1000);
                  if (
                    roundTimestamp > lastSavedTimestamp &&
                    roundTimestamp > beginOfDay - 7 * 24 * SECONDS_IN_HOUR &&
                    roundTimestamp < currentTimestamp
                  ) {
                    return true;
                  }
                  return false;
                });
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
                  preparedPrices.push(property, preparedTimestamp[property]);
                }
    
                await crawlCoin(
                  coin.id,
                  coin,
                  preparedPrices,
                  currentCurrencyId,
                  this.databaseService,
                  this.logger,
                  PlatformEnum.coingecko,
                  false,
                );
    
                this.logger.log('missed coines length: ' + preparedPrices.length);
              }
            } catch (e) {
              if (e?.response?.status === 404) {
                await this.databaseService.removeToken(coin.id);
              }
            }
          }
          count++;
          this.logger.log(`done prices ${(count + 1)} of dbAssets.length`);
          resolve(count);
        })
      } else {
        return null;
      }
    }
    
    let  pool = new PromisePool(promiseProducer, 20);
    let poolPromise = pool.start();
    
    await poolPromise;
  }

  public async getCurrentPrices(job: any, done: any): Promise<void> {
    this.logger.log('Current Prices Job Sarted');
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
      this.logger.log("checking for new tokens")
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
      this.logger.log("new tokens checked")

      const currentTimestamp =
        toTimestamp(new Date()) - (toTimestamp(new Date()) % SECONDS_IN_HOUR);
      const dbAssets = await this.databaseService.getTokensByChainAndPlatform(
        currentChainId,
        PlatformEnum.coingecko,
        currentTimestamp,
      );
      this.logger.log(`token total: ${dbAssets.length}`);

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
      )

      // get current price
      if (dbAssets.length) {
        const dbTokenAddressesChunks = createAddressChunks(dbAssets);
        const chunksCount: number = dbTokenAddressesChunks.length;
        //NOTE: request str is too big, making chunks
        let promises = [];
        for (let i = 0; i < dbTokenAddressesChunks.length; i++) {
          promises.push(new Promise(async (resolve) => {
            const chunkResults = await CoingeckoJob.getCurrentTokenPrices(dbTokenAddressesChunks[i]);
            this.logger.log(`chunk ${i + 1}/${chunksCount} `);

            for (let i = 0; i < dbAssets.length; i++) {
              if (chunkResults[dbAssets[i]['address']]) {
                chunkResults[dbAssets[i]['address']]['db_id'] = dbAssets[i]['id'];
              }
            }
            
            await this.databaseService.addHourlyPricesToDb(chunkResults , currentCurrencyId);
            resolve(chunkResults)
          }))
          
        }
        Promise.all(promises).then(async () => {
          this.logger.log("ALL CHUNKS DONE")
        
          done();
        });
        
        
      }else{
        done();
      }
    } catch (e) {
      this.logger.error(e);
    }
    this.logger.log('Add Current Prices Job done');
   
  }

  public crawlNewTokensHistory = async (job: any, done: any): Promise<void> => {
    this.logger.log("coingecko new tokens history started")
    const currentCurrencyId = await this.databaseService.getCurrentCurrency();
    if (!currentCurrencyId) {
      throw 'No current currency in DB: ' + CURRENCY;
    }

    const beginOfDay = toTimestamp(new Date()) - (toTimestamp(new Date()) % 86400);
    const toTs = beginOfDay - 7 * 24 * SECONDS_IN_HOUR;

    this.logger.log(`beginOfDay ${beginOfDay}`);
    this.logger.log(`toTs toTs`);

    const dbAssets = await this.databaseService.getTokensByPlatformAndLastHistoryTimestamp(PlatformEnum.coingecko, toTs);

    this.logger.log(`total dbAssets.length`);
    for (const coin of dbAssets) {
      try {
        this.logger.log("coin.last_history_timestamp ",coin.last_history_timestamp )
        const fromTs = await getRequiredHistoryStartDate(coin, toTs, this.databaseService, this.logger )
        if(fromTs === toTs) {
          this.logger.log('fromTs === toTs');
          await  this.databaseService.updateAssetHistoryTimestamp(coin.id, toTs);
          continue;
        }

        this.logger.log(`fromTs ${fromTs}`);
        const {
          data: { prices },
        } = await getCoinRangePrices(
          coin.address,
          fromTs,
          toTs,
        );
        this.logger.log(`${prices.length} new prices`);
        const result = await crawlCoinHistory(
          coin.id,
          coin,
          prices,
          currentCurrencyId,
          this.databaseService,
          this.logger,
          PlatformEnum.coingecko,
          true,
          toTs
        );

        if (!result) break;
      } catch (err) {
        this.logger.error(err, `Token ${coin.id} price checking error`);
        break;
      }
    }
    this.logger.log(`coingecko new tokens history finished`);
    done();
  };
}
