import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { getCoinRangePrices, getCoins } from '../apis/coingecko.api';
import { DatabaseService } from '../services/database.service';
import { toTimestamp } from '../utils/common';
import { CURRENCY, CHAIN, TEST_TOKENS, TOKEN_START_DATE } from '../utils/constants';
import { crawlCoin } from '../utils/crawlCoin';

export type TokenPrices = { [key: string]: number };
export type TokenAddresses = { [key: string]: number };

const tokens: string[] = TEST_TOKENS;

const getEtherTokens = async (): Promise<TokenPrices> => {
  if (!tokens.length) {
    return {};
  }
  const { data } = await getCoins();
  return data;
};

@Injectable()
export class CoingeckoFirstCheckJob {
  constructor(
    @Inject(NEST_PGPROMISE_CONNECTION) public pg: IDatabase<any>,
    private databaseService: DatabaseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  public async crawlNewTokens(job: any, done: any): Promise<void> {
    try {
      this.logger.log('coingecko new tokens started');
      const currentChainId = await this.databaseService.getCurrentChain();
      if (!currentChainId) {
        throw 'No current platform in DB: ' + CHAIN;
      }

      await this.databaseService.checkEthToken();
      const dbAssets = await this.databaseService.getTokensByChainAndPlatform(
        currentChainId,
        'COINGECKO',
      );
      const dbTokenAddresses = dbAssets.map((token) => token['address']);
      const remoteTokens = await getEtherTokens();

      for (let i = 0; i < remoteTokens.length; i++) {
        if (!remoteTokens[i]['platforms'] || !remoteTokens[i]['platforms'][CHAIN]) {
          continue;
        }
        if (dbTokenAddresses.indexOf(remoteTokens[i]['platforms'][CHAIN]) === -1)
          await this.databaseService.addNewTokenToDb(remoteTokens[i], currentChainId);
      }
      this.logger.log('Add new tokens Job done');
    } catch (e) {
      this.logger.error(e);
    }

    this.logger.log('coingecko new tokens finished');
    done();
  }

  public crawlNewTokensHistory = async (job: any, done: any): Promise<void> => {
    this.logger.log('coingecko new tokens history started');
    const currentCurrencyId = await this.databaseService.getCurrentCurrency();
    if (!currentCurrencyId) {
      throw 'No current currency in DB: ' + CURRENCY;
    }

    const dbAssets = await this.databaseService.getNewTokensByPlatform('COINGECKO');

    for (const coin of dbAssets) {
      try {
        const {
          data: { prices },
        } = await getCoinRangePrices(
          coin.address,
          toTimestamp(new Date(TOKEN_START_DATE)),
          toTimestamp(new Date()),
        );

        const result = await crawlCoin(
          coin.id,
          coin,
          prices,
          currentCurrencyId,
          this.databaseService,
          this.logger,
          'coingecko',
        );
        if (!result) break;
      } catch (err) {
        this.logger.error(err, `Token ${coin.id} price checking error`);
        break;
      }
    }
    this.logger.log('coingecko new tokens history finished');
    done();
  };
}
