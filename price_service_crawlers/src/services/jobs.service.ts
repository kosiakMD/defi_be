import { Inject, Injectable, LoggerService } from '@nestjs/common';
import Agenda from 'agenda';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { BalancerFirstCheckJob } from '../jobs/balancer_first_check.job';
import { CoingeckoJob } from '../jobs/coingecko.job';
import { CurveFirstCheckJob } from '../jobs/curve_first_check.job';
import { SushiswapJob } from '../jobs/sushiswap.job';
import { PancakeJob } from '../jobs/pancake.job';
import { UniswapJob } from '../jobs/uniswap.job';
import { Api } from '../thegraph/api';
import {
  CURRENT_PRICE_SECONDS_INTERVAL,
  // NEW_TOKENS_HISTORY_SECONDS_INTERVAL,
  // NEW_TOKENS_SECONDS_INTERVAL,
} from '../utils/constants';
import { DatabaseService } from './database.service';

// NOTE: We are limited to 10 bu to be safe we do 6

@Injectable()
export class JobsService {
  private agenda;
  constructor(
    @Inject(NEST_PGPROMISE_CONNECTION) public pg: IDatabase<any>,
    private databaseService: DatabaseService,
    private theGraphService: Api,
    private coingeckoJob: CoingeckoJob,
    private sushiswapJob: SushiswapJob,
    private uniswapJob: UniswapJob,
    private pancakeJob: PancakeJob,
    private balancerFirstCheckJob: BalancerFirstCheckJob,
    private curveFirstCheckJob: CurveFirstCheckJob,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {
    const connectionString =
      'mongodb://' +
      process.env.MONGO_USER +
      ':' +
      process.env.MONGO_PASS +
      '@' +
      process.env.MONGO_HOST +
      ':' +
      process.env.MONGO_PORT +
      '/agenda?authMechanism=DEFAULT&authSource=admin'; //'mongodb://127.0.0.1/agenda';
    this.agenda = new Agenda({
      defaultLockLifetime: 10000,
      db: { address: connectionString },
      processEvery: '30 seconds',
    });

    
    this.agenda
      .on('ready', async () => {
        await this.agenda.start();
        // await this.agenda.cancel({});
        
        const cancel = async (jobName: string) => {

          const cancelResult = await this.agenda.cancel({ name: jobName });
          this.logger.log(
            `agenda.cancel: [${jobName}], result: [${cancelResult == 1 ? 'cancelled' : 'not cancelled'}]`,
            'Agenda',
          );
          return cancelResult;
        }

        this.logger.log('Agenda started');

        // get current token prices
        await cancel('CRAWL_COINGECKO_CURRENT_PRICE');
        await this.agenda.define(
          'CRAWL_COINGECKO_CURRENT_PRICE',
          { lockLifetime: 10000 },
          this.coingeckoJob.getCurrentPrices.bind(this),
        );
        await this.agenda.every(
          CURRENT_PRICE_SECONDS_INTERVAL + ' seconds',
          'CRAWL_COINGECKO_CURRENT_PRICE',
          {},
        );

        //await cancel('CRAWL_COINGECKO_NEW_TOKENS_HISTORY');
        // await this.agenda.define(
        //   'CRAWL_COINGECKO_NEW_TOKENS_HISTORY_NEW',
        //   { lockLifetime: 10e3 },
        //   this.coingeckoJob.crawlNewTokensHistory.bind(this),
        // );
        // await this.agenda.every(
        //   NEW_TOKENS_HISTORY_SECONDS_INTERVAL + ' seconds',
        //   'CRAWL_COINGECKO_NEW_TOKENS_HISTORY_NEW',
        //   {},
        // );

        // //SUSHI
        // await cancel('CRAWL_SUSHI_CURRENT_PRICE');
        // this.agenda.define(
        //   'CRAWL_SUSHI_CURRENT_PRICE',
        //   { lockLifetime: 10e3 },
        //   this.sushiswapJob.getCurrentPrices.bind(this),
        // );
        // this.agenda.every(CURRENT_PRICE_SECONDS_INTERVAL + ' seconds', 'CRAWL_SUSHI_CURRENT_PRICE', {});

        // await cancel('CRAWL_SUSHI_NEW_TOKENS_HISTORY');
        // this.agenda.define(
        //   'CRAWL_SUSHI_NEW_TOKENS_HISTORY',
        //   { lockLifetime: 10e3 },
        //   this.sushiswapJob.crawlNewTokensHistory.bind(this),
        // );
        // this.agenda.every(
        //   NEW_TOKENS_SECONDS_INTERVAL + ' seconds',
        //   'CRAWL_SUSHI_NEW_TOKENS_HISTORY',
        //   {},
        // );

        //  //PANCAKE
        // await cancel('CRAWL_PANCAKE_CURRENT_PRICE');
        // this.agenda.define(
        //   'CRAWL_PANCAKE_CURRENT_PRICE',
        //   { lockLifetime: 10e3 },
        //   this.pancakeJob.getCurrentPrices.bind(this),
        // );
        // this.agenda.every(CURRENT_PRICE_SECONDS_INTERVAL + ' seconds', 'CRAWL_PANCAKE_CURRENT_PRICE', {});

        // await cancel('CRAWL_PANCAKE_NEW_TOKENS_HISTORY');
        // this.agenda.define(
        //   'CRAWL_PANCAKE_NEW_TOKENS_HISTORY',
        //   { lockLifetime: 10e3 },
        //   this.pancakeJob.crawlNewTokensHistory.bind(this),
        // );
        // this.agenda.every(
        //   NEW_TOKENS_SECONDS_INTERVAL + ' seconds',
        //   'CRAWL_PANCAKE_NEW_TOKENS_HISTORY',
        //   {},
        // );


        // //UNI
        // await cancel('CRAWL_UNISWAP_CURRENT_PRICE');
        // this.logger.log('starting sushi');
        // this.agenda.define(
        //   'CRAWL_UNISWAP_CURRENT_PRICE',
        //   { lockLifetime: 10e3 },
        //   this.uniswapJob.getCurrentPrices.bind(this),
        // );
        // this.agenda.every(
        //   CURRENT_PRICE_SECONDS_INTERVAL + ' seconds',
        //   'CRAWL_UNISWAP_CURRENT_PRICE',
        //   {},
        // );

        //await cancel('CRAWL_UNISWAP_NEW_TOKENS_HISTORY_NEW');
        // this.agenda.define(
        //   'CRAWL_UNISWAP_NEW_TOKENS_HISTORY_NEW',
        //   { lockLifetime: 10e3 },
        //   this.uniswapJob.crawlNewTokensHistory.bind(this),
        // );
        // this.agenda.every(
        //   NEW_TOKENS_SECONDS_INTERVAL + ' seconds',
        //   'CRAWL_UNISWAP_NEW_TOKENS_HISTORY_NEW',
        //   {},
        // );

        // // this.logger.log('starting balancer');
        // this.agenda.define(
        //   'CRAWL_BALANCER_NEW_TOKENS',
        //   { lockLifetime: 10e3 },
        //   this.balancerFirstCheckJob.crawlNewTokens.bind(this),
        // );
        // this.agenda.every(
        //   NEW_TOKENS_SECONDS_INTERVAL + ' seconds',
        //   'CRAWL_BALANCER_NEW_TOKENS',
        //   {},
        // );

        // this.agenda.define(
        //   'CRAWL_BALANCER_NEW_TOKENS_HISTORY',
        //   { lockLifetime: 10e3 },
        //   this.balancerFirstCheckJob.crawlNewTokensHistory.bind(this),
        // );
        // this.agenda.every(
        //   NEW_TOKENS_SECONDS_INTERVAL + ' seconds',
        //   'CRAWL_BALANCER_NEW_TOKENS_HISTORY',
        //   {},
        // );

        // //this.logger.log('starting curve')
        // this.agenda.define(
        //   'CRAWL_CURVE_NEW_TOKENS',
        //   { lockLifetime: 10e3 },
        //   this.curveFirstCheckJob.crawlNewTokens.bind(this),
        // );
        // this.agenda.every(NEW_TOKENS_SECONDS_INTERVAL + ' seconds', 'CRAWL_CURVE_NEW_TOKENS', {});

        // this.agenda.define(
        //   'CRAWL_CURVE_NEW_TOKENS_HISTORY',
        //   { lockLifetime: 10e3 },
        //   this.curveFirstCheckJob.crawlNewTokensHistory.bind(this),
        // );
        // this.agenda.every(
        //   NEW_TOKENS_SECONDS_INTERVAL + ' seconds',
        //   'CRAWL_CURVE_NEW_TOKENS_HISTORY',
        //   {},
        // );

      })
      .on('error', (e) => this.logger.error('Agenda connection error!', e));

      
    //this.agenda.start();
  }
}
