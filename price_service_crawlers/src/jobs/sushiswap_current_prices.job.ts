import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { DatabaseService } from '../services/database.service';
import { Api } from '../thegraph/api';
import { CURRENCY, PLATFORM } from '../utils/constants';

// TODO: clean file
export type TokenPrices = { [key: string]: { value: number; ['db_id']: any } };

@Injectable()
export class SushiswapCurrentPricesJob {
  constructor(
    @Inject(NEST_PGPROMISE_CONNECTION)
    public pg: IDatabase<any>,
    private databaseService: DatabaseService,
    private theGraphService: Api,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  public async crawl(job: any, done: any): Promise<void> {
    this.logger.log('Current SUSHI Prices Job Sarted');
    try {
      const currentPlatfromId = await this.databaseService.getCurrentPlatform();
      if (!currentPlatfromId) throw 'No current platform in DB: ' + PLATFORM;

      const currentCurrencyId = await this.databaseService.getCurrentCurrency();
      if (!currentCurrencyId) throw 'No current currency in DB: ' + CURRENCY;

      const dbAssets = await this.databaseService.getSushiTokens();

      if (dbAssets.length) {
        const results: any = {};

        for (let i = 0; i < dbAssets.length; i++) {
          this.logger.log(dbAssets[i]['address']);
          const oneResults = await this.theGraphService.getCurrentSushiTokenPrices(
            dbAssets[i]['address'],
          );

          if (oneResults['data']['data']['dataPairs'].length) {
            const { reserveUSD, totalSupply } = oneResults['data']['data']['dataPairs'][0];

            //this.logger.log("reserveUSD "+reserveUSD+" totalSupply "+totalSupply+" res ",(Number(reserveUSD) / Number(totalSupply)))
            results[dbAssets[i]['address']] = {
              ['db_id']: dbAssets[i]['id'],
              value:
                Number(reserveUSD) === 0 || Number(totalSupply) === 0
                  ? 0
                  : Number(reserveUSD) / Number(totalSupply),
            };
          }
        }

        await this.databaseService.addHourlyPricesToDb(results, currentCurrencyId);
      }
    } catch (e) {
      this.logger.error(e);
    }
    this.logger.log('Add Current SUSHI Prices Job done');
    done();
  }
}
