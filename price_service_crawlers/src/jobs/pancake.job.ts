import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';
import { DatabaseService } from '../services/database.service';
import {
  getCurrentCoinsPrices
} from '../apis/binance.api';
import { BNB_CHAIN, SECONDS_IN_TEN_MINUTES, PlatformEnum, CURRENCY, BNB_CHAIN_ID } from '../utils/constants';
import { toTimestamp } from '../utils/common';

// TODO: clean file
export type TokenPrices = { [key: string]: { value: number; ['db_id']: any } };

@Injectable()
export class PancakeJob {
  constructor(
    @Inject(NEST_PGPROMISE_CONNECTION)
    public pg: IDatabase<any>,
    private databaseService: DatabaseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}


  public async getCurrentPrices(job: any, done: any): Promise<void> {
    this.logger.log('Current PANCAKE Prices Job Started');
    try {
      const currentChainId = BNB_CHAIN_ID;

      const currentCurrencyId = await this.databaseService.getCurrentCurrency();
      if (!currentCurrencyId) {
        throw 'No current currency in DB: ' + CURRENCY;
      }
      //cheking existing tokens in DB and adding new
      this.logger.log('checking for new pancake tokens')
      await this.databaseService.checkEthToken();
      const pancakeTokensAssets = await this.databaseService.getTokensByChainAndPlatform(
        currentChainId,
        PlatformEnum.pancake,
      );

      const dbTokenAddresses = pancakeTokensAssets.map((token) => token['address']);

      const currentTimestamp = toTimestamp(new Date()) - (toTimestamp(new Date()) % SECONDS_IN_TEN_MINUTES);
      
      let iteration = 0;
      
      const prices = await getCurrentCoinsPrices();
      this.logger.log(prices);

      // adding new tokens
      for (let address in prices) {
        this.logger.log(`${address} : ${prices[address]}`);
        if (dbTokenAddresses.indexOf(address) === -1)
          await this.databaseService.addTokenToDb(
            address,
            address,
            address,
            BNB_CHAIN,
            PlatformEnum.pancake,
            currentChainId,
          );
        //adding current prices
        let dbAssets = await this.databaseService.getTokenByAddress(address);
        if(dbAssets.length){
            await this.databaseService.addOnePrice(
              dbAssets[0]['id'],
              currentTimestamp,
              prices[address],
              currentCurrencyId,
            );
            iteration++;
            this.logger.log(`added total prices ${iteration}`)
        }
      }
      done();
    } catch (e) {
      this.logger.error(e);
      done();
    }
    this.logger.log('Add Current Pancake Prices Job done');
  }

}
