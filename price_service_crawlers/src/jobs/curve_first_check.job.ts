import { Inject, Injectable, LoggerService } from '@nestjs/common';
import axios from 'axios';
import rateLimit from 'axios-rate-limit';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import {
  getCurrentEthPrice,
  getCurrentBtcPrice,
  getCoinHistoricalRangePrices,
} from '../apis/coingecko.api';
import { DatabaseService } from '../services/database.service';
import { Api } from '../thegraph/api';
import { toTimestamp } from '../utils/common';
import { CURRENCY, CHAIN, PlatformEnum } from '../utils/constants';
import { getNextDayStart } from '../utils/time';

const http = rateLimit(axios.create(), { maxRPS: 1, perMilliseconds: 5000 });

// TODO: for what?
// export type TokenPrices = { [key: string]: number };
// export type CoingeckoTokenPrices = { [key: string]: { value: number; db_id: any } };
// const tokens: string[] = TEST_TOKENS;
export type TokenAddresses = { [key: string]: number };

@Injectable()
export class CurveFirstCheckJob {
  constructor(
    @Inject(NEST_PGPROMISE_CONNECTION) public pg: IDatabase<any>,
    private databaseService: DatabaseService,
    private theGraphService: Api,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  public async crawlNewTokens(job: any, done: any): Promise<void> {
    try {
      const currentPlatfromId = await this.databaseService.getCurrentChain();
      if (!currentPlatfromId) {
        throw 'No current chain in DB: ' + CHAIN;
      }

      const currentCurrencyId = await this.databaseService.getCurrentCurrency();
      if (!currentCurrencyId) {
        throw 'No current currency in DB: ' + CURRENCY;
      }

      this.logger.log('request prepared');
      const poolsRequest = await this.theGraphService.getCurvePoolsTokens();

      const pools = poolsRequest['data']['data']['pools'];
      this.logger.log(pools, 'tokens');
      for (let i = 0; i < pools.length; i++) {
        const { virtualPrice, name, /*id,// TODO: for what?*/ poolToken } = pools[i];

        //let pool_token_supply = Math.pow(10, -18) * Number(poolTokenSupply);
        //this.logger.log("pool_token_supply ",pool_token_supply)

        let poolLpTokenPrice;

        if (poolToken.name.toLowerCase().indexOf('usd') > -1) {
          this.logger.log('usd');
          poolLpTokenPrice = Number(virtualPrice);
        } else if (poolToken.name.toLowerCase().indexOf('btc') > -1) {
          this.logger.log('btc');
          const { data } = await getCurrentBtcPrice();
          poolLpTokenPrice = Number(virtualPrice) * data[0].currentPrice;
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
          // TODO: for what?
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

        await this.databaseService.addOnePrice(
          dbPool[0]['id'],
          toTimestamp(new Date()),
          poolLpTokenPrice,
          currentCurrencyId,
        );
      }
    } catch (e) {
      this.logger.error(e);
    }
    this.logger.log('Jot current curve prices done!');
    done();
  }

  public crawlNewTokensHistory = async (job: any, done: any): Promise<void> => {
    const currentCurrencyId = await this.databaseService.getCurrentCurrency();
    if (!currentCurrencyId) {
      throw 'No current currency in DB: ' + CURRENCY;
    }

    const currentPlatfromId = await this.databaseService.getCurrentChain();
    if (!currentPlatfromId) {
      throw 'No current platform in DB: ' + CHAIN;
    }

    const dbAssets = await this.databaseService.getNewTokensByPlatform(PlatformEnum.curve);
    this.logger.log('starting uniswap history clawler');

    const firstTxData = await this.theGraphService.getCurvefirstTxTimestamp();
    const firstTimestamp = parseInt(firstTxData['data']['data']['transactions'][0]['timestamp']);
    this.logger.log(firstTxData['data']['data']['transactions'], 'firstTxData');

    const currentDayTs = Math.round(Date.now() / 1000);
    const secondsInDay = 86400;

    this.logger.log(currentDayTs, ' currentDayTs');

    for (let i = 0; i < dbAssets.length; i++) {
      let dayNum = 0,
        checkDayTs = getNextDayStart(firstTimestamp);
      this.logger.log(checkDayTs, 'checkDayTs');
      let pricesCount = 0;
      do {
        const firstDayBlockQuery = await this.theGraphService.getCurvefirstBlockQuery(checkDayTs);
        const blockNumber = firstDayBlockQuery['data']['data']['blocks'][0]['block'];
        this.logger.log(blockNumber, 'blockNumber');

        const dailyPriceQuery = await this.theGraphService.getCurveDailyBlockPricesQuery(
          parseInt(blockNumber),
          dbAssets[i]['address'],
        );
        //this.logger.log(daily_price_query['data']['data']['pools'][0])

        if (dailyPriceQuery['data']['data']['pools'].length) {
          const { virtualPrice, /*name, id, TODO: fpr what?*/ poolToken } = dailyPriceQuery['data'][
            'data'
          ]['pools'][0];

          let poolLpTokenPrice;

          if (poolToken.name.toLowerCase().indexOf('usd') > -1) {
            this.logger.log('usd');
            poolLpTokenPrice = Number(virtualPrice);
          } else if (poolToken.name.toLowerCase().indexOf('btc') > -1) {
            this.logger.log('btc');
            const {
              data: { prices },
            } = await getCoinHistoricalRangePrices(
              http,
              'bitcoin',
              checkDayTs,
              checkDayTs + secondsInDay,
            );

            this.logger.log(prices, 'hist BTC price');
            poolLpTokenPrice = Number(virtualPrice) * prices[0][1];
          } else if (poolToken.name.toLowerCase().indexOf('eth') > -1) {
            this.logger.log('eth');
            try {
              const {
                data: { prices },
              } = await getCoinHistoricalRangePrices(
                http,
                'ethereum',
                checkDayTs,
                checkDayTs + secondsInDay,
              );
              this.logger.log(prices, 'hist ETH price');
              poolLpTokenPrice = Number(virtualPrice) * prices[0][1];
            } catch (e) {
              this.logger.error(e);
            }
          } else {
            this.logger.log(' No current value, skipping... ' + poolToken.name);
            dayNum++;
            continue;
          }

          this.logger.log(poolLpTokenPrice, 'LP Price');
          try {
            this.logger.log(
              dbAssets[i]['id'] +
                ' ' +
                checkDayTs +
                ' ' +
                poolLpTokenPrice +
                ' ' +
                currentCurrencyId,
            );
            await this.databaseService.addOnePrice(
              dbAssets[i]['id'],
              checkDayTs,
              poolLpTokenPrice,
              currentCurrencyId,
            );
          } catch (e) {
            this.logger.error(e);
          }
          this.logger.log('added new price');
          pricesCount++;
        }

        dayNum++;
        this.logger.log(checkDayTs);
        checkDayTs = getNextDayStart(firstTimestamp, dayNum);
      } while (checkDayTs < currentDayTs);

      if (pricesCount) {
        await this.databaseService.setAssetAsNotNew(dbAssets[i]['id']);
        this.logger.log('Updated pool ' + dbAssets[i]['id'] + ' to OLD from NEW');
      }
    }

    done();
  };
}
