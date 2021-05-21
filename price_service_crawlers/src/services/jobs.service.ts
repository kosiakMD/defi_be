import { Inject, Injectable } from '@nestjs/common';
import Agenda from 'agenda';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { Logger } from '../Logger/Logger.service';
import { BalancerFirstCheckJob } from '../jobs/balancer_first_check.job';
import { CoingeckoJob } from '../jobs/coingecko.job';
import { CurveJob } from '../jobs/curve.job';
import { CurveFirstCheckJob } from '../jobs/curve_first_check.job';
import { PancakeJob } from '../jobs/pancake.job';
import { SushiswapJob } from '../jobs/sushiswap.job';
import { UniswapJob } from '../jobs/uniswap.job';
import { Api } from '../thegraph/api';
import //NEW_TOKENS_SECONDS_INTERVAL,
'../utils/constants';
import { DatabaseService } from './database.service';

// NOTE: We are limited to 10 bu to be safe we do 6

@Injectable()
export class JobsService {
  private agenda;
  private CURRENT_PRICE_SECONDS_INTERVAL;
  constructor(
    @Inject(NEST_PGPROMISE_CONNECTION) public pg: IDatabase<any>,
    private databaseService: DatabaseService,
    private theGraphService: Api,
    private coingeckoJob: CoingeckoJob,
    private sushiswapJob: SushiswapJob,
    private uniswapJob: UniswapJob,
    private pancakeJob: PancakeJob,
    private curveJob: CurveJob,
    private balancerFirstCheckJob: BalancerFirstCheckJob,
    private curveFirstCheckJob: CurveFirstCheckJob,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.CURRENT_PRICE_SECONDS_INTERVAL = process.env.CURRENT_PRICE_SECONDS_INTERVAL
      ? parseInt(process.env.CURRENT_PRICE_SECONDS_INTERVAL)
      : 300;
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

    const NEW_TOKENS_HISTORY_SECONDS_INTERVAL =
      process.env.HISTORY_PRICE_SECONDS_INTERVAL || 60 * 60;
    const CURRENT_PRICE_SECONDS_INTERVAL = process.env.CURRENT_PRICE_SECONDS_INTERVAL || 5 * 60;

    this.agenda
      .on('ready', async () => {
        await this.agenda.start();
        // await this.agenda.cancel({});

        const cancel = async (jobName: string) => {
          if (!jobName) {
            return null;
          }

          const cancelResult = await this.agenda.cancel({ name: jobName });
          this.logger.log(
            `agenda.cancel: [${jobName}], result: [${
              cancelResult === 1 ? 'cancelled' : 'not cancelled'
            }]`,
            'Agenda',
          );
          return cancelResult;
        };

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

        await cancel('CRAWL_COINGECKO_NEW_TOKENS_HISTORY');
        await this.agenda.define(
          'CRAWL_COINGECKO_NEW_TOKENS_HISTORY',
          { lockLifetime: 10000 },
          this.coingeckoJob.crawlNewTokensHistory.bind(this),
        );
        await this.agenda.every(
          NEW_TOKENS_HISTORY_SECONDS_INTERVAL + ' seconds',
          'CRAWL_COINGECKO_NEW_TOKENS_HISTORY',
          {},
        );

        //PANCAKE
        await cancel('CRAWL_PANCAKE_CURRENT_PRICE');
        this.agenda.define(
          'CRAWL_PANCAKE_CURRENT_PRICE',
          { lockLifetime: 10000 },
          this.pancakeJob.getCurrentPrices.bind(this),
        );
        this.agenda.every(
          CURRENT_PRICE_SECONDS_INTERVAL + ' seconds',
          'CRAWL_PANCAKE_CURRENT_PRICE',
          {},
        );

        // //SUSHI
        // await cancel('CRAWL_SUSHI_CURRENT_PRICE');
        // this.agenda.define(
        //   'CRAWL_SUSHI_CURRENT_PRICE',
        //   { lockLifetime: 10000 },
        //   this.sushiswapJob.getCurrentPrices.bind(this),
        // );
        // this.agenda.every(CURRENT_PRICE_SECONDS_INTERVAL + ' seconds', 'CRAWL_SUSHI_CURRENT_PRICE', {});

        await cancel('CRAWL_SUSHI_NEW_TOKENS_HISTORY');
        this.agenda.define(
          'CRAWL_SUSHI_NEW_TOKENS_HISTORY',
          { lockLifetime: 10000 },
          this.sushiswapJob.crawlNewTokensHistory.bind(this),
        );
        this.agenda.every(
          NEW_TOKENS_HISTORY_SECONDS_INTERVAL + ' seconds',
          'CRAWL_SUSHI_NEW_TOKENS_HISTORY',
          {},
        );

        // //UNI
        // await cancel('CRAWL_UNISWAP_CURRENT_PRICE');
        // this.logger.log('starting sushi');
        // this.agenda.define(
        //   'CRAWL_UNISWAP_CURRENT_PRICE',
        //   { lockLifetime: 10000 },
        //   this.uniswapJob.getCurrentPrices.bind(this),
        // );
        // this.agenda.every(
        //   CURRENT_PRICE_SECONDS_INTERVAL + ' seconds',
        //   'CRAWL_UNISWAP_CURRENT_PRICE',
        //   {},
        // );

        await cancel('CRAWL_UNISWAP_NEW_TOKENS_HISTORY');
        this.agenda.define(
          'CRAWL_UNISWAP_NEW_TOKENS_HISTORY',
          {},
          this.uniswapJob.crawlNewTokensHistory.bind(this),
        );
        this.agenda.every(
          NEW_TOKENS_HISTORY_SECONDS_INTERVAL + ' seconds',
          'CRAWL_UNISWAP_NEW_TOKENS_HISTORY',
          {},
        );

        // //CURVE
        // this.logger.log('starting curve')
        // await cancel('CRAWL_CURVE_NEW_TOKENS');
        // this.agenda.define(
        //   'CRAWL_CURVE_NEW_TOKENS',
        //   {},
        //   this.curveJob.getCurrentPrices.bind(this),
        // );
        // this.agenda.every(CURRENT_PRICE_SECONDS_INTERVAL + ' seconds',
        //   'CRAWL_CURVE_NEW_TOKENS',
        //   {});

        // await cancel('CRAWL_CURVE_NEW_TOKENS_HISTORY');
        // this.agenda.define(
        //   'CRAWL_CURVE_NEW_TOKENS_HISTORY',
        //   {},
        //   this.curveJob.crawlNewTokensHistory.bind(this),
        // );
        // this.agenda.every(
        //   NEW_TOKENS_HISTORY_SECONDS_INTERVAL + ' seconds',
        //   'CRAWL_CURVE_NEW_TOKENS_HISTORY',
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
      })
      .on('error', (e) => this.logger.error('Agenda connection error!', e));

    //this.agenda.start();
  }
}
