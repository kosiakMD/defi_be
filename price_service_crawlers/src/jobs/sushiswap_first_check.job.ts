import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { DatabaseService } from '../services/database.service';
import { Api } from '../thegraph/api';
import { CURRENCY, CHAIN, PlatformEnum } from '../utils/constants';
import { crawlCoin } from '../utils/crawlCoin';
import { getNextDayStart } from '../utils/time';

// TODO: clean file
// const http = rateLimit(axios.create(), { maxRPS: 1, perMilliseconds: 5000 });

export type TokenPrices = { [key: string]: number };
export type TokenAddresses = { [key: string]: number };

// const tokens: string[] = TEST_TOKENS;

@Injectable()
export class SushiSwapFirstCheckJob {
  constructor(
    @Inject(NEST_PGPROMISE_CONNECTION) public pg: IDatabase<any>,
    private databaseService: DatabaseService,
    private theGraphService: Api,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  public async crawlNewTokens(job: any, done: any): Promise<void> {
    try {
      const currentChainId = await this.databaseService.getCurrentChain();

      let tokens = [];
      if (!currentChainId) {
        throw 'No current CHAIN in DB: ' + CHAIN;
      }

      let iteration = 0;
      do {
        const tokenRequest = await this.theGraphService.getSushiswapPoolsTokens(iteration);
        this.logger.log(tokenRequest['data']['data']['dataPairs'], 'tokens');
        tokens = tokenRequest['data']['data']['dataPairs'];

        const dbAssets = await this.databaseService.getSushiTokens();
        const dbTokenAddresses = dbAssets.map((token) => token['address']);

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
        this.logger.log(tokens.length, 'tokens.length');
      } while (iteration < 5 && tokens.length);
    } catch (e) {
      this.logger.error(e);
    }
    done();
  }

  public crawlNewTokensHistory = async (job: any, done: any): Promise<void> => {
    const currentCurrencyId = await this.databaseService.getCurrentCurrency();
    if (!currentCurrencyId) {
      throw 'No current currency in DB: ' + CURRENCY;
    }

    const dbAssets = await this.databaseService.getNewTokensByPlatform(PlatformEnum.sushiswap);
    this.logger.log('starting');

    const firstTxData = await this.theGraphService.getSushiswapfirstTxTimestamp();
    const firstTimestamp = parseInt(firstTxData['data']['data']['transactions'][0]['timestamp']);
    this.logger.log(firstTxData['data']['data']['transactions'], 'firstTxData');

    const currentDayTs = Math.round(Date.now() / 1000);

    this.logger.log(currentDayTs, ' currentDayTs');

    for (let i = 0; i < dbAssets.length; i++) {
      let dayNum = 0,
        checkDayTs = getNextDayStart(firstTimestamp);
      this.logger.log(checkDayTs, 'checkDayTs');
      const prices = [];
      do {
        const firstDayBlockQuery = await this.theGraphService.getSushiswapfirstBlockQuery(
          checkDayTs,
        );
        const blockNumber = firstDayBlockQuery['data']['data']['blocks'][0]['blockNumber'];
        this.logger.log(blockNumber, 'blockNumber');

        const dailyPriceQuery = await this.theGraphService.getSushiswapDailyBlockPricesQuery(
          parseInt(blockNumber),
          dbAssets[i]['address'],
        );
        this.logger.log(dailyPriceQuery['data']['data']);
        if (dailyPriceQuery['data']['data']['pairs'].length) {
          const { reserveUSD, totalSupply } = dailyPriceQuery['data']['data']['pairs'][0];

          if (reserveUSD && totalSupply) {
            prices.push([
              checkDayTs,
              Number(reserveUSD) === 0 || Number(totalSupply) === 0
                ? 0
                : Number(reserveUSD) / Number(totalSupply),
            ]);
          }
        }

        dayNum++;
        this.logger.log(checkDayTs);
        checkDayTs = getNextDayStart(firstTimestamp, dayNum);
      } while (checkDayTs < currentDayTs);
      this.logger.log(prices, 'prices');
      await crawlCoin(
        dbAssets[i].id,
        dbAssets[i],
        prices,
        currentCurrencyId,
        this.databaseService,
        this.logger,
        PlatformEnum.sushiswap,
      );
    }

    done();
  };
}
